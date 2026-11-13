import { hex } from "../../core/index.js";
import { PAL, GRIDS } from "./_ck-grids.js";

export const meta = {
  name: "Biểu tượng chiêu khảm (ô 18 điểm)",
  desc: "19 biểu tượng chiêu khảm của hệ Pháp Bảo, mỗi cái một ô 18 × 18 điểm, nét điểm ảnh có viền: hệ (ngọn lửa, cụm băng, chiếc lá, đoản kiếm vàng, gai đá), hình (ba mảnh tỏa nhánh, hai mũi nối đuôi, nổ lan, mũi xuyên tấm thép, đường nảy, ba cầu xoay, đường cong đuổi hồng tâm), kích (tia sét, khiên dội đòn, đầu lâu nổ, sao chí mạng kép), hộ (giọt máu, đồng hồ có vệt gió, giọt linh lực có mũi tên xuống). kind: mã chiêu khảm.",
  tags: ["p2d", "icon", "loop"],
  size: [18, 18],
  origin: [9, 9],
  duration: 0.4,
  loop: true,
  fps: 10,
  bg: "dark",
  options: { kind: "hoa" },
};
const COL = Object.fromEntries(Object.entries(PAL).map(([k, v]) => [k, hex(v)]));
const N = 18, TAU = Math.PI * 2, C0 = 8.5;
const blank = () => Array.from({ length: N }, () => Array(N).fill("."));
const set = (g, x, y, ch) => { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = ch; };
const line = (g, x0, y0, x1, y1, ch) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1; for (let i = 0; i <= n; i++) set(g, x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, ch); };
// viền tự động: ô trống kề ô có màu (4 phía) thì tô màu viền
function outline(g, ch) {
  const o = g.map((r) => r.slice());
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) if (g[y][x] === "." && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => (g[y + dy]?.[x + dx] ?? ".") !== ".")) o[y][x] = ch;
  return o;
}

