// Phần thuần của "thấy người chơi khác" (không vẽ, không gọi mạng; game/others.js dùng, tools/thu-realtime.mjs thử trong Node).
// Tin presence / vị trí do máy người khác gửi nên coi là dữ liệu lạ: chỉ để hiển thị, kẹp số, lọc chữ, không bao giờ chạy.
// Số ở data/config.json → realtime.

// Bỏ ký tự điều khiển, ký tự đảo chiều chữ (giả tên), khoảng trắng thừa; cắt độ dài
const BAD = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff<>]/g;
export function cleanName(v, max = 24) {
  const s = typeof v === 'string' ? v.replace(BAD, '').replace(/\s+/g, ' ').trim() : '';
  return Array.from(s).slice(0, max).join('');
}
const ID = /^[\w-]{1,48}$/;
export const word = v => (typeof v === 'string' && ID.test(v) ? v : null);
export const has = (o, k) => typeof k === 'string' && !!o && Object.hasOwn(o, k);   // không nhận "__proto__", "constructor"
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

// Một mục hồ sơ máy khác gửi → bản đã lọc. Mọi trường khai ở data/dong-bo.json → ho_so (bang), mỗi trường lọc theo kiểu của nó;
// mã phải có thật trong data/ (data = game.data). Thêm trường mới chỉ thêm dòng vào bảng, không sửa ở đây.
const di = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
function loc(d, v, data, max) {
  switch (d.kieu) {
    case 'ten': return cleanName(v, Math.min(d.dai, max || d.dai)) || d.trong || '';
    case 'ma': { const b = di(data, d.bang); return has(b, v) && v[0] !== '_' && (!d.la || Object.entries(d.la).every(([k, x]) => b[v]?.[k] === x)) ? v : null; }
    case 'chu': return word(v);
    case 'so': return typeof v === 'string' && /^\d+$/.test(v) && v.length <= d.dai && (!d.du || v.length === d.dai) ? v : null;
    case 'chon': return typeof v === 'string' && d.gia_tri.includes(v) ? v : null;
    case 'co': return v ? 1 : 0;
    default: return null;
  }
}
export function cleanPresence(e, bang, data, max) {
  if (!e || !word(e.id)) return null;
  const out = { id: e.id };
  for (const k of Object.keys(bang)) out[k] = loc(bang[k], e[k], data, k === 'name' ? max : 0);
  return out;
}

// Một gói vị trí → { id, x, y, fx, fy, sw } đã kẹp trong bản đồ (bounds: { w, h } điểm ảnh), sai thì null
export function cleanMove(p, bounds) {
  if (!p || !word(p.id)) return null;
  const x = num(p.x, 0, bounds?.w ?? 1e5), y = num(p.y, 0, bounds?.h ?? 1e5);
  if (x === null || y === null) return null;
  return { id: p.id, x, y, fx: num(p.fx, -1, 1) || 0, fy: num(p.fy, -1, 1) || 0, sw: p.sw ? 1 : 0 };
}

// Khoảng gửi vị trí (mili giây) theo số người cùng kênh và người ở gần; Infinity = không gửi
export function sendGap(R, others, nearest, tile) {
  if (!others) return Infinity;   // một mình: không ai nhận, khỏi tốn tin
  if (nearest > R.near_tiles * tile) return R.far_ms;
  return Math.min(R.max_ms, R.send_ms * Math.max(1, others / R.crowd_ref));
}

// n người gần (x, y) nhất trong list (đã có vị trí)
export function nearestN(list, x, y, n) {
  const arr = list.filter(o => o.x !== null);
  if (arr.length <= n) return arr;
  return arr.map(o => [Math.hypot(o.x - x, o.y - y), o]).sort((a, b) => a[0] - b[0]).slice(0, n).map(a => a[1]);
}
