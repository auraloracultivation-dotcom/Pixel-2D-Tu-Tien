// Mục Tàng Thư của Hệ Thống (src/game/tra-cuu.js dựng từ data/; nhãn ở data/he-thong.json → tra; chủ dự án 10/11/2026 09:16).
// Ô tìm (không dấu cũng ra), chip lọc theo loại, "Hệ Thống gợi ý" theo bản đồ đang đứng, cảnh giới, chiêu đang mang. Chạm một mục:
// thẻ chi tiết (mô tả, chỉ số, rơi từ đâu, công thức) + "Liên quan" nối chéo; chữ trùng tên mục khác thành nút bấm (traLink).
// Nút ‹ quay lại mục trước. linkText() dùng chung cho Hỏi đáp, Hỏi thêm. Chữ người chơi chỉ gán textContent.
import { traIndex, traSearch, traLink, traSuggest } from '../game/tra-cuu.js';

// Màu tên theo mục, sáng lên nếu tối quá (chữ trên nền xanh đậm phải đọc được)
const bright = hex => { const n = parseInt(String(hex).slice(1), 16); if (!(n >= 0)) return ''; const r = n >> 16, g = (n >> 8) & 255, b = n & 255, l = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
  if (l >= 0.5) return hex; const k = (0.62 - l) / (1 - l); const m = c => Math.round(c + (255 - c) * k); return `rgb(${m(r)},${m(g)},${m(b)})`; };
const tint = (node, c) => { const v = c && bright(c); if (v) node.style.setProperty('--kw', v); };
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// Gắn chữ vào parent, tên mục thành nút bấm mở Tàng Thư
export function linkText(game, parent, text, pick) {
  for (const part of traLink(traIndex(game), text)) {
    if (!part.e) { parent.append(document.createTextNode(part.t)); continue; }
    const a = el('button', 'ht-kw', part.t); a.type = 'button';
    tint(a, part.e.color);
    a.onclick = ev => { ev.stopPropagation(); pick(part.e.id); };
    parent.append(a);
  }
  return parent;
}

export function renderTra(game, body, st, rerender) {
  const T = game.data['he-thong'].tra, idx = traIndex(game);
  const go = id => { if (st.cur) st.back.push(st.cur); st.cur = id; rerender(); };
  if (st.cur) {   // thẻ chi tiết
    const e = idx.get(st.cur);
    const top = el('div', 'ht-tra-top'), bk = el('button', 'ht-tra-bk', '‹'); bk.type = 'button';
    bk.onclick = () => { st.cur = st.back.pop() || null; rerender(); };
    top.append(bk, el('span', 'ht-tra-kind', T.kinds[e?.kind] || ''));
    body.append(top);
    if (!e) { body.append(el('p', 'ht-line ht-muted', T.none)); return; }
    const h = el('div', 'ht-tra-name', e.name); tint(h, e.color);
    body.append(h);
    if (e.desc) body.append(linkText(game, el('p', 'ht-line'), e.desc, go));
    if (e.rows.length) {
      const tb = el('div', 'ht-tra-rows');
      for (const [k, v] of e.rows) { const r = el('div', 'ht-tra-row'); r.append(el('span', null, k), linkText(game, el('b'), String(v), go)); tb.append(r); }
      body.append(tb);
    }
    const rel = [...e.rel].map(id => idx.get(id)).filter(Boolean);
    if (rel.length) {
      body.append(el('div', 'ht-sub', T.related));
      const box = el('div', 'ht-tra-chips');
      for (const r of rel.sort((a, b) => a.kind.localeCompare(b.kind) || a.name.localeCompare(b.name, 'vi'))) box.append(chip(r, go, T));
      body.append(box);
    }
    return;
  }
  // danh sách
  const find = el('input', 'ht-find'); find.type = 'search'; find.placeholder = T.find; find.value = st.q;
  const kinds = el('div', 'ht-tra-chips ht-tra-kinds'), list = el('div', 'ht-tra-list');
  for (const k of ['', ...Object.keys(T.kinds)]) {
    if (k && !idx.list.some(e => e.kind === k)) continue;
    const b = el('button', `ht-tra-k${st.kind === k ? ' on' : ''}`, k ? T.kinds[k] : T.all); b.type = 'button';
    b.onclick = () => { st.kind = k; rerender(); };
    kinds.append(b);
  }
  body.append(find, kinds, list);
  const draw = () => {
    list.textContent = '';
    if (!st.q.trim() && !st.kind) {
      const sug = traSuggest(game, idx);
      if (sug.length) { list.append(el('div', 'ht-sub', T.suggest)); const box = el('div', 'ht-tra-chips'); sug.forEach(e => box.append(chip(e, go, T))); list.append(box); }
      list.append(el('p', 'ht-line ht-muted', T.count.replace('{n}', idx.list.length)));
      return;
    }
    const res = traSearch(idx, st.q, st.kind);
    for (const e of res.slice(0, 80)) {
      const b = el('button', 'ht-tra-item'); b.type = 'button';
      const n = el('b', null, e.name); tint(n, e.color);
      b.append(n, el('i', null, T.kinds[e.kind] || ''));
      if (e.desc) b.append(el('span', null, e.desc));
      b.onclick = () => go(e.id);
      list.append(b);
    }
    if (!res.length) list.append(el('p', 'ht-line ht-muted', T.none));
  };
  find.oninput = () => { st.q = find.value; draw(); };
  draw();
}

function chip(e, go, T) {
  const b = el('button', 'ht-kw ht-tra-chip'); b.type = 'button';
  b.append(el('small', null, T.kinds[e.kind] || ''), document.createTextNode(e.name));
  tint(b, e.color);
  b.onclick = ev => { ev.stopPropagation(); go(e.id); };
  return b;
}

// Hỏi thêm: gõ câu hỏi là Hệ Thống tìm ngay trong Hỏi đáp và Tàng Thư (trả lời liền), không ra thì mới gửi người thật
export function quickAnswers(game, q) {
  const n = String(q).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  const words = n.split(/[^a-z0-9]+/).filter(w => w.length >= 3);
  if (!words.length) return { faq: [], ent: [] };
  const F = game.data.faq, faq = [];
  for (const g of F?.groups || []) for (const it of g.list) {
    const hay = (it.q + ' ' + it.a.join(' ')).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
    const s = words.filter(w => hay.includes(w)).length;
    if (s >= Math.min(2, words.length)) faq.push([s, it]);
  }
  faq.sort((a, b) => b[0] - a[0]);
  const idx = traIndex(game), ent = traLink(idx, q).filter(p => p.e).map(p => p.e);
  return { faq: faq.slice(0, 3).map(x => x[1]), ent: ent.slice(0, 4) };
}
