// Góc ngắm cảnh (data/scenic.json): ngồi trên phiến đá mép đảo, ẩn nút, máy quay lùi ra, linh khí vào chậm.
// Đạo lữ đang đi cùng thì ngồi xuống bên cạnh, nói một câu, linh khí vào nhanh hơn.
import { meditateMul } from './evolve.js';
import { daoLu } from './affinity.js';
import { phase } from './daynight.js';

const C = game => game.data.scenic;

export function spotHere(game) {
  const T = game.map.T, p = game.player;
  return C(game).spots.find(s => s.map === game.map.id && Math.hypot((s.at[0] + 0.5) * T - p.x, (s.at[1] + 0.5) * T - p.y) < T * 0.9) || null;
}

export function sitView(game, spot) {
  const T = game.map.T, p = game.player;
  p.x = (spot.at[0] + 0.5) * T; p.y = (spot.at[1] + 0.5) * T; p.face = { x: 0, y: 1 }; p.meditating = false;
  game.view = { spot, t: 0 };
  game.fish = null; game.auto = false; game.pilot = null;
  document.body.classList.add('ngam-canh');
  game.screen.zoomTo(C(game).zoom);
  game.toast(`${spot.name}. ${spot.line}`, 5);
}

export function standUp(game) {
  if (!game.view) return;
  game.view = null;
  document.body.classList.remove('ngam-canh');
  game.screen.zoomTo(1);
}

export function updateView(game, dt) {
  const v = game.view;
  if (!v) return;
  if (game.player.moving || game.input.joy || game.input.held.size) { standUp(game); return; }
  v.t += dt;
  const tg = C(game).together, c = game.comp, two = c && c.id === daoLu(game) && v.t >= tg.after;
  if (two) {   // ngồi sát bên, nói một câu lúc vừa ngồi
    c.x = game.player.x + 11; c.y = game.player.y + 1; c.face = -1;
    if (!v.said) { v.said = true; const L = tg.lines[c.id] || tg.lines.default, ph = phase(game).id, a = L[ph] || tg.lines.default[ph]; game.say(c.npc.name, a[Math.floor(Math.random() * a.length)], 4); }
  }
  if ((v.q = (v.q || 0) + dt) >= 1) { v.q -= 1; game.gainQi(game.data.config.meditate.qi_per_sec * C(game).qi_mul * (two ? tg.qi_mul : 1) * meditateMul(game) * game.eventMul('qi'), game.player.x, game.player.y, true); }
}

// Máy quay khi đang ngắm: nhìn xuống phía biển mây
export const viewPan = game => game.view ? Math.min(1, game.view.t / 3) * C(game).pan : 0;
