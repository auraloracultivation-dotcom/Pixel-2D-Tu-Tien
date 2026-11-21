// Nền, cây, hoa cỏ SpriteCook cho tinh cầu tông môn (chủ dự án 21/11/2026 11:33: "đồng bộ nền và cây cối nhà cửa tại mấy tinh cầu
// tông môn"). Mỗi mặt đất (data/khai-hoang.json → grounds.<mặt>.nen) dùng bộ nền và hình cây, đá, hoa của tinh cầu cùng loại, cách lắp
// giống tools/the-gioi/tc_nen.py làm cho 9 tinh cầu: ô cây / đá / hoa của lưới giữ nguyên (vẫn chắn như cũ), hình ô cũ ẩn (prop_hide),
// mỗi ô đặt một món SpriteCook cùng chỗ; cây sát cây khác dùng món nhỏ (thua); rải thưa đồ nhỏ trên nền trống (rai), tránh sân, đường,
// bãi quái, vùng công trình. Rút ngẫu nhiên từ cùng hạt giống của bản đồ, sau mọi bước cũ, nên mọi máy ra y hệt và bố cục cũ không đổi.
// Món sinh ra nằm ở def.hoi.them (không vào bảng Bày cảnh); công trình tông môn bày (def.hoi.do, mã cũ -m) vẽ bằng hình SpriteCook theo
// def.hoi.doi = data/khai-hoang.json → doi_sc (src/world/hoi-foot.js).

const chon = (R, ds) => {
  let r = R() * ds.reduce((a, it) => a + it[1], 0);
  for (const it of ds) { r -= it[1]; if (r <= 0) return it; }
  return ds[ds.length - 1];
};
const mon = (R, [id, , lo, hi], x, y) => {
  const o = { s: Math.round((lo + R() * (hi - lo)) * 100) / 100 };
  if (R() < 0.5) o.f = 1;
  return [id, Math.round(x * 100) / 100, Math.round(y * 100) / 100, null, o];
};

// g: lưới (mảng mảng ký tự), R: hàm ngẫu nhiên của bản đồ, cam(x, y): ô không rải đồ
export function khNen(def, N, g, R, cam) {
  if (!N) return;
  def.nen = { ...N.bo, ky: N.ky };
  const cay = N.cay || {}, ky = { nen: '.', ...N.ky }, H = g.length, W = g[0].length;
  def.prop_hide = Object.keys(cay).join('');
  const at = (x, y) => g[y]?.[x] ?? '~', nui = new Set((cay['^'] || []).map(it => it[0]));
  const out = [], cho = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const ch = at(x, y);
    if (!cay[ch]) continue;
    let it = chon(R, cay[ch]);
    const cx = x + 0.5 + (R() - 0.5) * 0.3, cy = y + 0.85;
    const gan = cho.reduce((m, [a, b]) => Math.min(m, Math.hypot(cx - a, cy - b)), 9);
    if (ch !== '^' && N.thua && gan < 1.7) it = chon(R, N.thua);
    else if (!nui.has(it[0])) cho.push([cx, cy]);
    out.push(mon(R, it, cx, cy));
  }
  if (N.rai) {
    const [ds, p] = N.rai, nen = ky.nen;
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      let ok = !cam(x, y);
      for (let dy = -1; ok && dy <= 1; dy++) for (let dx = -1; ok && dx <= 1; dx++) ok = nen.includes(at(x + dx, y + dy));
      if (ok && R() < p) out.push(mon(R, chon(R, ds), x + 0.2 + R() * 0.6, y + 0.6 + R() * 0.35));
    }
  }
  def.hoi.them = out;
}
