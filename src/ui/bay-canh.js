// Bày cảnh (chủ dự án 09/11/2026 13:44: "cho tôi tự sắp xếp đồ hoạ trong game: chạm vào món nào cũng di chuyển, phóng to thu nhỏ;
// kho vô hạn cái gì cũng có; tôi đặt ở đâu toàn bộ game đổi theo"). Chỉ tải khi máy chủ xác nhận có quyền bày (bay-canh-start.js).
// Bật nút Bày: chạm món để chọn, kéo để dời; kéo chỗ trống để trôi máy quay; hai ngón để phóng to thu nhỏ máy quay.
// Món đang chọn: To, Nhỏ, Lật, Nhân bản, Xoá. Kho: mọi món đồ bộ mới, chọn là đặt giữa màn. Lưu: ghi lên máy chủ (src/net/bay-dao.js),
// mọi người chơi vào bản đồ đó thấy bố cục mới. Hoàn tác (50 bước), Bản cũ (30 lần lưu gần nhất).
import { saveLayout, layoutHistory, layoutRestore, layoutOne } from '../net/bay-dao.js';
import { SPOTS, spotBox, applySpots } from '../game/home-spot.js';
// Động phủ: Mộc Nhân, bể cá cũng chọn, kéo được (chủ dự án 12/11/2026 02:23), lưu thành món đánh dấu '@dummy' / '@be_ca' (home-spot.js)
// Tinh cầu khai hoang (chủ dự án 12/11/2026): tông chủ và trưởng lão được giao bày tinh cầu của tông môn; kho chỉ có công trình, đồ tông môn
// đã mua (đếm số còn lại), lưu qua máy chủ khai hoang. Cách lưu, kho, quyền lấy từ game.khBay (src/ui/kh-bay.js) khi đang đứng trên tinh cầu đó.

const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
const r1 = v => Math.round(v * 10) / 10;

