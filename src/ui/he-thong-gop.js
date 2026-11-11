// Mục Góp ý trong Hệ Thống (chủ dự án 11/11/2026 23:12: "tính năng báo lỗi và đề xuất, tích hợp nó với hệ thống"; trước là bảng riêng
// mở từ hộp Thư). Hai nút đổi Báo lỗi / Đề xuất; tên (bắt buộc), ảnh chứng minh (bắt buộc: tự chụp khung game lúc mở mục, đổi được ảnh
// trong máy), mô tả (không bắt buộc); máy tự gắn bối cảnh (src/ui/feedback-shot.js). Dưới là các báo cáo đã gửi, trạng thái, lời đáp
// của đội làm game. Gửi qua src/net/feedback.js (nạp lười: mất mạng game vẫn chạy). Chữ ở data/community.json → feedback.
// Chữ người chơi gõ chỉ gán textContent / value.
import { shotScreen, fromFile, context } from './feedback-shot.js';

const net = () => import('../net/feedback.js');
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

// Trạng thái giữ qua các lần vẽ (đổi mục, đổi tab không mất chữ đang gõ)
export const gopState = () => ({ qtv: null, kind: 'loi', img: null, shooting: false, preview: null, name: '', desc: '', msg: '', rows: null, login: null, busy: false });

// Chụp lại màn (lúc mở mục Góp ý, sau mỗi lần gửi): cả màn đang thấy trừ Hệ Thống (feedback-shot.js shotScreen), xong thì thay ảnh xem trước
export function gopShot(game, st) {
  const F = game.data.community?.feedback;
  if (!F || st.shooting) return;
  st.shooting = true; st.img = null; paint(st);
  shotScreen(F.img).then(img => { st.img = img; }).finally(() => { st.shooting = false; paint(st); });
}
function paint(st) {   // ảnh xem trước đang hiện (không vẽ lại cả mục: ô đang gõ giữ con trỏ)
  const p = st.preview;
  if (!p?.isConnected) return;
  p.hidden = !st.img; if (st.img) p.src = st.img.anh;
  p.previousElementSibling?.classList.toggle('ht-gop-wait', st.shooting);
}

// Điểm quản trị viên ngay đầu mục (chủ dự án 11/11/2026 23:27: "tích hợp điểm qtv vào hệ thống, mục góp ý, khi điểm đủ nhiều sẽ mở khoá
// tính năng"; quyền từng cấp chủ dự án chốt sau). Cấp theo tổng điểm đã được (data/community.json → feedback.qtv.cap), sổ điểm máy chủ
// (src/net/rank.js qtvLedger). Chạm thẻ: Bảng quản trị viên (đổi điểm lấy Tiên Ngọc ở đó).
function qtvCard(game, body, st, api) {
  const Q = game.data.community.feedback.qtv;
  if (!Q) return;
  const card = el('button', 'ht-qtv'); card.type = 'button';
  card.onclick = () => { api.minimize(); game.openFame?.(); };
  body.append(card);
  const paintQ = () => {
    card.textContent = '';
    if (!st.qtv) { card.append(el('span', 'ht-muted', '…')); return; }
    const tong = st.qtv.tong || 0, cap = Q.cap.filter(n => tong >= n).length, next = Q.cap[cap];
    const lo = cap ? Q.cap[cap - 1] : 0, pct = next ? Math.round(((tong - lo) / (next - lo)) * 100) : 100;
    const bar = el('i', 'ht-qtv-bar'), fillBar = el('b'); fillBar.style.width = pct + '%'; bar.append(fillBar);
    card.append(el('b', null, fill(Q.title, { cap })), el('span', null, fill(Q.pts, { tong: tong.toLocaleString('vi-VN'), du: (st.qtv.du || 0).toLocaleString('vi-VN') })), bar,
      el('small', null, next ? fill(Q.next, { n: (next - tong).toLocaleString('vi-VN'), cap: cap + 1 }) : Q.max));
  };
  if (st.qtv == null) {
    st.qtv = 0;
    import('../net/rank.js').then(m => m.qtvLedger()).then(d => { st.qtv = d || { tong: 0, du: 0 }; }).catch(() => { st.qtv = { tong: 0, du: 0 }; }).then(() => { if (card.isConnected) paintQ(); });
  }
  paintQ();
}
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

