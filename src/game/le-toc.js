// Lễ Cây Thế Giới gọi tên huyết mạch (Tiềm năng, chủ dự án 21/11/2026 17:23; docs/15-TIEM-NANG-KY-NANG.md). Một đời một lượt.
// - Người mới: lệnh truyện { le_toc: 'truong-thon' } ngay sau lễ thức tỉnh linh căn ở Thanh Khê (data/story.json), trưởng thôn đứng lễ.
// - Người đã thức tỉnh từ trước khi có Tiềm năng: lúc màn hình đang yên (không thoại, không bảng, không đang đánh) Hệ Thống báo và lễ tự mở, đúng một lần.
// Kết quả quay ghi vào save.tiem rồi mới mở màn lễ (src/ui/le-toc.js): thoát game giữa lễ cũng không quay lại được lượt khác.
// Có tài khoản: máy chủ quay và giữ kết quả (src/net/tiem-nang.js, migration 20261122030000_p2d_tiem_ky_nang.sql). Chơi thử không tài khoản, hoặc máy chủ chưa trả
// lời: quay tại máy; lúc lưu máy chủ quyết lại theo bảng của nó (cloud-guard.js nhận phần sửa).
import { TN, tnOn, quay } from './tiem-nang.js';

const tenAi = (game, ai) => (ai === 'truong-thon' ? game.data.npcs['truong-thon']?.name || '' : game.data['he-thong']?.short || game.data['he-thong']?.name || 'Hệ Thống');

async function xinQuay(game) {
  try { const r = await game.quayTocMayChu?.(); if (r?.toc && TN(game.data).toc[r.toc]) return { toc: r.toc, goc: r.goc || {} }; } catch { /* máy chủ chưa trả lời: quay tại máy */ }
  return quay(game.data);
}

export async function leToc(game, ai = 'he-thong') {
  const T = TN(game.data), s = game.save;
  if (!tnOn(game.data) || !s?.element || s.tiem?.toc || game.leDang) return false;
  game.leDang = true;
  try {
    const L = T.le, loi = L[ai === 'truong-thon' ? 'truong_thon' : 'he_thong'], ten = tenAi(game, ai);
    await game.dialog.say([[ten, loi.truoc]]);
    const kq = await xinQuay(game);
    s.tiem = { toc: kq.toc, goc: kq.goc, cong: {}, tay: 0 };
    game.refreshStats(); game.persist();
    await game.leTocUI?.(kq);
    const t = T.toc[kq.toc];
    await game.dialog.say([[ten, loi[t.hiem].replace(/\{toc\}/g, t.ten)]]);
  } finally { game.leDang = false; }
  return true;
}

export function createLeToc(game) {
  let yen = 0;
  game.quayTocMayChu ??= async () => (game.cloud ? (await import('../net/tiem-nang.js')).quayToc() : null);
  setInterval(() => {
    const s = game.save;
    if (!tnOn(game.data) || !s?.element || s.tiem?.toc || game.leDang) { yen = 0; return; }
    const ban = !(game.manLang?.() ?? true) || game.story?.busy || game.trib?.active || game.duel || game.ghost || game.uiOpen || game.mobs?.some(m => m.aggro && m.hp > 0);
    if (ban) { yen = 0; return; }
    if (++yen >= (T(game).le.yen_s ?? 4)) { yen = 0; leToc(game, 'he-thong'); }   // yên đủ lâu mới mở: không chen vào trận đánh hay cảnh truyện
  }, 1000);
}
const T = game => TN(game.data);
