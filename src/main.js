// Khởi động: nạp dữ liệu, dựng màn hình, vòng lặp khung hình.
import './core/clock.js';   // đồng hồ tin được: phải nạp trước mọi thứ dùng Date
import { loadData } from './core/data.js';
import { createScreen } from './core/screen.js';
import { createPerf } from './core/perf.js';
import { createInput } from './core/input.js';
import { createGame } from './game/game.js';
import { drawWorld, drawOverlay } from './render/draw.js';
import { drawTrip } from './render/flight.js';
import { createHud } from './ui/hud.js';
import { createLogin } from './ui/login.js';
import { createAudio } from './core/audio.js';
import { clickSounds } from './ui/click-sound.js';
import { createRecord } from './game/record.js';
import { createPortraits } from './ui/portrait.js';
import { createZalo } from './ui/zalo.js';
import { createBag } from './ui/bag.js';
import { createSkillsPanel } from './ui/skills-panel.js';
import { createCavePanel } from './ui/cave-panel.js';
import { createPetsPanel } from './ui/pets-panel.js';
import { createDailyPanel } from './ui/daily-panel.js';
import { createAchvPanel } from './ui/achv-panel.js';
import { createWorldMap } from './ui/world-map.js';
import { createSocialPanel } from './ui/social-panel.js';
import { initPwa, recoverStale } from './core/pwa.js';
import { catchErrors } from './core/catch-errors.js';
import { createMarketPanel } from './ui/market-panel.js';
import { startMailCheck } from './game/market.js';
import { createTopupPanel } from './ui/topup-panel.js';
import { createGuildPanel } from './ui/guild-panel.js';
import { createMenuPanel } from './ui/menu-panel.js';
import { gridCards } from './ui/grid-cards.js';
import { leHoi } from './ui/le-hoi.js';

async function boot() {
  catchErrors();   // lỗi trên máy người chơi gửi về máy chủ (khi đã đăng nhập)
  initPwa(document.getElementById('btn-install'));
  const canvas = document.getElementById('game');
  const data = await loadData();
  let screen = null;
  const perf = createPerf(data.config, () => screen.resize());   // nhẹ máy: giới hạn khung hình, tự hạ độ phân giải khi chậm
  screen = createScreen(canvas, data.config, perf.dpr);
  const input = createInput(canvas);
  const audio = createAudio(data.sounds);
  const ui = createHud(audio);
  const game = createGame(data, screen, input, ui, audio);
  createBag(game);
  createSkillsPanel(game);
  createCavePanel(game);
  createPetsPanel(game);
  createDailyPanel(game);
  createAchvPanel(game);
  game.worldMap = createWorldMap(game);
  createSocialPanel(game);
  createMarketPanel(game); startMailCheck(game);
  createTopupPanel(game);
  createGuildPanel(game);
  createMenuPanel(game);   // nút Menu: mọi chức năng, phó bản (data/menu.json)
  leHoi(game);   // khung giao diện đổi đèn theo mùa lễ hội (style-khung.css)
  gridCards(game);   // thẻ trong các bảng hiện thành lưới ô như túi đồ, chạm ô xem chi tiết
  clickSounds(game);
  window.__game = game; // để kiểm thử tự động đọc trạng thái
  createRecord(game, audio).catch(() => {});   // nút quay clip cạnh nút tiếng (data/record.json); lỗi thì game vẫn chạy
  createPortraits(game).catch(() => {});   // chân dung NPC trên hộp thoại (data/portraits.json)
  createZalo(game);   // nút nhóm Zalo cạnh nút quay clip (data/community.json)
  document.getElementById('loading').hidden = true;
  try { sessionStorage.removeItem('p2d-recover'); } catch { /* chế độ riêng tư */ }

  const login = createLogin(opts => game.begin(opts));
  login.start();

  let last = performance.now(), lastErr = '', lastUi = 0;
  function frame(now) {
    requestAnimationFrame(frame);   // xếp khung sau trước: một lỗi trong khung này không làm đứng hình cả game
    if (!perf.tick(now, game)) return;   // màn 120 Hz, đang mở bảng: bỏ bớt khung cho mát máy
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      game.update(dt);
      if (game.trip) drawTrip(game, screen);
      else { drawWorld(game, screen, now / 1000); drawOverlay(game, screen, input); }
      if (now - lastUi >= data.config.perf.hud_ms) { lastUi = now; ui.update(game); }   // chữ, thanh máu HUD: 15 lần mỗi giây là đủ
    } catch (e) {
      if (e.message !== lastErr) { lastErr = e.message; setTimeout(() => { throw e; }); }   // báo một lần (core/catch-errors.js gửi về máy chủ)
    }
  }
  requestAnimationFrame(frame);
}

boot().catch(async e => {
  console.error(e);
  if (await recoverStale()) return;
  document.getElementById('loading').textContent = 'Lỗi tải game: ' + e.message;
});
