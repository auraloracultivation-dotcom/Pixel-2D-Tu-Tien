// Tự hành làm nhiệm vụ hằng ngày (chủ dự án 02/11/2026 16:09: "ấn vào nhiệm vụ mà nó không làm nhiệm vụ chưa hoàn thành, lại
// làm tự hành cũ"). Chạm dòng việc ngày ở cột nhiệm vụ (src/ui/quest-dock.js) → game.pilot.daily: tự hành chỉ làm các việc ngày
// chưa xong, theo thứ tự trong bảng; hết việc làm được thì báo và dừng (không quay về việc vặt, đả tọa chờ độ kiếp như trước).
// - Hạ quái (một loài / bất kỳ): tới bãi có loài đó mà đánh (dùng chung src/game/chores.js wantJob); quái chỉ có trong bí cảnh,
//   dị chủng, trấn giữ thì bỏ qua (người chơi tự làm).
// - Câu cá: ra mép tinh cầu câu. Đả tọa: về bồ đoàn ngồi.
// - Luyện đan, rèn, thu hoạch, phân giải: làm luôn từ xa (như mở Lò đan / Lò rèn ở Menu), đủ nguyên liệu mới làm.
import { ensureDaily, taskDef, dailyEvent } from './daily.js';
import { wantJob } from './chores.js';
import { brew, forge, canPay } from './cave.js';
import { harvestAll, nextRipe } from './garden.js';
import { salvage, isEquipped, rarityOf } from './items.js';

// Việc ngày chưa xong (đã nhận hay chưa nhận thưởng không tính: xong số lượng là thôi)
export function dailyLeft(game) {
  return ensureDaily(game).tasks.map(t => ({ t, d: taskDef(game, t.id) })).filter(x => x.d && x.t.n < x.d.n);
}

// Việc làm ngay được không cần đi (trả true nếu vừa làm một lần)
function doNow(game, d) {
  const s = game.save, D = game.data;
  if (d.type === 'brew') {
    const id = D.cave.pill_button, p = D.cave.pills[id];
    if (!s.flags['dong-phu'] || !canPay(game, p.recipe)) return false;
    const r = brew(game, id);
    game.toast(r === 'fail' ? `Tự hành luyện ${p.name}: lò hỏng (vẫn tính 1 lần).` : `Tự hành luyện được ${r} ${p.name}.`, 1.6);
    return true;
  }
  if (d.type === 'forge') {
    const r = D.cave.forge.find(x => canPay(game, x.cost));
    if (!s.flags['dong-phu'] || !r) return false;
    const it = forge(game, r.id, Object.keys(D.items.slots)[0]);
    if (!it || it === 'full') return false;
    game.toast(`Tự hành rèn: ${r.name}`, 1.6);
    return true;
  }
  if (d.type === 'harvest') {
    if (!s.flags['dong-phu'] || nextRipe(game) > 0) return false;
    return Object.keys(harvestAll(game)).length > 0;
  }
  if (d.type === 'salvage') {   // chỉ phân giải đồ Phàm, Linh không mặc, cũ nhất trước
    const R = D.items.rarities.map(r => r.id).slice(0, 2);
    const it = s.bag.filter(i => R.includes(i.rarity) && !i.lock && !isEquipped(s, i.uid) && !D.items.bases[i.base]?.dv).sort((a, b) => a.uid - b.uid)[0];
    if (!it) return false;
    salvage(D, s, it.uid); dailyEvent(game, 'salvage'); game.refreshStats(); game.persist();
    game.toast(`Tự hành phân giải [${rarityOf(D.items, it.rarity).name}] cho việc ngày`, 1.4);
    return true;
  }
  return false;
}

const PILOT = ['kill', 'fish', 'visit'];   // việc tự hành đi làm được (ngoài luyện đan, rèn, thu hoạch, phân giải, đả tọa ở trên)

// → bước cho tự hành, { meditate: true } (pilot.js tự về bồ đoàn), hoặc null khi không còn việc ngày nào làm được
export function dailyJob(game, routeTo) {
  const pl = game.pilot, left = dailyLeft(game), first = left.findIndex(x => x.t.id === pl.daily);
  if (first > 0) left.unshift(...left.splice(first, 1));   // việc vừa chạm làm trước
  for (const { d } of left) {
    if (['brew', 'forge', 'harvest', 'salvage'].includes(d.type)) {
      if ((pl.nowT || 0) > Date.now()) return { wait: true };   // vừa làm xong một lần: đợi chút rồi làm tiếp
      if (doNow(game, d)) { pl.nowT = Date.now() + 1200; return { wait: true }; }
      continue;
    }
    if (d.type === 'meditate') return { meditate: true };
    if (!PILOT.includes(d.type)) continue;   // dị chủng, trấn giữ, khảm ngọc, trò chuyện…: người chơi tự làm (nút Đi làm mở bảng)
    const w = d.type === 'fish' ? { fish: true } : d.type === 'visit' ? { visit: d.map } : d.type === 'kill' && d.mob ? { kill: d.mob } : { any: true };
    const j = wantJob(game, routeTo, [w]);
    if (j) return j;
  }
  return null;
}

// Chạm "Đi làm" ở nhiệm vụ ngày của Hệ Thống (chủ dự án 10/11/2026 10:09: "chưa có tự đi làm nhiệm vụ"): quái chỉ có trong bí cảnh
// thì mở bảng Bí cảnh cho người chơi chọn; còn lại bật tự hành làm việc này trước. Trả 'dungeon' | 'pilot' | null.
export function dailyGo(game, id) {
  const d = taskDef(game, id);
  if (!d) return null;
  if (d.type === 'kill' && d.mob && !Object.values(game.data.maps).some(m => (m.spawners || []).some(s => s.mob === d.mob))) {
    if (!game.openDungeons) return null;
    game.openDungeons(); return 'dungeon';
  }
  import('./pilot.js').then(P => P.pilotDaily(game, id));
  return 'pilot';
}
