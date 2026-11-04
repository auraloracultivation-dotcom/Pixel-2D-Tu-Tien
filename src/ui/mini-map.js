// Bản đồ tròn góc phải trên (chủ dự án 04/11/2026 09:05: "biến bản đồ thành khung tròn trên góc phải trên", thay nút Bản đồ):
// vùng quanh người chơi trên tinh cầu đang đứng (mỗi ô một điểm, cùng màu với bản đồ tinh cầu src/ui/planet-map.js), chấm bãi
// quái, cổng, việc truyện, NPC; người chơi ở giữa. Khung vòng tím khoét lòng (ui-k-vong-tim-rong), tên nơi đang đứng ở dưới.
// Chạm thì mở bảng Bản đồ như nút cũ (nút #btn-world vẫn còn, chỉ cất khỏi màn hình). Kiểu ở style-ui-kit3.css.
import { mini, marks } from './planet-map.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const R = 14;   // bán kính vùng thấy được (ô)
const COL = { camp: '#ff5a4a', gate: '#b47cff', goal: '#ffd86b', npc: '#fff2d0' };

export function createMiniMap(game) {
  const box = document.createElement('div'); box.id = 'mini-map'; box.hidden = true;
  const cv = document.createElement('canvas'), ring = document.createElement('i'), name = document.createElement('b');
  const N = 96; cv.width = cv.height = N;
  box.append(cv, ring, name);
  document.body.append(box);
  box.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (!game.save || game.dialog.open || game.trip) return;
    game.closeAll?.();
    document.getElementById('btn-world')?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
  });
  const c = cv.getContext('2d');
  function draw() {
    const map = game.map, p = game.player, hud = document.getElementById('hud');
    const on = !!(game.save && map && p && hud && !hud.hidden && !game.trip);
    box.hidden = !on;
    if (!on) return;
    if (name.textContent !== map.def.name) name.textContent = map.def.name || '';
    const s = N / (R * 2), px = p.x / map.T, py = p.y / map.T;
    c.fillStyle = '#1a1028'; c.fillRect(0, 0, N, N);
    c.imageSmoothingEnabled = false;
    c.drawImage(mini(game), (px - R) , (py - R), R * 2, R * 2, 0, 0, N, N);
    for (const m of marks(game)) {
      const x = (m.at[0] + 0.5 - px + R) * s, y = (m.at[1] + 0.5 - py + R) * s;
      if (x < 2 || y < 2 || x > N - 2 || y > N - 2) continue;
      c.fillStyle = COL[m.k] || '#fff'; c.strokeStyle = '#1b1830'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(x, y, m.k === 'npc' ? 2 : 3, 0, Math.PI * 2); c.stroke(); c.fill();
    }
    c.fillStyle = '#1b1830'; c.beginPath(); c.arc(N / 2, N / 2, 4.5, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(N / 2, N / 2, 3, 0, Math.PI * 2); c.fill();
  }
  draw(); every(draw, 500);
}
