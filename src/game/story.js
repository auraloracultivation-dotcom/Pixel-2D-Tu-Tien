// Chạy kịch bản data/story.json (cốt truyện mới, cốt truyện cũ đã xoá): mỗi bước làm các việc trong "do" rồi chờ điều kiện "until".
import { rollRoot, rootOf, totalLayer } from './stats.js';
import { leToc } from './le-toc.js';
import { hocKyNang } from './ky-nang.js';
import { pbGive } from './phap-bao-grant.js';
import { scaleMobBy } from './mobs.js';
import { dan, hetCanh } from './dan-canh.js';
// Chọn hệ linh căn ở đá linh căn. Bảng chọn bị đóng ngang (đổi bản đồ, bảng khác bật lên) thì hộp thoại trả null: hỏi lại tới khi chọn
// (báo lỗi 13/11/2026: hai tài khoản người chơi đi qua bước này mà không có hệ, không hiện linh căn). Phẩm linh căn đã có thì giữ.
async function chooseElement(g) {
  const els = g.data.elements, opts = Object.entries(els).filter(([k]) => !k.startsWith('_')).map(([k, e]) => ({ id: k, label: e.name, desc: e.desc, color: e.color }));
  let id = null;
  for (let i = 0; i < 20 && !els[id]; i++) id = await g.dialog.choose('Đá linh căn sáng lên... Linh căn của bạn là:', opts);
  if (!els[id]) return false;
  g.save.element = id; g.save.root = g.save.root || g.save.rootKeep || rollRoot(g.data); delete g.save.rootKeep;
  for (const f of g.data.config.season?.open_flags || []) g.save.flags[f] = true;
  g.refreshStats(); g.checkUnlocks(); g.persist();
  return true;
}

// Chặng leo bậc đầu game (docs/10-CAI-HON.md việc 5; data/story.json → bac): công tắc cho mọi người bac.on, riêng một máy ?bac=1 / ?bac=0 (nhớ trên máy đó)
let BAC = null;
export function bacOn(game) {
  if (BAC != null) return BAC;
  const B = game.data.story.bac; let v = null;
  try { const q = new URLSearchParams(location.search).get('bac'); if (q != null) localStorage.setItem('p2d-bac', q); v = localStorage.getItem('p2d-bac'); } catch { /* không có kho nhớ: theo mặc định */ }
  return (BAC = !!B && (v != null ? v === '1' : !!B.on));
}

// Chỗ hết phần mở đầu (data/story.json → mo_dau: mã bước): từ đó người chơi được đi tự do, các cờ mở tinh cầu đã đặt. Truyện còn chạy tiếp bằng các
// nhiệm vụ chính sau bước này, nên mọi chỗ từng hỏi "đã tới bước cuối chưa" (thẻ Hẹn ngày mai…) hỏi hàm này.
const moDauI = S => { const i = S.steps.findIndex(s => s.id === S.mo_dau); return i < 0 ? S.steps.length - 1 : i; };
export function hetMoDau(game) { const k = moDauI(game.data.story), s = game.save; return !!s && ((s.step || 0) > k || (s.step === k && !!s.stepDone)); }

