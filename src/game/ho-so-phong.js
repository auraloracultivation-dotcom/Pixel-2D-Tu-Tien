// Hồ sơ phòng: MỘT NGUỒN cho "người khác thấy gì ở nhân vật của mình". Danh sách trường ở data/dong-bo.json → ho_so; tệp này là nơi
// duy nhất biến trạng thái của mình thành hồ sơ đó (hoSoCuaToi). Chính bản ghi game.hoSo vừa được GỬI cho phòng (others.js: vào tinh cầu
// và mỗi khi chữ ký đổi) vừa dùng để VẼ nhân vật của mình (src/render/draw-nguoi.js), nên thứ gì hiện trên người mình thì người khác
// cũng nhận được. Chiều nhận: others-net.js cleanPresence lọc theo cùng bảng, apHoSo chép lên người đang thấy.
// Thêm một thứ mới: docs/03-CAU-TRUC.md mục "Thêm một thứ người khác phải thấy".
import { realmLabel, weaponId } from './stats.js';
import { titleOf } from './achieve.js';

const mon = (game, o) => { const u = game.save.equip?.[o]; return (u != null && game.save.bag?.find(i => i.uid === u)) || null; };   // món đang mặc ở ô o

// Trường không nằm sẵn ở một chỗ trong bản lưu thì tính ở đây. Tên khoá = tên trường trong bảng (tools/check.mjs so khớp: trường nào
// trong bảng không ghi "lay" phải có hàm ở đây, và ngược lại).
export const LAY = {
  realm: game => realmLabel(game.save, game.data.realms),
  mount: game => (game.player?.riding ? game.save.mount : null),   // chỉ lúc đang cưỡi
  pt: game => game.data.items.bases[mon(game, 'ngoc-boi')?.base]?.pt,   // pháp tượng đang đeo (ô ngoc-boi, data/items.json → bases.*.pt)
  vk: game => mon(game, 'vu-khi')?.base,
  vkl: game => weaponId(game.save, game.data),
  st: game => (game.ghost ? 'guc' : game.player?.flying ? 'bay' : game.player?.meditating ? 'toa' : null),
  ri: game => game.save.realm ?? 0,
  title: game => (titleOf(game) ? game.save.title : null),   // danh hiệu tuần hết hạn thì thôi
};

export const bangHoSo = game => game.data['dong-bo'].ho_so;
let nho = null;   // [bảng, [[tên trường, hàm lấy]]] của các trường máy mình gửi (bỏ trường tầng kết nối / máy chủ phòng lo)
function truong(game) {
  const t = bangHoSo(game);
  if (nho?.[0] !== t) {
    nho = [t, Object.keys(t).filter(k => !t[k].ai).map(k => {
      const duong = t[k].lay?.split('.');
      return [k, duong ? g => duong.reduce((a, x) => (a == null ? a : a[x]), g) : LAY[k]];
    })];
  }
  return nho[1];
}

// Hồ sơ của mình lúc này, ghi vào `vao` (dùng lại một vật, không tạo mới mỗi khung). Trống thì null, số thì thành chữ (máy chủ phòng chỉ nhận chữ).
export function hoSoCuaToi(game, vao = {}) {
  for (const [k, lay] of truong(game)) {
    const v = lay?.(game);
    vao[k] = v == null || v === '' || v === false ? null : typeof v === 'number' ? String(v) : v;
  }
  if (ep) Object.assign(vao, ep);
  return vao;
}
// Bài thử hai máy (tools/hai-may.mjs qua window.__thu): ép giá trị vài trường để thử đường truyền từng trường mà không phải dựng đủ
// trạng thái game (đang cưỡi, đang bay, có pháp tượng…). Người chơi thật: luôn null.
let ep = null;
export const epHoSo = o => { ep = o; };

// Chuỗi so sánh: đổi là phải báo lại cho người cùng tinh cầu
export const chuKy = (game, h) => truong(game).map(([k]) => h[k]).join('|');

// Chép hồ sơ đã lọc (others-net.js cleanPresence) lên người đang thấy; tên xử lý riêng ở others.js (lọc từ bậy)
export function apHoSo(game, o, e) {
  for (const k of Object.keys(bangHoSo(game))) if (k !== 'name') o[k] = e[k];
}
