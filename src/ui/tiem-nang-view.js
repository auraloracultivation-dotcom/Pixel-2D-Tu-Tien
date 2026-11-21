// Mục Tiềm năng trong bảng Nhân vật, ngay dưới Trang bị (chủ dự án 21/11/2026 17:23; src/ui/self-panel.js gọi renderTiem).
// Trên: ấn tộc, tên, độ hiếm, một dòng lai lịch, các chỉ số trời cho lúc thức tỉnh, thiên phú (tộc hiếm). Dưới: điểm tiềm năng, mỗi chỉ số một
// dòng có nút cộng; thanh dưới cùng là nút tẩy điểm (chạm hai lần). Tính toán ở src/game/tiem-nang.js, số và chữ ở data/tiem-nang.json. Kiểu: tiem-nang.css.
import { goc } from '../core/build.js';
import { TN, tocCua, gocCua, congCua, diemCo, diemCon, tranCua, motDiem, gocPct, congDiem, giaTay, tayDiem } from '../game/tiem-nang.js';
import { addCoins, coins } from '../game/shop.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const so = x => String(Math.round(x * 100) / 100).replace('.', ',');
let cssOn = false;
function css() { if (cssOn) return; cssOn = true; const l = el('link'); l.rel = 'stylesheet'; l.href = goc('src/ui/tiem-nang.css'); document.head.append(l); }

export function renderTiem(game, st, mid, bar, changed) {
  css();
  const D = game.data, T = TN(D), X = T.text, s = game.save, t = tocCua(s, D), H = D['he-chien'], wrap = el('div', 'tn');
  mid.classList.remove('sheet');
  if (!t) { wrap.append(el('div', 'tn-chua', X.chua)); mid.replaceChildren(wrap); bar.replaceChildren(); bar.hidden = true; return; }
  wrap.style.setProperty('--mau', t.mau);
  const hiem = T.hiem[t.hiem], dau = el('div', 'tn-dau'), chu = el('div', 'tn-chu'), the = el('small', 'tn-hiem', hiem.ten), ten = k => X.ngan?.[k] || H.ten?.[k] || k;
  the.style.setProperty('--h', hiem.mau); chu.append(el('div', 'tn-ten', t.ten), the); dau.append(el('b', 'tn-an', t.han), chu);
  const goc0 = el('div', 'tn-goc');
  for (const [k, v] of Object.entries(gocCua(s, D)).sort((a, b) => b[1] - a[1])) { const c = el('div', 'tn-chip'); c.append(el('span', '', ten(k)), el('b', '', `+${so(gocPct(D, k, v))}%`)); goc0.append(c); }
  wrap.append(dau, el('div', 'tn-loi', t.loi), el('div', 'tn-nhan', X.goc), goc0);
  if (t.thien_phu) { const p = el('div', 'tn-tp'); p.append(el('b', '', `${X.thien_phu}: ${t.thien_phu.ten}`), el('span', '', t.thien_phu.mo_ta)); wrap.append(p); }
  // Điểm tiềm năng
  const co = diemCo(s, D), con = diemCon(s, D), cong = congCua(s, D), n = T.diem.moi;
  wrap.append(el('div', 'tn-nhan', X.diem), el('div', 'tn-con' + (con > 0 ? ' co' : ''), fill(X.con, { a: con, b: co })));
  const ds = el('div', 'tn-ds');
  for (const k of T.diem.chi_so) {
    const c = cong[k] || 0, tran = tranCua(D, k), row = el('div', 'tn-row'), day = c >= tran, nut = el('button', 'tn-cong', day ? X.day : '+');
    const tk = el('span', 'tn-k', ten(k)), m = motDiem(D, k), v = el('small', c ? 'co' : '', `+${so(c * m)}%`);   // dòng nhỏ: đang có → cộng thêm một điểm thì thành bao nhiêu
    if (!day) v.append(el('i', '', ` → +${so((c + 1) * m)}%`));
    tk.append(v); row.append(tk, nut);
    nut.disabled = day || con < 1; nut.setAttribute('aria-label', `${X.cong} ${ten(k)}`);
    nut.onclick = () => { if (congDiem(game, k)) { st.tnHoi = false; game.sfx?.('click'); changed(); } };
    ds.append(row);
  }
  wrap.append(ds, el('div', 'tn-ghi', co ? fill(X.nguon, { n }) : fill(X.chua_diem, { n })), el('div', 'tn-ghi', X.khoa));
  const keep = mid.scrollTop; mid.replaceChildren(wrap); mid.scrollTop = keep;
  // Thanh dưới: tẩy điểm, chạm hai lần mới làm
  const gia = giaTay(game), daCong = Object.keys(cong).length > 0, tay = el('button', 'tn-tay', st.tnHoi ? X.tay_hoi : gia ? fill(X.tay_gia, { gia: gia.toLocaleString('vi-VN') }) : X.tay_free);
  tay.disabled = !daCong; tay.classList.toggle('hoi', !!st.tnHoi);
  tay.onclick = () => {
    if (!st.tnHoi) { st.tnHoi = true; changed(false); return; }
    st.tnHoi = false;
    if (coins(s) < gia) { game.toast?.(X.thieu_ls, 2); changed(false); return; }
    if (gia) addCoins(game, -gia, 'tay-diem');
    if (tayDiem(game)) game.toast?.(X.tay_ok, 2);
    changed();
  };
  bar.hidden = false; bar.replaceChildren(tay);
}
