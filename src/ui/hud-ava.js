// Khung chân dung góc trên trái (chủ dự án 02/11/2026 22:10, bộ khung GPT thứ hai): mặt nhân vật lấy từ hình đang mặc (khung đứng,
// cắt phần đầu vai), viền theo Linh căn (mộc: hoa sen, hỏa: lửa, thủy: sóng, kim / thổ: vàng hoa), ô cấp ghi tầng tu tổng
// (cảnh giới × 9 + tầng). Chạm chân dung mở bảng nhân vật như chạm tên cảnh giới. Kiểu ở style-ui-kit2.css.
import { spriteImage } from '../render/sprites.js';
import { outfitSprite } from '../render/draw-hero.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

// Khung bộ hoa đào (chủ dự án 04/11/2026 10:19, tools/art/ui_hoa_dao.py): mộc hoa đào, kim vàng kim cương, thủy sóng, hỏa lửa, thổ mây vàng.
// Lòng vòng từng khung đọc ở data/art.json → sprites['ui.hd-ava-<hệ>'].hole = [tâm x / rộng, tâm y / cao, bán kính / rộng, cao / rộng].
const ELS = ['moc', 'hoa', 'thuy', 'kim', 'tho'];
const W = 66;   // bề ngang khung trên màn hình

export function createHudAva(game) {
  const box = document.createElement('div'); box.id = 'uk-ava'; box.hidden = true;
  const cv = document.createElement('canvas'); cv.width = 40; cv.height = 40;
  const fr = document.createElement('i'), lv = document.createElement('b');
  box.append(cv, fr, lv);
  box.addEventListener('pointerdown', e => { e.stopPropagation(); document.getElementById('realm')?.click(); });
  let key = '';
  function paint() {
    const bars = document.querySelector('#hud .bars'), s = game.save;
    if (!bars || !s) return;
    if (box.parentElement !== bars) bars.prepend(box);
    box.hidden = false;
    const H = game.data.heroes, look = H.list[s.look] ? s.look : H.default, id = outfitSprite(game, look), spr = game.data.art.sprites[id];
    const fk = ELS.includes(s.element) ? s.element : 'moc', L = `Lv.${(s.realm || 0) * 9 + (s.layer || 1)}`, im0 = spr && spriteImage(spr), k = [id, fk, L, !!(im0 && im0.complete && im0.naturalWidth)].join('|');
    if (k === key) return;
    key = k; lv.textContent = L;
    fr.style.setProperty('--ava', `url("assets/art/ui-hd-ava-${fk}.png")`);
    const [hx, hy, hr, ar] = game.data.art.sprites['ui.hd-ava-' + fk]?.hole || [0.5, 0.45, 0.31, 1.1], d = Math.round(hr * W * 2) + 2;   // mặt tròn khớp lòng vòng (lớn hơn 2 điểm cho kín mép)
    Object.assign(cv.style, { width: d + 'px', height: d + 'px', left: Math.round(hx * W - d / 2) + 'px', top: Math.round(hy * W * ar - d / 2) + 'px' });
    box.style.height = Math.round(W * ar) + 'px';
    const im = spr && spriteImage(spr), c = cv.getContext('2d');
    c.clearRect(0, 0, 40, 40); c.fillStyle = '#2a1838'; c.fillRect(0, 0, 40, 40);
    if (!im) return;
    // khung đứng (khung 0), cắt vuông quanh đầu: bề ngang 30 điểm quanh tâm hình, từ đỉnh đầu xuống
    const top = spr.anchor[1] - 42, cx = spr.anchor[0], S = 30;
    c.imageSmoothingEnabled = false;
    c.drawImage(im, cx - S / 2, Math.max(0, top), S, S, 0, 2, 40, 40);
  }
  paint(); every(paint, 3000);
}
