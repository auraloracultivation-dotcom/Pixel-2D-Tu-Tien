// Bảng Đạo hữu: nút chào hỏi, log trò chuyện cùng đảo, ô gõ chữ (game/social.js gửi và lọc). Chưa đăng nhập thì chỉ hiện lời nhắc.
import { sendEmote, sendChat } from '../game/social.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createSocialPanel(game) {
  const S = game.data.social, c = S.chat;
  let note = '';

  function render() {
    const on = !!game.online;
    $('social-sub').textContent = note || (on ? c.here.replace('{n}', game.others.visible().length) : c.offline);
    const em = $('social-emotes'); em.innerHTML = '';
    for (const e of S.emotes) {
      const b = el('button', 'mini', e.label); b.disabled = !on;
      b.onclick = () => { sendEmote(game, e.id); close(); };
      em.append(b);
    }
    const log = $('social-log'); log.innerHTML = '';
    const L = game.chatLog || [];
    if (!L.length) log.append(el('div', 'empty', c.empty));
    for (const m of L) { const d = el('div'); d.append(el('b', null, m.name), m.text); log.append(d); }
    log.scrollTop = log.scrollHeight;
    $('social-input').disabled = $('social-send').disabled = !on;
    game.chatNew = false;
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    note = ''; game.uiOpen = true; $('social').hidden = false; render();
  }
  function close() { game.uiOpen = false; $('social').hidden = true; $('social-input').blur(); }

  $('social-input').maxLength = c.max_len;
  $('social-input').placeholder = c.placeholder;
  $('social-send').textContent = c.send;
  $('social-close').onclick = close;
  $('social-form').onsubmit = ev => {
    ev.preventDefault();
    const inp = $('social-input');
    note = sendChat(game, inp.value);
    if (!note) inp.value = '';
    render();
  };
  for (const b of document.querySelectorAll('#social-tabs [data-tab]')) b.classList.add('on');
  $('btn-social').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  setInterval(() => {   // có tin mới: chấm đỏ ở nút; đang mở bảng thì vẽ lại
    $('social-badge').hidden = !game.chatNew || !$('social').hidden;
    if (!$('social').hidden && game.chatNew) render();
  }, 500);
  return { open, close };
}
