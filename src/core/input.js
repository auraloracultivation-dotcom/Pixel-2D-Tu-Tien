// Điều khiển: cần gạt ảo (nửa trái), nút bấm (DOM, data-act), bàn phím, chạm để xem tên.
const KEYMAP = {
  KeyJ: 'atk', Space: 'atk', KeyK: 's0', KeyL: 's1', KeyI: 's2', KeyE: 'act', Enter: 'act', ShiftLeft: 'dash', KeyU: 'dash', KeyO: 'art',
};
const DIRS = {
  KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1],
  KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0],
};
const JOY_R = 44;
const AIM_DEAD = 14; // px kéo tối thiểu để tính là tự ngắm

export function createInput(canvas) {
  const inp = { joy: null, taps: [], keys: new Set(), held: new Set(), pressed: new Set() };

  // Cần gạt kẹt chạy một hướng (chủ dự án báo 28/10): khi điện thoại làm rơi sự kiện nhấc tay (bảng, hộp thoại hiện lên dưới ngón,
  // vuốt ra mép màn, đa chạm), cần gạt cũ còn treo và chặn luôn lần chạm mới. Nên: nhấc tay ở đâu cũng nhận (window), mất giữ con trỏ
  // thì thả, không còn ngón nào trên màn hoặc ngón vừa nhấc ở đúng chỗ cần gạt thì thả, lần chạm mới khi màn trống thì thay cần gạt cũ.
  let fingers = 0;   // số ngón đang chạm theo touch events (trước lần chạm đang xử lý)
  canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (inp.joy && e.pointerType === 'touch' && fingers === 0) inp.joy = null;   // cần gạt treo từ lần chạm trước
    if (!inp.joy && e.clientX < window.innerWidth * 0.6) {
      inp.joy = { id: e.pointerId, ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, t: performance.now() };
      try { canvas.setPointerCapture?.(e.pointerId); } catch { /* con trỏ đã nhả trước khi kịp giữ: nhấc tay ở window vẫn thả cần gạt */ }
    } else {
      inp.taps.push({ x: e.clientX, y: e.clientY });
    }
  });
  window.addEventListener('pointermove', e => {
    const j = inp.joy;
    if (!j || e.pointerId !== j.id) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { inp.joy = null; return; }   // chuột đã nhả ngoài cửa sổ
    j.x = e.clientX; j.y = e.clientY;
  }, true);
  const end = e => {
    const j = inp.joy;
    if (!j || e.pointerId !== j.id) return;
    if (e.type === 'pointerup' && Math.hypot(j.x - j.ox, j.y - j.oy) < 10 && performance.now() - j.t < 300) inp.taps.push({ x: j.x, y: j.y });
    inp.joy = null;
  };
  window.addEventListener('pointerup', end, true);
  window.addEventListener('pointercancel', end, true);
  canvas.addEventListener('lostpointercapture', end);
  const touches = e => {
    fingers = e.touches.length;
    const j = inp.joy;
    if (!j || e.type === 'touchstart') return;
    if (!fingers) { inp.joy = null; return; }
    for (const t of e.changedTouches) if (Math.hypot(t.clientX - j.x, t.clientY - j.y) < 40) { inp.joy = null; return; }
  };
  for (const ev of ['touchstart', 'touchend', 'touchcancel']) window.addEventListener(ev, touches, { capture: true, passive: true });

  inp.aim = {};      // hướng ngắm khi thả nút chiêu sau khi kéo (null = tự ngắm)
  inp.aiming = null; // đang kéo nút chiêu để ngắm: {act, x, y} (đã chuẩn hoá)
  for (const b of document.querySelectorAll('[data-act]')) {
    const act = b.dataset.act;
    if (act.startsWith('s')) {
      // Nút chiêu: chạm = tự ngắm quái gần nhất; kéo ra = tự chọn hướng, thả tay mới ra chiêu
      let st = null;
      b.addEventListener('pointerdown', e => {
        e.preventDefault(); e.stopPropagation();
        st = { id: e.pointerId, ox: e.clientX, oy: e.clientY };
        b.setPointerCapture?.(e.pointerId); b.classList.add('down');
      });
      b.addEventListener('pointermove', e => {
        if (!st || e.pointerId !== st.id) return;
        const dx = e.clientX - st.ox, dy = e.clientY - st.oy, d = Math.hypot(dx, dy);
        inp.aiming = d > AIM_DEAD ? { act, x: dx / d, y: dy / d } : null;
      });
      const release = cancel => e => {
        if (!st || e.pointerId !== st.id) return;
        if (!cancel) { inp.aim[act] = inp.aiming && inp.aiming.act === act ? { x: inp.aiming.x, y: inp.aiming.y } : null; inp.pressed.add(act); }
        st = null; inp.aiming = null; b.classList.remove('down');
      };
      b.addEventListener('pointerup', release(false)); b.addEventListener('pointercancel', release(true));
      continue;
    }
    b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); inp.pressed.add(act); inp.held.add(act); b.classList.add('down'); });
    const up = () => { inp.held.delete(act); b.classList.remove('down'); };
    b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); b.addEventListener('pointercancel', up);
  }

  window.addEventListener('keydown', e => {
    if (e.repeat || e.target?.tagName === 'INPUT') return;   // đang gõ chữ trò chuyện
    inp.keys.add(e.code);
    const act = KEYMAP[e.code];
    if (act) { inp.pressed.add(act); inp.held.add(act); if (act.startsWith('s')) inp.aim[act] = null; }
  });
  window.addEventListener('keyup', e => {
    inp.keys.delete(e.code);
    const act = KEYMAP[e.code];
    if (act) inp.held.delete(act);
  });
  const reset = () => { inp.keys.clear(); inp.held.clear(); inp.joy = null; fingers = 0; };
  window.addEventListener('blur', reset);
  document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });

  inp.axis = () => {
    let x = 0, y = 0;
    for (const k of inp.keys) if (DIRS[k]) { x += DIRS[k][0]; y += DIRS[k][1]; }
    if (inp.joy) {
      const dx = inp.joy.x - inp.joy.ox, dy = inp.joy.y - inp.joy.oy, d = Math.hypot(dx, dy);
      if (d > 6) { const m = Math.min(1, d / JOY_R); x += dx / d * m; y += dy / d * m; }
    }
    const d = Math.hypot(x, y);
    return d > 1 ? { x: x / d, y: y / d } : { x, y };
  };
  inp.consume = act => inp.pressed.delete(act);
  inp.clear = () => { inp.pressed.clear(); inp.taps.length = 0; };
  inp.JOY_R = JOY_R;
  return inp;
}
