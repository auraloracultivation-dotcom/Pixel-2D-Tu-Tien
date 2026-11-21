// TỆP CHÉP TỰ ĐỘNG từ src/game/quai-ky.js, KHÔNG SỬA TAY. Chép lại: node tools/quai-chung.mjs --ghi (tools/check.mjs so khớp).
// Chữ ký ngắn của một bảng (FNV-1a 32 bit). Máy khách và máy chủ phòng so chữ ký bảng quái chung; lệch (hai bên khác bản data/,
// hay khác bố cục tinh cầu tông môn) thì máy khách tự về quái riêng, không đoán. Thuần, không import gì: tools/quai-chung.mjs chép
// nguyên tệp này sang cloud/src/quai-ky.js cho máy chủ phòng.
export function kyTen(v) {
  let h = 0x811c9dc5;
  for (const ch of JSON.stringify(v)) { h ^= ch.codePointAt(0); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(36);
}
