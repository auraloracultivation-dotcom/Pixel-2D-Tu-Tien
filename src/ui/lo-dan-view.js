// Túi đồ → Luyện đan (chủ dự án 20/11/2026 13:3x–13:4x): bên trái ô lò (viền màu theo phẩm lò, cấp, nút Nâng lò) và 9 ô nguyên liệu,
// bên phải / bên dưới kho nguyên liệu dạng lưới; chạm nguyên liệu thì chọn số lượng bỏ vào, chạm ô trong lò thì lấy ra.
// Không báo trước đan gì, tỉ lệ bao nhiêu; một mẻ ra được nhiều loại đan; thành thì bảng nhận thưởng. Luật ở src/game/lo-dan.js.
// st.ld = { put: { mã: số }, last: chữ kết quả lần trước }
import { goc } from '../core/build.js';
import { el } from './bag-detail.js';
import { uiIco } from './self-gear.js';
import { loOf, loDung, loSpr, loTen, luyen, syncLo } from '../game/lo-dan.js';
import { renderLoList, askNang } from './lo-dan-lo.js';
import { brewFx, resultFx } from './lo-dan-fx.js';

const vn = n => Math.floor(n || 0).toLocaleString('vi-VN');
let cssOn = false;
function css() {
  if (cssOn) return; cssOn = true;
  const l = document.createElement('link'); l.rel = 'stylesheet'; l.href = goc('src/ui/lo-dan.css'); document.head.append(l);
}
const matName = (D, k) => D.cave.materials[k]?.name || D.cave.pills[k]?.name || k;
function ico(D, k, cls) {   // hình nguyên liệu / đan (ảnh GPT ui.vk-<mã>), chưa có hình thì ô màu
  const i = uiIco(D, 'ui.vk-' + k, cls);
  if (!D.art.sprites['ui.vk-' + k]) i.style.background = D.cave.materials[k]?.color || D.cave.pills[k]?.color || '#888';
  return i;
}

// Hỏi số lượng bỏ vào (còn trong kho: have): bảng nhỏ nổi giữa màn (chủ dự án 14:3x "bảng nhập số to quá"), −/+, ô số, 1 · 5 · 10 · Tối đa
function askQty(game, k, have) {
  const D = game.data, T = D.cave.lo.text;
  if (have <= 1) return Promise.resolve(have);
  return new Promise(done => {
    const nen = el('div', 'ld-sl-nen'), box = el('div', 'ld-sl'), head = el('div', 'ld-sl-h'), row = el('div', 'ld-sl-r'), chips = el('div', 'ld-sl-c'), bar = el('div', 'ld-sl-b');
    head.append(ico(D, k, 'ld-cico'), el('b', null, matName(D, k)), el('small', null, T.sl_co.replace('{n}', vn(have))));
    const inp = el('input', 'ld-sl-i'); inp.type = 'number'; inp.inputMode = 'numeric'; inp.min = '1'; inp.max = String(have); inp.value = '1';
    const val = () => Math.max(1, Math.min(have, Math.floor(Number(inp.value) || 0)));
    const set = n => { inp.value = String(Math.max(1, Math.min(have, n))); };
    const minus = el('button', 'ld-sl-pm', '−'), plus = el('button', 'ld-sl-pm', '+');
    minus.onclick = () => set(val() - 1); plus.onclick = () => set(val() + 1);
    row.append(minus, inp, plus);
    for (const n of [1, 5, 10]) if (n < have) { const c = el('button', 'ld-sl-ch', '×' + n); c.onclick = () => set(n); chips.append(c); }
    const mx = el('button', 'ld-sl-ch', T.sl_max); mx.onclick = () => set(have); chips.append(mx);
    const end = n => { nen.remove(); done(n); };
    const no = el('button', 'sv-bbtn', T.sl_no), ok = el('button', 'sv-bbtn gold', T.sl_ok);
    no.onclick = () => end(0); ok.onclick = () => end(val());
    inp.onkeydown = e => { if (e.key === 'Enter') end(val()); };
    nen.onclick = e => { if (e.target === nen) end(0); };
    bar.append(no, ok); box.append(head, row, chips, bar); nen.append(box); document.body.append(nen);
  });
}

