// Bay truyền tống giữa các tinh cầu: người chơi lượn lên xuống nhặt sao linh khí, va mảnh vỡ hư không chỉ chậm lại.
// Không bao giờ thua. Toạ độ theo phần màn: x 0..1 (trái → phải), y 0..1 (trên → dưới). Vẽ ở src/render/draw-space.js.
import { orbitOf } from './starmap.js';
import { qiNeed, killQiMul } from './stats.js';
import { addCoins } from './shop.js';

export const PX = 0.32;            // chỗ người bay theo chiều ngang
const LANE = [0.2, 0.84];          // giới hạn lượn
const CRUISE = [0.16, 0.8];        // đoạn giữa chuyến có sao, mảnh vỡ

function rnd(seed) { let s = seed >>> 0 || 1; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }

// Thời gian bay theo số vòng quỹ đạo cách nhau trên tinh đồ
export function flightDur(data, fromId, toId) {
  const f = data.config.travel.flight, sm = data.starmap;
  const a = orbitOf(sm, fromId), b = orbitOf(sm, toId);
  return Math.min(f.max, f.dur + (a && b ? Math.abs(a - b) : 1) * f.per_orbit);
}

// Sao và mảnh vỡ: mỗi món có lúc đi ngang chỗ người bay (k theo tiến độ chuyến) và độ cao y
export function initSpace(game, tr) {
  const c = game.data.config.travel.space, r = rnd(Date.now());
  const at = () => CRUISE[0] + r() * (CRUISE[1] - CRUISE[0]), y = () => LANE[0] + r() * (LANE[1] - LANE[0]);
  tr.space = {
    lane: 0.55, laneV: 0, manual: -99, slowT: 0, got: 0, gold: 0, pops: [],
    items: [
      ...Array.from({ length: c.stars }, () => ({ kind: 'star', k: at(), y: y() })),
      ...(r() < c.gold_p ? [{ kind: 'gold', k: at(), y: y() }] : []),
      ...Array.from({ length: c.rocks }, () => ({ kind: 'rock', k: at(), y: y(), spin: r() * 6 })),
    ],
  };
}

// Tự lượn: nhắm món tốt sắp tới, né mảnh vỡ ngay trước mặt
function autoLane(sp, k, dur) {
  const ahead = sp.items.filter(i => !i.done && i.k > k && i.k < k + 2.2 / dur);
  const rock = ahead.find(i => i.kind === 'rock' && Math.abs(i.y - sp.lane) < 0.09 && i.k < k + 0.7 / dur);
  if (rock) return rock.y > 0.5 ? rock.y - 0.18 : rock.y + 0.18;
  const good = ahead.filter(i => i.kind !== 'rock').sort((a, b) => a.k - b.k)[0];
  return good ? good.y : sp.lane;
}

// Trả về hệ số thời gian (va mảnh vỡ thì chậm lại)
export function updateSpace(game, tr, dt) {
  const sp = tr.space, c = game.data.config.travel.space, input = game.input;
  const k0 = tr.t / tr.dur;
  const ay = input.axis().y;
  if (Math.abs(ay) > 0.15) { sp.manual = tr.t; sp.lane += ay * c.steer * dt; }
  else if (tr.t - sp.manual > c.auto_after) {
    const want = autoLane(sp, k0, tr.dur);
    sp.lane += Math.max(-c.steer * dt, Math.min(c.steer * dt, want - sp.lane));
  }
  sp.lane = Math.max(LANE[0], Math.min(LANE[1], sp.lane));
  sp.slowT = Math.max(0, sp.slowT - dt);
  const mul = sp.slowT > 0 ? c.slow : 1;
  const k1 = (tr.t + dt * mul) / tr.dur;
  for (const it of sp.items) {
    if (it.done || it.k <= k0 || it.k > k1) continue;   // chỉ xét lúc món đi ngang chỗ người bay
    if (Math.abs(it.y - sp.lane) > c.reach) continue;
    it.done = true;
    if (it.kind === 'rock') { sp.slowT = c.slow_t; game.screen.shake(4, 0.25); game.sfx?.('hurt'); continue; }
    if (it.kind === 'gold') {
      const n = c.gold_coins * ((game.save.realm || 0) + 1);
      addCoins(game, n); sp.gold += n; sp.pops.push({ text: c.texts.gold.replace('{n}', n), t: 0, color: '#ffd76a' });
    } else {
      const n = Math.max(1, Math.round(qiNeed(game.save, game.data.realms) * c.star_qi * killQiMul(game.save, game.data.realms)));   // giảm theo cảnh giới như linh khí hạ quái, kẻo bay qua lại lợi hơn đánh quái
      game.gainQi(n, 0, 0, true); sp.got++; sp.pops.push({ text: c.texts.qi.replace('{n}', n), t: 0, color: '#bff4ff' });
    }
    game.sfx?.('pickup');
  }
  for (const p of sp.pops) p.t += dt;
  sp.pops = sp.pops.filter(p => p.t < 1.2);
  return mul;
}
