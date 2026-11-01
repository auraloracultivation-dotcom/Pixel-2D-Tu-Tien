// Khách đi hội (chủ dự án 02/11/2026: phố hội phải đông người qua lại, nói chuyện). Chỉ để làm cảnh: không lưu, không giao việc,
// không vào game.npcs (khỏi dính truyện, tự hành, nút Nói chuyện). Hình mượn dân làng chibi có sẵn (npc.<id>), xáo đủ lượt rồi mới lặp. Có nhóm hai ba người
// đi cùng (bám người dẫn), trẻ con chạy nhanh nghỉ ngắn, người bán đứng sau quầy mời khách (ban).
// Đi theo lưới đường của lễ hội (data/le-hoi.json → festivals.<bản đồ>.khach: nodes điểm dừng theo ô, links đường nối), tới nơi
// đứng ngắm vài giây (trước sạp, trước rồng băng) rồi đi tiếp sang điểm kề. Người chơi tới gần thì đứng lại quay sang, nói một câu;
// thỉnh thoảng một khách gần người chơi tự nói câu hội (bong bóng như NPC, vẽ ở draw-bubble.js). Vẽ cùng đồ hội (draw-hoi.js).
import { updateTro } from './hoi-tro.js';
const K = game => game.data['le-hoi']?.festivals?.[game.map?.id]?.khach;
const pick = a => a[Math.floor(Math.random() * a.length)];

function spawn(game, c) {
  const T = game.map.T, list = [], A = game.data.art.sprites, pool = c.ids.filter(id => game.data.npcs[id] || A[id]);
  let bag = [];
  const nextId = () => { if (!bag.length) bag = [...pool].sort(() => Math.random() - 0.5); return bag.pop(); };   // xáo đủ lượt rồi mới lặp hình
  for (let i = 0; i < c.n; i++) {
    const id = nextId(), at = Math.floor(Math.random() * c.nodes.length), [x, y] = c.nodes[at], kid = (c.kids || []).includes(id);
    const n = { id, def: game.data.npcs[id] || { name: 'Đệ tử' }, hero: !game.data.npcs[id], khach: true, kid, x: (x + (Math.random() - 0.5)) * T, y: (y + (Math.random() - 0.5) * 0.6) * T, r: 5,
      at, to: null, wait: Math.random() * 4, bob: Math.random() * 6, face: { x: Math.random() < 0.5 ? -1 : 1, y: 1 }, walkT: 0 };
    const lead = list[list.length - 1];   // đi theo nhóm hai ba người: bám người trước, lệch sang bên
    if (lead && !lead.lead && kid === !!lead.kid && Math.random() < (kid ? 0.8 : c.group)) { n.lead = lead; n.ox = (Math.random() < 0.5 ? -1 : 1) * (8 + Math.random() * 4); n.oy = (Math.random() - 0.5) * 6; n.x = lead.x + n.ox; n.y = lead.y + n.oy; }
    list.push(n);
  }
  for (const [id, x, y] of c.ban || []) {   // người bán đứng sau quầy, nhìn ra phố, mời khách
    if (!game.data.npcs[id]) continue;
    list.push({ id, def: game.data.npcs[id], khach: true, ban: true, x: x * T, y: y * T, r: 5, bob: Math.random() * 6, face: { x: Math.random() < 0.5 ? -0.5 : 0.5, y: 1 }, walkT: 0 });
  }
  return list;
}

