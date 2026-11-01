// Ngày đêm theo giờ thật (data/daynight.json): pha hiện tại, hệ số đả tọa, báo khi chuyển pha.
const C = game => game.data.daynight;

export const hourNow = game => game.hourOverride ?? (d => d.getHours() + d.getMinutes() / 60)(new Date());
export const phase = (game, h = hourNow(game)) => C(game).phases.filter(p => h >= p.from).pop();
// Bầu trời vẽ ra (chủ dự án 02/11/2026: luôn là đêm trăng, cấm nắng): daynight.json → always_night thì mọi giờ đều vẽ như pha
// đêm (sao, trăng, lớp tối, quầng đèn). Chỉ đổi hình; hệ số đả tọa, câu thoại theo giờ vẫn theo pha thật (phase).
export const skyPhase = game => C(game).always_night ? C(game).phases.find(p => p.id === 'dem') : phase(game);
export const outdoor = game => !game.map.def.indoor && !(game.map.def.rooms || []).length && (game.map.def.dark || 0) < 0.3;
export const nightMul = game => outdoor(game) || game.map.id === game.data.cave.map ? phase(game).meditate : 1;

export function updateDayNight(game, dt) {
  const night = phase(game).id === 'dem' && outdoor(game);
  if (night !== game.isNight) { game.isNight = night; game.night?.(night); }   // nhạc đêm: dế, câu thưa
  if ((game.dnT = (game.dnT || 0) - dt) > 0) return;
  game.dnT = 20;
  const p = phase(game), was = game.dnPhase;
  game.dnPhase = p.from;
  if (was != null && was !== p.from && p.intro && (!C(game).always_night || p.id === 'dem')) game.toast(p.intro, 2.6);   // luôn đêm: bỏ câu bình minh, hoàng hôn
}
