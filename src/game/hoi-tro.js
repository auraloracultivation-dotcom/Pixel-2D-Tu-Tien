// Trò diễn ở lễ hội (data/le-hoi.json → festivals.<bản đồ>.tro): tính trạng thái mỗi khung ở đây, vẽ ở src/render/draw-hoi-tro.js.
// Mỗi trò gắn vào một món đồ hội (item: mã hình, món đầu tiên trên bản đồ), toạ độ trò tính lệch từ chân món đó.
// - ty-vo: hai đệ tử tỷ thí trên lôi đài: áp sát, lần lượt lấy đà rồi đánh (tóe tia lửa, khán giả reo), sau vài hiệp một người ngã,
//   giấy màu bung lên, nghỉ một chút rồi đứng dậy đấu tiếp.
// - trong: người đánh trống rồng theo nhịp, trống nảy lên, chữ "Tùng!" bay lên.
// - mua-kiem: người múa kiếm đi vòng tròn chậm, kiếm bay quay quanh người.
// Khán giả (khách đi hội, hoi-khach.js) trong tầm reo hò khi có cú đánh trúng, cú hạ gục (game.hoiTro.cheer).
const F = game => game.data['le-hoi']?.festivals?.[game.map?.id]?.tro;

function init(game, list) {
  return list.map(c => {
    const it = game.map.hoi.find(h => h.id === c.item);
    return it ? { c, it, t: Math.random() * 2, a: 0, b: 0, round: 0, hits: 0, turn: 0, sparks: [], bits: [], words: [] } : null;
  }).filter(Boolean);
}

export function updateTro(game, dt) {
  const list = F(game);
  if (!list || !game.map.hoi?.length) { game.hoiTro = null; return; }
  if (game.hoiTro?.map !== game.map) game.hoiTro = { map: game.map, list: init(game, list), cheer: null };
  const H = game.hoiTro;
  for (const s of H.list) {
    s.t += dt;
    for (const p of s.sparks) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; }
    s.sparks = s.sparks.filter(p => p.t < p.life);
    for (const p of s.bits) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 26 * dt; p.vx *= 0.99; }
    s.bits = s.bits.filter(p => p.t < p.life);
    for (const w of s.words) w.t += dt;
    s.words = s.words.filter(w => w.t < 1.1);
    if (s.c.kind === 'ty-vo') tyVo(H, s, dt);
    else if (s.c.kind === 'trong') trong(H, s);
  }
}

function burst(s, x, y, n, cols, sp) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, v = sp * (0.4 + Math.random());
    s.sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - sp * 0.3, t: 0, life: 0.25 + Math.random() * 0.25, c: cols[i % cols.length] });
  }
}

// Tỷ võ: phase đi (áp sát), danh (đổi đòn), nga (một người ngã), nghi
function tyVo(H, s, dt) {
  const c = s.c, x0 = s.it.x + (c.dx || 0), y0 = s.it.y + (c.dy || 0);
  s.phase ??= 'di';
  if (s.phase === 'di') {   // hai người bước vào giữa đài
    s.gap = Math.max(c.gap, (s.gap ?? c.gap * 2.4) - dt * 9);
    if (s.gap <= c.gap) { s.phase = 'danh'; s.t = 0; s.hits = 0; }
  } else if (s.phase === 'danh') {
    const beat = 0.75, k = s.t % beat, n = Math.floor(s.t / beat);
    s.turn = n % 2;
    s.pose = k < 0.28 ? 'wind' : k < 0.48 ? 'hit' : 'idle';
    s.lunge = s.pose === 'hit' ? 3 : s.pose === 'wind' ? -1.5 : 0;
    if (n > s.hits && s.pose === 'hit') {   // cú đánh trúng: tia lửa, người kia lùi
      s.hits = n;
      const hx = x0 + (s.turn ? -1 : 1) * 2;
      burst(s, hx, y0 - 12, 9, ['#fff6c0', '#ffd060', '#ff9a40', '#ffffff'], 46);
      if (Math.random() < 0.35) s.words.push({ text: Math.random() < 0.5 ? 'Keng!' : 'Choang!', x: hx, y: y0 - 26, t: 0 });
      H.cheer = { x: x0, y: y0, t: performance.now(), big: false };
    }
    if (s.t > beat * (c.blows + (s.round % 3))) { s.phase = 'nga'; s.t = 0; s.loser = Math.random() < 0.5 ? 0 : 1; H.cheer = { x: x0, y: y0, t: performance.now(), big: true }; confetti(s, x0, y0 - 30, c.mau); }
  } else if (s.phase === 'nga') {
    s.pose = 'idle'; s.lunge = 0;
    if (s.t > 2.6) { s.phase = 'nghi'; s.t = 0; }
  } else if (s.t > 1.2) { s.phase = 'di'; s.gap = c.gap * 2.4; s.round++; }
}

function confetti(s, x, y, cols) {
  for (let i = 0; i < 46; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.2, v = 30 + Math.random() * 40;
    s.bits.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, t: 0, life: 1.8 + Math.random() * 1.2, c: cols[i % cols.length], w: Math.random() < 0.5 ? 1 : 2 });
  }
}

// Trống: đánh theo nhịp trong c.beat (1 = đánh, 0 = nghỉ), mỗi ô 0,3 giây
function trong(H, s) {
  const c = s.c, n = Math.floor(s.t / 0.3), on = c.beat[n % c.beat.length] === 1, k = (s.t % 0.3) / 0.3;
  s.pose = on ? (k < 0.4 ? 'wind' : 'hit') : 'idle';
  s.pulse = on && k > 0.4 ? 1 - (k - 0.4) / 0.6 : 0;
  if (on && n !== s.last) {
    s.last = n;
    if (n % c.beat.length === 0) { s.words.push({ text: 'Tùng!', x: s.it.x + (Math.random() - 0.5) * 10, y: s.it.y - s.it.h, t: 0 }); H.cheer = { x: s.it.x, y: s.it.y, t: performance.now(), big: false, quiet: true }; }
  }
}
