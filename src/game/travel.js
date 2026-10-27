// Đi đường giữa các bản đồ: tinh cầu → tinh cầu là bay truyền tống qua không gian sao (lượn nhặt sao, src/game/space-trip.js,
// vẽ ở src/render/draw-space.js); ra vào bí cảnh là xoáy truyền tống. Bản đồ mới nạp ở giữa cảnh.
import { flightDur, initSpace, updateSpace } from './space-trip.js';

const isDungeon = def => (def.rooms || []).length > 0;

export function startTrip(game, to, { text, with: withNpc, kind: force } = {}, onMidway) {
  const from = game.map?.def, toDef = game.data.maps[to];
  const kind = force || ((from && isDungeon(from)) || isDungeon(toDef) ? 'portal' : 'flight');
  const dur = kind === 'flight' ? flightDur(game.data, game.map?.id, to) : game.data.config.travel[kind].dur;
  return new Promise(resolve => {
    game.trip = { kind, t: 0, dur, from: game.map?.id, to, toDef, with: withNpc, text, midway: onMidway, loaded: false, resolve };
    if (kind === 'flight') initSpace(game, game.trip);
    game.sfx(kind === 'portal' ? 'portal' : 'fly');
  });
}

export function updateTrip(game, dt) {
  const tr = game.trip, input = game.input;
  const mul = tr.space ? updateSpace(game, tr, dt) : 1;
  tr.t += dt * mul;
  // Bỏ qua sau 1 giây: bay thì chạm nửa phải màn (nửa trái để lượn), xoáy thì chạm đâu cũng được
  const skip = input.taps.some(p => !tr.space || p.x > window.innerWidth * 0.6);
  if (skip && tr.t > 1) tr.t = Math.max(tr.t, tr.dur * 0.9);
  input.clear();
  if (!tr.loaded && tr.t >= tr.dur * 0.5) { tr.loaded = true; tr.midway(); }
  if (tr.t >= tr.dur) {
    if (!tr.loaded) tr.midway();
    game.trip = null;
    if (tr.space?.got) game.toast(game.data.config.travel.space.texts.got.replace('{n}', tr.space.got), 2);
    tr.resolve();
  }
}
