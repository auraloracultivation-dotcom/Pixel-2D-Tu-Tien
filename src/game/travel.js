// Đi đường giữa các bản đồ: đảo → đảo là cảnh ngự kiếm bay qua biển mây (vẽ ở src/render/flight.js),
// ra vào bí cảnh là xoáy truyền tống. Bản đồ mới nạp ở giữa cảnh, người chơi chạm màn hình để bỏ qua.
const isDungeon = def => (def.rooms || []).length > 0;

export function startTrip(game, to, { text, with: withNpc, kind: force } = {}, onMidway) {
  const from = game.map?.def, toDef = game.data.maps[to];
  const kind = force || ((from && isDungeon(from)) || isDungeon(toDef) ? 'portal' : 'flight');
  const cfg = game.data.config.travel[kind];
  return new Promise(resolve => {
    game.trip = { kind, t: 0, dur: cfg.dur, toDef, with: withNpc, text, midway: onMidway, loaded: false, resolve };
    game.sfx(kind === 'portal' ? 'portal' : 'fly');
  });
}

export function updateTrip(game, dt) {
  const tr = game.trip, input = game.input;
  tr.t += dt;
  // Bỏ qua: chạm màn hình sau 1 giây thì tua tới đoạn đáp
  if (input.taps.length && tr.t > 1) tr.t = Math.max(tr.t, tr.dur * 0.9);
  input.clear();
  if (!tr.loaded && tr.t >= tr.dur * 0.5) { tr.loaded = true; tr.midway(); }
  if (tr.t >= tr.dur) {
    if (!tr.loaded) tr.midway();
    game.trip = null;
    tr.resolve();
  }
}
