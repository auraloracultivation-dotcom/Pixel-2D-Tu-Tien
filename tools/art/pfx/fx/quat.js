import { fit, clamp, smooth, ease, TAU, WHITE, hex } from "../../core/index.js";

export const meta = {
  name: "Bảo phiến (quạt báu phẩy một nhát)",
  desc: "Chiếc quạt xếp bật mở rồi phẩy một nhát ngang qua hướng đánh (hướng đánh = sang phải): nan gỗ sẫm chụm về chốt vàng, lá quạt lụa ngà gấp nếp sáng tối, vành và hoa văn theo màu linh khí, viền mực; tán quạt kéo theo những vệt gió mờ ở phía vừa lướt qua; phẩy xong quạt tan qua lưới chấm. Tô theo điểm màn hình nên xoay góc nào nét cũng kín.",
  tags: ["p2d", "self", "one-shot", "directional"],
  size: [72, 72],
  origin: [36, 36],
  duration: 0.34,
  loop: false,
  fps: 30,
  bg: "dark",
  options: { palette: ["#0c2038", "#1a4670", "#3478b0", "#62a8dc", "#9cd0f4", "#d4eeff", "#ffffff"], seed: 3 },
};
const IV = ["#6e5f48", "#b8a888", "#e4d8bc", "#fbf6e6"].map(hex), WOOD = ["#1a0d06", "#46280f", "#7a4c22"].map(hex), GOLD = ["#8a5a0c", "#e8b020", "#fff0a8"].map(hex);
const R0 = 8, R1 = 23, SPAN = 0.66, FROM = -1.0, TO = 1.0, RIBS = 8;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

export function draw(p, t, o) {
  const C = fit(o.palette, 7), INK = C[0];
  const open = ease.outBack(clamp(t / 0.07), 1.6), sw = ease.inOutCubic ? ease.inOutCubic(clamp((t - 0.03) / 0.16)) : smooth(0, 1, clamp((t - 0.03) / 0.16));
  const phi = FROM + (TO - FROM) * sw, span = SPAN * (0.12 + 0.88 * open), out = 1 - smooth(0.22, 0.34, t);
  const speed = t > 0.03 && t < 0.19 ? Math.sin(Math.PI * clamp((t - 0.03) / 0.16)) : 0, trail = 0.95 * speed;   // vệt gió dài theo tốc độ phẩy
  p.shade(-R1 - 4, -R1 - 4, R1 + 5, R1 + 5, (x, y, q) => {
    const r = Math.hypot(x, y);
    if (r > R1 + 3) return;
    const d = wrap(Math.atan2(y, x) - phi), ad = Math.abs(d);
    q.a = out;
    if (r < 2.4) { q.c = r < 1.3 ? GOLD[2] : GOLD[1]; return; }   // chốt quạt
    const over = (ad - span) * r;   // điểm ảnh ngoài mép nan cái
    if (over > 1.2) {   // vệt gió sau tán quạt (phía góc nhỏ hơn: quạt đang phẩy theo chiều góc tăng)
      const back = -d - span;
      if (trail > 0.05 && back > 0 && back < trail && r > R0 + 1 && r < R1 + 2.5) {
        const k = 1 - back / trail, band = (r + 0.7) % 3.6;
        if (band < 1.25) { q.c = k > 0.72 ? WHITE : k > 0.4 ? C[5] : C[4]; q.a = out * k * (band < 0.65 ? 1.05 : 0.7); }
      }
      return;
    }
    if (r > R1 + 1) return;
    if (over > 0 || r > R1) { q.c = INK; return; }   // viền mực quanh tán
    if (over > -1.3) { q.c = d < 0 ? WOOD[1] : WOOD[2]; return; }   // hai nan cái ở mép
    if (r < R0) {   // nan chụm về chốt: nan gỗ, khe tối
      const u = (d + span) / (2 * span) * (RIBS - 1), near = Math.abs(u - Math.round(u)) * (2 * span / (RIBS - 1)) * r;
      q.c = near < 0.75 ? WOOD[2] : WOOD[0];
      return;
    }
    // lá quạt: nếp gấp sáng tối xen kẽ, vành ngoài và vành trong theo màu linh khí, hoa văn chấm giữa nếp
    const u = (d + span) / (2 * span) * (RIBS - 1), fold = Math.floor(u), fu = u - fold, lit = fold % 2 === 0;
    if (r > R1 - 2.6) { q.c = r > R1 - 1.2 ? C[5] : C[3]; return; }
    if (r < R0 + 1.6) { q.c = C[2]; return; }
    if (fu < 0.1 || fu > 0.93) { q.c = IV[0]; return; }   // đường gấp
    const rr = r - (R0 + R1) / 2 + 0.5;
    if (Math.abs(rr) < 1.3 && Math.abs(fu - 0.5) * r * (2 * span / (RIBS - 1)) < 1.2) { q.c = lit ? C[3] : C[2]; return; }   // hoa văn
    q.c = lit ? (fu < 0.5 ? IV[3] : IV[2]) : fu < 0.5 ? IV[2] : IV[1];
  });
  // ánh sáng: quầng theo tán quạt, lóe ở mép đang dẫn
  const cx = Math.cos(phi) * 15, cy = Math.sin(phi) * 15;
  p.glow(cx, cy, 20, C[4], 0.3 * out);
  if (speed > 0.2) { const ex = Math.cos(phi + span) * R1, ey = Math.sin(phi + span) * R1; p.glow(ex, ey, 9, WHITE, 0.45 * speed * out); p.glowLine(Math.cos(phi + span) * R0, Math.sin(phi + span) * R0, ex, ey, 5, C[5], 0.4 * speed * out); }
}
