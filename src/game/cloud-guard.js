// Lưu máy chủ và chống gian lận phía game (chủ dự án xin 28/10/2026: "sửa cho đỡ lỗi, làm vài quy tắc", "có người dùng
// GameGuardian, nâng cấp chống gian lận"). Chữ và số ở data/config.json → guard.
// - cloudHooks: các hàm game đưa cho src/net/profile.js: báo lỗi lưu (một lần mỗi phút, không dội liên tục), báo máy khác
//   đang chơi, nhận số máy chủ sửa lại.
// - applyFix: máy chủ thấy số gửi lên lố quá xa (migration 20261028140000_p2d_chong_gian_2) thì trả "sua":
//   cảnh giới, tầng, linh khí lấy đúng số máy chủ; Linh Thạch, nguyên liệu trừ phần lố; tháp về tầng máy chủ cho;
//   món máy chủ trả về (sua.mon) thay món cùng uid trong túi; món mới máy chủ không nhận (sua.roi) bỏ khỏi túi.
// - pickSave: chọn bản trong máy hay bản máy chủ lúc vào game, không để máy cũ đè máy mới.
// - startGuard: giấu số và đặt bẫy sửa bộ nhớ (src/core/guard.js), kiểm tra định kỳ.
import { guardSave, checkGuard } from '../core/guard.js';

const fin = v => typeof v === 'number' && Number.isFinite(v);

// Chọn bản lưu lúc vào game (báo cáo #13, issue #335: chơi hai máy, máy cũ còn mở đè mất đồ máy kia).
// Bản trong máy chỉ thắng khi mới hơn VÀ không máy nào khác ghi lên máy chủ sau nó:
// cùng phiên ghi cả hai (ss trùng), hoặc dựa đúng phiên bản máy chủ hiện tại (chơi lúc máy chủ chậm).
// Dấu ss, pb do src/net/profile.js mark() đóng. Bản trong máy chưa có dấu thì nhường máy chủ.
export function pickSave(local, remote, pb) {
  if (!remote || !local) return remote || local;
  if ((local.lastSeen || 0) <= (remote.lastSeen || 0)) return remote;
  const same = (local.ss && local.ss === remote.ss) || (fin(local.pb) && local.pb === pb);
  return same ? local : remote;
}

// Trần nhận mỗi ngày (migration 20261030180000_p2d_tran_ngay): máy chủ trả sua.tran, không phải gian lận
let lastTran = -1e9;
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
  // Túi ngọc máy chủ nhận (migration 20261105020000_p2d_ky_ngoc, p2d_kiem_ngoc): thêm / bớt phần chênh với bản đã gửi,
  // giữ ngọc vừa nhặt sau lần gửi
  if (sua.gems && typeof sua.gems === 'object') {
    s.gems ??= {};
    const sg = sent.gems || {};
    for (const k of new Set([...Object.keys(sg), ...Object.keys(sua.gems)])) {
      const d = (fin(sua.gems[k]) ? sua.gems[k] : 0) - (fin(sg[k]) ? sg[k] : 0);
      if (!d) continue;
      s.gems[k] = Math.max(0, (s.gems[k] || 0) + d);
      if (!s.gems[k]) delete s.gems[k];
    }
  }
  // Món bị sửa ở máy (dòng, cấp cường hoá, độ hiếm...) hoặc đồ cũ máy chủ đặt trần dòng / hệ: lấy bản máy chủ
  // (migration 20261105010000_p2d_ky_mon, p2d_kiem_ky). Giữ nguyên đối tượng món để chỗ khác đang trỏ tới vẫn đúng.
  for (const m of Array.isArray(sua.mon) ? sua.mon : []) {
    const it = m && s.bag?.find(x => x.uid === m.uid);
    if (it) { for (const k of Object.keys(it)) if (!(k in m)) delete it[k]; Object.assign(it, m); }
  }
  // Đồ rơi mới máy chủ không nhận (migration 20261105030000_p2d_ky_roi, p2d_kiem_roi): bỏ khỏi túi, tháo nếu đang mặc;
  // món trùng mã số chỉ giữ món đầu như máy chủ. Sửa túi tại chỗ để chỗ khác đang trỏ tới vẫn đúng.
  const roi = Array.isArray(sua.roi) ? new Set(sua.roi) : null;
  if (roi && s.bag) {
    const seen = new Set();
    for (let i = 0; i < s.bag.length; i++) {
      const u = s.bag[i]?.uid;
      if (roi.has(u) || seen.has(u)) s.bag.splice(i--, 1); else seen.add(u);
    }
    for (const [k, u] of Object.entries(s.equip || {})) if (roi.has(u)) delete s.equip[k];
  }
  game.refreshStats?.();
  if (game.player) game.player.hp = Math.min(game.player.hp, game.player.maxHp);
  const T = game.data.config.guard?.texts || {};
  if (roi?.size && T.roi) game.toast(T.roi.replace('{n}', roi.size), 3);
  else if (!sua.tran) game.toast(T.fix || '', 3);
  else if (performance.now() - lastTran > 60000) { lastTran = performance.now(); game.toast(T.tran || '', 3); }   // chạm trần ngày: báo nhẹ, một lần mỗi phút
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
