// Câu hỏi thường gặp cho người mới (chủ dự án 04/11/2026, góp ý #68; nội dung ở data/faq.json): nút ! tròn nhỏ ở góc trên phải màn hình,
// cột nhiệm vụ truyện và cột nhiệm vụ hằng ngày lùi sang trái nhường chỗ (src/ui/faq.css). Chạm câu hỏi để mở / gập câu trả lời
// (mở câu này thì gập câu khác). Đóng bằng ✕ hoặc khi bấm nút khác trên màn hình (game.closeAll đóng mọi .panel đang mở).
const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createFaq(game) {
  const F = game.data.faq;
  if (!F) return;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./faq.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);

  const btn = el('button', 'faq-btn', F.btn);
  btn.id = 'btn-faq'; btn.title = F.label; btn.setAttribute('aria-label', F.label); btn.hidden = true;
  const root = el('div', 'panel faq-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', F.close), list = el('div', 'faq-body');
  x.id = 'faq-close';
  head.append(el('b', null, F.title), x);
  root.append(head, list);
  document.body.append(btn, root);

  let built = false;
  function build() {
    built = true;
    for (const g of F.groups) {
      list.append(el('div', 'faq-group', g.title));
      for (const it of g.list) {
        const card = el('div', 'faq-item'), q = el('button', 'faq-q', it.q), a = el('div', 'faq-a');
        q.setAttribute('aria-expanded', 'false');
        for (const l of it.a) a.append(el('p', null, l));
        q.onclick = () => {
          const on = !card.classList.contains('on');
          for (const c of list.querySelectorAll('.faq-item.on')) { c.classList.remove('on'); c.firstChild.setAttribute('aria-expanded', 'false'); }
          card.classList.toggle('on', on); q.setAttribute('aria-expanded', String(on));
        };
        card.append(q, a);
        list.append(card);
      }
    }
  }

  function open() { game.closeAll?.(); if (!built) build(); root.hidden = false; game.uiOpen = true; list.scrollTop = 0; }
  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;
  root.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('pointerdown', e => e.stopPropagation());
  btn.addEventListener('click', () => { if (!root.hidden) close(); else if (game.save && !game.dialog.open && !game.trip) open(); });
  game.openFaq = open;

  // chỉ hiện khi đã vào game và đang thấy HUD (màn đăng nhập, đường bay thì ẩn; bảng đang mở thì CSS ẩn)
  const paint = () => { const hud = document.getElementById('hud'); btn.hidden = !game.save || !hud || hud.hidden; };
  paint(); setInterval(paint, 700);
}
