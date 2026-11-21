// Kho canvas tạm có giới hạn bộ nhớ (22/11/2026, người chơi báo trên iPhone: chơi lâu thì chân dung trống, bản đồ nhỏ tối, cả trên
// máy tính). Safari giới hạn TỔNG bộ nhớ canvas của trang (khoảng 224–384 MB); quá mức thì canvas tạo mới trắng trơn. Trước đây bóng
// đổ, chớp trắng, ám đỏ giữ một bản sao NGUYÊN TẤM hình cho mỗi hình × màu suốt phiên chơi (src/render/sprites.js), đi nhiều tinh cầu,
// gặp nhiều quái, nhiều người là cộng dồn hàng trăm MB. Nay giữ trong hạn mức (data/config.json → perf.canvas_mb): vượt thì bỏ bản lâu
// không dùng nhất và trả bộ nhớ ngay (đặt cỡ 0: Safari chỉ trả khi canvas có cỡ 0 hoặc đã bị dọn rác).
export function khoCanvas(mb = 48) {
  const m = new Map();   // khoá → canvas, thứ tự = lần dùng (cuối là mới nhất)
  let bytes = 0, max = mb * 1048576;
  const size = c => c.width * c.height * 4;
  return {
    get(k) { const c = m.get(k); if (c) { m.delete(k); m.set(k, c); } return c; },
    set(k, c) {
      const cu = m.get(k); if (cu) { bytes -= size(cu); m.delete(k); if (cu !== c) traCanvas(cu); }
      m.set(k, c); bytes += size(c);
      for (const [k2, c2] of m) { if (bytes <= max || m.size <= 1) break; bytes -= size(c2); m.delete(k2); traCanvas(c2); }
      return c;
    },
    han(v) { if (v > 0) max = v * 1048576; },
    get bytes() { return bytes; }, get size() { return m.size; },
  };
}

// Trả bộ nhớ của canvas không dùng nữa ngay (không chờ dọn rác)
export function traCanvas(c) { if (c) c.width = c.height = 0; }

// Một canvas nháp dùng lại (đọc điểm ảnh một hình), không tạo mới mỗi lần
let nhap = null;
export function canvasNhap(w, h) {
  nhap ??= document.createElement('canvas');
  if (nhap.width !== w || nhap.height !== h) { nhap.width = w; nhap.height = h; }
  const g = nhap.getContext('2d', { willReadFrequently: true });
  if (g) g.clearRect(0, 0, w, h);
  return [nhap, g];
}
// Canvas nháp vẽ không ăn (Safari cấp bộ nhớ hỏng một lần là hỏng mãi): bỏ, lần sau tạo cái mới
export function boNhap() { traCanvas(nhap); nhap = null; }

// Canvas có điểm nào không trong suốt trong vùng (x, y, w, h) không. Không đọc được điểm ảnh thì coi như có.
export function coHinh(g, x, y, w, h) {
  try {
    const d = g.getImageData(x, y, w, h).data;
    for (let i = 3; i < d.length; i += 4) if (d[i] > 0) return true;
    return false;
  } catch { return true; }
}
