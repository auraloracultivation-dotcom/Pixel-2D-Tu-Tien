// TỆP CHÉP TỰ ĐỘNG từ src/game/kh-bai.js, KHÔNG SỬA TAY. Chép lại: node tools/quai-chung.mjs --ghi (tools/check.mjs so khớp).
// Bãi quái tinh cầu khai hoang (tinh cầu tông môn), phần thuần dùng chung cho máy khách và máy chủ phòng Cloudflare.
// tools/quai-chung.mjs chép nguyên tệp này (cùng kh-road.js, quai-ky.js) sang cloud/src/ để hai bên dựng bãi bằng MỘT đoạn mã:
// cùng dòng tinh cầu trên máy chủ (hạt giống, mặt đất, cấp, bố cục công trình) thì cùng lưới, cùng bãi, cùng mã ô quái chung.
//   - khLuoi: lưới đất, hồ, vật cản, đường lát và bộ số ngẫu nhiên tới đúng chỗ dựng bãi (kh-gen.js genPlanet đi tiếp từ đây).
//   - khVong: bãi quái hai vòng; bãi rơi vào vùng che chở công trình thì bỏ.
//   - heSoQuai: hệ số máu, công quái của bản đồ (mob-power.js zoneMul dùng chung).
//   - khBangQuai: bảng bãi quái chung của một tinh cầu (máy khách quai-chung-bang.js, máy chủ phòng cloud/src/quai-kh.js).
// Chủ dự án 22/11/2026 00:1x chọn "Máu theo cấp tinh cầu": quái tinh cầu tông môn một mức máu, công cho mọi người, đo ở cảnh giới
// của cấp (levels[].realm, cũng là cảnh giới tông chủ cần để khai cấp đó), không theo cảnh giới người đang nhìn như trước.
import { ctBuild, inZone } from './kh-road.js';
import { kyTen } from './quai-ky.js';

const O = 64;   // tối đa 63 con mỗi bãi (như quai-chung-bang.js)

function rng(seed) {   // mulberry32
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const levelOf = (K, cap) => K.levels.find(l => l.cap === cap) || K.levels[K.levels.length - 1];

// p: { mat_dat, hat, cap }; opts.fight, opts.cap: bản đồ trận Khai Tinh. Trả lưới g (mảng hàng, mỗi hàng mảng ký tự) và R đã đi qua
// điểm xuyết, hồ, vật cản, góc đường lát: bước kế tiếp dùng R là dựng bãi (khVong)
export function khLuoi(K, p, opts = {}) {
  const Gd = K.grounds[p.mat_dat] || Object.values(K.grounds)[0], G = K.gen;
  const cap = opts.fight ? opts.cap : p.cap, L = levelOf(K, cap), d = L.d;
  const R = rng(p.hat * 7919 + cap * 104729 + (opts.fight ? 1 : 0));
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
  return { g, R, c, rad, d, cap, L, Gd, G };
}

// Bãi quái hai vòng; bãi rơi vào vùng che chở công trình (zones, kh-road.js ctBuild) thì bỏ. fight: trận Khai Tinh chỉ vòng trong.
// Bãi rơi vào vật cản thì máy khách tự dời lúc mọc (freeNear), nên bãi không đọc lưới.
export function khVong(K, L0, zones, fight) {
  const { R, c, rad, G, Gd } = L0, spawners = [];
  for (const ring of G.rings.filter(r => !fight || !r.out)) {
    const off = R() * Math.PI * 2;
    for (let i = 0; i < ring.n; i++) {
      const a = off + i * Math.PI * 2 / ring.n, x = Math.round(c + Math.cos(a) * rad * ring.r), y = Math.round(c + Math.sin(a) * rad * ring.r);
      if (inZone(zones, x, y, 3)) continue;
      const s = { mob: Gd.mobs[i % Gd.mobs.length], at: [x, y], farm: true };
      if (ring.out) s.mul = K.mob_out / K.mob_in;
      spawners.push(s);
    }
  }
  return spawners;
}

// Hệ số máu, công quái thường của một bản đồ: T mức lực chiến của bản đồ chia trung bình lực chiến gốc g(loài) của các loài trên bãi
// không nhân (thứ tự loài theo lần đầu gặp, như mob-power.js trước giờ). laQuai: loài tính vào trung bình (bỏ trùm, Mộc Nhân)
export function heSoQuai(spawners, laQuai, g, T) {
  const ids = [...new Set((spawners || []).filter(s => !s.mul || s.mul === 1).map(s => s.mob))].filter(laQuai);
  const avg = ids.length ? ids.reduce((a, x) => a + g(x), 0) / ids.length : 0;
  return avg > 0 ? Math.max(1, T / avg) : 1;
}

// Bảng bãi quái chung của một tinh cầu tông môn, cùng dạng quai-chung-bang.js bangQuai: { v: chữ ký, s: [[bãi, số con, giờ hồi (ms),
// máu, x, y, có thể dị chủng]] }; null: không có bãi nào. KB: bản rút gọn data/ (quai-chung-bang.js khBangData; máy chủ phòng đọc
// QUAI.kh trong cloud/src/quai-cfg.js). p: dòng tinh cầu trên máy chủ (p2d_kh_ds): mat_dat, hat, cap, bay, rieng.
// Máu tính đúng các bước lúc mọc quái trên máy khách (quai-chung.js moc): zonePower (× hệ số, làm tròn) rồi scaleMobBy vòng ngoài.
export function khBangQuai(KB, p) {
  const L0 = khLuoi(KB, p);
  const sps = khVong(KB, L0, ctBuild(KB, p.rieng, p.bay, {}).zones, false);
  const T = Math.round(L0.L.boss_cp * KB.mob_in), realm = L0.L.realm;
  const s = KB.cp ? heSoQuai(sps, x => !!KB.mob[x], x => KB.mob[x].g[realm], T) : 1;   // mob_cp.on tắt: máy khách cũng không nhân (mob-power.js zoneMul)
  const n = Math.min(O - 1, Math.max(0, Math.floor(KB.farm.n || 0))), hoi = Math.round((KB.farm.respawn || 0) * 1000), rows = [];
  if (!n || !(hoi > 0)) return null;
  sps.forEach((sp, i) => {
    const d = KB.mob[sp.mob];
    if (!d) return;
    const hp0 = s === 1 ? d.hp : Math.round(d.hp * s);
    const hp = sp.mul && sp.mul !== 1 ? Math.max(1, Math.round(hp0 * sp.mul)) : hp0;
    rows.push([i, n, hoi, hp, Math.round((sp.at[0] + 0.5) * KB.tile), Math.round((sp.at[1] + 0.5) * KB.tile), d.r]);
  });
  return rows.length ? { v: kyTen([rows, KB.hiem]), s: rows } : null;
}
