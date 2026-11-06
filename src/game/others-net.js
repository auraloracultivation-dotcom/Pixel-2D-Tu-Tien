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
const word = v => (typeof v === 'string' && ID.test(v) ? v : null);
const has = (o, k) => typeof k === 'string' && !!o && Object.hasOwn(o, k);   // không nhận "__proto__", "constructor"
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

// Một mục presence → hồ sơ hiển thị. known: { elements, looks } để chỉ nhận mã có trong data/
export function cleanPresence(e, known, max) {
  if (!e || !word(e.id)) return null;
  return {
    id: e.id,
    name: cleanName(e.name, max) || 'Đạo hữu',
    element: has(known.elements, e.element) ? e.element : null,
    realm: cleanName(e.realm, 24),
    look: has(known.looks, e.look) ? e.look : null,
    outfit: word(e.outfit),
    mount: known.mounts && has(known.mounts, e.mount) ? e.mount : null,   // đang cưỡi thú gì (06/11/2026: người khác thấy thú cưỡi)
  };
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
