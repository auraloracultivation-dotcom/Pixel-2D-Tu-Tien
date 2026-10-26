// Ngày đêm theo giờ thật (data/daynight.json): pha hiện tại, hệ số đả tọa, báo khi chuyển pha.
const C = game => game.data.daynight;

export const hourNow = game => game.hourOverride ?? (d => d.getHours() + d.getMinutes() / 60)(new Date());
export const phase = (game, h = hourNow(game)) => C(game).phases.filter(p => h >= p.from).pop();
export const outdoor = game => !game.map.def.indoor && !(game.map.def.rooms || []).length && (game.map.def.dark || 0) < 0.3;
export const nightMul = game => outdoor(game) || game.map.id === game.data.cave.map ? phase(game).meditate : 1;

export function updateDayNight(game, dt) {
  if ((game.dnT = (game.dnT || 0) - dt) > 0) return;
  game.dnT = 20;
  const p = phase(game), was = game.dnPhase;
  game.dnPhase = p.from;
  if (was != null && was !== p.from && p.intro) game.toast(p.intro, 2.6);
}
