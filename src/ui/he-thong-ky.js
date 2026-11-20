// Sổ Trấn Ma Kỷ trong Hệ Thống → Tàng Thư (data/tran-ma-ky.json; luật ở src/game/tran-ma-ky.js; docs/14-TRAN-MA-KY.md). Trong truyện, đây là cuốn sổ
// Hệ Thống ghi tên từng ký chủ, nên nó nằm ngay trong bảng Hệ Thống. Người chơi "dễ kiểm soát và nắm tiến độ" (docs/10-CAI-HON.md): bìa sổ có thanh
// tiến độ, từng quyển đếm trang đã đọc, trang chưa mở ghi rõ làm gì thì mở.
//   bìa (st.cur 'tmk')            bảy quyển + ba mục: Chín thiên quy, Khẩu quyết, Cấm Kỵ Các
//   một quyển ('tmk:q:<mã>')      các trang: Mới (đọc được), đã đọc (xem lại), chưa mở (gợi ý cách mở)
//   'tmk:quy' · 'tmk:kq' · 'tmk:cam'   thiên quy đã lĩnh ngộ, khẩu quyết đã thuộc, quyển cấm kỵ
//   cuối bìa: nút bật / tắt "trang mới tự kể khi rảnh tay" (tắt thì Hệ Thống chỉ nhắc một dòng)
// Bấm Đọc / Xem lại: bảng Hệ Thống thu nhỏ rồi cảnh diễn ngoài màn chơi (phatTrang). Chữ chỉ gán textContent. Kiểu: he-thong.css (khối .ky-).
import { tmkOn, tmkSo, tmkQuy, tmkKq, tmkCam, phatTrang, tuKe, datTuKe } from '../game/tran-ma-ky.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const btn = (cls, text, fn) => { const b = el('button', cls, text); b.type = 'button'; b.onclick = e => { e.stopPropagation(); fn(); }; return b; };
function bar(a, b) { const w = el('div', 'ky-bar'), i = el('i'); i.style.width = `${b ? Math.round(a / b * 100) : 0}%`; w.append(i); return w; }

export const kyCo = game => tmkOn(game) && !!game.data['tran-ma-ky'];
export const kyMoi = game => (kyCo(game) && game.save ? tmkSo(game).moi : 0);   // số trang đã mở chưa đọc (chấm đỏ ở mục Tàng Thư)

// Tấm bìa đặt đầu danh sách Tàng Thư: chạm là vào sổ
export function kyBia(game, go) {
  const C = game.data['tran-ma-ky'], X = C.text, so = tmkSo(game);
  const b = btn('ky-bia', null, () => go('tmk'));
  b.append(el('b', null, C.name), el('span', null, X.cover_sub), bar(so.doc, so.tong));
  const foot = el('small', null, fill(X.progress, { a: so.doc, b: so.tong }));
  if (so.moi) foot.append(el('em', 'ky-moi', `${X.new} ${so.moi}`));
  b.append(foot);
  return b;
}

