// Thiên lôi độ kiếp (chủ dự án 17/11/2026 11:12): "sét phải lớn và nhiều như cả bầu trời muốn đổ; cấp càng cao sét đánh xuống càng
// nhiều, màu sắc càng nhiều; đánh xuống tạo vùng nổ, sau khi nổ để lại vệt đen / tàn dư thiên lôi, gợn sét nhỏ chưa tan cho tới khi
// kết thúc độ kiếp". Đòn trúng người vẫn là các đợt của src/game/tribulation.js (vòng báo trước, né được); ở đây thêm:
//  - mưa sét khắp màn quanh người chơi (chỉ hình, không trúng người), số tia mỗi giây tăng theo cảnh giới;
//  - mỗi tia (cả tia trúng thật) một dải màu, cảnh giới càng cao càng nhiều dải; tia to hơn;
//  - chỗ sét giáng: vùng nổ (vòng sóng, chớp) và vết cháy đen + gợn sét nhỏ lách tách tới hết kiếp (game.scorch, vẽ ở
//    src/render/draw-trib.js), hết kiếp thì nhạt dần.
// Số ở data/config.json → trib_fx.sky.
import { boltFx } from './skill-fx.js';
import { addFx } from './combat.js';

const S = game => game.data.config.trib_fx?.sky || {};

// Dải màu cho một tia: cảnh giới r được chọn trong r + 1 dải đầu (dải 0 là sét xanh tím quen thuộc)
export function tribPal(game) {
  const P = S(game).pals || [], n = Math.min(P.length, (game.save.realm || 0) + 1);
  return n ? P[Math.floor(Math.random() * n)] : null;
}

// Một tia sét thiên kiếp giáng xuống (x, y): hình to theo cảnh giới, vùng nổ, để lại vết cháy
export function tribBolt(game, x, y, opt = {}) {
  const C = S(game), r = game.save.realm || 0, pal = opt.pal || tribPal(game), w = (C.w || 1.4) + r * (C.w_realm || 0.08);
  boltFx(game, x, y, true, Math.floor(Math.random() * 1e6), { pal, w, h: (C.h || 200) + r * (C.h_realm || 8) });
  if (opt.boom !== false) {
    addFx(game, { type: 'ring', x, y, r: (C.boom_r || 16) * (0.8 + w * 0.3), color: pal?.[1] || '#9ad8ff', life: 0.4, fill: true });
    addFx(game, { type: 'ring', x, y, r: (C.boom_r || 16) * 1.8, color: pal?.[0] || '#ffffff', life: 0.3 });
  }
  const sc = (game.scorch ||= []);
  if (sc.length >= (C.scorch_max || 40)) sc.shift();
  sc.push({ x, y, r: (C.scorch_r || 9) * (0.8 + Math.random() * 0.5) * (0.85 + w * 0.15), pal: pal || game.data.config.bolt?.colors, t: 0, seed: Math.random() * 1000, ...(opt.fade ? { fade: opt.fade + 4, fade0: opt.fade } : {}) });   // opt.fade: vết của kiếp người khác (kiep-see.js) tự nhạt, không chờ hết kiếp của mình
}

// Mỗi khung khi đang độ kiếp: mưa sét quanh màn (chỉ hình), không rơi sát người chơi
export function tribSkyTick(game, dt) {
  const C = S(game), p = game.player, r = game.save.realm || 0;
  const rate = (C.rate || 2) + r * (C.rate_realm || 0.6);
  game.tribSkyAcc = (game.tribSkyAcc || 0) + rate * dt;
  while (game.tribSkyAcc >= 1) {
    game.tribSkyAcc -= 1;
    const a = Math.random() * Math.PI * 2, d = (C.near || 40) + Math.random() * (C.far || 170);
    const x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.75;
    if (game.map?.edge?.(Math.floor(x / game.map.T), Math.floor(y / game.map.T))) continue;   // không giáng ngoài mép tinh cầu
    tribBolt(game, x, y, { boom: Math.random() < 0.5 });
    if (Math.random() < (C.sound_p || 0.35)) game.sfx?.('thunder', 0.5);
  }
}

// Hết kiếp (thành công hay gục): vết cháy nhạt dần trong fade giây rồi mất
export function tribSkyEnd(game) {
  const f = S(game).fade || 3;
  for (const s of game.scorch || []) { s.fade ??= f; s.fade0 = f; }
  game.tribSkyAcc = 0;
}
export function scorchTick(game, dt) {
  if (!game.scorch?.length) return;
  for (const s of game.scorch) { s.t += dt; if (s.fade != null) s.fade -= dt; }
  game.scorch = game.scorch.filter(s => s.fade == null || s.fade > 0);
}
