// Hiệu ứng thời trang Huyết Nguyệt (chủ dự án 04/11/2026 23:26, data/fashion.json → huyet-nguyet.look):
// - vệt chém kiếm khí (look.trail.style 'kiem'): to, xa, viền đỏ, lõi sáng như đèn; vùng sáng vẽ mịn (không điểm ảnh) bằng nét
//   khử răng cưa, quầng mờ (shadowBlur) và cộng sáng ('lighter'). Mỗi đòn một đường: chém 1 chéo xuống phía phải, chém 2 quét
//   ngược lên về sau lưng, đâm: tia thẳng ra trước. Không bao giờ hướng ra màn hình (chỉ trái / phải theo dir).
// - hào quang máu (look.aura 'huyet'): vòng ấn đỏ dưới chân, lửa máu bốc nhẹ quanh người, đốm máu bay lên. Vừa phải, không phủ kín.
// Tử Linh Ma Yêu (chủ dự án 06/11/2026 20:35) dùng chung: vệt tím (trail.mid: lớp chuyển sáng, trail.kinds: đòn → đường), quầng tử khí (aura 'tu-linh').
// Đơn vị: đơn vị bản đồ (ctx đã có phép biến đổi của màn); x, y: giữa ngực; top: cao thân; dir: 1 phải, -1 trái; k: tiến độ đòn 0 → 1.

const ease = k => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - (1 - k) ** 3);
const clamp = k => Math.max(0, Math.min(1, k));

// Một dải sáng theo các điểm pts ([x, y, độ dày 0–1]), ba lớp: quầng đỏ, thân đỏ tươi, lõi sáng
function ribbon(ctx, pts, w, color, core, a, mid = '#ff7a7a') {
  if (pts.length < 2 || a <= 0.01) return;
  // mỗi lớp là một hình liền (hai mép lệch theo pháp tuyến, dày theo t) tô một lần: không chồng sáng ở chỗ nối (lõi không lốm đốm)
  const seg = (lw, style, alpha, blur, add) => {
    const L = [], R = [];
    for (let i = 0; i < pts.length; i++) {
      const [x, y, t] = pts[i], [ax, ay] = pts[Math.max(0, i - 1)], [bx, by] = pts[Math.min(pts.length - 1, i + 1)];
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, h = Math.max(0.1, lw * t / 2);
      L.push([x - dy / l * h, y + dx / l * h]); R.push([x + dy / l * h, y - dx / l * h]);
    }
    ctx.globalCompositeOperation = add ? 'lighter' : 'source-over';
    ctx.fillStyle = style; ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.globalAlpha = alpha * a;
    ctx.beginPath(); ctx.moveTo(L[0][0], L[0][1]);
    for (const [x, y] of L.slice(1)) ctx.lineTo(x, y);
    for (const [x, y] of R.reverse()) ctx.lineTo(x, y);
    ctx.closePath(); ctx.fill();
  };
  const d = Math.abs(ctx.getTransform().d) || 1;
  seg(w * 1.9, color, 0.35, 14 * d, false);   // quầng đỏ rộng
  seg(w, color, 0.9, 6 * d, false);            // thân vệt đỏ
  seg(w * 0.55, mid, 0.8, 0, true);            // chuyển sáng
  seg(w * 0.28, core, 1, 4 * d, true);         // lõi sáng như đèn
}

// Cung tròn: tâm (cx, cy), bán kính r, quét từ góc a0 tới a1; đầu vệt ở head (0–1), đuôi dài span
function arcPts(cx, cy, r, a0, a1, head, span, dir) {
  const out = [], n = 22, h = clamp(head), s = clamp(head - span);
  for (let i = 0; i <= n; i++) {
    const u = s + (h - s) * i / n, a = a0 + (a1 - a0) * u, taper = Math.sin(Math.PI * Math.min(1, (u - s) / Math.max(0.001, h - s)) * 0.5 + 0.0001);
    out.push([cx + dir * Math.cos(a) * r, cy + Math.sin(a) * r * 0.85, taper]);
  }
  return out;
}

