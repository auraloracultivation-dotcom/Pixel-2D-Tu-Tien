// Kiểu chiêu 'domain' — Vô Ảnh Trảm Vực (chủ dự án 09/11/2026 19:27, bán ở Vạn Bảo Lâu 100.000 Linh Thạch, data/shop.json):
// mở lĩnh vực tối bán kính s.radius quanh người ra chiêu, ba nhịp:
//   1. mở (s.open giây): vòng tối lan ra, quái trong vùng khựng lại (s.stun giây, trừ trùm);
//   2. vạn trảm (s.main giây): vô số nhát chém vô hình loé lên khắp vùng, thưa rồi dày (s.slash_rate nhát/giây), cứ s.hit_every giây
//      mọi mục tiêu trong vùng trúng s.mult × đánh thường và bị trói chậm (s.slow);
//   3. kết (s.end giây): một nhát chém lớn xé ngang lĩnh vực, trúng s.end_mult × đánh thường, rung màn, lĩnh vực vỡ tan.
// Tổng mỗi mục tiêu ở trong vùng suốt chiêu: 11 × 1 + 4 = 15 lần đánh thường (chủ dự án chốt 19:27). Người ra chiêu đứng yên, bất tử
// (a.domain, dashT) tới hết chiêu. Không có mục tiêu trong vùng thì không dùng được (domainReady, player.js chưa trừ linh lực).
// Lĩnh vực là một vùng chiêu (zones.js, onTick) có hàm vẽ riêng (render/draw-domain.js, gọi ở lớp mặt đất draw.js). PvP giữ luật trọng
// tài: mỗi nhịp gọi pvpTryHit. Bản sao so tài dùng được (duel-cast.js); người khác thấy hình (others-cast.js, không gây sát thương).
import { hitMob, dist, impactShake } from './combat.js';
import { addZone } from './zones.js';
import { slashLine, outfitColor } from './slash-fx.js';
import { pvpTryHit } from './pvp.js';
import { weaponId } from './stats.js';
import { drawDomain } from '../render/draw-domain.js';

const inZone = (z, t) => t && !t.dead && Math.hypot(t.x - z.x, t.y - z.y) <= z.radius + (t.r || 0);

export const domainReady = (game, s) => game.mobs.some(m => !m.dead && dist(game.player, m) <= s.radius + m.r);

// Mở lĩnh vực. a: người ra chiêu (null: chỉ để nhìn, người khác); hit(t, k, last): gây đòn k × đánh thường lên mục tiêu t
// foes(): danh sách mục tiêu có thể trúng
export function openDomain(game, a, s, x, y, color, foes, hit) {
  let z = { x, y, radius: s.radius, dur: s.open + s.main + s.end, tick: 0.05, color, s, a, foes, hit, nextHit: s.open, slashAcc: 0, done: 0, draw: drawDomain, onTick: z2 => step(game, z2) };
  addZone(game, z);
  z = game.zones[game.zones.length - 1];   // addZone chép ra đối tượng mới: giữ đúng cái đang chạy
  if (a) { a.domain = z; a.dashT = z.dur + 0.1; a.dashV = null; a.kx = a.ky = 0; }
  return z;
}

// Chiêu của người chơi (skills.js castSkill): dmg = đánh thường × cấp chiêu
export function castDomain(game, s, dmg) {
  const p = game.player, color = outfitColor(game, game.data.weapons[weaponId(game.save, game.data)]);
  p.meditating = false; p.riding = false;
  openDomain(game, p, s, p.x, p.y, color, () => game.mobs, (t, k, last) => {
    pvpTryHit(game);
    hitMob(game, t, dmg * k, { color, soft: !last, slow: last ? 0 : s.slow, fromX: p.x, fromY: p.y });
  });
}

// Người ra chiêu còn đang giữ lĩnh vực không (player.js, duel-ai.js bỏ đi lại, đánh khi còn): giữ bất tử, đứng yên
export function domainHold(game, a) {
  const z = a.domain;
  if (!z || !game.zones.includes(z) || z.t >= z.dur) { a.domain = null; a.dashT = Math.min(a.dashT, 0.1); return false; }
  a.dashT = Math.max(a.dashT, 0.1); a.kx = a.ky = 0; a.moving = false;
  return true;
}

function step(game, z) {
  const s = z.s, t = z.t, o1 = s.open, o2 = s.open + s.main;
  if (z.done === 0) {   // mở: khựng quái trong vùng (trùm, bản sao không bị khống chế)
    z.done = 1;
    if (z.hit) for (const m of z.foes()) if (inZone(z, m) && m.def && m.def.ai !== 'boss' && !m.def.noCc) m.stunT = Math.max(m.stunT || 0, s.stun);
    game.sfx?.('impact', 0.6);
  }
  if (t >= o1 && t < o2) {
    // nhát chém vô hình loé khắp vùng: nửa số nhát nhắm vào mục tiêu đang đứng trong vùng, nửa rải ngẫu nhiên
    const k = (t - o1) / s.main, rate = s.slash_rate[0] + (s.slash_rate[1] - s.slash_rate[0]) * k;
    z.slashAcc += rate * z.tick;
    const tgt = z.foes().filter(m => inZone(z, m));
    for (; z.slashAcc >= 1; z.slashAcc--) {
      const on = tgt.length && Math.random() < 0.5 ? tgt[Math.floor(Math.random() * tgt.length)] : null;
      const r = z.radius * 0.85 * Math.sqrt(Math.random()), q = Math.random() * Math.PI * 2;
      const cx = on ? on.x : z.x + Math.cos(q) * r, cy = (on ? on.y - 8 : z.y + Math.sin(q) * r * 0.9), ang = Math.random() * Math.PI * 2, L = 16 + Math.random() * 18;
      slashLine(game, { x: cx - Math.cos(ang) * L * 0.75, y: cy - Math.sin(ang) * L * 0.75, ang, len: L, from: 0, color: z.color });
    }
    if (z.hit && t >= z.nextHit) {   // nhịp sát thương
      z.nextHit += s.hit_every;
      for (const m of tgt) z.hit(m, s.mult, false);
      if (Math.random() < 0.6) game.sfx?.('swing', 0.5);
    }
  }
  if (t >= o2 && z.done === 1) {   // kết: nhát chém lớn xé ngang lĩnh vực
    z.done = 2;
    const ang = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.3), R = z.radius * 0.7;   // far 1.5: vệt dài gấp rưỡi len
    slashLine(game, { x: z.x - Math.cos(ang) * R, y: z.y - 8 - Math.sin(ang) * R, ang, len: R * 1.35, from: 0, color: z.color, w: 14 });
    slashLine(game, { x: z.x - Math.cos(ang + 1.7) * R * 0.6, y: z.y - 8 - Math.sin(ang + 1.7) * R * 0.6, ang: ang + 1.7, len: R * 0.8, from: 0, color: z.color, w: 9 });
    z.cut = ang;
    if (z.hit) { for (const m of z.foes()) if (inZone(z, m)) z.hit(m, s.end_mult, true); impactShake(game, z.radius); game.flashT = Math.max(game.flashT || 0, 0.12); }
  }
}
