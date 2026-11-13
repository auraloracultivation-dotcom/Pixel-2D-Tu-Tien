// Khởi động: nạp dữ liệu, dựng màn hình, vòng lặp khung hình.
import './core/host-guard.js';   // chỉ chạy ở tên miền chính, địa chỉ khác chuyển về www.pixel2dtutien.com
import './core/clock.js';   // đồng hồ tin được: phải nạp trước mọi thứ dùng Date
import { loadData } from './core/data.js';
import { createScreen } from './core/screen.js';
import { createPerf } from './core/perf.js';
import { createInput } from './core/input.js';
import { createGame } from './game/game.js';
import { startBayCanh } from './ui/bay-canh-start.js';
import { startDeathAsk } from './ui/death-ask.js';
import { createFrameDim } from './ui/frame-dim.js';
import { createManToi } from './ui/man-toi.js';
import { watchTuVao, tuVao } from './ui/tu-vao.js';
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
import { createNotice } from './ui/notice-panel.js';
import { createFaq } from './ui/faq-panel.js';
import { createHeThong } from './ui/he-thong.js';
import { createDunResult } from './ui/dun-result.js';
import { orderHud } from './ui/hud-order.js';
import { createHudGon } from './ui/hud-gon.js';
import { createHudAva } from './ui/hud-ava.js';
import { createSideNav } from './ui/side-nav.js';
import { createChatDock } from './ui/chat-dock.js';
import { startDaoLu } from './game/daolu.js';
import { createQuestDock } from './ui/quest-dock.js';
import { createSelfPanel } from './ui/self-panel.js';
import { createRetreatPanel } from './ui/retreat-panel.js';
import { createFriendsPanel } from './ui/friends-panel.js';
import { hookVisit } from './game/friends.js';
import { createNameNudge } from './ui/name-nudge.js';
import { startReferral } from './game/referral.js';
import { startInbox } from './game/inbox-feed.js';
import { startChatPush } from './game/chat-push.js';
import { createBag } from './ui/bag.js';
import { createSkillsPanel } from './ui/skills-panel.js';
import { createCavePanel } from './ui/cave-panel.js';
import { createPetsPanel } from './ui/pets-panel.js';
import { createDailyPanel } from './ui/daily-panel.js';
import { createAchvPanel } from './ui/achv-panel.js';
import { createWorldMap } from './ui/world-map.js';
import { createMiniMap } from './ui/mini-map.js';
import { createHopThu } from './ui/hop-thu.js';
import { createSocialPanel } from './ui/social-panel.js';
import { initPwa, recoverStale } from './core/pwa.js';
import { catchErrors } from './core/catch-errors.js';
import { createMarketPanel } from './ui/market-panel.js';
import { startMailCheck } from './game/market.js';
import { startMangLich } from './game/mang-lich.js';
import { createTopupPanel } from './ui/topup-panel.js';
import { createGuildPanel } from './ui/guild-panel.js';
import { khWatch } from './game/khai-hoang.js';
import { createMenuPanel } from './ui/menu-panel.js';
import { gridCards } from './ui/grid-cards.js';
import { leHoi } from './ui/le-hoi.js';
import { createFeed } from './ui/feed.js';
import { startNetWatch } from './game/net-watch.js';
import { startCheckinNudge } from './game/checkin-nudge.js';
import { startThienMa } from './game/thienma.js';
import { createFarmTeamPanel } from './ui/farm-team-panel.js';
import { createPhapBaoPanel } from './ui/phap-bao-panel.js';
import { createMangPanel } from './ui/mang-panel.js';
import { createPvpBtn } from './ui/pvp-btn.js';
import { createMangLeave } from './ui/mang-leave.js';
import { startAnalyticsHook } from './game/analytics-hook.js';

