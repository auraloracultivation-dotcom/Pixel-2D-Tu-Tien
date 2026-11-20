// Lò luyện đan (chủ dự án 20/11/2026 13:3x–14:5x, số ở data/cave.json → lo). Lò là món đồ: mua ở NPC bán lò (đều phẩm Phàm), mỗi lò phẩm
// riêng, chỉ nâng phẩm; phải đặt một lò mới luyện được. Máy chủ quyết (migration 20261120140000_p2d_lo_dan.sql, sinh bằng tools/lo-dan-sql.py):
// mua / đặt / nâng lò, kiểm nguyên liệu, ghép đan phương, tung tỉ lệ, trừ nguyên liệu, cộng đan; máy khách chỉ chép lại kết quả.
// Chơi thử không đăng nhập, hoặc máy chủ chưa có hàm: tính ở máy theo đúng luật đó.
import { coins, addCoins } from './shop.js';
import { dailyEvent } from './daily.js';

const L = game => game.data.cave.lo;
const net = async () => (await import('../net/ky-mon.js')).kyCalls;
let noFn = false;

// Lò đang có: { ds: [{ id, k: kiểu 0–3, ph: phẩm 0–6 }], dung: mã lò đang đặt | null } (máy chủ ghi data.lo)
export function loOf(save) {
  const r = save?.lo, ds = Array.isArray(r?.ds) ? r.ds.filter(x => x && typeof x.id === 'string').map(x => ({ id: x.id, k: Math.max(0, Math.min(3, x.k | 0)), ph: Math.max(0, Math.min(6, x.ph | 0)) })) : [];
  return { ds, dung: ds.some(x => x.id === r?.dung) ? r.dung : null };
}
export const loDung = save => { const o = loOf(save); return o.ds.find(x => x.id === o.dung) || null; };
export const loSpr = (game, lo) => 'lo.' + (L(game).kieu[lo?.k | 0] || L(game).kieu[0]);
export const loTen = (game, lo) => L(game).kieu_ten[lo?.k | 0] || '';

// Tỉ lệ thành của đan dan khi mẻ có tổng k bộ đan phương, theo phẩm lò đang đặt; phẩm đan càng cao càng thấp (16:1x, pills.*.pham × phat_dan)
export function loRate(game, sets, dan) {
  const c = L(game), lo = loDung(game.save), pd = game.data.cave.pills[dan]?.pham || 0;
  return Math.max(c.floor, Math.min(c.max, c.base + (c.pham[lo?.ph | 0] || 0) - c.per_set * (sets - 1) - (c.phat_dan || 0) * pd));
}

// Ghép đan phương như máy chủ (chủ dự án 20/11/2026: một mẻ ra được nhiều loại đan; nguyên liệu chồng nhiều đan phương thì
// "ngẫu nhiên chia trung bình số lượng ra"): mọi đan đang ghép được chia đều theo vòng, mỗi vòng mỗi đan một bộ; vòng nào không đủ cho
// tất cả thì đi một vòng lẻ theo thứ tự ngẫu nhiên, đan nào còn ghép được thì lấy một bộ. Gộp nhiều vòng đủ thành một bước cho nhanh.
// Trả [{ id, sets, make }]
export function ghep(game, put) {
  const con = { ...put }, sets = {}, P = Object.entries(game.data.cave.pills).filter(([, p]) => Object.keys(p.recipe || {}).length);
  const ok = r => Object.entries(r).every(([k, n]) => (con[k] || 0) >= n);
  for (let guard = 0; guard < 500; guard++) {
    const F = P.filter(([, p]) => ok(p.recipe));
    if (!F.length) break;
    const need = {};
    for (const [, p] of F) for (const [k, n] of Object.entries(p.recipe)) need[k] = (need[k] || 0) + n;
    const k = Math.min(...Object.entries(need).map(([g, n]) => Math.floor((con[g] || 0) / n)));
    if (k >= 1) {   // đủ k vòng trọn
      for (const [g, n] of Object.entries(need)) con[g] -= n * k;
      for (const [id] of F) sets[id] = (sets[id] || 0) + k;
      continue;
    }
    for (let i = F.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [F[i], F[j]] = [F[j], F[i]]; }
    for (const [id, p] of F) if (ok(p.recipe)) { for (const [g, n] of Object.entries(p.recipe)) con[g] -= n; sets[id] = (sets[id] || 0) + 1; }
  }
  return Object.entries(sets).map(([id, n]) => ({ id, sets: n, make: game.data.cave.pills[id].make || 1 }));
}

function mirror(game, put, r) {   // chép kết quả máy chủ (hoặc tính ở máy) vào bản lưu trong máy
  const s = game.save;
  s.mats ??= {}; s.pills ??= {};
  for (const [k, n] of Object.entries(put)) s.mats[k] = Math.max(0, (s.mats[k] || 0) - n);
  for (const d of r.ds || []) if (d.thanh && d.dan) s.pills[d.dan] = (s.pills[d.dan] || 0) + d.vien;
  dailyEvent(game, 'brew');
  game.persist();
}

