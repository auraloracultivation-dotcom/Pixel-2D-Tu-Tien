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
import { createFeedback } from './ui/feedback-panel.js';
import { createInbox } from './ui/inbox-panel.js';
import { createProfile } from './ui/profile-panel.js';
import { createReferral } from './ui/referral-panel.js';
import { createFame } from './ui/fame-panel.js';
import { createNotice } from './ui/notice-panel.js';
import { createDunResult } from './ui/dun-result.js';
import { orderHud } from './ui/hud-order.js';
import { createBagLinks } from './ui/bag-links.js';
import { createSelfPanel } from './ui/self-panel.js';
import { createRetreatPanel } from './ui/retreat-panel.js';
import { createFriendsPanel } from './ui/friends-panel.js';
import { hookVisit } from './game/friends.js';
import { createNameNudge } from './ui/name-nudge.js';
import { startReferral } from './game/referral.js';
import { startInbox } from './game/inbox-feed.js';
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
import { createFeed } from './ui/feed.js';
import { startNetWatch } from './game/net-watch.js';
import { startCheckinNudge } from './game/checkin-nudge.js';
import { startThienMa } from './game/thienma.js';

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
  leHoi(game);
  createFeed(game);   // linh khí, Linh Thạch, nhặt đồ: cột thông báo bên trái   // khung giao diện đổi đèn theo mùa lễ hội (style-khung.css)
  gridCards(game);   // thẻ trong các bảng hiện thành lưới ô như túi đồ, chạm ô xem chi tiết
  clickSounds(game);
  window.__game = game; // để kiểm thử tự động đọc trạng thái
  createRecord(game, audio).catch(() => {});   // nút quay clip cạnh nút tiếng (data/record.json); lỗi thì game vẫn chạy
  createPortraits(game).catch(() => {});   // chân dung NPC trên hộp thoại (data/portraits.json)
  createZalo(game);   // nút nhóm Zalo cạnh nút quay clip (data/community.json)
  createFeedback(game);   // nút Báo lỗi, Đề xuất cạnh nút Zalo (data/community.json → feedback)
  createProfile(game);   // chạm tên ở bảng xếp hạng: hồ sơ, nút So tài (data/duel.json)
  createReferral(game); createFame(game); startReferral(game);   // sự kiện giới thiệu nhận ngọc, bảng vinh danh góp ý (data/referral.json)
  createDunResult(game);   // bảng kết quả bí cảnh: ô vuông đồ thu được, Tiếp tục / Càn quét / Thoát
  createNotice(game); createNameNudge(game);   // nhắc người còn tên mặc định đặt tên; nút 📢 bảng thông báo, nút sự kiện trên bảng điều khiển (data/notice.json)
  startNetWatch(game); startCheckinNudge(game); startThienMa(game);   // game online: mất liên lạc máy chủ quá 10 giây thì đứng hình, quá 1 phút về màn đăng nhập (data/config.json → net_watch)
  createInbox(game); startInbox(game);   // nút Hòm thư cạnh Menu, gom tin chợ, truyền âm, tông môn, thế giới (data/inbox.json)
  createSelfPanel(game); createRetreatPanel(game); createFriendsPanel(game); hookVisit(game);   // bạn bè, thăm nhà bạn   // bảng thưởng bế quan tích luỹ (Nhiệm vụ)   // chạm tên / cảnh giới: bảng nhân vật (nhóm D)
  createBagLinks(game);   // Túi đồ: nút mở nhanh linh thú, thú cưỡi, đồng hành, thời trang, luyện khí
  orderHud(game);   // nút trên màn hình theo nhóm A–L (data/menu.json → hud), sau khi các nút đã được tạo
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
