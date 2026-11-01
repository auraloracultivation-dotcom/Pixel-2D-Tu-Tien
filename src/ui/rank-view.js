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
  const dunIds = Object.keys(game.data.dungeon?.drops || {}).filter(k => !k.startsWith('_') && game.data.maps[k]);
  let bc = dunIds[0];   // bảng Bí cảnh: bí cảnh đang xem (hàng nút thứ hai)
  const kindNow = () => (kind === 'bc' ? 'bc:' + bc : kind);

  function value(r) {
    if (kind === 'canh_gioi') return realmLabel({ realm: r.canh_gioi, layer: r.tang }, game.data.realms);
    return (R.value[kind] || '{v}').replace('{v}', r.gia_tri.toLocaleString('vi-VN'));
  }

  // Người bị gắn cờ nghi vấn (máy chủ trả co): tên đỏ, cờ cạnh tên. Chạm dòng: mở hồ sơ người đó (ui/profile-panel.js)
  function row(r) {
    const d = el('div', [r.la_toi ? 'me' : '', r.co ? 'co' : '', r.k && game.openProfile ? 'tap' : ''].join(' ').trim() || null);
    if (r.k && game.openProfile) d.onclick = () => game.openProfile(r.k, r.ten);
    const name = el('span', null, r.ten);
    if (r.co) { const f = el('i', 'flag', R.flag); f.title = R.flag_title; name.prepend(f); d.title = R.flag_title; }
    d.append(el('b', null, r.hang), name, el('small', null, value(r)));
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
    if (kind === 'bc') {   // hàng chọn 1 trong 7 bí cảnh
      const sub = el('div', 'rank-sub');
      for (const id of dunIds) {
        const b = el('button', id === bc ? 'on' : null, game.data.maps[id].name);
        b.onclick = () => { bc = id; render(); };
        sub.append(b);
      }
      tabs.append(sub);
    }
    $('rank-note').textContent = R.note;
    if (!game.online) return msg(R.offline);
    msg(R.loading);
    const my = ++ticket;
    let data;
    try { data = await loadRank(game, kindNow(), force); } catch { if (my === ticket) msg(R.error, true); return; }
    if (my !== ticket) return;
    const L = $('rank-list'); L.innerHTML = '';
    if (!data?.top?.length) return msg(R.empty);
    for (const r of data.top) L.append(row(r));
    $('rank-note').textContent = `${data.toi ? R.me.replace('{n}', data.toi.hang) : R.me_none} ${data.toi?.co ? R.me_flag : R.note}`;
  }

  return { render };
}
