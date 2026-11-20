// Lễ ăn mừng độ kiếp thành công (chủ dự án 17/11/2026 11:12): "cả bản đồ đều phải bị hiệu ứng thăng cấp ảnh hưởng, linh khí cả khu
// vực ùn ùn kéo tới thâm nhập vào cơ thể nhân vật trong vài giây, sau đó bùm bộc phát ra khí thế và sóng xung kích ra xung quanh".
// Hai nhịp: tụ (gather giây: trời tối lại, hạt linh khí từ khắp màn bay xoáy vào người, quầng sáng to dần, đất rung tăng dần,
// người bất tử) → bùm (sóng xung kích nhiều vòng lan ra hết màn, chớp sáng, cả bản đồ ánh màu cảnh giới, quái cả bản đồ khựng và
// bị đẩy lùi theo khoảng cách) rồi mới vào nghi lễ đột phá cũ (src/game/len-tang.js realmUp). Vẽ ở src/render/draw-trib.js.
// Số ở data/config.json → trib_fx.cele.
import { addFx } from './combat.js';
import { juiceUp } from './juice.js';

const C = game => game.data.config.trib_fx?.cele || {};

// Bắt đầu lễ; done() chạy lúc bùm (lên cảnh giới, nghi lễ đột phá)
export function startCele(game, color, done) {
  const p = game.player, K = C(game);
  game.cele = { t: 0, color, done, parts: [], boomed: false, acc: 0 };
  p.invT = Math.max(p.invT || 0, (K.gather || 2.6) + 1); p.meditating = false;
  game.strikes = [];
  game.darkTarget = Math.max(game.darkTarget || 0, K.dark || 0.5);
  game.sfx?.('roar', 0.7);
}

export function celeTick(game, dt) {
  const c = game.cele;
  if (!c) return;
  const K = C(game), p = game.player, G = K.gather || 2.6;
  c.t += dt;
  if (c.t < G) {
    spawn(c, p, K, G, dt);
    game.screen?.shake?.((K.shake || 2.5) * (c.t / G), 0.1);
  } else if (!c.boomed) boom(game, c);
  pull(c, p, K, dt);
  if (c.boomed && c.t > G + (K.after || 1.6) && !c.parts.length) game.cele = null;
}

function spawn(c, p, K, G, dt) {
  c.acc += (K.rate || 90) * (0.4 + c.t / G) * dt;   // hạt linh khí sinh dồn dập dần
  while (c.acc >= 1) {
    c.acc -= 1;
    const a = Math.random() * Math.PI * 2, d = (K.from || 220) * (0.6 + Math.random() * 0.6);
    c.parts.push({ x: p.x + Math.cos(a) * d, y: p.y - 8 + Math.sin(a) * d * 0.8, a, d, spin: (Math.random() < 0.5 ? -1 : 1) * (0.8 + Math.random()), life: 0, s: 1 + Math.random() * 1.5 });
  }
}
function pull(c, p, K, dt) {
  for (const q of c.parts) {   // xoáy vào người: bán kính co lại, góc quay thêm
    q.life += dt; q.d *= Math.exp(-dt * (K.pull || 2.4)); q.a += q.spin * dt * (2 + 60 / (q.d + 10));
    q.x = p.x + Math.cos(q.a) * q.d; q.y = p.y - 8 + Math.sin(q.a) * q.d * 0.8;
  }
  c.parts = c.parts.filter(q => q.d > 3);
}

// Người khác vừa chịu đủ sét (tin ks-ok, kiep-see.js): máy mình cũng thấy linh khí xoáy vào họ rồi bùm, cột sáng lên cảnh giới.
// Chỉ hình và tiếng (nhỏ hơn của mình): không làm tối trời, không đẩy quái, không chớp cả màn
export function celeSeeStart(game, o, color) {
  const L = (game.celeSee ||= []);
  if (L.some(c => c.who === o) || L.length >= 3) return;
  L.push({ who: o, t: 0, color, parts: [], boomed: false, acc: 0 });
  game.sfx?.('roar', 0.45);
}
export function celeSeeTick(game, dt) {
  const L = game.celeSee;
  if (!L?.length) return;
  const K = C(game), G = K.gather || 2.6;
  for (const c of L) {
    const p = c.who; c.t += dt;
    if (c.t < G) spawn(c, p, K, G, dt);
    else if (!c.boomed) {
      c.boomed = true; c.parts = c.parts.filter(q => q.d > 30); game.screen?.shake?.((K.boom_shake || 7) * 0.35, 0.4);
      for (let i = 0; i < (K.rings || 4); i++) setTimeout(() => addFx(game, { type: 'ring', x: p.x, y: p.y - 4, r: (K.ring_r || 90) * (1 + i * 0.7), color: i % 2 ? '#ffffff' : c.color, life: 0.7 + i * 0.15, fill: i === 0 }), i * 110);
      game.sfx?.('impact', 0.6); game.sfx?.('breakthrough', 0.6);
      juiceUp(game, true, c.color, p);
    }
    pull(c, p, K, dt);
  }
  game.celeSee = L.filter(c => !(c.boomed && c.t > G + (K.after || 1.6) && !c.parts.length) && c.t < G + 8);
}

function boom(game, c) {
  const K = C(game), p = game.player;
  c.boomed = true; c.parts = c.parts.filter(q => q.d > 30);
  game.flashT = Math.max(game.flashT || 0, K.flash || 0.4); game.screen?.shake?.(K.boom_shake || 7, 0.7);
  game.darkTarget = game.map?.def?.dark || 0;
  for (let i = 0; i < (K.rings || 4); i++) setTimeout(() => addFx(game, { type: 'ring', x: p.x, y: p.y - 4, r: (K.ring_r || 90) * (1 + i * 0.7), color: i % 2 ? '#ffffff' : c.color, life: 0.7 + i * 0.15, fill: i === 0 }), i * 110);
  for (const m of game.mobs) {   // cả bản đồ: quái khựng, gần thì bị hất ra
    if (m.dead || m.remote) continue;
    const d = Math.hypot(m.x - p.x, m.y - p.y) || 1, push = (K.push || 260) * Math.max(0, 1 - d / (K.push_r || 320));
    if (m.def?.ai !== 'boss') m.stunT = Math.max(m.stunT || 0, K.stun || 1.2);
    if (push > 0 && m.def?.ai !== 'boss') { m.kx = (m.x - p.x) / d * push; m.ky = (m.y - p.y) / d * push; }
  }
  game.sfx?.('impact', 1); game.sfx?.('breakthrough');
  c.done?.();
}
