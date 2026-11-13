// Kiểu chiêu 'thunder' — Thiên Phạt (chủ dự án 10/11/2026 00:14, Thiên phẩm, bán ở Vạn Bảo Lâu 100.000 Linh Thạch):
//   tụ lực s.charge giây như Phá Thiên (đứng yên, bất tử: skill-charge.js startCharge / chargeHold); sét bốn phía giật về, dồn thành quả
//   cầu trắng chói trên đầu (hình: render/draw-thunder.js);
//   rồi quả cầu vỡ: s.bolts tia sét toả tám phương, mỗi tia lướt nối liền qua tối đa s.per mục tiêu trong vòng s.radius (ưu tiên con ít bị
//   trúng, gần hướng tia), lao tiếp ra ngoài s.tail. Một con có thể bị nhiều tia lướt qua lại; mỗi lần trúng s.mult / số lần con đó bị trúng
//   × đánh thường, nên tổng mỗi con đúng s.mult (15) lần (chủ dự án chốt 00:14). Trúng sét choáng s.stun giây (trừ trùm).
// Không có mục tiêu trong vòng thì không dùng được (thunderReady). PvP giữ luật trọng tài: lúc nổ gọi pvpTryHit. Bản sao so tài dùng được
// (duel-cast.js, mục tiêu là người chơi); người khác thấy tụ lực và sét (others-cast.js, chỉ hình, tính đường sét theo quái máy họ).
import { hitMob, dist, impactShake, addFx } from './combat.js';
import { addZone } from './zones.js';
import { pvpTryHit } from './pvp.js';
import { startCharge } from './skill-charge.js';
import { skillSfx } from './skill-sfx.js';

const inR = (o, R, t) => t && !t.dead && dist(o, t) <= R + (t.r || 0);
const angGap = (a, b) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

export const thunderReady = (game, s) => game.mobs.some(m => inR(game.player, s.radius, m));

// Gốc sét: quả cầu trên đầu người ra chiêu
export const orbAt = a => ({ x: a.x, y: a.y - (a.top || 24) - 10 });

// Chiêu của người chơi (skills.js castSkill): dmg = đánh thường × cấp chiêu
export function castThunder(game, s, dmg) {
  const p = game.player;
  p.meditating = false; p.riding = false;
  startCharge(game, p, s, s.color, null, true);
  p.charge.foes = () => game.mobs;
  p.charge.hit = (m, k) => hitMob(game, m, dmg * k, { soft: true, stun: s.stun, color: '#ffffff', fromX: p.x, fromY: p.y });
}

// Đường sét: mỗi tia một danh sách điểm (gốc, các mục tiêu, đuôi) và mục tiêu trúng; hits: số lần mỗi con bị trúng
function plan(a, o, foes, s) {
  const T = foes.filter(t => inR(a, s.radius, t)), hits = new Map(T.map(t => [t, 0])), routes = [], per = Math.min(s.per, T.length);
  const spin = Math.random() * Math.PI * 2;
  for (let i = 0; i < s.bolts; i++) {
    const dir = spin + i / s.bolts * Math.PI * 2, tg = [];
    let cur = o;
    for (let j = 0; j < per; j++) {
      let best = null, bs = Infinity;
      for (const t of T) {
        if (tg.includes(t)) continue;
        const sc = hits.get(t) * s.radius * 0.6 + dist(cur, t) + (j ? 0 : angGap(Math.atan2(t.y - o.y, t.x - o.x), dir) * s.radius * 0.5);
        if (sc < bs) { bs = sc; best = t; }
      }
      if (!best) break;
      tg.push(best); hits.set(best, hits.get(best) + 1); cur = best;
    }
    const pts = [{ x: o.x, y: o.y }, ...tg.map(t => ({ x: t.x, y: t.y - 8 }))], L = pts[pts.length - 1], P = pts[pts.length - 2] || { x: L.x - Math.cos(dir), y: L.y - Math.sin(dir) };
    const ex = L.x - P.x, ey = L.y - P.y, el = Math.hypot(ex, ey) || 1, tail = tg.length ? s.tail : s.radius;
    pts.push({ x: L.x + (tg.length ? ex / el : Math.cos(dir)) * tail, y: L.y + (tg.length ? ey / el : Math.sin(dir)) * tail });
    routes.push({ pts, tg, t0: i * s.stagger });
  }
  return { routes, hits };
}

// Quả cầu vỡ (skill-charge.js release gọi khi đủ thời gian tụ): vẽ sét, hẹn giờ từng lần trúng theo tốc độ sét
export function thunderRelease(game, a, c) {
  const s = c.s, o = orbAt(a), { routes, hits } = plan(a, o, c.foes ? c.foes() : game.mobs, s), ev = [];
  let end = 0;
  for (const r of routes) {
    let d = 0;
    for (let j = 1; j < r.pts.length; j++) {
      d += Math.hypot(r.pts[j].x - r.pts[j - 1].x, r.pts[j].y - r.pts[j - 1].y);
      if (j <= r.tg.length) ev.push({ at: r.t0 + d / s.speed, t: r.tg[j - 1] });
    }
    r.len = d; end = Math.max(end, r.t0 + d / s.speed);
  }
  addFx(game, { type: 'thunder', routes, speed: s.speed, life: end + s.linger, linger: s.linger });
  if (!c.hit) return;   // người khác ra chiêu: chỉ hình
  ev.sort((u, v) => u.at - v.at);
  addZone(game, { x: o.x, y: o.y, radius: 1, dur: end + 0.1, tick: 0.02, ev, i: 0, draw() {}, onTick: z => {
    while (z.i < z.ev.length && z.ev[z.i].at <= z.t) { const e = z.ev[z.i++]; if (!e.t.dead) c.hit(e.t, s.mult / hits.get(e.t)); }
  } });
  if (a === game.player) { pvpTryHit(game); impactShake(game, 160); game.flashT = Math.max(game.flashT || 0, 0.16); game.sfx?.('impact', 1); skillSfx(game, s, 'r'); }
}
