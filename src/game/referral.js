// Sự kiện Dẫn đạo hữu nhập môn (data/referral.json): trạng thái từ máy chủ, nhịp online mỗi beat_sec giây cho người được mời,
// mã mời trong link (?gt=<mã>) giữ lại tới khi đăng nhập để tự điền. Máy chủ đếm phút và gửi ngọc (net/referral.js).
const net = () => import('../net/referral.js');
const KEY = 'p2d.gt';   // mã mời lấy từ link, giữ trong máy tới khi nhập xong

export const refState = game => (game.referral ??= { info: null, at: 0 });
export const refOn = game => { const R = game.data.referral, now = Date.now(); return !!R && now >= Date.parse(R.starts) && now < Date.parse(R.ends); };

export function pendingCode() { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } }
export function clearCode() { try { localStorage.removeItem(KEY); } catch { /* chế độ riêng tư */ } }

// Đọc ?gt= trên địa chỉ trang (link mời) rồi xoá khỏi thanh địa chỉ cho gọn
export function captureCode() {
  const u = new URL(location.href), c = (u.searchParams.get('gt') || '').trim().toUpperCase();
  if (!/^[0-9A-F]{8}$/.test(c)) return;
  try { localStorage.setItem(KEY, c); } catch { /* không lưu được: người chơi tự gõ mã */ }
  u.searchParams.delete('gt');
  history.replaceState(null, '', u.pathname + (u.search || '') + u.hash);
}

export async function loadRef(game, force) {
  const s = refState(game);
  if (!force && s.info && Date.now() - s.at < 30000) return s.info;
  const r = await net().then(m => m.myReferral()).catch(() => ({ error: 'net' }));
  if (r.error) throw new Error(r.error);
  s.info = r.data; s.at = Date.now();
  return s.info;
}

export const enterRef = (game, ma, loai) => net().then(m => m.enterCode(ma, loai)).catch(() => ({ error: 'net' }));
export const pickRefGem = (game, loai) => net().then(m => m.pickGem(loai)).catch(() => ({ error: 'net' }));

const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

// Người được mời: gửi nhịp khi đang mở game (màn hình đang hiện); đủ phút thì báo
export function startReferral(game) {
  captureCode();
  const R = game.data.referral;
  if (!R) return;
  setInterval(async () => {
    if (!game.online || !game.cloud || !refOn(game) || document.visibilityState !== 'visible') return;
    const s = refState(game);
    if (!s.info) { try { await loadRef(game); } catch { return; } }
    const me = s.info?.cua_toi;
    if (!me || me.dat) return;
    const r = await net().then(m => m.beat()).catch(() => null);
    if (!r?.data) return;
    me.chuoi = r.data.chuoi; me.dat = r.data.dat;
    if (r.data.vua_dat) { game.toast(fill(R.text.done_toast, { ref: R.gem_ref }), 4); game.sfx('levelup'); }
  }, R.beat_sec * 1000);
}
