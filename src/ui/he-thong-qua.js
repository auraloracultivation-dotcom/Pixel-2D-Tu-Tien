// Mục Triệu hồi của Hệ Thống (data/he-thong.json → pool, cost, text): điểm đang có, nút Triệu hồi, bảng tỉ lệ, ô quà vừa ra có hiệu
// ứng mở. Máy chủ quay quà (net/he-thong.js htSummon → p2d_ht_trieu), quà vào Hòm thư; quà to (trang bị Tiên / Thượng Cổ, ngọc 7–8,
// 500k Linh Thạch) thì hệ thống khen một câu.
import { itemName, gemInfo } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { grade } from '../game/tiers.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const RARE = new Set(['lt-500k', 'ngoc-7-8', 'do-tien', 'do-thuong-co']);

// Tên quà từ nội dung thư máy chủ trả về
export function giftName(game, nd) {
  const sh = game.data.shop?.name || 'Linh Thạch';
  if (nd.coins) return `${nd.coins.toLocaleString('vi-VN')} ${sh}`;
  if (nd.gem) return `${gemInfo(game.data, nd.gem.key)?.name || nd.gem.key} ×${nd.gem.n}`;
  if (nd.mat) return `${matInfo(game.data, nd.mat.id)?.name || nd.mat.id} ×${nd.mat.n}`;
  if (nd.item) return `${itemName(game.data, nd.item)} (${grade(game.data, nd.item).name})`;
  return '?';
}

function poolLabel(game, p) {
  const T = game.data.items.line_tiers.list, sh = game.data.shop?.name || 'Linh Thạch', X = game.data['he-thong'].text;
  if (p.coins) return `${p.coins.toLocaleString('vi-VN')} ${sh}`;
  if (p.gem) return fill(X.pool_gem, { a: p.gem[0], b: p.gem[1] });
  if (p.mat) return `${matInfo(game.data, p.mat)?.name || p.mat} ×${p.n}`;
  return fill(X.pool_gear, { t: p.gear.map(t => T[t]?.name).join('/') });
}

export function renderGacha(game, body, ht, onDone) {
  const H = game.data['he-thong'], X = H.text;
  body.append(el('div', 'ht-sub', X.summon_title), el('p', 'ht-line', fill(X.summon_desc, { c: H.cost })), el('div', 'ht-pts', fill(X.points, { p: ht.diem })));
  const stage = el('div', 'ht-stage'), btn = el('button', 'ht-btn big', fill(X.summon, { c: H.cost }));
  btn.type = 'button'; btn.disabled = !game.cloud || ht.diem < H.cost;
  if (game.cloud && ht.diem < H.cost) body.append(el('p', 'ht-line ht-muted', fill(X.summon_need, { c: H.cost, p: ht.diem })));
  if (!game.cloud) body.append(el('p', 'ht-line ht-muted', X.login));
  btn.onclick = async () => {
    btn.disabled = true; stage.textContent = ''; stage.className = 'ht-stage spin';
    try {
      const N = await import('../net/he-thong.js'), r = await N.htSummon();
      await new Promise(res => setTimeout(res, 1400));   // vòng sáng quay rồi mới lộ quà
      const name = giftName(game, r.noi_dung), rare = RARE.has(r.qua);
      stage.className = `ht-stage open${rare ? ' rare' : ''}`;
      stage.append(el('b', null, name));
      if (rare) stage.append(el('small', null, X.rare));
      game.toast(fill(X.summon_got, { name }), 3); game.sfx?.(rare ? 'levelup' : 'pickup');
      import('../game/market.js').then(M => M.claimMail(game)).catch(() => {});   // quà vào túi liền, khỏi đợi lượt dò thư
      setTimeout(() => onDone(r), 2600);
    } catch (e) { stage.className = 'ht-stage'; game.toast(String(e?.message || '').includes('thieu_diem') ? fill(X.summon_need, { c: H.cost, p: ht.diem }) : X.summon_err, 2.2); btn.disabled = false; }
  };
  body.append(btn, stage, el('div', 'ht-sub', X.odds));
  const tot = H.pool.reduce((a, p) => a + p.w, 0), tb = el('div', 'ht-odds');
  for (const p of H.pool) { const r = el('div', `ht-odd${RARE.has(p.id) ? ' rare' : ''}`); r.append(el('span', null, poolLabel(game, p)), el('small', null, `${+(p.w / tot * 100).toFixed(1)}%`)); tb.append(r); }
  body.append(tb);
}