export function createStory(game) {
  pickStory(game);   // bản lưu truyện cũ: sang bước cuối truyện mới
  const steps = game.data.story.steps, B = game.data.story.bac, MD = moDauI(game.data.story);
  // Ô đích viết theo tên mốc của bản đồ (data/maps/<bản đồ>.json → moc; luật thế giới: truyện trỏ tên mốc, không trỏ toạ độ số): đổi ra ô một lần
  for (const s of steps) if (typeof s.target === 'string') s.target = game.data.maps[s.target_map || s.map]?.moc?.[s.target] || null;
  const st = { busy: false, counters: {}, events: {} };
  // Số thứ tự nhiệm vụ chính 1 → N (thẻ nhiệm vụ src/ui/nv-hud.js; chủ dự án 21/11/2026: truyện phân theo nhiệm vụ từ 1 đến N, không phân chương): đánh số
  // mọi việc có dòng goal theo đúng thứ tự người chơi gặp, các bậc chạy trước một bước rồi tới chính bước đó. Thêm bước vào data/story.json là số tự nối.
  let nvN = 0; const ds = [];
  for (const s of steps) {
    for (const u of B?.truoc?.[s.id] || []) if (u.goal) { u.nv = ++nvN; ds.push(u); }
    if (s.goal || B?.buoc?.[s.id]?.goal) { s.nv = ++nvN; ds.push(s); }
  }

  // Nhiệm vụ chính sau phần mở đầu: xong việc thì thẻ nhiệm vụ đánh dấu ✓ một nhịp (src/ui/nv-hud.js đọc goal().xong), rồi CHỜ MÀN LẶNG (không bảng nào mở, không
  // thẻ mừng, không hội thoại: game.manLang do src/ui/nv-hud.js khai) mới diễn cảnh của nhiệm vụ kế. Cảnh truyện không chen ngang lúc người chơi đang xem đồ
  // vừa rơi sau trận trùm hay đang mở túi (chủ dự án 21/11/2026 08:51: truyện phải "hài hoà, từ từ hoà vào game, nhẹ nhàng").
  const NHIP = 0.75, NHIP_TOI = 1.6, CHO = 14;   // giây
  const dungCho = s => !s.until.reach || !s.target_map || s.target_map === game.map.id;   // ô đích của nhiệm vụ nằm ở bản đồ khác thì đứng trùng số ô ở đây không tính
  const step = () => steps[game.save.step];
  // Leo bậc: bước truyện có danh sách bậc ở bac.truoc[mã bước] thì các bậc chạy lần lượt TRƯỚC khi bước đó bắt đầu (mỗi bậc cũng có do / goal / until như
  // một bước), số bước truyện save.step đứng yên nên mọi chỗ đang dựa vào số bước không lệch. Bậc đang leo ghi ở save.bac = { s: mã bước, i: số bậc đã xong }.
  // Leo hết bậc thì tới chính bước truyện, với phần mở đầu thay bằng bac.thay[mã bước] nếu có (lời thoại khớp với việc vừa đánh xong).
  // Bước khác (không có bậc) mà có bac.thay thì cũng dùng bản thay khi người chơi đã leo bậc (cờ 'leo-bac'): quà không trùng với quà của các bậc.
  const pre = s => (s && bacOn(game) && (s === steps[0] || game.save.flags['leo-bac']) && B.truoc?.[s.id]) || null;   // bậc ở các bước sau chỉ dành cho người đã vào chặng từ đầu (bản lưu đang đi dở truyện cũ thì thôi)
  const subI = s => (game.save.bac?.s === s.id ? game.save.bac.i : 0);
  const unit = () => {
    const s = step(), P = pre(s);
    if (P && subI(s) < P.length) return P[subI(s)];
    return s && B?.thay?.[s.id] && (P || game.save.flags['leo-bac']) && bacOn(game) ? { ...s, do: B.thay[s.id] } : s;
  };
  // Bậc đang leo (null: không ở chặng leo bậc): { i: số bậc (so của bậc, tính chung cả chặng), n: tổng số bậc (bac.tong), u: bậc }. Ngoài các bậc chạy trước bước
  // truyện (truoc), một bước truyện cũng có thể tự là một bậc (bac.buoc[mã bước] = { so, goal, thuong }: trận boss vốn là điều kiện của chính bước đó).
  const onLadder = () => bacOn(game) && !!game.save.flags['leo-bac'];
  const rung = () => {
    const s = step(), P = pre(s), i = P ? subI(s) : 0, n = B?.tong;
    if (P && i < P.length) return { i: P[i].so ?? i + 1, n: n ?? P.length, u: P[i] };
    const b = s && onLadder() && B.buoc?.[s.id];
    return b && game.save.stepDone ? { i: b.so, n, u: { ...s, ...b } } : null;
  };
  // Chặng leo bậc chưa cho Tự đánh ('danh') / Tự hành ('hanh'): đang ở một bậc, hoặc đã vào chặng mà chưa tới chỗ truyện mở khoá (cờ bac-mo-danh, bac-mo-hanh)
  const khoa = kind => !game.khoaBo && bacOn(game) && !game.save.flags['bac-mo-' + kind] && !!(rung() || game.save.flags['leo-bac']);   // khoaBo: phòng thử cho Tự hành chạy cả chặng
  // Pháp bảo là phần thưởng của các bậc (lệnh phap_bao trong bac.thay, có nghi lễ) thì trong lúc còn ở chặng leo bậc chưa nhận theo mốc (phap-bao-grant.js
  // pbGrants), kẻo món quà của bậc tự rơi vào túi trước kèm một dòng báo. Trả tập các loại đang giữ lại, hoặc null. Pháp bảo khác (Hộ Thuẫn…) vẫn nhận như thường.
  const HELD = new Set(Object.values(B?.thay || {}).flat().filter(a => a.phap_bao).map(a => a.phap_bao.type));
  const pbHold = () => (bacOn(game) && HELD.size && (rung() || pre(step()) || (game.save.flags['leo-bac'] && !game.save.flags['bac-xong'])) ? HELD : null);
  // Lệnh phát quà của một bước chỉ chạy một lần dù bước chạy lại từ đầu (mở lại game giữa bước). Trước 14/11/2026 mỗi lần mở lại game ở bước đánh lui ma tộc,
  // bước chờ vào bí cảnh… lại nhận thêm một viên ngọc cấp 5 và một món đồ. Ghi ở save.stepPaid = { s: mã bước, k: { lệnh + thứ tự: 1 } }, sang bước mới thì ghi đè.
  const GIVE = ['reward', 'gem', 'mats', 'pills', 'item', 'phap_bao'];
  const paid = s => (game.save.stepPaid?.s === s.id ? game.save.stepPaid : (game.save.stepPaid = { s: s.id, k: {} })).k;

  async function runStep() {
    const s = step(), u = unit();
    if (!s) return;
    st.counters = {}; st.events = {}; st.xong = st.lang = null;
    if (s.map && game.map.id !== s.map && !game.save.stepDone) await game.travel(s.map, null, false);
    if (!game.save.stepDone) {
      st.busy = true;
      const seen = {};
      try { for (const a of u.do || []) await act(a, u, seen); }
      catch (e) { console.error('story', u.id, e); }   // một lệnh truyện lỗi: vẫn mở khoá, không kẹt "đang có chuyện" mãi (góp ý #55 kẹt map)
      finally { st.busy = false; if (seen.canh) hetCanh(game); }   // bước có dàn cảnh: hết bước thì màn sáng lại như bản đồ đang đứng
      game.save.stepDone = true;
      game.persist();
    }
  }

  // Bước nhặt đồ đã chạy xong phần "do" mà vào lại bản đồ (chết, đi rồi về, tải lại trang với bước once): rải lại số món còn
  // thiếu, kẻo tự hành và người chơi đứng mãi ở chỗ chỉ đường (chơi thử 28/10: kẹt "Lấy băng tâm ở bờ đông bắc" ở Hàn Băng)
  function restorePickups() {
    const s = unit(), item = s?.until?.collect;
    if (!item || !game.save.stepDone || (s.target_map || s.map || step().map || game.map.id) !== game.map.id || game.pickups.some(k => k.item === item && !k.side)) return;
    const left = Math.max(0, s.until.n - (st.counters[item] || 0));
    for (const a of s.do || []) if (a.pickups === item) for (const [x, y] of dsNhat(a).slice(0, left)) game.addPickup(item, x, y);
  }

  // Ô rải vật nhặt của một lệnh pickups: at là các ô trên bản đồ; near: [lệch ngang, lệch dọc] tính bằng ô so với chỗ người chơi đang đứng (vật rơi lại chỗ trùm vừa gục)
  const dsNhat = a => { if (!a.near) return a.at; const T = game.map.T || 16, p = game.map.freeNear(Math.floor(game.player.x / T) + a.near[0], Math.floor(game.player.y / T) + a.near[1], 1, 6); return [[Math.floor(p.x / T), Math.floor(p.y / T)]]; };

  // Lệnh có "neu": chỉ làm khi cờ ấy đã có ("cờ") hoặc chưa có ("!cờ"). Dùng cho câu thoại hai bản: người đã thấy cảnh mở đầu (người thân bị giữ) và người
  // chơi cũ được chuyển thẳng tới cuối phần mở đầu, chưa thấy cảnh ấy (pickStory bên dưới). Đừng đặt điều kiện vào cờ do chính bước đó bật.
  const neu = c => (c[0] === '!' ? !game.save.flags[c.slice(1)] : !!game.save.flags[c]);
  const tenCua = u => (u.ten_neu && neu(u.ten_neu[0]) ? u.ten_neu[1] : u.ten) || '';   // tên nhiệm vụ cũng có bản riêng theo cờ: ten_neu: ["!cờ", "tên khác"]
  async function act(a, s, seen) {
    if (a.neu && !neu(a.neu)) return;
    const g = game, kind = GIVE.find(k => k in a);
    if (kind) { const k = paid(s), key = kind + (seen[kind] = (seen[kind] || 0) + 1); if (k[key]) return; k[key] = 1; }   // quà của bước này phát rồi: không phát lại
    if (a.say || a.hoi) { const k = paid(s), key = 'say' + (seen.say = (seen.say || 0) + 1); if (k[key]) return; k[key] = 1; }   // lời thoại của bước đã hiện rồi: mở lại game không nói lại (chủ dự án 17/11/2026 02:45: sư tỷ Lạc Tuyết "Ngươi về rồi!" lần nào vào game cũng nói)
    if (a.fly) await g.travel(a.fly, a.spawn, true, { text: a.text, with: a.with, kind: a.kind });
    else if (a.say) await g.dialog.say(a.say.map(([who, text, opt]) => [who === 'he-thong' ? g.data['he-thong']?.short || g.data['he-thong']?.name || 'Hệ Thống' : who ? (g.data.npcs[who]?.name || who) : '', fill(text), opt]));   // 'he-thong': Hệ Thống Tu Tiên nói (data/he-thong.json)
    else if (a.sys_ask) {   // câu hỏi lựa chọn của hệ thống (chủ dự án 06/11/2026): chọn xong hệ thống đáp một câu
      const H = g.data['he-thong']?.short || g.data['he-thong']?.name || 'Hệ Thống', id = await g.dialog.choose(fill(a.sys_ask.q), a.sys_ask.opts.map((o, i) => ({ id: i, label: o.label, color: '#5fd8f8' })), 400);
      const o = a.sys_ask.opts[id ?? 0];
      if (o?.reply) await g.dialog.say([[H, fill(o.reply)]]);
    }
    else if (a.hoi) {   // một nhân vật hỏi người chơi một câu (Vân Hạc: "Ngươi đứng đây vì ai?"): chọn xong người ấy đáp một câu, lựa chọn ghi thành cờ để truyện về sau nhắc lại. Không đổi luật chơi
      const id = await g.dialog.choose(fill(a.hoi.q), a.hoi.opts.map((o, i) => ({ id: i, label: o.label, color: g.data.npcs[a.hoi.ai]?.color || '#ffd98a' })), 400), o = a.hoi.opts[id];
      if (o?.flag) g.save.flags[o.flag] = true;
      const dap = o ? o.reply : a.hoi.im;   // đóng bảng không chọn: im lặng cũng là một câu trả lời (lời đáp "im"), không ghi cờ
      if (dap) await g.dialog.say([[g.data.npcs[a.hoi.ai]?.name || '', fill(dap)]]);
    }
    else if (a.choose_element) await chooseElement(g);
    else if (a.ky_nang) { if (hocKyNang(g, a.ky_nang).length) await new Promise(r => setTimeout(r, 2200)); }   // truyện dạy một Kỹ năng (data/ky-nang.json → hoc): hàng chữ lớn báo tên chiêu, đứng một nhịp cho người chơi nhìn nút mới
    else if (a.le_toc) await leToc(g, a.le_toc);   // Cây Thế Giới gọi tên huyết mạch (Tiềm năng, src/game/le-toc.js); giá trị là người đứng lễ
    else if (a.pickups) for (const [x, y] of dsNhat(a)) g.addPickup(a.pickups, x, y);
    else if (a.canh) { seen.canh = 1; await dan(g, a.canh); }   // dàn cảnh giữa các câu: tối, rung, chớp, tiếng, hiệu ứng, nhịp lặng (src/game/dan-canh.js)
    else if (a.chu) { g.chuLon?.(a.chu); if (a.chu.cho) await new Promise(r => setTimeout(r, a.chu.cho * 1000)); }   // hàng chữ lớn bên trái màn (src/ui/chu-lon.js); cho: chờ bấy nhiêu giây rồi mới làm lệnh kế
    else if ('dark' in a) g.darkTarget = a.dark;
    else if (a.spawn) {   // at: ô trên bản đồ; near: [lệch ngang, lệch dọc] tính bằng ô so với chỗ người chơi đang đứng; hp, atk: máu, công riêng cho lứa quái này; loot: 0 = không rơi đồ;
      // mul + tag: quái nhiễm ma khí như vòng ngoài tinh cầu (máu, công gấp mul lần, chữ tag trước tên, quầng tím dưới chân)
      const T = g.map.T || 16, at = a.near ? [Math.floor(g.player.x / T) + a.near[0], Math.floor(g.player.y / T) + a.near[1]] : a.at;
      for (let i = 0; i < a.n; i++) {
        const p = g.map.freeNear(at[0], at[1], a.spread || 1, 6), m = g.spawn(a.spawn, p.x, p.y, { story: true });
        if (a.mul) scaleMobBy(g, m, a.mul, a.tag);
        if (a.hp) m.hp = m.maxHp = a.hp;
        if (a.atk != null) m.def = { ...m.def, atk: a.atk };
        if (a.loot != null) m.lootMul = a.loot;
      }
    }
    else if ('nodeath' in a) g.noDeath = a.nodeath;
    else if (a.flash) g.flashT = 0.35;
    else if (a.fx) {   // dàn cảnh (src/render/draw-story-fx.js): đặt tại chỗ NPC, chờ wait giây cho cảnh chạy xong
      const at = g.npcs.find(e => e.id === a.npc) || g.player;
      g.storyFx = { ...a, t0: performance.now(), x: at.x, y: at.y, fog: a.fog || 6 };
      if (a.wait) await new Promise(r => setTimeout(r, a.wait * 1000));
    }
    else if (a.kill_all) { for (const m of g.mobs) m.dead = true; g.mobs = []; g.bullets = []; }
    else if (a.npc_add) g.addNpc(a.npc_add, a.near_player ? null : a.at);
    else if (a.stand_by) {   // dàn cảnh: đặt người chơi đứng ngay trước NPC, quay mặt vào (báo cáo #12: nhận kiếm mà đứng xa người trao)
      const n = g.npcs.find(e => e.id === a.stand_by), T = g.map.T || 16;
      if (n && g.player) { const p = g.map.freeNear(Math.floor(n.x / T), Math.floor(n.y / T) + 2, 1, 6); g.player.x = p.x; g.player.y = p.y; g.player.face = { x: 0, y: -1 }; }
    }
    else if (a.npc_remove) g.npcs = g.npcs.filter(n => n.id !== a.npc_remove);
    else if (a.flag) g.save.flags[a.flag] = true;
    else if (a.unflag) delete g.save.flags[a.unflag];
    else if (a.shake) g.screen.shake(a.shake, 0.6);
    else if (a.weapon) { g.save.weapon = a.weapon; g.refreshStats(); g.checkUnlocks(); }
    else if (a.gear) g.giveGear(a.gear);
    else if (a.item) g.save.items[a.item] = (g.save.items[a.item] || 0) + 1;
    else if (a.reward) await g.giveReward(a.reward);   // chờ người chơi xem xong nghi lễ nhận thưởng rồi mới nói tiếp
    else if (a.phap_bao) await pbGive(g, a.phap_bao);   // pháp bảo trao trong truyện (chặng leo bậc), cũng có nghi lễ
    else if (a.mats) for (const [k, n] of Object.entries(a.mats)) g.save.mats[k] = (g.save.mats[k] || 0) + n;
    else if (a.gem) g.save.gems[a.gem] = (g.save.gems[a.gem] || 0) + 1;   // ngọc ("loại:cấp"), cốt truyện người mới
    else if (a.pills) for (const [k, n] of Object.entries(a.pills)) g.save.pills[k] = (g.save.pills[k] || 0) + n;
    else if (a.technique) { if (!g.save.techs[a.technique]) g.learnTech(a.technique); }
    g.persist();
  }

  function fill(text) {
    const el = game.save.element ? game.data.elements[game.save.element].name : '';
    return text.replace('{element}', el).replace('{root}', rootOf(game.save, game.data).name);
  }

  function check(u) {
    const g = game, p = g.player;
    if (u.any) return u.any.some(check);
    if (u.reach) { const c = g.map.center(u.reach[0], u.reach[1]), gan = Math.hypot(p.x - c.x, p.y - c.y) < (u.r || 1) * g.map.T; return u.nut ? gan && !!st.events.lam : gan; }   // nut: tới nơi rồi còn phải tự tay làm (bấm nút việc tay)
    if (u.collect) return (st.counters[u.collect] || 0) >= u.n;
    if (u.kill) return (st.counters['kill:' + u.kill] || 0) >= u.n;
    if (u.realm) return g.save.realm >= u.realm;
    if (u.total) return totalLayer(g.save, g.data.realms) >= u.total;
    if (u.kill_all) return !g.mobs.some(m => m.story && !m.dead);
    if (u.hp_below) return p.hp / p.maxHp < u.hp_below;
    if (u.talk) return !!st.events['talk:' + u.talk];
    if (u.layer) return g.save.realm > 0 || g.save.layer >= u.layer;
    if (u.map) return g.map.id === u.map;
    if (u.boss_dead) return !!st.events.boss_dead;
    return false;
  }

  function advance() {
    const s = step(), P = pre(s);
    if (P && subI(s) < P.length) { game.save.bac = { s: s.id, i: subI(s) + 1 }; game.save.flags['leo-bac'] = true; }   // xong một bậc: sang bậc kế, hết bậc thì tới chính bước truyện
    else { delete game.save.flags['xong-' + s.id]; game.save.step += 1; }
    game.save.stepDone = false;
    game.checkUnlocks?.();   // mốc theo bước truyện (Linh Châu rơi sau boss đầu, src/game/phap-bao-grant.js)
    game.persist();
    runStep();
  }

  return {
    // Mở lại game: làm lại bước đang dở từ đầu (trừ bước chơi tự do và bước "once" đã làm: có thưởng, không phát lại)
    start() {
      // bản lưu đã qua bước đá linh căn (bước 1) mà chưa có hệ: hỏi chọn hệ ngay khi vào game
      if (game.save.step > 1 && !game.data.elements[game.save.element]) { st.busy = true; return chooseElement(game).finally(() => { st.busy = false; }).then(ok => ok && this.start()); }
      const s = unit();
      if (s && !s.until.never && !s.once) {
        if (game.save.stepDone) { const k = paid(s), seen = {}; for (const a of s.do || []) { const kind = GIVE.find(x => x in a) || (a.say && 'say'); if (kind) k[kind + (seen[kind] = (seen[kind] || 0) + 1)] = 1; } }   // bản lưu cũ: bước đã chạy xong một lần thì quà coi như đã phát, lời thoại coi như đã nghe
        game.save.stepDone = false;
      }
      return runStep().then(restorePickups);
    },
    get busy() { return st.busy; },
    update() {
      const s = unit();
      if (!s || st.busy || !game.save.stepDone || game.traveling) return;
      if (st.xong == null) {
        const co = 'xong-' + s.id;   // cờ ghi "việc của nhiệm vụ này đã xong, đang chờ màn lặng": thoát game lúc bảng kết quả bí cảnh còn mở thì vào lại không phải hạ trùm lần nữa
        if (!game.save.flags[co] && (!dungCho(s) || !check(s.until))) return;
        if (!(game.save.step >= MD && s.nv)) { advance(); return; }   // phần mở đầu (chặng leo bậc đã chốt nhịp riêng) và bước không phải nhiệm vụ: sang ngay như cũ
        st.xong = game.time || 0; st.xongMap = game.map.id;   // chốt: việc đã xong thì không "chưa xong" lại (bước ra khỏi chỗ vừa tới…)
        if (!game.save.flags[co]) { game.save.flags[co] = true; game.persist(); }
      }
      const u = s.until, now = game.time || 0;
      if (!(game.manLang?.() ?? true)) {   // màn chưa lặng: chờ. Riêng Tự hành mà bảng cứ mở mãi không ai đóng (bảng kết quả bí cảnh) thì sau CHO giây tự dọn bảng đi tiếp;
        st.lang = null;                     // màn tối (treo máy) và màn che lúc tải bản đồ thì chờ tới khi có người xem
        if (!(game.pilot && now - st.xong > CHO && !game.manToi && !game.cheMan)) return;
        game.closeAll?.();
      } else {
        st.lang ??= now;
        // tự tay bấm (nói chuyện, việc tay) thì đáp ngay; việc xong bị động (nhặt đủ, hạ trùm) thì thẻ ✓ một nhịp; vừa tới bản đồ khác (bay tới tinh cầu mới, hạ trùm xong bấm Thoát ra ngoài) thì nhìn cảnh một lúc đã
        if (now - st.lang < (u.talk || u.nut ? 0 : u.map || st.xongMap !== game.map.id ? NHIP_TOI : NHIP)) return;
      }
      advance();
    },
    notify(type, id) {
      if (type === 'collect') st.counters[id] = (st.counters[id] || 0) + 1;
      else if (type === 'kill') { const at = unit()?.until?.in; if (at && game.map.id !== at) return; st.counters['kill:' + id] = (st.counters['kill:' + id] || 0) + 1; st.counters['kill:*'] = (st.counters['kill:*'] || 0) + 1; }   // until.kill '*': con nào cũng tính; until.in: chỉ tính quái hạ ở bản đồ đó (bậc "Dọn hai phòng quái": lỡ ra ngoài hạ quái bãi thì không tính)
      else st.events[type + (id ? ':' + id : '')] = true;
      if (type === 'boss') st.events.boss_dead = true;
      if (type === 'enter') restorePickups();
    },
    // Chữ nhiệm vụ và ô chỉ đường đang hiện
    goal() {
      const s = unit();
      if (!s || !game.save.stepDone || !s.goal || s.until.never) return null;   // hết truyện (cày bí cảnh + nhiệm vụ): không còn khung nhiệm vụ truyện, chỉ còn cột nhiệm vụ ngày
      const key = s.until.collect || (s.until.kill && 'kill:' + s.until.kill);
      const n = key ? Math.min(st.counters[key] || 0, s.until.n) : 0;
      const u = s.until;   // talk, collect, hunt: cho mũi tên chỉ đường (src/game/guide.js) khi bước không có ô đích: gặp ai, nhặt gì, hay dọn quái / hạ trùm
      return { so: s.nv || 0, ten: tenCua(s), goc: s.goal, xong: st.xong != null, text: s.goal.replace('{n}', n), target: (s.target_map || s.map || step().map) === game.map.id ? s.target : null, kill: u.kill || null, talk: u.talk || null, collect: u.collect || null, hunt: !!(u.boss_dead || u.kill_all), n, of: key ? u.n : 0 };
    },
    // Bậc đang leo của chặng leo bậc: { i: bậc thứ mấy, n: tổng số bậc, u: bậc (goal, until, thuong) }, null khi không ở chặng này. Đang leo bậc thì chưa dùng
    // Tự hành, Tự đánh (người chơi tự tay đánh): src/game/pilot.js, auto.js hỏi game.story.rung()
    rung, pbHold, khoa,
    // Hành trình: mọi nhiệm vụ chính theo thứ tự [{ so, ten, goal, xong, dang }] (bảng Hệ Thống → Nhiệm vụ). xong: đã qua; dang: đang làm
    list() {
      const cur = unit(), so = cur?.nv || (game.save.step >= steps.length - 1 ? nvN + 1 : 0);
      // Người chơi cũ được chuyển thẳng tới cuối phần mở đầu (chưa có cờ mo_dau_co: chưa thấy cảnh mở đầu) thì Hành trình bắt đầu từ nhiệm vụ đầu tiên họ thật sự làm
      const tu = game.save.step >= MD && game.data.story.mo_dau_co && !game.save.flags[game.data.story.mo_dau_co] ? steps[MD].nv || 1 : 1;
      return ds.filter(u => u.nv >= tu).map(u => ({ so: u.nv, ten: tenCua(u), goal: (u.goal || '').replace(/\s*\(\{n\}\/\d+\)\s*$/, ''), xong: !!so && u.nv < so, dang: u.nv === so }));
    },
    // Bước đang chạy và đã tới phần chờ điều kiện chưa (cho tự hành)
    current() { return game.save.stepDone ? unit() : null; },
    // NPC này đang được nhiệm vụ chờ nói chuyện?
    wants(npcId) { const s = unit(); return !!(s && s.until.talk === npcId && game.save.stepDone); },
    // Việc tay của nhiệm vụ đang làm (until.nut: "Gióng chuông", "Đặt thẻ"…): đứng đúng chỗ thì trả tên việc, nút hành động trên màn chơi đổi thành tên ấy
    // (src/game/interact.js), bấm là notify('lam'). Tự hành tới nơi thì tự bấm (src/game/pilot.js).
    viec() {
      const s = unit(), u = s?.until, p = game.player;
      if (!u?.nut || !u.reach || !p || st.busy || !game.save.stepDone || st.xong != null || !dungCho(s)) return null;
      const c = game.map.center(u.reach[0], u.reach[1]);
      return Math.hypot(p.x - c.x, p.y - c.y) < (u.r || 1) * game.map.T ? u.nut : null;
    },
    get xong() { return st.xong != null; },   // việc đã xong, đang chờ màn lặng để sang nhiệm vụ kế
    get sauMoDau() { return game.save.step >= MD; },   // đã qua phần mở đầu: đang ở chuỗi nhiệm vụ chính
    get nghi() { const u = unit()?.until; return !u || !!(u.never || u.realm || u.total || u.layer); },   // truyện đang nghỉ: chờ người chơi tu luyện (hoặc hết nhiệm vụ đã viết), không có việc dở tay
  };
}

