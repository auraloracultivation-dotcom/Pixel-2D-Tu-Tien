// Quái chung, phần thuần (không DOM, không mạng): bảng bãi quái dùng chung của một bản đồ, tính từ data/. Ba nơi cùng đọc MỘT hàm này:
// máy khách (src/game/quai-chung.js), công cụ sinh bản sao cho máy chủ phòng (tools/quai-chung.mjs → cloud/src/quai-cfg.js) và bài thử.
// Chủ dự án 21/11/2026 02:02: "thiết kế quái vật ở trạng thái mà nếu người này farm thì người kia cũng thấy và có thể tranh nhau farm".
//
// Một con quái chung = một "ô" của một bãi: mã ô = số thứ tự bãi trong bản đồ × O + số thứ tự con trong bãi (0 … n − 1). Máy nào cũng
// tính ra cùng mã ô vì cùng đọc data/maps/<bản đồ>.json. Bãi KHÔNG thành quái chung (vẫn là quái riêng từng máy như cũ): bãi mở theo cờ
// truyện (need / unless, mỗi người một khác), bãi có lực chiến đặt sẵn (cp, kt: trùm trận Khai Tinh), trùm, Mộc Nhân, bản sao so tài;
// trận Khai Tinh và bản đồ có phòng (bí cảnh). Tinh cầu tông môn (Khai Hoang) dựng bảng theo dòng tinh cầu trên máy chủ (kh-bai.js
// khBangQuai, quai_chung.kh; chủ dự án 22/11/2026 00:1x "Máu theo cấp tinh cầu"): máy chủ phòng dựng cùng bảng từ p2d_kh_ds.
import { kyTen } from './quai-ky.js';
import { khBangQuai } from './kh-bai.js';
import { gocMob } from './mob-power.js';

export { kyTen };
export const O = 64;   // tối đa 63 con mỗi bãi
export const QC = data => data?.config?.quai_chung;
const BO_AI = ['boss', 'dummy', 'duel'];

// [xác suất quái dị chủng, hệ số máu của dị chủng] (data/pets.json): máy chủ phòng quyết con nào là dị chủng lúc hồi sinh
export const hiemCua = data => [data?.pets?.rare_chance || 0, data?.pets?.rare?.hp || 1];

// Bảng bãi chung của bản đồ: { v: chữ ký, s: [[bãi, số con, giờ hồi (ms), máu, x, y, có thể dị chủng]] }; null = bản đồ không có quái chung.
// data phải đã qua hcData (src/game/he-chien.js) như trong game: máu quái ở data.mobs là máu thật lúc đánh.
export function bangQuai(data, mapId) {
  const C = QC(data), def = data?.maps?.[mapId];
  if (!C || !def) return null;
  if (def.kh) { const KB = C.kh && !def.kh.fight && def.kh.p ? khBangData(data) : null; return KB ? khBangQuai(KB, def.kh.p) : null; }
  if (!(C.maps || []).includes(mapId) || (def.rooms || []).length) return null;
  const T = data.config.tile || 16, s = [];
  (def.spawners || []).forEach((sp, i) => {
    const d = data.mobs?.[sp.mob];
    if (!d || sp.need || sp.unless || sp.cp || sp.kt || BO_AI.includes(d.ai)) return;
    const f = { ...(sp.farm ? data.planets?.farm : {}), ...sp }, n = Math.min(O - 1, Math.max(0, Math.floor(f.n || 0)));
    if (!n || !(f.respawn > 0) || !Array.isArray(f.at)) return;
    const hp = f.mul && f.mul !== 1 ? Math.max(1, Math.round(d.hp * f.mul)) : d.hp;   // như scaleMobBy (mobs.js): vòng ngoài tinh cầu
    s.push([i, n, Math.round(f.respawn * 1000), hp, Math.round((f.at[0] + 0.5) * T), Math.round((f.at[1] + 0.5) * T), data.pets?.pets?.[sp.mob] ? 1 : 0]);
  });
  return s.length ? { v: kyTen([s, hiemCua(data)]), s } : null;
}

// Số ngẫu nhiên theo hạt (mulberry32): cùng mã ô + cùng hạt máy chủ phòng phát thì máy nào cũng cho con quái mọc đúng một chỗ
export function hatRnd(slot, hat) {
  let a = (Math.imul(slot + 1, 0x9e3779b1) ^ Math.imul((hat | 0) + 1, 0x85ebca6b)) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bản sao cho máy chủ phòng (tools/quai-chung.mjs ghi ra cloud/src/quai-cfg.js): số luật và bảng bãi của mọi bản đồ quái chung
export function cauHinhMayChu(data) {
  const C = QC(data) || {}, maps = {};
  for (const id of C.maps || []) { const b = bangQuai(data, id); if (b) maps[id] = b; }
  return { tam: C.tam ?? 480, dps_k: C.dps_k ?? 5, bud_s: C.bud_s ?? 10, own_ms: C.own_ms ?? 1500, dong: [C.dong?.ref || 3, C.dong?.max || 1], hiem: hiemCua(data), maps,
    kh: C.kh ? khBangData(data) : null };
}

// Bản rút gọn data/ đủ để dựng bảng quái chung của một tinh cầu tông môn (kh-bai.js khBangQuai): lưới, bãi, vùng che chở công trình,
// máu từng loài và lực chiến gốc của loài ở cảnh giới từng cấp (mob-power.js gocMob). Máy khách tính từ game.data lúc cần; máy chủ phòng
// đọc bản tính sẵn QUAI.kh. Nhớ theo đối tượng data (bảng không đổi trong một lần chơi).
const KH_NHO = new WeakMap();
export function khBangData(data) {
  const K = data?.['khai-hoang'];
  if (!K?.levels || !K.grounds) return null;
  if (KH_NHO.has(data)) return KH_NHO.get(data);
  const realms = [...new Set(K.levels.map(l => l.realm))], mob = {};
  for (const G of Object.values(K.grounds)) for (const id of G.mobs || []) {
    const d = data.mobs?.[id];
    if (!d || d.ai === 'boss' || d.ai === 'dummy' || mob[id]) continue;
    mob[id] = { hp: d.hp, g: Object.fromEntries(realms.map(r => [r, gocMob(data, id, r)])), r: data.pets?.pets?.[id] ? 1 : 0 };
  }
  const G = K.gen, F = data.planets?.farm || {};
  const kb = {
    tile: data.config.tile || 16, cp: !!(data.config.mob_cp?.on && data.config.mob_cp.maps), mob_in: K.mob_in, mob_out: K.mob_out, farm: { n: F.n, respawn: F.respawn }, hiem: hiemCua(data),
    gen: { plaza: G.plaza, lakes: G.lakes, blobs: G.blobs, roads: G.roads, rings: G.rings },
    levels: K.levels.map(l => ({ cap: l.cap, d: l.d, realm: l.realm, boss_cp: l.boss_cp })),
    grounds: Object.fromEntries(Object.entries(K.grounds).map(([k, g]) => [k, { base: g.base, deco: g.deco, water: g.water, solid: g.solid, mobs: g.mobs }])),
    ct: Object.fromEntries(Object.entries(K.ct || {}).map(([k, c]) => [k, { r: c.r, loai: c.loai }])), mob,
  };
  KH_NHO.set(data, kb);
  return kb;
}
