// Khung chân dung góc trên trái (chủ dự án 02/11/2026 22:10, bộ khung GPT thứ hai): mặt nhân vật lấy từ hình đang mặc (khung đứng,
// cắt phần đầu vai), viền theo Linh căn (mộc: hoa sen, hỏa: lửa, thủy: sóng, kim / thổ: vàng hoa), ô cấp ghi tầng tu tổng
// (cảnh giới × 9 + tầng). Chạm chân dung mở bảng nhân vật như chạm tên cảnh giới. Kiểu ở style-ui-kit2.css.
import { spriteImage } from '../render/sprites.js';
import { heroLook } from '../render/draw-hero.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt
import { faceCrop } from './ava-crop.js';

// Khung bộ hoa đào (chủ dự án 04/11/2026 10:19, tools/art/ui_hoa_dao.py): mộc hoa đào, kim vàng kim cương, thủy sóng, hỏa lửa, thổ mây vàng.
// Lòng vòng từng khung đọc ở data/art.json → sprites['ui.hd-ava-<hệ>'].hole = [tâm x / rộng, tâm y / cao, bán kính / rộng, cao / rộng].
const ELS = ['moc', 'hoa', 'thuy', 'kim', 'tho'];
const W = 66;   // bề ngang khung trên màn hình
// Khung trên mới (ảnh GPT chủ dự án 11/11/2026 11:42, tools/art/ui_hud_tren.py): vòng chân dung một màu cho mọi hệ, rộng W2; 'hole',
// 'socket' (ổ ngọc: huy hiệu hệ ui-nv-<hệ>), 'plate' (bảng cấp: chữ Lv) đọc ở data/art.json. Kiểu ở style-hud-tren.css.
const RING2 = 'ui.hud-vong-mat', W2 = 60;

export function createHudAva(game) {
  const box = document.createElement('div'); box.id = 'uk-ava'; box.hidden = true;
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
  const fr = document.createElement('i'), lv = document.createElement('b'), seal = document.createElement('s');
  box.append(cv, fr, lv, seal);
  box.addEventListener('pointerdown', e => { e.stopPropagation(); document.getElementById('realm')?.click(); });
  let key = '';
  function paint() {
    const bars = document.querySelector('#hud .bars'), s = game.save;
    if (!bars || !s) return;
    if (box.parentElement !== bars) bars.prepend(box);
    box.hidden = false;
    const id = heroLook(game).sprite, spr = game.data.art.sprites[id];   // đúng hình đang vẽ ngoài màn (bộ thời trang chưa có hình chibi thì hình gốc; trước lấy tên chibi không có hình nên mặt trống)
    const fk = s.element === 'moc' || !ELS.includes(s.element) ? 'kim' : s.element,   // Mộc / chưa có hệ: khung vàng kim cương (khung hoa đào hồng đã bỏ, chủ dự án 04/11/2026 11:10)
      L = `Lv.${(s.realm || 0) * 9 + (s.layer || 1)}`, im0 = spr && spriteImage(spr), k = [id, fk, s.element, L, !!(im0 && im0.complete && im0.naturalWidth)].join('|');
    if (k === key) return;
    key = k; lv.textContent = L;
    const V = game.data.art.sprites[RING2], w = V ? W2 : W;   // khung trên mới: một vòng cho mọi hệ, huy hiệu hệ ở ổ ngọc, chữ Lv trong bảng cấp
    box.classList.toggle('v2', !!V);
    fr.style.setProperty('--ava', V ? `url("${V.file}?v=${V.v}")` : `url("assets/art/ui-hd-ava-${fk}.png")`);
    const [hx, hy, hr, ar0] = V ? V.hole : game.data.art.sprites['ui.hd-ava-' + fk]?.hole || [0.5, 0.45, 0.31, 1.1], ar = V ? V.h / V.w : ar0, d = Math.round(hr * w * 2) + 2;   // mặt tròn khớp lòng vòng (lớn hơn 2 điểm cho kín mép)
    Object.assign(cv.style, { width: d + 'px', height: d + 'px', left: Math.round(hx * w - d / 2) + 'px', top: Math.round(hy * w * ar - d / 2) + 'px' });
    box.style.height = Math.round(w * ar) + 'px';
    if (V) {
      const at = (e, [cx, cy, bw, bh]) => Object.assign(e.style, { left: Math.round((cx - bw / 2) * w) + 'px', top: Math.round((cy - bh / 2) * w * ar) + 'px', width: Math.round(bw * w) + 'px', height: Math.round(bh * w * ar) + 'px' });
      at(lv, V.plate); at(seal, V.socket);
      seal.style.backgroundImage = s.element ? `url("assets/art/ui-nv-${s.element}.png")` : '';
    }
    const im = spr && spriteImage(spr), c = cv.getContext('2d');
    c.clearRect(0, 0, 40, 40); c.fillStyle = '#2a1838'; c.fillRect(0, 0, 40, 40);
    if (!im) return;
    // khung đứng (khung 0): cắt vuông quanh mặt (src/ui/ava-crop.js), phần ngoài hình để trống
    const t = document.createElement('canvas'); t.width = spr.w; t.height = spr.h;
    const tc = t.getContext('2d'); tc.drawImage(im, 0, 0, spr.w, spr.h, 0, 0, spr.w, spr.h);
    const f = faceCrop(tc.getImageData(0, 0, spr.w, spr.h).data, spr.w, spr.h);
    if (!f) return;
    const z = N / f.S, sx = Math.max(0, f.x), sy = Math.max(0, f.y), ex = Math.min(spr.w, f.x + f.S), ey = Math.min(spr.h, f.y + f.S);
    c.imageSmoothingEnabled = false;
    if (ex > sx && ey > sy) c.drawImage(t, sx, sy, ex - sx, ey - sy, (sx - f.x) * z, (sy - f.y) * z, (ex - sx) * z, (ey - sy) * z);
  }
  paint(); every(paint, 3000);
}
