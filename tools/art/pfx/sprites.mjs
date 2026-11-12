// Danh sách hình hiệu ứng chiêu dựng từ PixelFX (tools/art/pfx/export.mjs). Mỗi dòng: tên hình → cách dựng.
//   fx: mã hiệu ứng PixelFX ('fire/fireball') hoặc hiệu ứng riêng của game ('p2d/<tên>' = tools/art/pfx/fx/<tên>.js)
//   pal: bảng màu PAL của PixelFX hoặc mảng màu tối → sáng; opts: tuỳ chọn riêng của hiệu ứng; seed
//   t: [từ, tới] giây lấy khung; fps: số khung mỗi giây (ước của 120); times: [giây...] tự chọn từng khung (dày lúc nổ, thưa lúc tàn), end: giây kết thúc
//   dirs: số góc dựng sẵn từ 0 tới 90 độ (đạn bay: 5 góc = 16 hướng); box: [x0, y0, x1, y1] khung cắt quanh điểm neo
//   k: đơn vị bản đồ mỗi điểm ảnh (mặc định 0,5 = đúng lưới 2 điểm khung vẽ mỗi đơn vị trên điện thoại); ls: thu nhỏ lớp sáng (mặc định 2 với hình lớn)
const NO = [0.017, 0.05, 0.083, 0.117, 0.15, 0.2, 0.25, 0.3, 0.367, 0.433, 0.5, 0.583, 0.667, 0.767];   // nổ: dày lúc chớp, thưa lúc tàn
const no = (pal, kind, size = 1, seed = 3) => ({ fx: 'p2d/no', pal, opts: { kind, size }, seed, times: NO, end: 0.88 });
// chiêu vùng: 30 khung/giây trong `dense` giây đầu (lúc nổ), sau đó `rest` khung/giây tới hết
const seq = (end, dense = 0.27, rest = 10) => { const t = []; for (let x = 1 / 60; x < dense; x += 1 / 30) t.push(+x.toFixed(3)); for (let x = dense + 0.5 / rest; x < end - 0.02; x += 1 / rest) t.push(+x.toFixed(3)); return t; };
// một chiêu vùng = hai hình: '<tên>-d' lớp đất (dưới chân người, quái) và '<tên>' lớp nổi (đè lên trên)
const aoe = (name, fx, pal, end, opts = {}, extra = {}) => ({ [name + '-d']: { fx, pal, opts, layer: 'back', times: seq(end, 0.3, 8), end, ...extra }, [name]: { fx, pal, opts, layer: 'front', times: seq(end), end, ...extra } });
// vùng kéo dài / hình bọc người lặp lại: hai lớp '<tên>-d' (đất) và '<tên>' (nổi), 10 khung/giây
const loop2 = (name, fx, pal, opts = {}, fps = 10) => ({ [name + '-d']: { fx, pal, opts, layer: 'back', fps }, [name]: { fx, pal, opts, layer: 'front', fps } });
const tran = (pal, motif) => ({ fx: 'p2d/tran', pal, opts: { motif, radius: 30 }, times: seq(0.9, 0.2, 10), end: 0.9 });
const THO = ['#2a1c08', '#5a3e10', '#8e6638', '#b88a52', '#dcb47c', '#f0d8a0', '#fff4d8', '#ffffff'];
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
  // ---- chiêu diện rộng (nhìn từ trên xuống, reach = bán kính chiêu × 2 điểm ảnh)
  ...aoe('bang-phong', 'p2d/bang-phong', 'ice', 1.75, { reach: 88 }),
  ...aoe('liet-diem', 'p2d/liet-diem', 'fire', 1.5, { reach: 76 }),
  ...aoe('hoa-hon', 'p2d/liet-diem', 'fire', 1.5, { reach: 80, bell: true }, { seed: 8 }),
  ...aoe('dia-chan', 'p2d/dia-chan', 'earth', 1.4, { reach: 80 }),
  ...aoe('dang-phuoc', 'p2d/dang-phuoc', 'leaf', 1.7, { reach: 68 }),
  ...aoe('cuong-phong', 'p2d/cuong-phong', null, 1.15, { reach: 92 }),
  ...aoe('son-nhac', 'p2d/son-nhac', 'earth', 1.7, { reach: 112 }),
  'set-dat': { fx: 'p2d/set-dat', opts: { reach: 60 }, times: seq(1.0, 0.3, 10), end: 1.0 },
  // ---- vùng kéo dài (lặp)
  ...loop2('phan-thien', 'p2d/vung-lua', 'fire', { reach: 80 }),
  ...loop2('han-bang-vuc', 'p2d/vung-bang', 'ice', { reach: 92 }),
  ...loop2('luu-sa', 'p2d/vung-cat', 'dust', { reach: 88 }),
  ...loop2('thanh-moc-vuc', 'p2d/vung-moc', 'leaf', { reach: 84 }),
  'vong-kim': { fx: 'p2d/tran', pal: 'gold', opts: { motif: 'kim', mode: 'loop', radius: 54 }, fps: 10, loop: true },
  // ---- tự thân: hồi máu, khiên, tăng sức
  ...aoe('hoi', 'p2d/hoi', 'heal', 1.3, { power: 1 }),
  ...aoe('hoi-to', 'p2d/hoi', 'heal', 1.3, { power: 1.3 }, { seed: 9 }),
  'hoa-no': { fx: 'nature/healing-bloom', t: [0.85, 2.75], fps: 12 },
  'khien-thuy': { fx: 'holy/divine-shield', pal: 'water', empty: true, fps: 10 },
  'khien-kim': { fx: 'holy/divine-shield', pal: 'gold', empty: true, fps: 10 },
  'khien-tho': { fx: 'holy/divine-shield', pal: THO, empty: true, fps: 10 },
  ...loop2('giap-da', 'p2d/giap-da', 'earth'),
  ...loop2('hao-quang', 'p2d/hao-quang', 'gold', { power: 1 }),
  ...loop2('kim-than', 'p2d/hao-quang', 'gold', { power: 1.25, halo: true }),
  ...aoe('thap', 'p2d/thap', 'gold', 1.25),
  // ---- lướt (hình bay dọc đường lướt)
  'chem-vang': { fx: 'p2d/kiem-khi', pal: ['#1e1206', '#4a2c08', '#c48412', '#f0b424', '#ffe066', '#fff6c4', '#ffffff'], opts: { half: 24 }, fps: 20, dirs: 5 },
  'phuong-hoang': { fx: 'p2d/phuong-hoang', pal: 'fire', fps: 20, dirs: 5 },
  'long-thuong': { fx: 'p2d/long', pal: 'metal', opts: { kind: 'thuy', len: 58, girth: 4.2 }, fps: 20, dirs: 5 },
  // ---- pháp trận nhỏ dưới chân lúc tung chiêu
  'tran-kim': tran('gold', 'kim'), 'tran-moc': tran('leaf', 'moc'), 'tran-thuy': tran('ice', 'thuy'), 'tran-hoa': tran('fire', 'hoa'), 'tran-tho': tran('earth', 'tho'), 'tran-am': tran('arcane', 'vo'), 'tran-kiem': tran(KIEM, 'kim'),
  'set': { fx: 'lightning/lightning-strike', pal: 'volt', times: [0.74, 0.77, 0.8, 0.833, 0.867, 0.9, 0.95, 1.0, 1.07, 1.15, 1.25, 1.35, 1.5, 1.65], end: 1.8, box: [-72, -228, 72, 30], edge: 14 },
};
