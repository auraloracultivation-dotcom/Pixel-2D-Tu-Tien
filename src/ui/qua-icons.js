// Quà hiện bằng hình và số lượng, không viết chữ "nhận được gì" (chủ dự án 19/11/2026 03:26 "đặt icon và số lượng là được, tối kị chỉ
// viết nhận được gì"). Một ô: hình món + "×n" ở góc. Trang bị bốc ngẫu nhiên là hộp bí ẩn (rương có dấu ?, viền màu phẩm). Chạm ô thì
// hiện tên món một lúc. Dùng cho Mốc quà, nhiệm vụ hệ thống, nhiệm vụ ngày (src/ui/he-thong-*.js). Kiểu ở he-thong.css (.qt-*).
import { goc } from '../core/build.js';
import { spriteIcon } from './sprite-icon.js';
import { gemIcon } from './gem-icon.js';
import { gemInfo } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { qiNeed } from '../game/stats.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const short = n => n >= 1e6 ? `${+(n / 1e6).toFixed(1)}tr`.replace('.', ',') : n >= 1e4 ? `${Math.round(n / 1e3)}k` : n.toLocaleString('vi-VN');

// Điểm hệ thống: mặt Hệ Thống (data/he-thong.json → mat, khung đầu "thuong"), nhãn "+25 điểm" (chủ dự án 19/11/2026 04:24: rương ×25
// nhìn như nhận 25 cái rương)
function face(game, S) {
  const M = game.data['he-thong'].mat, cv = document.createElement('canvas');
  if (!M) return cv;
  cv.width = M.w; cv.height = M.h; cv.style.width = S + 'px'; cv.style.height = Math.round(S * M.h / M.w) + 'px';
  const im = new Image(); im.onload = () => cv.getContext('2d').drawImage(im, 0, 0, M.w, M.h, 0, 0, M.w, M.h);
  im.src = goc(M.src, false);
  return cv;
}

// Một món quà → { ico: nút hình, n: số, name: tên đủ, color }
function look(game, q, S) {
  const D = game.data, M = D['he-thong'].moc || {};
  if (q.coins) return { ico: spriteIcon(game, 'ui.ic-linh-thach', 0, S), n: q.coins, name: `${q.coins.toLocaleString('vi-VN')} ${D.shop?.name || 'Linh Thạch'}`, color: '#ffd24a' };
  if (q.pill) { const x = D.cave.pills[q.pill]; return { ico: spriteIcon(game, 'ui.vk-' + q.pill, 0, S), n: q.n, name: `${x?.name || q.pill} ×${q.n}`, color: x?.color || '#ff9ad0' }; }
  if (q.mat) { const x = matInfo(D, q.mat); return { ico: spriteIcon(game, 'ui.vk-' + q.mat, 0, S), n: q.n, name: `${x?.name || q.mat} ×${q.n}`, color: '#bfe6f4' }; }
  if (q.gem) { const g = gemInfo(D, q.gem); return { ico: gemIcon(game, q.gem, S + 10), n: q.n, name: `${g?.name || q.gem} ×${q.n}`, color: g?.color || '#9fe8ff' }; }
  if (q.gear != null) {
    const T = D.items.line_tiers.list[q.gear] || {}, t = T.name || '';
    return { ico: spriteIcon(game, 'ui.ic-ruong', 0, S), n: 1, name: fill(M.gear_name || 'Hộp trang bị {t}', { t }), tip: fill(M.gear_tip || '', { t }), color: T.edge ? '#ff4a5a' : T.color || '#fff', box: t };
  }
  if (q.qi_pct) {   // linh khí theo tầng đang tu: ghi số thật (chủ dự án 19/11/2026 04:24 "đừng ghi +5%, ghi số liệu")
    const n = game.save ? Math.round(qiNeed(game.save, D.realms) * q.qi_pct) : 0;
    return { ico: spriteIcon(game, 'ui.ic-tu-luyen', 0, S), n, plus: true, name: `${n.toLocaleString('vi-VN')} ${M.qi_name || 'Linh khí'}`, tip: M.qi_tip || '', color: '#9fe8ff' };
  }
  if (q.pts) return { ico: face(game, S), n: q.pts, plus: true, unit: M.pts_unit || 'điểm', name: `${q.pts} ${M.pts_name || 'Điểm Triệu hồi'}`, color: '#c07aff' };
  return null;
}

// Dãy ô quà. qua: [{coins}|{pill,n}|{mat,n}|{gem,n}|{gear}|{qi_pct}|{pts}]; size: cỡ hình (điểm CSS)
export function quaRow(game, qua = [], size = 26) {
  const row = el('div', 'qt-row');
  for (const q of qua) {
    const L = look(game, q, size);
    if (!L) continue;
    const c = el('span', `qt${L.box ? ' qt-box' : ''}`);
    c.style.setProperty('--qc', L.color); c.title = L.name;
    c.append(L.ico);
    if (L.box) c.append(el('em', 'qt-q', '?'));
    c.append(el('b', 'qt-n', L.box ? L.box : L.plus ? `+${short(L.n)}${L.unit ? ' ' + L.unit : ''}` : `×${short(L.n)}`));
    c.onclick = e => { e.stopPropagation(); game.toast?.(L.tip ? `${L.name}: ${L.tip}` : L.name, 2.2); };
    row.append(c);
  }
  return row;
}
