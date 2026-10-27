// Bảng Bang (data/guild.json): chưa có bang thì lập hoặc xin vào; có bang thì tab Thành viên, Việc tuần, Chat bang.
// Mọi việc đi qua game/guild.js; chat bang dùng chung game/world-chat.js với kênh "bang:<mã>".
import { canGuild, guildErr, loadGuild, create, act, claim } from '../game/guild.js';
import { chatState, pullChat, sendTo } from '../game/world-chat.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createGuildPanel(game) {
  const G = game.data.guild, names = game.data.realms.names;
  let tab = 'members', note = '', busy = false, found = [], pullT = 0;
  const kenh = () => `bang:${game.guild.id}`;
  const cap = r => ({ chu: 3, pho: 2, truong_lao: 1, de_tu: 0 })[r];

  async function run(fn) {
    if (busy) return;
    busy = true; note = G.loading; render();
    try { const r = await fn(); note = Array.isArray(r) ? r.join(', ') : ''; }
    catch (e) { note = guildErr(game, e); }
    busy = false;
    if (!game.guild) { try { const { findGuilds } = await import('../net/guild.js'); found = await findGuilds(''); } catch { found = []; } }
    render();
  }

  function btn(text, fn, disabled) {
    const b = el('button', 'mini', text); b.disabled = busy || !!disabled;
    b.onclick = ev => { ev.stopPropagation(); fn(); };
    return b;
  }

  function renderNone(box) {
    const s = game.save, ok = s.realm >= G.realm;
    box.append(el('div', 'empty', G.none));
    const f = el('form', 'gd-form'), inp = el('input'); inp.id = 'guild-name'; inp.maxLength = 16; inp.placeholder = G.name_ph;
    const b = el('button', 'mini', G.create.replace('{cost}', G.cost)); b.disabled = busy || !ok;
    f.append(inp, b);
    f.onsubmit = ev => { ev.preventDefault(); const name = inp.value.trim(); if (name) run(() => create(game, name)); };
    box.append(f);
    if (!ok) box.append(el('small', null, G.need.replace('{realm}', names[G.realm]).replace('{cost}', G.cost)));
    if (!found.length) box.append(el('div', 'empty', G.no_list));
    for (const g of found) {
      const r = el('div', 'mk-row'), info = el('div');
      info.append(el('b', null, g.ten), el('small', null, `${G.count.replace('{n}', g.si_so).replace('{max}', G.max)} · ${G.ranks.chu} ${g.chu || ''}${g.thong_bao ? ' · ' + g.thong_bao : ''}`));
      r.append(info, btn(G.join, () => run(() => act(game, n => n.joinGuild(g.id))), g.si_so >= G.max));
      box.append(r);
    }
  }

  function renderMembers(box) {
    const me = game.guild, my = cap(me.chuc);
    if (my >= 2) {
      const f = el('form', 'gd-form'), inp = el('input'); inp.maxLength = 120; inp.placeholder = G.notice_ph; inp.value = me.thong_bao || '';
      f.append(inp, el('button', 'mini', G.notice_btn));
      f.onsubmit = ev => { ev.preventDefault(); run(() => act(game, n => n.setNotice(inp.value))); };
      box.append(f);
    }
    for (const m of me.thanh_vien) {
      const r = el('div', 'mk-row' + (m.la_toi ? ' sel' : '')), info = el('div');
      info.append(el('b', null, `${m.ten}`), el('small', null, `${G.ranks[m.chuc]} · ${m.canh_gioi != null ? names[m.canh_gioi] : ''} · góp ${m.gop}`));
      r.append(info);
      if (!m.la_toi && my > cap(m.chuc)) {
        r.append(btn(G.rank_btn, async () => {
          const opts = Object.entries(G.ranks).filter(([k]) => k !== m.chuc && (cap(k) < my || (k === 'chu' && my === 3)));
          const ch = await game.dialog.choose(G.rank_ask.replace('{name}', m.ten), [...opts.map(([k, v]) => ({ id: k, label: v, desc: '' })), { id: 'back', label: 'Thôi', desc: '' }]);
          if (G.ranks[ch]) run(() => act(game, n => n.setRank(m.id, ch)));
        }));
        if (my >= 2) r.append(btn(G.kick_btn, async () => {
          const ch = await game.dialog.choose(G.kick_ask.replace('{name}', m.ten), [{ id: 'yes', label: G.kick_btn, desc: '' }, { id: 'no', label: 'Thôi', desc: '' }]);
          if (ch === 'yes') run(() => act(game, n => n.kick(m.id)));
        }));
      }
      box.append(r);
    }
    box.append(btn(G.leave, async () => {
      const ch = await game.dialog.choose(G.leave_ask, [{ id: 'yes', label: G.leave, desc: '' }, { id: 'no', label: 'Thôi', desc: '' }]);
      if (ch === 'yes') run(() => act(game, n => n.leaveGuild()));
    }));
  }

  function renderTasks(box) {
    const g = game.guild;
    for (const t of G.tasks) {
      const all = g.viec[t.id] || 0, mine = g.cua_toi[t.id] || 0, done = all >= t.goal, got = g.da_nhan.includes(t.id);
      const pend = Math.floor(game.guildPend?.[t.id] || 0);
      const r = el('div', 'mk-row'), info = el('div');
      info.append(el('b', null, `${t.label} ${Math.min(all, t.goal)}/${t.goal}`),
        el('small', null, `${G.mine.replace('{n}', mine).replace('{cap}', t.cap)}${pend ? ' · ' + G.pending.replace('{n}', pend) : ''}`));
      r.append(info, got ? el('small', null, G.claimed) : btn(G.claim, () => run(() => claim(game, t.id)), !done || !mine));
      box.append(r);
    }
  }

  function renderChat(box) {
    const s = chatState(game, kenh());
    if (!s.list.length) box.append(el('div', 'empty', G.chat_empty));
    for (const m of s.list) {
      const d = el('div', 'gd-chat' + (m.la_toi ? ' me' : ''));
      d.append(el('b', null, m.ten), m.chu); box.append(d);
    }
    box.scrollTop = box.scrollHeight;
  }

  function render() {
    if ($('guild').hidden) return;
    const box = $('guild-list'); box.innerHTML = '';
    const g = game.guild;
    $('guild-title').textContent = g ? g.ten : G.title;
    $('guild-sub').textContent = note || (g ? `${G.ranks[g.chuc]} · ${G.count.replace('{n}', g.thanh_vien.length).replace('{max}', G.max)}${g.thong_bao ? ' · ' + g.thong_bao : ''}` : '');
    $('guild-tabs').hidden = !g;
    $('guild-form').hidden = !g || tab !== 'chat';
    for (const b of document.querySelectorAll('#guild-tabs [data-tab]')) b.classList.toggle('on', b.dataset.tab === tab);
    if (!canGuild(game)) { box.append(el('div', 'empty', G.offline)); return; }
    if (!g) { renderNone(box); return; }
    ({ members: renderMembers, tasks: renderTasks, chat: renderChat })[tab](box);
  }

  function open() {
    if (!game.save || game.dialog.open) return;
    game.uiOpen = true; $('guild').hidden = false; note = '';
    render();
    if (canGuild(game)) run(() => loadGuild(game));
  }
  function close() { game.uiOpen = false; $('guild').hidden = true; }

  $('guild-close').onclick = close;
  $('guild-input').placeholder = game.data.social.world.placeholder.replace('cả máy chủ', 'cả bang');
  $('guild-send').textContent = game.data.social.chat.send;
  for (const b of document.querySelectorAll('#guild-tabs [data-tab]')) {
    b.textContent = G.tabs[b.dataset.tab];
    b.onclick = () => { tab = b.dataset.tab; note = ''; render(); if (tab === 'chat') { pullT = Date.now(); pullChat(game, kenh()).then(render); } };
  }
  $('guild-form').onsubmit = async ev => {
    ev.preventDefault();
    const inp = $('guild-input'), text = inp.value; inp.value = '';
    note = await sendTo(game, kenh(), text);
    if (note) inp.value = text;
    render();
  };
  $('btn-guild').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  setInterval(() => {
    if ($('guild').hidden || tab !== 'chat' || !game.guild || Date.now() - pullT < game.data.social.world.poll * 1000) return;
    pullT = Date.now(); pullChat(game, kenh()).then(n => n && render());
  }, 1000);
  return { open, close };
}