// hình hình học dựng bằng lệnh (toạ độ ô 0..17)
const MAKE = {
  "danh-lan"() {   // nổ lan: sao nổ ở giữa, bốn cung sóng nổ ở bốn góc
    const g = blank();
    for (let a = 0; a < TAU; a += 0.02) { const d = Math.abs((a % (Math.PI / 2)) - Math.PI / 4); if (d < 0.5) set(g, C0 + Math.cos(a) * 7.7, C0 + Math.sin(a) * 7.7, d < 0.24 ? "B" : "b"); }
    for (let i = 1; i <= 5; i++) { const c = i <= 2 ? "W" : i <= 4 ? "C" : "B"; for (const k of [8, 9]) { set(g, k, 8 - i, c); set(g, k, 9 + i, c); set(g, 8 - i, k, c); set(g, 9 + i, k, c); } }
    for (let i = 1; i <= 2; i++) { const c = i === 1 ? "C" : "B"; set(g, 8 - i, 8 - i, c); set(g, 9 + i, 8 - i, c); set(g, 8 - i, 9 + i, c); set(g, 9 + i, 9 + i, c); }
    for (const k of [8, 9]) for (const j of [8, 9]) set(g, k, j, "W");
    return outline(g, "n");
  },
  "cau-xoay"() {   // cầu xoay: ba viên châu trên một quỹ đạo, mỗi viên kéo một vệt
    const g = blank(), R = 6;
    for (let a = 0; a < TAU; a += 0.05) { const x = Math.round(C0 + Math.cos(a) * R), y = Math.round(C0 + Math.sin(a) * R); if ((x + y) % 2 === 0) set(g, x, y, "b"); }
    for (const a0 of [-Math.PI / 2, Math.PI / 6, (Math.PI * 5) / 6]) {
      for (let t = 0.3; t < 1.15; t += 0.04) set(g, C0 + Math.cos(a0 - t) * R, C0 + Math.sin(a0 - t) * R, t < 0.7 ? "B" : "b");
      const ox = Math.round(C0 + Math.cos(a0) * R - 0.5), oy = Math.round(C0 + Math.sin(a0) * R - 0.5);
      for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) set(g, ox + dx, oy + dy, dx && dy ? "B" : dx || dy ? "C" : "W");
      set(g, ox - 1, oy - 1, "C");
    }
    set(g, 8, 8, "W"); set(g, 9, 8, "c"); set(g, 8, 9, "c"); set(g, 9, 9, "B");
    return outline(g, "n");
  },
  "nay-bat"() {   // nảy bật: đường đi gấp khúc qua hai chỗ chạm, mũi tên ở cuối
    const g = blank(), pts = [[1, 4], [5, 13], [10, 4], [15, 12]];
    for (let i = 0; i < 3; i++) { const [x0, y0] = pts[i], [x1, y1] = pts[i + 1]; line(g, x0, y0 + 1, x1, y1 + 1, i < 2 ? "b" : "B"); line(g, x0, y0, x1, y1, i === 0 ? "B" : i === 1 ? "C" : "W"); }
    for (const [x, y] of [[15, 9], [15, 10], [15, 11], [12, 12], [13, 12], [14, 12], [16, 13]]) set(g, x, y, "W");
    for (const [x, y] of [[3, 15], [5, 16], [7, 15], [8, 2], [10, 1], [12, 2]]) set(g, x, y, "E");
    return outline(g, "n");
  },
  "truy-kich"() {   // truy kích: đường bay cong vòng lên đuổi theo hồng tâm
    const g = blank(), tx = 13, ty = 5, P0 = [1, 7], P1 = [2, 18], P2 = [8, 10];
    for (let a = 0; a < TAU; a += 0.05) set(g, tx + Math.cos(a) * 3, ty + Math.sin(a) * 3, "E");
    for (const [x, y] of [[tx, ty - 4], [tx, ty - 5], [tx, ty + 4], [tx, ty + 5], [tx - 4, ty], [tx - 5, ty], [tx + 4, ty]]) set(g, x, y, "E");
    set(g, tx, ty, "i"); set(g, tx - 1, ty, "R"); set(g, tx + 1, ty, "R"); set(g, tx, ty - 1, "R"); set(g, tx, ty + 1, "R");
    for (let t = 0; t <= 1; t += 0.02) { const u = 1 - t, x = u * u * P0[0] + 2 * t * u * P1[0] + t * t * P2[0], y = u * u * P0[1] + 2 * t * u * P1[1] + t * t * P2[1]; set(g, x, y + 1, "b"); }
    for (let t = 0; t <= 1; t += 0.02) { const u = 1 - t, x = u * u * P0[0] + 2 * t * u * P1[0] + t * t * P2[0], y = u * u * P0[1] + 2 * t * u * P1[1] + t * t * P2[1]; set(g, x, y, t < 0.3 ? "b" : t < 0.65 ? "B" : "C"); }
    for (const [x, y] of [[7, 9], [8, 9], [9, 9], [9, 10], [9, 11]]) set(g, x, y, "W");
    return outline(g, "n");
  },
  "bao-kich"() {   // bạo kích liên hoàn: sao chí mạng tám cánh, kèm hai sao nhỏ (đòn thêm)
    const g = blank(), cx = 7, cy = 8;
    const ray = (dx, dy, len) => { for (let i = 1; i <= len; i++) { set(g, cx + dx * i, cy + dy * i, i <= 1 ? "Y" : i <= 3 ? "y" : i <= 5 ? "o" : "R"); if (i <= 3) for (const s of [-1, 1]) set(g, cx + dx * i + dy * s, cy + dy * i + dx * s, i <= 1 ? "y" : i <= 2 ? "o" : "R"); } };
    ray(0, -1, 7); ray(0, 1, 7); ray(-1, 0, 6); ray(1, 0, 6);
    for (let i = 1; i <= 3; i++) for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) set(g, cx + sx * i, cy + sy * i, i === 1 ? "y" : i === 2 ? "o" : "R");
    set(g, cx, cy, "W"); set(g, cx - 1, cy, "Y"); set(g, cx + 1, cy, "Y"); set(g, cx, cy - 1, "Y"); set(g, cx, cy + 1, "Y");
    for (const [sx, sy, n] of [[14, 3, 2], [14, 13, 1]]) { for (let i = 1; i <= n; i++) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) set(g, sx + dx * i, sy + dy * i, i === 1 ? "Y" : "y"); set(g, sx, sy, "W"); }
    return outline(g, "r");
  },
};

const cache = new Map();
function gridOf(kind) {
  if (!cache.has(kind)) {
    const g = MAKE[kind] ? MAKE[kind]() : GRIDS[kind]?.map((r) => [...r]);
    if (!g) throw new Error("icon-ck: không có chiêu khảm " + kind);
    if (g.length !== N || g.some((r) => r.length !== N)) throw new Error(`icon-ck ${kind}: lưới phải đúng ${N} × ${N} (dòng ${g.findIndex((r) => r.length !== N) + 1} dài ${g.find((r) => r.length !== N)?.length})`);
    cache.set(kind, g);
  }
  return cache.get(kind);
}

export function draw(p, t, o) {
  const g = gridOf(o.kind);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const ch = g[y][x];
    if (ch === ".") continue;
    if (!COL[ch]) throw new Error(`icon-ck ${o.kind}: ký tự '${ch}' chưa có màu`);
    p.px(x - 9, y - 9, COL[ch]);
  }
}
