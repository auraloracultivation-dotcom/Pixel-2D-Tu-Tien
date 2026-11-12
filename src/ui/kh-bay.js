// Bày tinh cầu khai hoang bằng bảng Bày cảnh (src/ui/bay-canh.js): game.khBay là cách lưu, kho, quyền khi đứng trên tinh cầu tông môn mình.
// Quyền: tông chủ, trưởng lão được giao (máy chủ trả bay_quyen trong p2d_kh_toi). Kho: công trình, đồ trang trí tông môn đã mua (mine.ct),
// trừ số đang đặt trong bố cục. Lưu xong dựng lại tinh cầu (đường, NPC, vùng che chở theo công trình mới: khai-hoang.js khRebuild).
import { khState, khLoad, khMine, khRebuild } from '../game/khai-hoang.js';
import { ctOf } from '../game/kh-road.js';

const net = async () => (await import('../net/khai-hoang.js')).khCalls;

export function setupKhBay(game) {
  const K = game.data['khai-hoang'], S = () => khState(game);
  const used = (list, id) => (list || []).filter(e => e[0] === id).length;
  game.khBay = {
    perm: () => { const m = S().mine; return !!(m?.bay_quyen && m.tinh?.id && game.map?.id === m.tinh.id); },
    named: id => !!ctOf(K, S().mine?.rieng, id),
    left: (id, list) => (S().mine?.ct?.[id] || 0) - used(list, id),
    kho(list) {
      const m = S().mine, R = m?.rieng || {};
      const ids = [...Object.keys(K.ct), ...Object.keys(R), ...K.do].filter(id => (m?.ct?.[id] || 0) > 0);
      return ids.map(id => ({ id, name: ctOf(K, R, id)?.name || id.replace(/^[a-z]+\./, '').replace(/-m$/, ''), left: (m.ct[id] || 0) - used(list, id) }));
    },
    async fetchOne(id) {
      await Promise.all([khLoad(game), khMine(game)]);
      const p = S().list.find(x => x.id === id);
      return p && { items: p.bay || [], ver: S().mine?.tinh?.bay_ver };
    },
    async save(id, list) {
      const v = await (await net()).saveLayout(id, list, S().mine?.tinh?.bay_ver);
      if (S().mine?.tinh) S().mine.tinh.bay_ver = v;
      return v;
    },
    after: (id, list) => khRebuild(game, id, list),
    history: async id => (await (await net()).history(id)) || [],
    restore: async hid => (await net()).restore(hid),
  };
  import('./bay-canh.js').then(M => M.createBayCanh(game));
}