// api: { render(), minimize() }
export function renderGop(game, body, st, api) {
  const F = game.data.community?.feedback;
  if (!F?.on) { body.append(el('p', 'ht-line ht-muted', '…')); return; }
  const T = F.text, K = F.kinds[st.kind];
  const sw = el('div', 'ht-gop-sw');
  for (const [id, k] of Object.entries(F.kinds)) {
    const b = el('button', `ht-tab${id === st.kind ? ' on' : ''}`); b.type = 'button';
    b.append(el('span', null, k.btn + ' '), el('span', null, k.label));
    b.onclick = () => { if (st.kind === id) return; st.kind = id; st.msg = ''; api.render(); };
    sw.append(b);
  }
  body.append(sw, el('p', 'ht-line ht-muted', K.info));
  if (st.login == null) {   // hỏi một lần: chơi thử thì chưa gửi được
    st.login = 'cho';
    net().then(m => m.loggedIn()).catch(() => false).then(v => { st.login = !!v; api.render(); });
  }
  if (st.login === 'cho') { body.append(el('p', 'ht-line ht-muted', '…')); return; }
  if (!st.login) { body.append(el('p', 'ht-line', T.login)); return; }
  if (!st.img && !st.shooting) gopShot(game, st);
  qtvCard(game, body, st, api);

  const name = el('input', 'ht-find'), desc = el('textarea', 'ht-ask'), file = el('input'), preview = el('img', 'ht-gop-img');
  name.maxLength = 80; name.placeholder = K.name_ph; name.value = st.name;
  desc.maxLength = 500; desc.rows = 3; desc.placeholder = K.desc_ph; desc.value = st.desc;
  file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
  preview.alt = ''; st.preview = preview;
  for (const e of [name, desc]) e.addEventListener('keydown', ev => ev.stopPropagation());   // gõ chữ không điều khiển nhân vật
  name.oninput = () => { st.name = name.value; };
  desc.oninput = () => { st.desc = desc.value; };
  const pick = el('button', 'ht-btn sm', T.pick); pick.type = 'button'; pick.onclick = () => file.click();
  const msg = el('p', 'ht-line ht-gop-msg', st.msg), send = el('button', 'ht-btn big', st.busy ? T.sending : T.send);
  send.type = 'button'; send.disabled = st.busy;
  file.onchange = async () => {
    const got = await fromFile(file.files?.[0], F.img);
    file.value = '';
    if (got) { st.img = got; preview.src = got.anh; preview.hidden = false; msg.textContent = st.msg = ''; } else msg.textContent = T.bad_img;
  };
  send.onclick = async () => {
    if (st.busy) return;
    const t = st.name.trim();
    if (t.length < 4) { msg.textContent = T.need_name; return; }
    if (!st.img) { msg.textContent = st.shooting ? T.shooting : T.need_img; return; }
    st.busy = true; send.disabled = true; send.textContent = T.sending; msg.textContent = '';
    const r = await net().then(m => m.sendFeedback({ loai: st.kind, tieu_de: t, mo_ta: st.desc.trim(), anh: st.img.anh, anh_nho: st.img.anh_nho, ngu_canh: context(game) })).catch(() => ({ error: 'net' }));
    st.busy = false;
    if (r.error) { st.msg = T.errors[r.error] || T.errors.net; game.htFace?.react('ask_err'); api.render(); return; }
    st.name = ''; st.desc = ''; st.msg = T.sent; st.rows = null; gopShot(game, st);   // lần gửi sau: ảnh mới chụp lại khung game
    game.sfx?.('levelup'); game.htFace?.react('ask_ok');
    api.render();
  };
  const shotLb = el('div', 'ht-sub', T.shot); shotLb.dataset.wait = T.shooting || '…';
  body.append(el('div', 'ht-sub', K.name), name, shotLb, preview, pick, file, desc, msg, send);
  paint(st);

  const fame = game.data.referral?.fame;   // thưởng góp ý: mỗi vấn đề được nhận ngọc, Bảng quản trị viên (Xếp hạng)
  if (fame && game.openFame) {
    const b = el('button', 'ht-btn sm', fame.open); b.type = 'button'; b.onclick = () => { api.minimize(); game.openFame(); };
    body.append(el('p', 'ht-line ht-muted', fame.rule.replace('{gem}', fame.gem)), b);
  }
  const list = el('div', 'ht-gop-list');
  body.append(el('div', 'ht-sub', T.mine), list);
  const fillList = () => {   // chỉ vẽ lại danh sách (vẽ cả mục thì ô đang gõ mất con trỏ, bàn phím điện thoại sập)
    list.textContent = '';
    if (!Array.isArray(st.rows)) { list.append(el('p', 'ht-line ht-muted', '…')); return; }
    if (!st.rows.length) { list.append(el('p', 'ht-line ht-muted', T.none)); return; }
    for (const r of st.rows) {
      const row = el('div', `ht-mine ht-gop-row st-${r.trang_thai}`), top = el('div', 'ht-gop-top');
      top.append(el('span', null, F.kinds[r.loai]?.btn || ''), el('b', null, r.tieu_de), el('i', null, T.status[r.trang_thai] || r.trang_thai));
      row.append(top);
      if (r.tra_loi) row.append(el('p', null, r.tra_loi));
      list.append(row);
    }
  };
  if (st.rows == null) {
    st.rows = 'cho';
    net().then(m => m.myFeedback()).catch(() => []).then(r => { st.rows = r || []; if (list.isConnected) fillList(); });
  }
  fillList();
}
