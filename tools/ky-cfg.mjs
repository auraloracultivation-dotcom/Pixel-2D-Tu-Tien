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
  };
}

// So hai giá trị JSON không kể thứ tự khoá
export const sameJson = (a, b) => {
  const norm = v => Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : v;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
};

if (process.argv[1]?.endsWith('ky-cfg.mjs')) console.log(JSON.stringify(kyCfg(f => JSON.parse(readFileSync(join('data', f), 'utf8')))));
