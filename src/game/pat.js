// Vuốt ve linh thú (data/pets.json → pat): đứng gần linh thú bấm nút, tim bay lên, mấy lần đầu mỗi ngày cho kinh nghiệm.
// Linh thú tha đồ về (pets.json → fetch): chủ đả tọa lâu thì thỉnh thoảng nó tha về một món nhỏ.
import { dist, addFx } from './combat.js';
import { gainPetExp } from './pets.js';
import { grant } from './daily.js';
import { bump } from './achieve.js';

const C = game => game.data.pets.pat, F = game => game.data.pets.fetch;
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();

// Nút Vuốt ve chỉ hiện khi hợp lẽ: không đang phi thú cưỡi; hết lượt có kinh nghiệm trong ngày thì chỉ hiện lúc đứng yên tự chơi
// (chơi thử 01/11/2026: linh thú luôn bám sát nên nút Vuốt ve đứng lì cạnh nút chiêu cả buổi, kể cả khi đang cưỡi, đang tự đánh).
const patsLeft = game => game.save.pat?.day === today() ? C(game).per_day - game.save.pat.n : C(game).per_day;
export const canPat = game => !!game.pet && !game.pet.target && dist(game.pet, game.player) < C(game).range;
export const showPat = game => canPat(game) && !game.player.riding && (patsLeft(game) > 0 || (!game.player.moving && !game.auto && !game.pilot));

export function patPet(game) {
  const pet = game.pet, s = game.save, c = C(game);
  if (s.pat?.day !== today()) s.pat = { day: today(), n: 0 };
  const fresh = s.pat.n < c.per_day;
  for (let i = 0; i < 3; i++) addFx(game, { type: 'heart', x: pet.x + (i - 1) * 5, y: pet.y - i * 3, color: '#ff8ab8', life: 1 + i * 0.2 });
  game.sfx('pickup'); bump(game, 'pat');
  if (fresh) { s.pat.n++; gainPetExp(game, c.exp, pet.id); game.persist(); }
  game.toast((fresh ? pick(c.lines) : c.tired).replace('{name}', pet.def.name), 2);
}

export function updatePetFetch(game, dt) {
  const pet = game.pet, c = F(game), s = game.save;
  if (!pet || !game.player.meditating || game.dungeon) { game.fetchT = c.every; return; }
  if ((game.fetchT = (game.fetchT ?? c.every) - dt) > 0) return;
  game.fetchT = c.every;
  if (s.fetch?.day !== today()) s.fetch = { day: today(), n: 0 };
  if (s.fetch.n >= c.per_day || Math.random() > c.chance) return;
  s.fetch.n++;
  const f = pick(c.finds), got = grant(game, f.give);
  for (let i = 0; i < 2; i++) addFx(game, { type: 'heart', x: pet.x + (i - 0.5) * 6, y: pet.y - i * 3, color: '#ff8ab8', life: 1.2 });
  game.sfx('pickup');
  game.toast(`${f.text.replace('{name}', pet.def.name)} (${got.join(', ')})`, 4.5);
}
