// Quà chia sẻ clip (data/record.json "share"): quay clip đủ dài, bấm Chia sẻ thì mở quà; dán link bài đăng công khai để
// máy chủ kiểm tra rồi cộng 1 viên ngọc. Máy chủ giữ việc "mỗi tài khoản một lần" và "mỗi bài một lần".
import { gemInfo } from './items.js';

const KEY = 'p2d.clip-share';   // máy này đã chia sẻ một clip đủ dài chưa (chỉ để mở ô nhận quà)
const net = () => import('../net/share.js');

export const giftClaimed = game => !!game.save?.quaChiaSe;
export const loggedIn = game => !!game.cloud;

export function giftUnlocked() {
  try { return localStorage.getItem(KEY) === '1'; } catch { return false; }
}

export function unlockGift() {
  try { localStorage.setItem(KEY, '1'); } catch { /* chế độ riêng tư: chỉ mở trong lần chơi này */ }
  unlockGift.mem = true;
}

export const giftOn = game => !!game.recordCfg?.share?.on;
export const giftReady = game => giftOn(game) && (giftUnlocked() || unlockGift.mem) && !giftClaimed(game);

export function gemTypes(game) {
  return Object.entries(game.data.items.gems.types).map(([id, t]) => ({ id, name: t.name, color: t.color }));
}

// Link có giống bài TikTok / YouTube không (máy chủ kiểm tra lại kỹ)
export function looksLikeLink(url) {
  try {
    const u = new URL(url.trim());
    return u.protocol === 'https:' && /(^|\.)(tiktok\.com|youtube\.com|youtu\.be)$/i.test(u.hostname);
  } catch { return false; }
}

// Trả về { gem: tên ngọc } hoặc { error: mã lỗi trong data/record.json text.err }
export async function claimGift(game, url, loai) {
  if (!game.cloud) return { error: 'chua_dang_nhap' };
  if (giftClaimed(game)) return { error: 'da_nhan' };
  if (!looksLikeLink(url)) return { error: 'link_sai' };
  if (!game.data.items.gems.types[loai]) return { error: 'loi' };
  const { claimShareGift } = await net();
  let out = { error: 'loi' };
  try {
    await game.cloud.run(() => claimShareGift(url.trim(), loai), r => {
      if (r?.error) { out = { error: r.error }; if (r.error === 'da_nhan') { game.save.quaChiaSe = true; game.persist?.(); } return; }
      if (!r?.gem || !/^[a-z-]+:\d+$/.test(r.gem)) return;
      const s = game.save;
      s.gems ??= {};
      s.gems[r.gem] = (s.gems[r.gem] || 0) + 1;
      s.quaChiaSe = true;
      game.refreshStats?.(); game.persist?.();
      out = { gem: gemInfo(game.data, r.gem).name };
    });
  } catch { out = { error: 'loi' }; }
  return out;
}
