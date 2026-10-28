// Bảng thông báo (data/notice.json): nút 📢 sau nút Bản đồ, số đỏ là thông báo chưa xem; mỗi ngày tự mở một lần khi có thông báo
// đang chạy (đợi xong hội thoại, đoạn truyện, đường bay). Thông báo nổi bật (top) có khung vàng; nút trong thông báo mở đúng chỗ
// (sự kiện giới thiệu, bảng vinh danh góp ý, bảng xếp hạng, bảng báo lỗi). Thêm nút sự kiện "🎁 Ngọc cấp 8" trên bảng điều khiển
// khi sự kiện giới thiệu đang chạy. Nạp kiểu ở src/ui/event.css (dùng chung cho bảng sự kiện, vinh danh).
const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const KEY = 'p2d.notice.v1';
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function load() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } }
function save(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* chế độ riêng tư */ } }

export function createNotice(game) {
  const N = game.data.notice, world = document.getElementById('btn-world');
  if (!N || !world) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./event.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);

  const btn = el('button', 'ib-btn', N.btn), badge = el('i', 'ib-badge');
  btn.id = 'btn-notice'; btn.title = N.label; btn.setAttribute('aria-label', N.label);
  btn.append(badge); world.after(btn);
  const chip = el('button', 'ev-chip', game.data.referral?.chip || '');
  chip.id = 'btn-ev-gt'; chip.hidden = true;
  btn.parentElement.append(chip);

  const root = el('div', 'panel ev-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', N.close), list = el('div', 'ev-body');
  head.append(el('b', null, N.title), x);
  root.append(head, list);
  document.body.append(root);

  const active = () => { const d = today(); return N.list.filter(n => (!n.from || n.from <= d) && (!n.to || d <= n.to)); };
  const unseen = () => { const s = load().seen || []; return active().filter(n => !s.includes(n.id)); };
  function paint() {
    const n = unseen().length;
    badge.textContent = String(n); badge.hidden = !n;
    chip.hidden = !game.referralOn?.();
  }

  function act(n) {
    if (n.act === 'fame') { game.openFame?.(root); return; }
    close();
    if (n.act === 'referral') game.openReferral?.();
    else if (n.act === 'rank') game.openSocial?.('rank');
    else if (n.act === 'feedback') document.getElementById('btn-fb-loi')?.click();
  }

  function render() {
    list.textContent = '';
    const items = active().sort((a, b) => (b.top ? 1 : 0) - (a.top ? 1 : 0));
    if (!items.length) list.append(el('p', 'muted', N.empty));
    for (const n of items) {
      const card = el('div', 'ev-note' + (n.top ? ' top' : ''));
      if (n.color) card.style.borderLeftColor = n.color;
      card.append(el('b', 'ev-note-title', n.title));
      for (const l of n.lines || []) card.append(el('p', null, l));
      if (n.act && n.btn) { const b = el('button', 'act-btn' + (n.top ? ' primary' : ''), n.btn); b.onclick = () => act(n); card.append(b); }
      list.append(card);
    }
    const s = load(); s.seen = [...new Set([...(s.seen || []), ...items.map(n => n.id)])].slice(-60); save(s);
    paint();
  }

  function open() { root.hidden = false; game.uiOpen = true; render(); }
  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;
  root.addEventListener('pointerdown', e => e.stopPropagation());
  for (const b of [btn, chip]) b.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', () => { if (!root.hidden) close(); else if (game.save && !game.dialog.open) open(); });
  chip.addEventListener('click', () => { if (game.save && !game.dialog.open) game.openReferral?.(); });
  game.openNotice = open;

  // Mỗi ngày tự mở một lần khi có thông báo đang chạy, lúc rảnh tay (không hội thoại, truyện, bảng khác, đường bay)
  setInterval(paint, 5000); paint();
  const auto = setInterval(() => {
    if (!game.save || !game.player || game.dialog.open || game.story?.busy || game.uiOpen || game.traveling || game.trip) return;
    if ((game.save.step || 0) < (N.auto_step || 0)) return;   // người mới: đợi qua phần hướng dẫn đầu game
    const s = load();
    if (s.day === today()) { clearInterval(auto); return; }
    if (!active().length) return;
    s.day = today(); save(s);
    clearInterval(auto);
    open();
  }, 2000);
}
