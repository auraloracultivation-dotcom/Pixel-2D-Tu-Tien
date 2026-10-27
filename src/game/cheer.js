// Người đang đi cùng cổ vũ lúc đánh (data/praise.json → fight, chủ dự án muốn đạo lữ vừa đánh cùng vừa trò chuyện, khen):
// hạ nhiều con một lúc, hạ tinh anh, thắng khi máu thấp, mỗi chuỗi n con, máu tụt thì nhắc, đang đánh thì thỉnh thoảng hô một câu.
// Hiện thành bong bóng trên đầu người đi cùng. Đạo lữ nói thường hơn bạn đồng hành (cd, chance theo dao_lu / comp).
import { daoLu } from './affinity.js';
import { dist } from './combat.js';

const F = game => game.data.praise.fight;
const pick = a => a[Math.floor(Math.random() * a.length)];

function speak(game, kind, vars = {}, force = false) {
  const c = game.comp, f = F(game);
  if (!c || !game.save || game.dialog.open || game.story?.busy) return false;
  const who = c.id === daoLu(game) ? 'dao_lu' : 'comp';
  if (!force && (game.time < (game.cheerT || 0) || Math.random() > f.chance[who])) return false;
  const L = game.data.praise.lines, set = L[c.id]?.[kind] || L.default[kind];
  if (!set) return false;
  c.bubble = { text: pick(set).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? ''), t: 0 };
  game.cheerT = game.time + f.cd[who];
  game.compChatT = Math.max(game.compChatT || 0, f.quiet);   // lời nói vu vơ đợi một chút cho khỏi chồng
  return true;
}

// Gọi mỗi lần hạ quái (ngoài tháp, bí cảnh tài nguyên)
export function cheerKill(game, m) {
  const f = F(game), p = game.player, now = game.time, st = game.cheer ??= { kills: [], streak: 0 };
  st.kills = st.kills.filter(t => now - t < f.multi.sec); st.kills.push(now);
  st.streak++;
  if (!game.comp || m.def.ai === 'boss') return;   // hạ boss đã có lời khen lớn (praise.js)
  if (st.streak % f.streak_every === 0) { speak(game, 'streak', { n: st.streak }, true); return; }
  if (p.hp > 0 && p.hp / p.maxHp < f.clutch_hp) { speak(game, 'clutch'); return; }
  if (m.elite || m.rare) { speak(game, 'elite'); return; }
  if (st.kills.length >= f.multi.n) { st.kills = []; speak(game, 'multi'); }
}

// Máu tụt thì nhắc một lần mỗi lần tụt; đang có quái quanh mình thì cứ fight_every giây có thể hô một câu
export function updateCheer(game, dt) {
  const c = game.comp, p = game.player, f = F(game);
  if (!c || !game.save || (game.cheerPoll = (game.cheerPoll || 0) - dt) > 0) return;
  game.cheerPoll = 0.5;
  const r = p.hp / p.maxHp;
  if (r > 0 && r < f.hurt_hp && !game.cheerLow) { game.cheerLow = true; speak(game, 'hurt', {}, true); }
  else if (r > f.hurt_hp + 0.2) game.cheerLow = false;
  if (!game.mobs.some(m => !m.dead && dist(m, p) < f.range)) { game.cheerFight = 0; return; }
  if ((game.cheerFight = (game.cheerFight || 0) + 0.5) >= f.fight_every) { game.cheerFight = 0; speak(game, 'fight'); }
}
