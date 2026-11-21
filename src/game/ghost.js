// Gục thì hoá bong bóng linh hồn chờ hồi sinh (chủ dự án 09/11/2026 10:42: "lúc chết thì đợi hồi sinh 3 giây, trong 3 giây này hoá
// thành bong bóng linh hồn"). Người chơi đứng yên, không trúng đòn, quái vẫn chạy; hết sec giây thì bong bóng vỡ và hồi sinh như cũ
// (game.js respawn). Vẽ ở src/render/draw-ghost.js. Số ở data/config.json → ghost.
// 16:19 cùng ngày: gục ngoài trời thì hiện bảng hỏi "Hồi sinh tại đây / Về động phủ" (src/ui/death-ask.js), ask.sec giây không
// chọn thì về động phủ. Đài so tài, độ kiếp, bí cảnh, tháp, trong nhà, chưa có động phủ: hồi sinh như cũ, không hỏi.
// Hóa ma (22/11/2026 03:2x): đang là ma thì không hỏi, hồi sinh ở chỗ ngẫu nhiên xa làng (maHoiSinh, src/game/ma-hoi-sinh.js).
import { goHome } from './friends.js';
import { pilotOpt } from './pilotopt.js';
import { toiMa } from './pvp-ma.js';
import { choMa } from './ma-hoi-sinh.js';

// Gục ngoài trời: không phải đài so tài, độ kiếp, bí cảnh, tháp, trong nhà, động phủ
const ngoai = game => !game.duel && !game.trib?.active && !game.dungeon && !game.map.def.tower && !game.map.def.indoor && !(game.map.def.rooms || []).length
  && game.map.id !== game.data.home.map;
// Bật "Gục thì hồi sinh tại chỗ" ở Menu → Tự động (người chơi đề xuất, chủ dự án 11/11/2026 16:53): không hỏi, hồi sinh tại điểm hồi sinh.
// Đang là ma: không hỏi (chủ dự án 22/11/2026 03:2x: "ma phải hồi sinh ở chỗ của ma", không được chọn về động phủ)
const canAsk = game => !!(game.data.config.ghost?.ask && game.save?.flags?.['dong-phu'] && !pilotOpt(game, 'hoi-sinh') && !toiMa(game) && ngoai(game));

// Ma gục trên tinh cầu ngoài trời: chỗ hồi sinh ngẫu nhiên xa làng, mỗi lần một chỗ khác (chủ dự án 22/11/2026 03:2x "Chỗ ngẫu nhiên xa làng";
// data/pvp.json → ma.hoi_sinh). null: hồi sinh ở điểm vào như cũ. game.js respawn gọi TRƯỚC khi xử lý đài so tài, độ kiếp (lúc đó còn biết đang ở đâu).
export function maHoiSinh(game) {
  const H = game.data.pvp?.ma?.hoi_sinh, z = game.data.pvp?.server?.safe, T = game.map.T;
  if (!H || !toiMa(game) || !game.map.def.planet || !game.map.def.world || !ngoai(game)) return null;   // world: không phải trận trùm Khai Tinh
  const them = z && z.map === game.map.id ? [[z.x / T - 0.5, z.y / T - 0.5]] : [];   // tâm vòng pháp trận an toàn (điểm ảnh → ô)
  return choMa(game.map, { H, r: game.player.r, quai: game.spawners || [], them });
}

export function startGhost(game) {
  const G = game.data.config.ghost || { sec: 3 }, p = game.player, ask = canAsk(game);
  game.ghost = { t: 0, sec: ask ? G.ask.sec : G.sec, x: p.x, y: p.y, ask, choice: null };
  p.invT = game.ghost.sec + 2; p.kx = p.ky = 0; p.dashT = 0;
  game.sfx?.('hurt');
}

// Bảng hỏi chọn: 'here' hồi sinh tại điểm hồi sinh của bản đồ này, 'home' về động phủ
export const ghostChoose = (game, c) => { if (game.ghost?.ask) game.ghost.choice = c; };

// false khi còn chờ; 'here' / 'home' khi xong (game.js gọi afterGhost)
export function ghostTick(game, dt) {
  const g = game.ghost;
  if (!g) return false;
  g.t += dt;
  game.player.x = g.x; game.player.y = g.y;
  if (g.choice) { game.ghost = null; return g.choice; }
  if (g.t < g.sec) return false;
  game.ghost = null;
  return g.ask ? 'home' : 'here';
}

// Hồi sinh như cũ, chọn về động phủ thì bay về sau đó
export function afterGhost(game, choice, respawn) {
  respawn();
  if (choice === 'home') goHome(game);
}