export function updateKhach(game, dt) {
  updateTro(game, dt);   // trò diễn (hoi-tro.js)
  const c = K(game);
  if (!c) { game.khach = null; return; }
  if (game.khachMap !== game.map) { game.khachMap = game.map; game.khach = spawn(game, c); game.khachT = c.talk[0]; }
  const p = game.player, T = game.map.T, near = [], ch = game.hoiTro?.cheer, fresh = ch && ch !== game.khachCheer;
  if (fresh) game.khachCheer = ch;
  for (const n of game.khach) {
    if (n.bubble && (n.bubble.t += dt) >= c.sec) n.bubble = null;
    if (n.reply && (n.reply -= dt) <= 0) { n.reply = 0; if (!n.bubble) n.bubble = { text: pick(c.lines), t: 0 }; }
    n.walkT += dt;
    if (n.hop > 0) n.hop -= dt;
    if (fresh && Math.hypot(n.x - ch.x, n.y - ch.y) < c.cheer_r * T && !n.lead?.ban) {   // khán giả reo hò: nhảy lên, quay về phía trò
      n.face = { x: Math.sign(ch.x - n.x) || 1, y: ch.y < n.y ? -1 : 1 };
      if (!ch.quiet || Math.random() < 0.3) n.hop = 0.45 + Math.random() * 0.2;
      if (!n.bubble && Math.random() < (ch.big ? 0.5 : ch.quiet ? 0.05 : 0.14)) n.bubble = { text: pick(ch.big ? c.cheer_big : c.cheer), t: 0 };
    }
    const px = p.x - n.x, py = p.y - n.y, d = Math.hypot(px, py);
    if (d < c.range * T) near.push(n);
    if (d < c.stop) {   // người chơi tới sát: đứng lại quay sang, chào một câu
      n.moving = false; n.face = { x: Math.sign(px) || 1, y: py > 0 ? 1 : -0.3 };
      if (!n.greeted && !n.bubble) { n.greeted = true; n.bubble = { text: pick(n.ban ? c.ban_lines : c.lines), t: 0 }; }
      continue;
    }
    if (d > c.stop * 2.5) n.greeted = false;
    if (n.ban) { n.moving = false; if (d < c.range * T * 0.7 && !n.bubble && Math.random() < dt * 0.08) n.bubble = { text: pick(c.ban_lines), t: 0 }; continue; }
    if (n.lead) {   // theo nhóm
      const L = n.lead, tx = L.x + n.ox, ty = L.y + n.oy, ex = tx - n.x, ey = ty - n.y, e = Math.hypot(ex, ey);
      if (e > 2) { const st = Math.min(e, c.speed * 1.25 * dt); n.x += ex / e * st; n.y += ey / e * st; n.moving = true; n.face = { x: ex / e, y: ey / e }; }
      else { n.moving = false; n.face = L.moving ? L.face : { x: Math.sign(L.x - n.x) || 1, y: 0.4 }; }   // đứng lại thì quay sang nói chuyện với bạn
      continue;
    }
    if ((n.wait -= dt) > 0) { n.moving = false; continue; }
    if (!n.to) {   // sang điểm kề trên lưới đường, lệch ngẫu nhiên nửa ô cho khỏi đi một hàng
      const next = c.links.filter(l => l.includes(n.at)).map(l => l[0] === n.at ? l[1] : l[0]);
      n.at = next.length ? pick(next) : n.at;
      const [x, y] = c.nodes[n.at];
      n.to = { x: (x + (Math.random() - 0.5) * 1.2) * T, y: (y + (Math.random() - 0.5) * 0.8) * T };
    }
    const dx = n.to.x - n.x, dy = n.to.y - n.y, dd = Math.hypot(dx, dy), step = c.speed * (n.kid ? c.kid_speed : 1) * dt;
    if (dd < step + 0.5) {   // tới điểm dừng: đứng ngắm, quay lên (sạp, rồng) hoặc ngẫu nhiên
      n.to = null; n.moving = false; n.wait = n.kid ? Math.random() * 1.2 : c.wait[0] + Math.random() * (c.wait[1] - c.wait[0]);
      const nd = c.nodes[n.at];
      if (nd.length > 2) { n.face = { x: Math.sign(nd[2] - nd[0]) * 0.8 || 0.6, y: nd[3] < nd[1] ? -1 : 1 }; n.wait += c.watch || 6; }   // điểm ngắm: quay về phía trò, đứng xem lâu hơn
      else n.face = { x: Math.random() < 0.5 ? -0.6 : 0.6, y: Math.random() < 0.6 ? -1 : 1 };
      continue;
    }
    const ox = n.x, oy = n.y;
    game.map.move(n, dx / dd * step, dy / dd * step);
    if (n.x === ox && n.y === oy) { n.x += dx / dd * step; n.y += dy / dd * step; }   // vướng góc vật: lách qua (khách không chặn ai)
    n.moving = true; n.face = { x: dx / dd, y: dy / dd };
  }
  if ((game.khachT -= dt) <= 0 && near.length) {   // một khách gần người chơi nói câu hội
    game.khachT = c.talk[0] + Math.random() * (c.talk[1] - c.talk[0]);
    const free = near.filter(x => !x.bubble && !x.ban), n = free.length && pick(free);
    if (n) n.bubble = { text: pick(n.kid && c.kid_lines ? c.kid_lines : c.lines), t: 0 };
    if (n?.lead && !n.lead.bubble && Math.random() < 0.6) n.lead.reply = 0.9;   // bạn đi cùng đáp lại sau một nhịp
  }
}
