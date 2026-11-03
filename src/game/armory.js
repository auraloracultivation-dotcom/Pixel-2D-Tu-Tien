// Quản Binh Khố (Thiên Kiếm Phong): mỗi loại vũ khí được lĩnh miễn phí một món phẩm Phàm để thử cách đánh.
import { rollItem, addItem, equip } from './items.js';
import { totalLayer } from './stats.js';

export const ARMORY_NPC = 'quan-binh-kho';

export async function talkArmory(game, npc) {
  const { data, save } = game;
  const bases = Object.entries(data.items.bases).filter(([, b]) => b.weapon);
  const byType = {};
  for (const [id, b] of bases) byType[b.weapon] ??= id;   // món đầu tiên của mỗi loại
  const opts = Object.entries(byType).map(([type, base]) => {
    const w = data.weapons[type], got = save.flags['binh-kho:' + type];
    return { id: type, label: w.name + (got ? ' (đã lĩnh)' : ''), desc: w.desc, color: w.color, base, got };
  });
  opts.push({ id: 'none', label: 'Thôi', desc: '' });
  const pick = await game.dialog.choose(`${npc.def.name}: Muốn thử loại binh khí nào? Mỗi loại lĩnh một lần.`, opts);
  const o = opts.find(x => x.id === pick);
  if (!o || o.id === 'none') return;
  if (o.got) { await game.dialog.say([[npc.def.name, 'Loại này ngươi lĩnh rồi. Muốn món tốt hơn thì ra ngoài đánh quái mà kiếm.']]); return; }
  const it = rollItem(data, save, { base: o.base, rarity: 'pham', lvl: totalLayer(save, data.realms) });
  if (!addItem(data, save, it)) { game.toast('Túi đầy! Phân giải bớt đồ.', 1.5); return; }
  save.flags['binh-kho:' + o.id] = true;
  equip(save, data, it.uid);
  game.refreshStats(); game.checkUnlocks(); game.persist();
  game.sfx('shield');
  await game.dialog.say([[npc.def.name, `Cầm lấy ${data.items.bases[o.base].name}. Ta đã mặc vào cho ngươi, muốn đổi lại thì mở Túi.`]]);
}
