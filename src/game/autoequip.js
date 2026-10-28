// Tự mặc đồ khi đang tự hành: món mới nhặt được mà mặc vào lực chiến cao hơn thì thay luôn.
// Vũ khí chỉ thay bằng cùng loại đang dùng; pháp bảo đổi chiêu nên để người chơi tự chọn.
// Tự cường hóa: món đang mặc cấp thấp nhất, chỉ tới dưới mốc có thể tụt cấp, luôn chừa enhance_keep Tinh Thiết.
// Túi đầy khi đang tự hành: phân giải món Phàm, Linh cũ nhất không mặc để nhặt món mới, thay vì để mất.
import { playerStats } from './stats.js';
import { power } from './achieve.js';
import { equip, itemName, rarityOf, salvage, isEquipped, equipped } from './items.js';
import { enhance, enhanceCost } from './enhance.js';
import { salvageIron } from './cave.js';
import { dailyEvent } from './daily.js';
import { salvageArt } from './refine.js';

export const trial = (game, slot, uid) => {   // lực chiến nếu đặt uid vào ô slot (túi đồ dùng để so sánh)
  const s = game.save, old = s.equip[slot];
  s.equip[slot] = uid;
  const v = power(game, playerStats(s, game.data));
  if (old === undefined) delete s.equip[slot]; else s.equip[slot] = old;
  return v;
};

export function autoEquip(game) {
  const s = game.save, d = game.data, B = d.items.bases;
  if (!s.bag?.length || (s.aeUid ?? 0) >= s.nextUid - 1) return;
  const fresh = s.bag.filter(i => i.uid > (s.aeUid ?? 0));
  s.aeUid = s.nextUid - 1;
  for (const it of fresh) {
    const b = B[it.base], slot = b.slot;
    const wt = b.weapon || it.wt;   // Đạo Vận Binh: loại vũ khí lúc nhận
    if (b.art || (wt && wt !== s.weapon)) continue;
    const now = power(game, playerStats(s, d)), v = trial(game, slot, it.uid);
    if (v <= now) continue;
    equip(s, d, it.uid);
    game.refreshStats(); game.persist();
    game.toast(`Tự mặc [${rarityOf(d.items, it.rarity).name}] ${itemName(d, it)}: lực chiến +${(v - now).toLocaleString('vi-VN')}`, 2.4);
  }
}

// Túi đầy mà nhặt thêm (chỉ khi tự hành): phân giải một món độ hiếm thấp (Phàm, Linh) không mặc, không thấp hơn món mới.
// Không có món nào như vậy thì phân giải luôn món mới. Trả về true nếu món mới đã vào túi được.
export function makeRoom(game, item) {
  const s = game.save, d = game.data, R = d.items.rarities.map(r => r.id), cheap = R.slice(0, 2);
  const rank = it => R.indexOf(it.rarity);
  const old = s.bag.filter(i => cheap.includes(i.rarity) && !isEquipped(s, i.uid) && rank(i) <= rank(item)).sort((a, b) => rank(a) - rank(b) || a.uid - b.uid)[0];
  const gone = old || item, name = `[${rarityOf(d.items, gone.rarity).name}] ${itemName(d, gone)}`;
  if (old) salvage(d, s, old.uid);
  else s.mats['tay-luyen-thach'] = (s.mats['tay-luyen-thach'] || 0) + rarityOf(d.items, item.rarity).salvage;
  salvageIron(game, gone.rarity); salvageArt(game, gone); dailyEvent(game, 'salvage');
  game.toast(`Túi đầy: tự phân giải ${name}`, 1.6);
  if (!old) return false;
  s.bag.push(item);
  return true;
}

export function autoEnhance(game) {
  const s = game.save, d = game.data, keep = d.config.pilot.enhance_keep;
  const it = equipped(s).filter(i => (i.plus || 0) < d.gear.enhance.drop_from).sort((a, b) => (a.plus || 0) - (b.plus || 0))[0];
  const c = it && enhanceCost(d, it, s);
  if (!c || c.locked || c.coins || (s.mats['tinh-thiet'] || 0) - c.cost['tinh-thiet'] < keep) return;   // tự hành không tiêu Linh Thạch vào cường hoá
  const r = enhance(game, it.uid);
  if (r) game.toast(r === 'up' ? `Tự cường hóa thành công: ${itemName(d, it)}` : `Tự cường hóa ${itemName(d, it)} hỏng, giữ nguyên`, 1.8);
}
