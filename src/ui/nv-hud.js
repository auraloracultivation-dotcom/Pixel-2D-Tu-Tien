// Thẻ nhiệm vụ chính (chủ dự án 21/11/2026: truyện phân theo nhiệm vụ từ 1 đến N, hoà vào game từ từ; trước đó là thẻ bậc của chặng leo bậc đầu game,
// docs/10-CAI-HON.md việc 5). Góc trái ngay dưới khung nhân vật. Dòng trên "Nhiệm vụ 17 · Tiếng chuông" (và món sẽ nhận nếu nhiệm vụ có thưởng), dòng dưới
// việc phải làm kèm số đếm "Nhặt hỏa tinh thạch 1/3".
//   · Sang nhiệm vụ mới: thẻ trượt vào, loé viền một nhịp, con số LĂN từ số cũ lên số mới (thấy mình vừa đi thêm một bước).
//   · Số đếm tăng: nảy một nhịp kèm tiếng gõ.
//   · Việc vừa xong (goal().xong): viền vàng, dấu ✓ trước tên việc, một tiếng nhỏ; truyện chờ màn lặng rồi mới diễn cảnh kế (src/game/story.js update).
//   · Chạm thẻ: Tự hành đi làm nhiệm vụ ấy (chạm lần nữa thì dừng); chặng mở đầu chưa mở Tự hành thì mũi tên chỉ đường đổi sang việc này.
// Nguồn: src/game/story.js goal() (so, ten, goc, n, of, xong) và rung() (món thưởng của bậc). Chuyển động tính theo giờ game từng khung (phòng đo tools/do-don/
// quay lại được), chỉ xin khung hình trong lúc thẻ đang hiện. Kiểu: nv-hud.css. Chữ: data/story.json → nv_text.
// Ở đây cũng khai game.manLang(): màn chơi đang lặng (không hội thoại, không bảng, không thẻ mừng, không đang bay) để truyện biết lúc nào diễn cảnh kế.
import { goc } from '../core/build.js';
import { every } from '../core/ticker.js';
import { togglePilot } from '../game/pilot.js';
import { guideNext } from '../game/guide.js';
import { spriteIcon } from './sprite-icon.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const set = (e, p, v) => { if (e['_' + p] !== v) { e['_' + p] = v; e.style[p] = v; } };
const BAN = '.panel:not([hidden]), #bag:not([hidden]), .ht-back:not([hidden]), #qua:not([hidden]), #mung:not([hidden]), #mung-tang:not([hidden]), #mung-canh:not([hidden]), #hen-mai:not([hidden])';

