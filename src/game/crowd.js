// Khối cứng (chủ dự án 09/11/2026 15:58: "mỗi quái vật, NPC, người đều thành một hình khối, không thể đè lên nhau"): mỗi khung
// đẩy các cặp đang chồng nhau ra cho vừa chạm (bán kính r × sep), chia phần đẩy theo khối lượng: quái 1, trùm boss_mass, người chơi
// player_mass (đi vào quái thì quái dạt ra là chính, quái vây vẫn đẩy được người một chút), NPC đứng như cột (không bị đẩy, ai chạm
// vào thì dạt ra). Quái đứng yên (Mộc Nhân, đầu boss thế giới, quái của đội trưởng) cũng như cột. Đẩy qua map.move nên không xuyên
// tường. Người đang lướt Thiểm Ảnh (skill-chain.js) đi xuyên khối. Chia ô lưới cell đơn vị để chỉ so các cặp gần nhau. Số ở data/config.json → crowd.
const C = game => game.data.config.crowd;

function bodies(game, c) {
  const out = [], p = game.player;
  for (const m of game.mobs) {
    if (m.dead || m.chain) continue;   // bản sao so tài đang lướt Thiểm Ảnh: xuyên khối
    const fixed = m.remote || m.dummy || m.wboss;
    out.push({ e: m, r: m.r * c.sep, w: fixed ? 0 : 1 / (m.def.ai === 'boss' ? c.boss_mass : 1) });
  }
  if (p && !p.dead && !game.ghost && !p.chain) out.push({ e: p, r: (p.r || 5) * c.sep, w: 1 / c.player_mass });
  for (const n of game.npcs || []) out.push({ e: n, r: (n.r || 6) * c.sep, w: 0 });
  return out;
}

export function crowd(game) {
  const c = C(game);
  if (!c?.on || !game.map) return;
  for (let it = 0; it < (c.iter || 1); it++) pass(game, c);   // vài lượt: đẩy cặp này có thể đè cặp khác
}

function pass(game, c) {
  const B = bodies(game, c), grid = new Map(), cell = c.cell;
  for (let i = 0; i < B.length; i++) {
    const k = Math.floor(B[i].e.x / cell) + ',' + Math.floor(B[i].e.y / cell);
    (grid.get(k) || grid.set(k, []).get(k)).push(i);
  }
  for (let i = 0; i < B.length; i++) {
    const a = B[i], cx = Math.floor(a.e.x / cell), cy = Math.floor(a.e.y / cell);
    for (let gx = cx - 1; gx <= cx + 1; gx++) for (let gy = cy - 1; gy <= cy + 1; gy++) {
      for (const j of grid.get(gx + ',' + gy) || []) {
        if (j <= i) continue;
        const b = B[j], sw = a.w + b.w;
        if (!sw) continue;
        let dx = b.e.x - a.e.x, dy = b.e.y - a.e.y, d = Math.hypot(dx, dy);
        const want = a.r + b.r;
        if (d >= want) continue;
        if (d < 0.01) { dx = Math.cos(i * 2.4 + j); dy = Math.sin(i * 2.4 + j); d = 1; }   // trùng chỗ: tách theo một hướng cố định
        const over = (want - d) * c.k, ux = dx / d, uy = dy / d;
        if (a.w) game.map.move(a.e, -ux * over * a.w / sw, -uy * over * a.w / sw);
        if (b.w) game.map.move(b.e, ux * over * b.w / sw, uy * over * b.w / sw);
      }
    }
  }
}
