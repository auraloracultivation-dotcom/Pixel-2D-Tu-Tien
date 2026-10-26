// Lưu tiến trình bản chơi tạm trong máy (localStorage). Khi có máy chủ, lưu qua RPC ở src/net/.
const KEY = 'p2d.save.v1';
const keyOf = owner => `${KEY}:${owner || 'guest'}`; // mỗi tài khoản một bản lưu

export function newSave(cfg) {
  return {
    step: 0, stepDone: false,
    map: cfg.start.map, spawn: cfg.start.spawn,
    element: null, weapon: cfg.start.weapon,
    realm: 0, layer: 1, qi: 0,
    flags: {}, items: {},
  };
}

export function loadSave(owner) {
  try {
    const old = owner === 'guest' || !owner ? localStorage.getItem(KEY) : null; // bản lưu trước khi có tài khoản
    return JSON.parse(localStorage.getItem(keyOf(owner)) || old) || null;
  } catch { return null; }
}

export function writeSave(owner, s) {
  try { localStorage.setItem(keyOf(owner), JSON.stringify(s)); } catch { /* chế độ riêng tư: chơi không lưu */ }
}
