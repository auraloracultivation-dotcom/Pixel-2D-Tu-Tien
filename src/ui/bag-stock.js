// Túi đồ → Ngọc và Nguyên liệu dạng lưới (chủ dự án 02/11/2026 13:38: "nhiều chữ quá, xếp thành lưới, ấn vào mới ra thông tin").
// Mỗi ô: hình, tên, số lượng. Chạm ô thì tấm chi tiết trượt lên từ đáy túi (#bag-sheet, như trang bị): mô tả, nơi kiếm;
// ngọc có thêm nút Ghép 3→1 và Ghép hết; đan dược (góp ý #53: dùng đan ngay trong túi, không phải về Lò đan) có nút Dùng.
// st.stock = { kind: 'gem' | 'mat' | 'pill', id } là ô đang chọn.
import { mergeGems, gemMergeFee, gemInfo, statText } from '../game/items.js';
import { el } from './bag-detail.js';
import { gemIcon } from './gem-icon.js';
import { usePill, qiPillLeft, qiPillRate } from '../game/cave.js';

const vn = n => Math.floor(n || 0).toLocaleString('vi-VN');

function cell(sel, ico, name, sub, color, onPick) {
  const b = el('button', 'item stock' + (sel ? ' sel' : ''));
  b.style.setProperty('--rar', color);
  b.append(ico, el('b', null, name), el('small', null, sub));
  b.onclick = onPick;
  return b;
}
// nguyên liệu có hình (ui-vk-<id>, ảnh GPT chủ dự án 04/11/2026 11:43) thì hiện hình, chưa có thì ô màu như cũ
let ART = {};
function matIco(m, id) {
  const spr = id && ART['ui.vk-' + id], i = el('i', 'ico' + (spr ? ' that' : ' mat-sq'));
  if (spr) i.style.setProperty('--ic', `url("${spr.file}?v=${spr.v}")`); else i.style.background = m.color || '#ccc';
  return i;
}

// Ngọc: theo loại, cấp cao lên trước. pickSocket: đang chọn ngọc để khảm thì chạm là khảm luôn (onSocket)
export function renderGemGrid(game, box, st, onPick, onSocket) {
  const { data } = game, gems = game.save.gems;
  const keys = Object.keys(gems).sort((a, b) => a.split(':')[0].localeCompare(b.split(':')[0]) || b.split(':')[1] - a.split(':')[1]);
  for (const k of keys) {
    const gi = gemInfo(data, k), color = data.items.gems.types[gi.type]?.color || '#ccc';
    box.append(cell(st.stock?.id === k, gemIcon(game, k, 24, 'ico gem-ico'), `${gi.name}`, `×${vn(gems[k])} · ${statText(data, gi.stat, gi.value)}`, color,
      () => (st.pickSocket ? onSocket(k) : onPick({ kind: 'gem', id: k }))));
  }
  return keys.length;
}

// Nguyên liệu: món đang có lên trước, chưa có thì mờ (vẫn chạm xem nơi kiếm được)
// fish: chỉ cá câu được (data/fishing.json → fish), không thì nguyên liệu trừ cá (chủ dự án 04/11/2026 11:50: cá thành mục riêng)
export function renderMatGrid(game, box, st, onPick, fish = false) {
  const M = game.data.cave.materials, have = game.save.mats || {}, F = game.data.fishing?.fish || {}; ART = game.data.art.sprites;
  const ids = Object.keys(M).filter(id => !!F[id] === fish).sort((a, b) => ((have[b] || 0) > 0) - ((have[a] || 0) > 0) || M[a].name.localeCompare(M[b].name, 'vi'));
  for (const id of ids) {
    const c = cell(st.stock?.id === id, matIco(M[id], id), M[id].name, `×${vn(have[id])}`, M[id].color || '#ccc', () => onPick({ kind: 'mat', id }));
    if (!(have[id] > 0)) c.classList.add('none');
    box.append(c);
  }
}

// Đan dược đang có (save.pills)
export function renderPillGrid(game, box, st, onPick) {
  const P = game.data.cave.pills, have = game.save.pills || {};
  const ids = Object.keys(have).filter(id => P[id] && have[id] > 0);
  if (!ids.length) { box.append(el('p', 'muted', 'Chưa có đan dược. Luyện ở Lò đan hoặc mua ở Vạn Bảo Lâu.')); return; }
  for (const id of ids) box.append(cell(st.stock?.id === id, matIco(P[id]), P[id].name, `×${vn(have[id])}`, P[id].color || '#ccc', () => onPick({ kind: 'pill', id })));
}

