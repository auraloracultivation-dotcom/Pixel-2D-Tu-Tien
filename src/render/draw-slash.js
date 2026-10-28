// Vệt chém (chủ dự án xin 29/10/2026: "nhát chém sắc nét, mượt, rõ, giống như chém, không đứt gãy; nổi trên mọi thứ; nhát sau
// chồng lên nhát trước"; làm theo bài "Vệt chém lưỡi liềm" trong trang Xưởng VFX Pixel chủ dự án duyệt).
// Mỗi khung vẽ lại lưỡi bằng điểm ảnh thật ở lưới bản đồ (1 điểm ảnh = 1 đơn vị), không phóng to xoay hình có sẵn nên không răng cưa,
// không đứt khúc; đầu lưỡi chạy liên tục theo thời gian nên mượt dù mỗi khung vẫn sắc nét:
// - hình lưỡi liềm dày nhất ở khoảng 2/3 về phía đầu chém, nhọn hai đầu; 4 tông theo độ sâu: mép cắt ngoài sáng nhất (gần trắng),
//   vào trong là màu sáng, màu vũ khí, mép trong sẫm ngả tím; đuôi nguội đi một tông; tia mảnh bong ra ở mặt trong, cách hàng;
// - quầng mềm cộng sáng đặt dưới hình (chỗ duy nhất được mịn), hình pixel giữ sắc;
// - nhịp (slash.timing): lóe báo ở điểm đầu → hai khung vút nhanh (đầu lưỡi lao tới) → giữ đỉnh sáng nhất → tan bằng dither Bayer 4×4
//   (xoá 25%, 50%, 75% điểm theo mẫu cố định).
// Hình: arc (cung quanh người), line (đâm, bổ), spin (vùng xoay). Vẽ sau cùng theo thứ tự trong game.fx. Số ở data/config.json → slash.

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const A = 1.15, B = 0.4, PEAK = (A / (A + B)) ** A * (B / (A + B)) ** B;
const prof = u => (u <= 0 || u >= 1 ? 0 : u ** A * (1 - u) ** B / PEAK);   // độ dày dọc lưỡi
const TAU = Math.PI * 2;
const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

let cv = null, cx2 = null, glow = null, gx = null, imgBuf = null;
const tones = new Map();

function rgb(hex) { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.replace(/./g, c => c + c) : h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));

// 4 tông từ một màu: gần trắng, sáng, màu gốc, sẫm ngả tím (bóng đổi sắc theo luật bảng màu)
function paletteOf(C, color, name) {
  const key = name || color;
  if (!tones.has(key)) {
    const p = C.palettes?.[name];
    const c = rgb(color || C.color);
    tones.set(key, p ? p.map(rgb) : [mix(c, [255, 252, 240], 0.85), mix(c, [255, 255, 255], 0.4), c, mix(c, [58, 20, 64], 0.38)]);
  }
  return tones.get(key);
}

// Khung theo nhịp: 0 lóe, 1–2 vút, 3 đỉnh, 4–6 tan; trả về số khung và tiến độ trong khung
function phase(C, t) {
  let acc = 0;
  for (let i = 0; i < C.timing.length; i++) { if (t < acc + C.timing[i]) return [i, (t - acc) / C.timing[i]]; acc += C.timing[i]; }
  return [C.timing.length, 1];
}

function canvasFor(w, h) {
  if (!cv) { cv = document.createElement('canvas'); glow = document.createElement('canvas'); }
  if (cv.width < w || cv.height < h) { cv.width = Math.max(w, cv.width); cv.height = Math.max(h, cv.height); cx2 = cv.getContext('2d'); }
  cx2 ||= cv.getContext('2d');
  return cx2;
}

