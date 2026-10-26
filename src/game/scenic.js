// Góc ngắm cảnh (data/scenic.json): ngồi trên phiến đá mép đảo, ẩn nút, máy quay lùi ra, linh khí vào chậm.
// Đạo lữ đang đi cùng thì ngồi xuống bên cạnh, nói một câu, linh khí vào nhanh hơn.
import { meditateMul } from './evolve.js';
import { daoLu } from './affinity.js';
import { phase } from './daynight.js';
import { addEntry } from './journal.js';
import { bump } from './achieve.js';
import { isRaining } from './weather.js';

const C = game => game.data.scenic;

export function spotHere(game) {
  const T = game.map.T, p = game.player;
  return C(game).spots.find(s => s.map === game.map.id && Math.hypot((s.at[0] + 0.5) * T - p.x, (s.at[1] + 0.5) * T - p.y) < T * 0.9) || null;
}

export function sitView(game, spot, keepPilot = false) {
  const T = game.map.T, p = game.player;
  p.x = (spot.at[0] + 0.5) * T; p.y = (spot.at[1] + 0.5) * T; p.face = { x: 0, y: 1 }; p.meditating = false;
  game.view = { spot, t: 0 };
  game.fish = null; game.auto = false;
  if (!keepPilot) game.pilot = null;
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
  lantern(game, v, two && c);
  star(game, v, two && c, dt);
  if ((v.q = (v.q || 0) + dt) >= 1) { v.q -= 1; game.gainQi(game.data.config.meditate.qi_per_sec * C(game).qi_mul * (two ? tg.qi_mul : 1) * meditateMul(game) * game.eventMul('qi'), game.player.x, game.player.y, true); }
}

// Thả hoa đăng mỗi tối một lần: đèn trôi từ biển mây lên trời, đạo lữ ngồi cạnh nói một câu ước
function lantern(game, v, comp) {
  const L = C(game).lantern, s = game.save, day = new Date().toDateString();
  if (v.t < L.after || s.lantern === day || phase(game).id !== L.phase) return;
  s.lantern = day; bump(game, 'lantern');
  if (!s.lanternOnce) { s.lanternOnce = true; const J = game.data.journal; addEntry(game, comp ? J.lantern_with.replace('{name}', comp.npc.name) : J.lantern); }
  game.persist();
  const p = game.player, now = performance.now() / 1000;
  game.lanterns = Array.from({ length: L.n }, (_, i) => ({ x: p.x + (i - (L.n - 1) / 2) * 14 + Math.random() * 6, y: p.y + 30 + Math.random() * 20, born: now + i * 0.7, life: L.life, sway: Math.random() * 6 }));
  game.sfx('chime', 0.8);
  if (comp) { const a = L.lines[comp.id] || L.lines.default; game.say(comp.npc.name, a[Math.floor(Math.random() * a.length)], 5); }
  else game.toast(L.toast, 4);
}

// Sao băng (scenic.json → star): đêm trời quang, ngồi ngắm thì thỉnh thoảng có sao vụt qua; sao đầu mỗi đêm là một điều ước
function star(game, v, comp, dt) {
  const S = C(game).star, s = game.save, day = new Date().toDateString();
  if (phase(game).id !== S.phase || isRaining(game)) return;
  if ((v.star = (v.star ?? S.first) - dt) > 0) return;
  v.star = S.every[0] + Math.random() * (S.every[1] - S.every[0]);
  (game.meteors ||= []).push({ born: performance.now() / 1000, life: S.life, x: 0.35 + Math.random() * 0.55, y: 0.05 + Math.random() * 0.2 });
  if (s.star === day) return;
  s.star = day; game.persist();
  game.gainQi(game.data.config.meditate.qi_per_sec * S.qi_sec, game.player.x, game.player.y);
  if (comp) { const a = S.lines[comp.id] || S.lines.default; game.say(comp.npc.name, a[Math.floor(Math.random() * a.length)], 5); }
  else game.toast(S.toast, 4);
}

// Máy quay khi đang ngắm: nhìn xuống phía biển mây
export const viewPan = game => game.view ? Math.min(1, game.view.t / 3) * C(game).pan : 0;
