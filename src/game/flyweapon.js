// Ngự kiếm (data/heroes.json → fly, chủ dự án chốt 28/10/2026): vũ khí không cầm tay mà luôn bay sau lưng người chơi.
// Đánh thường: người chỉ vận lực, vũ khí từ sau lưng lao ra đâm / quét / bổ (cận chiến) hoặc ra trước mặt bắn (cung, đàn) rồi bay về.
// Vị trí, góc vũ khí tính ở đây mỗi nhịp (render/draw-flyweapon.js chỉ vẽ); sát thương tính lúc vũ khí lao tới nơi (player.js).
const C = game => game.data.heroes.fly;
const ease = k => 1 - (1 - k) * (1 - k);
const lerp = (a, b, k) => a + (b - a) * k;
const turn = (a, b, k) => { const d = Math.atan2(Math.sin(b - a), Math.cos(b - a)); return a + d * k; };

// Chỗ treo khi rảnh: sau lưng, mũi chĩa lên hơi nghiêng về trước; đả tọa thì lượn vòng quanh người
function rest(game, p, t) {
  const c = C(game), side = p.lookX || 1;
  if (p.meditating) {
    const q = t * Math.PI * 2 * c.orbit.speed;
    return { x: p.x + Math.cos(q) * c.orbit.r, y: p.y - 8 + Math.sin(q) * c.orbit.r * 0.45, a: q + Math.PI / 2, front: Math.sin(q) > 0 };
  }
  return { x: p.x + side * c.back[0], y: p.y + c.back[1] + Math.sin(t * 2.2) * c.bob, a: -Math.PI / 2 + side * 0.35, front: false };
}

// Bắt đầu một đòn. kind: 'arc' (cận chiến) | 'shot' (bắn). Trả về số giây tới lúc trúng (để player.js tính sát thương đúng lúc).
export function startStrike(game, kind, dir, reach, half) {
  const p = game.player, c = C(game), fw = ensure(game);
  const fresh = game.time - (fw.last ?? -99) > (game.data.heroes.combo_reset || 1.2);
  fw.n = fresh ? 0 : (fw.n + 1) % c.combo.length;
  fw.last = game.time;
  fw.act = { move: kind === 'shot' ? 'ban' : c.combo[fw.n], dir, reach, half, front: c.front, t: 0, sx: fw.x, sy: fw.y, sa: fw.a };
  fw.trail = [];
  return c.times.wind + c.times.strike;
}

function ensure(game) {
  const p = game.player;
  return p.fw ??= { x: p.x, y: p.y - 16, a: -Math.PI / 2, n: 0, trail: [], front: false };
}

// Vị trí theo động tác ở thời điểm k của pha lao ra (0 → 1), quanh ngực người chơi O
function strikePose(A, O, k) {
  const ca = Math.cos(A.dir), sa = Math.sin(A.dir);
  if (A.move === 'quet') {   // quét: lượn cung quanh người từ bên này sang bên kia, mũi hướng ra ngoài
    const q = A.dir - A.half + 2 * A.half * k, R = A.reach * 0.85;
    return { x: O.x + Math.cos(q) * R, y: O.y + Math.sin(q) * R, a: q };
  }
  if (A.move === 'bo') {   // bổ: vọt lên cao rồi bổ xuống chỗ trước mặt, xoay một vòng
    const R = A.reach * 0.8, tx = O.x + ca * R, ty = O.y + sa * R, up = 18 * (1 - k);
    return { x: lerp(O.x + ca * 4, tx, k), y: lerp(O.y - 16, ty, k) - up * Math.sin(Math.PI * k), a: A.dir - Math.PI * 1.5 * (1 - k) };
  }
  if (A.move === 'ban') return { x: O.x + ca * A.front, y: O.y + sa * A.front, a: A.dir };   // bắn: ra trước mặt, chĩa về hướng bắn
  return { x: O.x + ca * A.reach, y: O.y + sa * A.reach, a: A.dir };   // đâm: lao thẳng tới tầm đánh
}

export function updateFlyWeapon(game, dt) {
  const p = game.player;
  if (!p) return;
  const c = C(game), fw = ensure(game), t = game.time, home = rest(game, p, t), A = fw.act;
  if (!A) {
    const k = Math.min(1, dt * c.follow);
    fw.x = lerp(fw.x, home.x, k); fw.y = lerp(fw.y, home.y, k); fw.a = turn(fw.a, home.a, k);
    fw.front = home.front; fw.trail.length = 0;
    return;
  }
  A.t += dt;
  const T = c.times, O = { x: p.x, y: p.y - 8 }, t1 = T.wind, t2 = t1 + T.strike, t3 = t2 + T.hold, t4 = t3 + T.back;
  let pose;
  if (A.t < t1) {   // lấy đà: lùi nhẹ về sau, xoay mũi về hướng đánh
    const k = A.t / t1, back = { x: home.x - Math.cos(A.dir) * 3, y: home.y - Math.sin(A.dir) * 3 };
    pose = { x: lerp(A.sx, back.x, k), y: lerp(A.sy, back.y, k), a: turn(A.sa, A.move === 'quet' ? A.dir - A.half : A.dir, k) };
    A.wx = pose.x; A.wy = pose.y;
  } else if (A.t < t2) {   // lao ra
    const k = ease((A.t - t1) / T.strike), end = strikePose(A, O, k);
    const from = A.move === 'dam' || A.move === 'ban' ? { x: A.wx ?? home.x, y: A.wy ?? home.y } : null;
    pose = from ? { x: lerp(from.x, end.x, k), y: lerp(from.y, end.y, k), a: end.a } : end;
  } else if (A.t < t3) {   // giữ đỉnh (bắn thì giật lùi một chút)
    const end = strikePose(A, O, 1), kick = A.move === 'ban' ? 2 * (1 - (A.t - t2) / T.hold) : 0;
    pose = { x: end.x - Math.cos(A.dir) * kick, y: end.y - Math.sin(A.dir) * kick, a: end.a };
  } else if (A.t < t4) {   // bay về sau lưng
    const k = ease((A.t - t3) / T.back), end = strikePose(A, O, 1);
    pose = { x: lerp(end.x, home.x, k), y: lerp(end.y, home.y, k), a: turn(end.a, home.a, k) };
  } else { fw.act = null; return; }
  if (A.t >= t1 && A.t < t3) { fw.trail.unshift({ x: fw.x, y: fw.y, a: fw.a }); fw.trail.length = Math.min(fw.trail.length, c.trail); }
  else fw.trail.length = 0;
  fw.x = pose.x; fw.y = pose.y; fw.a = pose.a;
  fw.front = A.t >= t1 && A.t < t4 - T.back * 0.4;   // đang lao ra, giữ thì vẽ trước người
}

// Tiến trình đòn (0 → 1 trong lúc lấy đà + lao + giữ) cho người nhún tới; null khi rảnh
export function strikeLean(game) {
  const A = game.player?.fw?.act, T = C(game).times;
  if (!A) return null;
  const k = A.t / (T.wind + T.strike + T.hold);
  return k <= 1 ? k : null;
}

// Điểm vũ khí đang ở (đạn bắn ra từ đây)
export const weaponPoint = game => { const fw = game.player.fw; return fw ? { x: fw.x, y: fw.y } : { x: game.player.x, y: game.player.y - 4 }; };
