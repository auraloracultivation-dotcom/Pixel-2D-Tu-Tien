// Quán linh thực ở sân xóm (data/snacks.json): quầy gỗ mái vải sọc ngay sau chỗ người bán đứng, cho dễ thấy chỗ mua.
// Vẽ theo toạ độ thế giới, trước người và quái; màu mái theo tinh cầu (snacks.list[món].awning, thiếu thì đỏ).
const INK = '#1b1830';
let cache = { map: null, list: [] };

function scan(game) {
  const map = game.map, list = [];
  for (const d of Object.values(game.data.snacks.list)) {
    if (d.map !== map.id) continue;
    const n = map.def.npcs.find(x => x.id === d.npc);
    if (n) list.push({ ...map.center(n.at[0], n.at[1] - 1), c: d.awning || '#d8484a' });
  }
  cache = { map, list };
}

export function drawStalls(ctx, game, t) {
  if (cache.map !== game.map) scan(game);
  for (const s of cache.list) {
    const x = Math.round(s.x), y = Math.round(s.y) + 2;
    ctx.fillStyle = 'rgba(27,24,48,.25)'; ctx.fillRect(x - 12, y + 6, 25, 3);   // bóng
    ctx.fillStyle = INK; ctx.fillRect(x - 12, y - 20, 3, 27); ctx.fillRect(x + 10, y - 20, 3, 27);
    ctx.fillStyle = '#5a3a22'; ctx.fillRect(x - 11, y - 19, 1, 25); ctx.fillRect(x + 11, y - 19, 1, 25);   // cột
    ctx.fillStyle = INK; ctx.fillRect(x - 11, y - 4, 23, 11);
    ctx.fillStyle = '#8a5a32'; ctx.fillRect(x - 10, y - 3, 21, 9);   // quầy
    ctx.fillStyle = '#b07a44'; ctx.fillRect(x - 10, y - 3, 21, 2);
    ctx.fillStyle = '#6a4226'; for (let i = -7; i <= 8; i += 5) ctx.fillRect(x + i, y, 1, 6);   // ván
    const goods = ['#f2c94c', '#ff9a6a', '#fff2d0'];
    goods.forEach((g, i) => { ctx.fillStyle = INK; ctx.fillRect(x - 8 + i * 6, y - 6, 5, 3); ctx.fillStyle = g; ctx.fillRect(x - 7 + i * 6, y - 6, 3, 2); });   // món bày trên quầy
    const sway = Math.sin(t * 1.2) > 0.85 ? 1 : 0;
    ctx.fillStyle = INK; ctx.fillRect(x - 14, y - 24, 29, 7);
    for (let i = 0; i < 27; i++) {   // mái vải sọc, mép dưới lượn
      ctx.fillStyle = Math.floor(i / 3) % 2 ? '#fff2d0' : s.c;
      ctx.fillRect(x - 13 + i, y - 23, 1, 5 + ((i + sway) % 3 === 1 ? 1 : 0));
    }
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(x - 13, y - 23, 27, 1);
  }
}