// Luyện: trả { ds: [{ dan, bo, vien, thanh }], thanh (có loại nào thành), vien (tổng) } hoặc { err: 'thieu_nl' | 'net' | 'busy' }
// Một tỉ lệ chung theo tổng số bộ, mỗi loại đan tung riêng (14:3x), trừ thêm theo phẩm đan (16:1x)
export async function luyen(game, put) {
  const clean = Object.fromEntries(Object.entries(put).filter(([, n]) => Number.isInteger(n) && n > 0));
  if (!Object.keys(clean).length || Object.keys(clean).length > L(game).slots) return { err: 'du_lieu_sai' };
  if (Object.entries(clean).some(([k, n]) => (game.save.mats?.[k] || 0) < n)) return { err: 'thieu_nl' };
  if (!loDung(game.save)) return { err: 'chua_co_lo' };
  if (game.cloud && !noFn) {
    if (game.kyBusy) return { err: 'busy' };
    game.kyBusy = true;
    try {
      let res = null;
      await game.cloud.run(async () => (await net()).luyenDan(clean), r => { mirror(game, clean, r); res = r; });
      return res || { err: 'net' };
    } catch (e) {
      const m = String(e?.message || '');
      if (!m.includes('chua_co_ham')) return { err: m.includes('thieu_nl') ? 'thieu_nl' : m.includes('chua_co_lo') ? 'chua_co_lo' : 'net' };
      noFn = true;
    } finally { game.kyBusy = false; }
  }
  const g = ghep(game, clean), bo = g.reduce((t, x) => t + x.sets, 0);
  const ds = g.map(x => { const ok = Math.random() < loRate(game, bo, x.id); return { dan: x.id, bo: x.sets, vien: ok ? x.make * x.sets : 0, thanh: ok }; });
  const r = { ds, thanh: ds.some(d => d.thanh), vien: ds.reduce((t, d) => t + d.vien, 0), bo };
  mirror(game, clean, r);
  return r;
}

// Giá nâng lò lên phẩm kế: { lt, tt } hoặc null khi đã Thượng Cổ
export const upCost = (game, lo) => (lo ? L(game).nang[lo.ph] || null : null);

const setLo = (game, r) => { if (r && Array.isArray(r.ds)) { game.save.lo = { ds: r.ds, dung: r.dung ?? null }; game.persist(); } };
const errOf = m => (m.includes('thieu') ? 'poor' : m.includes('lo_toi_da') ? 'max' : m.includes('lo_day') ? 'full' : m.includes('khong_co_lo') ? 'none' : 'net');

// Gọi máy chủ (fn) rồi chép; máy chủ chưa có hàm hoặc chơi thử: local() tính ở máy. Trả kết quả hoặc { err }
async function serverOr(game, fn, apply, local) {
  if (game.cloud && !noFn) {
    if (game.kyBusy) return { err: 'busy' };
    game.kyBusy = true;
    try {
      let res = null;
      await game.cloud.run(async () => fn(await net()), r => { apply(r); res = r; });
      return res || { err: 'net' };
    } catch (e) {
      const m = String(e?.message || '');
      if (!m.includes('chua_co_ham')) return { err: errOf(m) };
      noFn = true;
    } finally { game.kyBusy = false; }
  }
  return local();
}

// Mua lò kiểu k (NPC bán lò): { lo } hoặc { err: 'poor' | 'full' | 'net' | 'busy' }
export function muaLo(game, k) {
  const c = L(game), s = game.save, o = loOf(s);
  if (o.ds.length >= c.max_lo) return Promise.resolve({ err: 'full' });
  if (coins(s) < c.gia_mua) return Promise.resolve({ err: 'poor' });
  return serverOr(game, n => n.muaLo(k), r => { addCoins(game, -(r.lt ?? c.gia_mua), 'mua-lo'); setLo(game, r); }, () => {
    const lo = { id: 'l' + Math.random().toString(16).slice(2, 10), k, ph: 0 };
    addCoins(game, -c.gia_mua, 'mua-lo');
    setLo(game, { ds: [...o.ds, lo], dung: o.dung || lo.id });
    return { lo };
  });
}

// Đặt lò đang có làm lò luyện
export function datLo(game, id) {
  const o = loOf(game.save);
  if (!o.ds.some(x => x.id === id)) return Promise.resolve({ err: 'none' });
  return serverOr(game, n => n.datLo(id), r => setLo(game, r), () => { setLo(game, { ds: o.ds, dung: id }); return { dung: id }; });
}

// Nâng lò id lên phẩm kế: { lo } hoặc { err: 'max' | 'poor' | 'net' | 'busy' }
export function nangLo(game, id) {
  const s = game.save, o = loOf(s), lo = o.ds.find(x => x.id === id), g = upCost(game, lo);
  if (!lo) return Promise.resolve({ err: 'none' });
  if (!g) return Promise.resolve({ err: 'max' });
  if (coins(s) < g.lt || (s.mats?.['tinh-thiet'] || 0) < g.tt) return Promise.resolve({ err: 'poor' });
  const pay = r => { addCoins(game, -(r.lt ?? g.lt), 'nang-lo'); s.mats['tinh-thiet'] = Math.max(0, (s.mats['tinh-thiet'] || 0) - (r.tt ?? g.tt)); };
  return serverOr(game, n => n.nangLo(id), r => { pay(r); setLo(game, r); }, () => {
    pay({}); const ds = o.ds.map(x => (x.id === id ? { ...x, ph: x.ph + 1 } : x));
    setLo(game, { ds, dung: o.dung }); return { lo: ds.find(x => x.id === id) };
  });
}

// Lúc mở bảng: hỏi máy chủ lò thật
export async function syncLo(game) {
  if (!game.cloud || noFn) return;
  try { const r = await (await net()).loCuaToi(); if (r && Array.isArray(r.ds)) game.save.lo = { ds: r.ds, dung: r.dung ?? null }; }
  catch { /* máy chủ chưa có hàm hoặc mạng chập chờn: giữ lò trong bản lưu */ }
}
