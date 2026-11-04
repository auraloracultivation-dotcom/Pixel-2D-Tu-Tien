// Lịch sử Linh Thạch (đề xuất #137, chủ dự án chốt 04/11/2026: cách nhẹ nhất, chỉ lưu trong máy, không tốn máy chủ).
// Mỗi tài khoản giữ tối đa data/shop.json → coin_log.keep dòng trong localStorage, không bao giờ vào bản lưu máy chủ.
// Dòng: { t: giờ (ms), n: số cộng / trừ, k: mã lý do (chữ ở coin_log.why), b: số dư sau, c: số lần đã gộp }.
// addCoins (shop.js) và các chỗ trừ thẳng save.lingshi (cường hoá, tẩy luyện, ghép ngọc) gọi noteCoins kèm mã lý do.
// Mỗi watch_s giây so số dư: lệch mà không chỗ nào ghi thì thành dòng 'khac' (máy chủ sửa, tải lại bản lưu, thư...).
// Lỗi bộ nhớ (chế độ riêng tư, đầy) thì chỉ giữ trong phiên, không bao giờ ném lỗi.
import { every } from '../core/ticker.js';

const STORE = 'p2d.coinlog.v1:';
const MIN = 60000;
let G = null, st = null;   // game đang chạy; st = { owner, save, list, known, dirty }

// Thêm một dòng vào đầu danh sách (mới nhất trước), trả về danh sách. Hàm thuần, kiểm thử được bằng node.
// Mã trong mergeKeys: gộp với dòng cùng mã, cùng dấu, cùng phút ở bất kỳ đâu (dòng gộp lên đầu, số dư theo lần mới nhất);
// mã khác: chỉ gộp khi dòng trên cùng cùng mã, cùng dấu, cùng phút.
export function pushEntry(list, e, keep = 100, mergeKeys = []) {
  if (!e.n) return list;
  const m = Math.floor(e.t / MIN), same = x => x && x.k === e.k && Math.sign(x.n) === Math.sign(e.n) && Math.floor(x.t / MIN) === m;
  const i = mergeKeys.includes(e.k) ? list.findIndex(same) : same(list[0]) ? 0 : -1;
  if (i >= 0) { const x = list.splice(i, 1)[0]; e = { ...e, n: x.n + e.n, c: (x.c || 1) + 1 }; }
  list.unshift(e);
  if (list.length > keep) list.length = keep;
  return list;
}

const C = () => G.data.shop.coin_log || {};
const bal = save => save?.lingshi || 0;

function load(owner) {
  let d = null;
  try { d = JSON.parse(localStorage.getItem(STORE + owner)); } catch { /* chế độ riêng tư: chỉ giữ trong phiên */ }
  return Array.isArray(d) ? d.filter(x => x && typeof x.n === 'number' && typeof x.t === 'number').slice(0, C().keep || 100) : [];
}
function store() {
  if (!st?.dirty) return;
  st.dirty = false;
  try { localStorage.setItem(STORE + st.owner, JSON.stringify(st.list)); } catch { /* đầy bộ nhớ: bỏ qua */ }
}

// Bám theo tài khoản và bản lưu hiện tại. Đổi tài khoản (hoặc bản lưu đầu tiên) thì lấy số dư làm mốc, không ghi;
// cùng tài khoản mà bản lưu bị thay (tải lại từ máy chủ) thì giữ mốc cũ để phần lệch thành dòng 'khac'.
function sync(n = 0) {
  const owner = G.owner || 'guest', save = G.save;
  if (!st || st.owner !== owner) { store(); st = { owner, save: null, list: load(owner), known: null, dirty: false }; }
  if (save !== st.save) { if (!st.save) st.known = null; st.save = save; }
  if (save && st.known == null) st.known = bal(save) - n;   // mốc là số dư trước thay đổi đang ghi
  return !!save;
}

function add(n, k, b) {
  pushEntry(st.list, { t: Date.now(), n: Math.round(n), k, b: Math.round(b) }, C().keep || 100, C().merge || []);
  st.dirty = true;
}

// Ghi một thay đổi vừa làm với save.lingshi (đã cộng / trừ xong). save khác bản lưu đang chơi thì bỏ qua.
export function noteCoins(save, n, k) {
  try {
    if (!G || !n || save !== G.save || !sync(n)) return;
    const b = bal(save), odd = b - n - st.known;
    if (Math.abs(odd) >= 1) add(odd, 'khac', b - n);   // lệch từ trước mà chưa ai ghi
    add(n, k || 'khac', b);
    st.known = b;
  } catch { /* lịch sử không bao giờ làm hỏng việc chính */ }
}

// Danh sách hiện tại (mới nhất trước) cho bảng lịch sử
export function coinLog() {
  try { if (G) { watch(); return st?.list || []; } } catch { /* bỏ qua */ }
  return [];
}

function watch() {
  if (!sync()) return;
  const b = bal(G.save), d = b - st.known;
  if (Math.abs(d) >= 1) { add(d, 'khac', b); st.known = b; }
  store();
}

// Gọi một lần lúc dựng giao diện (src/ui/bag.js)
export function startCoinLog(game) {
  if (G) return;
  G = game;
  every(() => { try { watch(); } catch { /* bỏ qua */ } }, (C().watch_s || 2) * 1000);
  try { addEventListener('pagehide', () => { try { store(); } catch { /* bỏ qua */ } }); } catch { /* không có window */ }
}
