// Khung trò chuyện nhỏ dưới màn hình (chủ dự án 02/11/2026 13:38): bên trái các nút chiêu, dưới chỗ kéo cần chạy. Nền trong
// suốt, hiện vài tin mới nhất của kênh Thế giới (và tin trên tinh cầu), kèm một ô "nhập tin". Chạm khung thì mở rộng thành
// bảng Trò chuyện đầy đủ (src/ui/social-panel.js, tab Thế giới, con trỏ vào ô gõ); chạm bất kỳ chỗ nào ngoài bảng là thu nhỏ.
// Bỏ mục Trò chuyện khỏi Menu. Đọc kênh Thế giới mỗi POLL giây khi đã đăng nhập.
import { worldState, pullWorld, isBlocked } from '../game/world-chat.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const SHOW = 3, POLL = 20;
const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createChatDock(game) {
  const S = game.data.social, names = game.data.realms.names;
  const css = document.createElement('link');   // kiểu của khung trò chuyện và cột nhiệm vụ (src/ui/docks.css)
  css.rel = 'stylesheet'; css.href = new URL(`./docks.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const dock = el('div', 'chat-dock'); dock.id = 'chat-dock'; dock.hidden = true;
  const log = el('div', 'cd-log'), fake = el('div', 'cd-input', S.world.placeholder);
  dock.append(log, fake);
  document.body.append(dock);

  let key = '', pulled = 0, fromDock = false;
  function paint() {
    const on = !!game.online;
    const w = on ? worldState(game).list.filter(m => m.la_toi || !isBlocked(game, m.k)).map(m => ({ t: m.id, n: m.ten, c: m.chu, r: m.canh_gioi })) : [];
    const here = (game.chatLog || []).map((m, i) => ({ t: 'h' + i, n: m.name, c: m.text }));
    const L = [...w.slice(-SHOW), ...here.slice(-1)].slice(-SHOW);
    const k = on + L.map(m => m.t).join(',');
    if (k === key) return;
    key = k; log.replaceChildren();
    if (!L.length) log.append(el('div', 'cd-empty', on ? S.world.empty : S.world.offline));
    for (const m of L) { const d = el('div', 'cd-line'); if (m.r != null) d.append(el('small', null, `[${names[m.r]}] `)); d.append(el('b', null, m.n + ': '), m.c); log.append(d); }
  }

  function expand() {
    if (!game.save || game.dialog.open || game.trip) return;
    game.closeAll?.();
    game.openSocial?.('world');
    fromDock = true;
    setTimeout(() => document.getElementById('social-input')?.focus(), 50);
  }
  // Báo lỗi #81: đang giữ cần điều khiển dễ chạm nhầm khung chat. Chỉ mở bằng chạm gọn (click: vuốt qua thì trình duyệt không
  // tính) và chỉ khi đó là ngón chính (ngón thứ hai trong lúc ngón kia giữ cần điều khiển thì isPrimary = false).
  // Bản trước tự đếm ngón đang giữ, có máy mất sự kiện nhấc ngón nên đếm sai, khung chat không bấm được nữa (chủ dự án 03/11 10:09).
  let primary = false;
  dock.addEventListener('pointerdown', e => { e.stopPropagation(); primary = e.isPrimary !== false; });
  dock.addEventListener('click', () => { if (primary) expand(); primary = false; });

  // Mở từ khung nhỏ: chạm ngoài bảng là thu nhỏ lại
  document.addEventListener('pointerdown', e => {
    const p = document.getElementById('social');
    if (!fromDock || !p || p.hidden) { fromDock = false; return; }
    if (!p.contains(e.target)) { document.getElementById('social-close')?.click(); fromDock = false; }
  }, true);

  every(() => {
    const busy = !game.save || !game.player || game.trip;
    dock.hidden = busy;
    if (busy) return;
    if (game.online && Date.now() - pulled > POLL * 1000 && document.getElementById('social')?.hidden !== false) { pulled = Date.now(); pullWorld(game).then(paint); }
    paint();
  }, 1000);
}
