// Tiếng chiêu. Hai bảng:
//   - riêng từng chiêu (chủ dự án 13/11/2026: làm lại tiếng cùng bộ hiệu ứng điểm ảnh): data/tieng-chieu.json → by_skill[mã chiêu] =
//     { c: lúc tung, h: đạn trúng, b: đạn nổ lan, z: [tiếng, chu kỳ giây, âm lượng] lặp khi vùng chiêu còn, r / s / k: mốc riêng của chiêu
//     đặc biệt (tụ xong rồi chém, kiếm rời vòng, kiếm cắm đất…) }. Chỉ dùng khi hiệu ứng điểm ảnh bật (pxOn): hình và tiếng mới đi chung một
//     cờ, chủ dự án duyệt một lần. Công thức tiếng viết ở tools/sfx_chieu.py.
//   - theo hệ (06/11/2026): data/sounds.json → by_fx[fx của chiêu] = [tiếng phát, tiếng trúng]; chiêu chưa có trong bảng thì dùng tiếng chung
//     theo loại chiêu.
import { pxOn } from './pfx.js';

const BY_TYPE = { projectile: 'shoot', multi: 'shoot', aoe: 'boom', zone: 'boom', heal: 'heal', shield: 'shield', buff: 'buff', dash: 'dash' };

const pair = (game, s) => (s && game.data.sounds.by_fx?.[s.fx]) || null;
const IDS = new WeakMap();   // chiêu đặc biệt chỉ cầm bản khai s (không có mã): tra ngược mã một lần rồi nhớ
const idOf = (game, s) => (typeof s !== 'object' || !s ? s : IDS.get(s) ?? (IDS.set(s, Object.keys(game.data.skills).find(k => game.data.skills[k] === s) || ''), IDS.get(s)));
const own = (game, id) => ((id = idOf(game, id)) && pxOn(game) && game.data['tieng-chieu']?.by_skill?.[id]) || null;
const say = (game, v, vol) => (Array.isArray(v) ? game.sfx(v[0], vol * (v[1] ?? 1)) : game.sfx(v, vol));   // v: tên tiếng hoặc [tên, âm lượng]

// id: mã chiêu (không truyền thì chỉ dùng bảng theo hệ)
export function castSfx(game, s, vol = 1, id) {
  const O = own(game, id);
  if (O?.c) say(game, O.c, vol);
  else game.sfx(pair(game, s)?.[0] || BY_TYPE[s.type], vol);
}

// id: chiêu (b.sk của đạn); big: đạn nổ lan. Không có tiếng trúng riêng thì im, tiếng 'hit' của đòn đánh đã kêu (src/game/combat.js)
export function hitSfx(game, id, vol = 0.7, big = false) {
  const O = own(game, id);
  if (O) { const v = (big && O.b) || O.h; if (v) say(game, v, vol); return; }
  const h = pair(game, game.data.skills[id])?.[1];
  if (h) game.sfx(h, vol);
}

// Mốc riêng của chiêu đặc biệt (key: r, s, k): có tiếng riêng thì phát, không thì phát tiếng cũ old (không truyền: im). id: mã chiêu hoặc bản khai chiêu
export function skillSfx(game, id, key, vol = 1, old) {
  const v = own(game, id)?.[key];
  if (v) say(game, v, vol); else if (old) game.sfx?.(old, vol);
}

// Tiếng nền của vùng chiêu (lửa cháy, băng rít, cát chảy, luân xoay): lặp theo chu kỳ khi vùng còn. Gọi mỗi khung (src/game/pfx.js).
export function zoneSfx(game, z, dt) {
  const Z = own(game, z.sk)?.z;
  if (!Z) return;
  z.sfxT = (z.sfxT ?? Z[1] * 0.6) - dt;   // tiếng tung chiêu còn đang kêu: lần lặp đầu lùi lại một chút
  if (z.sfxT > 0 || z.dur - z.t < 0.5) return;
  z.sfxT = Z[1];
  game.sfx(Z[0], Z[2] ?? 1);
}

// Dựng sẵn tiếng của các chiêu đang mang (đổi chiêu thì dựng thêm): lần tung đầu không khựng hình. slots: mã chiêu ở 3 ô (player.js)
let warmed = null;
export function warmSkillSfx(game, slots) {
  const sig = slots.join();
  if (sig === warmed) return;
  warmed = sig;
  if (!pxOn(game)) return;
  const T = game.data['tieng-chieu']?.by_skill || {}, names = [];
  for (const id of slots) for (const v of Object.values(T[id] || {})) names.push(Array.isArray(v) ? v[0] : v);
  game.sfxWarm?.(names);
}
