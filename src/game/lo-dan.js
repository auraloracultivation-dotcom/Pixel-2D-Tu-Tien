// Lò luyện đan (chủ dự án 20/11/2026 13:3x–13:4x, số ở data/cave.json → lo). Túi đồ → Luyện đan: 1 ô lò + 9 ô nguyên liệu.
// Máy chủ quyết (migration 20261120140000_p2d_lo_dan.sql: p2d_luyen_dan, p2d_nang_lo, p2d_lo_cua_toi): kiểm nguyên liệu trong bản lưu
// máy chủ, dò đan phương, tung tỉ lệ, trừ nguyên liệu, cộng đan; máy khách chỉ chép lại kết quả (game.cloud.run).
// Chơi thử không đăng nhập, hoặc máy chủ chưa có hàm: tính ở máy theo đúng luật đó (plan() dưới đây giống hệt hàm máy chủ).
import { coins, addCoins } from './shop.js';
import { dailyEvent } from './daily.js';

const L = game => game.data.cave.lo;
const net = async () => (await import('../net/ky-mon.js')).kyCalls;
let noFn = false;

// Lò đang có: { ph: phẩm 0–6, cap: cấp 0–10 } (máy chủ ghi data.lo, chưa có thì lò Phàm cấp 0)
export const loOf = save => ({ ph: Math.max(0, Math.min(6, save?.lo?.ph | 0)), cap: Math.max(0, Math.min(10, save?.lo?.cap | 0)), hinh: Math.max(0, Math.min(3, save?.lo?.hinh | 0)) });

// Chọn hình lò (4 loại lò, chủ dự án 20/11/2026 14:10): chỉ là hình, lưu trong bản lưu, máy chủ giữ nguyên khi nâng lò
export function setHinh(game, i) { game.save.lo = { ...loOf(game.save), hinh: i }; game.persist(); }

// Tỉ lệ thành với tổng k bộ đan phương (mọi loại đan trong mẻ)
export function loRate(game, sets) {
  const c = L(game), lo = loOf(game.save);
  return Math.max(c.floor, Math.min(c.max, c.base + (c.pham[lo.ph] || 0) + c.per_cap * lo.cap - c.per_set * (sets - 1)));
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

// Luyện: trả { ds: [{ dan, bo, vien, thanh }], thanh (có loại nào thành), vien (tổng), ti_le } hoặc { err: 'thieu_nl' | 'net' | 'busy' }
// Một tỉ lệ chung theo tổng số bộ, mỗi loại đan tung riêng (14:3x "Mỗi loại đan tung riêng")
export async function luyen(game, put) {
  const clean = Object.fromEntries(Object.entries(put).filter(([, n]) => Number.isInteger(n) && n > 0));
  if (!Object.keys(clean).length || Object.keys(clean).length > L(game).slots) return { err: 'du_lieu_sai' };
  if (Object.entries(clean).some(([k, n]) => (game.save.mats?.[k] || 0) < n)) return { err: 'thieu_nl' };
  if (game.cloud && !noFn) {
    if (game.kyBusy) return { err: 'busy' };
    game.kyBusy = true;
    try {
      let res = null;
      await game.cloud.run(async () => (await net()).luyenDan(clean), r => { mirror(game, clean, r); res = r; });
      return res || { err: 'net' };
    } catch (e) {
      const m = String(e?.message || '');
      if (!m.includes('chua_co_ham')) return { err: m.includes('thieu_nl') ? 'thieu_nl' : 'net' };
      noFn = true;
    } finally { game.kyBusy = false; }
  }
  const g = ghep(game, clean), bo = g.reduce((t, x) => t + x.sets, 0), rate = bo ? loRate(game, bo) : 0;
  const ds = g.map(x => { const ok = Math.random() < rate; return { dan: x.id, bo: x.sets, vien: ok ? x.make * x.sets : 0, thanh: ok }; });
  const r = { ds, thanh: ds.some(d => d.thanh), vien: ds.reduce((t, d) => t + d.vien, 0), bo, ti_le: rate };
  mirror(game, clean, r);
  return r;
}

// Giá nâng lên cấp kế: { lt, tt } hoặc null khi tối đa
export function upCost(game) {
  const c = L(game), lo = loOf(game.save);
  return lo.cap >= c.cap_max ? null : c.cost[lo.cap];
}

// Nâng lò một cấp: trả { cap } hoặc { err: 'max' | 'poor' | 'net' | 'busy' }
export async function nangLo(game) {
  const g = upCost(game), s = game.save;
  if (!g) return { err: 'max' };
  if (coins(s) < g.lt || (s.mats?.['tinh-thiet'] || 0) < g.tt) return { err: 'poor' };
  const apply = r => {
    addCoins(game, -(r.lt ?? g.lt), 'nang-lo');
    s.mats['tinh-thiet'] = Math.max(0, (s.mats['tinh-thiet'] || 0) - (r.tt ?? g.tt));
    s.lo = { ...loOf(s), ph: r.ph ?? loOf(s).ph, cap: r.cap ?? loOf(s).cap + 1 };
    game.persist();
  };
  if (game.cloud && !noFn) {
    if (game.kyBusy) return { err: 'busy' };
    game.kyBusy = true;
    try {
      let res = null;
      await game.cloud.run(async () => (await net()).nangLo(), r => { apply(r); res = { cap: r.cap }; });
      return res || { err: 'net' };
    } catch (e) {
      const m = String(e?.message || '');
      if (!m.includes('chua_co_ham')) return { err: m.includes('thieu') ? 'poor' : m.includes('lo_toi_da') ? 'max' : 'net' };
      noFn = true;
    } finally { game.kyBusy = false; }
  }
  apply({});
  return { cap: s.lo.cap };
}

// Lúc mở bảng: hỏi máy chủ lò thật (chủ dự án phát lò phẩm cao bằng cột lo_pham thì máy khách thấy ngay)
export async function syncLo(game) {
  if (!game.cloud || noFn) return;
  try {
    const r = await (await net()).loCuaToi();
    if (r && Number.isInteger(r.ph) && Number.isInteger(r.cap)) game.save.lo = { ...loOf(game.save), ph: r.ph, cap: r.cap };
  } catch { /* máy chủ chưa có hàm hoặc mạng chập chờn: giữ lò trong bản lưu */ }
}
