// Túi đồ → Luyện đan (chủ dự án 20/11/2026 13:3x–13:4x): bên trái ô lò (viền màu theo phẩm lò, cấp, nút Nâng lò) và 9 ô nguyên liệu,
// bên phải / bên dưới kho nguyên liệu dạng lưới; chạm nguyên liệu thì chọn số lượng bỏ vào, chạm ô trong lò thì lấy ra.
// Dưới cùng: đan phương khớp (nhiều đan cùng khớp thì chọn), tỉ lệ thành, phần thừa sẽ mất, nút Luyện. Luật ở src/game/lo-dan.js.
// st.ld = { put: { mã: số }, want: mã đan đã chọn | null, last: chữ kết quả lần trước }
import { el } from './bag-detail.js';
import { uiIco } from './self-gear.js';
import { loOf, luyen, nangLo, upCost, syncLo, setHinh } from '../game/lo-dan.js';
import { coins } from '../game/shop.js';
import { brewFx, resultFx } from './lo-dan-fx.js';

const vn = n => Math.floor(n || 0).toLocaleString('vi-VN');
let cssOn = false;
function css() {
  if (cssOn) return; cssOn = true;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = new URL('./lo-dan.css', import.meta.url).href; document.head.append(l);
}
const matName = (D, k) => D.cave.materials[k]?.name || D.cave.pills[k]?.name || k;
function ico(D, k, cls) {   // hình nguyên liệu / đan (ảnh GPT ui.vk-<mã>), chưa có hình thì ô màu
  const i = uiIco(D, 'ui.vk-' + k, cls);
  if (!D.art.sprites['ui.vk-' + k]) i.style.background = D.cave.materials[k]?.color || D.cave.pills[k]?.color || '#888';
  return i;
}

// Hỏi số lượng bỏ vào (còn trong kho: have)
async function askQty(game, k, have) {
  const T = game.data.cave.lo.text, Q = game.data.shop.qty || {}, opts = [];
  for (const n of [1, 5, 10, 50]) if (n < have) opts.push({ id: String(n), label: `×${n}`, desc: '' });
  opts.push({ id: String(have), label: `${Q.max || 'Tối đa'} ×${vn(have)}`, desc: '', color: '#f2c94c' });
  opts.push({ id: 'nhap', label: Q.type || 'Nhập số', desc: '' }, { id: 'thoi', label: Q.no || 'Thôi', desc: '' });
  const title = T.put.replace('{name}', matName(game.data, k)).replace('{n}', vn(have));
  const pick = have <= 1 ? '1' : await game.dialog.choose(title, opts);
  if (!pick || pick === 'thoi') return 0;
  if (pick !== 'nhap') return Math.min(have, +pick || 0);
  const raw = await game.dialog.ask(title, '1', 5, 'Bỏ vào', Q.no || 'Thôi');
  const n = Math.floor(Number(String(raw || '').replace(/\D/g, '')));
  return Number.isFinite(n) && n > 0 ? Math.min(have, n) : 0;
}

