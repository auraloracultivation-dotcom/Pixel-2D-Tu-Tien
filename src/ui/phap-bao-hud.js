// Hệ Pháp Bảo trên màn chơi (tài khoản thử, src/game/phap-bao.js pbOn): 3 nút chiêu hiện 3 pháp bảo đang mặc (hình, tên, vòng phẩm, hồi chiêu);
// nút pháp bảo cũ (#btn-art) thành nút "Luyện chế" mở bảng (src/ui/phap-bao-panel.js). src/ui/hud.js gọi pbHud mỗi lần cập nhật.
import { PB, pbWorn, pbType, pbGrade } from '../game/phap-bao.js';
import { spriteImage } from '../render/sprites.js';

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
export const typeIcon = (game, T) => pbIcon(game, T.icon, T.icon_f || 0);

const css = (el, k, v) => { const m = el._css ||= {}; if (m[k] !== v) { m[k] = v; el.style.setProperty(k, v); } };

export function pbHud(game) {
  const p = game.player, worn = pbWorn(game);
  for (let i = 0; i < 3; i++) {
    const b = document.getElementById('btn-s' + i), it = worn[i], T = pbType(game, it);
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
  const ab = document.getElementById('btn-art');
  ab.hidden = false;
  const t = PB(game).ui.btn;
  if (ab.querySelector('b').textContent !== t) ab.querySelector('b').textContent = t;
  if (!ab._pb) { const u = pbIcon(game, 'pb.linh-chau'); if (u) { ab.style.backgroundImage = u; ab.style.backgroundSize = '30px 30px'; ab.style.backgroundRepeat = 'no-repeat'; ab.style.backgroundPosition = 'center 3px'; ab._pb = true; } }
  css(ab, '--cd', '0');
}