// Tô điểm ảnh của một lưỡi vào buffer: inside(px, py) trả về [độ sâu 0..1, u dọc lưỡi] hoặc null; streak(px, py) cho tia
function raster(img, W, H, x0, y0, test, pal, dis, cool) {
  const d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const wx = x0 + x, wy = y0 + y;
    if (dis && BAYER[(wy & 3) * 4 + (wx & 3)] < dis) continue;
    const r = test(wx + 0.5, wy + 0.5);
    if (!r) continue;
    let tone = r[0] < 0.22 ? 0 : r[0] < 0.5 ? 1 : r[0] < 0.8 ? 2 : 3;
    if (r[1] < cool && tone < 3) tone++;   // đuôi nguội đi một tông
    if (r[2]) tone = 1 + (tone > 2);        // tia: tông sáng hoặc màu gốc, không sẫm
    const c = pal[tone], i = (y * W + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
}

function drawOne(ctx, f, C) {
  let [fr, sub] = phase(C, f.t);
  if (f.spin) {   // vùng xoay: sáng suốt thời gian vùng còn, 0,18 giây cuối mới tan
    const left = f.life - f.t, tail3 = C.timing.slice(4).reduce((a, b) => a + b, 0);
    if (left > tail3) { fr = 3; sub = 0; } else { [fr, sub] = phase(C, C.timing.slice(0, 4).reduce((a, b) => a + b, 0) + (tail3 - left)); }
  }
  if (fr >= C.timing.length) return;
  const pal = paletteOf(C, f.color, f.pal), W = Math.max(2, f.w);
  // tiến độ đầu và đuôi lưỡi: khung 0 chỉ lóe, khung 1–2 đầu lao tới, khung 3 đủ, khung 4–6 đuôi thu dần
  let head, tail;
  if (f.spin) { head = 1; tail = 0; }
  else if (fr === 0) { head = 0.04; tail = 0; }
  else if (fr <= 2) { const k = (fr - 1 + sub) / 2; head = 1 - (1 - k) ** 2; tail = 0; }
  else { head = 1; tail = fr <= 3 ? 0 : Math.min(0.55, ((fr - 4) + sub) / 3 * 0.55); }
  const dis = fr >= 4 ? (fr - 3) * 4 : 0;   // dither Bayer 25/50/75%
  const ox = f.on ? f.on.x + (f.ox || 0) : f.x, oy = f.on ? f.on.y + (f.oy || 0) : f.y;
  const sq = C.squash, streakL = W * C.streak, tests = [];
  let bx0, by0, bx1, by1;
  if (f.shape === 'line') {
    const ca = Math.cos(f.ang), sa = Math.sin(f.ang), L = f.len, s0 = (f.from || 0) * L, a = s0 + (L - s0) * tail, b = s0 + (L - s0) * head;
    const ex = [[ox + ca * a, oy + sa * a], [ox + ca * b, oy + sa * b]];
    bx0 = Math.min(ex[0][0], ex[1][0]) - W - streakL; bx1 = Math.max(ex[0][0], ex[1][0]) + W + streakL;
    by0 = Math.min(ex[0][1], ex[1][1]) - W - streakL; by1 = Math.max(ex[0][1], ex[1][1]) + W + streakL;
    tests.push((px, py) => {
      const dx = px - ox, dy = py - oy, al = dx * ca + dy * sa, pe = -dx * sa + dy * ca;
      if (al >= a && al <= b) {
        const u = (al - a) / Math.max(1, b - a), w = W * prof(u);
        if (pe <= w && pe >= -w * 0.35) return [(pe + w * 0.35) / Math.max(0.6, w * 1.35), u];   // mép cắt sáng ở phía mảnh
      } else if (al < a && al > a - streakL && Math.abs(pe) < W * 0.6) {   // tia kéo sau đuôi, cách hàng
        const row = Math.round(pe);
        if (row % 2 === 0 && hash(row + f.seed) > 0.3 && a - al < streakL * (0.4 + hash(row * 3 + f.seed))) return [0.6, 0, 1];
      }
      return null;
    });
  } else {
    const R = f.r, rOut = R + W * 0.3, rIn = R - W - streakL;
    bx0 = ox - rOut - 1; bx1 = ox + rOut + 1; by0 = oy - rOut * sq - 1; by1 = oy + rOut * sq + 1;
    const blades = f.spin ? [0, Math.PI] : [0];
    for (const off of blades) {
      const a0 = f.spin ? f.t * f.spin + off : f.a0, span = f.spin ? f.span : f.a1 - f.a0, dir = Math.sign(span) || 1, len = Math.abs(span);
      tests.push((px, py) => {
        const dx = px - ox, dy = (py - oy) / sq, rr = dx * dx + dy * dy;
        if (rr > rOut * rOut || rr < rIn * rIn) return null;
        let th = (Math.atan2(dy, dx) - a0) * dir;
        th = ((th % TAU) + TAU) % TAU;
        if (th > len) return null;
        const g = th / len;
        if (g < tail || g > head) return null;
        const u = (g - tail) / Math.max(0.02, head - tail), w = W * prof(u), r = Math.sqrt(rr), outer = R + w * 0.25;
        if (r <= outer && r >= R - w) return [(outer - r) / Math.max(0.6, outer - (R - w)), u];
        if (u < 0.75 && r < R - w && r > R - w - streakL) {   // vài tia mảnh bong ra mặt trong phía đuôi, cách hàng, dài ngắn khác nhau
          const col = Math.floor(th * R / 1.6), hc = hash(col + f.seed);
          if (col % 4 === 0 && hc > 0.35 && R - w - r < streakL * (0.3 + 0.7 * hash(col * 3 + f.seed)) * (1 - u)) return [0.6, u, 1];
        }
        return null;
      });
    }
  }
  const x0 = Math.floor(bx0), y0 = Math.floor(by0), w2 = Math.ceil(bx1) - x0, h2 = Math.ceil(by1) - y0;
  if (w2 <= 0 || h2 <= 0 || w2 > 400 || h2 > 400) return;
  const c = canvasFor(w2, h2);
  if (!imgBuf || imgBuf.width !== w2 || imgBuf.height !== h2) imgBuf = c.createImageData(w2, h2); else imgBuf.data.fill(0);
  const img = imgBuf;
  for (const test of tests) raster(img, w2, h2, x0, y0, test, pal, dis, fr <= 3 ? C.cool : C.cool * 1.6);
  if (fr === 0 || (fr <= 2 && !f.spin)) {   // lóe báo trước / tia ở đầu lưỡi lúc vút: chữ thập 4 cánh điểm ảnh
    let sx, sy;
    if (f.shape === 'line') { const s0 = (f.from || 0) * f.len, b = s0 + (f.len - s0) * head; sx = ox + Math.cos(f.ang) * b; sy = oy + Math.sin(f.ang) * b; }
    else { const g = f.a0 + (f.a1 - f.a0) * head; sx = ox + Math.cos(g) * (f.r - W * 0.2); sy = oy + Math.sin(g) * (f.r - W * 0.2) * sq; }
    const n = fr === 0 ? 2 + Math.round(sub * 2) : 2, cxp = Math.round(sx) - x0, cyp = Math.round(sy) - y0;
    for (let i = -n; i <= n; i++) for (const [px, py] of [[cxp + i, cyp], [cxp, cyp + i]]) {
      if (px < 0 || py < 0 || px >= w2 || py >= h2) continue;
      const k = (py * w2 + px) * 4, tc = Math.abs(i) <= 1 ? [255, 255, 255] : pal[0];
      img.data[k] = tc[0]; img.data[k + 1] = tc[1]; img.data[k + 2] = tc[2]; img.data[k + 3] = 255;
    }
  }
  c.clearRect(0, 0, w2, h2);
  c.putImageData(img, 0, 0);
  // quầng mềm dưới hình: thu nhỏ 1/3 rồi phóng lại có làm mịn (mờ), cộng sáng; khung đỉnh sáng nhất
  const gw = Math.max(1, Math.ceil(w2 / 3)), gh = Math.max(1, Math.ceil(h2 / 3));
  if (glow.width < gw || glow.height < gh) { glow.width = Math.max(gw, glow.width); glow.height = Math.max(gh, glow.height); gx = null; }
  gx ||= glow.getContext('2d');
  gx.clearRect(0, 0, gw + 1, gh + 1); gx.imageSmoothingEnabled = true; gx.drawImage(cv, 0, 0, w2, h2, 0, 0, gw, gh);
  const ga = C.glow * (fr === 3 ? 1.25 : fr >= 4 ? 1 - (fr - 3) * 0.25 : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = ga; ctx.imageSmoothingEnabled = true;
  ctx.drawImage(glow, 0, 0, gw, gh, x0 - 3, y0 - 3, w2 + 6, h2 + 6);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cv, 0, 0, w2, h2, x0, y0, w2, h2);
  ctx.restore();
}

export function drawSlashes(ctx, game) {
  const C = game.data.config.slash;
  if (!C) return;
  for (const f of game.fx) if (f.type === 'slash') drawOne(ctx, f, C);
}