async function boot() {
  catchErrors();   // lỗi trên máy người chơi gửi về máy chủ (khi đã đăng nhập)
  initPwa(document.getElementById('btn-install'));
  const canvas = document.getElementById('game');
  const data = await loadData();
  let screen = null;
  const perf = createPerf(data.config, () => screen.resize());   // nhẹ máy: giới hạn khung hình, tự hạ độ phân giải khi chậm
  screen = createScreen(canvas, data.config, perf.dpr);
  const input = createInput(canvas);
  const audio = createAudio(data.sounds, data['tieng-chieu']?.sfx);   // tiếng chung + tiếng riêng từng chiêu (data/tieng-chieu.json)
  const ui = createHud(audio);
  const game = createGame(data, screen, input, ui, audio);
  createBag(game);
  createSkillsPanel(game);
  createCavePanel(game);
  createPetsPanel(game);
  createDailyPanel(game);
  createAchvPanel(game);
  game.worldMap = createWorldMap(game);
  createMiniMap(game);   // bản đồ tròn góc phải trên (thay nút Bản đồ)
  createHopThu(game);   // nút Thư gộp Hòm thư, Zalo, Đề xuất, Báo lỗi
  createSocialPanel(game);
  createMarketPanel(game); startMailCheck(game); startMangLich(game);   // boss Thôn Thiên Mãng 20:30–21:00 giờ VN
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
  createFeedback(game);   // nút ẩn Báo lỗi, Đề xuất: mở Hệ Thống mục Góp ý (src/ui/he-thong-gop.js; data/community.json → feedback)
  createProfile(game);   // chạm tên ở bảng xếp hạng: hồ sơ, nút So tài (data/duel.json)
  createReferral(game); startReferral(game);   // sự kiện giới thiệu nhận ngọc (data/referral.json)
  game.openFame = () => { game.closeAll?.(); game.rankKind?.('qtv'); game.openSocial?.('rank'); };   // bảng vinh danh góp ý cũ đã thay bằng Bảng quản trị viên (Xếp hạng)
  createDunResult(game);   // bảng kết quả bí cảnh: ô vuông đồ thu được, Tiếp tục / Càn quét / Thoát
  createHeThong(game);   // Hệ Thống Tu Tiên đi theo ký chủ (data/he-thong.json)
  createFaq(game);   // nút ! góc trên phải: bảng Câu hỏi thường gặp cho người mới (data/faq.json)
  createNotice(game); createNameNudge(game);   // nhắc người còn tên mặc định đặt tên; nút 📢 bảng thông báo, nút sự kiện trên bảng điều khiển (data/notice.json)
  startNetWatch(game); if (!game.data.daily?.off) startCheckinNudge(game); startThienMa(game); khWatch(game);   // khWatch: tinh cầu khai hoang (src/game/khai-hoang.js); game online: mất liên lạc máy chủ quá 10 giây thì đứng hình, quá 1 phút về màn đăng nhập (data/config.json → net_watch)
  startChatPush(game);   // chat, truyền âm máy chủ đẩy qua Realtime; các vòng đọc cũ thành đọc bù (data/config.json → realtime)
  createInbox(game); startInbox(game);   // nút Hòm thư cạnh Menu, gom tin chợ, truyền âm, tông môn, thế giới (data/inbox.json)
  createSelfPanel(game); createRetreatPanel(game); createFriendsPanel(game); hookVisit(game);   // bạn bè, thăm nhà bạn   // bảng thưởng bế quan tích luỹ (Nhiệm vụ)   // chạm tên / cảnh giới: bảng nhân vật (nhóm D)
  startDaoLu(game);   // đạo lữ giữa hai người chơi: đọc trạng thái định kỳ, thưởng +5%
  createMangLeave(game);   // nút Rời đi vùng Thôn Thiên Mãng
  createPvpBtn(game);   // nút Bảo vệ PvP ở Ngoại Vực Vết Nứt (data/pvp.json)
  createMangPanel(game);   // bảng boss thế giới Cửu Đầu Thôn Thiên Mãng bên phải (data/thien-mang.json)
  createPhapBaoPanel(game);   // Hệ Pháp Bảo Luyện Chế: game.openPhapBao mở Trang bị → Pháp bảo (src/ui/self-pb-page.js)
  createFarmTeamPanel(game);   // tổ đội farm ngoài thế giới mở: danh sách đội trên tinh cầu, thưởng +10% mỗi đồng đội cùng chỗ (data/doi-farm.json)
  createChatDock(game); if (!game.data.daily?.off) createQuestDock(game);   // off: bỏ nhiệm vụ hằng ngày (chủ dự án 06/11/2026), hệ thống thay
    // khung trò chuyện nhỏ dưới màn hình, cột nhiệm vụ hằng ngày bên phải
  createSideNav(game);   // nút Túi đồ, Menu, Động phủ: cột mục bên trái, nội dung bên cạnh (data/menu.json → nav)
  orderHud(game); createHudGon(game); createHudAva(game);   // thu gọn nút, ẩn giao diện (hud-gon.js); nút trên màn hình theo nhóm A–L (data/menu.json → hud), sau khi các nút đã được tạo
  document.getElementById('loading').hidden = true;
  try { sessionStorage.removeItem('p2d-recover'); } catch { /* chế độ riêng tư */ }

  createFrameDim(game);   // dải trên, dải dưới tối đi, phần giữa là khung chơi và khung quay video (src/ui/frame-dim.js)
  createManToi(game);   // nút Tắt màn khi treo game: lớp đen kín màn hình, game vẫn chạy nhưng thôi vẽ (src/ui/man-toi.js)
  startDeathAsk(game);   // gục ngoài trời: hỏi hồi sinh tại đây hay về động phủ (src/ui/death-ask.js)
  startBayCanh(game);   // bố cục đồ chủ dự án tự bày (máy chủ), nút Bày cho người có quyền (src/ui/bay-canh*.js)
  startAnalyticsHook(game);   // đo người chơi bằng PostHog (data/config.json → analytics), bọc game.begin nên đặt trước màn đăng nhập
  watchTuVao(game);   // trang tự tải lại (bản mới, mất kết nối lâu) thì vào lại game, bật lại Tự đánh / Tự hành (src/ui/tu-vao.js)
  const login = createLogin(opts => game.begin(opts), { google: !!game.data.config.auth?.google, tuVao: go => tuVao(game, go) });
  login.start();

  let last = performance.now(), lastErr = '', lastUi = 0;
  function frame(now) {
    requestAnimationFrame(frame);   // xếp khung sau trước: một lỗi trong khung này không làm đứng hình cả game
    if (!perf.tick(now, game)) return;   // màn 120 Hz, đang mở bảng: bỏ bớt khung cho mát máy
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    try {
      game.update(dt);
      if (game.manToi) { /* đang tắt màn (src/ui/man-toi.js): game vẫn chạy, không vẽ gì */ }
      else if (game.trip) drawTrip(game, screen);
      else { drawWorld(game, screen, now / 1000); drawOverlay(game, screen, input); }
      if (now - lastUi >= (game.manToi ? 1000 : data.config.perf.hud_ms)) { lastUi = now; ui.update(game); }   // chữ, thanh máu HUD: 15 lần mỗi giây là đủ (tắt màn: mỗi giây một lần)
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
