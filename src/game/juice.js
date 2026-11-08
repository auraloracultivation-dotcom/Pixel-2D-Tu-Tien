// Cảm giác đánh có hồn (chủ dự án 09/11/2026 00:30: học clip mẫu, "10 người thì 9 người bỏ vì nhạt"). Số ở data/juice.json.
// Đòn trúng: tia toả hình sao + chớp trắng giữa + bụi vụn văng; quái chết: vòng sóng, vụn, đốm linh khí hút về người;
// đạn chiêu kéo khói vòng trắng, lướt để bụi; chiêu lớn chớp màn + rung; Liên Kích (đếm đòn liên tiếp, mốc thì hô to);
// thanh Nộ đầy thì Bạo Nộ: sát thương tăng, quầng lửa, nhạc dồn. Vẽ ở src/render/draw-juice.js.
import { fxOk } from './fx-budget.js';
const TAU = Math.PI * 2;
const J = game => game.data.juice;
export const juice = game => (game.juice ||= { parts: [], combo: 0, comboT: 0, comboPop: 0, call: null, rage: 0, rageOn: 0, idle: 99, vig: 0, trailT: 0, dashT: 0 });

function push(game, p) {
  const S = juice(game), max = J(game)?.max_parts ?? 160;
  if (S.parts.length >= max) S.parts.splice(0, S.parts.length - max + 1);   // nhiều quá: bỏ hạt cũ nhất, máy yếu không giật
  S.parts.push({ t: 0, ...p });
}

function debris(game, x, y, n, color, sp = 70) {
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4, v = sp * (0.5 + Math.random());
    push(game, { k: 'deb', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.35 + Math.random() * 0.3, s: 1 + Math.random() * 1.5, color });
  }
}

// Đòn của mình trúng quái. soft: nhịp vùng chiêu (rất nhiều đòn nhỏ): chỉ hiện mỗi soft_every đòn
export function juiceHit(game, x, y, color, crit, soft) {
  const C = J(game)?.hit; if (!C) return;
  const S = juice(game);
  S.idle = 0; addRage(game, J(game).rage.hit);
  combo(game);
  const N = J(game).note;   // nốt đàn theo Liên Kích, leo dần (data/juice.json → note)
  if (N?.on && (!soft || crit)) game.note?.((S.combo - 1) % N.steps + (crit ? N.crit_up : 0), crit ? N.v_crit : N.v);
  if (soft && S.combo % (C.soft_every || 3) && !crit) return;
  if (!fxOk(game, crit ? 'crit' : 'hit')) return;   // đánh đông quái: tia toả đòn thường trong hạn mức (src/game/fx-budget.js)
  const n = crit ? C.rays_crit : C.rays, rot = Math.random() * TAU;
  push(game, { k: 'burst', x, y, n, rot, len: crit ? C.len_crit : C.len, core: crit ? C.core_crit : C.core, life: crit ? C.life_crit : C.life, color: color || '#fff', crit });
  if (crit) push(game, { k: 'ring', x, y, r: C.len_crit * 1.2, life: 0.25, color: color || '#ffe98a' });
  debris(game, x, y, crit ? C.debris_crit : C.debris, '#e8e2d0');
}

export function juiceKill(game, m) {
  const C = J(game)?.kill; if (!C) return;
  const boss = m.def.ai === 'boss';
  if (!boss && !fxOk(game, 'kill')) { if (!m.remote) addRage(game, J(game).rage.kill); return; }   // hạ hàng loạt: vòng sóng, vụn, đốm chỉ trong hạn mức
  push(game, { k: 'ring', x: m.x, y: m.y - m.r * 0.5, r: C.ring + m.r, life: 0.32, color: m.def.color || '#fff' });
  debris(game, m.x, m.y - m.r * 0.5, C.debris, m.def.color || '#ccc', 110);
  if (m.remote) return;
  const N = J(game).note;
  if (N?.on) setTimeout(() => game.note?.(N.kill + (boss ? N.crit_up : 0), N.v_crit), 70);   // hạ quái: thêm một nốt cao ngân sau tiếng chém
  const n = Math.min(boss ? C.orbs_boss : C.orbs, Math.max(0, (C.orbs_max ?? 99) - S_orbs(game)));
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU, v = 60 + Math.random() * 70;
    push(game, { k: 'orb', x: m.x, y: m.y - m.r * 0.6, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 40, life: 2.2, home: 0.25 + Math.random() * 0.2, color: C.orb_color });
  }
  addRage(game, J(game).rage.kill);
}

const S_orbs = game => juice(game).parts.filter(q => q.k === 'orb').length;   // đốm đang bay, giữ dưới kill.orbs_max

export function juiceHurt(game, frac) {
  const R = J(game)?.rage; if (!R) return;
  const S = juice(game);
  S.idle = 0; addRage(game, R.hurt * frac * 100);
  if (frac >= J(game).hurt.vig) S.vig = J(game).hurt.life;
}

