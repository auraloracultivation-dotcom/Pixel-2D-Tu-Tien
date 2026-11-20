// MỘT CỬA NHẬN cho tin "vừa xảy ra" của người khác (bên gửi: phat.js). Các nhóm tin khai ở data/dong-bo.json → hieu_ung (mẫu mã của
// nhóm); mỗi nhóm một bộ xem ở XEM dưới đây (tên khoá = tên nhóm trong bảng, tools/dong-bo.mjs so khớp). Thêm nhóm mới: thêm dòng
// vào bảng, thêm bộ xem vào XEM, thêm tin mẫu vào tools/hai-may.mjs (bài thử đòi đủ).
// Tin là dữ liệu lạ: bộ xem tự kiểm (mã có thật, người gửi đang thấy, chỗ không lệch xa, nhịp tối thiểu), chỉ vẽ và kêu, không đổi luật chơi.
import { nlSeen } from './nl-roi.js';
import { kdSeen } from './ket-dan.js';
import { kiepSeen } from './kiep-see.js';
import { pbSee } from './pb-see.js';
import { castFx } from './others-cast.js';
import { huSeen } from './dien.js';

export const XEM = {
  nl: (game, o, raw) => nlSeen(game, raw),
  kd: kdSeen,
  ks: kiepSeen,
  pb: pbSee,
  hu: huSeen,
  chieu: castFx,
};

export const demXem = {};   // số tin đã chia theo nhóm (bài thử hai máy đọc qua window.__thu)
let mau = null;   // [[tên nhóm, mẫu, bảng tra]] dựng một lần từ data/dong-bo.json
const di = (o, path) => path.split('.').reduce((a, k) => a?.[k], o);

// o: người gửi (có thể chưa thấy: null), raw: { id, k, x, y, fx, fy }, bounds: cỡ bản đồ. Trả tên nhóm đã nhận, null nếu không nhóm nào khớp.
export function nhanHieuUng(game, o, raw, bounds) {
  const k = raw?.k;
  if (typeof k !== 'string') return null;
  mau ??= Object.entries(game.data['dong-bo'].hieu_ung).filter(([ten]) => ten[0] !== '_').map(([ten, d]) => [ten, d.mau ? new RegExp(d.mau) : null, d.bang]);
  for (const [ten, re, bang] of mau) {
    if (re ? !re.test(k) : !Object.hasOwn(di(game.data, bang) || {}, k)) continue;
    XEM[ten]?.(game, o, raw, bounds);
    demXem[ten] = (demXem[ten] || 0) + 1;
    return ten;
  }
  return null;
}
