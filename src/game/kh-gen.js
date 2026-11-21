// Dựng bản đồ tinh cầu khai hoang trên máy người chơi (data/khai-hoang.json → grounds, gen, levels). Cùng hạt giống, mặt đất, cấp
// thì máy nào cũng ra cùng một bản đồ, máy chủ chỉ giữ vài con số (p2d_tinh_cau). Đĩa tròn đường kính d theo cấp; giữa là sân lát đá
// có cổng về Thiên Kiếm Tinh và chỗ ra; đường lát toả ra mép; cụm vật cản, hồ rải ngẫu nhiên; mép đĩa để trống câu cá.
// Bãi quái treo máy hai vòng: vòng trong lực chiến mob_in, vòng ngoài mob_out lần trùm của cấp (mob-power.js đọc config.mob_cp.maps).
// fight: bản đồ trận Khai Tinh (ma khí tối, trùm giữa sân, kéo về lực chiến boss_cp của cấp đánh).

import { ctBuild, paintRoads, inZone } from './kh-road.js';
import { khNen } from './kh-nen.js';
import { khLuoi, khVong, levelOf } from './kh-bai.js';

export { levelOf };

// p: { id, ten, mat_dat, hat, cap, bay, rieng } (dòng tinh cầu trên máy chủ, hoặc vé trận); opts.fight: dựng bản đồ trận Khai Tinh cấp opts.cap;
// opts.data: game.data (công trình trong bố cục: NPC, vùng che chở, đường tự sinh ở kh-road.js).
// Lưới đất và bãi quái dựng ở kh-bai.js (máy chủ phòng chạy cùng đoạn mã đó để dựng bảng quái chung của tinh cầu tông môn).
export function genPlanet(K, p, opts = {}) {
  const L0 = khLuoi(K, p, opts), { g, R, c, rad, d, cap, L, Gd, G } = L0;
  const r0 = Math.hypot;
  // sân giữa
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) if (r0(x - c, y - c) <= G.plaza) g[y][x] = 'o';
  const cx = Math.round(c), cy = Math.round(c);
  g[cy - 2][cx] = 'P';
  const B = !opts.fight && opts.data ? ctBuild(K, p.rieng, p.bay, opts.data.npcs) : { npcs: [], zones: [], doors: [] };
  if (B.doors.length) paintRoads(g, cx, cy + G.plaza, B.doors, B.zones, opts.data.tiles.types, [...Gd.solid, Gd.deco].filter(Boolean));
  // bãi quái hai vòng; bãi rơi vào vật cản thì freeNear lúc mọc tự dời (game.js updateSpawners)
  const spawners = khVong(K, L0, B.zones, opts.fight);
  const T = K.text;
  const def = {
    id: p.id, name: opts.fight ? T.fight_name.replace('{ten}', p.ten) : p.ten, kh: { cap, ground: p.mat_dat, fight: !!opts.fight, ticket: opts.ticket || null, zones: B.zones, npcs: B.npcs, tinh: opts.fight ? null : p.id,
      p: opts.fight ? null : { id: p.id, mat_dat: p.mat_dat, hat: p.hat, cap: p.cap, bay: p.bay || [], rieng: p.rieng || {} } },   // dòng tinh cầu: bảng quái chung (kh-bai.js khBangQuai)
    sky: Gd.sky, dark: opts.fight ? 0.45 : 0, ground: Gd.ground, island: Gd.island, world: !opts.fight, planet: { d, kh: 1 },
    grid: g.map(r => r.join('')), spawns: { vao: [cx, cy + 1] },
    portals: [{ at: [cx, cy - 2], to: 'thien-kiem-phong', spawn: 'vao', label: T.back, fly: true }],
    npcs: [], spawners,   // NPC công trình thêm sau khi dựng bản đồ (khai-hoang.js khSpawn: tên, hình riêng)
    rooms: [], hoi: { do: opts.fight ? [] : (p.bay || []) },
  };
  if (opts.fight) def.spawners.unshift({ mob: Gd.boss, at: [cx, cy - Math.round(rad * 0.4)], n: 1, spread: 1, respawn: 1e9, cp: L.boss_cp, kt: true });
  // nền, cây, hoa cỏ SpriteCook (kh-nen.js, 21/11/2026); công trình, đồ tông môn bày vẽ bằng hình SpriteCook cùng loại (hoi.doi)
  def.hoi.doi = K.doi_sc || {};
  const cam = (x, y) => r0(x - c, y - c) <= G.plaza + 2 || inZone(B.zones, x, y, 2) || spawners.some(s => Math.abs(s.at[0] - x) <= 3 && Math.abs(s.at[1] - y) <= 3);
  khNen(def, Gd.nen, g, R, cam);
  return { def, mobCp: Math.round(L.boss_cp * K.mob_in) };
}
