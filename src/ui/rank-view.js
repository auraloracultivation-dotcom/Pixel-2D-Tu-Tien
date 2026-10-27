// Tab Xếp hạng trong bảng Đạo hữu: 3 bảng con (data/social.json rank), dữ liệu từ game/rank.js.
import { loadRank } from '../game/rank.js';
import { realmLabel } from '../game/stats.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createRankView(game) {
  const R = game.data.social.rank;
  let kind = R.tabs[0].id, ticket = 0;

  function value(r) {
    if (kind === 'canh_gioi') return realmLabel({ realm: r.canh_gioi, layer: r.tang }, game.data.realms);
    return R.value[kind].replace('{v}', r.gia_tri.toLocaleString('vi-VN'));
  }

  function row(r) {
    const d = el('div', r.la_toi ? 'me' : null);
    d.append(el('b', null, r.hang), el('span', null, r.ten), el('small', null, value(r)));
    return d;
  }

  function msg(text, retry) {
    const L = $('rank-list'); L.innerHTML = '';
    const d = el('div', 'empty', text);
    if (retry) { const b = el('button', null, R.retry); b.onclick = () => render(true); d.append(document.createElement('br'), b); }
    L.append(d);
  }

  async function render(force) {
    const tabs = $('rank-tabs'); tabs.innerHTML = '';
    for (const t of R.tabs) {
      const b = el('button', t.id === kind ? 'on' : null, t.label);
      b.onclick = () => { kind = t.id; render(); };
      tabs.append(b);
    }
    $('rank-note').textContent = R.note;
    if (!game.online) return msg(R.offline);
    msg(R.loading);
    const my = ++ticket;
    let data;
    try { data = await loadRank(game, kind, force); } catch { if (my === ticket) msg(R.error, true); return; }
    if (my !== ticket) return;
    const L = $('rank-list'); L.innerHTML = '';
    if (!data?.top?.length) return msg(R.empty);
    for (const r of data.top) L.append(row(r));
    $('rank-note').textContent = `${data.toi ? R.me.replace('{n}', data.toi.hang) : R.me_none} ${R.note}`;
  }

  return { render };
}
