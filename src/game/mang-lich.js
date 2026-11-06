// Lịch Cửu Đầu Thôn Thiên Mãng (data/thien-mang.json → lich; chủ dự án 06/11/2026 20:59: "boss xuất hiện 20:30–21:00 hằng ngày giờ
// Việt Nam"). Giờ tính theo múi tz (giờ VN = UTC+7) nên ai ở đâu cũng cùng lúc. Máy chủ phòng Cloudflare (cloud/src/mang-cfg.js
// LICH, bản sao) tự mở nhận sát thương trong khung giờ và tự phát thưởng tổng kết lúc hết giờ.
// startMangLich: trước warn_min phút báo sắp xuất hiện; tới giờ báo đã xuất hiện, hỏi bay ra vây công; ghi vào Thông báo (Hòm thư).
import { every } from '../core/ticker.js';

const L = game => game.data['thien-mang']?.lich;
const hm = s => { const [h, m] = String(s).split(':').map(Number); return h * 60 + (m || 0); };

// Phút trong ngày theo giờ múi tz, và ngày (YYYY-MM-DD) theo múi đó
export function lichNow(game, now = Date.now()) {
  const l = L(game), d = new Date(now + (l?.tz ?? 7) * 3600000);
  return { min: d.getUTCHours() * 60 + d.getUTCMinutes() + d.getUTCSeconds() / 60, day: d.toISOString().slice(0, 10) };
}
export function inLich(game, now = Date.now()) {
  const l = L(game);
  if (!l) return false;
  const m = lichNow(game, now).min;
  return m >= hm(l.from) && m < hm(l.to);
}

export function startMangLich(game) {
  const l = L(game), c = game.data['thien-mang'];
  if (!l) return;
  const st = { soon: '', open: '' };
  every(() => {
    if (!game.save) return;
    const { min, day } = lichNow(game), T = c.text, f = hm(l.from), w = l.warn_min || 5;
    const fill = s => s.replace('{from}', l.from).replace('{to}', l.to);
    if (min >= f - w && min < f && st.soon !== day) { st.soon = day; game.toast(fill(T.soon), 4); }
    if (inLich(game) && st.open !== day) {
      st.open = day;
      import('./inbox.js').then(I => I.notify(game, { key: 'mang:' + day, kind: 'he_thong', title: c.name, text: fill(T.open_now), go: 'mang' })).catch(() => {});
      game.toast(fill(T.open_now), 4);
      if (!game.uiOpen && !game.dialog?.open && !game.trip && !game.duel && !game.trib?.active && !game.traveling) {
        game.dialog.choose(fill(T.open_now), [{ id: 'go', label: T.go_now, color: '#ff6a3a' }, { id: 'no', label: T.later }], 600)
          .then(id => { if (id === 'go') import('./thien-mang.js').then(M => M.goArena(game)); });
      }
    }
  }, 5000);
}
