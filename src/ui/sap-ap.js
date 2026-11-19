// Áp cách xếp giao diện người chơi đã chỉnh (chủ dự án 19/11/2026 10:47–10:50; nhóm khung ở data/menu.json → hud.sap, bảng chỉnh ở
// src/ui/sap-xep.js). Mỗi nhóm dời (x, y điểm CSS) và co giãn (k) quanh góc trái trên của món đầu nhóm (mốc). Từng món trong nhóm được
// gắn translate / scale / transform-origin riêng sao cho cả nhóm dời, co như một khối (các món vẫn nằm chỗ cũ trong DOM và CSS).
// Khung vẽ bằng ::after của món thuộc nhóm khác (màn ngang: khung trên phải là #bang-tren::after) thì bù lại biến đổi của món chủ.
// Lưu trong máy (localStorage "p2d.sap"), màn dọc và màn ngang riêng. Không có gì đã lưu thì không đụng tới giao diện.
const KEY = 'p2d.sap';

export const sapMode = () => (innerWidth > innerHeight && innerHeight < 520 ? 'ngang' : 'doc');   // cùng điều kiện với src/ui/hud-ngang.css
export function sapLoad() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch { return {}; } }
export function sapStore(all) { try { localStorage.setItem(KEY, JSON.stringify(all)); return true; } catch { return false; } }

const PS = '::after';
const isPs = sel => sel.endsWith(PS);
const els = sel => [...document.querySelectorAll(isPs(sel) ? sel.slice(0, -PS.length) : sel)];

// Hộp bố cục (chưa biến đổi) của một món: bỏ translate / scale riêng, trừ phần dời của transform sẵn có
function rawBox(el) {
  const st = el.style, keep = [st.translate, st.scale];
  st.translate = st.scale = '';
  const r = el.getBoundingClientRect(), m = new DOMMatrix(getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform);
  st.translate = keep[0]; st.scale = keep[1];
  return { x: r.left - m.e, y: r.top - m.f, w: r.width, h: r.height, hide: !r.width && !r.height };
}
// Hộp của khung ::after (chưa biến đổi): theo hộp món chủ + left / top đã tính
function psBox(host) {
  const h = rawBox(host), c = getComputedStyle(host, PS);
  if (c.content === 'none' || c.display === 'none') return null;
  return { x: h.x + (parseFloat(c.left) || 0), y: h.y + (parseFloat(c.top) || 0), w: parseFloat(c.width) || 0, h: parseFloat(c.height) || 0 };
}

// Mốc của nhóm: góc trái trên của món đầu (khung)
export function anchorOf(g) {
  const sel = g.list[0], e = els(sel)[0];
  if (!e) return null;
  return isPs(sel) ? psBox(e) : rawBox(e);
}

// Áp cho một chế độ màn (doc / ngang). cfg: { [id]: { x, y, k } }
export function sapApply(game, cfg = sapLoad()[sapMode()] || {}) {
  const S = game.data.menu?.hud?.sap;
  if (!S) return;
  const groups = S[sapMode()] || [], owner = new Map(), T = {};
  for (const g of groups) {
    const c = cfg[g.id] || {}, a = anchorOf(g);
    T[g.id] = { x: c.x || 0, y: c.y || 0, k: c.k || 1, ox: a?.x || 0, oy: a?.y || 0 };
    for (const sel of g.list) if (!isPs(sel)) for (const e of els(sel)) owner.set(e, g.id);
  }
  for (const g of groups) {
    const t = T[g.id], plain = t.x === 0 && t.y === 0 && t.k === 1;
    for (const sel of g.list) {
      if (isPs(sel)) { for (const host of els(sel)) psFix(host, T[owner.get(host)], t); continue; }
      for (const e of els(sel)) {
        if (plain) { e.style.translate = e.style.scale = ''; continue; }
        // co giãn quanh tâm món (giữ tâm cho hiệu ứng bấm scale .92 sẵn có), dời bù để cả nhóm như co quanh mốc: t' = T + (1 − k)(O − tâm)
        const b = rawBox(e), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
        e.style.translate = `${t.x + (1 - t.k) * (t.ox - cx)}px ${t.y + (1 - t.k) * (t.oy - cy)}px`; e.style.scale = String(t.k);
      }
    }
  }
}

// Khung ::after nằm trong món chủ thuộc nhóm H nhưng tính theo nhóm G: Q = H⁻¹ ∘ G (cả hai chỉ dời + co đều)
function psFix(host, H, G) {
  const st = host.style;
  if (!G || (G.x === 0 && G.y === 0 && G.k === 1 && (!H || (H.x === 0 && H.y === 0 && H.k === 1)))) { st.removeProperty('--sap-pt'); st.removeProperty('--sap-pk'); return; }
  H ||= { x: 0, y: 0, k: 1, ox: 0, oy: 0 };
  const p = psBox(host);
  if (!p) return;
  const s = G.k / H.k;
  const cx = H.ox + (G.ox + G.x - G.k * G.ox - H.ox - H.x) / H.k, cy = H.oy + (G.oy + G.y - G.k * G.oy - H.oy - H.y) / H.k;   // Q(V) = s·V + c
  st.setProperty('--sap-pt', `${cx - p.x * (1 - s)}px ${cy - p.y * (1 - s)}px`);   // dời của Q khi lấy gốc ở góc trái trên khung
  st.setProperty('--sap-pk', String(s));
}

// Hộp đang hiện của cả nhóm (sau biến đổi), để vẽ khung chỉnh và giữ trong màn. c: { x, y, k } đang áp cho nhóm (khung ::after tính theo đó)
export function groupBox(g, c = {}) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (l, t, r, b) => { x0 = Math.min(x0, l); y0 = Math.min(y0, t); x1 = Math.max(x1, r); y1 = Math.max(y1, b); };
  for (const sel of g.list) {
    if (isPs(sel)) {
      for (const host of els(sel)) {
        const p = psBox(host), a = anchorOf(g), k = c.k || 1;
        if (!p || !a) continue;
        const X = v => a.x + (c.x || 0) + k * (v - a.x), Y = v => a.y + (c.y || 0) + k * (v - a.y);
        add(X(p.x), Y(p.y), X(p.x + p.w), Y(p.y + p.h));
      }
      continue;
    }
    for (const e of els(sel)) { const r = e.getBoundingClientRect(); if (r.width || r.height) add(r.left, r.top, r.right, r.bottom); }
  }
  return x0 === Infinity ? null : { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}
