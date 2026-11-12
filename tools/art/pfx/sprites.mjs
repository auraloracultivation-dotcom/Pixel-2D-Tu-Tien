// Danh sách hình hiệu ứng chiêu dựng từ PixelFX (tools/art/pfx/export.mjs). Mỗi dòng: tên hình → cách dựng.
//   fx: mã hiệu ứng PixelFX ('fire/fireball') hoặc hiệu ứng riêng của game ('p2d/<tên>' = tools/art/pfx/fx/<tên>.js)
//   pal: bảng màu PAL của PixelFX hoặc mảng màu tối → sáng; opts: tuỳ chọn riêng của hiệu ứng; seed
//   t: [từ, tới] giây lấy khung; fps: số khung mỗi giây (ước của 120); times: [giây...] tự chọn từng khung (dày lúc nổ, thưa lúc tàn), end: giây kết thúc
//   dirs: số góc dựng sẵn từ 0 tới 90 độ (đạn bay: 5 góc = 16 hướng); box: [x0, y0, x1, y1] khung cắt quanh điểm neo
//   k: đơn vị bản đồ mỗi điểm ảnh (mặc định 0,5 = đúng lưới 2 điểm khung vẽ mỗi đơn vị trên điện thoại); ls: thu nhỏ lớp sáng (mặc định 2 với hình lớn)
//   tint: hình đổi màu được lúc chạy (đòn pháp bảo khảm hệ): ghi dải màu gốc vào art.json
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
const GIO = ['#0c2038', '#1a4670', '#3478b0', '#62a8dc', '#9cd0f4', '#d4eeff', '#ffffff'];
const SET_T = [0.74, 0.77, 0.8, 0.833, 0.867, 0.9, 0.95, 1.0, 1.07, 1.15, 1.25, 1.35, 1.5, 1.65];   // sét: bỏ đoạn tụ, lấy từ lúc tia giáng

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
  'kim-luan-to': { fx: 'p2d/kim-luan', pal: 'gold', fps: 20, opts: { radius: 15, teeth: 8 } },   // bánh lớn bay vòng của Kim Luân Trảm
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
  ...loop2('kim-than', 'p2d/kim-chung', 'gold', {}),   // Bất Hoại Kim Thân: chuông vàng úp quanh người
  ...aoe('thap', 'p2d/thap', 'gold', 1.25),
  // ---- lướt (hình bay dọc đường lướt)
  'chem-vang': { fx: 'p2d/kiem-khi', pal: ['#1e1206', '#4a2c08', '#c48412', '#f0b424', '#ffe066', '#fff6c4', '#ffffff'], opts: { half: 24 }, fps: 20, dirs: 5 },
  'phuong-hoang': { fx: 'p2d/phuong-hoang', pal: 'fire', fps: 20, dirs: 5 },
  'long-thuong': { fx: 'p2d/long', pal: 'metal', opts: { kind: 'thuy', len: 58, girth: 4.2 }, fps: 20, dirs: 5 },
  // ---- pháp trận nhỏ dưới chân lúc tung chiêu
  'tran-kim': tran('gold', 'kim'), 'tran-moc': tran('leaf', 'moc'), 'tran-thuy': tran('ice', 'thuy'), 'tran-hoa': tran('fire', 'hoa'), 'tran-tho': tran('earth', 'tho'), 'tran-am': tran('arcane', 'vo'), 'tran-kiem': tran(KIEM, 'kim'),
  // ---- Vạn Kiếm Thiên Lâm: 6 kiểu linh kiếm lớn (dựng theo hướng), kiếm khí xoắn, lửa linh khí sau kiếm (dựng sẵn mũi chúc xuống)
  ...Object.fromEntries([[KIEM, 0], ['heal', 1], ['gold', 2], [TIM, 0], ['blood', 1], ['metal', 2]].map(([pal, guard], i) => ['vk-kiem-' + i, { fx: 'p2d/van-kiem', pal, opts: { guard }, fps: 10, dirs: 5, ls: 2 }])),
  'vk-khi': { fx: 'p2d/van-kiem', pal: KIEM, opts: { part: 'khi' }, fps: 20, dirs: 5 },
  'vk-dam': { fx: 'p2d/van-kiem', pal: KIEM, opts: { part: 'dam' }, fps: 20, angle: Math.PI / 2 },
  'set': { fx: 'lightning/lightning-strike', pal: 'volt', times: SET_T, end: 1.8, box: [-72, -228, 72, 30], edge: 14 },
  // ---- ĐÒN PHÁP BẢO (Pháp Bảo Luyện Chế, thứ người chơi thấy mỗi lần bấm nút). tint: game đổi màu theo hệ khảm (src/render/vfx/pfx-pal.js),
  // hình dựng bằng một dải màu gốc, ghi dải đó vào art.json (pal) để đổi sang dải của hệ. Vẽ ở src/render/draw-pb-px.js.
  'pb-kiem': { fx: 'p2d/van-kiem', pal: KIEM, opts: { guard: 0, length: 34, slim: 1 }, fps: 10, dirs: 9, tint: true },      // Phi Kiếm (9 góc dựng sẵn = 32 hướng, game không xoay thêm; vẽ to gấp đôi)
  'pb-kiem-khi': { fx: 'p2d/van-kiem', pal: KIEM, opts: { part: 'khi', length: 34, slim: 1 }, fps: 20, dirs: 9, tint: true },   // kiếm khí xoắn quanh phi kiếm (phẩm cao)
  'pb-chau': { fx: 'p2d/chau', pal: KIEM, opts: { radius: 14 }, fps: 20, tint: true },                                     // Linh Châu
  'pb-chau-duoi': { fx: 'p2d/chau', pal: KIEM, opts: { radius: 14, part: 'duoi' }, fps: 10, dirs: 9, tint: true, box: [-58, -20, 8, 20] },   // đuôi sao chổi sau Linh Châu
  'pb-manh': { fx: 'p2d/manh', pal: KIEM, fps: 20, dirs: 9, tint: true },                                                  // mảnh Tỏa Nhánh
  'pb-phong': { fx: 'p2d/kiem-khi', pal: GIO, opts: { half: 26 }, fps: 20, dirs: 9, tint: true },                          // lưỡi gió Bảo Phiến, tia nước Hồ Lô
  'pb-quat': { fx: 'p2d/quat', pal: GIO, fps: 30, dirs: 9, tint: true },                                                   // Bảo Phiến: chiếc quạt phẩy một nhát
  'pb-trung': { ...no(KIEM, 'kim', 1, 8), tint: true },                                                                    // tia trúng đòn nhỏ, đổi màu theo hệ
  'pb-chuong': { fx: 'p2d/chuong', pal: TIM, times: seq(0.7, 0.3, 12), end: 0.7, tint: true },                                       // Đồng Chung
  'pb-an': { fx: 'p2d/an', pal: 'gold', fps: 10 },                                                                         // Đại Ấn
  'pb-co': { fx: 'p2d/co', pal: 'gold', fps: 10 },                                                                         // Trận Kỳ
  'pb-holo': { fx: 'p2d/ho-lo', pal: KIEM, fps: 10 },                                                                      // Hồ Lô
  'pb-khien': { fx: 'holy/divine-shield', pal: 'cyber', opts: { radius: 16 }, empty: true, fps: 10, tint: true },                               // Hộ Thuẫn
  'pb-tran': { fx: 'p2d/tran', pal: 'gold', opts: { motif: 'kim', mode: 'loop', radius: 96 }, fps: 10, loop: true, tint: true, box: [-100, -84, 100, 84] },   // pháp trận phủ vùng Trận Kỳ (bán kính 96 điểm, vẽ gấp đôi = đúng vùng 96 đơn vị)
  'pb-tran-mo': { ...tran('gold', 'kim'), tint: true },                                                                    // pháp trận bật ra lúc đặt đòn
  'pb-no': { ...no(KIEM, 'kim', 1.5, 5), tint: true },                                                                     // nổ (Đánh Lan, Tử Bạo, khiên vỡ) đổi màu theo hệ
  'pb-set': { fx: 'lightning/lightning-strike', pal: 'electric', times: SET_T, end: 1.8, box: [-72, -228, 72, 30], edge: 14 },   // Lôi Kích
  // trạng thái hệ trên quái
  'tt-lua': { fx: 'p2d/tt', opts: { kind: 'lua' }, fps: 10 }, 'tt-bang': { fx: 'p2d/tt', pal: 'ice', opts: { kind: 'bang' }, fps: 10 }, 'tt-lanh': { fx: 'p2d/tt', pal: 'ice', opts: { kind: 'lanh' }, fps: 10 },
  'tt-re': { fx: 'p2d/tt', opts: { kind: 're' }, fps: 10 }, 'tt-pha': { fx: 'p2d/tt', opts: { kind: 'pha' }, fps: 10 },
};

