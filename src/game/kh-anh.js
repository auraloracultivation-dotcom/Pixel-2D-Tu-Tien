// Kiểm ảnh công trình trước khi gửi (data/khai-hoang.json → anh; máy chủ kiểm lại loại file, cỡ, quyền: p2d_kh_anh_gui).
// Chỉ PNG / WebP, không quá anh.mb MB, cạnh không quá anh.px; nền phải trong suốt thật: bốn góc và viền ngoài trong suốt,
// ít nhất anh.min_trong phần ảnh trong suốt; bắt nền ô ca-rô giả (ảnh đục hoàn toàn mà viền là hai màu xám / trắng xen kẽ).
// Trả null nếu ảnh đạt, hoặc mã lỗi: bad_type, bad_size, bad_px, bad_alpha, bad_checker, bad_read.

export async function checkImage(file, A) {
  if (!file || !['image/png', 'image/webp'].includes(file.type)) return 'bad_type';
  if (file.size > A.mb * 1048576) return 'bad_size';
  let bmp;
  try { bmp = await createImageBitmap(file); } catch { return 'bad_read'; }
  const w = bmp.width, h = bmp.height;
  if (w > A.px || h > A.px) return 'bad_px';
  if (w < 8 || h < 8) return 'bad_read';
  const k = Math.min(1, 512 / Math.max(w, h)), cw = Math.max(8, Math.round(w * k)), ch = Math.max(8, Math.round(h * k));   // đọc bản thu nhỏ cho nhanh
  const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bmp, 0, 0, cw, ch);
  const d = ctx.getImageData(0, 0, cw, ch).data, a = (x, y) => d[(y * cw + x) * 4 + 3];
  let clear = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 16) clear++;
  const border = [];
  for (let x = 0; x < cw; x++) border.push([x, 0], [x, ch - 1]);
  for (let y = 1; y < ch - 1; y++) border.push([0, y], [cw - 1, y]);
  const borderClear = border.filter(([x, y]) => a(x, y) < 16).length / border.length;
  const corners = [[0, 0], [cw - 1, 0], [0, ch - 1], [cw - 1, ch - 1]].every(([x, y]) => a(x, y) < 16);
  if (corners && borderClear >= 0.9 && clear / (cw * ch) >= A.min_trong) return null;
  // ảnh đục: xem viền có phải ô ca-rô (hai tông sáng xen kẽ) không để báo đúng lỗi
  if (clear === 0) {
    const lum = ([x, y]) => { const i = (y * cw + x) * 4; return Math.round((d[i] + d[i + 1] + d[i + 2]) / 3 / 16); };
    const tones = new Map();
    for (const p of border) { const l = lum(p); tones.set(l, (tones.get(l) || 0) + 1); }
    const top = [...tones.values()].sort((x, y) => y - x);
    if (top.length >= 2 && (top[0] + top[1]) / border.length > 0.85 && top[1] / border.length > 0.25) return 'bad_checker';
  }
  return 'bad_alpha';
}
