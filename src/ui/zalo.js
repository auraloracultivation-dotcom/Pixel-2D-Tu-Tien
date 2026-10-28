// Nhóm Zalo (data/community.json → zalo, chủ dự án xin 28/10/2026): nút cạnh nút quay clip, bấm mở bảng có link nhóm.
// Quà tham gia: 1 viên ngọc cấp gem_level, người chơi chọn loại, mỗi bản lưu nhận một lần (save.quaZalo). Zalo không cho hỏi
// ai đã vào nhóm, nên bấm mở link là nhận; ngọc nằm trong bản lưu như ngọc rơi khi đánh quái (máy chủ không giữ riêng).
// Bảng dựng bằng code (không thêm vào index.html).
import { gemInfo } from '../game/items.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));

export function createZalo(game) {
  const Z = game.data.community?.zalo, mute = document.getElementById('btn-mute');
  if (!Z?.on || !mute) return;
  const T = Z.text, types = game.data.items.gems.types;
  const btn = el('button', null, T.btn);
  btn.id = 'btn-zalo'; btn.setAttribute('aria-label', T.label); btn.title = T.label;
  (document.getElementById('btn-rec') || mute).after(btn);   // nút quay clip nạp sau cũng chen ngay sau nút tiếng, nên Zalo luôn đứng sau nó

  const root = el('div', 'panel zalo-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', T.close), body = el('div', 'zalo-body');
  head.append(el('b', null, T.title), x);
  root.append(head, body);
  document.body.append(root);

  let pick = Object.keys(types)[0];
  const claimed = () => !!game.save?.quaZalo;
  const paint = () => btn.classList.toggle('gift', !!game.save && !claimed());

  function grant() {
    const s = game.save;
    if (!s || s.quaZalo || !types[pick]) return;
    const key = `${pick}:${Z.gem_level}`;
    s.gems ??= {};
    s.gems[key] = (s.gems[key] || 0) + 1;
    s.quaZalo = true;
    game.refreshStats?.(); game.persist?.();
    game.toast?.(fill(T.got, { gem: gemInfo(game.data, key).name }), 3);
    paint(); render();
  }

  function render() {
    body.innerHTML = '';
    body.append(el('p', 'zalo-info', T.info));
    if (claimed()) body.append(el('p', 'muted', T.done));
    else if (game.save) {
      const box = el('div', 'zalo-gift'), gems = el('div', 'zalo-gems');
      box.append(el('b', null, fill(T.gift, { lv: Z.gem_level })), el('small', null, T.gift_how));
      gems.append(el('span', 'muted', T.pick));
      for (const [id, t] of Object.entries(types)) {
        const b = el('button', `mini zalo-gem${id === pick ? ' on' : ''}`, t.name);
        b.style.setProperty('--gem', t.color);
        b.onclick = () => { pick = id; render(); };
        gems.append(b);
      }
      box.append(gems);
      body.append(box);
    }
    const go = el('a', 'zalo-go', claimed() || !game.save ? T.go_done : T.go);
    go.href = Z.url; go.target = '_blank'; go.rel = 'noopener';
    go.addEventListener('click', grant);   // không chặn mở link: nhận ngọc rồi trình duyệt mở nhóm (app Zalo nếu có)
    body.append(go);
  }

  function close() { root.hidden = true; game.uiOpen = false; }
  x.onclick = close;
  btn.addEventListener('click', e => {
    e.stopPropagation();
    if (!root.hidden) { close(); return; }
    root.hidden = false; game.uiOpen = true; render();
  });
  paint();
  setInterval(paint, 1000);   // bản lưu đổi khi đăng nhập / chơi thử: chấm quà tự cập nhật
}
