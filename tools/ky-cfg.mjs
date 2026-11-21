// Số máy chủ cần để tự tẩy luyện, cường hoá, đổi hệ, khảm / ghép ngọc, luyện pháp bảo, kiểm chữ ký món và túi ngọc
// (bảng p2d_ky_cfg, migration 20261105010000_p2d_ky_mon.sql, 20261105020000_p2d_ky_ngoc.sql, 20261105030000_p2d_ky_roi.sql).
// tools/check.mjs so bảng trong migration mới nhất với số dựng từ data/ ở đây. Đổi số trong data/ thì chạy
// `node tools/ky-cfg.mjs` lấy chuỗi JSON mới, thêm migration mới: insert into public.p2d_ky_cfg ... on conflict do update.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function kyCfg(read) {
  const I = read('items.json'), G = read('gear.json'), E = read('elements.json'), D = read('daovan.json');
  const S = read('story.json'), C = read('community.json'), R = read('realms.json'), gs = I.gems.server, rf = G.refine, rb = I.drop_budget;
  const f = I.reroll_fee, lt = I.line_tiers, e = G.enhance;
  return {
    tay: { base: f.base, realm_mul: f.realm_mul, r: f.r, decay: f.decay, line_mul: f.line_mul || 1, cost: I.reroll_cost, free: lt.free, pham_k: lt.pham_k || 0 },   // pham_k: phẩm món cao thì màu dòng cao dễ ra hơn một chút (19/11/2026)
    mau: lt.list.map(t => [t.mult, t.w]),
    tu_pham: lt.from_rarity,   // đồ cũ gắn màu dòng: màu cao nhất = from_rarity + 1
    cap_w: lt.cap_w,
    lpl: I.line_per_lvl,
    cs: Object.fromEntries(Object.entries(I.stats).map(([k, d]) => [k, [d.min, d.max, !!d.pct]])),
    pool: Object.fromEntries(Object.entries(I.bases).map(([k, b]) => [k, b.pool])),
    cuong: { max: e.max, iron: e.iron, stones: e.stones, coins: e.coins, rate: e.rate, drop_from: e.drop_from, drop_chance: e.drop_chance, open: { base: e.open.base, from_realm: e.open.from_realm, per_realm: e.open.per_realm } },
    he: Object.keys(E).filter(k => !k.startsWith('_')),
    doi_he: { mat: D.reroll.mat, n: D.reroll.n },
    // giai đoạn 2 (migration 20261105020000_p2d_ky_ngoc.sql): ghép ngọc, thùng ngọc rơi, quà ngọc cốt truyện / Zalo, luyện pháp bảo
    ngoc: {
      types: Object.keys(I.gems.types), max: I.gems.max_level, merge: I.gems.merge, phi: [I.gems.merge_fee.base, I.gems.merge_fee.r],
      lo: { max_lv: gs.max_lv, toc_phut: gs.toc_phut, tran: gs.tran },
      truyen: S.steps.flatMap((st, i) => (st.do || []).filter(a => a.gem).map(a => [i, a.gem])),
      zalo: C.zalo.gem_level,
    },
    pb_max: rf.max,
    luyen: { base: rf.base, r: rf.r, mat: rf.mat, bases: Object.keys(I.bases).filter(k => I.bases[k].slot === 'phap-bao') },
    // giai đoạn 3 (migration 20261105030000_p2d_ky_roi.sql): mức nhận đồ rơi mới. dong: số dòng của món vừa rơi (items.js rollLines);
    // tang: số tầng mỗi cảnh giới (cấp món vừa rơi = totalLayer, src/game/stats.js)
    roi: { thu_tu: I.rarities.map(r => r.id), phut: rb.phut, gio: rb.gio, tran: rb.tran, mau: rb.mau, dong: 1, tang: R.layers, nang: rb.nang, nho: rb.nho },
    thu: thuCfg(read),
  };
}

