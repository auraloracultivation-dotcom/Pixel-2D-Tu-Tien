// Vuốt ve linh thú (data/pets.json → pat): đứng gần linh thú bấm nút, tim bay lên, mấy lần đầu mỗi ngày cho kinh nghiệm.
import { dist, addFx } from './combat.js';
import { gainPetExp } from './pets.js';

const C = game => game.data.pets.pat;
const pick = a => a[Math.floor(Math.random() * a.length)];
const today = () => new Date().toDateString();

export const canPat = game => !!game.pet && !game.pet.target && dist(game.pet, game.player) < C(game).range;

export function patPet(game) {
  const pet = game.pet, s = game.save, c = C(game);
  if (s.pat?.day !== today()) s.pat = { day: today(), n: 0 };
  const fresh = s.pat.n < c.per_day;
  for (let i = 0; i < 3; i++) addFx(game, { type: 'heart', x: pet.x + (i - 1) * 5, y: pet.y - i * 3, color: '#ff8ab8', life: 1 + i * 0.2 });
  game.sfx('pickup');
  if (fresh) { s.pat.n++; gainPetExp(game, c.exp, pet.id); game.persist(); }
  game.toast((fresh ? pick(c.lines) : c.tired).replace('{name}', pet.def.name), 2);
}