export function renderKy(game, body, st, rerender, O = {}) {
  const C = game.data['tran-ma-ky'], X = C.text, so = tmkSo(game), cur = st.cur;
  const go = id => { st.back.push(st.cur); st.cur = id; rerender(); };
  const top = el('div', 'ht-tra-top'), bk = btn('ht-tra-bk', '‹', () => { st.cur = st.back.pop() || null; rerender(); });
  top.append(bk, el('span', 'ht-tra-kind', C.name));
  body.append(top);

  if (cur === 'tmk') {   // ---- bìa ----
    const head = el('div', 'ky-bia ky-tinh');
    head.append(el('b', null, C.name), el('span', null, X.cover_sub), bar(so.doc, so.tong), el('small', null, fill(X.progress, { a: so.doc, b: so.tong })));
    body.append(head, el('div', 'ht-sub', X.sec_quyen));
    for (const q of so.quyen) {
      const kin = !q.trang.some(p => p.mo);   // quyển chưa mở trang nào: chỉ hiện gợi ý
      const b = btn('ky-q' + (kin ? ' kin' : ''), null, () => { if (!kin) go('tmk:q:' + q.id); });
      const l = el('span', 'ky-q-l'); l.append(el('small', null, fill(X.quyen, { n: q.so })), el('b', null, kin ? '???' : q.ten), el('i', null, kin ? fill(X.how, { x: q.goi }) : q.noi));
      const r = el('span', 'ky-q-r', fill(X.have, { a: q.doc, b: q.trang.length }));
      if (q.moi) r.append(el('em', 'ky-moi', X.new));
      b.append(l, r); body.append(b);
    }
    const quy = tmkQuy(game), kq = tmkKq(game), cam = tmkCam(game);
    const muc = (id, name, a, b) => { const x = btn('ky-q', null, () => go(id)); const l = el('span', 'ky-q-l'); l.append(el('b', null, name)); x.append(l, el('span', 'ky-q-r', fill(X.have, { a, b }))); return x; };
    body.append(muc('tmk:quy', X.sec_quy, quy.filter(l => l.co).length, quy.length),
      muc('tmk:kq', X.sec_kq, kq.doan.filter(k => k.co).length + kq.truong.filter(k => k.co).length, kq.doan.length + kq.truong.length),
      muc('tmk:cam', X.sec_cam, cam.mo ? cam.list.length + (cam.coTrang ? 1 : 0) : 0, cam.list.length + 1));
    const on = tuKe(game);   // người chơi tự quyết: trang mới tự kể lúc rảnh tay, hay chỉ nhắc một dòng rồi nằm chờ trong sổ
    body.append(btn('ky-tu' + (on ? ' on' : ''), on ? X.auto_on : X.auto_off, () => { datTuKe(game, !on); game.sfx?.('click'); rerender(); }));
    return;
  }

  if (cur.startsWith('tmk:q:')) {   // ---- một quyển ----
    const q = so.quyen.find(x => x.id === cur.slice(6));
    if (!q) { st.cur = 'tmk'; rerender(); return; }
    const head = el('div', 'ky-dau');
    head.append(el('small', null, fill(X.quyen, { n: q.so })), el('b', null, q.ten), el('i', null, q.noi), el('p', 'ht-line', q.mo), bar(q.doc, q.trang.length));
    body.append(head);
    const xem = (p, again) => { O.minimize?.(); setTimeout(() => phatTrang(game, p.id, again), 420); };   // chờ bảng thu nhỏ xong rồi cảnh mới diễn
    q.trang.forEach((p, i) => {
      const row = el('div', 'ky-tr' + (p.doc ? ' doc' : p.mo ? ' moi' : ' kin'));
      const l = el('span', 'ky-tr-l'); l.append(el('small', null, String(i + 1)), el('b', null, p.mo ? p.ten : '???'));
      row.append(l);
      if (p.doc) row.append(btn('ky-nut', X.again, () => xem(p, true)));
      else if (p.mo) row.append(el('em', 'ky-moi', X.new), btn('ky-nut on', X.read, () => xem(p, false)));
      else row.append(el('i', null, fill(X.how, { x: p.goi })));
      body.append(row);
    });
    if (q.doc === q.trang.length) { const d = el('div', 'ky-dap'); d.append(el('span', null, X.ask), el('b', null, q.vi_ai)); body.append(d); }   // đọc hết quyển: câu hỏi xuyên suốt và câu trả lời của quyển
    return;
  }

  if (cur === 'tmk:quy') {   // ---- chín thiên quy ----
    body.append(el('div', 'ht-tra-name ky-ten', X.sec_quy));
    for (const l of tmkQuy(game)) {
      const d = el('div', 'ky-quy' + (l.co ? '' : ' kin'));
      if (l.co) d.append(el('b', null, l.ten), el('span', null, l.cau), el('p', null, l.y));
      else d.append(el('b', null, '???'), el('i', null, fill(X.quy_lock, { x: l.tu ? `${fill(X.quyen, { n: C.so[l.tu.qi] })}, ${l.tu.i + 1}` : '' })));
      body.append(d);
    }
    return;
  }

  if (cur === 'tmk:kq') {   // ---- khẩu quyết ----
    const kq = tmkKq(game);
    body.append(el('div', 'ht-tra-name ky-ten', X.sec_kq), el('div', 'ht-sub', X.kq_doan));
    for (const k of kq.doan) {
      const d = el('div', 'ky-quy' + (k.co ? '' : ' kin')), n = el('b', null, k.ten); if (k.color) n.style.color = k.color;
      d.append(n, k.co ? el('span', 'ky-loi', k.loi) : el('i', null, X.kq_pb)); body.append(d);
    }
    body.append(el('div', 'ht-sub', X.kq_truong));
    for (const k of kq.truong) {
      const d = el('div', 'ky-quy' + (k.co ? '' : ' kin'));
      if (k.co) { d.append(el('b', null, k.ten), el('i', null, fill(X.kq_dung, { x: k.dung }))); for (const s of k.loi) d.append(el('span', 'ky-loi', s)); }
      else d.append(el('b', null, '???'), el('i', null, X.kq_lock));
      body.append(d);
    }
    return;
  }

  // ---- Cấm Kỵ Các ----
  const cam = tmkCam(game);
  body.append(el('div', 'ht-tra-name ky-ten', X.sec_cam));
  if (!cam.mo) { body.append(el('p', 'ht-line ht-muted', X.cam_lock)); return; }
  body.append(el('p', 'ht-line', X.cam_intro));
  const quyen = (c, i) => {
    const d = el('div', 'ky-quy ky-cam'), h = el('b', null, `${i}. ${c.ten}`);
    h.append(el('em', null, fill(X.cam_gia, { x: c.gia })));
    d.append(h, el('span', 'ky-loi', c.loi));
    for (const [k, v] of [[X.cam_chieu, c.chieu], [X.cam_tra, c.tra], [X.cam_nguoi, c.nguoi]]) { const p = el('p'); p.append(el('small', null, k + ': '), document.createTextNode(v)); d.append(p); }
    return d;
  };
  cam.list.forEach((c, i) => body.append(quyen(c, i + 1)));
  body.append(cam.coTrang ? quyen(cam.trang, '1000') : el('p', 'ht-line ht-muted', X.cam_trang));
}
