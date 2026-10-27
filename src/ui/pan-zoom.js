// Kéo một ngón để dời, chụm hai ngón hoặc lăn chuột để phóng to / thu nhỏ; chạm nhẹ (không kéo) gọi onTap(x, y).
// Trả về { z, x, y }: độ phóng và độ dời tâm (điểm ảnh CSS) để nơi vẽ áp vào.
export function panZoom(el, { min = 1, max = 3, onTap }) {
  const v = { z: 1, x: 0, y: 0 };
  const pts = new Map();
  let moved = false, start = null;
  const rel = ev => { const r = el.getBoundingClientRect(); return { x: ev.clientX - r.left, y: ev.clientY - r.top }; };

  function clamp() {
    const lx = el.clientWidth / 2 * (v.z - 1) + 20, ly = el.clientHeight / 2 * (v.z - 1) + 20;
    v.x = Math.max(-lx, Math.min(lx, v.x)); v.y = Math.max(-ly, Math.min(ly, v.y));
    if (v.z === 1) v.x = v.y = 0;
  }
  // Phóng quanh một điểm (toạ độ trong khung) cho điểm đó đứng yên
  function zoomAt(f, px, py) {
    const z = Math.min(max, Math.max(min, v.z * f)), k = z / v.z;
    const cx = px - el.clientWidth / 2, cy = py - el.clientHeight / 2;
    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.z = z;
    clamp();
  }

  el.addEventListener('pointerdown', ev => {
    ev.stopPropagation();
    try { el.setPointerCapture(ev.pointerId); } catch { /* trình duyệt cũ */ }
    const p = rel(ev);
    pts.set(ev.pointerId, p);
    if (pts.size === 1) { moved = false; start = p; } else moved = true;
  });
  el.addEventListener('pointermove', ev => {
    const o = pts.get(ev.pointerId);
    if (!o) return;
    const p = rel(ev);
    if (pts.size === 1) {
      if (!moved && Math.hypot(p.x - start.x, p.y - start.y) > 6) moved = true;
      if (moved) { v.x += p.x - o.x; v.y += p.y - o.y; clamp(); }
    } else if (pts.size === 2) {
      const other = [...pts.entries()].find(([id]) => id !== ev.pointerId)[1];
      const d0 = Math.hypot(o.x - other.x, o.y - other.y), d1 = Math.hypot(p.x - other.x, p.y - other.y);
      if (d0 > 10) zoomAt(d1 / d0, (p.x + other.x) / 2, (p.y + other.y) / 2);
      v.x += (p.x - o.x) / 2; v.y += (p.y - o.y) / 2; clamp();
    }
    pts.set(ev.pointerId, p);
  });
  const up = ev => {
    if (!pts.has(ev.pointerId)) return;
    const p = rel(ev);
    pts.delete(ev.pointerId);
    if (!pts.size && !moved && onTap) onTap(p.x, p.y);
  };
  el.addEventListener('pointerup', up);
  el.addEventListener('pointercancel', ev => { pts.delete(ev.pointerId); moved = true; });
  el.addEventListener('wheel', ev => { ev.preventDefault(); const p = rel(ev); zoomAt(ev.deltaY < 0 ? 1.15 : 1 / 1.15, p.x, p.y); }, { passive: false });
  v.reset = () => { v.z = 1; v.x = v.y = 0; };
  return v;
}
