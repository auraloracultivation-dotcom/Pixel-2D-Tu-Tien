// Kiểm tra ảnh góp ý trước khi tải lên kho gop-y-anh (dùng chung cho hàm gop-y-anh và bài thử tools/gop-y/anh.test.mjs).
// Thuần JavaScript, không gọi mạng: chạy được cả trong Deno (Edge Function) lẫn Node.
// Ảnh đến dạng data URL (data:image/jpeg;base64,...) như máy khách vẫn gửi; kiểu ảnh lấy theo byte đầu tệp, không tin phần khai báo.

export const GIOI_HAN = {
  lon: 300 * 1024,      // ảnh xem (≤ 960 điểm, JPEG 0,72): thực tế ~30–170 KB; trước đây chuỗi base64 ≤ 350000 ký tự
  nho: 40 * 1024,       // ảnh nhỏ (≤ 320 điểm) cho Claude xem nhanh; trước đây ≤ 40000 ký tự
};

const DUOI = { jpeg: 'jpg', png: 'png', webp: 'webp' };
const MIME = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const DAU = /^data:image\/(jpeg|jpg|png|webp);base64,/;
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;

// Kiểu ảnh theo byte đầu: 'jpg' | 'png' | 'webp' | null
export function loaiTheoByte(b) {
  if (!b || b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return 'png';
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return 'webp';
  return null;
}

export const mimeCua = duoi => MIME[duoi] || null;

// data URL → { bytes, duoi, mime } hoặc { loi } (rong | kieu | qua_lon | hong). toiDa: số byte tối đa sau khi giải.
/** @typedef {{ loi?: undefined, bytes: Uint8Array, duoi: string, mime: string }} AnhTot */
/** @typedef {{ loi: 'rong' | 'kieu' | 'qua_lon' | 'hong', bytes?: undefined, duoi?: undefined, mime?: undefined }} AnhHong */
/** @param {unknown} s @param {number} toiDa @returns {AnhTot | AnhHong} */
export function giaiAnh(s, toiDa) {
  if (typeof s !== 'string' || !s) return { loi: 'rong' };
  const m = s.match(DAU);
  if (!m) return { loi: 'kieu' };
  const b64 = s.slice(m[0].length).replace(/\s+/g, '');
  if (b64.length > Math.ceil(toiDa / 3) * 4 + 4) return { loi: 'qua_lon' };   // chặn sớm, khỏi giải chuỗi khổng lồ
  if (b64.length % 4 !== 0 || !B64.test(b64)) return { loi: 'hong' };
  let bin;
  try { bin = atob(b64); } catch { return { loi: 'hong' }; }
  if (bin.length > toiDa) return { loi: 'qua_lon' };
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  const duoi = loaiTheoByte(bytes);
  if (!duoi) return { loi: 'kieu' };
  return { bytes, duoi, mime: MIME[duoi] };
}

// Mã lỗi nghiệp vụ trong thông báo lỗi Postgres (raise exception 'gui_nhanh_qua' ...) → chữ thường gạch dưới, không thì 'loi'
export function maLoi(msg) {
  const m = String(msg || '').match(/^[a-z_]{3,40}$/) || String(msg || '').match(/\b(chua_dang_nhap|du_lieu_sai|tieu_de_sai|mo_ta_dai|anh_sai|gui_nhanh_qua|het_luot_hom_nay)\b/);
  return m ? (m[1] || m[0]) : 'loi';
}

// Đường dẫn trong kho do máy chủ đặt: "<mã góp ý>/lon.jpg" | "<mã>/nho.webp"... Chặn mọi chuỗi khác trước khi gọi kho.
export const duongDanHopLe = p => typeof p === 'string' && /^\d{1,15}\/(lon|nho)\.(jpg|png|webp)$/.test(p);