export function drawKiemTrail(ctx, tr, kind, k, x, y, dir, top) {
  const color = tr.color || '#ff1a2e', core = tr.core || '#fff4ee', mid = tr.mid, W = tr.w || 5, Z = tr.size || 1;   // w: độ dày, size: nhân bán kính, tầm (data/fashion.json)
  const go = ease((k - 0.18) / 0.42), fade = k < 0.62 ? 1 : clamp(1 - (k - 0.62) / 0.38);   // vung nhanh, sáng lưu lâu
  if (go <= 0) return;
  ctx.save(); ctx.lineCap = 'round';
  if (kind === 0) {   // chém 1: từ trên đầu phía sau chéo xuống trước mặt bên phải, xa
    const R = top * 1.25 * Z;
    ribbon(ctx, arcPts(x - dir * 2, y + 2, R, -1.75, 0.75, go, 0.75, dir), W, color, core, fade, mid);
  } else if (kind === 1) {   // chém 2: từ dưới trước mặt quét ngược lên, vòng ra sau lưng
    const R = top * 1.2 * Z;
    ribbon(ctx, arcPts(x, y + 3, R, 0.85, -2.6, go, 0.7, dir), W, color, core, fade, mid);
  } else {   // đâm: tia thẳng ra trước ngang hông, đầu nhọn, chớp sáng ở mũi
    const y0 = y + top * 0.2, len = top * 2.4 * Z * go, x0 = x + dir * top * 0.35, pts = [];
    for (let i = 0; i <= 12; i++) { const u = i / 12; pts.push([x0 + dir * len * u, y0, 0.25 + 0.75 * Math.sin(Math.PI * Math.min(0.999, u * 0.92 + 0.04))]); }
    ribbon(ctx, pts, W * 0.9, color, core, fade, mid);
    const tx = x0 + dir * len, g = ctx.createRadialGradient(tx, y0, 0, tx, y0, 7 * Z);
    g.addColorStop(0, core); g.addColorStop(0.35, color); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 0; ctx.globalAlpha = fade * 0.8 * go;
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(tx, y0, 7 * Z, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

// Bảng màu hào quang: huyet (máu đỏ, Huyết Nguyệt), tu-linh (tử khí tím, ma trơi, Tử Linh Ma Yêu)
export const AURA = {
  huyet: { g0: 'rgba(255,40,60,0.38)', g1: 'rgba(200,10,30,0.16)', g2: 'rgba(120,0,20,0)', ring: '#ff2a3a', glow: '#ff1a2e', f0: 'rgba(255,90,90,0.55)', f1: 'rgba(200,0,24,0)', d: ['#c8102a', '#ff3a4a'] },
  'tu-linh': { g0: 'rgba(170,90,255,0.34)', g1: 'rgba(110,40,200,0.14)', g2: 'rgba(60,10,120,0)', ring: '#b070ff', glow: '#9a50ff', f0: 'rgba(200,150,255,0.5)', f1: 'rgba(90,20,180,0)', d: ['#8a4ad8', '#d8b0ff'] },
};

// Hào quang: back = true vẽ sau lưng (vòng ấn, lửa), false vẽ trước (vài đốm bay). fx, fy: chân. kind: khoá trong AURA
export function drawBloodAura(ctx, fx, fy, top, t, back, riding, kind = 'huyet') {
  const C = AURA[kind] || AURA.huyet;
  ctx.save();
  if (back) {
    if (!riding) {   // vòng ấn dưới chân (cưỡi thú thì bỏ, khỏi đè lên lưng thú)
      const p = 0.5 + 0.5 * Math.sin(t * 2.2), g = ctx.createRadialGradient(0, 0, 0, 0, 0, 16);   // vẽ trong hệ đã dời về chân, nén dẹt
      g.addColorStop(0, C.g0); g.addColorStop(0.7, C.g1); g.addColorStop(1, C.g2);
      ctx.save(); ctx.translate(fx, fy); ctx.scale(1, 0.32);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.ring; ctx.shadowColor = C.glow; ctx.shadowBlur = 6 * (Math.abs(ctx.getTransform().d) || 1);
      for (let i = 0; i < 1; i++) {   // một vòng ấn (chủ dự án 05/11/2026 00:37: nhiều vòng quá, bỏ vòng trắng ngoài cùng)
        ctx.globalAlpha = 0.25 + 0.2 * p - i * 0.08; ctx.lineWidth = 0.7;
        ctx.beginPath(); ctx.ellipse(fx, fy, 11 + i * 4 + p, (11 + i * 4 + p) * 0.3, 0, t * (i ? -0.6 : 0.8), t * (i ? -0.6 : 0.8) + Math.PI * 1.6); ctx.stroke();
      }
    }
    ctx.globalCompositeOperation = 'lighter'; ctx.shadowBlur = 0;
    for (let i = 0; i < 5; i++) {   // lửa máu bốc nhẹ quanh người
      const ph = (t * 0.45 + i / 5) % 1, side = i % 2 ? 1 : -1;
      const px = fx + side * (5 + (i * 3) % 7) + Math.sin(t * 2 + i * 1.7) * 1.5, py = fy - 2 - ph * top * 0.95, r = 2.6 * (1 - ph) + 0.6;
      const g = ctx.createRadialGradient(px, py, 0, px, py, r * 1.8);
      g.addColorStop(0, C.f0); g.addColorStop(1, C.f1);
      ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.7; ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(px, py, r, r * 1.7, 0, 0, Math.PI * 2); ctx.fill();
    }
  } else {
    for (let i = 0; i < 4; i++) {   // đốm máu nhỏ bay lên trước mặt
      const ph = (t * 0.35 + i / 4 + 0.13) % 1, px = fx + Math.sin(i * 2.3 + t * 0.9) * 10, py = fy - 4 - ph * top * 1.1;
      ctx.globalAlpha = Math.sin(Math.PI * ph) * 0.8; ctx.fillStyle = C.d[i % 2];
      ctx.fillRect(Math.round(px), Math.round(py), 1, 1);
    }
  }
  ctx.restore();
}
