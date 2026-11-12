// Danh sách hình hiệu ứng chiêu dựng từ PixelFX (tools/art/pfx/export.mjs). Mỗi dòng: tên hình → cách dựng.
//   fx: mã hiệu ứng PixelFX ('fire/fireball') hoặc hiệu ứng riêng của game ('p2d/<tên>' = tools/art/pfx/fx/<tên>.js)
//   pal: bảng màu PAL của PixelFX hoặc mảng màu tối → sáng; opts: tuỳ chọn riêng của hiệu ứng; seed
//   t: [từ, tới] giây lấy khung; fps: số khung mỗi giây (ước của 120); times: [giây...] tự chọn từng khung (dày lúc nổ, thưa lúc tàn), end: giây kết thúc
//   dirs: số góc dựng sẵn từ 0 tới 90 độ (đạn bay: 5 góc = 16 hướng); box: [x0, y0, x1, y1] khung cắt quanh điểm neo
//   k: đơn vị bản đồ mỗi điểm ảnh (mặc định 0,5 = đúng lưới 2 điểm khung vẽ mỗi đơn vị trên điện thoại); ls: thu nhỏ lớp sáng (mặc định 2 với hình lớn)
const NO = [0.017, 0.05, 0.083, 0.117, 0.15, 0.2, 0.25, 0.3, 0.367, 0.433, 0.5, 0.583, 0.667, 0.767];   // nổ: dày lúc chớp, thưa lúc tàn
const no = (pal, kind, size = 1, seed = 3) => ({ fx: 'p2d/no', pal, opts: { kind, size }, seed, times: NO, end: 0.88 });
const KIEM = ['#0a1a3a', '#12357a', '#1f62c8', '#3f9cff', '#7fd8ff', '#c8f4ff', '#ffffff'], TIM = ['#140a26', '#2b1252', '#5a24a8', '#8a48e8', '#b89af0', '#e4d0ff', '#ffffff'];

export const SPRITES = {
  // ---- đạn (hình có hướng: 5 góc dựng sẵn)
  'kiem-khi': { fx: 'p2d/kiem-khi', pal: KIEM, fps: 20, dirs: 5 },
  'hoa-cau': { fx: 'fire/fireball', pal: 'fire', opts: { radius: 5.5 }, dirs: 5, fps: 10, box: [-58, -26, 18, 26], edge: 12 },
  'bang-truy': { fx: 'ice/ice-lance', pal: 'ice', opts: { length: 30 }, dirs: 5, fps: 15, box: [-58, -18, 24, 18], edge: 10 },
  'cham': { fx: 'p2d/cham', pal: 'leaf', fps: 20, dirs: 5 },
  'phi-kiem': { fx: 'p2d/phi-kiem', pal: 'gold', fps: 20, dirs: 5 },
  'am-ba': { fx: 'p2d/am-ba', pal: 'arcane', fps: 20, dirs: 5 },
  'da': { fx: 'p2d/da', pal: 'earth', fps: 20, dirs: 5 },
  'ten': { fx: 'projectiles/arrow', pal: 'gold', fps: 20, dirs: 5 },
  'hoa-long': { fx: 'p2d/long', pal: 'fire', opts: { kind: 'lua' }, fps: 20, dirs: 5 },
  'luc-dang-long': { fx: 'p2d/long', pal: 'leaf', opts: { kind: 'moc' }, fps: 20, dirs: 5 },
  'thuy-long': { fx: 'p2d/long', pal: 'water', opts: { kind: 'thuy', len: 46, girth: 3.6 }, fps: 20, dirs: 5 },
  // ---- đạn xoay tròn (không cần hướng)
  'nguyet-liem': { fx: 'p2d/nguyet-liem', pal: TIM, fps: 20 },
  'kim-luan': { fx: 'p2d/kim-luan', pal: 'gold', fps: 20 },
  // ---- trúng đòn / nổ theo hệ
  'no-lua': no('fire', 'lua'), 'no-lua-to': no('fire', 'lua', 2.2, 5),
  'no-bang': no('ice', 'bang'), 'no-da': no('earth', 'da', 1.6), 'no-la': no('leaf', 'la'), 'no-nuoc': no('water', 'nuoc'),
  'no-kim': no('gold', 'kim'), 'no-kiem': no(KIEM, 'kim', 1, 8), 'no-am': no('arcane', 'am'),
};