// Chiêu lớn vừa tung: chớp màn dịu, rung
export function juiceCast(game, s) {
  const C = J(game)?.cast; if (!C || !s) return;
  const p = game.player, big = s.ult || C.big_types.includes(s.type);
  push(game, { k: 'rune', x: p.x, y: p.y, r: big ? C.rune_big : C.rune, life: C.rune_life, color: s.color || C.rune_color, rot: Math.random() * TAU });   // trận đồ dưới chân khi tung chiêu (clip)
  if (!big) return;
  game.flashT = Math.max(game.flashT || 0, C.flash);
  game.screen.shake(C.shake, 0.25);
}

function combo(game) {
  const S = juice(game), C = J(game).combo;
  S.combo = S.comboT > 0 ? S.combo + 1 : 1; S.comboT = C.window; S.comboPop = 0.12;
  if (C.marks.includes(S.combo)) {
    const i = C.marks.indexOf(S.combo);
    S.call = { text: `Liên Kích ${S.combo}!`, t: 0, color: C.colors[Math.min(C.colors.length - 1, i + 1)] };
    game.sfx('combo', 0.6 + i * 0.1);
  }
}

function addRage(game, v) {
  const S = juice(game), R = J(game).rage;
  if (S.rageOn > 0 || !v) return;
  S.rage = Math.min(R.full, S.rage + v);
  if (S.rage < R.full) return;
  S.rageOn = R.dur; S.rage = R.full;   // Bạo Nộ: thanh rút dần theo thời gian
  S.call = { text: 'Bạo Nộ!', t: 0, color: R.color, big: true };
  game.sfx('rage'); game.flashT = Math.max(game.flashT || 0, 0.3);
  game.screen.shake(4, 0.4); game.hitstop = Math.max(game.hitstop, 0.08);
  push(game, { k: 'ring', x: game.player.x, y: game.player.y - 8, r: 46, life: 0.5, color: R.color });
}

// Nhân sát thương khi Bạo Nộ (không áp lên boss thế giới, bản sao so tài, quái của đồng đội: máy chủ/đối thủ tính riêng)
export function rageMul(game, m) {
  const S = game.juice;
  return S?.rageOn > 0 && !m.wboss && !m.duel && !m.remote && !m.def?.noCc ? J(game).rage.mul : 1;
}

export function updateJuice(game, dt) {
  const D = J(game); if (!D) return;
  const S = juice(game), p = game.player;
  S.comboT -= dt; S.comboPop = Math.max(0, S.comboPop - dt); S.vig = Math.max(0, S.vig - dt);
  if (S.comboT <= 0) S.combo = 0;
  if (S.call && (S.call.t += dt) > 1.3) S.call = null;
  S.idle += dt;
  if (S.rageOn > 0) {
    S.rageOn -= dt; S.rage = D.rage.full * Math.max(0, S.rageOn) / D.rage.dur;
    if (S.rageOn <= 0) S.rage = 0;
    if (Math.random() < dt * 30) push(game, { k: 'ember', x: p.x + (Math.random() - 0.5) * 16, y: p.y - Math.random() * 6, vx: (Math.random() - 0.5) * 10, vy: -30 - Math.random() * 30, life: 0.7, color: Math.random() < 0.5 ? D.rage.color : D.rage.core });
  } else if (S.idle > D.rage.idle) S.rage = Math.max(0, S.rage - D.rage.decay * dt);
  // khói vòng sau đạn chiêu của mình, bụi khi lướt
  if ((S.trailT -= dt) <= 0) {
    S.trailT = D.trail.every;
    for (const b of game.bullets) if (b.sk) push(game, { k: 'smoke', x: b.x, y: b.y, r: D.trail.r, life: D.trail.life, a: D.trail.alpha });
  }
  if (p.dashT > 0 && (S.dashT -= dt) <= 0) { S.dashT = D.trail.dash_every; push(game, { k: 'smoke', x: p.x + (Math.random() - 0.5) * 4, y: p.y - 1, r: 2.5, life: 0.4, a: 0.45, grow: 2.2 }); }
  for (const q of S.parts) {
    q.t += dt;
    if (q.k === 'deb') { q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
    else if (q.k === 'ember') { q.x += q.vx * dt; q.y += q.vy * dt; }
    else if (q.k === 'orb') {
      if (q.t < q.home) { q.vx *= 1 - 3 * dt; q.vy *= 1 - 3 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
      else {   // hút về người chơi, nhanh dần; tới nơi thì loé nhỏ
        const dx = p.x - q.x, dy = p.y - 8 - q.y, d = Math.hypot(dx, dy) || 1, v = D.kill.orb_speed * (1 + (q.t - q.home) * 3);
        if (d < 6) { q.t = q.life; push(game, { k: 'burst', x: p.x, y: p.y - 8, n: 4, rot: Math.random() * TAU, len: 5, core: 3, life: 0.12, color: q.color }); continue; }
        q.x += dx / d * Math.min(d, v * dt); q.y += dy / d * Math.min(d, v * dt);
      }
    }
  }
  S.parts = S.parts.filter(q => q.t < q.life);
}
