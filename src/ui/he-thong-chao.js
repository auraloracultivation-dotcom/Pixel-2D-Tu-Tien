// Hệ Thống ra đón quý khách ngay ở màn đăng nhập (data/he-thong.json → chao; chủ dự án 07/11/2026 02:10): biểu cảm Hệ Thống và
// bong bóng lời nằm dưới tên game. Chào hỏi trước (chao.hello, gõ dần từng chữ), rồi chỉ từng bước theo màn đang hiện: đang nối máy
// chủ, chưa đăng nhập (đang gõ tài khoản / mật khẩu), báo lỗi (đọc #login-msg), đã đăng nhập (Chơi tiếp / Bắt đầu), mất mạng.
// Chạm Hệ Thống: nói câu mẹo kế tiếp (chao.tips). Vào game thì #menu ẩn, khối này ẩn theo.
import { createFace } from './he-thong-mat.js';

const $ = id => document.getElementById(id);
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const pick = v => Array.isArray(v) ? v[Math.floor(Math.random() * v.length)] : v;

export function createGreeter(game) {
  const C = game.data['he-thong'], G = C?.chao, menu = $('menu');
  if (!G || !C.mat || !menu) return;
  const face = createFace(game, G.k || 1), box = el('div', 'ht-chao'), say = el('div', 'ht-chao-say'), who = el('b', null, C.short || C.name), p = el('p');
  say.append(who, p); box.append(face.node, say);
  const sub = menu.querySelector('.sub'); (sub || menu.firstElementChild).after(box);

  let queue = [...G.hello], typing = null, key = '', tip = 0, focus = '', until = 0;
  function speak(text, ev) {
    if (!text) return;
    clearInterval(typing);
    if (ev) face.react(ev);
    let i = 0; p.textContent = '';
    until = Date.now() + text.length * 14 + 1800;   // nói xong, để người đọc rồi mới sang câu sau
    typing = setInterval(() => { i += 2; p.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); typing = null; } }, 28);
  }
  // Màn đang ở bước nào → câu nói
  function state() {
    const m = $('login-msg'), bad = m?.classList.contains('bad') && m.textContent.trim();
    if (bad) return ['err:' + m.textContent, fill(pick(G.err), { e: m.textContent.trim() }), 'loi'];
    if (!$('logged')?.hidden) {
      const name = $('logged-name')?.textContent || '', cont = !$('menu-continue')?.hidden;
      return ['in:' + name + cont, fill(cont ? G.back : G.first, { n: name }), cont ? 'intro_old' : 'xong'];
    }
    if ($('btn-login')?.disabled && !$('login-form')?.hidden) return ['wait', G.wait, null];   // đang nối máy chủ / đang gửi
    if ($('login-form')?.hidden) return ['off', G.off, 'loi'];
    if (focus) return ['f:' + focus, G[focus], null];
    return ['form', G.form, 'nudge_step'];
  }
  function tick() {
    if (menu.hidden) return;
    const [k, text, ev] = state(), urgent = k.startsWith('err:') || k.startsWith('f:');   // báo lỗi, đang gõ: nói ngay, bỏ phần chào
    if (urgent && k !== key) { queue = []; key = k; speak(text, ev); return; }
    if (Date.now() < until) return;
    if (queue.length) { speak(queue.shift(), queue.length ? 'intro' : 'xong'); return; }
    if (k !== key) { key = k; speak(text, ev); }
  }
  for (const [id, f] of [['acc', 'acc'], ['pwd', 'pwd']]) {
    const e = $(id); if (!e) continue;
    e.addEventListener('focus', () => { focus = f; });   // rời ô thì giữ câu cũ, khỏi nhắc lại từ đầu
  }
  box.addEventListener('click', () => { queue = []; key = state()[0]; speak(G.tips[tip++ % G.tips.length], 'ambient'); });
  setInterval(tick, 300);
}
