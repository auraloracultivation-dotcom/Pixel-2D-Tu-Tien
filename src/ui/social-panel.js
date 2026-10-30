// Bảng Đạo hữu: tab Trò chuyện (nút chào hỏi, log trò chuyện cùng đảo, ô gõ chữ (game/social.js gửi và lọc). Chưa đăng nhập thì chỉ hiện lời nhắc),
// tab Thế giới (chat chung cả máy chủ, game/world-chat.js) và tab Xếp hạng (ui/rank-view.js).
import { sendEmote, sendChat } from '../game/social.js';
import { createRankView } from './rank-view.js';
import { worldState, pullWorld, sendWorld, unblockAll } from '../game/world-chat.js';
import { chatLines } from './chat-line.js';
import { renderWhisper } from './whisper-view.js';
import { whisperState, pullWhisper, sendWhisper, unreadCount } from '../game/whisper.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createSocialPanel(game) {
  const S = game.data.social, c = S.chat, w = S.world;
  let note = '', tab = 'chat', pullT = 0, wPullT = 0;
  const rank = createRankView(game);

  function showTab(id) {
    tab = id;
    for (const b of document.querySelectorAll('#social-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === id);
    $('social-emotes').hidden = id !== 'chat';
    for (const k of ['social-log', 'social-form']) $(k).hidden = id === 'rank';
    $('social-rank').hidden = id !== 'rank';
    $('social-input').maxLength = id === 'world' ? w.max_len : c.max_len;
    $('social-input').placeholder = id === 'world' ? w.placeholder : c.placeholder;
    if (id === 'whisper') { wPullT = Date.now(); pullWhisper(game).then(() => tab === 'whisper' && render()); }
    if (id === 'rank') rank.render(); else render();
    if (id === 'world') { pullT = Date.now(); pullWorld(game).then(() => tab === 'world' && render()); }
  }

  function renderWorld() {
    const on = !!game.online, s = worldState(game);
    $('social-sub').textContent = note || (on ? s.err || w.sub : w.offline);
    const log = $('social-log'), atEnd = log.scrollTop + log.clientHeight >= log.scrollHeight - 8;
    log.innerHTML = '';
    if (!s.list.length) log.append(el('div', 'empty', on ? w.empty : w.offline));
    chatLines(game, log, s.list, t => { note = t; $('social-sub').textContent = t; }, renderWorld);   // chạm tin người khác: chặn, báo cáo
    if (atEnd) log.scrollTop = log.scrollHeight;
    $('social-input').disabled = $('social-send').disabled = !on;
  }

  function render() {
    if (tab === 'world') { renderWorld(); return; }
    if (tab === 'whisper') { renderWhisper(game, { log: $('social-log'), sub: $('social-sub'), input: $('social-input'), send: $('social-send'), note, redraw: render }); note = ''; return; }
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
      b.onclick = () => { close(); game.openRename?.(); };   // bảng đổi tên chung (src/ui/name-nudge.js)
      em.append(b);
    }
    const nb = (game.save.blocked || []).length;
    if (nb) { const b = el('button', 'mini', game.data.social.mod.unblock_all.replace('{n}', nb)); b.onclick = () => { unblockAll(game); render(); }; em.append(b); }
    const log = $('social-log'); log.innerHTML = '';
    const L = game.chatLog || [];
    if (!L.length) log.append(el('div', 'empty', c.empty));
    for (const m of L) { const d = el('div'); d.append(el('b', null, m.name), m.text); log.append(d); }
    log.scrollTop = log.scrollHeight;
    $('social-input').disabled = $('social-send').disabled = !on;
    game.chatNew = false;
  }


  function open(to) {   // to: mở thẳng một tab (nút Xếp hạng ở menu mở tab rank)
    if (!game.save || game.dialog.open || game.trip) return;
    note = ''; game.uiOpen = true; $('social').hidden = false; showTab(to || tab);
  }
  function close() { game.uiOpen = false; $('social').hidden = true; $('social-input').blur(); }

  $('social-input').maxLength = c.max_len;
  $('social-input').placeholder = c.placeholder;
  $('social-send').textContent = c.send;
  $('social-close').onclick = close;
  $('social-form').onsubmit = async ev => {
    ev.preventDefault();
    const inp = $('social-input');
    if (tab === 'whisper') {
      const text = inp.value; inp.value = '';
      note = await sendWhisper(game, whisperState(game).with, text);
      if (note) inp.value = text;
      render(); return;
    }
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
    b.textContent = { chat: S.rank.chat_tab, world: w.tab, whisper: S.whisper.tab, rank: S.rank.tab }[b.dataset.tab];
    b.onclick = () => showTab(b.dataset.tab);
  }
  $('btn-social').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  $('btn-rank').textContent = S.rank.tab;
  $('btn-rank').addEventListener('pointerdown', ev => { ev.stopPropagation(); open('rank'); });
  setInterval(() => {   // có tin mới: chấm đỏ ở nút; đang mở bảng thì vẽ lại
    $('social-badge').hidden = !(game.chatNew || unreadCount(game)) || !$('social').hidden;
    const wOpen = !$('social').hidden && tab === 'whisper';   // truyền âm: đọc tin mới định kỳ (mở tab thì nhanh hơn)
    if (game.online && Date.now() - wPullT > S.whisper[wOpen ? 'open_poll' : 'poll'] * 1000) { wPullT = Date.now(); pullWhisper(game).then(n => n && wOpen && tab === 'whisper' && render()); }
    if (!$('social').hidden && game.chatNew && tab === 'chat') render();
    if (!$('social').hidden && tab === 'world' && Date.now() - pullT > w.poll * 1000) { pullT = Date.now(); pullWorld(game).then(n => n && tab === 'world' && render()); }
  }, 500);
  // Nhắn riêng một người (chạm tin ở kênh Thế giới, tông môn → Truyền âm)
  game.closeSocial = () => { if (!$('social').hidden) close(); };   // So tài từ hồ sơ (ui/profile-panel.js)
  game.openSocial = to => { if ($('social').hidden) open(to); else showTab(to); };   // Hòm thư: chạm tin nhắc tên ở kênh Thế giới
  game.openWhisper = (k, ten) => { const s = whisperState(game); s.with = k; s.withName = ten; if ($('guild')) $('guild').hidden = true; if ($('social').hidden) { game.uiOpen = false; open('whisper'); } else showTab('whisper'); };
  return { open, close };
}