export function renderLoDan(game, st, mid, bar, refresh) {
  css();
  const D = game.data, s = game.save, C = D.cave.lo, T = C.text;
  const ld = (st.ld ||= { put: {}, last: '' });
  if (!st.ldSync) { st.ldSync = true; syncLo(game).then(() => refresh()); }   // mở bảng lần đầu: hỏi máy chủ lò thật
  if (st.sub === 'lo') { renderLoList(game, st, mid, bar, refresh); return; }   // mục Lò đan: lưới lò đang có (src/ui/lo-dan-lo.js)
  const lo = loDung(s);
  for (const [k, n] of Object.entries(ld.put)) if (!((s.mats?.[k] || 0) >= n)) { if (s.mats?.[k] > 0) ld.put[k] = s.mats[k]; else delete ld.put[k]; }   // kho đổi (vừa luyện, vừa dùng): kẹp lại
  const wrap = el('div', 'ld'), top = el('div', 'ld-top'), colL = el('div', 'ld-l'), colR = el('div', 'ld-r');   // trái: lò, 9 ô; phải: kho
  // Ô lò: lò đang đặt, viền màu phẩm (chỉ viền hình, khung không màu); chưa có lò thì ô trống, chạm sang mục Lò đan
  const R = D.items.rarities[lo?.ph | 0] || D.items.rarities[0], box = el('div', 'ld-lo' + (lo ? '' : ' trong'));
  box.style.setProperty('--q', R.color);
  const lop = el('div', 'ld-lo-img'), sid = loSpr(game, lo), spr = lo && D.art.sprites[sid];
  if (spr) lop.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`;
  box.dataset.spr = sid;   // lo-dan-fx.js tìm chuyển động <sid>.chay, <sid>.thanh (SpriteCook)
  if (lo) box.append(lop, el('b', 'ld-lo-ten', `${T.ten_lo.replace('{name}', loTen(game, lo))} · ${R.name}`));
  else { box.append(lop, el('small', 'ld-lo-chua', loOf(s).ds.length ? T.chua_dat : T.chua_co.replace('{npc}', D.npcs[C.npc]?.name || ''))); }
  lop.onclick = () => { if (!ld.busy) { st.sub = 'lo'; refresh(); } };   // chạm lò: sang mục Lò đan đổi lò
  const up = el('button', 'sv-bbtn ld-up', T.up);   // Nâng phẩm lò đang đặt (chạm mới hiện giá rồi hỏi lại)
  up.disabled = !lo || lo.ph >= C.nang.length;
  up.onclick = () => { if (!ld.busy && lo) askNang(game, lo, refresh); };
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
  clear.onclick = () => { ld.put = {}; ld.last = ''; refresh(); };
  const go = el('button', 'sv-bbtn gold ld-go', T.go);
  go.disabled = !keys.length || !lo;
  go.onclick = async () => {
    go.disabled = true; clear.disabled = true; up.disabled = true; go.textContent = T.busy; ld.busy = true;
    const put = { ...ld.put };   // máy chủ tự ghép đan phương (một mẻ ra được nhiều loại đan)
    const r = await brewFx(game, box, [...slots.querySelectorAll('.ld-co')], () => luyen(game, put));   // nguyên liệu bay vào lò, lửa bùng (src/ui/lo-dan-fx.js)
    if (r.err) { ld.busy = false; game.toast(r.err === 'thieu_nl' ? 'Kho không còn đủ nguyên liệu.' : r.err === 'chua_co_lo' ? T.chua_dat : T.net, 2); refresh(); return; }
    const ten = d => D.cave.pills[d.dan]?.name || d.dan, ok = (r.ds || []).filter(d => d.thanh);
    ld.put = {}; ld.last = '';
    refresh();   // dựng lại bảng (kho đã trừ), chữ kết quả chỉ hiện sau khi lò diễn xong
    const nb = mid.querySelector('.ld-lo'), kq = ok.length ? T.ok_nhieu.replace('{list}', ok.map(d => `${ten(d)} ×${d.vien}`).join(', ')) : T.fail;
    if (!ok.length) { if (nb) await resultFx(game, nb, r); game.toast(T.fail, 2.4); ld.busy = false; ld.last = kq; refresh(); return; }
    if (nb) await resultFx(game, nb, r);   // bung nắp, viên đan chui ra từ miệng lò
    ld.busy = false; ld.last = kq; refresh();
    // Bảng nhận thưởng như nhận đồ (14:3x): người chơi bấm Tiếp tục mới đóng
    const first = D.art.sprites['ui.vk-' + ok[0].dan];
    await game.rewardGive?.({ qua: { ray: '#ffd75a', ink: '#ffe7a6', lvl: 1,
      name: ok.length > 1 ? T.kq_ten.replace('{k}', ok.length) : `${ten(ok[0])} ×${ok[0].vien}`, tag: T.kq_tag,
      sub: T.kq_sub.replace('{name}', loTen(game, lo)).replace('{ph}', R.name), ico: first ? `url("${first.file}?v=${first.v}")` : '',
      lines: (r.ds || []).map(d => d.thanh ? { text: `${ten(d)} ×${d.vien}`, color: '#ffe7a6' } : { text: T.kq_hong.replace('{name}', ten(d)), color: '#ff8a7a' }), gain: null } });
  };
  bar.replaceChildren(clear, up, go);
}
