// Lưu tiến trình bản chơi tạm trong máy (localStorage). Khi có máy chủ, lưu qua RPC ở src/net/.
const KEY = 'p2d.save.v1';

export function newSave(cfg) {
  return {
    step: 0, stepDone: false,
    map: cfg.start.map, spawn: cfg.start.spawn,
    element: null, weapon: cfg.start.weapon,
    realm: 0, layer: 1, qi: 0,
    flags: {}, items: {},
  };
}

export function loadSave() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* chế độ riêng tư: chơi không lưu */ }
}