// Giai đoạn 4 (migration 20261105120000_p2d_ky_thu.sql): linh thú, khôi lỗi, thú cưỡi, công pháp, thời trang, cấp chiêu, động phủ
function thuCfg(read) {
  const P = read('pets.json'), C = read('companions.json'), T = read('techniques.json'), F = read('fashion.json'), H = read('heroes.json');
  const K = read('config.json').skill_lv, V = read('cave.json'), SH = read('shop.json'), TP = read('topup.json'), SK = read('skills.json');
  const B = P.beast, FB = B.fashion, sv = P.server, ts = T.server, E = P.evolve;
  const npc = {};   // bộ bán ở NPC (data/shop.json npc_goods)
  for (const g of Object.values(SH.npc_goods || {})) if (g && g.kind === 'outfit') npc[g.id] = g.price;
  // phẩm dòng của bộ (src/game/beast.js outfitLine): theo giá Linh Thạch / Tiên Ngọc, không thì theo nguồn
  const tierOf = f => {
    const src = Object.keys(f.from).find(k => FB.tier[k] != null);
    const pt = (f.from.shop && FB.price_tier?.find(([lim]) => f.from.shop < lim)) || (f.from.tn && FB.tn_tier?.find(([lim]) => f.from.tn < lim));
    return pt ? pt[1] : FB.tier[src] ?? 0;
  };
  const bo = Object.fromEntries(Object.entries(F.list).map(([id, f]) => [id, [tierOf(f), f.line?.s || null, f.from.shop ?? npc[id] ?? null, !!f.from.tn, f.from.uid || null]]));   // [phẩm, chỉ số cố định, giá Linh Thạch, Tiên Ngọc, chủ riêng]
  const roi = [...new Set([...Object.values(P.mount_drops || {}).map(x => x[0]), ...Object.values(P.pets).filter(p => p.mount).map(p => p.mount[0])])].sort();
  return {
    pet: { ids: Object.keys(P.pets), max: P.max_level, evo_max: E.max_level, evo_lv: E.level, evo_lt: E.coins, evo_mats: E.cost, exp: [P.exp_base, P.exp_pow], starter: P.starter_pet },
    comp: { ids: Object.keys(P.shop.puppets).filter(id => C.list[id]), max: C.max_level, exp: [C.exp_base, C.exp_pow], gia: P.shop.puppets },
    tech: { ids: Object.keys(T.list), max: T.max_level, exp: [T.exp_base, T.exp_pow], slots: T.slots, starter: T.starter },
    cuoi: { ids: Object.keys(P.mounts), gia: P.shop.mounts, roi, starter: P.starter_mount, lenh: P.thu_lenh?.per_mount ?? null, lenh_ngay: P.thu_lenh?.daily_need ?? null },   // Thú Lệnh (migration 20261116230000_p2d_doi_moi_trang_bi.sql)
    dong: { pool: B.pool, phi: [B.reroll.coins, B.reroll.mul], mats: B.reroll.mats, mpool: B.mount.pool, mphi: B.mount.reroll.coins, mmats: B.mount.reroll.mats },
    thoi: { pool: FB.pool, bo, look: Object.keys(H.list), def: H.default, tn: Object.fromEntries(TP.shop.filter(x => x.outfit).map(x => [x.id, x.outfit])) },
    chieu: { ids: Object.keys(SK).filter(k => !k.startsWith('_')), max: K.max, mat: K.mat, book: [K.book_base, K.book_r], coins: [K.coins_base, K.coins_r] },
    dong_phu: V.levels.slice(1).map(l => [l.realm || 0, l.coins || 0, l.cost || {}]),
    sv: { exp_k: { pet: sv.exp_k.pet, comp: sv.exp_k.comp, tech: ts.exp_k }, sao: sv.sao, moi: sv.moi, cuoi: sv.cuoi, cp_moi: ts.moi, ban: sv.ban, dau: sv.dau },
  };
}

// Thưởng bí cảnh (bảng p2d_ky_cfg dòng 'bi_canh', hàm p2d_mien_bi_canh, migration 20261114060000_p2d_mien_bi_canh.sql). Mỗi lượt vượt /
// càn quét, máy khách tự cộng thưởng cấp (dungeon.json modes[].reward.coins × coin_dun, nhích reward_step mỗi bậc) và Linh Thạch rơi
// của mọi quái trong các phòng (src/game/dun-sweep.js, shop.js coinDrop). Máy chủ cần đúng các số này để không coi khoản đó là Linh Thạch lố.
//   luot: lượt mỗi ngày · buoc: số bậc mỗi cấp · nhich: thưởng nhích mỗi bậc · cap: linh khí quái nhích mỗi cấp · thuong: Linh Thạch thưởng từng cấp
//   tuan: hệ số Linh Thạch rơi của từng sự kiện tuần (events.json weekly, xoay vòng theo số tuần)
//   bc[bí cảnh] = [hệ số thưởng cấp, Linh Thạch rơi nhiều nhất một lượt ở bậc 1 (con nào cũng rơi, mức cao nhất, có đạo lữ), số quái]
export function bcCfg(read) {
  const D = read('dungeon.json'), M = read('mobs.json'), S = read('shop.json').drop, E = read('events.json'), SO = read('social.json');
  const hi = 1.3 * (1 + (SO.dao_lu?.bonus || 0)), bc = {};   // coinDrop: × (0,7 + ngẫu nhiên × 0,6), đạo lữ + bonus
  for (const id of read('config.json').maps) {
    const m = read(`maps/${id}.json`);
    if (!(m.rooms || []).length || m.demon) continue;   // Phương Thiên Địa (Ma Vương) không tính lượt bí cảnh
    let roi = 0, n = 0;
    for (const r of m.rooms) for (const { mob, n: k = 1 } of r.mobs || []) {
      if (!M[mob]?.qi) continue;
      roi += k * M[mob].qi * S.per_qi * (M[mob].ai === 'boss' ? S.boss_mul : 1) * hi; n += k;
    }
    bc[id] = [D.coin_dun?.[id]?.coins_mul || 1, Math.ceil(roi), n];
  }
  return { luot: D.per_day, buoc: D.steps, nhich: D.reward_step, cap: D.reward_tier, thuong: D.modes.map(m => m.reward?.coins || 0), tuan: E.weekly.map(w => w.mul?.coin || 1), bc };
}

