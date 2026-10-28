// Lưu máy chủ và chống gian lận phía game (chủ dự án xin 28/10/2026: "sửa cho đỡ lỗi, làm vài quy tắc", "có người dùng
// GameGuardian, nâng cấp chống gian lận"). Chữ và số ở data/config.json → guard.
// - cloudHooks: các hàm game đưa cho src/net/profile.js: báo lỗi lưu (một lần mỗi phút, không dội liên tục), báo máy khác
//   đang chơi, nhận số máy chủ sửa lại.
// - applyFix: máy chủ thấy số gửi lên lố quá xa (migration 20261028140000_p2d_chong_gian_2) thì trả "sua":
//   cảnh giới, tầng, linh khí lấy đúng số máy chủ; Linh Thạch, nguyên liệu trừ phần lố; tháp về tầng máy chủ cho.
// - startGuard: giấu số và đặt bẫy sửa bộ nhớ (src/core/guard.js), kiểm tra định kỳ.
import { guardSave, checkGuard } from '../core/guard.js';

const fin = v => typeof v === 'number' && Number.isFinite(v);

export function applyFix(game, sent, sua) {
  const s = game.save;
  if (!s || !sua) return;
  if (fin(sua.realm) && fin(sua.layer) && fin(sua.qi)) { s.realm = sua.realm; s.layer = sua.layer; s.qi = sua.qi; }
  if (fin(sua.lingshi) && fin(sent.lingshi) && sent.lingshi > sua.lingshi) s.lingshi = Math.max(0, (s.lingshi || 0) - (sent.lingshi - sua.lingshi));
  if (sua.mats && s.mats) {
    for (const [k, v] of Object.entries(sent.mats || {})) {
      const over = v - (sua.mats[k] ?? 0);
      if (over > 0) s.mats[k] = Math.max(0, (s.mats[k] || 0) - over);
    }
  }
  if (fin(sua.best) && s.tower && s.tower.best > sua.best) s.tower.best = sua.best;
  game.refreshStats?.();
  if (game.player) game.player.hp = Math.min(game.player.hp, game.player.maxHp);
  game.toast(game.data.config.guard?.texts?.fix || '', 3);
  game.persist();
}

export function cloudHooks(game) {
  const G = game.data.config.guard || {}, T = G.texts || {};
  let lastErr = -1e9;
  return {
    onConflict: () => game.toast(T.conflict, 4),
    onError: (e, bad) => {
      const now = performance.now();
      if (now - lastErr < 60000) return;
      lastErr = now;
      game.toast(bad ? T.bad : T.net, 2);
    },
    onFix: (sent, sua) => applyFix(game, sent, sua),
    retry: { ms: G.retry_ms, max: G.retry_max_ms },
  };
}

let timer = null;
export function startGuard(game) {
  const G = game.data.config.guard;
  if (!G) return;
  guardSave(game.save, G);
  timer ||= setInterval(() => { if (game.save) checkGuard(game.save, G); }, G.check_ms || 3000);
}
