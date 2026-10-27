// Bảng Đạo hữu: tab Trò chuyện (nút chào hỏi, log trò chuyện cùng đảo, ô gõ chữ (game/social.js gửi và lọc). Chưa đăng nhập thì chỉ hiện lời nhắc),
// tab Thế giới (chat chung cả máy chủ, game/world-chat.js) và tab Xếp hạng (ui/rank-view.js).
import { sendEmote, sendChat } from '../game/social.js';
import { createRankView } from './rank-view.js';
import { worldState, pullWorld, sendWorld } from '../game/world-chat.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createSocialPanel(game) {
  const S = game.data.social, c = S.chat, w = S.world;
  let note = '', tab = 'chat', pullT = 0;
  const rank = createRankView(game);

  function showTab(id) {
    tab = id;
    for (const b of document.querySelectorAll('#social-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === id);
    $('social-emotes').hidden = id !== 'chat';
    for (const k of ['social-log', 'social-form']) $(k).hidden = id === 'rank';
    $('social-rank').hidden = id !== 'rank';
    $('social-input').maxLength = id === 'world' ? w.max_len : c.max_len;
    $('social-input').placeholder = id === 'world' ? w.placeholder : c.placeholder;
    if (id === 'rank') rank.render(); else render();
    if (id === 'world') { pullT = Date.now(); pullWorld(game).then(() => tab === 'world' && render()); }
  }

  function renderWorld() {
    const on = !!game.online, s = worldState(game), names = game.data.realms.names;
    $('social-sub').textContent = note || (on ? s.err || w.sub : w.offline);
    const log = $('social-log'), atEnd = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.innerHTML = '';
    if (!s.list.length) log.append(el('div', 'empty', on ? w.empty : w.offline));
    for (const m of s.list) {
      const d = el('div', m.la_toi ? 'me' : null);
      if (m.canh_gioi != null) d.append(el('small', null, `[${names[m.canh_gioi]}] `));
      d.append(el('b', null, m.ten), m.chu); log.append(d);
    }
    if (atEnd) log.scrollTop = log.scrollHeight;
    $('social-input').disabled = $('social-send').disabled = !on;
  }

  function render() {
    if (tab === 'world') { renderWorld(); return; }
    const on = !!game.online;
    $('social-sub').textContent = note || (on ? c.here.replace('{n}', game.others.visible().length) : c.offline);
    const em = $('social-emotes'); em.innerHTML = '';
    for (const e of S.emotes) {
      const b = el('button', 'mini', e.label); b.disabled = !on;
      b.onclick = () => { sendEmote(game, e.id); close(); };
      em.append(b);
    }
    if (on && game.cloud) {   // tên hiển thị (người khác thấy tên này, không thấy tên đăng nhập)
      const N = S.name, b = el('button', 'mini', N.btn.replace('{name}', game.online.me.name));
      b.onclick = () => rename(N);
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

  async function rename(N) {
    const t = prompt(N.ask, game.online.me.name);
    if (t == null || !t.trim()) return;
    try {
      const { setDisplayName } = await import('../net/profile.js');
      const name = await setDisplayName(t);
      game.cloud.name = name; game.online.rename(name);
      note = N.ok.replace('{name}', name);
    } catch (e) { const m = String(e?.message || ''); note = N.err[Object.keys(N.err).find(k => m.includes(k))] || N.err.other; }
    render();
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    note = ''; game.uiOpen = true; $('social').hidden = false; showTab(tab);
  }
  function close() { game.uiOpen = false; $('social').hidden = true; $('social-input').blur(); }

  $('social-input').maxLength = c.max_len;
  $('social-input').placeholder = c.placeholder;
  $('social-send').textContent = c.send;
  $('social-close').onclick = close;
  $('social-form').onsubmit = async ev => {
    ev.preventDefault();
    const inp = $('social-input');
    if (tab === 'world') {
      const text = inp.value; inp.value = '';
      note = await sendWorld(game, text);
      if (note) inp.value = text;
      render(); return;
    }
    note = sendChat(game, inp.value);
    if (!note) inp.value = '';
    render();
  };
  for (const b of document.querySelectorAll('#social-tabs [data-tab]')) {
    b.textContent = { chat: S.rank.chat_tab, world: w.tab, rank: S.rank.tab }[b.dataset.tab];
    b.onclick = () => showTab(b.dataset.tab);
  }
  $('btn-social').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  setInterval(() => {   // có tin mới: chấm đỏ ở nút; đang mở bảng thì vẽ lại
    $('social-badge').hidden = !game.chatNew || !$('social').hidden;
    if (!$('social').hidden && game.chatNew && tab === 'chat') render();
    if (!$('social').hidden && tab === 'world' && Date.now() - pullT > w.poll * 1000) { pullT = Date.now(); pullWorld(game).then(n => n && tab === 'world' && render()); }
  }, 500);
  return { open, close };
}
