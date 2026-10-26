// Khởi động: nạp dữ liệu, dựng màn hình, vòng lặp khung hình.
import { loadData } from './core/data.js';
import { createScreen } from './core/screen.js';
import { createInput } from './core/input.js';
import { createGame } from './game/game.js';
import { drawWorld, drawOverlay } from './render/draw.js';
import { drawTrip } from './render/flight.js';
import { createHud } from './ui/hud.js';
import { createLogin } from './ui/login.js';
import { createAudio } from './core/audio.js';
import { createBag } from './ui/bag.js';
import { createSkillsPanel } from './ui/skills-panel.js';

async function boot() {
  const canvas = document.getElementById('game');
  const data = await loadData();
  const screen = createScreen(canvas, data.config);
  const input = createInput(canvas);
  const audio = createAudio(data.sounds);
  const ui = createHud(audio);
  const game = createGame(data, screen, input, ui, audio);
  createBag(game);
  createSkillsPanel(game);
  window.__game = game; // để kiểm thử tự động đọc trạng thái
  document.getElementById('loading').hidden = true;

  const login = createLogin(opts => game.begin(opts));
  login.start();

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    game.update(dt);
    if (game.trip) drawTrip(game, screen);
    else { drawWorld(game, screen, now / 1000); drawOverlay(game, screen, input); }
    ui.update(game);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

boot().catch(e => {
  console.error(e);
  document.getElementById('loading').textContent = 'Lỗi tải game: ' + e.message;
});
