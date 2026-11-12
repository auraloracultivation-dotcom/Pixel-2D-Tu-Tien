// Hệ Pháp Bảo trên màn chơi (src/game/phap-bao.js pbOn): 3 nút chiêu và nút pháp bảo cũ (#btn-art) hiện 4 pháp bảo đang mặc
// (hình, tên, vòng phẩm, hồi chiêu); ô 4 chưa mở (dưới Nguyên Anh) thì ẩn nút (chủ dự án 12/11/2026 04:07: bỏ chữ "Luyện chế" ở ô 4,
// luyện chế nằm trong Trang bị → Pháp bảo). src/ui/hud.js gọi pbHud mỗi lần cập nhật.
import { pbWorn, pbType, pbGrade, slotOpen } from '../game/phap-bao.js';
import { spriteImage } from '../render/sprites.js';
import { pxOn } from '../game/pfx.js';

const cache = new Map();
// Ảnh vuông (data URL) của một khung hình, căn giữa, giữ tỉ lệ; hình chưa tải xong thì trả '' (lần sau thử lại).
// f đếm cả các hàng của tấm lưới (hình pfx.* nhiều hướng); o: { box: [x, y, rộng, cao] cắt trong khung, flip: lật dọc }
export function pbIcon(game, id, f = 0, size = 48, o) {
  const key = `${id}:${f}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const S = game.data.art.sprites[id], im = S && spriteImage(S);
  if (!im) return '';
  const c = document.createElement('canvas'); c.width = c.height = size;
  const [bx, by, bw, bh] = o?.box || [0, 0, S.w, S.h], x = c.getContext('2d'), k = Math.min(size / bw, size / bh) * 0.92, w = bw * k, h = bh * k;
  x.imageSmoothingEnabled = k < 1;
  if (o?.flip) { x.translate(0, size); x.scale(1, -1); }
  x.drawImage(im, (f % S.frames) * S.w + bx, Math.floor(f / S.frames) * S.h + by, bw, bh, (size - w) / 2, (size - h) / 2, w, h);
  const url = `url("${c.toDataURL()}")`;
  cache.set(key, url);
  return url;
}
// Hình của một loại pháp bảo: hiệu ứng điểm ảnh bật thì lấy chính hình của đòn (data/phap-bao.json → types.*.px, chủ dự án 13/11/2026: bỏ ảnh GPT), không thì hình cũ
export const typeIcon = (game, T, size) => (T.px && pxOn(game) ? pbIcon(game, T.px.s, T.px.f || 0, size || 48, T.px) : pbIcon(game, T.icon, T.icon_f || 0, size || 48));

const css = (el, k, v) => { const m = el._css ||= {}; if (m[k] !== v) { m[k] = v; el.style.setProperty(k, v); } };

export function pbHud(game) {
  const p = game.player, worn = pbWorn(game);
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById(i < 3 ? 'btn-s' + i : 'btn-art'), it = worn[i], T = pbType(game, it);
    if (i === 3) { b.hidden = !slotOpen(game, 3) || !it; if (b.hidden) continue; b.style.backgroundSize = b.style.backgroundRepeat = b.style.backgroundPosition = ''; }
    b.classList.toggle('off', !it);
    const lbl = b.querySelector('b'), name = T ? T.name : '—';
    if (lbl.textContent !== name || b._pbIcon !== (T?.icon || '')) {
      const url = T ? typeIcon(game, T) : '';
      if (url || !T) { lbl.textContent = name; b.style.backgroundImage = url; b._pbIcon = T?.icon || ''; }
      if (T) b.style.setProperty('--gc', pbGrade(game, it).color); else b.style.removeProperty('--gc');
    }
    const max = p.pbCdMax?.[i] || T?.cd || 1;
    css(b, '--cd', (it ? Math.max(0, p.skillCd[i]) / max : 0).toFixed(3));
  }
}
