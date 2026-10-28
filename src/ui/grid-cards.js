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
    }

    function resync() {
      setTimeout(() => {
        if (!sheet) return;
        if (panel.hidden) { closeSheet(); return; }
        const c = [...list.querySelectorAll(':scope > .skill-card')].find(x => keyOf(x) === openKey);
        if (c) show(c); else closeSheet();
      }, 40);
    }

    function show(card) {
      closeSheet();
      openKey = keyOf(card);
      sheet = el('div', 'gc-sheet');
      const head = el('div', 'gc-head'), x = el('button', 'd-close', T.close), body = el('div', 'gc-body');
      const name = el('b', 'gc-title', titleOf(card));
      name.style.color = card.style.borderLeftColor || '';
      if (card.dataset.icon) head.append(spriteIcon(game, card.dataset.icon, 0, card.dataset.iconSize ? 52 : 40, 'gc-ico', !!card.dataset.iconSize));
      head.append(name, x);
      x.onclick = closeSheet;
      const box = el('div', 'gc-card');
      for (const ch of card.children) if (ch.tagName !== 'B') box.append(ch.cloneNode(true));
      wire(box, card);
      body.append(box);
      for (const extra of card._gcExtra || []) { const cl = extra.cloneNode(true); wire(cl, extra); body.append(cl); }   // dòng đi kèm (cấp chiêu)
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
      if (card.dataset.icon) t.append(spriteIcon(game, card.dataset.icon, 0, big || 28, 'gc-ico', !!big));
      const [name, ...rest] = titleOf(card).split(' · '), first = card.querySelector('small');   // dòng 2: cấp, sao, đang mang; không có thì dòng mô tả đầu
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
