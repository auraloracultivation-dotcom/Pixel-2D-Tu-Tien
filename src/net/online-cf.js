// "Thấy người chơi khác" qua máy chủ phòng Cloudflare (thay src/net/online.js khi data/config.json realtime.backend = "cf").
// Cùng giao diện với online.js: join(đảo, hồ sơ), leave, send(vị trí), say, rename, setProfile — game/others.js không phải đổi.
// Máy chủ gom vị trí 200 ms một gói; tin phát xuống không tính tiền, nên tuyến 40 người vẫn rẻ (cloud/src/phong.js).
import { openPhong } from './phong-ws.js';

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
  }

  function onMsg(m) {
    if (m.t === 'b') {
      for (const [id, x, y, fx, fy, sw, act] of m.m || []) if (id !== me.id) handlers.onMove({ id, x, y, fx, fy, sw, ...(act ? { act } : {}) });
      for (const [id, s] of m.s || []) if (id !== me.id) handlers.onSay?.({ id, ...s });
      for (const [id, c] of m.k || []) if (id !== me.id) handlers.onCast?.({ id, ...c });
    } else if (m.t === 'j' && m.u?.id && m.u.id !== me.id) { people.set(m.u.id, { ...people.get(m.u.id), ...m.u }); push(); }
    else if (m.t === 'l' && people.delete(m.id)) push();
  }

  async function leave() {
    if (conn) { conn.close(); conn = null; }
    people.clear();
    handlers.onClear();
  }

  async function join(id, profile) {
    prof = profile || prof;
    if (id === mapId && conn) return;
    await leave();
    mapId = id;
    if (!id) return;
    const room = `dao:${id}`;
    conn = openPhong({ url: opts.url, room, line: lines.get(id) || 1, onOpen, onMsg, onDown: () => { people.clear(); handlers.onClear(); }, onLine: l => lines.set(id, l) });
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
  function rename(name) { me.name = name; conn?.send({ t: 'p', p: { name, ...prof } }); }
  function setProfile(p) { prof = { ...prof, ...p }; conn?.send({ t: 'p', p: { name: me.name, ...prof } }); }
  const line = () => conn?.line() || 0;

  return { me, join, leave, send, say, cast, rename, setProfile, line };
}