// Một lượt ở bậc L trở xuống (L đếm từ 0) của bí cảnh id cộng nhiều nhất bao nhiêu Linh Thạch: cùng phép tính với hàm p2d_mien_bi_canh
// trên máy chủ (phép thử trong migration so hai bên). tuan: hệ số sự kiện tuần đang chạy. Qua cấp cuối (Vô Gian 2, 3…) thưởng cấp
// quay vòng theo bậc nên lấy mức nhích cao nhất; + 1 và + 2 mỗi quái: phần làm tròn.
export function bcLuot(c, id, L, tuan = 1) {
  const b = c.bc[id], cap = Math.floor(L / c.buoc), buoc = L % c.buoc, cuoi = c.thuong.length - 1;
  const len = x => Math.ceil(x - 1e-9);   // máy chủ tính bằng số thập phân đúng, ở đây số thực lệch một phần tỉ
  if (!b) return 0;
  return len(c.thuong[Math.min(cap, cuoi)] * b[0] * (1 + c.nhich * (cap > cuoi ? c.buoc - 1 : buoc))) + 1
    + len(b[1] * c.cap ** cap * (1 + c.nhich * buoc) * tuan) + 2 * b[2];
}

// Tiềm năng và Kỹ năng (migration 20261122030000_p2d_tiem_ky_nang.sql, bảng p2d_ky_cfg dòng 'tn'): máy chủ quay huyết mạch đúng như máy khách
// (src/game/tiem-nang.js quay), kẹp điểm tiềm năng, kiểm tổng sách kỹ năng. kn.nv[k]: số của nhiệm vụ chính ở bước truyện k (đếm như src/game/story.js:
// các bậc trước bước rồi tới bước), để máy chủ biết người chơi đã qua mấy mốc nhận sách trống.
export function tnCfg(read) {
  const T = read('tiem-nang.json'), K = read('ky-nang.json'), S = read('story.json'), B = S.bac || {};
  const nv = []; let n = 0;
  for (const s of S.steps) { for (const u of B.truoc?.[s.id] || []) if (u.goal) n++; if (s.goal || B.buoc?.[s.id]?.goal) n++; nv.push(n); }
  return {
    toc: Object.fromEntries(Object.entries(T.toc).map(([id, t]) => [id, { w: t.w, huong: t.huong }])), tong: T.quay.tong, lech: T.quay.lech,
    diem: { moi: T.diem.moi, tran: T.diem.tran, tran_rieng: T.diem.tran_rieng || {}, chi_so: T.diem.chi_so },
    kn: { nv, moc: K.moc.moi, sach_moc: K.moc.sach, co: Object.values(K.hoc).map(h => h.co), ids: Object.keys(K.chieu), ghep: K.sach.ghep, max: K.sach.max },
  };
}

// So hai giá trị JSON không kể thứ tự khoá
export const sameJson = (a, b) => {
  const norm = v => Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : v;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
};

// node tools/ky-cfg.mjs: chuỗi JSON dòng 'cfg' · node tools/ky-cfg.mjs bi_canh: dòng 'bi_canh' · node tools/ky-cfg.mjs tn: dòng 'tn'
if (process.argv[1]?.endsWith('ky-cfg.mjs')) { const read = f => JSON.parse(readFileSync(join('data', f), 'utf8')); console.log(JSON.stringify(process.argv[2] === 'bi_canh' ? bcCfg(read) : process.argv[2] === 'tn' ? tnCfg(read) : kyCfg(read))); }
