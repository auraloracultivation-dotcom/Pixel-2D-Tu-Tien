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
    tay: { base: f.base, realm_mul: f.realm_mul, r: f.r, decay: f.decay, line_mul: f.line_mul || 1, cost: I.reroll_cost, free: lt.free },
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
    cuoi: { ids: Object.keys(P.mounts), gia: P.shop.mounts, roi, starter: P.starter_mount },
    dong: { pool: B.pool, phi: [B.reroll.coins, B.reroll.mul], mats: B.reroll.mats, mpool: B.mount.pool, mphi: B.mount.reroll.coins, mmats: B.mount.reroll.mats },
    thoi: { pool: FB.pool, bo, look: Object.keys(H.list), def: H.default, tn: Object.fromEntries(TP.shop.filter(x => x.outfit).map(x => [x.id, x.outfit])) },
    chieu: { ids: Object.keys(SK).filter(k => !k.startsWith('_')), max: K.max, mat: K.mat, book: [K.book_base, K.book_r], coins: [K.coins_base, K.coins_r] },
    dong_phu: V.levels.slice(1).map(l => [l.realm || 0, l.coins || 0, l.cost || {}]),
    sv: { exp_k: { pet: sv.exp_k.pet, comp: sv.exp_k.comp, tech: ts.exp_k }, sao: sv.sao, moi: sv.moi, cuoi: sv.cuoi, cp_moi: ts.moi, ban: sv.ban, dau: sv.dau },
  };
}

// So hai giá trị JSON không kể thứ tự khoá
export const sameJson = (a, b) => {
  const norm = v => Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : v;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
};

if (process.argv[1]?.endsWith('ky-cfg.mjs')) console.log(JSON.stringify(kyCfg(f => JSON.parse(readFileSync(join('data', f), 'utf8')))));
