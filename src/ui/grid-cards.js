// Bảng dạng lưới như túi đồ (chủ dự án xin 28/10/2026): thẻ dài trong các bảng (linh thú, thú cưỡi, đồng hành, chiêu,
// công pháp, việc, thành tựu, động phủ, tông môn) hiện thành lưới ô nhỏ: hình (data-icon của thẻ, id hình trong data/art.json),
// tên, một dòng. Chạm ô thì tấm chi tiết trượt lên từ đáy bảng, đủ chữ và nút của thẻ. Không sửa cách từng bảng dựng thẻ:
// theo dõi danh sách, thẻ mới dựng là tự thêm ô; thẻ gốc ẩn đi, nút trong tấm chi tiết bấm hộ nút của thẻ gốc.
// Thẻ là nút bấm (chạm để chọn, như linh thú, chiêu) thì tấm chi tiết có nút chính, chữ lấy từ data-act (không có thì "Chọn").
import { spriteIcon } from './sprite-icon.js';

const LISTS = ['pets-list', 'skills-list', 'daily-list', 'achv-list', 'cave-list', 'guild-list'];
const T = { pick: 'Chọn', close: '✕' };

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

const titleOf = c => c.querySelector('b')?.textContent || '';
const keyOf = c => c.dataset.key || titleOf(c).replace(/^✦\s*/, '').split(' · ')[0];

