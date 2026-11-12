// Hệ Thống Tu Tiên đi theo ký chủ (data/he-thong.json; chủ dự án 06/11/2026 16:15). Phần trạng thái và lúc hệ thống tự lên tiếng;
// bảng và biểu tượng ở src/ui/he-thong.js. Lời chào lần đầu nhớ trong bản lưu (save.ht.intro), người mới và người cũ chào khác nhau.
// Tự lên tiếng (nudge): đứng yên idle_s giây không tự đánh / tự hành / mở bảng; gục deaths lần trong deaths_s giây; tới bước truyện
// có trong steps. Mỗi loại cách nhau ít nhất 3 phút cho khỏi phiền.

import { ensureDaily, taskDef, taskText } from './daily.js';

const H = game => game.data['he-thong'];
const GAP = 180000;

export function htState(game) { return (game.htS ??= { idle: 0, deaths: [], last: {}, step: game.save?.step ?? 0, alive: true }); }

// Còn chưa chào: 'new' (người mới, bước truyện đầu) | 'old' | null
export function needIntro(game) {
  if (!game.save || game.save.ht?.intro) return null;
  return (game.save.step || 0) <= 2 ? 'new' : 'old';
}
export function doneIntro(game) { (game.save.ht ??= {}).intro = 1; game.persist?.(); }

// Việc hệ thống giao lúc này: mục tiêu truyện chính đang làm
export function htTask(game) {
  const cur = game.story?.current?.();
  return cur?.goal ? (game.story.goal?.()?.text || cur.goal.replace('{n}', '0')) : null;   // goal(): đã thay {n} bằng số đã làm
}

// Gọi mỗi giây (src/ui/he-thong.js). Trả câu nhắc (một dòng) hoặc null.
export function htTick(game, dt) {
  const C = H(game), p = game.player, s = htState(game);
  if (!C || !p || !game.save || game.trip || game.dialog?.open) return null;
  const now = Date.now(), ok = k => now - (s.last[k] || 0) > GAP;
  // gục: hp về 0
  if (p.hp <= 0 && s.alive) { s.alive = false; s.deaths.push(now); }
  if (p.hp > 0) s.alive = true;
  s.deaths = s.deaths.filter(t => now - t < C.deaths_s * 1000);
  if (s.deaths.length >= C.deaths && ok('death')) { s.last.death = now; s.deaths = []; return C.nudge.death; }
  // bước truyện mới
  const st = game.save.step || 0;
  if (st !== s.step) {
    s.step = st;
    if (C.steps[st]) return C.steps[st];
  }
  // đầy linh khí chờ độ kiếp: tự hành không tự độ (pilot.peak), người mới không biết phải bấm (test 10/11/2026: kẹt Luyện Khí 9)
  if (C.nudge.kiep && game.trib?.canStart?.() && !game.trib.active && ok('kiep')) { s.last.kiep = now; return C.nudge.kiep; }
  // đứng yên không làm gì
  const busy = p.moving || game.auto || game.pilot || game.uiOpen || p.meditating || game.fish;
  s.idle = busy ? 0 : s.idle + dt;
  if (s.idle >= C.idle_s && ok('idle') && htTask(game)) { s.last.idle = now; s.idle = 0; return C.nudge.idle; }
  return null;
}

// Điều kiện nhiệm vụ trên bản lưu trong máy (cùng cách tính với máy chủ p2d_ht_dk)
export function missionDone(save, dk) {
  if (!save || !dk) return false;
  const n = o => (o && typeof o === 'object' ? Object.keys(o).length : 0);
  const eqUids = new Set(Object.values(save.equip || {})), worn = (save.bag || []).filter(it => eqUids.has(it.uid));
  if (dk.step != null && (save.step || 0) < dk.step) return false;
  if (dk.realm != null) {
    if ((save.realm || 0) < dk.realm) return false;
    if (dk.layer != null && (save.realm || 0) === dk.realm && (save.layer || 1) < dk.layer) return false;
  }
  if (dk.equip != null && n(save.equip) < dk.equip) return false;
  for (const k of ['techs', 'pets', 'mounts']) if (dk[k] != null && n(save[k]) < dk[k]) return false;
  if (dk.plus != null && Math.max(0, ...worn.map(it => it.plus || 0)) < dk.plus) return false;
  if (dk.socket != null && worn.reduce((a, it) => a + (it.sockets || []).filter(x => typeof x === 'string').length, 0) < dk.socket) return false;
  // Hệ Pháp Bảo Luyện Chế (12/11/2026, máy chủ p2d_ht_dk cùng luật): pb_wear món đang mặc, pb_mods chiêu khảm trên món đang mặc, pb_lv / pb_slots cao nhất
  const pi = save.phapBao?.items || [], pw = (save.phapBao?.wear || []).map(u => pi.find(i => i.uid === u)).filter(Boolean);
  if (dk.pb_wear != null && pw.length < dk.pb_wear) return false;
  if (dk.pb_mods != null && pw.reduce((a, it) => a + (it.mods || []).slice(0, it.slots).filter(Boolean).length, 0) < dk.pb_mods) return false;
  if (dk.pb_lv != null && Math.max(0, ...pi.map(i => i.lv || 0)) < dk.pb_lv) return false;
  if (dk.pb_slots != null && Math.max(0, ...pi.map(i => i.slots || 0)) < dk.pb_slots) return false;
  return true;
}

// Danh sách nhiệm vụ hiện ra: mọi nhiệm vụ đã đủ điều kiện mà chưa nhận (nhận được ngay), rồi các nhiệm vụ chưa xong kế tiếp cho đủ
// show_n (theo thứ tự). Kẹt một nhiệm vụ (chưa có linh thú...) vẫn thấy và nhận được các nhiệm vụ sau đã xong.
export function missionList(game, xong = []) {
  const H = game.data['he-thong'], done = new Set(xong), n = H.show_n || 3;
  const all = (H.missions || []).filter(m => !done.has(m.id)).map(m => ({ ...m, ok: missionDone(game.save, m.dk) }));
  const ok = all.filter(m => m.ok), todo = all.filter(m => !m.ok).slice(0, Math.max(0, n - ok.length) || 1);
  return [...ok, ...todo];
}

// Nhiệm vụ ngày (data/he-thong.json → ngay): luôn mở, song hành nhiệm vụ hệ thống. Việc ngày lấy từ bản lưu (game/daily.js).
// Trả null khi chưa mở; mỗi việc { id, text, ok, got }.
export function dailyList(game, ht) {
  if (!game.save) return null;   // song hành với nhiệm vụ hệ thống, không chờ làm hết (chủ dự án 10/11/2026 09:47)
  const dl = ensureDaily(game), got = new Set(ht?.ngay_xong || []);
  return dl.tasks.map(t => { const d = taskDef(game, t.id); return d && { id: t.id, text: taskText(d, t.n), ok: t.n >= d.n, got: got.has(t.id) }; }).filter(Boolean);
}
