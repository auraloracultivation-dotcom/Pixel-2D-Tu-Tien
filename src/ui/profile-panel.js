// Hồ sơ đạo hữu (data/duel.json profile): chạm tên ở bảng xếp hạng (rank-view.js → game.openProfile) thì mở.
// Chủ dự án 11/11/2026 21:04: dùng chung khuôn bảng Nhân vật mới (style-self.css .sv): bên trái thẻ nhân vật của người đó (src/ui/self-left.js:
// ô đồ khung phẩm, ngọc khảm, linh thú / khôi lỗi / thú cưỡi, Lực Chiến, chỉ số), chỉ xem; bên phải (src/ui/profile-side.js) linh căn,
// binh khí, nút So tài (game/duel.js), Truyền âm, Kết bạn, chiêu, công pháp; chạm ô thì tấm chi tiết món / con thú.
// Dữ liệu từ game/profile.js (đã lọc), chữ chỉ gán textContent.
import { loadPlayer } from '../game/profile.js';
import { startDuel } from '../game/duel.js';
import { playerStats } from '../game/stats.js';
import { addFriend } from '../game/friends.js';
import { friendErr } from './friends-panel.js';
import { leftCard, statsSheet } from './self-left.js';
import { uiIco } from './self-gear.js';
import { itemSheet, beastSheet, infoSheet } from './profile-side.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const BUFFS = ['pet', 'comp', 'comp2', 'mount'];   // thứ tự ô thú dưới nhân vật (self-left.js)

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createProfile(game) {
  const P = game.data.duel?.profile;
  if (!P) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./profile.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const root = el('div', 'panel pf-panel sv'); root.hidden = true;
  const x = el('button', 'sv-x', '✕'), frame = el('div', 'sv-frame pf-frame'), left = el('div', 'sv-left'), right = el('div', 'sv-right'), mid = el('div', 'sv-mid');
  x.setAttribute('aria-label', P.close);
  right.append(mid); frame.append(left, right); root.append(frame, x);
  document.body.append(root);
  let ticket = 0, under = false;   // under: bảng Đạo hữu đang mở bên dưới: ẩn tạm cho khỏi chồng hai lớp nền trong mờ
  const social = () => document.getElementById('social');

  function close(back = true) {   // back: hiện lại bảng Đạo hữu (So tài, Truyền âm thì không)
    root.hidden = true; ticket++;
    if (under && back && social()) social().hidden = false;
    else game.uiOpen = false;
    under = false;
  }
  x.onclick = () => close();
  root.addEventListener('pointerdown', e => e.stopPropagation());

  function msg(text, retry) {
    left.replaceChildren(el('div', 'pf-wait'));
    mid.className = 'sv-mid';
    const d = el('p', 'pf-msg', text);
    if (retry) { const b = el('button', 'mini', '↻'); b.onclick = retry; d.append(' ', b); }
    mid.replaceChildren(d);
  }

  // Nút So tài / Truyền âm / Kết bạn (ô gọn hình + chữ như bảng Nhân vật)
  function actions(prof) {
    const row = el('div', 'sv-gacts pf-acts2');
    const btn = (ico, name, fn, cls = '') => { const b = el('button', 'sv-gbtn ' + cls); b.append(uiIco(game.data, ico, 'sv-aico'), el('b', null, name)); b.onclick = fn; row.append(b); return b; };
    btn('ui.ic-dau', prof.la_toi ? P.duel_self : P.duel, () => { close(false); game.closeSocial?.(); startDuel(game, prof); }, 'primary');
    if (!prof.la_toi && game.openWhisper) btn('ui.ic-chat', P.whisper, () => { close(false); game.openWhisper(prof.k, prof.ten); });
    if (!prof.la_toi && prof.k) {   // kết bạn (src/game/friends.js); đã là bạn / đã mời thì máy chủ báo lại
      const f = btn('ui.ic-dao-lu', P.friend, async () => {
        f.disabled = true;
        try { const r = await addFriend(prof.k); game.toast({ da_gui: `Đã gửi lời mời kết bạn tới ${prof.ten}.`, thanh_ban: `Đã kết bạn với ${prof.ten}!`, da_la_ban: 'Hai người đã là bạn.' }[r] || 'Đã gửi.', 2.4); }
        catch (e) { game.toast(friendErr(e), 2.4); f.disabled = false; }
      });
    }
    return row;
  }

  function render(prof) {
    const { data } = game, s = prof.save, st = playerStats(s, data);
    const view = Object.create(game, { save: { value: s } });   // bản nhìn: mọi thứ của game, riêng bản lưu là của người đó
    const show = w => {   // w: { slot } | { kind } | { stats } | null (phần mặc định)
      const back = () => show(null);
      const sheet = w?.slot ? itemSheet(view, s, w.slot, P, back) : w?.kind ? beastSheet(view, s, w.kind, P, back) : null;
      if (w && !w.stats && !sheet) return;   // ô trống (chưa mặc, không mang): giữ nguyên khung phải
      for (const b of left.querySelectorAll('.sv-slot.sel')) b.classList.remove('sel');
      mid.scrollTop = 0;
      if (w?.stats) { mid.className = 'sv-mid sheet'; statsSheet(view, st, mid, back, prof.luc_chien); return; }
      const cell = w?.slot ? left.querySelector(`.sv-col .sv-slot[aria-label="${data.items.slots[w.slot]}"]`) : w?.kind ? left.querySelectorAll('.sv-buffs .sv-slot')[BUFFS.indexOf(w.kind)] : null;
      if (sheet) { cell?.classList.add('sel'); mid.className = 'sv-mid sheet'; mid.replaceChildren(sheet); return; }
      mid.className = 'sv-mid pf-home'; mid.replaceChildren(infoSheet(game, prof, P, actions(prof)));
    };
    const h = { name: prof.ten, cp: prof.luc_chien, pick: slot => show({ slot }), openExtra: kind => show({ kind }), stats: () => show({ stats: true }) };
    left.replaceChildren(leftCard(view, st, h));
    const nm = left.querySelector('.sv-nm');
    if (prof.co && nm) { nm.classList.add('co'); nm.title = P.flag; }
    show(null);
  }

  async function open(k, ten) {
    if (root.hidden) { under = social()?.hidden === false; if (under) social().hidden = true; }
    root.hidden = false; game.uiOpen = true;
    if (!game.online) return msg(P.offline);
    const my = ++ticket;
    msg(`${ten ? ten + ': ' : ''}${P.loading}`);
    try {
      const prof = await loadPlayer(game, k);
      if (my === ticket) render(prof);
    } catch { if (my === ticket) msg(P.error, () => open(k, ten)); }
  }
  game.openProfile = open;
}