export function createBayCanh(game) {
  if (document.getElementById('bay-btn')) return;
  const css = el('link'); css.rel = 'stylesheet'; css.href = new URL('./bay-canh.css', import.meta.url).href; document.head.append(css);
  game.bayVer ??= {};
  const B = game.bay = { on: false, sel: null, selIdx: -1, list: null, undo: [], dirty: false };
  const btn = el('button', 'bay-btn', 'Bày'); btn.id = 'bay-btn'; btn.type = 'button';
  const bar = el('div', 'bay-bar'); bar.hidden = true;
  const info = el('div', 'bay-info', '');
  const selRow = el('div', 'bay-row'), allRow = el('div', 'bay-row');
  bar.append(info, selRow, allRow);
  document.body.append(btn, bar);
  const mk = (row, label, fn, cls) => { const b = el('button', 'bay-b' + (cls ? ' ' + cls : ''), label); b.type = 'button'; b.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); fn(); }); row.append(b); return b; };

  // Nơi lưu: tinh cầu khai hoang (game.khBay) hoặc bản đồ chung (chỉ tài khoản có quyền bày toàn game, bay-canh-start.js)
  const GLOBAL = { save: (id, list) => saveLayout(id, list, game.bayVer?.[id]), history: layoutHistory, restore: layoutRestore,
    fetchOne: async id => { const L = await layoutOne(id); if (L) game.bayVer[id] = L.ver; return L; } };
  const A = () => (game.map.def.kh?.tinh && game.khBay?.perm() ? game.khBay : GLOBAL);
  setInterval(() => { btn.hidden = !(game.khBay?.perm() || (game.bayGlobal && !game.map?.def?.kh)); }, 1000);
  const T = () => game.map.T;
  const spotSel = (key, idx) => { const b = spotBox(game, key); return b && { ...b, spot: key, idx }; };   // khung vẽ ở draw-hoi.js drawSpots
  const entry = () => B.list?.[B.selIdx];
  const snap = () => { B.undo.push(JSON.stringify(B.list)); if (B.undo.length > 50) B.undo.shift(); B.dirty = true; };
  const rebuild = () => {
    game.map.setHoi(B.list); applySpots(game);
    const sk = String(entry()?.[0] || '').startsWith('@') ? entry()[0].slice(1) : null;
    B.sel = B.selIdx < 0 ? null : sk ? spotSel(sk, B.selIdx) : game.map.hoi.find(h => h.idx === B.selIdx) || null;
    if (!B.sel) B.selIdx = -1;
    paint();
  };
  const opt = (e, k, v) => { while (e.length < 4) e.push(null); const o = { ...(e[4] || {}) }; if (v == null || v === 1 && k === 's' || v === false) delete o[k]; else o[k] = v; if (Object.keys(o).length) e[4] = o; else e.length = Math.min(e.length, 4); if (e.length === 4 && e[3] == null) e.length = 3; };
  const paint = () => {
    const e = entry(), n = game.data.art.sprites[e?.[0]]?.note || '';
    info.textContent = e ? `${({ '@dummy': 'Mộc Nhân', '@be_ca': 'Bể cá' })[e[0]] || e[0]}  ·  ô ${r1(e[1])}, ${r1(e[2])}  ·  cỡ ${Math.round((e[4]?.s || 1) * 100)}%${e[4]?.f ? ' · lật' : ''}` : `${game.map.def.name || game.map.id}: chạm món để chọn · kéo chỗ trống để đi · hai ngón phóng to${B.dirty ? ' · CHƯA LƯU' : ''}`;
    info.title = n;
    for (const b of selRow.children) b.disabled = !e;
    nameBtn.hidden = !(e && A().named?.(e[0]));   // công trình tinh cầu khai hoang: đặt tên NPC đi kèm
  };

  // món đang chọn
  mk(selRow, 'To', () => { const e = entry(); if (!e) return; snap(); opt(e, 's', Math.min(4, r1((e[4]?.s || 1) * 1.1 + 1e-9) || 1.1)); rebuild(); });
  mk(selRow, 'Nhỏ', () => { const e = entry(); if (!e) return; snap(); opt(e, 's', Math.max(0.2, r1((e[4]?.s || 1) / 1.1))); rebuild(); });
  mk(selRow, 'Lật', () => { const e = entry(); if (!e) return; snap(); opt(e, 'f', e[4]?.f ? null : 1); rebuild(); });
  mk(selRow, 'Nhân bản', () => { const e = entry(); if (!e) return; if (A().left && A().left(e[0], B.list) <= 0) { game.toast('Kho tông môn hết món này. Mua thêm ở bảng Tông môn → Tinh cầu.', 2.4); return; } snap(); const c = JSON.parse(JSON.stringify(e)); c[1] = r1(c[1] + 1.5); c[2] = r1(c[2] + 0.5); B.list.push(c); B.selIdx = B.list.length - 1; rebuild(); });
  const nameBtn = mk(selRow, 'Tên NPC', () => { const e = entry(); if (!e || !A().named?.(e[0])) return; askName(e[4]?.n || '').then(n => { if (n == null) return; snap(); opt(e, 'n', n.trim() || null); rebuild(); }); });
  mk(selRow, 'Xoá', () => { if (!entry()) return; snap(); B.list.splice(B.selIdx, 1); B.selIdx = -1; rebuild(); }, 'bay-xoa');
  // chung
  mk(allRow, 'Kho', () => openKho());
  mk(allRow, '↶ Hoàn tác', () => { if (!B.undo.length) return; B.list = JSON.parse(B.undo.pop()); B.selIdx = -1; rebuild(); });
  mk(allRow, '＋', () => setZoom(game.screen.mul * 1.25));
  mk(allRow, '－', () => setZoom(game.screen.mul / 1.25));
  mk(allRow, 'Bản cũ', () => openHistory());
  mk(allRow, 'Lưu', () => save(), 'bay-luu');
  mk(allRow, 'Thoát', () => toggle(false));

  function setZoom(m) { const s = game.screen; s.mul = s.mulT = Math.max(0.3, Math.min(3, m)); s.zoom = s.base * s.mul; }

  async function toggle(on) {
    if (on && B.dirty === false) {   // lấy bản mới nhất trên máy chủ trước khi bày (máy khác có thể vừa lưu)
      try { const L = await A().fetchOne(game.map.id); if (L) game.map.setHoi(L.items); } catch { /* dùng bản đang có */ }
    }
    if (!on && B.dirty && !(await ask('Còn thay đổi chưa lưu. Thoát và bỏ chúng?'))) return;
    if (!on && B.dirty) { B.list = JSON.parse(B.undo[0] || JSON.stringify(B.list)); rebuild(); }
    B.on = on; B.sel = null; B.selIdx = -1; B.undo = []; B.dirty = false;
    B.list = on ? JSON.parse(JSON.stringify(game.map.def.hoi?.do || [])) : null;
    B.mapId = game.map.id; B.cam = on ? { x: game.player.x, y: game.player.y - 4 } : null;
    bar.hidden = !on; btn.classList.toggle('on', on);
    game.auto = false; game.pilot = null;
    if (on) game.player.invT = 1e9; else { game.player.invT = 0; game.screen.zoomTo(1); }
    paint();
  }
  btn.addEventListener('pointerdown', e => { e.stopPropagation(); e.preventDefault(); toggle(!B.on); });

  async function save() {
    const id = game.map.id;
    try {
      const a = A(), v = await a.save(id, B.list);
      if (a === GLOBAL) game.bayVer[id] = v;
      B.dirty = false; B.undo = [];
      if (a.after) { const list = B.list; toggle(false); a.after(id, list); game.toast(`Đã lưu ${game.map.def.name} (bản ${v}). Đường, NPC dựng lại theo công trình mới.`, 2.6); return; }
      try { const c = JSON.parse(localStorage.getItem('p2d_bay_cache') || '{}'); c[id] = { items: B.list, ver: v }; localStorage.setItem('p2d_bay_cache', JSON.stringify(c)); } catch { /* máy chặn lưu */ }   // bản nhớ trong máy (bay-canh-start.js)
      game.toast(`Đã lưu ${game.map.def.name || id} (bản ${v}) — người chơi vào bản đồ này sẽ thấy ngay.`, 2.6);
    } catch (err) { game.toast('Chưa lưu được: ' + (err.message || err), 3); }
    paint();
  }

  // Kho: mọi món bộ mới, lọc theo tinh cầu và tìm theo tên
  function openKho() {
    if (A().kho) { openKhoKh(); return; }
    const S = game.data.art.sprites, ids = Object.keys(S).filter(k => k.endsWith('-m') || k.startsWith('chung.')).sort();
    const groups = [['tk.', 'Thiên Kiếm'], ['hb.', 'Hàn Băng'], ['xd.', 'Xích Diễm'], ['dp.', 'Động phủ'], ['chung.', 'Chung'], ['', 'Tất cả']];
    const pre = { 'dao-han-bang': 'hb.', 'dao-xich-dien': 'xd.', 'dong-phu': 'dp.' }[game.map.id] || 'tk.';
    const box = el('div', 'bay-kho'), top = el('div', 'bay-kho-top'), grid = el('div', 'bay-kho-grid'), q = el('input', 'bay-kho-q');
    q.placeholder = 'tìm: cay, den, nha, sap...';
    let cur = pre;
    const fill = () => {
      grid.textContent = '';
      for (const id of ids) {
        if (cur && !id.startsWith(cur)) continue;
        if (q.value && !id.includes(q.value.trim().toLowerCase())) continue;
        const c = el('button', 'bay-kho-o'); c.type = 'button';
        const im = el('img'); im.loading = 'lazy'; im.src = S[id].file + '?v=' + S[id].v; im.alt = id;
        c.append(im, el('span', null, id.replace(/^[a-z]+\./, '').replace(/-m$/, '')));
        c.addEventListener('click', () => { place(id); box.remove(); });
        grid.append(c);
      }
    };
    for (const [p, name] of groups) { const t = el('button', 'bay-b' + (p === cur ? ' on' : ''), name); t.type = 'button'; t.addEventListener('click', () => { cur = p; for (const x of top.querySelectorAll('.bay-b')) x.classList.toggle('on', x === t); fill(); }); top.append(t); }
    const x = el('button', 'bay-b bay-xoa', 'Đóng'); x.type = 'button'; x.addEventListener('click', () => box.remove());
    top.append(q, x); q.addEventListener('input', fill);
    box.append(top, grid); document.body.append(box); fill();
  }
  // Kho tinh cầu khai hoang: chỉ món tông môn sở hữu, kèm số còn lại chưa đặt (game.khBay.kho)
  function openKhoKh() {
    const S = game.data.art.sprites, box = el('div', 'bay-kho'), top = el('div', 'bay-kho-top'), grid = el('div', 'bay-kho-grid');
    const x = el('button', 'bay-b bay-xoa', 'Đóng'); x.type = 'button'; x.addEventListener('click', () => box.remove());
    top.append(el('b', null, 'Kho tông môn (mua thêm ở bảng Tông môn → Tinh cầu)'), x);
    const rows = A().kho(B.list);
    if (!rows.length) grid.append(el('div', null, 'Kho trống. Tông chủ mua công trình, đồ trang trí ở bảng Tông môn → Tinh cầu.'));
    for (const r of rows) {
      const c = el('button', 'bay-kho-o'); c.type = 'button'; c.disabled = r.left <= 0;
      const spr = S[r.id];
      if (spr) { const im = el('img'); im.loading = 'lazy'; im.src = spr.file + '?v=' + spr.v; im.alt = r.name; c.append(im); }
      c.append(el('span', null, `${r.name} · còn ${r.left}`));
      c.addEventListener('click', () => { if (r.left > 0) { place(r.id); box.remove(); } });
      grid.append(c);
    }
    box.append(top, grid); document.body.append(box);
  }
  function askName(cur) {
    return new Promise(res => {
      const box = el('div', 'bay-kho bay-hoi'), row = el('div', 'bay-row'), inp = el('input', 'bay-kho-q');
      inp.maxLength = 16; inp.value = cur; inp.placeholder = 'Tên NPC (2–16 chữ)';
      const y = el('button', 'bay-b bay-luu', 'Đặt tên'), n = el('button', 'bay-b', 'Thôi');
      y.onclick = () => { box.remove(); res(inp.value); }; n.onclick = () => { box.remove(); res(null); };
      row.append(n, y); box.append(el('div', null, 'Tên NPC của công trình này:'), inp, row); document.body.append(box); inp.focus();
    });
  }
  function place(id) {
    const s = game.screen; snap();
    B.list.push([id, r1(s.camX / T()), r1(s.camY / T() + 1)]);   // giữa màn hình
    B.selIdx = B.list.length - 1; rebuild();
  }

  async function openHistory() {
    const box = el('div', 'bay-kho'), top = el('div', 'bay-kho-top'), list = el('div', 'bay-ls');
    const x = el('button', 'bay-b bay-xoa', 'Đóng'); x.type = 'button'; x.addEventListener('click', () => box.remove());
    top.append(el('b', null, 'Bản đã lưu của ' + (game.map.def.name || game.map.id)), x); box.append(top, list); document.body.append(box);
    try {
      const rows = await A().history(game.map.id);
      if (!rows.length) list.append(el('div', null, 'Chưa có bản cũ (bản gốc trong game là bản đầu tiên).'));
      for (const r of rows) {
        const b = el('button', 'bay-b', `Bản ${r.ver} · ${new Date(r.luc).toLocaleString('vi-VN')} · ${r.n} món`); b.type = 'button';
        b.addEventListener('click', async () => { try { const items = await A().restore(r.id); snap(); B.list = items; B.selIdx = -1; rebuild(); box.remove(); game.toast('Đã lấy bản cũ. Bấm Lưu để dùng lại bản này.', 2.6); } catch (e) { game.toast('Lỗi: ' + e.message, 2); } });
        list.append(b);
      }
    } catch (e) { list.append(el('div', null, 'Lỗi tải: ' + e.message)); }
  }
  function ask(msg) {
    return new Promise(res => {
      const box = el('div', 'bay-kho bay-hoi'), row = el('div', 'bay-row');
      const y = el('button', 'bay-b bay-xoa', 'Bỏ thay đổi'), n = el('button', 'bay-b', 'Ở lại');
      y.onclick = () => { box.remove(); res(true); }; n.onclick = () => { box.remove(); res(false); };
      row.append(n, y); box.append(el('div', null, msg), row); document.body.append(box);
    });
  }

  // Chạm trên khung game (chặn trước bộ điều khiển: không đi, không đánh khi đang bày)
  const canvas = game.screen.ctx.canvas, ptrs = new Map();
  let drag = null, pinch = null;
  const world = e => { const r = canvas.getBoundingClientRect(); return game.screen.toWorld(e.clientX - r.left, e.clientY - r.top); };
  const pick = w => { const hs = [...game.map.hoi].sort((a, b) => b.y - a.y); return hs.find(h => w.x >= h.x - h.w / 2 && w.x <= h.x + h.w / 2 && w.y >= h.y - h.h && w.y <= h.y + 2) || pickSpot(w); };
  // Mộc Nhân, bể cá: chạm trúng khung thì thêm món đánh dấu vào bố cục (chưa có) rồi chọn như đồ thường
  function pickSpot(w) {
    if (game.map.id !== game.data.home?.map) return null;
    for (const key of Object.keys(SPOTS)) {
      const b = spotBox(game, key);
      if (!b || w.x < b.x - b.w / 2 || w.x > b.x + b.w / 2 || w.y < b.y - b.h + 8 || w.y > b.y + 8) continue;
      let i = B.list.findIndex(e => e[0] === '@' + key);
      if (i < 0) { B.list.push(['@' + key, r1(b.x / T() - 0.5), r1(b.y / T() - 0.5)]); i = B.list.length - 1; }
      return spotSel(key, i);
    }
    return null;
  }
  window.addEventListener('pointerdown', e => {
    if (!B.on || e.target !== canvas) return;
    e.stopImmediatePropagation(); e.preventDefault();
    if (game.map.id !== B.mapId) { toggle(false); return; }
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), m: game.screen.mul }; drag = null; return; }
    const w = world(e), h = pick(w);
    if (h) {
      B.selIdx = h.idx; B.sel = h; snap(); B.undo.pop();   // chọn chưa tính là đổi
      drag = { kind: 'item', ox: w.x - h.x, oy: w.y - h.y, moved: false, before: JSON.stringify(B.list) };
    } else { B.sel = null; B.selIdx = -1; drag = { kind: 'pan', x: e.clientX, y: e.clientY }; }
    paint();
  }, true);
  window.addEventListener('pointermove', e => {
    if (!B.on || !ptrs.has(e.pointerId)) return;
    e.stopImmediatePropagation();
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()]; setZoom(pinch.m * Math.hypot(a.x - b.x, a.y - b.y) / pinch.d); return; }
    if (!drag) return;
    if (drag.kind === 'pan') { const z = game.screen.zoom, c = B.cam; c.x -= (e.clientX - drag.x) / z; c.y -= (e.clientY - drag.y) / z; drag.x = e.clientX; drag.y = e.clientY; game.screen.snap(c.x, c.y); return; }
    const w = world(e), h = B.sel, en = entry();
    if (!h || !en) return;
    h.x = w.x - drag.ox; h.y = w.y - drag.oy; drag.moved = true;
    const off = h.spot ? 0.5 : 0;   // món đánh dấu lưu theo ô (tâm ô = map.center)
    en[1] = r1(h.x / T() - off); en[2] = r1(h.y / T() - off);
    if (h.spot) applySpots(game);
  }, true);
  const up = e => {
    if (!B.on || !ptrs.has(e.pointerId)) return;
    e.stopImmediatePropagation();
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinch = null;
    if (drag?.kind === 'item' && drag.moved) { B.undo.push(drag.before); if (B.undo.length > 50) B.undo.shift(); B.dirty = true; rebuild(); }
    drag = null; paint();
  };
  window.addEventListener('pointerup', up, true); window.addEventListener('pointercancel', up, true);
  paint();
}
