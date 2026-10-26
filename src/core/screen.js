// Khung vẽ: kích thước theo màn hình, máy quay bám người chơi, rung màn hình.
export function createScreen(canvas, cfg) {
  const s = {
    canvas, ctx: canvas.getContext('2d'),
    w: 0, h: 0, dpr: 1, zoom: 1,
    camX: 0, camY: 0, shakeT: 0, shakeA: 0, sx: 0, sy: 0,
  };

  function resize() {
    s.dpr = Math.min(window.devicePixelRatio || 1, 3);
    s.w = window.innerWidth; s.h = window.innerHeight;
    canvas.width = Math.round(s.w * s.dpr); canvas.height = Math.round(s.h * s.dpr);
    canvas.style.width = s.w + 'px'; canvas.style.height = s.h + 'px';
    s.zoom = Math.min(s.w, s.h * 0.75) / (cfg.tile * cfg.view_tiles);
  }
  window.addEventListener('resize', resize);
  resize();

  s.shake = (amount, time = 0.18) => { s.shakeA = Math.max(s.shakeA, amount); s.shakeT = Math.max(s.shakeT, time); };

  s.follow = (x, y, dt, map) => {
    const k = 1 - Math.exp(-dt * 8);
    s.camX += (x - s.camX) * k; s.camY += (y - s.camY) * k;
    if (map) {
      const hw = s.w / s.zoom / 2, hh = s.h / s.zoom / 2;
      const W = map.w * cfg.tile, H = map.h * cfg.tile;
      s.camX = W > hw * 2 ? Math.min(Math.max(s.camX, hw), W - hw) : W / 2;
      s.camY = H > hh * 2 ? Math.min(Math.max(s.camY, hh), H - hh) : H / 2;
    }
    if (s.shakeT > 0) {
      s.shakeT -= dt;
      s.sx = (Math.random() * 2 - 1) * s.shakeA; s.sy = (Math.random() * 2 - 1) * s.shakeA;
      if (s.shakeT <= 0) s.shakeA = 0;
    } else { s.sx = 0; s.sy = 0; }
  };

  s.snap = (x, y) => { s.camX = x; s.camY = y; };

  // Toạ độ thế giới → khung vẽ
  s.worldTransform = () => {
    const z = s.zoom * s.dpr;
    s.ctx.setTransform(z, 0, 0, z, s.w / 2 * s.dpr - (s.camX - s.sx) * z, s.h / 2 * s.dpr - (s.camY - s.sy) * z);
  };
  s.screenTransform = () => s.ctx.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);

  s.toWorld = (px, py) => ({ x: (px - s.w / 2) / s.zoom + s.camX, y: (py - s.h / 2) / s.zoom + s.camY });
  s.toScreen = (x, y) => ({ x: (x - s.camX) * s.zoom + s.w / 2, y: (y - s.camY) * s.zoom + s.h / 2 });

  s.viewRect = () => {
    const hw = s.w / s.zoom / 2 + 16, hh = s.h / s.zoom / 2 + 16;
    return { x0: s.camX - hw, y0: s.camY - hh, x1: s.camX + hw, y1: s.camY + hh };
  };
  return s;
}
