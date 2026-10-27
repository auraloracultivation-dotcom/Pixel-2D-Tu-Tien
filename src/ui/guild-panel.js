// Bảng Tông môn (data/guild.json, nút Tông môn ở Menu): 4 tab — Tông môn (của mình, việc tuần), Đồng môn (duyệt, chức vụ),
// Trò chuyện (kênh tông môn), Tìm tông môn (tìm, xin vào, lập mới). Chưa đăng nhập thì chỉ hiện lời nhắc.
// Hai tab đầu vẽ ở ui/guild-view.js; mọi việc gọi máy chủ qua game/guild.js.
import { canGuild, guildState, loadMine, loadList, guildErr, guildAct, createGuild, guildChat, pullGuildChat, sendGuildChat } from '../game/guild.js';
import { coins } from '../game/shop.js';
import { renderHome, renderMembers } from './guild-view.js';
import { chatLines } from './chat-line.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createGuildPanel(game) {
  const G = game.data.guild, T = G.text;
  let tab = 'home', msg = '', busy = false, armed = '', pullT = 0;
  const form = { query: '', name: '', motto: undefined, desc: '' };   // chữ đang gõ, giữ lại khi vẽ lại

  const mini = (text, fn, off) => { const b = el('button', 'mini', text); b.disabled = !!off || busy; b.onclick = fn; return b; };
  function card(color, title, lines, ...btns) {
    const c = el('div', 'skill-card');
    c.style.borderLeftColor = color;
    c.append(el('b', null, title), ...lines.filter(Boolean).map(l => el('small', null, l)));
    if (btns.length) { const row = el('div', 'card-acts wrap'); row.append(...btns); c.append(row); }
    return c;
  }
  // Việc khó hoàn tác (rời, mời ra, nhường chức): bấm lần đầu hiện câu hỏi trên nút, bấm lần nữa mới làm
  const twice = (key, text, ask, fn) => mini(armed === key ? ask : text, () => { if (armed !== key) { armed = key; render(); return; } armed = ''; fn(); });

  async function run(fn, ok) {
    if (busy) return;
    busy = true; msg = T.loading; render();
    try { const r = await fn(); msg = typeof ok === 'function' ? ok(r) : ok || ''; }
    catch (e) { msg = guildErr(game, e); }
    busy = false;
    try { await loadMine(game); if (tab === 'find') await loadList(game, form.query); } catch { /* giữ bản cũ */ }
    render();
  }

  function markTab(id) {
    tab = id; armed = '';
    for (const b of document.querySelectorAll('#guild-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === id);
  }
  function showTab(id) { markTab(id); msg = ''; refresh(); }

  async function refresh() {
    render();
    if (!canGuild(game)) return;
    try {
      await loadMine(game);
      if (tab === 'find') await loadList(game, form.query);
      if (tab === 'chat') { pullT = Date.now(); await pullGuildChat(game); }
    } catch (e) { msg = guildErr(game, e); }
    render();
  }

  function render() {
    const list = $('guild-list'), m = guildState(game).mine;
    list.innerHTML = ''; list.classList.remove('chat');
    $('guild-msg').textContent = msg;
    $('guild-form').hidden = true;
    $('guild-sub').textContent = m ? `${m.bang.ten} · ${G.roles[m.chuc]}` : '';
    if (!canGuild(game)) { list.append(el('div', 'empty', T.offline)); return; }
    if (m === undefined) { list.append(el('div', 'empty', T.loading)); return; }
    const ctx = { game, list, el, mini, card, twice, run, T, G, form, goFind: () => showTab('find') };
    if (tab === 'home') renderHome(ctx);
    else if (tab === 'members') renderMembers(ctx);
    else if (tab === 'chat') renderChat(list, m);
    else renderFind(list, m);
  }

  function renderChat(list, m) {
    if (!m) { list.append(el('div', 'empty', T.none)); return; }
    list.classList.add('chat');
    const s = guildChat(game);
    if (!s.list.length) list.append(el('div', 'empty', s.err || T.chat_empty));
    chatLines(game, list, s.list, t => { msg = t; $('guild-msg').textContent = t; }, render);   // chạm tin người khác: chặn, báo cáo
    list.scrollTop = list.scrollHeight;
    $('guild-form').hidden = false;
  }

  function renderFind(list, m) {
    const top = el('div', 'guild-find');
    const q = el('input', 'guild-input'); q.placeholder = T.search; q.maxLength = 16; q.value = form.query; q.oninput = () => { form.query = q.value; };
    q.onkeydown = e => { if (e.key === 'Enter') run(() => loadList(game, form.query), ''); };
    top.append(q, mini('🔍', () => run(() => loadList(game, form.query), '')));
    list.append(top);
    if (!m) {   // lập tông môn mới
      const need = game.save.realm >= G.need_realm, cash = coins(game.save) >= G.cost;
      const box = card('#6a4ab8', T.create, [T.create_need.replace('{realm}', game.data.realms.names[G.need_realm]).replace('{cost}', G.cost.toLocaleString('vi-VN'))]);
      const n = el('input', 'guild-input'); n.placeholder = T.create_name; n.maxLength = 16; n.value = form.name; n.oninput = () => { form.name = n.value; };
      const d = el('input', 'guild-input'); d.placeholder = T.create_motto; d.maxLength = 60; d.value = form.desc; d.oninput = () => { form.desc = d.value; };
      const row = el('div', 'card-acts wrap');
      row.append(mini(T.create, () => run(() => createGuild(game, form.name, form.desc), r => { form.name = form.desc = ''; markTab('home'); return T.created.replace('{name}', r.ten); }), !need || !cash));
      box.append(n, d, row); list.append(box);
    }
    const all = guildState(game).list;
    if (!all.length) list.append(el('div', 'empty', T.find_empty));
    for (const b of all) {
      const full = b.so_tv >= b.max, mine = m?.bang.id === b.id;
      list.append(card(mine ? '#f2c94c' : b.mo ? '#8fbf6a' : '#5fa0d0', b.ten, [
        b.mo_ta, `${T.members.replace('{n}', b.so_tv).replace('{max}', b.max)} · ${b.mo ? T.open : T.closed} · ${G.roles.chu}: ${b.chu || '—'}`,
        T.week.replace('{pts}', b.diem_tuan.toLocaleString('vi-VN')),
      ], ...(m ? [] : [mini(b.da_xin ? T.pending : T.join, () => run(() => guildAct(game, 'join', b.id),
        r => (r.vao ? T.joined : T.asked).replace('{name}', r.ten)), b.da_xin || full)])));
    }
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip) return;
    msg = ''; armed = ''; game.uiOpen = true; $('guild').hidden = false; showTab(tab);
  }
  function close() { game.uiOpen = false; $('guild').hidden = true; $('guild-input').blur(); }

  $('guild-title').textContent = G.name;
  $('btn-guild').textContent = G.name;
  $('guild-input').maxLength = game.data.social.world.max_len;
  $('guild-input').placeholder = T.chat_placeholder;
  $('guild-send').textContent = T.send;
  $('guild-close').onclick = close;
  for (const b of document.querySelectorAll('#guild-tabs [data-tab]')) { b.textContent = G.tabs[b.dataset.tab]; b.onclick = () => showTab(b.dataset.tab); }
  $('guild-form').onsubmit = async ev => {
    ev.preventDefault();
    const inp = $('guild-input'), text = inp.value; inp.value = '';
    msg = await sendGuildChat(game, text);
    if (msg) inp.value = text;
    render();
  };
  $('btn-guild').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  setInterval(() => {   // đang mở tab trò chuyện: đọc tin mới mỗi vài giây
    if ($('guild').hidden || tab !== 'chat' || busy || Date.now() - pullT < game.data.social.world.poll * 1000) return;
    pullT = Date.now(); pullGuildChat(game).then(n => n && tab === 'chat' && render());
  }, 500);
  return { open, close };
}
