// Hiệu ứng rèn luyện trên bảng Nhân vật (hình vẽ bằng code: tools/art/fx_ren.py → ui.fx-*; chủ dự án 11/11/2026 03:10).
// Không đổi luật game: so trạng thái trước / sau một thao tác (src/ui/self-panel.js gọi snap() lúc vẽ, react() sau thao tác),
// thấy gì đổi thì chạy hiệu ứng tương ứng đè lên đúng chỗ: cường hoá lên cấp (ren-thanh), hỏng (ren-hong), khảm thêm ngọc (kham),
// lực chiến tăng (luc-chien, dưới chân nhân vật). Mỗi khung chạy FRAME_MS mili giây, chạy xong tự gỡ.
import { power } from '../game/achieve.js';

const FRAME_MS = 70;

// Chạy hiệu ứng key đè lên phần tử target (tâm trùng tâm phần tử), cỡ size điểm ảnh màn hình; dy: dời lên (âm) / xuống
export function playFx(game, key, target, size = 96, dy = 0) {
  const spr = game.data.art.sprites['ui.fx-' + key];
  if (!spr || !target?.isConnected) return;
  const r = target.getBoundingClientRect(), n = spr.frames, fx = document.createElement('i');
  fx.className = 'sv-fx';
  Object.assign(fx.style, {
    left: `${r.left + r.width / 2 - size / 2}px`, top: `${r.top + r.height / 2 - size / 2 + dy}px`, width: `${size}px`, height: `${size}px`,
    backgroundImage: `url("${spr.file}?v=${spr.v}")`, backgroundSize: `${n * size}px ${size}px`,
  });
  document.body.append(fx);
  let f = 0;
  const id = setInterval(() => {
    if (++f >= n) { clearInterval(id); fx.remove(); return; }
    fx.style.backgroundPosition = `${-f * size}px 0`;
  }, FRAME_MS);
}

// Trạng thái để so: cấp cường hoá và số ngọc đã khảm của từng món, lực chiến
export function snap(game) {
  const items = {};
  for (const it of game.save.bag) items[it.uid] = [it.plus || 0, (it.sockets || []).filter(Boolean).length];
  return { items, power: power(game) };
}

// Sau một thao tác: so với lần chụp trước, chạy hiệu ứng. find(uid) → phần tử ô của món (đang mặc hoặc tấm chi tiết); hero: chân nhân vật
export function react(game, before, msg, find, hero) {
  if (!before) return;
  const now = snap(game);
  let up = null, gem = null;
  for (const [uid, [p, g]] of Object.entries(now.items)) {
    const b = before.items[uid]; if (!b) continue;
    if (p > b[0]) up = uid;
    if (g > b[1]) gem = uid;
  }
  if (up) playFx(game, 'ren-thanh', find(+up));
  else if (/^Hỏng/.test(msg || '')) playFx(game, 'ren-hong', find(null), 96, -12);
  if (gem) playFx(game, 'kham', find(+gem));
  if (now.power > before.power) setTimeout(() => playFx(game, 'luc-chien', hero(), 128, -26), up || gem ? 260 : 0);
}
