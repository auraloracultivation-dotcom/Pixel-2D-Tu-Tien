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

// Tỉ lệ thành với k bộ đan phương
export function loRate(game, sets) {
  const c = L(game), lo = loOf(game.save);
  return Math.max(c.floor, Math.min(c.max, c.base + (c.pham[lo.ph] || 0) + c.per_cap * lo.cap - c.per_set * (sets - 1)));
}

// Đan phương khớp với nguyên liệu đang bỏ vào put ({ mã: số }): mọi đan đủ ít nhất 1 bộ, xếp như máy chủ chọn mặc định
// (ít nguyên liệu thừa nhất, rồi nhiều loại nguyên liệu nhất, rồi nhiều cái nhất, rồi theo mã). Mỗi dòng { id, sets, make, kinds, sum, left }
export function matches(game, put) {
  const out = [];
  for (const [id, p] of Object.entries(game.data.cave.pills)) {
    const r = Object.entries(p.recipe || {});
    if (!r.length || r.some(([k]) => !(put[k] > 0))) continue;
    const sets = Math.min(...r.map(([k, n]) => Math.floor(put[k] / n)));
    const sum = r.reduce((s, [, n]) => s + n, 0), all = Object.values(put).reduce((s, n) => s + n, 0);
    if (sets >= 1) out.push({ id, sets, make: p.make || 1, kinds: r.length, sum, left: all - sum * sets });
  }
  return out.sort((a, b) => a.left - b.left || b.kinds - a.kinds || b.sum - a.sum || (a.id < b.id ? -1 : 1));
}

// Dự kiến khi luyện put, chọn đan want (không chọn: mặc định): { m (dòng khớp hoặc null), rate, extra: { mã: số thừa } }
export function plan(game, put, want) {
  const all = matches(game, put), m = (want ? all.find(x => x.id === want) : all[0]) || null;
  const extra = {}, r = m ? game.data.cave.pills[m.id].recipe : {};
  for (const [k, n] of Object.entries(put)) { const left = n - (r[k] || 0) * (m?.sets || 0); if (left > 0) extra[k] = left; }
  return { m, all, rate: m ? loRate(game, m.sets) : 0, extra };
}

function mirror(game, put, r) {   // chép kết quả máy chủ (hoặc tính ở máy) vào bản lưu trong máy
  const s = game.save;
  s.mats ??= {}; s.pills ??= {};
  for (const [k, n] of Object.entries(put)) s.mats[k] = Math.max(0, (s.mats[k] || 0) - n);
  if (r.thanh && r.dan) s.pills[r.dan] = (s.pills[r.dan] || 0) + r.vien;
  dailyEvent(game, 'brew');
  game.persist();
}

// Luyện: trả { thanh, dan, vien, ti_le } hoặc { err: 'thieu_nl' | 'net' | 'busy' }
export async function luyen(game, put, want) {
  const clean = Object.fromEntries(Object.entries(put).filter(([, n]) => Number.isInteger(n) && n > 0));
  if (!Object.keys(clean).length || Object.keys(clean).length > L(game).slots) return { err: 'du_lieu_sai' };
  if (Object.entries(clean).some(([k, n]) => (game.save.mats?.[k] || 0) < n)) return { err: 'thieu_nl' };
  if (game.cloud && !noFn) {
    if (game.kyBusy) return { err: 'busy' };
    game.kyBusy = true;
    try {
      let res = null;
      await game.cloud.run(async () => (await net()).luyenDan(clean, want || null), r => { mirror(game, clean, r); res = r; });
      return res || { err: 'net' };
    } catch (e) {
      const m = String(e?.message || '');
      if (!m.includes('chua_co_ham')) return { err: m.includes('thieu_nl') ? 'thieu_nl' : 'net' };
      noFn = true;
    } finally { game.kyBusy = false; }
  }
  const p = plan(game, clean, want), ok = !!p.m && Math.random() < p.rate;
  const r = { thanh: ok, dan: p.m?.id || null, bo: p.m?.sets || 0, vien: ok ? p.m.make * p.m.sets : 0, ti_le: p.rate };
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
