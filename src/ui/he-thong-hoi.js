// Mục Hỏi đáp của Hệ Thống (data/faq.json), gộp cả Hỏi thêm (chủ dự án 11/11/2026 23:27: "Hỏi thêm tích hợp vào hỏi đáp").
// Một ô gõ: lọc câu hỏi thường gặp, tìm tên trong Tàng Thư (bấm được); không thấy thì bấm "Hỏi bổn hệ thống câu này" gửi đi
// (net/he-thong.js askSystem; câu nhiều người hỏi sẽ có trong Hỏi đáp). Nhóm câu hỏi thu gọn (06/11/2026 23:38: kéo xuống lâu quá),
// chạm tên nhóm mới mở. Dưới cùng: các câu ký chủ đã hỏi kèm trả lời. Chữ người chơi chỉ gán textContent.
import { linkText, quickAnswers } from './he-thong-tra.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const norm = t => String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

// Giữ qua các lần vẽ: chữ đang gõ, nhóm đang mở, câu đã hỏi (null: chưa tải)
export const hoiState = () => ({ q: '', open: new Set(), mine: null, busy: false });

// api: { pick(id): mở một mục Tàng Thư, render(): vẽ lại cả mục }
export function renderHoi(game, body, st, api) {
  const C = game.data['he-thong'], F = game.data.faq, T = C.text;
  const find = el('input', 'ht-find'); find.type = 'search'; find.placeholder = T.faq_find; find.value = st.q; find.maxLength = 300;
  find.addEventListener('keydown', ev => ev.stopPropagation());   // gõ chữ không điều khiển nhân vật
  const askBox = el('div', 'ht-hoi-ask'), list = el('div', 'ht-faq'), mineBox = el('div', 'ht-hoi-mine');
  body.append(find, askBox, list, mineBox);

  async function send() {
    const q = st.q.trim();
    if (q.length < 4) { game.toast(C.ask_err.ngan, 1.6); return; }
    if (st.busy) return;
    st.busy = true; drawAsk();
    try {
      const N = await import('../net/he-thong.js'); await N.askSystem(q, game.save?.step);
      st.q = ''; find.value = ''; st.mine = null; game.toast(C.ask_ok, 2); game.htFace?.react('ask_ok');
    } catch (e) {
      const m = String(e?.message || ''); game.htFace?.react('ask_err');
      game.toast(C.ask_err[Object.keys(C.ask_err).find(k => m.includes(k))] || (game.cloud ? C.ask_err.other : C.ask_err.chua_dang_nhap), 2.2);
    } finally { st.busy = false; }
    drawAsk(); drawList(); drawMine();
  }
  // Dưới ô gõ: gõ đủ dài thì hiện tên tìm thấy trong Tàng Thư và nút gửi câu hỏi
  function drawAsk() {
    askBox.textContent = '';
    const q = st.q.trim();
    if (q.length < 4) { askBox.append(el('p', 'ht-line ht-muted', C.ask_head)); return; }
    const ent = quickAnswers(game, q).ent;
    if (ent.length) { const d = el('p', 'ht-line'); linkText(game, d, ent.map(e => e.name).join(' · '), api.pick); askBox.append(el('div', 'ht-sub', C.tra.ask_quick), d); }
    const b = el('button', 'ht-btn sm', st.busy ? '…' : C.ask_this || C.ask_send); b.type = 'button'; b.disabled = st.busy; b.onclick = send;
    askBox.append(b);
  }
  function drawList() {
    list.textContent = '';
    if (!F) return;
    const q = norm(st.q.trim());
    for (const gr of F.groups) {
      const items = q ? gr.list.filter(it => norm(it.q + ' ' + it.a.join(' ')).includes(q)) : gr.list;
      if (!items.length) continue;
      const on = !!q || st.open.has(gr.title), head = el('button', `ht-grp${on ? ' on' : ''}`); head.type = 'button';
      head.append(el('span', null, gr.title), el('i', null, `${items.length} ${on ? '▾' : '▸'}`));
      head.onclick = () => { if (q) return; st.open.has(gr.title) ? st.open.delete(gr.title) : st.open.add(gr.title); drawList(); };
      list.append(head);
      if (!on) continue;
      for (const it of items) {
        const card = el('div', 'ht-qa'), qb = el('button', 'ht-q', it.q), a = el('div', 'ht-a'); qb.type = 'button';
        for (const l of it.a) a.append(linkText(game, el('p'), l, api.pick));   // tên chiêu, quái, đan… bấm được
        qb.onclick = () => card.classList.toggle('on');
        card.append(qb, a); list.append(card);
      }
    }
    if (!list.childElementCount) list.append(el('p', 'ht-line ht-muted', T.faq_none));
  }
  function drawMine() {
    mineBox.textContent = '';
    if (st.mine === null && game.cloud) {
      st.mine = 'cho';
      import('../net/he-thong.js').then(N => N.myQuestions()).then(r => { st.mine = r || []; }).catch(() => { st.mine = []; }).then(() => { if (mineBox.isConnected) drawMine(); });
    }
    if (!Array.isArray(st.mine) || !st.mine.length) return;
    mineBox.append(el('div', 'ht-sub', C.ask_mine));
    for (const m of st.mine) { const d = el('div', 'ht-mine'); d.append(el('b', null, m.q)); if (m.a) d.append(el('p', null, m.a)); mineBox.append(d); }
  }
  find.oninput = () => { st.q = find.value; clearTimeout(find.t); find.t = setTimeout(() => { drawAsk(); drawList(); }, 200); };
  drawAsk(); drawList(); drawMine();
}
