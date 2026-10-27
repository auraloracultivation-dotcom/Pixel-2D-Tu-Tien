// Hội đèn ở xóm (data/fair.json): mỗi tối một tinh cầu theo thứ trong tuần mở hội ở sân xóm. Đứng trong sân thì linh khí nhân thêm,
// linh thực tinh cầu đó nửa giá, ăn lâu gấp đôi; dây đèn lồng, pháo hoa (vẽ ở src/render/draw-fair.js), dân làng nói câu hội.
const F = game => game.data.fair;
const pick = a => a[Math.floor(Math.random() * a.length)];
const rnd = ([a, b]) => a + Math.random() * (b - a);

// Tinh cầu đang mở hội lúc này (null là không có hội)
export function fairMap(game, d = new Date()) {
  const f = F(game), h = d.getHours();
  return h >= f.hours[0] && h < f.hours[1] ? f.days[d.getDay()] : null;
}

// Tâm sân xóm có hội trên bản đồ đang đứng
export function fairSpot(game) {
  const hm = game.map?.def.hamlets?.[0];
  return hm && fairMap(game) === game.map.id ? game.map.center(hm[0], hm[1]) : null;
}

export function inFair(game) {
  const s = fairSpot(game), p = game.player;
  return !!s && !!p && Math.hypot(p.x - s.x, p.y - s.y) < F(game).r * game.map.T;
}
export const fairQi = game => (inFair(game) ? F(game).qi : 1);

// Giá và thời gian linh thực khi tinh cầu đó đang có hội
export const fairSnack = (game, d) => (fairMap(game) === d.map ? { price: Math.round(d.price * F(game).snack_price), mul: F(game).snack_min } : { price: d.price, mul: 1 });

// Một dòng cho bảng sự kiện (không nhân gì, chỉ báo)
export function fairEvent(game) {
  const id = fairMap(game), f = F(game);
  if (!id) return null;
  const map = game.data.maps[id]?.name || id;
  return { id: 'hoi-den', name: f.texts.event.replace('{map}', map), desc: f.texts.event_desc.replace('{qi}', f.qi), color: '#ffb347' };
}

export function updateFair(game, dt) {
  const f = F(game), st = game.fair ??= { fx: [], fwT: 3, talkT: 5, told: null };
  for (const o of st.fx) { o.t += dt; o.x += o.vx * dt; o.y += o.vy * dt; o.vy += (o.rocket ? 0 : 60) * dt; }
  for (const o of st.fx) if (o.rocket && o.t >= o.life) burst(st, o, f);
  st.fx = st.fx.filter(o => o.t < o.life);
  const s = fairSpot(game);
  if (!s) { st.told = null; return; }
  if (st.told !== game.map.id) { st.told = game.map.id; game.toast(f.texts.enter.replace('{map}', game.map.def.name).replace('{qi}', f.qi), 3.2); }
  if (new Date().getHours() >= f.fireworks.from && (st.fwT -= dt) <= 0) {   // bắn một quả pháo hoa từ sân
    st.fwT = rnd(f.fireworks.every);
    const T = game.map.T, x = s.x + (Math.random() - 0.5) * T * 4, h = rnd(f.fireworks.height);
    st.fx.push({ rocket: true, x, y: s.y, vx: (Math.random() - 0.5) * 8, vy: -h / 0.9, t: 0, life: 0.9, c: pick(f.fireworks.colors) });
    game.sfx('chime', 0.15);
  }
  if ((st.talkT -= dt) <= 0) {   // dân làng gần người chơi nói câu hội
    st.talkT = rnd(f.talk);
    const p = game.player, near = game.npcs.filter(n => !n.bubble && Math.hypot(n.x - p.x, n.y - p.y) < 120);
    if (near.length) pick(near).bubble = { text: pick(f.lines), t: 0 };
  }
}

function burst(st, o, f) {
  o.life = 0;   // tên lửa xong, nổ thành tia
  for (let i = 0; i < f.fireworks.sparks; i++) {
    const a = (i / f.fireworks.sparks) * Math.PI * 2 + Math.random() * 0.2, v = 26 + Math.random() * 18;
    st.fx.push({ x: o.x, y: o.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, t: 0, life: 1.1 + Math.random() * 0.5, c: o.c });
  }
}
