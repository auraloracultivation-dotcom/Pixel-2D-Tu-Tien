// Boss thế giới Cửu Đầu Thôn Thiên Mãng (data/thien-mang.json; chủ dự án 06/11/2026). Bản thử: vô hạn máu, thanh máu luôn 99%,
// bảng xếp hạng sát thương cả máy chủ ở bên phải màn hình (src/ui/mang-panel.js), chưa có thưởng.
// Mỗi tinh cầu trong heads có một cái đầu mọc ở mép trên (ô ngay trên hàng đất đầu tiên ở giữa bản đồ), đứng yên, không đánh,
// không chết, không rơi đồ, không linh khí. Đòn trúng đầu (combat.js hitMob) cộng vào pend; cứ report_s giây gửi tổng qua máy chủ
// phòng Cloudflare (net/online-cf.js bossDmg → cloud/src/phong.js kẹp theo lực chiến → cloud/src/mang.js cộng dồn). Đứng gần đầu
// mà không đánh thì poll_s giây hỏi bảng một lần. Bảng về qua onBoss.
import { spawnMob } from './mobs.js';

const C = game => game.data['thien-mang'];
export const mangHead = game => C(game)?.heads?.[game.map?.id] || null;

// Gọi lúc dựng bản đồ (game.js loadMap)
export function spawnMang(game) {
  const c = C(game), h = mangHead(game), grid = game.map?.def?.grid;
  if (!c || !h || !game.data.mobs[c.mob] || !Array.isArray(grid) || !grid.length) { if (game.mang) game.mang.m = null; return; }
  const cx = Math.floor(grid[0].length / 2);
  let ry = 0;
  while (ry < grid.length && grid[ry][cx] === '~') ry++;
  const p = game.map.center(cx, Math.max(0, ry - 1));
  const m = spawnMob(game, c.mob, p.x, p.y, { wboss: { el: h.el, n: h.n }, aggro: false, noQi: true });
  game.mang = { ...(game.mang || {}), m, head: h, pend: 0, rep: 0, poll: c.poll_s, seen: false };
}

// combat.js → hitMob (máu đã trả đầy ở đó)
export function mangHit(game, m, dmg) { if (game.mang?.m === m) game.mang.pend += dmg; }

// mobs.js → updateMobs: đứng yên, không đánh
export function tickMang(game, m) { m.kx = m.ky = 0; m.x = m.hx; m.y = m.hy; m.hp = m.maxHp; m.state = 'idle'; m.aggro = false; }

export function updateMang(game, dt) {
  const s = game.mang, c = C(game);
  if (!s?.m || !game.mobs.includes(s.m)) return;
  const p = game.player, near = p && Math.hypot(p.x - s.m.x, p.y - s.m.y) < (c.near || 22) * game.map.T;
  if (near && !s.seen) { s.seen = true; game.toast(c.text.intro.replace('{name}', s.head.name), 3); }
  if (!game.online?.bossDmg) return;
  s.rep += dt; s.poll += dt;
  if (s.pend > 0 && s.rep >= c.report_s) { game.online.bossDmg(Math.round(s.pend)); s.pend = 0; s.rep = 0; s.poll = 0; }
  else if (near && s.poll >= c.poll_s) { game.online.bossDmg(0); s.poll = 0; }
}

// Bảng xếp hạng về từ máy chủ: { top: [[tên, sát thương]], n, total, me: [hạng, tổng] | null }
export function onMangBoard(game, bx) { (game.mang ??= {}).board = bx; game.mang.boardAt = Date.now(); }
