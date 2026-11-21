// "Thấy người chơi khác" qua máy chủ phòng Cloudflare (thay src/net/online.js khi data/config.json realtime.backend = "cf").
// Cùng giao diện với online.js: join(đảo, hồ sơ), leave, send(vị trí), say, rename, setProfile — game/others.js không phải đổi.
// Máy chủ gom vị trí 200 ms một gói; tin phát xuống không tính tiền, nên tuyến 40 người vẫn rẻ (cloud/src/phong.js).
import { openPhong } from './phong-ws.js';

// Nhịp sống qua phòng Cloudflare (chủ dự án 13/11/2026 01:24: online, kết nối giao cho Cloudflare; Supabase giữ kinh tế, chống hack).
// Phòng gom giây online của cả phòng, 12 giây ký gửi Supabase một lần (cloud/src/nhip.js, p2d_nhip_gop). Game nghe sự kiện
// 'p2d-nhip' (phòng đã nhận nhịp) và 'p2d-khac' (máy khác vào cùng tài khoản) ở src/game/net-watch.js.
let nowConn = null;
export function cfBeat(phien) { return !!(nowConn?.ready() && nowConn.send({ t: 'n', ph: phien || '' })); }

export function createOnline(me, handlers, opts = {}) {
  let conn = null, mapId = null, prof = {}, lastSend = 0, lastPos = '';
  const people = new Map();   // id → hồ sơ (+ vị trí lúc vào)
  const lines = new Map();    // đảo → tuyến lần trước (vào lại đúng tuyến cũ cho gặp lại người quen)
  const push = () => handlers.onPresence([...people.values()]);

  function onOpen(w) {
    people.clear();
    for (const u of w.l || []) if (u.id !== me.id) people.set(u.id, u);
    conn.send({ t: 'p', p: { name: me.name, ...prof } });
    push();
    for (const u of w.l || []) if (u.x !== undefined) handlers.onMove({ id: u.id, x: u.x, y: u.y, fx: u.fx, fy: u.fy });
    handlers.onQuai?.({ t: 'w', q: w.q, me: w.me || me.id, map: mapId });   // quái chung của bản đồ (cloud/src/quai.js, src/game/quai-chung.js)
  }

  function onMsg(m) {
    if (m.t === 'n1') { dispatchEvent(new Event('p2d-nhip')); return; }
    if (m.t === 'kh') { dispatchEvent(new Event('p2d-khac')); return; }
    if (m.t === 'b') {
      for (const [id, x, y, fx, fy, sw, act] of m.m || []) if (id !== me.id) handlers.onMove({ id, x, y, fx, fy, sw, ...(act ? { act } : {}) });
      for (const [id, s] of m.s || []) if (id !== me.id) handlers.onSay?.({ id, ...s });
      for (const [id, c] of m.k || []) if (id !== me.id) handlers.onCast?.({ id, ...c });
      if (m.q || m.qh) handlers.onQuai?.(m);   // quái chung: vị trí quái người khác đang giữ, máu vừa đổi
    } else if (m.t === 'qa' || m.t === 'qk') handlers.onQuai?.(m);   // quái chung: lời đáp đòn của mình, tin hạ quái kèm phần công
    else if (m.t === 'qv') handlers.onQuai?.({ t: 'w', q: m.q, me: me.id, map: mapId });   // phòng vừa đổi bảng quái chung (tinh cầu tông môn bày lại): như vào phòng mới
    else if (m.t === 'j' && m.u?.id && m.u.id !== me.id) { people.set(m.u.id, m.u); push(); }   // tin 'j' mang TRỌN hồ sơ mới: thay hẳn, không trộn với bản cũ.
    // (Trước 20/11/2026 trộn { ...cũ, ...mới }: trường vừa về trống (xuống thú, hạ cánh, thôi đả tọa, hồi sinh) bị máy chủ phòng lược khỏi tin
    //  nên máy người xem giữ mãi giá trị cũ: thấy người kia cưỡi thú / bay / ngồi / mờ mãi tới khi vào lại tinh cầu. Bài thử hai máy bắt được.)
    else if (m.t === 'l' && people.delete(m.id)) push();
    else if (m.t === 'bx') handlers.onBoss?.(m);   // bảng sát thương boss thế giới (cloud/src/mang.js)
    else if (m.t === 'pk' || m.t === 'ph' || m.t === 'pd' || m.t === 'pe') {   // PvP Ngoại Vực (cloud/src/pvp.js)
      let cu = 0;   // hóa ma (cloud/src/ma.js): tin pk mang điểm ma; hồ sơ giữ dạng chuỗi số như máy chủ phòng gắn (data/dong-bo.json ma)
      if (m.t === 'pk' && people.has(m.id)) { const u = people.get(m.id); cu = +u.ma || 0; u.pk = m.on; if ('ma' in m) u.ma = m.ma > 0 ? String(m.ma) : null; push(); }
      handlers.onPvp?.(m.t === 'pk' ? { ...m, cu } : m);
    }
  }

  async function leave() {
    if (conn) { if (nowConn === conn) nowConn = null; conn.close(); conn = null; }
    people.clear();
    handlers.onClear(); handlers.onQuai?.({ t: 'x' });
  }

  async function join(id, profile) {
    prof = profile || prof;
    if (id === mapId && conn) return;
    await leave();
    mapId = id;
    if (!id) return;
    const room = `dao:${id}`;
    conn = openPhong({ url: opts.url, room, line: lines.get(id) || 1, onOpen, onMsg, onDown: () => { people.clear(); handlers.onClear(); handlers.onQuai?.({ t: 'x' }); }, onLine: l => lines.set(id, l), ve: opts.ve });
    nowConn = conn;
  }

  // Cùng cách giãn nhịp như online.js: gap mili giây tối thiểu giữa hai lần gửi, đứng yên thì chỉ gửi lại sau idle
  function send(p, extra = {}, gap = 1000, idle = 30000) {
    if (!conn || !conn.ready() || gap === Infinity) return;
    const now = Date.now();
    const key = `${Math.round(p.x)},${Math.round(p.y)},${extra.act || ''},${extra.sw || ''}`;
    if (gap > 0 && (now - lastSend < gap || (key === lastPos && now - lastSend < idle))) return;
    lastSend = now; lastPos = key;
    conn.send({ t: 'm', x: Math.round(p.x), y: Math.round(p.y), fx: +p.face.x.toFixed(2), fy: +p.face.y.toFixed(2), sw: extra.sw ? 1 : 0, ...(extra.act ? { a: extra.act } : {}) });
  }

  function say(body) { conn?.send({ t: 's', ...body }); }
  function cast(c) { conn?.send({ t: 'k', ...c }); }
  function bossDmg(n) { conn?.send({ t: 'd', n }); }
  // Tắt khiên thì kèm chỗ đang đứng (20/11/2026): tắt xong đứng yên, máy chủ phòng vẫn biết chỗ để xét tầm (nó quên vị trí khi phòng ngủ)
  function pvpOff(off, p) { if (!conn?.ready()) return false; conn.send({ t: 'bv', off: !!off, ...(off && p ? { x: Math.round(p.x), y: Math.round(p.y) } : {}) }); return true; }
  // Đòn PvP kèm vị trí mình lúc ra đòn (20/11/2026): máy chủ phòng xét tầm theo đó. Trước đây nó xét theo lần gửi vị trí gần nhất, cũ tới
  // 0,2 giây + trễ mạng: vừa lao vào tầm mà đánh là bị bỏ oan (thử thật hai tài khoản: 9/16 đòn được tính).
  function pvpHit(to, p) { conn?.send({ t: 'h', to, ...(p ? { x: Math.round(p.x), y: Math.round(p.y) } : {}) }); }
  // Hóa ma (22/11/2026, cloud/src/ma.js): kèm chỗ đang đứng như lúc tắt khiên. false: chưa nối được phòng
  function pvpMa(p) { if (!conn?.ready()) return false; conn.send({ t: 'mh', ...(p ? { x: Math.round(p.x), y: Math.round(p.y) } : {}) }); return true; }
  // Quái chung: quái mình đang giữ (m) và đòn mình đánh (h), kèm số thứ tự tin n và chỗ mình đứng (phòng xét tầm theo đó). false: chưa nối được
  function quai(body, p) { return !!(conn?.ready() && conn.send({ t: 'q', x: Math.round(p.x), y: Math.round(p.y), ...body })); }
  function rename(name) { me.name = name; conn?.send({ t: 'p', p: { name, ...prof } }); }
  function setProfile(p) { prof = { ...prof, ...p }; conn?.send({ t: 'p', p: { name: me.name, ...prof } }); }
  const line = () => conn?.line() || 0;

  return { me, join, leave, send, say, cast, bossDmg, pvpOff, pvpHit, pvpMa, quai, rename, setProfile, line };
}