// Biểu tượng chiêu dựng từ chính hình hiệu ứng (export.mjs --icons): L = các lớp [tên hình, lệch x, lệch y, góc, giây riêng], t = giây lấy khung,
// win = [tâm x, tâm y, cạnh ô cắt] tính từ điểm neo (ô 34: nguyên nét; 68: thu một nửa; lớn hơn: thu nhiều, chỉ còn dáng).
const A = -0.7, bay = (name, S = 40, back = 9, t = 0.1) => ({ L: [[name, 0, 0, A]], t, win: [-Math.cos(A) * back, -Math.sin(A) * back, S] });
const hai = (name, t, win) => ({ L: [[name + '-d'], [name]], t, win });
export const ICONS = {
  'kiem-khi': bay('kiem-khi', 40, 5), 'hoa-cau': bay('hoa-cau', 40, 11), 'bang-truy': bay('bang-truy', 44, 14), 'thach-chuy': bay('da', 30, 0), 'that-huyen': bay('am-ba', 34, 4),
  'hoa-long': bay('hoa-long', 56, 16), 'luc-dang-long': bay('luc-dang-long', 56, 16), 'thuy-long': bay('thuy-long', 48, 13),
  'liet-hoa-tran': { L: [['hoa-cau', -9, -8, A], ['hoa-cau', 8, 0, A], ['hoa-cau', -3, 12, A]], t: 0.1, win: [-8, 8, 56] },
  'van-moc-cham': { L: [['cham', -4, -7, A - 0.3], ['cham', 3, 0, A], ['cham', 4, 9, A + 0.3]], t: 0.1, win: [-6, 4, 40] },
  'van-kiem': { L: [['phi-kiem', -5, -8, A - 0.25], ['phi-kiem', 3, 0, A], ['phi-kiem', 4, 10, A + 0.25]], t: 0.1, win: [-8, 6, 44] },
  'lien-chau': { L: [['ten', -6, -5, A], ['ten', 1, 1, A], ['ten', 5, 9, A]], t: 0.1, win: [-9, 8, 44] },
  'bang-phach': { L: [['no-bang']], t: 0.11, win: [0, -3, 44] },
  'tu-nguyet-liem': { L: [['nguyet-liem']], t: 0.08, win: [0, 0, 40] },
  'song-nguyet-tram': { L: [['nguyet-liem', -9, -6], ['nguyet-liem', 9, 7, 0, 0.3]], t: 0.08, win: [0, 0, 56] },
  'tu-nguyet-luan': { L: [['nguyet-liem', 0, -14], ['nguyet-liem', -13, 9, 0, 0.2], ['nguyet-liem', 13, 9, 0, 0.36]], t: 0.08, win: [0, 0, 64] },
  'phap-kim-luan': { L: [['kim-luan']], t: 0, win: [0, 0, 36] },
  'kim-luan': { L: [['vong-kim'], ['kim-luan', -22, -10], ['kim-luan', 20, 8, 0, 0.2]], t: 0, win: [0, -4, 80] },
  'dang-phuoc': hai('dang-phuoc', 0.7, [0, -12, 76]), 'liet-diem': hai('liet-diem', 0.32, [0, -16, 80]), 'bang-phong': hai('bang-phong', 0.5, [0, -14, 80]), 'dia-chan': hai('dia-chan', 0.45, [0, -10, 80]),
  'cuong-phong': hai('cuong-phong', 0.4, [0, -26, 76]), 'son-nhac': hai('son-nhac', 0.5, [0, -62, 128]), 'phap-hoa-hon': hai('hoa-hon', 0.36, [0, -22, 72]),
  'loi-dinh': { L: [['set-dat', 0, 0, 0, 0.1], ['set', 0, 0, 0, 0.84]], win: [0, -44, 112] },
  'thanh-moc-vuc': hai('thanh-moc-vuc', 0.4, [0, -2, 104]), 'phan-thien': hai('phan-thien', 0.4, [0, -6, 104]), 'han-bang-vuc': hai('han-bang-vuc', 0.4, [0, -8, 112]), 'luu-sa': hai('luu-sa', 0.4, [0, 0, 104]),
  'hoi-xuan': { L: [['hoa-no']], t: 1.4, win: [0, -44, 56] },
  'truong-xuan': hai('hoi-to', 0.5, [0, -24, 72]), 'phap-thanh-moc': { L: [['tran-moc', 0, 0, 0, 0.3], ['hoi-d'], ['hoi']], t: 0.45, win: [0, -18, 72] },
  'thuy-thuan': { L: [['khien-thuy']], t: 0.5, win: [0, -22, 68] }, 'phap-huyen-thuy': { L: [['tran-thuy', 0, 0, 0, 0.3], ['khien-thuy']], t: 1.1, win: [0, -18, 76] },
  'dai-dia': { L: [['tran-tho', 0, 0, 0, 0.3], ['khien-tho']], t: 0.5, win: [0, -18, 76] }, 'phap-tran-yeu': hai('thap', 0.5, [0, -38, 96]),
  'thach-giap': hai('giap-da', 0.4, [0, -20, 54]), 'kim-cuong-the': { L: [['tran-kim', 0, 0, 0, 0.3], ['hao-quang-d'], ['hao-quang']], t: 0.3, win: [0, -17, 50] }, 'kim-than': hai('kim-than', 0.3, [0, -32, 76]),
  'kim-quang-tram': bay('chem-vang', 52, 6), 'phuong-hoang': bay('phuong-hoang', 84, 12, 0.05), 'long-thuong': bay('long-thuong', 52, 14),
  'van-kiem-thien': { L: [['vk-kiem-3', -12, 2, Math.PI / 2 - 0.35], ['vk-kiem-2', 12, 2, Math.PI / 2 + 0.35], ['vk-kiem-0', 0, -4, Math.PI / 2]], t: 0, win: [0, 0, 68] },
  'thien-phat': { L: [['set-dat', 0, 0, 0, 0.1], ['set', -22, -6, 0, 0.8], ['set', 20, 4, 0, 0.87]], win: [0, -52, 120] },
  'thiem-anh': { L: [['no-kiem']], t: 0.09, win: [0, -3, 44] },
  'pha-thien': bay('kiem-khi', 34, 2),
  'vo-anh': { L: [['tran-am', 0, 0, 0, 0.3], ['nguyet-liem', 0, -6, 0, 0.1]], win: [0, -3, 68] },
};