// Chỉ còn cốt truyện mới (data/story.json; chủ dự án 02/11/2026 14:56: xoá hẳn cốt truyện cũ). Bản lưu đang đi truyện cũ
// (storyV khác 2, đã qua bước 0) sang thẳng bước cuối truyện mới (cày bí cảnh + nhiệm vụ), không chạy lại cảnh; nhận các cờ mở
// tinh cầu, bí cảnh, động phủ của bước cuối. Cờ truyện cũ, đồ, cảnh giới giữ nguyên.
function pickStory(game) {
  const d = game.data, s = game.save;
  const steps = d.story.steps, last = moDauI(d.story);   // last: bước hết phần mở đầu (trước 21/11/2026 cũng là bước cuối truyện)
  if (s.storyV !== 2) {
    s.storyV = 2;
    if (!s.step) return;
    s.step = last; s.stepDone = true;
    s.flags['mo-bi-canh'] = true;
  }
  // Đã ở bước cuối: nhận đủ cờ mở của bước cuối (cờ thêm về sau như Lòng Vết Nứt, Hư Không Lao, Rễ Mẫu Thụ 02/11 thì người đã
  // qua bước này cũng có). Không đặt cờ "người ấy bị bắt": người chơi cũ chưa gặp.
  if (!((s.step || 0) > last || (s.step === last && s.stepDone))) return;
  let add = 0;
  for (const a of steps[last].do || []) if (a.flag && !/vang\|?|^\{/.test(a.flag) && !s.flags[a.flag]) { s.flags[a.flag] = true; add++; }
  if (add) game.persist?.();
}
