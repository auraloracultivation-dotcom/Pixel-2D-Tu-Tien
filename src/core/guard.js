// Chống sửa bộ nhớ kiểu GameGuardian (chủ dự án xin 28/10/2026). Khoá cần giữ ở data/config.json → guard.
// 1. Giấu số: số quan trọng trong bản lưu không nằm trong bộ nhớ dưới dạng số thật. Mỗi lần ghi, số được trộn (XOR)
//    với khoá ngẫu nhiên mới, nên dò "số bằng 98544" hay "số vừa tăng, vừa giảm" đều không ra. Đọc, ghi, JSON vẫn như số thường.
// 2. Bẫy số: một bản sao số thật để lộ (Float64Array, dò là ra). Sửa bản sao thì số trong game không đổi, lần kiểm tra sau
//    thấy lệch: tăng save.ac, máy chủ ghi cờ 'sua_bo_nho' (migration 20261028140000_p2d_chong_gian_2).
// guardSave(save, cfg) bọc các khoá; checkGuard(save, cfg) kiểm tra bẫy và bọc khoá mới xuất hiện (gọi định kỳ).

const dv = new DataView(new ArrayBuffer(8));
const rnd = () => (Math.random() * 0x100000000) >>> 0;
const META = new WeakMap();   // object → { pot: Float64Array (bẫy), idx: { khoá: chỗ trong pot } }

function hide(v) {
  if (typeof v !== 'number') return { raw: v };
  dv.setFloat64(0, v);
  const k1 = rnd(), k2 = rnd();
  return { a: (dv.getUint32(0) ^ k1) >>> 0, b: (dv.getUint32(4) ^ k2) >>> 0, k1, k2 };
}

function show(h) {
  if ('raw' in h) return h.raw;
  dv.setUint32(0, (h.a ^ h.k1) >>> 0);
  dv.setUint32(4, (h.b ^ h.k2) >>> 0);
  return dv.getFloat64(0);
}

const asPot = v => (typeof v === 'number' ? v : NaN);

function metaOf(obj) {
  let m = META.get(obj);
  if (!m) META.set(obj, (m = { pot: new Float64Array(8), idx: {}, n: 0 }));
  return m;
}

function slot(m, key) {
  if (key in m.idx) return m.idx[key];
  if (m.n >= m.pot.length) { const p = new Float64Array(m.pot.length * 2); p.set(m.pot); m.pot = p; }
  return (m.idx[key] = m.n++);
}

// Bọc một khoá đang là số thường; đã bọc thì thôi
function wrap(obj, key, m) {
  const d = Object.getOwnPropertyDescriptor(obj, key);
  if (!d || d.get || d.set || !d.configurable) return;
  const i = slot(m, key);
  let h = hide(d.value);
  m.pot[i] = asPot(d.value);
  Object.defineProperty(obj, key, {
    enumerable: true, configurable: true,
    get: () => show(h),
    set: v => { h = hide(v); m.pot[i] = asPot(v); },
  });
}

function targets(save, cfg) {
  const list = [[save, cfg.keys || []]];
  for (const [k, keys] of Object.entries(cfg.nested || {})) {
    const o = save[k];
    if (o && typeof o === 'object' && !Array.isArray(o)) list.push([o, keys === '*' ? Object.keys(o) : keys]);
  }
  return list;
}

export function guardSave(save, cfg) {
  if (!save || !cfg) return;
  for (const [obj, keys] of targets(save, cfg)) { const m = metaOf(obj); for (const k of keys) wrap(obj, k, m); }
}

// Trả về số chỗ bẫy bị sửa (0 là sạch). Có lệch thì save.ac tăng 1 (máy chủ ghi cờ), bẫy đặt lại theo số thật.
export function checkGuard(save, cfg) {
  if (!save || !cfg) return 0;
  let bad = 0;
  for (const [obj, keys] of targets(save, cfg)) {
    const m = metaOf(obj);
    for (const k of keys) {
      const d = Object.getOwnPropertyDescriptor(obj, k);
      if (!d) continue;
      if (!d.get) { wrap(obj, k, m); continue; }   // khoá mới, hoặc bị gán đè bằng số thường
      const v = obj[k], i = m.idx[k];
      if (i === undefined || typeof v !== 'number') continue;
      if (!Object.is(m.pot[i], v)) { bad++; m.pot[i] = v; }
    }
  }
  if (bad) save.ac = (typeof save.ac === 'number' ? save.ac : 0) + 1;
  return bad;
}
