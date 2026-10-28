// Ngự kiếm (data/heroes.json → fly, chủ dự án chốt 28/10/2026): vũ khí luôn bay sau lưng người chơi.
// Đánh thường: người ra động tác đánh của mình (chuỗi attacks của nhân vật), cùng lúc vũ khí từ sau lưng lao ra theo đúng động tác đó
// (fly.moves: bổ, hất, quét, xoay, móc; nhân vật không có động tác thì xoay vòng đâm, quét, bổ), cung và đàn ra trước mặt bắn, rồi bay về.
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

// Bắt đầu một đòn. kind: 'arc' (cận chiến) | 'shot' (bắn). Chọn động tác kế tiếp trong chuỗi của nhân vật (p.heroAnim cho
// render/draw-hero.js chạy khung cùng lúc) và đường bay vũ khí tương ứng. Trả về số giây tới lúc trúng (player.js tính sát thương).
export function startStrike(game, kind, dir, reach, half) {
  const p = game.player, c = C(game), fw = ensure(game), H = game.data.heroes;
  const look = H.list[game.save?.look] || H.list[H.default], atks = look?.sprite && look.attacks?.length ? look.attacks : null;
  const fresh = game.time - (fw.last ?? -99) > (H.combo_reset || 1.2);
  fw.n = fresh ? 0 : (fw.n + 1) % (atks ? atks.length : c.combo.length);
  fw.last = game.time;
  const anim = atks ? atks[fw.n] : null, move = kind === 'shot' ? 'ban' : (anim && c.moves[anim]) || c.combo[fw.n % c.combo.length];
  p.heroAnim = anim ? { name: anim, t0: game.time } : null;
  fw.act = { move, dir, reach, half, front: c.front, side: Math.cos(dir) >= 0 ? 1 : -1, t: 0, sx: fw.x, sy: fw.y, sa: fw.a };
  fw.trail = [];
  return c.times.wind + c.times.strike;
}

function ensure(game) {
  const p = game.player;
  return p.fw ??= { x: p.x, y: p.y - 16, a: -Math.PI / 2, n: 0, trail: [], front: false };
}

const bez = (a, b, c, k) => (1 - k) * (1 - k) * a + 2 * (1 - k) * k * b + k * k * c;

// Vị trí theo động tác ở thời điểm k của pha lao ra (0 → 1), quanh ngực người chơi O. side: 1 nhìn phải, -1 nhìn trái
function strikePose(A, O, k) {
  const ca = Math.cos(A.dir), sa = Math.sin(A.dir), sd = A.side, R = A.reach;
  if (A.move === 'quet') {   // quét ngang: lượn cung quanh người từ bên này sang bên kia, mũi hướng ra ngoài
    const q = A.dir - A.half + 2 * A.half * k;
    return { x: O.x + Math.cos(q) * R * 0.85, y: O.y + Math.sin(q) * R * 0.85, a: q };
  }
  if (A.move === 'xoay') {   // chém vòng: xoay trọn một vòng quanh người, dừng ở trước mặt
    const q = A.dir - Math.PI * 2 * (1 - k);
    return { x: O.x + Math.cos(q) * R * 0.8, y: O.y + Math.sin(q) * R * 0.8, a: q + 0.5 * sd };
  }
  if (A.move === 'hat') {   // hất lên: từ sát đất phía trước vút lên cao, mũi từ chúc xuống chuyển sang chĩa lên
    return { x: bez(O.x + ca * R * 0.5, O.x + ca * R * 1.05, O.x + ca * R * 0.75, k), y: bez(O.y + sa * R * 0.5 + 12, O.y + sa * R - 2, O.y + sa * R * 0.75 - 18, k), a: A.dir + sd * (1 - 2.3 * k) };
  }
  if (A.move === 'moc') {   // móc sát đất: lưỡi ra xa trước mặt rồi kéo vòng về gần chân
    const q = A.dir - 0.5 * sd + 1.2 * sd * k, r = R * (1 - 0.5 * k);
    return { x: O.x + Math.cos(q) * r, y: O.y + 7 + Math.sin(q) * r, a: q + 1.9 * sd };
  }
  if (A.move === 'bo') {   // bổ: vọt lên cao rồi bổ xuống chỗ trước mặt, xoay một vòng
    const tx = O.x + ca * R * 0.8, ty = O.y + sa * R * 0.8, up = 18 * (1 - k);
    return { x: lerp(O.x + ca * 4, tx, k), y: lerp(O.y - 16, ty, k) - up * Math.sin(Math.PI * k), a: A.dir - Math.PI * 1.5 * (1 - k) * sd };
  }
  if (A.move === 'ban') return { x: O.x + ca * A.front, y: O.y + sa * A.front, a: A.dir };   // bắn: ra trước mặt, chĩa về hướng bắn
  return { x: O.x + ca * R, y: O.y + sa * R, a: A.dir };   // đâm: lao thẳng tới tầm đánh
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
  if (A.t < t1) {   // lấy đà: lùi nhẹ về sau, xoay mũi về hướng bắt đầu động tác
    const k = A.t / t1, back = { x: home.x - Math.cos(A.dir) * 3, y: home.y - Math.sin(A.dir) * 3 };
    pose = { x: lerp(A.sx, back.x, k), y: lerp(A.sy, back.y, k), a: turn(A.sa, strikePose(A, O, 0).a, k) };
    A.wx = pose.x; A.wy = pose.y;
  } else if (A.t < t2) {   // lao ra: đầu pha hoà từ chỗ lấy đà vào đường bay của động tác, khỏi giật cục
    const raw = (A.t - t1) / T.strike, k = ease(raw), end = strikePose(A, O, k), b = A.move === 'dam' || A.move === 'ban' ? k : Math.min(1, raw / 0.35);
    pose = { x: lerp(A.wx ?? home.x, end.x, b), y: lerp(A.wy ?? home.y, end.y, b), a: end.a };
  } else if (A.t < t3) {   // giữ đỉnh (bắn thì giật lùi một chút)
    const end = strikePose(A, O, 1), kick = A.move === 'ban' ? 2 * (1 - (A.t - t2) / T.hold) : 0;
    pose = { x: end.x - Math.cos(A.dir) * kick, y: end.y - Math.sin(A.dir) * kick, a: end.a };
  } else if (A.t < t4) {   // bay về sau lưng
    const k = ease((A.t - t3) / T.back), end = strikePose(A, O, 1);
    pose = { x: lerp(end.x, home.x, k), y: lerp(end.y, home.y, k), a: turn(end.a, home.a, k) };
  } else { fw.act = null; return; }
  if (A.t >= t1 && A.t < t3) { fw.trail.unshift({ x: fw.x, y: fw.y, a: fw.a }); fw.trail.length = Math.min(fw.trail.length, A.move === 'dam' || A.move === 'ban' ? c.trail : c.trail + 2); }   // đường lượn: bóng dài hơn
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
