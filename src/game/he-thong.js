// Hệ Thống Tu Tiên đi theo ký chủ (data/he-thong.json; chủ dự án 06/11/2026 16:15). Phần trạng thái và lúc hệ thống tự lên tiếng;
// bảng và biểu tượng ở src/ui/he-thong.js. Lời chào lần đầu nhớ trong bản lưu (save.ht.intro), người mới và người cũ chào khác nhau.
// Tự lên tiếng (nudge): đứng yên idle_s giây không tự đánh / tự hành / mở bảng; gục deaths lần trong deaths_s giây; tới bước truyện
// có trong steps. Mỗi loại cách nhau ít nhất 3 phút cho khỏi phiền.

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
  return cur?.goal || null;
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
  // đứng yên không làm gì
  const busy = p.moving || game.auto || game.pilot || game.uiOpen || p.meditating || game.fish;
  s.idle = busy ? 0 : s.idle + dt;
  if (s.idle >= C.idle_s && ok('idle') && htTask(game)) { s.last.idle = now; s.idle = 0; return C.nudge.idle; }
  return null;
}
