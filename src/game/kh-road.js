// Công trình trên tinh cầu khai hoang (data/khai-hoang.json → ct, bố cục p2d_tinh_cau.bay): NPC đi kèm, vùng che chở, đường tự sinh.
// Chạy lúc dựng bản đồ (kh-gen.js) nên cùng bố cục thì máy nào cũng ra cùng NPC, cùng con đường, không lưu gì thêm lên máy chủ.
// - Công trình chức năng (loai cn): NPC có sẵn trong game làm đúng việc của nó (Vạn Bảo Lâu, Binh khí…), tên do người bày đặt.
// - Công trình trang trí (loai nha): NPC không chức năng đi qua lại (hình mượn NPC có sẵn, lời ở ct.lines).
// - Công trình riêng từ ảnh đã duyệt (mã u.…, p.rieng): loai là mã NPC chức năng hoặc nha, tên NPC người gửi đặt.
// - Vùng che chở: [x, y, r] (ô) quanh mỗi công trình; quái không mọc trong vùng, người đứng trong thì quái không đuổi (hoi-foot.js inHoi).
// - Đường: từ sân giữa tới cửa từng công trình (dưới chân), tìm đường rẻ nhất: ô trống 1, đường có sẵn 0.4 (đi chung thì nhập),
//   vật cản mềm (cây, đá) 8 (đường xuyên qua thì dọn), nước, vực, chân công trình khác không qua.

// Thông tin công trình của một món bố cục (null: đồ trang trí nhỏ)
export function ctOf(K, rieng, ma) {
  const c = K.ct[ma];
  if (c) return c;
  const r = rieng?.[ma];
  if (!r) return null;
  return r.loai === 'nha' ? { name: r.ten, loai: 'nha', npc: null, npc_name: r.npc, look: 'tieu-dao', r: 6, lines: [`${r.ten} là công trình tông môn tự dựng.`] }
    : { name: r.ten, loai: 'cn', npc: r.loai, npc_name: r.npc, r: 6 };
}

// NPC, vùng che chở từ bố cục. npcs: data.npcs (lấy hình, lời). Trả { npcs: [{ id, at, def }], zones: [[x, y, r]], doors: [[x, y]] }
export function ctBuild(K, rieng, items, npcs) {
  const out = { npcs: [], zones: [], doors: [] };
  (items || []).forEach(([ma, x, y, , o], i) => {
    const c = ctOf(K, rieng, ma);
    if (!c) return;
    const door = [Math.round(x), Math.round(y) + 1];
    out.zones.push([x, y - 1, c.r]); out.doors.push(door);
    const at = [door[0] + 1, door[1]];
    if (c.loai === 'cn' && npcs[c.npc]) out.npcs.push({ id: c.npc, at, def: { ...npcs[c.npc], name: o?.n || c.npc_name || npcs[c.npc].name } });
    else if (c.loai === 'nha') {
      const base = npcs[c.look] || {};
      out.npcs.push({ id: `kh:${i}`, at, def: { ...base, name: o?.n || c.npc_name || base.name, lines: c.lines || base.lines || ['...'], stroll: 2 } });
    }
  });
  return out;
}

// Vẽ đường lên lưới g (mảng hàng, mỗi hàng mảng ký tự) từ ô (cx, cy) tới từng cửa. types: data.tiles.types; soft: ký tự vật cản xuyên được
export function paintRoads(g, cx, cy, doors, zones, types, soft, road = 'o') {
  const h = g.length, w = g[0].length, N = w * h;
  const blockFoot = new Set();
  for (const [x, y] of zones.map(z => [Math.round(z[0]), Math.round(z[1]) + 1])) for (let dy = -2; dy <= 0; dy++) for (let dx = -1; dx <= 1; dx++) blockFoot.add((y + dy) * w + x + dx);   // chân công trình
  const cost = (x, y) => {
    const ch = g[y]?.[x];
    if (ch == null || ch === '~') return Infinity;
    if (ch === road || ch === 'P') return 0.4;
    const t = types[ch];
    if (!t?.solid) return 1;
    return soft.includes(ch) ? 8 : Infinity;
  };
  for (const [tx, ty] of doors) {
    if (!(ty >= 0 && ty < h && tx >= 0 && tx < w)) continue;
    const dist = new Float64Array(N).fill(Infinity), prev = new Int32Array(N).fill(-1), done = new Uint8Array(N);
    const start = cy * w + cx, goal = ty * w + tx;
    dist[start] = 0;
    const open = [start];   // hàng đợi đơn giản (lưới nhỏ, vài trăm ô đất mỗi cạnh)
    while (open.length) {
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      const u = open[bi]; open[bi] = open[open.length - 1]; open.pop();
      if (done[u]) continue;
      done[u] = 1;
      if (u === goal) break;
      const ux = u % w, uy = (u - ux) / w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const vx = ux + dx, vy = uy + dy, v = vy * w + vx;
        if (vx < 0 || vy < 0 || vx >= w || vy >= h || done[v] || (blockFoot.has(v) && v !== goal)) continue;
        const c = cost(vx, vy);
        if (!Number.isFinite(c)) continue;
        if (dist[u] + c < dist[v]) { dist[v] = dist[u] + c; prev[v] = u; open.push(v); }
      }
    }
    if (!Number.isFinite(dist[goal])) continue;
    for (let v = goal; v !== -1 && v !== start; v = prev[v]) { const x = v % w, y = (v - x) / w; if (g[y][x] !== 'P') g[y][x] = road; }
  }
}

export const inZone = (zones, x, y, pad = 0) => zones.some(([zx, zy, r]) => (x - zx) ** 2 + (y - zy) ** 2 <= (r + pad) ** 2);
