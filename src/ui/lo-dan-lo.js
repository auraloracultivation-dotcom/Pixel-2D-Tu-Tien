// Túi đồ → Luyện đan → mục Lò đan (chủ dự án 20/11/2026 14:5x: "giống mục trang bị và kho"): trên là lò đang chọn (hình to viền màu phẩm,
// tên, đang dùng hay không), dưới là lưới mọi lò đang có (ô khung màu phẩm, dấu ✓ ở lò đang đặt). Thanh dưới: Dùng lò này, Nâng phẩm.
// Lò mua ở NPC bán lò (data/cave.json → lo.npc), đều phẩm Phàm, chỉ nâng phẩm. Luật ở src/game/lo-dan.js. st.ldSel: mã lò đang chọn xem.
import { el } from './bag-detail.js';
import { loOf, loSpr, loTen, datLo, nangLo, upCost } from '../game/lo-dan.js';
import { coins } from '../game/shop.js';

const vn = n => Math.floor(n || 0).toLocaleString('vi-VN');
const rar = (D, ph) => D.items.rarities[ph | 0] || D.items.rarities[0];
function img(game, lo, cls) {   // hình lò (ảnh GPT 4 kiểu), viền màu phẩm qua --q
  const D = game.data, d = el('i', cls), spr = D.art.sprites[loSpr(game, lo)];
  if (spr) d.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`;
  d.style.setProperty('--q', rar(D, lo.ph).color);
  return d;
}

// Hỏi rồi nâng lò lên phẩm kế (dùng chung với nút Nâng phẩm ở mục Nguyên liệu)
export async function askNang(game, lo, refresh) {
  const D = game.data, s = game.save, T = D.cave.lo.text, g = upCost(game, lo);
  if (!g) { game.toast(T.maxed, 1.8); return; }
  const name = loTen(game, lo), next = rar(D, lo.ph + 1).name;
  const ok = await game.dialog.choose(T.upto.replace('{name}', name).replace('{ph}', next).replace('{lt}', vn(g.lt)).replace('{tt}', vn(g.tt)), [
    { id: 'ok', label: T.up, desc: `${vn(g.lt)} Linh Thạch · ${vn(g.tt)} Tinh Thiết (đang có ${vn(coins(s))} · ${vn(s.mats?.['tinh-thiet'])})`, color: '#f2c94c' },
    { id: 'thoi', label: 'Thôi', desc: '' }]);
  if (ok !== 'ok') return;
  const r = await nangLo(game, lo.id);
  if (r.lo) { game.sfx?.('levelup'); game.toast(T.upok.replace('{name}', name).replace('{ph}', next), 2); }
  else game.toast(r.err === 'poor' ? T.poor : r.err === 'max' ? T.maxed : T.net, 2);
  refresh();
}

export function renderLoList(game, st, mid, bar, refresh) {
  const D = game.data, C = D.cave.lo, T = C.text, o = loOf(game.save);
  const wrap = el('div', 'ldl');
  if (!o.ds.length) {   // chưa có lò: chỉ chỗ mua
    const box = el('div', 'ldl-trong');
    box.append(el('p', null, T.chua_co.replace('{npc}', D.npcs[C.npc]?.name || '')));
    wrap.append(box); mid.replaceChildren(wrap); bar.replaceChildren(); return;
  }
  const sel = o.ds.find(x => x.id === st.ldSel) || o.ds.find(x => x.id === o.dung) || o.ds[0];
  st.ldSel = sel.id;
  const R = rar(D, sel.ph), card = el('div', 'ldl-xem');   // lò đang chọn
  card.append(img(game, sel, 'ldl-to'));
  const info = el('div', 'ldl-ten'), name = el('b', null, T.ten_lo.replace('{name}', loTen(game, sel)));
  name.style.color = R.color;
  info.append(name, el('small', null, R.name));
  if (sel.id === o.dung) info.append(el('span', 'ldl-dung', T.dang_dung));
  card.append(info);
  const grid = el('div', 'ldl-luoi');   // mọi lò đang có
  for (const lo of o.ds) {
    const b = el('button', 'ldl-o' + (lo.id === sel.id ? ' on' : '')); b.title = loTen(game, lo);
    b.style.setProperty('--q', rar(D, lo.ph).color);
    b.append(img(game, lo, 'ldl-hinh'));
    if (lo.id === o.dung) b.append(el('small', 'ldl-v', '✓'));
    b.onclick = () => { st.ldSel = lo.id; refresh(); };
    grid.append(b);
  }
  wrap.append(card, grid);
  mid.replaceChildren(wrap);
  const dung = el('button', 'sv-bbtn gold', sel.id === o.dung ? T.dang_dung : T.dung);
  dung.disabled = sel.id === o.dung;
  dung.onclick = async () => {
    dung.disabled = true;
    const r = await datLo(game, sel.id);
    game.toast(r.err ? T.net : T.doi_ok.replace('{name}', loTen(game, sel)), 1.6);
    refresh();
  };
  const up = el('button', 'sv-bbtn ld-up', T.up);
  up.disabled = sel.ph >= C.nang.length;
  up.onclick = () => askNang(game, sel, refresh);
  bar.replaceChildren(up, dung);
}
