// Hệ Pháp Bảo trên màn chơi (src/game/phap-bao.js pbOn): 3 nút chiêu và nút pháp bảo cũ (#btn-art) hiện 4 pháp bảo đang mặc
// (hình, tên, vòng phẩm, hồi chiêu); ô 4 chưa mở (dưới Nguyên Anh) thì ẩn nút (chủ dự án 12/11/2026 04:07: bỏ chữ "Luyện chế" ở ô 4,
// luyện chế nằm trong Trang bị → Pháp bảo). src/ui/hud.js gọi pbHud mỗi lần cập nhật.
import { pbWorn, pbType, pbGrade, slotOpen } from '../game/phap-bao.js';
import { spriteImage } from '../render/sprites.js';
import { pxOn } from '../game/pfx.js';

const cache = new Map();
// Ảnh vuông (data URL) của một khung hình, căn giữa, giữ tỉ lệ; hình chưa tải xong thì trả '' (lần sau thử lại)
export function pbIcon(game, id, f = 0, size = 48) {
  const key = `${id}:${f}:${size}`;
  if (cache.has(key)) return cache.get(key);
  const S = game.data.art.sprites[id], im = S && spriteImage(S);
  if (!im) return '';
  const c = document.createElement('canvas'); c.width = c.height = size;
  const x = c.getContext('2d'), k = Math.min(size / S.w, size / S.h) * 0.92, w = S.w * k, h = S.h * k;
  x.imageSmoothingEnabled = k < 1;
  x.drawImage(im, (f % S.frames) * S.w, 0, S.w, S.h, (size - w) / 2, (size - h) / 2, w, h);
  const url = `url("${c.toDataURL()}")`;
  cache.set(key, url);
  return url;
}
// Biểu tượng điểm ảnh vẽ bằng code (pxi.*, tools/art/pfx/export.mjs --icons; chủ dự án 13/11/2026: bỏ ảnh GPT): hiệu ứng điểm ảnh bật thì dùng thẳng
// file hình (đã phóng 3 lần đúng lưới: ô 34 điểm cho nút pháp bảo, ô 18 điểm cho chiêu khảm), không vẽ lại qua khung phụ kẻo nhoè nét.
const pxi = (game, id) => { const S = id && pxOn(game) && game.data.art.sprites[id]; return S ? `url("${S.file}?v=${S.v}")` : ''; };
// Hình của một loại pháp bảo (data/phap-bao.json → types.*.px.i) và của một chiêu khảm ('pxi.' + mã hình cũ đổi '.' thành '-'); px tắt: hình cũ
export const typeIcon = (game, T, size) => pxi(game, T.px?.i) || pbIcon(game, T.icon, T.icon_f || 0, size || 48);
export const modIcon = (game, m) => pxi(game, 'pxi.' + m.icon.replace('.', '-')) || pbIcon(game, m.icon, 0, 48);

const css = (el, k, v) => { const m = el._css ||= {}; if (m[k] !== v) { m[k] = v; el.style.setProperty(k, v); } };

export function pbHud(game) {
  const p = game.player, worn = pbWorn(game);
  for (let i = 0; i < 4; i++) {
    const b = document.getElementById(i < 3 ? 'btn-s' + i : 'btn-art'), it = worn[i], T = pbType(game, it);
    if (i === 3) {   // ô 4 là nút pháp bảo cũ (46 điểm, không có cỡ nền sẵn): hình điểm ảnh 102 điểm phải ép về ô 34 như ba nút kia
      b.hidden = !slotOpen(game, 3) || !it; if (b.hidden) continue;
      const px = !!T?.px?.i && pxOn(game);
      b.style.backgroundSize = px ? '34px 34px' : ''; b.style.backgroundRepeat = px ? 'no-repeat' : ''; b.style.backgroundPosition = px ? 'center' : '';
    }
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
