// Reset mùa (chủ dự án 12/11/2026 04:07, data/config.json → season): bản lưu có save.mua nhỏ hơn mùa hiện tại thì về Luyện Khí tầng 1,
// truyện chạy lại từ đầu (động phủ thu lại tới bước truyện ban lại; đồ bày, cá trong bể vẫn giữ), thưởng truyện và nhiệm vụ Hệ Thống
// nhận lại được. Pháp bảo cũ tháo ra, ngọc khảm trên đó trả về túi, món cất sang save.pbCu (ẩn, dữ liệu vẫn giữ, không chiếm ô túi). Linh căn giữ phẩm (rootKeep).
// Máy chủ đã reset cùng lúc (migration 20261112050000_p2d_mua_2.sql, có hoàn Linh Thạch chiêu đã mua và pháp bảo cũ) nên bản tải về
// thường đã đúng mùa; ở đây lo bản chơi thử trong máy và bản lưu cũ lỡ sót. Tài khoản thử (test_uid) không reset.
import { pbTest } from './phap-bao.js';

export function seasonReset(game) {
  const S = game.data.config.season, s = game.save;
  if (!S || !s) return false;
  if ((+s.mua || 1) >= S.id) return false;   // save.mua: số mùa (save.season là mùa trong năm của thời tiết, đừng lẫn)
  if (s.step === 0 && !s.realm && (s.layer || 1) === 1 && !s.qi) { s.mua = S.id; return false; }   // bản mới: chỉ ghi mùa
  if (pbTest(game)) { s.mua = S.id; return false; }
  const start = game.data.config.start;
  if (s.element && s.root) s.rootKeep = s.root;
  Object.assign(s, { mua: S.id, realm: 0, layer: 1, qi: 0, giftAt: 0, step: 0, stepDone: false, map: start.map, spawn: start.spawn });
  for (const f of S.story_flags || []) delete s.flags?.[f];
  s.visited = { [start.map]: true };
  const old = s.equip?.['phap-bao'];   // pháp bảo cũ: tháo, trả ngọc khảm về túi
  if (old != null) delete s.equip['phap-bao'];
  const isOld = it => game.data.items.bases[it.base]?.slot === 'phap-bao';
  for (const it of (s.bag || []).filter(isOld)) {
    for (let i = 0; i < (it.sockets || []).length; i++) if (it.sockets[i]) { (s.gems ??= {})[it.sockets[i]] = (s.gems[it.sockets[i]] || 0) + 1; it.sockets[i] = null; }
    (s.pbCu ??= []).push(it);   // cất riêng (save.pbCu), không chiếm ô túi
  }
  if (s.bag) s.bag = s.bag.filter(it => !isOld(it));
  delete s.phapBao;   // hệ pháp bảo mới nhận lại từ đầu theo mốc
  if (S.hello) setTimeout(() => game.toast?.(S.hello, 7), 2500);   // chào mùa mới
  return true;
}
