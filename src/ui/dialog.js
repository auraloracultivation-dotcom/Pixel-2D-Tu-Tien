// Hộp thoại kể chuyện và chọn lựa. Chạm để hiện hết chữ / sang câu tiếp.
// Nhịp chữ (chủ dự án 14/11/2026 00:05: "cốt truyện chạy quá nhanh, chữ tự động lướt qua căn bản không ai đọc được"; docs/10-CAI-HON.md việc 1):
// chữ hiện T.cps ký tự / giây, nghỉ thêm T.comma_ms sau dấu phẩy và T.stop_ms sau dấu hết câu (giọng nói có nhịp); Tự hành chỉ lật câu khi đã đủ
// giờ đọc (d.holdSec, src/game/pilot.js pilotDialog); câu có cờ { tap: true } (data/story.json) thì phải chạm mới sang. Số ở data/config.json → dialog.
// Hộp thoại xếp hàng: lời chào lễ, thưởng bí cảnh... gọi lúc đang có hộp khác thì đợi hộp đó xong rồi mới hiện.
// (Trước đây hộp mới đè hộp cũ, lời hứa của hộp cũ không bao giờ xong nên truyện đứng mãi ở bước đó.)
import { tr } from '../core/i18n.js';

export function createDialog(onLine, T = {}) {
  const box = document.getElementById('dialog');
  const who = document.getElementById('dlg-who');
  const text = document.getElementById('dlg-text');
  const choices = document.getElementById('dlg-choices');
  const hint = document.getElementById('dlg-hint');
  const d = { open: false, lineNo: 0 };   // lineNo: số câu đã hiện (Tự hành biết câu vừa đổi để đếm giờ đọc lại từ đầu)
  // nút ✕ góc hộp khi đang có lựa chọn (chủ dự án 04/11/2026 15:09: bể cá tràn màn không có chỗ tắt): bỏ ngang như "Để sau"
  const xb = document.createElement('button'); xb.className = 'dlg-x'; xb.textContent = '✕'; xb.setAttribute('aria-label', 'Đóng'); xb.hidden = true;
  xb.addEventListener('pointerdown', e => { e.stopPropagation(); d.cancel?.(); });
  box.append(xb);
  new MutationObserver(() => { xb.hidden = !choices.childElementCount || choices.querySelector('.dlg-input') != null; }).observe(choices, { childList: true });
  let full = '', shown = 0, timer = null, next = null, line = Promise.resolve(), quit = null, typeSec = 0, mustTap = false;
  const queue = run => { const p = line.then(() => new Promise(run)); line = p.catch(() => {}); return p; };

  const STOP = /[.!?…]/, COMMA = /[,;:]/, WIDE = /[。！？，、；：]/, CJK = /[\u3400-\u9fff]/;
  // Nghỉ bao nhiêu mili giây sau ký tự thứ i (đã hiện): chỉ khi sau nó còn chữ và là chỗ ngắt thật (sau dấu có khoảng trắng, hoặc dấu toàn cỡ của chữ Hán)
  const pause = i => {
    if (i >= full.length) return 0;
    const ch = full[i - 1], nx = full[i];
    if (WIDE.test(ch)) return /[。！？]/.test(ch) ? T.stop_ms || 0 : T.comma_ms || 0;
    if (nx !== ' ' && nx !== '\n') return 0;   // "..." đang gõ dở, số 1.5: không ngắt
    return STOP.test(ch) ? T.stop_ms || 0 : COMMA.test(ch) ? T.comma_ms || 0 : 0;
  };
  const showAll = () => { shown = full.length; text.textContent = full; clearTimeout(timer); };
  function type(str) {
    full = tr(str); shown = 0; text.textContent = ''; d.lineNo++;   // dịch cả câu trước khi gõ từng chữ (ngôn ngữ khác tiếng Việt)
    clearTimeout(timer); typeSec = 0;
    if (!T.cps) { showAll(); return; }
    const per = 1000 / T.cps;
    for (let i = 1; i <= full.length; i++) typeSec += per + pause(i);
    typeSec /= 1000;
    const step = () => {
      shown++; text.textContent = full.slice(0, shown);
      if (shown < full.length) timer = setTimeout(step, per + pause(shown));
    };
    timer = setTimeout(step, per);
  }
  const must = on => { mustTap = on; box.classList.toggle('must-tap', on); };

  box.addEventListener('pointerdown', e => {
    e.stopPropagation();
    if (choices.childElementCount) return;
    if (shown < full.length) { showAll(); return; }
    if (next) next();
  });

  // lines: [[tên, câu], ...]
  d.say = lines => queue(resolve => {
    let i = 0;
    d.open = true; box.hidden = false; choices.innerHTML = ''; hint.hidden = false;
    quit = () => { i = lines.length; show(); };
    const show = () => {
      if (i >= lines.length) { next = null; quit = null; must(false); d.open = false; box.hidden = true; resolve(); return; }
      const [n, s, o] = lines[i++];
      who.textContent = n; must(!!o?.tap); type(s); onLine?.();
    };
    next = show; show();
  });

  // Lật câu kế (tự hành); đang có lựa chọn thì thôi
  d.skip = () => {
    if (choices.childElementCount) return;
    if (shown < full.length) showAll();
    else if (next) next();
  };
  // Tự hành: câu đang hiện phải đứng ít nhất bao nhiêu giây (tính từ lúc bắt đầu gõ) rồi mới được tự lật. Đủ giờ gõ + read_min, đủ giờ đọc
  // (số ký tự / read_cps + read_pad; chữ Hán mỗi chữ tính cjk ký tự), không quá giờ gõ + read_max. Câu phải chạm: vô hạn.
  d.holdSec = () => {
    if (mustTap) return Infinity;
    if (!T.read_cps) return 0;
    let units = 0;
    for (const ch of full) units += CJK.test(ch) ? T.cjk || 1 : 1;
    return Math.min(Math.max(typeSec + (T.read_min || 0), units / T.read_cps + (T.read_pad || 0)), typeSec + (T.read_max || 0));
  };

  let keep = null;   // { key, top }: chỗ cuộn của danh sách lựa chọn vừa chọn
  // options: [{id, label, desc, color}]
  d.choose = (title, options, guard = 0) => queue(resolve => {   // guard: số mili giây đầu bỏ qua chạm (đề xuất #31)
    d.open = true; box.hidden = false; hint.hidden = true; who.textContent = '';
    full = title; shown = title.length; text.textContent = title; clearTimeout(timer); must(false);
    choices.innerHTML = '';
    quit = () => { quit = null; choices.innerHTML = ''; d.open = false; box.hidden = true; resolve(null); };
    const t0 = performance.now(), key = options.map(o => o.id + o.label).join('|');
    // Món bán có hình (o.spr) xếp lưới: ô có hình + tên, giá nằm dưới ô (chủ dự án 19/11/2026 10:24: mọi NPC bán đồ hiện lưới có ảnh, tên;
    // giá ở ngoài ô). Hình lấy qua d.iconOf(spr, cỡ) do hud.js gắn. Lựa chọn không có hình (Thôi, Trò chuyện) vẫn là nút dài bên dưới.
    const grid = d.iconOf && options.some(o => o.spr) ? document.createElement('div') : null;
    if (grid) { grid.className = 'choice-grid'; choices.append(grid); }
    for (const o of options) {
      const b = document.createElement('button');
      if (grid && o.spr) {
        b.className = 'gcell' + (o.dim ? ' dim' : ''); b.type = 'button'; b.title = o.desc || '';
        if (o.color) b.style.setProperty('--gc', o.color);
        const im = document.createElement('i'); im.className = 'gc-img'; im.append(d.iconOf(o.spr, 40));
        const nm = document.createElement('b'); nm.textContent = o.label;
        b.append(im, nm);
        if (o.tag) { const t = document.createElement('em'); t.className = 'gc-tag'; t.textContent = o.tag; b.append(t); }
        const w = document.createElement('div'); w.className = 'gc';
        const pr = document.createElement('small'); pr.className = 'gc-price'; if (o.cur) pr.append(d.iconOf(o.cur, 16)); pr.append(o.price || '');   // cur: hình tiền (Linh Thạch) trước số
        w.append(b, pr); grid.append(w);
        b.addEventListener('pointerdown', e => e.stopPropagation());
        b.addEventListener('click', e => { e.stopPropagation(); if (performance.now() - t0 < guard) return; keep = { key, top: choices.scrollTop }; quit = null; choices.innerHTML = ''; d.open = false; box.hidden = true; resolve(o.id); });
        continue;
      }
      b.className = 'choice';
      b.style.borderLeft = `6px solid ${o.color || 'var(--line-hi)'}`;
      const l = document.createElement('b'); l.textContent = o.label;
      const s = document.createElement('small'); s.textContent = o.desc || '';
      b.append(l, s);
      // Chọn bằng chạm nhả (click), không chọn ngay lúc đặt ngón: vuốt danh sách dài (Vạn Bảo Lâu) không bị mua nhầm món dưới ngón tay
      // và không bị vẽ lại từ đầu (chủ dự án 11/11/2026 16:53: người chơi không vuốt được chợ trong Vạn Bảo Lâu). Trình duyệt không
      // phát click khi ngón tay đã kéo cuộn. pointerdown vẫn chặn lan lên hộp thoại (hộp thoại chạm là sang câu).
      b.addEventListener('pointerdown', e => e.stopPropagation());
      b.addEventListener('click', e => {
        e.stopPropagation();
        if (performance.now() - t0 < guard) return;   // đang bấm Đánh liên tục thì khỏi chạm trúng lựa chọn vừa hiện
        keep = { key, top: choices.scrollTop };   // mua xong Vạn Bảo Lâu hỏi lại cùng danh sách: giữ chỗ đang xem
        quit = null; choices.innerHTML = ''; d.open = false; box.hidden = true; resolve(o.id);
      });
      choices.append(b);
    }
    if (keep?.key === key) choices.scrollTop = keep.top;
    keep = null;
  });
  // Hỏi một dòng chữ (đặt tên...): trả về chữ đã gõ, hoặc null nếu bấm thôi
  d.ask = (title, placeholder, max, ok, cancel) => queue(resolve => {
    d.open = true; box.hidden = false; hint.hidden = true; who.textContent = '';
    full = title; shown = title.length; text.textContent = title; clearTimeout(timer); must(false);
    choices.innerHTML = '';
    const inp = document.createElement('input');
    inp.className = 'dlg-input'; inp.maxLength = max; inp.placeholder = placeholder; inp.autocomplete = 'off';
    const done = v => { quit = null; choices.innerHTML = ''; d.open = false; box.hidden = true; resolve(v); };
    quit = () => done(null);
    const mk = (label, v) => {
      const b = document.createElement('button'); b.className = 'choice';
      const l = document.createElement('b'); l.textContent = label; b.append(l);
      b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); done(v()); });
      return b;
    };
    inp.addEventListener('pointerdown', e => e.stopPropagation());
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') done(inp.value); });
    choices.append(inp, mk(ok, () => inp.value), mk(cancel, () => null));
    setTimeout(() => inp.focus(), 50);
  });
  // Bỏ ngang hộp đang hiện (chọn mục khác ở cột bên trái, chủ dự án 04/11/2026 09:43): hộp chọn trả null như bấm "Để sau"
  d.cancel = () => { clearTimeout(timer); must(false); quit?.(); };
  return d;
}