export function createNvHud(game) {
  const S = game.data.story, X = S.nv_text || {};
  game.manLang = () => !game.dialog?.open && !game.traveling && !game.trip && !game.cheMan && !game.manToi && !document.querySelector(BAN);
  const css = el('link'); css.rel = 'stylesheet'; css.href = goc('src/ui/nv-hud.css'); document.head.append(css);
  const box = el('div'); box.id = 'nv-hud'; box.hidden = true;
  const [truoc, sau] = (X.chip || 'Nhiệm vụ {so}').split('{so}');
  const tag = el('b', 'bh-tag'), soBox = el('span', 'bh-so'), soCu = el('i'), soMoi = el('i'); soBox.append(soCu, soMoi); tag.append(truoc || '', soBox, sau || '');
  const name = el('span', 'bh-name'), goal = el('span', 'bh-goal'), cnt = el('em', 'bh-cnt'), gift = el('i', 'bh-gift'), lab = el('small', null, X.reward || '');
  const top = el('div', 'bh-row'), bot = el('div', 'bh-row'), right = el('span', 'bh-right'); right.append(lab, gift);
  top.append(tag, name, right); bot.append(goal, cnt); box.append(top, bot); document.body.append(box);
  box.addEventListener('pointerdown', e => {   // chạm thẻ: Tự hành làm nhiệm vụ này (như khung mục tiêu cũ, src/ui/hud.js)
    e.stopPropagation();
    if (!game.player) return;
    togglePilot(game);
    if (guideNext(game)) game.sfx?.('pickup');
  });
  let key = '', so0 = 0, n = -1, popT = -9, inT = -9, raf = 0, fit = true, xong = false;

  // Đọc trạng thái nhiệm vụ (10 lần mỗi giây là đủ); có thay đổi thì ghi chữ, số đếm tăng thì cho nảy
  function sync() {
    const G = game.save && game.player && !game.trip ? game.story?.goal?.() : null;
    if (!G || !G.so) { if (!box.hidden) { box.hidden = true; key = ''; n = -1; } return; }   // so0 (số của thẻ vừa hiện) giữ lại: thẻ ẩn trong lúc diễn cảnh rồi hiện với số kế thì vẫn lăn
    const k = String(G.so);
    if (k !== key) {
      if (key || so0) game.sfx?.('pickup', 0.5);   // sang nhiệm vụ kế: một tiếng nhỏ
      const lan = so0 && G.so === so0 + 1;   // đi tiếp đúng một bước: số cũ trượt lên, số mới trượt vào
      soCu.textContent = lan ? so0 : ''; soCu.hidden = !lan; soMoi.textContent = G.so;
      key = k; so0 = G.so; n = G.n; inT = game.time; xong = false; box.classList.remove('xong');
      name.textContent = G.ten || ''; name.hidden = !G.ten;
      goal.textContent = (G.goc || G.text || '').replace(/\s*\(\{n\}\/\d+\)\s*$/, '');
      fit = false;   // đo lại ở khung hình đầu thẻ hiện (hàm paint)
      // món sẽ nhận (chỉ các bậc của chặng mở đầu có): mã gốc trang bị, hoặc { pb: loại pháp bảo } (hình là một khung trong tấm hình nhiều khung: vẽ lên canvas)
      const A = game.data.art.sprites, th = game.story.rung?.()?.u?.thuong, pb = th?.pb && game.data['phap-bao']?.types[th.pb], spr = typeof th === 'string' && (A['ui.vk-' + th] || A['ui.ic-' + game.data.items.bases[th]?.slot]);
      gift.textContent = ''; gift.style.backgroundImage = spr ? `url("${spr.file}?v=${spr.v}")` : '';
      if (pb) gift.append(spriteIcon(game, pb.icon, pb.icon_f || 0, 22, 'bh-spr', true));
      right.hidden = !spr && !pb;
      box.hidden = false;
    }
    if (G.n !== n) { if (G.n > n) { popT = game.time; game.sfx?.('click'); } n = G.n; }
    const t = G.of ? `${G.n}/${G.of}` : '';   // việc không đếm (gặp người, hạ trùm): không hiện số
    if (cnt.textContent !== t) cnt.textContent = t;
    if (!!G.xong !== xong) { xong = !!G.xong; box.classList.toggle('xong', xong); if (xong) game.sfx?.('sparkle', 0.5); }
    box.classList.toggle('dang', !!game.pilot);   // đang Tự hành: viền sáng
    if (!raf) raf = requestAnimationFrame(paint);
  }
  function paint() {
    raf = 0;
    if (box.hidden) return;
    if (!fit && goal.clientWidth) {   // việc dài quá hai dòng: chữ nhỏ lại một nấc. Ghi chiều cao thẻ để dòng Tự hành bên dưới lùi theo (hud-khung.css đọc --nv-h)
      fit = true; goal.classList.remove('nho'); if (goal.scrollHeight > goal.clientHeight + 1) goal.classList.add('nho');
      document.documentElement.style.setProperty('--nv-h', `${box.offsetHeight}px`);
    }
    const a = game.time - popT, b = game.time - inT, k = a < 0.28 ? 1 + 0.6 * (1 - a / 0.28) : 1, ki = Math.min(1, b / 0.24);
    set(cnt, 'transform', k > 1.001 ? `scale(${k.toFixed(3)})` : '');
    set(cnt, 'color', a < 0.28 ? '#fff' : '');
    set(box, 'opacity', ki.toFixed(2)); set(box, 'transform', ki < 1 ? `translateX(${Math.round((1 - ki) * -18)}px)` : '');
    set(box, 'filter', b < 0.9 ? `brightness(${(1 + 0.7 * (1 - b / 0.9)).toFixed(2)})` : '');   // nhiệm vụ mới: loé rồi dịu lại
    if (!soCu.hidden) { const kr = Math.max(0, Math.min(1, (b - 0.3) / 0.32)), e = 1 - (1 - kr) ** 3; set(soCu, 'marginTop', `${(-e).toFixed(3)}em`); if (kr >= 1) soCu.hidden = true; }   // con số lăn: đứng 0,3 giây cho mắt kịp thấy số cũ rồi trượt
    raf = requestAnimationFrame(paint);
  }
  every(sync, 100);
}