export function gridCards(game) {
  for (const id of LISTS) {
    const list = document.getElementById(id);
    if (!list) continue;
    const panel = list.closest('.panel, #bag');
    let sheet = null, openKey = null, queued = false;

    function closeSheet() { sheet?.remove(); sheet = null; openKey = null; }

    // Nút trong tấm chi tiết bấm hộ nút gốc theo thứ tự; bấm xong đợi bảng dựng lại rồi mở lại đúng thẻ (đổi chữ, đổi nút)
    function wire(clone, orig) {
      const a = [...clone.querySelectorAll('button')], b = [...orig.querySelectorAll('button')];
      a.forEach((btn, i) => { btn.onclick = () => { b[i]?.click(); resync(); }; });
      // Ô gõ: bản sao không mang hàm oninput của ô gốc. Trước 21/11/2026 gõ vào tấm chi tiết thì ô gốc vẫn trống, bấm nút là gửi chữ rỗng
      // (một người chơi gõ tên "Lập tông môn" 6 lần, máy chủ lần nào cũng nhận tên rỗng; cả máy chủ không có tông môn mới từ 12/11).
      // Giờ mỗi lần gõ chép chữ sang ô gốc và gọi đúng sự kiện của ô gốc; chữ đang ghép của bàn phím điện thoại cũng đi theo.
      // Bài thử: tools/kiem/o-go-luoi.thu.mjs.
      const ia = [...clone.querySelectorAll('input, textarea, select')], ib = [...orig.querySelectorAll('input, textarea, select')];
      ia.forEach((inp, i) => {
        const o = ib[i];
        if (!o) return;
        inp.value = o.value; if ('checked' in o) inp.checked = o.checked;
        const chep = ev => { o.value = inp.value; if ('checked' in o) o.checked = inp.checked; o.dispatchEvent(new Event(ev.type, { bubbles: true })); };
        inp.addEventListener('input', chep); inp.addEventListener('change', chep);
        inp.addEventListener('keydown', ev => { ev.stopPropagation(); if (ev.key === 'Enter') o.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })); });   // gõ chữ không điều khiển nhân vật
      });
    }

    function resync() {
      setTimeout(() => {
        if (!sheet) return;
        if (panel.hidden) { closeSheet(); return; }
        const c = [...list.querySelectorAll(':scope > .skill-card')].find(x => keyOf(x) === openKey);
        if (!c) { closeSheet(); return; }
        // Đang gõ trong tấm chi tiết mà bảng dựng lại (tải danh sách xong…): mở lại rồi đặt con trỏ về đúng ô, khỏi mất bàn phím
        const go = sheet.querySelectorAll('input, textarea'), dang = [...go].indexOf(document.activeElement);
        const vt = dang >= 0 ? [go[dang].selectionStart, go[dang].selectionEnd] : null;
        show(c);
        if (dang >= 0) { const o = sheet?.querySelectorAll('input, textarea')[dang]; if (o) { o.focus(); try { o.setSelectionRange(...vt); } catch { /* ô số */ } } }
      }, 40);
    }

    function show(card) {
      closeSheet();
      openKey = keyOf(card);
      sheet = el('div', 'gc-sheet');
      const head = el('div', 'gc-head'), x = el('button', 'd-close', T.close), body = el('div', 'gc-body');
      const name = el('b', 'gc-title', titleOf(card));
      name.style.color = card.style.borderLeftColor || '';
      if (card.dataset.icon) head.append(ring(spriteIcon(game, card.dataset.icon, 0, card.dataset.iconSize ? 52 : 40, 'gc-ico', !!card.dataset.iconSize), card));
      head.append(name, x);
      x.onclick = closeSheet;
      const box = el('div', 'gc-card');
      for (const ch of card.children) if (ch.tagName !== 'B') box.append(ch.cloneNode(true));
      wire(box, card);
      body.append(box);
      for (const extra of card._gcExtra || []) { const cl = extra.cloneNode(true); cl.classList.remove('gc-hidden'); wire(cl, extra); body.append(cl); }   // bản sao bỏ lớp ẩn (trước đây nút Tẩy luyện, Bán trong tấm chi tiết bị ẩn theo)   // dòng đi kèm (cấp chiêu)
      if (card.tagName === 'BUTTON') {
        const used = card.dataset.used && card.classList.contains('using');   // đang mang, đang cưỡi: nút chính mờ
        const go = el('button', 'act-btn primary gc-go', used ? card.dataset.used : card.dataset.act || T.pick);
        go.disabled = card.disabled || used;
        go.onclick = () => { card.click(); resync(); };
        body.append(go);
      }
      sheet.append(head, body);
      panel.append(sheet);
    }

    function tile(card) {
      const t = el('button', 'gc-tile');
      for (const k of ['using', 'locked']) if (card.classList.contains(k)) t.classList.add(k);
      if (card.disabled) t.classList.add('off');
      t.style.borderLeftColor = card.style.borderLeftColor || '';
      const big = +card.dataset.iconSize || 0;   // nhân vật chibi (đồng hành, thời trang): hình to theo chiều cao, chữ nhỏ lại
      if (big) t.classList.add('gc-big');
      if (card.dataset.icon) t.append(ring(spriteIcon(game, card.dataset.icon, 0, big || 28, 'gc-ico', !!big), card));
      const [name, ...rest] = titleOf(card).split(' · '), first = card.querySelector('small');   // dòng 2: cấp, sao, đang mang; không có thì dòng mô tả đầu
      if (card.dataset.o) {   // ô kiểu trang bị (chủ dự án 19/11/2026 12:47: linh thú, thú cưỡi, khôi lỗi, thời trang giống phần trang bị): khung phẩm, không tên, cấp / sao ở góc
        t.classList.add('gc-eq'); t.dataset.o = card.dataset.o; t.title = name; t.setAttribute('aria-label', name);
        if (card.dataset.badge) t.append(el('b', 'gc-badge', card.dataset.badge));
        if (+card.dataset.star) t.append(el('i', 'gc-star', '★' + card.dataset.star));
        t.onclick = () => (openKey === keyOf(card) && sheet ? closeSheet() : show(card));
        return t;
      }
      t.append(el('b', null, name));
      if (rest.length || first) t.append(el('small', null, rest.length ? rest.join(' · ') : first.textContent));
      t.onclick = () => (openKey === keyOf(card) && sheet ? closeSheet() : show(card));
      return t;
    }

    function enhance() {
      queued = false;
      const fresh = [...list.querySelectorAll(':scope > .skill-card:not(.gc-hidden)')];
      list.classList.toggle('gc-on', !!list.querySelector(':scope > .skill-card'));   // tông môn lúc trò chuyện không có thẻ: giữ dạng cũ
      for (const card of fresh) {
        card._gcExtra = [];
        for (let n = card.nextElementSibling; n && n.classList.contains('skill-up'); n = n.nextElementSibling) { card._gcExtra.push(n); n.classList.add('gc-hidden'); }
        card.classList.add('gc-hidden');
        card.before(tile(card));
      }
      if (fresh.length && sheet && openKey) resync();
    }

    new MutationObserver(() => { if (!queued) { queued = true; queueMicrotask(enhance); } }).observe(list, { childList: true });
    new MutationObserver(() => { if (panel.hidden) closeSheet(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  }
}

// Vòng màu phẩm quanh biểu tượng (thẻ chiêu: data-gc = màu phẩm, src/game/skill-grade.js)
function ring(ico, card) {
  const c = card.dataset.gc;
  if (c && ico) { ico.style.borderRadius = '6px'; ico.style.boxShadow = `0 0 0 1.5px ${c}, 0 0 7px ${c}`; }
  return ico;
}
