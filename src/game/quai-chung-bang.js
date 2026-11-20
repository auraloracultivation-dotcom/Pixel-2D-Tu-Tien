// Quái chung, phần thuần (không DOM, không mạng): bảng bãi quái dùng chung của một bản đồ, tính từ data/. Ba nơi cùng đọc MỘT hàm này:
// máy khách (src/game/quai-chung.js), công cụ sinh bản sao cho máy chủ phòng (tools/quai-chung.mjs → cloud/src/quai-cfg.js) và bài thử.
// Chủ dự án 21/11/2026 02:02: "thiết kế quái vật ở trạng thái mà nếu người này farm thì người kia cũng thấy và có thể tranh nhau farm".
//
// Một con quái chung = một "ô" của một bãi: mã ô = số thứ tự bãi trong bản đồ × O + số thứ tự con trong bãi (0 … n − 1). Máy nào cũng
// tính ra cùng mã ô vì cùng đọc data/maps/<bản đồ>.json. Bãi KHÔNG thành quái chung (vẫn là quái riêng từng máy như cũ): bãi mở theo cờ
// truyện (need / unless, mỗi người một khác), bãi có lực chiến đặt sẵn (cp, kt: trùm trận Khai Tinh), trùm, Mộc Nhân, bản sao so tài;
// bản đồ Khai Hoang (máu quái theo cảnh giới người đứng đó, mob-power.js) và bản đồ có phòng (bí cảnh).
export const O = 64;   // tối đa 63 con mỗi bãi
export const QC = data => data?.config?.quai_chung;
const BO_AI = ['boss', 'dummy', 'duel'];

// Chữ ký ngắn của một bảng (FNV-1a 32 bit): máy khách và máy chủ phòng so chữ ký, lệch (hai bên khác bản data/) thì máy khách tự về
// quái riêng, không đoán
export function kyTen(v) {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(v)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}

// [xác suất quái dị chủng, hệ số máu của dị chủng] (data/pets.json): máy chủ phòng quyết con nào là dị chủng lúc hồi sinh
export const hiemCua = data => [data?.pets?.rare_chance || 0, data?.pets?.rare?.hp || 1];

// Bảng bãi chung của bản đồ: { v: chữ ký, s: [[bãi, số con, giờ hồi (ms), máu, x, y, có thể dị chủng]] }; null = bản đồ không có quái chung.
// data phải đã qua hcData (src/game/he-chien.js) như trong game: máu quái ở data.mobs là máu thật lúc đánh.
export function bangQuai(data, mapId) {
  const C = QC(data), def = data?.maps?.[mapId];
  if (!C || !def || !(C.maps || []).includes(mapId) || def.kh || (def.rooms || []).length) return null;
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
  return { tam: C.tam ?? 480, dps_k: C.dps_k ?? 5, bud_s: C.bud_s ?? 10, own_ms: C.own_ms ?? 1500, dong: [C.dong?.ref || 3, C.dong?.max || 1], hiem: hiemCua(data), maps };
}
