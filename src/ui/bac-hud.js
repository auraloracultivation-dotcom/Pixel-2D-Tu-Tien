// Thẻ bậc của chặng leo bậc đầu game (docs/10-CAI-HON.md việc 5; src/game/story.js rung / goal, data/story.json → bac): góc trái ngay dưới khung nhân vật,
// dòng trên "Bậc 1/2" và món sẽ nhận khi xong bậc, dòng dưới việc phải làm kèm số đếm "Hạ Mộc linh 0/1". Mỗi con hạ được thì số đếm nảy lên một nhịp kèm
// một tiếng gõ. Chỉ hiện lúc đang leo bậc.
// Chuyển động tính theo giờ game từng khung (phòng đo tools/do-don/ quay lại được), chỉ xin khung hình trong lúc thẻ đang hiện. Kiểu: bac-hud.css.
import { every } from '../core/ticker.js';
import { bacOn } from '../game/story.js';
import { spriteIcon } from './sprite-icon.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const set = (e, p, v) => { if (e['_' + p] !== v) { e['_' + p] = v; e.style[p] = v; } };

export function createBacHud(game) {
  const B = game.data.story.bac;
  if (!B || !bacOn(game)) return;
  const css = el('link'); css.rel = 'stylesheet'; css.href = new URL(`./bac-hud.css?v=${ver()}`, import.meta.url).href; document.head.append(css);
  const box = el('div'); box.id = 'bac-hud'; box.hidden = true;
  const tag = el('b', 'bh-tag'), goal = el('span', 'bh-goal'), cnt = el('em', 'bh-cnt'), gift = el('i', 'bh-gift'), lab = el('small', null, B.text.reward);
  const top = el('div', 'bh-row'), bot = el('div', 'bh-row'), right = el('span', 'bh-right'); right.append(lab, gift);
  top.append(tag, right); bot.append(goal, cnt); box.append(top, bot); document.body.append(box);
  let key = '', n = -1, popT = -9, inT = -9, raf = 0;

  // Đọc trạng thái bậc (10 lần mỗi giây là đủ); có thay đổi thì ghi chữ, số đếm tăng thì cho nảy
  function sync() {
    const R = game.save && game.player && !game.trip ? game.story?.rung?.() : null, G = R && game.story.goal();
    if (!G) { if (!box.hidden) { box.hidden = true; key = ''; n = -1; } return; }
    const k = `${R.i}/${R.n}|${R.u.id}`;
    if (k !== key) {
      key = k; n = G.n; inT = game.time;
      tag.textContent = B.text.chip.replace('{i}', R.i).replace('{n}', R.n);
      goal.textContent = (R.u.goal || '').replace(/\s*\(\{n\}\/\d+\)\s*$/, '');
      // món sẽ nhận: mã gốc trang bị, hoặc { pb: loại pháp bảo } (hình là một khung trong tấm hình nhiều khung: vẽ lên canvas)
      const S = game.data.art.sprites, th = R.u.thuong, pb = th?.pb && game.data['phap-bao']?.types[th.pb], spr = typeof th === 'string' && (S['ui.vk-' + th] || S['ui.ic-' + game.data.items.bases[th]?.slot]);
      gift.textContent = ''; gift.style.backgroundImage = spr ? `url("${spr.file}?v=${spr.v}")` : '';
      if (pb) gift.append(spriteIcon(game, pb.icon, pb.icon_f || 0, 22, 'bh-spr', true));
      right.hidden = !spr && !pb;
      box.hidden = false;
    }
    if (G.n !== n) { if (G.n > n) { popT = game.time; game.sfx?.('click'); } n = G.n; }
    const t = `${G.n}/${G.of}`;
    if (cnt.textContent !== t) cnt.textContent = t;
    if (!raf) raf = requestAnimationFrame(paint);
  }
  function paint() {
    raf = 0;
    if (box.hidden) return;
    const a = game.time - popT, b = game.time - inT, k = a < 0.28 ? 1 + 0.6 * (1 - a / 0.28) : 1, ki = Math.min(1, b / 0.2);
    set(cnt, 'transform', k > 1.001 ? `scale(${k.toFixed(3)})` : '');
    set(cnt, 'color', a < 0.28 ? '#fff' : '');
    set(box, 'opacity', ki.toFixed(2)); set(box, 'transform', ki < 1 ? `translateX(${Math.round((1 - ki) * -16)}px)` : '');
    raf = requestAnimationFrame(paint);
  }
  every(sync, 100);
}
