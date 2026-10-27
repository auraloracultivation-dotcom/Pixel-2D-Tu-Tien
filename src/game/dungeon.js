// Bí cảnh: các phòng nối nhau, cửa khoá tới khi dọn sạch phòng, phòng cuối có boss. Độ khó ở dun-mode.js.
import { scaleMob, dungeonDone, modeOf } from './dun-mode.js';
import { partyGuest, partyHostRun, partyGhosts, partySize, partyDoor, partyDone } from './party-sync.js';

export function createDungeon(game) {
  const map = game.map, T = map.T;
  const rooms = (map.def.rooms || []).map(r => ({ ...r, entered: false, cleared: false, mobs: [] }));
  if (!rooms.length) return null;

  // Khoá mọi cửa lúc vào
  const doors = map.findTiles('D');
  for (const [x, y] of doors) map.locked.add(x + ',' + y);

  function inside(r, p) {
    const [x, y, w, h] = r.rect;
    return p.x >= x * T && p.x <= (x + w) * T && p.y >= y * T && p.y <= (y + h) * T;
  }

  function enter(r) {
    r.entered = true;
    const [x, y, w, h] = r.rect;
    for (const spec of map.def.rooms[rooms.indexOf(r)].mobs || []) {
      for (let i = 0; i < spec.n; i++) {
        const cx = r.boss ? x + w * 0.7 : x + w / 2, cy = y + h / 2;
        const p = map.freeNear(Math.floor(cx), Math.floor(cy), r.boss ? 1 : Math.min(w, h) / 2 - 1, 6);
        const m = game.spawn(spec.mob, p.x, p.y);
        m.aggro = true; m.room = r; scaleMob(game, m);
        if (partyHostRun(game)) m.hp = m.maxHp = Math.round(m.maxHp * (1 + game.data.party.hp_per * (partySize(game) - 1)));   // tổ đội: quái trâu hơn theo số người
        r.mobs.push(m);
      }
    }
    if (r.intro) { game.toast(r.intro, 2.4); game.sfx('roar'); }
    if (r.boss) { game.toast(`${r.mobs[0].def.name} xuất hiện!${game.dunMode ? ` (${modeOf(game).name})` : ''}`); game.sfx('roar'); }
  }

  return {
    rooms,
    update() {
      if (partyGuest(game)) return;   // tổ đội: phòng, cửa, boss do máy đội trưởng lo
      const team = [game.player, ...partyGhosts(game)];
      for (const r of rooms) {
        if (!r.entered && team.some(p => inside(r, p))) enter(r);
        if (r.entered && !r.cleared) {
          r.mobs = r.mobs.filter(m => !m.dead);
          const summonsLeft = r.boss && game.mobs.some(m => !m.dead);
          if (!r.mobs.length && !summonsLeft) {
            r.cleared = true;
            if (r.boss) { dungeonDone(game); partyDone(game); }
            if (r.door_x != null) {
              for (const [x, y] of doors) if (x === r.door_x) map.locked.delete(x + ',' + y);
              partyDoor(game, r.door_x);
              game.toast('Cửa đã mở!');
              game.sfx('door');
            }
          }
        }
      }
    },
  };
}
