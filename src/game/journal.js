// Nhật ký tu tiên (data/journal.json): tự ghi dấu mốc vào save.journal [{t, text}], mới nhất ở cuối.
const C = game => game.data.journal;

export function addEntry(game, text) {
  const j = game.save.journal ??= [];
  j.push({ t: Date.now(), text });
  if (j.length > C(game).max) j.splice(0, j.length - C(game).max);
}

const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

// So bản lưu với ảnh chụp lần trước (lưu trong save.jSnap), có gì mới thì ghi. Bản lưu cũ chưa có ảnh chụp thì chỉ ghi nhận, không ghi lại chuyện cũ.
export function updateJournal(game, dt) {
  if ((game.jT = (game.jT || 0) - dt) > 0 || !game.save) return;
  game.jT = 1;
  const s = game.save, cfg = C(game), d = game.data;
  const now = { realm: s.realm, visited: Object.keys(s.visited || {}), flags: Object.keys(cfg.flags).filter(f => s.flags[f]),
    daoLu: s.daoLu || null, comps: Object.keys(s.comps || {}), pets: Object.keys(s.pets || {}), fish: cfg.rare_fish.filter(f => s.mats?.[f] > 0) };
  const was = s.jSnap;
  s.jSnap = now;
  if (!was) { if (!s.journal) { s.journal = []; if (!s.step) addEntry(game, cfg.start); } return; }
  const added = (a, b) => a.filter(x => !b.includes(x));
  if (now.realm > was.realm) addEntry(game, fill(cfg.realm, { realm: d.realms.names[now.realm] }));
  for (const m of added(now.visited, was.visited)) if (d.maps[m]) addEntry(game, fill(cfg.visit, { map: d.maps[m].name }));
  for (const f of added(now.flags, was.flags)) addEntry(game, cfg.flags[f]);
  if (now.daoLu && now.daoLu !== was.daoLu) addEntry(game, fill(cfg.dao_lu, { name: d.npcs[now.daoLu].name }));
  for (const c of added(now.comps, was.comps)) addEntry(game, fill(cfg.comp, { name: d.npcs[c]?.name || c }));
  for (const p of added(now.pets, was.pets)) addEntry(game, fill(cfg.pet, { name: d.pets.pets[p]?.name || p }));
  for (const f of added(now.fish, was.fish)) addEntry(game, fill(cfg.fish, { name: d.cave.materials[f].name }));
}

export const journal = game => [...(game.save.journal || [])].reverse();
