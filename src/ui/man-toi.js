// Tắt màn hình khi treo game (chủ dự án 13/11/2026 10:01: "gamer muốn có nút tắt màn hình khi treo game").
// Trình duyệt không tắt được màn hình thật: máy khoá thì trang bị ngưng, game dừng theo. Nên "tắt màn" ở đây là:
//  - phủ một lớp đen kín màn hình (màn OLED gần như không tốn điện cho điểm đen); chỉ còn mấy dòng chữ mờ, mỗi move_s giây đổi chỗ
//    một lần cho khỏi lưu ảnh;
//  - game vẫn chạy (tự đánh, tự hành, đả tọa) nhưng src/main.js thôi vẽ khung hình và src/core/perf.js hạ nhịp xuống fps: nhẹ máy, mát máy;
//  - xin trình duyệt giữ máy thức (Screen Wake Lock) để máy không tự khoá; máy không cho thì hiện lời nhắc tắt tự khoá;
//  - lớp đen nuốt mọi cú chạm (không lỡ tay điều khiển nhân vật); chạm hai lần liền trong tap_ms mới bật lại;
//  - nhân vật gục, game hỏi hồi sinh ở đâu: tự bật lại cho người chơi chọn.
// Nút "Tắt màn" nằm ngay trên nút Tự đánh, chỉ hiện khi đang Tự đánh, Tự hành hoặc đả tọa. Chữ và số ở data/config.json → man_toi.
import { every } from '../core/ticker.js';

export function createManToi(game) {
  const C = game.data.config.man_toi;
  if (!C?.on) return;
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./man-toi.css', import.meta.url).href; document.head.append(css);
  const el = (tag, cls) => { const e = document.createElement(tag); if (cls) e.className = cls; return e; };
  const btn = el('button'); btn.id = 'btn-man-toi'; btn.type = 'button'; btn.textContent = C.btn; btn.hidden = true;
  btn.addEventListener('pointerdown', e => e.stopPropagation());   // không tính là chạm để di chuyển
  (document.getElementById('buttons') || document.body).append(btn);
  const veil = el('div'); veil.id = 'man-toi'; veil.hidden = true;
  const box = el('div', 'mt-box'), clock = el('b'), line = el('span'), since = el('span'), hint = el('small'), warn = el('small', 'mt-warn');
  hint.textContent = C.hint; warn.textContent = C.warn; warn.hidden = true;
  box.append(clock, line, since, hint, warn); veil.append(box); document.body.append(veil);

  let lock = null, tap = 0, t0 = 0, moved = 0, dim = 0;
  const hold = async () => {   // xin giữ máy thức; đổi app rồi quay về thì trình duyệt đã tự nhả, phải xin lại
    try { if (!lock && navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); } } catch { lock = null; }
    warn.hidden = !!lock;
  };
  const drop = () => { const l = lock; lock = null; try { l?.release(); } catch { /* đã nhả */ } };
  const bright = () => { veil.classList.add('mt-ro'); clearTimeout(dim); dim = setTimeout(() => veil.classList.remove('mt-ro'), C.show_s * 1000); };   // chữ sáng lên một lúc rồi mờ lại
  const place = () => { moved = Date.now(); box.style.left = `${8 + Math.random() * 24}%`; box.style.top = `${12 + Math.random() * 54}%`; };
  const paint = () => {
    const d = new Date(), p = game.player, hp = p?.maxHp ? Math.round(100 * Math.max(0, p.hp) / p.maxHp) : null;
    clock.textContent = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    line.textContent = [game.auto ? C.auto : game.pilot ? C.pilot : p?.meditating ? C.ngoi : C.nghi, hp == null ? '' : C.hp.replace('{n}', hp)].filter(Boolean).join(' · ');
    since.textContent = C.da.replace('{n}', Math.floor((Date.now() - t0) / 60000));
    if (Date.now() - moved > C.move_s * 1000) place();
  };
  const on = () => { game.manToi = true; document.body.classList.add('man-toi'); veil.hidden = false; t0 = Date.now(); tap = 0; place(); paint(); bright(); hold(); };
  const off = () => { game.manToi = false; document.body.classList.remove('man-toi'); veil.hidden = true; drop(); };
  btn.addEventListener('click', on);
  veil.addEventListener('pointerdown', e => {
    e.stopPropagation(); e.preventDefault();
    const now = performance.now();
    if (now - tap < C.tap_ms) off(); else { tap = now; bright(); }
  });
  document.addEventListener('visibilitychange', () => { if (game.manToi && !document.hidden) hold(); });
  every(() => {
    const hud = document.getElementById('hud'), p = game.player;
    btn.hidden = !(game.save && hud && !hud.hidden && p && (game.auto || game.pilot || p.meditating));
    if (!game.manToi) return;
    if (game.ghost?.ask && !game.ghost.choice) { off(); return; }
    paint();
  }, 1000);
}
