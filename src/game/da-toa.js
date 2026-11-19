// Đả tọa ở bất kỳ đâu (chủ dự án 19/11/2026 12:27–12:34). Thiên Kiếm Tinh là gốc rễ của cây cổ thụ: đả tọa tính theo vòng quỹ đạo
// trong tinh hệ, cách vòng của Thiên Kiếm Tinh bao nhiêu vòng thì linh khí giảm dần (mỗi vòng × ring_k, sàn ring_min). Mặt trăng
// (Động phủ, Hỏa Quật…) tính theo vòng của hành tinh mẹ; tinh cầu khai hoang có vòng riêng (thêm vào data.starmap.bodies lúc tải).
// Mức cao nhất (ở vòng gốc) = share (1/2) tốc độ chém quái của cảnh giới mình (farm_h, linh khí THẬT mỗi giờ đo từ người chơi thật
// 19/11/2026): "không được để đả tọa lên cấp nhanh hơn farm, một nửa thôi". Song tu, trà, đêm trăng, mưa, đồ trang trí chỉ đẩy lên
// tới trần đó. Chém quái không tính vòng (cướp linh khí của quái: xa, mạnh thì nhiều). Số ở data/config.json → meditate.
import { nightMul } from './daynight.js';
import { rainMul } from './weather.js';
import { songTuMul } from './affinity.js';
import { homeMul, teaMul } from './home.js';

const C = game => game.data.config.meditate;

// Ở đây có ngồi được không: không ngồi trong bí cảnh, phó bản, đài, vùng không gian, lúc bay, cưỡi, đang đánh trùm Khai Tinh
export function medBlocked(game) {
  const d = game.map?.def || {}, p = game.player;
  return !!(d.space || d.arena || (d.rooms || []).length || game.dungeon || game.duel || game.sweeping || game.kh?.fight || p?.flying || p?.riding || game.fish);
}

// Bản đồ đang đứng cách vòng gốc mấy vòng (null: không có trên tinh đồ → coi như xa nhất)
export function medRing(game) {
  const id = game.map?.id, B = game.data.starmap?.bodies || [], c = C(game);
  for (const b of B) {
    if (b.map === id || (b.moons || []).some(m => m.map === id)) return b.orbit != null ? Math.abs(b.orbit - (c.home_orbit ?? 1)) : null;
  }
  return null;
}

// Hệ số theo vòng: 1 ở vòng gốc, × ring_k mỗi vòng, không dưới ring_min
export function medRingMul(game) {
  const c = C(game), r = medRing(game);
  if (r == null) return c.ring_min;
  return Math.max(c.ring_min, Math.pow(c.ring_k, Math.round(r)));
}

// Trần đả tọa mỗi giây (linh khí thật, chưa nhân dòng tăng linh khí của trang bị: chém quái cũng nhân y vậy)
export function medCap(game) {
  const c = C(game), F = c.farm_h, r = Math.max(0, Math.min(F.length - 1, game.save?.realm || 0));
  return F[r] / 3600 * c.share;
}

// Linh khí đả tọa mỗi giây ở chỗ đang ngồi: trần × hệ số vòng × các thứ cộng thêm, không vượt trần
export function medPerSec(game) {
  const cap = medCap(game);
  const bonus = nightMul(game) * rainMul(game) * songTuMul(game) * homeMul(game) * teaMul(game);
  return Math.min(cap, cap * medRingMul(game) * bonus);
}

// Phần trăm so với mức ở gốc (hiện cho người chơi biết chỗ này tốt hay không)
export const medPct = game => Math.round(medPerSec(game) / medCap(game) * 100);