function pillSheet(game, k, box, head, txt, changed) {
  const D = game.data, p = D.cave.pills[k], s = game.save, L = D.cave.qi_pill_day;
  if (!p || !(s.pills?.[k] > 0)) return false;
  txt.append(el('div', 'd-title', p.name), el('div', 'd-sub', `Đang có ${vn(s.pills[k])}`));
  head.prepend(matIco(p));
  box.append(head, el('div', 'd-line', p.desc || ''));
  if (p.use?.qi && L) box.append(el('div', 'd-line', qiPillLeft(game) > 0 ? L.left.replace('{n}', qiPillLeft(game)) : `Đan độc: viên kế tiếp còn ${Math.round(qiPillRate(game) * 100)}% hiệu quả.`));
  const row = el('div', 'd-primary'), b = el('button', 'act-btn primary', 'Dùng');
  b.onclick = () => { const m = usePill(game, k); game.toast(m ? `${p.name}: ${m}` : 'Lúc này dùng không có tác dụng.', 2.2); if (m) { game.sfx('levelup'); changed(); } };
  row.append(b); box.append(row);
  if (k === D.cave.pill_button) {   // góp ý #106: tự uống đan hồi máu khi máu dưới mức đã chọn
    const ar = el('div', 'd-primary'), cur = s.autoPillPct || 0;
    ar.append(el('small', 'muted', 'Tự uống khi máu dưới:'));
    for (const v of [0, 0.3, 0.5, 0.7]) {
      const o = el('button', 'act-btn' + (cur === v ? ' primary' : ''), v ? `${v * 100}%` : 'Tắt');
      o.onclick = () => { s.autoPillPct = v; game.persist(); changed(); };
      ar.append(o);
    }
    box.append(ar);
  }
  return true;
}

// Tấm chi tiết của ô đang chọn; trả false khi không có ô nào
export function renderStockSheet(game, st, box, changed, close) {
  const { data } = game, s = game.save, k = st.stock?.id;
  box.innerHTML = '';
  if (!k) return false;
  const head = el('div', 'd-head'), txt = el('div', 'd-name'), x = el('button', 'd-close', '✕');
  x.setAttribute('aria-label', 'Đóng chi tiết'); x.onclick = close;
  if (st.stock.kind === 'pill') { head.append(txt, x); return pillSheet(game, k, box, head, txt, changed); }
  if (st.stock.kind === 'mat') {
    const m = data.cave.materials[k];
    if (!m) return false;
    txt.append(el('div', 'd-title', m.name), el('div', 'd-sub', `Đang có ${vn(s.mats[k])}`));
    head.append(matIco(m, k), txt, x);
    box.append(head, el('div', 'd-line', m.desc || ''));
    return true;
  }
  if (!(s.gems[k] > 0)) return false;
  const gi = gemInfo(data, k), G = data.items.gems;
  txt.append(el('div', 'd-title', gi.name), el('div', 'd-sub', `Đang có ${vn(s.gems[k])} · ${statText(data, gi.stat, gi.value)}`));
  head.append(gemIcon(game, k, 40, 'ico gem-ico'), txt, x);
  box.append(head, el('div', 'd-line', 'Khảm vào lỗ trên trang bị: chạm món đồ ở phần Trang bị, chọn lỗ trống rồi chọn ngọc.'));
  if (gi.lv >= G.max_level) { box.append(el('div', 'd-line', 'Đã là cấp cao nhất.')); return true; }
  const fee = gemMergeFee(data, gi.lv), row = el('div', 'd-primary');
  const one = el('button', 'act-btn', `Ghép ${G.merge}→1 (${vn(fee)} ${data.shop.name})`);
  one.disabled = s.gems[k] < G.merge || (s.lingshi || 0) < fee;
  one.onclick = () => { if (mergeGems(data, s, k)) { game.sfx('levelup'); changed(); } };
  row.append(one);
  const can = Math.min(Math.floor(s.gems[k] / G.merge), Math.floor((s.lingshi || 0) / fee));
  if (can >= 2) {   // báo lỗi #35: ghép số lượng lớn một lần bấm, phí như ghép từng lần
    const all = el('button', 'act-btn primary', `Ghép hết ×${can}`);
    all.onclick = () => { let n = 0; while (mergeGems(data, s, k)) n++; if (n) { game.sfx('levelup'); game.toast(`Đã ghép ${n} lần: +${n} ${gemInfo(data, `${gi.type}:${gi.lv + 1}`).name}`, 2); changed(); } };
    row.append(all);
  }
  box.append(row, el('div', 'd-line', `Cần ${G.merge} viên cùng loại cùng cấp. Ghép xong thành 1 viên cấp ${gi.lv + 1}.`));
  return true;
}
