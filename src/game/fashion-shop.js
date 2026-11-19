// Tiệm thời trang (chủ dự án 19/11/2026 12:57: "thời trang chưa có thì ẩn đi, sau mua ở tiệm thời trang giống mấy NPC Ngự Thú Sư
// với Khôi Lỗi"): NPC đứng ở sạp vải trong chợ Thiên Kiếm Tinh (data/fashion.json → shop_npc, đặt bằng tools/the-gioi/tk_moi.py).
// Lưới ô có hình bộ đồ + tên, giá Linh Thạch dưới ô như quầy Ngự Thú / Khôi Lỗi (src/ui/dialog.js); bộ đã có mờ, ghi "Đã có".
// Mua xong mặc luôn nếu đúng giới tính. Bảng Thời trang chỉ còn hiện bộ đã có (src/ui/achv-panel.js).
import { owned, buyOutfit, wear, versions } from './fashion.js';
import { coins } from './shop.js';

const vn = n => Math.round(n).toLocaleString('vi-VN');

export async function talkFashionShop(game, npc) {
  const { data } = game, s = game.save, F = data.fashion.list, T = data.fashion.shop_text || {}, name = npc.def.name;
  const sp = data.art.sprites, look = data.heroes.list[s.look] ? s.look : data.heroes.default;
  const list = [];
  for (const [id, f] of Object.entries(F)) {
    if (!f.from?.shop) continue;
    for (const g of versions(game, id)) {
      if (g !== look && !f.look) continue;   // bộ chia nam / nữ: chỉ bán bản đúng giới mình
      const own = owned(game, id, g), key = f.look?.sprite || `hero.y-${id}-${g}`;
      list.push({ id: `${id}:${g}`, label: f.name, spr: sp[key] ? key : undefined, price: vn(f.from.shop), cur: 'ui.ic-linh-thach', tag: own ? (T.owned || 'Đã có') : '', dim: own, desc: '', color: f.robe });
    }
  }
  list.push({ id: 'talk', label: T.talk || 'Trò chuyện', desc: '' }, { id: 'thoi', label: T.no || 'Thôi', desc: (T.have || 'Đang có {n} Linh Thạch').replace('{n}', vn(coins(s))) });
  const pick = await game.dialog.choose(`${name}: ${T.ask || 'Đạo hữu xem bộ nào?'}`, list);
  if (!pick || pick === 'thoi') return;
  if (pick === 'talk') { await game.dialog.say([[name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]); return; }
  const [id, g] = pick.split(':'), f = F[id];
  if (owned(game, id, g)) { game.toast((T.already || 'Đã có {name}.').replace('{name}', f.name), 2.2); return; }
  if (coins(s) < f.from.shop) { game.toast((T.poor || 'Chưa đủ Linh Thạch ({n}).').replace('{n}', vn(f.from.shop)), 2.4); return; }
  if (!buyOutfit(game, id, g)) return;
  if (g === look || f.look) wear(game, id);
  game.sfx('pickup');
  game.toast((T.done || 'Đã mua và mặc {name}.').replace('{name}', f.name), 2.6);
}
