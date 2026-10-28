// Báo lỗi và Đề xuất (chủ dự án xin 29/10/2026): hai nút cạnh nút Zalo. Người chơi điền tên (bắt buộc), ảnh chứng minh (bắt buộc,
// tự chụp màn game lúc bấm nút, đổi được ảnh trong máy), mô tả thêm (không bắt buộc); máy tự gắn bối cảnh (src/ui/feedback-shot.js).
// Gửi qua src/net/feedback.js; dưới bảng là các báo cáo đã gửi kèm trạng thái và lời đáp của đội làm game.
// Chữ và cỡ ảnh ở data/community.json → feedback. Bảng dựng bằng code (không thêm vào index.html), chữ người chơi gõ chỉ gán textContent.
import { shotGame, fromFile, context } from './feedback-shot.js';
// Phần mạng nạp lười (như màn đăng nhập): mất mạng, không tải được thư viện máy chủ thì game vẫn chạy, chỉ bảng này báo chưa gửi được
const net = () => import('../net/feedback.js');
const loggedIn = () => net().then(m => m.loggedIn()).catch(() => false);
const myFeedback = () => net().then(m => m.myFeedback()).catch(() => []);
const sendFeedback = f => net().then(m => m.sendFeedback(f)).catch(() => ({ error: 'net' }));

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createFeedback(game) {
  const F = game.data.community?.feedback;
  if (!F?.on) return;
  const T = F.text;
  const root = el('div', 'panel fb-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), title = el('b'), x = el('button', 'mini', T.close), body = el('div', 'fb-body');
  head.append(title, x);
  root.append(head, body);
  document.body.append(root);

  let kind = 'loi', img = null, busy = false;
  const name = el('input', 'fb-name'), desc = el('textarea', 'fb-desc'), file = el('input');
  name.maxLength = 80; desc.maxLength = 500; desc.rows = 3;
  file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
  const preview = el('img', 'fb-img'), msg = el('p', 'fb-msg'), send = el('button', 'fb-send', T.send), list = el('div', 'fb-list');
  preview.alt = '';
  for (const e of [name, desc]) {
    e.addEventListener('keydown', ev => ev.stopPropagation());   // gõ chữ không điều khiển nhân vật
    e.addEventListener('focus', () => setTimeout(() => e.scrollIntoView({ block: 'center' }), 300));   // bàn phím điện thoại khỏi che ô đang gõ
  }

  function paintImg() { preview.hidden = !img; if (img) preview.src = img.anh; }

  async function paintList() {
    list.textContent = '';
    list.append(el('b', null, T.mine));
    const rows = await myFeedback();
    if (!rows.length) { list.append(el('p', 'muted', T.none)); return; }
    for (const r of rows) {
      const row = el('div', `fb-row st-${r.trang_thai}`);
      const top = el('div', 'fb-row-top');
      top.append(el('span', 'fb-kind', F.kinds[r.loai]?.btn || ''), el('span', 'fb-title', r.tieu_de), el('span', 'fb-st', T.status[r.trang_thai] || r.trang_thai));
      row.append(top);
      if (r.tra_loi) row.append(el('small', 'fb-reply', r.tra_loi));
      list.append(row);
    }
  }

  async function render() {
    const K = F.kinds[kind];
    title.textContent = K.title;
    body.textContent = '';
    body.append(el('p', 'fb-info', K.info));
    if (!(await loggedIn())) { body.append(el('p', 'fb-msg', T.login)); return; }
    name.placeholder = K.name_ph; desc.placeholder = K.desc_ph;
    const pick = el('button', 'mini fb-pick', T.pick);
    pick.onclick = () => file.click();
    body.append(el('label', 'fb-label', K.name), name, el('label', 'fb-label', T.shot), preview, pick, file, desc, msg, send, list);
    paintImg();
    paintList();
  }

  file.onchange = async () => {
    const got = await fromFile(file.files?.[0], F.img);
    file.value = '';
    if (got) { img = got; paintImg(); msg.textContent = ''; } else msg.textContent = T.bad_img;
  };

  send.onclick = async () => {
    if (busy) return;
    const t = name.value.trim();
    if (t.length < 4) { msg.textContent = T.need_name; return; }
    if (!img) { msg.textContent = T.need_img; return; }
    busy = true; send.disabled = true; send.textContent = T.sending; msg.textContent = '';
    const r = await sendFeedback({ loai: kind, tieu_de: t, mo_ta: desc.value.trim(), anh: img.anh, anh_nho: img.anh_nho, ngu_canh: context(game) });
    busy = false; send.disabled = false; send.textContent = T.send;
    if (r.error) { msg.textContent = T.errors[r.error] || T.errors.net; return; }
    name.value = ''; desc.value = ''; img = shotGame(F.img); paintImg();   // lần gửi sau: ảnh mới chụp lại màn game
    msg.textContent = T.sent;
    game.sfx?.('levelup');
    paintList();
  };

  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;
  root.addEventListener('pointerdown', e => e.stopPropagation());

  // Hai nút đứng sau nút Zalo (không có Zalo thì sau nút quay clip / nút tiếng)
  let after = document.getElementById('btn-zalo') || document.getElementById('btn-rec') || document.getElementById('btn-mute');
  for (const [id, K] of Object.entries(F.kinds)) {
    const btn = el('button', 'fb-btn', K.btn);
    btn.id = `btn-fb-${id}`; btn.title = K.label; btn.setAttribute('aria-label', K.label);
    after?.after(btn); after = btn;
    btn.addEventListener('pointerdown', e => e.stopPropagation());
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!root.hidden && kind === id) { close(); return; }
      if (root.hidden || kind !== id) img = shotGame(F.img);   // chụp màn game trước khi bảng che
      kind = id; root.hidden = false; game.uiOpen = true;
      render();
    });
  }
}