export function renderLoDan(game, st, mid, bar, refresh) {
  css();
  const D = game.data, s = game.save, C = D.cave.lo, T = C.text, lo = loOf(s);
  const ld = (st.ld ||= { put: {}, want: null, last: '' });
  if (!st.ldSync) { st.ldSync = true; syncLo(game).then(() => refresh()); }   // mở bảng lần đầu: hỏi máy chủ lò thật
  for (const [k, n] of Object.entries(ld.put)) if (!((s.mats?.[k] || 0) >= n)) { if (s.mats?.[k] > 0) ld.put[k] = s.mats[k]; else delete ld.put[k]; }   // kho đổi (vừa luyện, vừa dùng): kẹp lại
  const wrap = el('div', 'ld'), top = el('div', 'ld-top'), colL = el('div', 'ld-l'), colR = el('div', 'ld-r');   // trái: lò, 9 ô, dự kiến; phải: kho
  // Ô lò: hình lò viền màu phẩm (chỉ viền hình, khung không màu), tên phẩm + cấp
  const R = D.items.rarities[lo.ph] || D.items.rarities[0], box = el('div', 'ld-lo');
  box.style.setProperty('--q', R.color);
  const lop = el('div', 'ld-lo-img'), spr = D.art.sprites[(C.hinh || [])[lo.hinh | 0] || C.spr];   // hình lò (4 mẫu ảnh GPT 20/11/2026 14:10)
  if (spr) lop.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`;
  box.append(lop, el('b', 'ld-lo-ten', `${(C.hinh_ten || [])[lo.hinh | 0] || 'Lò'} · ${R.name}`), el('small', null, T.lv.replace('{c}', lo.cap)));
  lop.onclick = () => {   // 4 loại lò (chủ dự án 14:10): chạm hình lò đổi sang loại kế tiếp, không đổi phẩm, cấp
    if (ld.busy) return;
    const n = (C.hinh || []).length, k = ((lo.hinh | 0) + 1) % Math.max(1, n);
    if (D.art.sprites[C.hinh?.[k]]) { setHinh(game, k); game.toast(T.chon_hinh.replace('{name}', C.hinh_ten?.[k] || ''), 1.2); refresh(); }
  };
  // Nâng lò (chủ dự án 14:10): nút chỉ ghi "Nâng lò", đặt cạnh nút Luyện; chạm mới hiện giá rồi hỏi lại
  const g = upCost(game), up = el('button', 'sv-bbtn ld-up', g ? T.up : T.maxed);
  up.disabled = !g;
  up.onclick = async () => {
    if (ld.busy || !g) return;
    const ok = await game.dialog.choose(T.upto.replace('{c}', loOf(s).cap + 1).replace('{lt}', vn(g.lt)).replace('{tt}', g.tt), [
      { id: 'ok', label: T.up, desc: `${vn(g.lt)} Linh Thạch · ${g.tt} Tinh Thiết (đang có ${vn(coins(s))} · ${vn(s.mats?.['tinh-thiet'])})`, color: '#f2c94c' },
      { id: 'thoi', label: 'Thôi', desc: '' }]);
    if (ok !== 'ok') return;
    up.disabled = true;
    const r = await nangLo(game);
    if (r.cap) { game.sfx?.('levelup'); game.toast(T.upok.replace('{c}', r.cap), 2); }
    else game.toast(r.err === 'poor' ? T.poor : r.err === 'max' ? T.maxed : T.net, 2);
    refresh();
  };
  // 9 ô nguyên liệu trong lò: chạm để lấy ra
  const slots = el('div', 'ld-o'), keys = Object.keys(ld.put);
  for (let i = 0; i < C.slots; i++) {
    const k = keys[i];
    if (!k) { slots.append(el('i', 'ld-trong')); continue; }
    const b = el('button', 'ld-co'); b.title = matName(D, k);
    b.append(ico(D, k, 'ld-ico'), el('small', null, '×' + vn(ld.put[k])));
    b.onclick = () => { if (ld.busy) return; delete ld.put[k]; ld.last = ''; refresh(); };
    slots.append(b);
  }
  top.append(box, slots);
  colL.append(top);
  // Không báo trước đan gì, tỉ lệ bao nhiêu (chủ dự án 14:10): chỉ hiện kết quả lần luyện trước; đan phương xem ở Tàng Thư (nút ! góc kho)
  const info = el('div', 'ld-info');
  info.append(el('p', ld.last ? 'ld-kq' : 'muted', ld.last || (keys.length ? T.ready : T.none)));
  colR.append(info);   // dự kiến nằm đầu cột phải cho khỏi phải cuộn
  // Kho nguyên liệu: món đang có, trừ phần đã bỏ vào lò
  const head = el('div', 'ld-h'), bang = el('button', 'ld-hoi', '!');   // chấm than: đan phương tham khảo ở Tàng Thư Hệ Thống
  bang.title = T.book;
  bang.onclick = async () => {
    const pick = await game.dialog.choose(T.book_tip, [{ id: 'mo', label: T.book_open, desc: '' }, { id: 'thoi', label: 'Đóng', desc: '' }]);
    if (pick === 'mo') game.openTangThu?.('pill:' + Object.keys(D.cave.pills)[0]);
  };
  head.append(el('span', null, T.kho), bang);
  colR.append(head);
  const grid = el('div', 'ld-kho'), M = D.cave.materials;
  const ids = Object.keys(M).filter(k => (s.mats?.[k] || 0) > 0).sort((a, b) => M[a].name.localeCompare(M[b].name, 'vi'));
  for (const k of ids) {
    const left = (s.mats[k] || 0) - (ld.put[k] || 0), b = el('button', 'ld-mat' + (left > 0 ? '' : ' het'));
    b.title = M[k].name;
    b.append(ico(D, k, 'ld-ico'), el('small', null, vn(left)));
    b.onclick = async () => {
      if (left <= 0 || ld.busy) return;
      if (!ld.put[k] && Object.keys(ld.put).length >= C.slots) { game.toast(T.full, 1.8); return; }
      const n = await askQty(game, k, left);
      if (n > 0) { ld.put[k] = (ld.put[k] || 0) + n; ld.last = ''; refresh(); }
    };
    grid.append(b);
  }
  if (!ids.length) grid.append(el('p', 'muted', 'Chưa có nguyên liệu.'));
  colR.append(grid);
  wrap.append(colL, colR);
  mid.replaceChildren(wrap);
  // Thanh dưới: Bỏ ra hết, Luyện
  const clear = el('button', 'sv-bbtn', T.clear);
  clear.disabled = !keys.length;
  clear.onclick = () => { ld.put = {}; ld.want = null; ld.last = ''; refresh(); };
  const go = el('button', 'sv-bbtn gold ld-go', T.go);
  go.disabled = !keys.length;
  go.onclick = async () => {
    go.disabled = true; clear.disabled = true; up.disabled = true; go.textContent = T.busy; ld.busy = true;
    const put = { ...ld.put }, want = null;   // máy chủ tự dò đan phương khớp
    const r = await brewFx(game, box, [...slots.querySelectorAll('.ld-co')], () => luyen(game, put, want));   // nguyên liệu bay vào lò, lửa bùng (src/ui/lo-dan-fx.js)
    ld.busy = false;
    if (r.err) { game.toast(r.err === 'thieu_nl' ? 'Kho không còn đủ nguyên liệu.' : T.net, 2); refresh(); return; }
    ld.put = {}; ld.want = null;
    ld.last = r.thanh ? T.ok.replace('{n}', r.vien).replace('{name}', D.cave.pills[r.dan]?.name || '') : T.fail;
    game.toast(ld.last, 2.4);
    refresh();
    const nb = mid.querySelector('.ld-lo');
    if (nb) resultFx(game, nb, !!r.thanh, r.dan, r.vien);
  };
  bar.replaceChildren(clear, up, go);
}
