// Khách đi hội (chủ dự án 02/11/2026: phố hội phải đông người qua lại, nói chuyện). Chỉ để làm cảnh: không lưu, không giao việc,
// không vào game.npcs (khỏi dính truyện, tự hành, nút Nói chuyện). Hình mượn dân làng chibi có sẵn (npc.<id>), mỗi người một hình.
// Đi theo lưới đường của lễ hội (data/le-hoi.json → festivals.<bản đồ>.khach: nodes điểm dừng theo ô, links đường nối), tới nơi
// đứng ngắm vài giây (trước sạp, trước rồng băng) rồi đi tiếp sang điểm kề. Người chơi tới gần thì đứng lại quay sang, nói một câu;
// thỉnh thoảng một khách gần người chơi tự nói câu hội (bong bóng như NPC, vẽ ở draw-bubble.js). Vẽ cùng đồ hội (draw-hoi.js).
const K = game => game.data['le-hoi']?.festivals?.[game.map?.id]?.khach;
const pick = a => a[Math.floor(Math.random() * a.length)];

function spawn(game, c) {
  const T = game.map.T, ids = [...c.ids].sort(() => Math.random() - 0.5).slice(0, c.n), list = [];
  for (const id of ids) {
    if (!game.data.npcs[id]) continue;
    const at = Math.floor(Math.random() * c.nodes.length), [x, y] = c.nodes[at];
    list.push({ id, def: game.data.npcs[id], khach: true, x: (x + (Math.random() - 0.5)) * T, y: (y + (Math.random() - 0.5) * 0.6) * T, r: 5,
      at, to: null, wait: Math.random() * 4, bob: Math.random() * 6, face: { x: Math.random() < 0.5 ? -1 : 1, y: 1 }, walkT: 0 });
  }
  return list;
}

export function updateKhach(game, dt) {
  const c = K(game);
  if (!c) { game.khach = null; return; }
  if (game.khachMap !== game.map) { game.khachMap = game.map; game.khach = spawn(game, c); game.khachT = c.talk[0]; }
  const p = game.player, T = game.map.T, near = [];
  for (const n of game.khach) {
    if (n.bubble && (n.bubble.t += dt) >= c.sec) n.bubble = null;
    n.walkT += dt;
    const px = p.x - n.x, py = p.y - n.y, d = Math.hypot(px, py);
    if (d < c.range * T) near.push(n);
    if (d < c.stop) {   // người chơi tới sát: đứng lại quay sang, chào một câu
      n.moving = false; n.face = { x: Math.sign(px) || 1, y: py > 0 ? 1 : -0.3 };
      if (!n.greeted && !n.bubble) { n.greeted = true; n.bubble = { text: pick(c.lines), t: 0 }; }
      continue;
    }
    if (d > c.stop * 2.5) n.greeted = false;
    if ((n.wait -= dt) > 0) { n.moving = false; continue; }
    if (!n.to) {   // sang điểm kề trên lưới đường, lệch ngẫu nhiên nửa ô cho khỏi đi một hàng
      const next = c.links.filter(l => l.includes(n.at)).map(l => l[0] === n.at ? l[1] : l[0]);
      n.at = next.length ? pick(next) : n.at;
      const [x, y] = c.nodes[n.at];
      n.to = { x: (x + (Math.random() - 0.5) * 1.2) * T, y: (y + (Math.random() - 0.5) * 0.8) * T };
    }
    const dx = n.to.x - n.x, dy = n.to.y - n.y, dd = Math.hypot(dx, dy), step = c.speed * dt;
    if (dd < step + 0.5) {   // tới điểm dừng: đứng ngắm, quay lên (sạp, rồng) hoặc ngẫu nhiên
      n.to = null; n.moving = false; n.wait = c.wait[0] + Math.random() * (c.wait[1] - c.wait[0]);
      n.face = { x: Math.random() < 0.5 ? -0.6 : 0.6, y: Math.random() < 0.6 ? -1 : 1 };
      continue;
    }
    const ox = n.x, oy = n.y;
    game.map.move(n, dx / dd * step, dy / dd * step);
    if (n.x === ox && n.y === oy) { n.x += dx / dd * step; n.y += dy / dd * step; }   // vướng góc vật: lách qua (khách không chặn ai)
    n.moving = true; n.face = { x: dx / dd, y: dy / dd };
  }
  if ((game.khachT -= dt) <= 0 && near.length) {   // một khách gần người chơi nói câu hội
    game.khachT = c.talk[0] + Math.random() * (c.talk[1] - c.talk[0]);
    const n = pick(near.filter(x => !x.bubble).concat(near).slice(0, near.length));
    if (n && !n.bubble) n.bubble = { text: pick(c.lines), t: 0 };
  }
}
