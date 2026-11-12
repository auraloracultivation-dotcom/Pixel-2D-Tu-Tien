// Dựng bản đồ tinh cầu khai hoang trên máy người chơi (data/khai-hoang.json → grounds, gen, levels). Cùng hạt giống, mặt đất, cấp
// thì máy nào cũng ra cùng một bản đồ, máy chủ chỉ giữ vài con số (p2d_tinh_cau). Đĩa tròn đường kính d theo cấp; giữa là sân lát đá
// có cổng về Thiên Kiếm Tinh và chỗ ra; đường lát toả ra mép; cụm vật cản, hồ rải ngẫu nhiên; mép đĩa để trống câu cá.
// Bãi quái treo máy hai vòng: vòng trong lực chiến mob_in, vòng ngoài mob_out lần trùm của cấp (mob-power.js đọc config.mob_cp.maps).
// fight: bản đồ trận Khai Tinh (ma khí tối, trùm giữa sân, kéo về lực chiến boss_cp của cấp đánh).

function rng(seed) {   // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const levelOf = (K, cap) => K.levels.find(l => l.cap === cap) || K.levels[K.levels.length - 1];

// p: { id, ten, mat_dat, hat, cap } (dòng tinh cầu trên máy chủ, hoặc vé trận); opts.fight: dựng bản đồ trận Khai Tinh cấp opts.cap
export function genPlanet(K, p, opts = {}) {
  const Gd = K.grounds[p.mat_dat] || Object.values(K.grounds)[0], G = K.gen;
  const cap = opts.fight ? opts.cap : p.cap, L = levelOf(K, cap), d = L.d;
  const R = rng(p.hat * 7919 + cap * 104729 + (opts.fight ? 1 : 0)), ri = n => Math.floor(R() * n);
  const c = (d - 1) / 2, rad = d / 2 - 1.3;
  const g = Array.from({ length: d }, (_, y) => Array.from({ length: d }, (_, x) => Math.hypot(x - c, y - c) <= rad ? Gd.base : '~'));
  const land = (x, y) => g[y]?.[x] && g[y][x] !== '~';
  const r0 = Math.hypot;
  // khoảng giữ trống: sân giữa, đường lát, mép câu cá
  const keep = (x, y) => r0(x - c, y - c) <= G.plaza + 1.5 || r0(x - c, y - c) >= rad - 1.8;
  // điểm xuyết
  if (Gd.deco) for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) if (land(x, y) && !keep(x, y) && R() < 0.06) g[y][x] = Gd.deco;
  const area = Math.PI * rad * rad;
  const blob = (ch, n, rMin, rMax) => {
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2, dist = (G.plaza + 3) + R() * (rad - G.plaza - 6), bx = c + Math.cos(a) * dist, by = c + Math.sin(a) * dist;
      const br = rMin + R() * (rMax - rMin);
      for (let y = Math.floor(by - br); y <= by + br; y++) for (let x = Math.floor(bx - br); x <= bx + br; x++) {
        if (!land(x, y) || keep(x, y)) continue;
        const k = r0(x - bx, y - by) / br;
        if (k <= 1 && R() < 1.15 - k * 0.6) g[y][x] = ch;
      }
    }
  };
  blob(Gd.water, Math.round(area / 100 * G.lakes), 1.5, 3.2);
  for (const ch of Gd.solid) blob(ch, Math.round(area / 100 * G.blobs / Gd.solid.length), 0.8, 2.2);
  // đường lát toả ra mép (đi qua được hết)
  const a0 = R() * Math.PI * 2;
  for (let i = 0; i < G.roads; i++) {
    const a = a0 + i * Math.PI * 2 / G.roads;
    for (let s = G.plaza; s < rad - 1; s += 0.5) {
      const x = Math.round(c + Math.cos(a) * s), y = Math.round(c + Math.sin(a) * s);
      if (land(x, y)) g[y][x] = 'o';
    }
  }
  // sân giữa
  for (let y = 0; y < d; y++) for (let x = 0; x < d; x++) if (r0(x - c, y - c) <= G.plaza) g[y][x] = 'o';
  const cx = Math.round(c), cy = Math.round(c);
  g[cy - 2][cx] = 'P';
  // bãi quái hai vòng; bãi rơi vào vật cản thì freeNear lúc mọc tự dời (game.js updateSpawners)
  const spawners = [];
  for (const ring of G.rings.filter(r => !opts.fight || !r.out)) {   // trận Khai Tinh: chỉ vòng trong, còn lại là trùm
    const off = R() * Math.PI * 2;
    for (let i = 0; i < ring.n; i++) {
      const a = off + i * Math.PI * 2 / ring.n, x = Math.round(c + Math.cos(a) * rad * ring.r), y = Math.round(c + Math.sin(a) * rad * ring.r);
      const s = { mob: Gd.mobs[i % Gd.mobs.length], at: [x, y], farm: true };
      if (ring.out) s.mul = K.mob_out / K.mob_in;
      spawners.push(s);
    }
  }
  const T = K.text;
  const def = {
    id: p.id, name: opts.fight ? T.fight_name.replace('{ten}', p.ten) : p.ten, kh: { cap, ground: p.mat_dat, fight: !!opts.fight, ticket: opts.ticket || null },
    sky: Gd.sky, dark: opts.fight ? 0.45 : 0, ground: Gd.ground, island: Gd.island, world: !opts.fight, planet: { d, kh: 1 },
    grid: g.map(r => r.join('')), spawns: { vao: [cx, cy + 1] },
    portals: [{ at: [cx, cy - 2], to: 'thien-kiem-phong', spawn: 'vao', label: T.back, fly: true }],
    npcs: [], spawners, rooms: [], hoi: [],
  };
  if (opts.fight) def.spawners.unshift({ mob: Gd.boss, at: [cx, cy - Math.round(rad * 0.4)], n: 1, respawn: 1e9, cp: L.boss_cp, kt: true });
  return { def, mobCp: Math.round(L.boss_cp * K.mob_in) };
}
