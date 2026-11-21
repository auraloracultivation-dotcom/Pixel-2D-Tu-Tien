// Bảng "Sắp xếp giao diện" (chủ dự án 19/11/2026 10:47–10:50, mở ở Menu → Sắp xếp giao diện): mỗi khung (data/menu.json → hud.sap)
// hiện viền nét đứt kèm tên; kéo để dời, chụm / mở hai ngón trên khung (hoặc thanh trượt khi đã chọn khung) để thu nhỏ / phóng to.
// Khung không ra khỏi màn; hai khung đè nhau thì viền đỏ. Lưu: cách xếp giữ trong máy, màn dọc và ngang riêng (src/ui/sap-ap.js).
// Mặc định: về cách xếp gốc. Huỷ: bỏ thay đổi vừa làm. Kiểu ở src/ui/sap-xep.css.
import { goc } from '../core/build.js';
import { sapApply, sapLoad, sapStore, sapMode, groupBox } from './sap-ap.js';
import { every } from '../core/ticker.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createSapXep(game) {
  const S = game.data.menu?.hud?.sap;
  if (!S) return;
  const css = el('link'); css.rel = 'stylesheet'; css.href = goc('src/ui/sap-xep.css'); document.head.append(css);
  const T = S.text, [KMIN, KMAX] = S.k;

  // Áp cách đã lưu: lúc vào game, xoay màn, đổi cỡ; định kỳ cho các nút mới hiện (Bay, Cưỡi mở sau)
  let mode = '', busy = false;
  const apply = () => { if (!busy) sapApply(game); };
  const onSize = () => { mode = sapMode(); apply(); };
  addEventListener('resize', () => setTimeout(onSize, 120));
  every(() => { if (game.player && !busy) apply(); }, 2000);

  const root = el('div', 'sap-root'); root.hidden = true;
  const top = el('div', 'sap-top'), title = el('b', null, T.title), hint = el('small', null, T.hint);
  top.append(title, hint);
  const bar = el('div', 'sap-bar'), lab = el('span', 'sap-lab', T.pick), range = el('input', 'sap-range');
  range.type = 'range'; range.min = KMIN * 100; range.max = KMAX * 100; range.step = 1; range.disabled = true;
  const row = el('div', 'sap-btns'), bSave = el('button', 'sap-b ok', T.save), bReset = el('button', 'sap-b', T.reset), bCancel = el('button', 'sap-b', T.cancel);
  row.append(bReset, bCancel, bSave); bar.append(lab, range, row);
  root.append(top, bar); document.body.append(root);
  for (const b of [bReset, bCancel, bSave]) b.type = 'button';

  let cfg = {}, boxes = [], sel = null;
  const groups = () => S[sapMode()] || [];
  const clampK = k => Math.min(KMAX, Math.max(KMIN, k));

  function paint() {
    sapApply(game, cfg);
    const list = groups(), rects = list.map(g => groupBox(g, cfg[g.id]));
    boxes.forEach((b, i) => {
      const r = rects[i];
      b.hidden = !r;
      if (!r) return;
      Object.assign(b.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
      const hit = rects.some((o, j) => j !== i && o && r.x < o.x + o.w - 2 && o.x < r.x + r.w - 2 && r.y < o.y + o.h - 2 && o.y < r.y + r.h - 2);
      b.classList.toggle('chong', hit); b.classList.toggle('on', sel === list[i].id);
    });
    const c = sel && cfg[sel];
    range.disabled = !sel; range.value = Math.round((c?.k || 1) * 100);
    lab.textContent = sel ? `${list.find(g => g.id === sel)?.name}: ${T.size} ${range.value}%` : T.pick;
  }

  // Giữ khung trong màn: dời ngược phần lòi ra
  function keepIn(g) {
    const c = cfg[g.id] ||= { x: 0, y: 0, k: 1 };
    sapApply(game, cfg);
    const r = groupBox(g, c);
    if (!r) return;
    const W = innerWidth, H = innerHeight;
    if (r.x < 0) c.x -= r.x; else if (r.x + r.w > W) c.x -= Math.max(0, Math.min(r.x, r.x + r.w - W));
    if (r.y < 0) c.y -= r.y; else if (r.y + r.h > H) c.y -= Math.max(0, Math.min(r.y, r.y + r.h - H));
  }

  function build() {
    for (const b of boxes) b.remove();
    boxes = groups().map(g => {
      const b = el('div', 'sap-box'); b.append(el('span', 'sap-name', g.name));
      const pts = new Map();
      let start = null;
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation(); b.setPointerCapture(e.pointerId);
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        sel = g.id; const c = cfg[g.id] ||= { x: 0, y: 0, k: 1 };
        const p = [...pts.values()];
        start = { c: { ...c }, p: p.map(q => ({ ...q })), d: p.length > 1 ? Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) : 0 };
        paint();
      });
      b.addEventListener('pointermove', e => {
        if (!pts.has(e.pointerId) || !start) return;
        pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const c = cfg[g.id], p = [...pts.values()];
        if (p.length > 1 && start.d) {   // hai ngón: co giãn
          c.k = clampK(start.c.k * Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) / start.d);
        } else {   // một ngón: kéo
          c.x = start.c.x + p[0].x - start.p[0].x; c.y = start.c.y + p[0].y - start.p[0].y;
        }
        paint();
      });
      const up = e => {
        pts.delete(e.pointerId);
        const p = [...pts.values()];
        start = p.length ? { c: { ...cfg[g.id] }, p: p.map(q => ({ ...q })), d: 0 } : null;   // còn một ngón: kéo tiếp từ chỗ này
        keepIn(g); paint();
      };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      root.append(b);
      return b;
    });
  }

  range.addEventListener('input', () => {
    if (!sel) return;
    const g = groups().find(q => q.id === sel), c = cfg[sel] ||= { x: 0, y: 0, k: 1 };
    c.k = clampK(range.value / 100); keepIn(g); paint();
  });
  for (const e of ['pointerdown', 'click']) [top, bar].forEach(x => x.addEventListener(e, ev => ev.stopPropagation()));

  function close() { root.hidden = true; busy = false; game.uiOpen = null; document.body.classList.remove('sap-on'); for (const b of boxes) b.remove(); boxes = []; sapApply(game); }
  bCancel.onclick = close;
  bReset.onclick = () => { cfg = {}; sel = null; paint(); };
  bSave.onclick = () => {
    const all = sapLoad(), m = sapMode();
    for (const k of Object.keys(cfg)) { const c = cfg[k]; if (!c.x && !c.y && c.k === 1) delete cfg[k]; }
    all[m] = cfg;
    game.toast(sapStore(all) ? T.saved : '…', 2);
    close();
  };

  game.openSapXep = () => {
    if (!game.player || !game.save) return;
    game.closeAll?.();
    busy = true; mode = sapMode(); sel = null;
    cfg = JSON.parse(JSON.stringify(sapLoad()[mode] || {}));
    root.hidden = false; game.uiOpen = 'sap'; document.body.classList.add('sap-on');
    build(); requestAnimationFrame(paint);
  };
  setTimeout(onSize, 0);
}
