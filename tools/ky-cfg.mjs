// Số máy chủ cần để tự tẩy luyện, cường hoá, đổi hệ, kiểm chữ ký món (bảng p2d_ky_cfg, migration 20261105010000_p2d_ky_mon.sql).
// tools/check.mjs so bảng trong migration mới nhất với số dựng từ data/ ở đây. Đổi số trong data/ thì chạy
// `node tools/ky-cfg.mjs` lấy chuỗi JSON mới, thêm migration mới: insert into public.p2d_ky_cfg ... on conflict do update.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export function kyCfg(read) {
  const I = read('items.json'), G = read('gear.json'), E = read('elements.json'), D = read('daovan.json');
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
    ngoc: { types: Object.keys(I.gems.types), max: I.gems.max_level },
    pb_max: G.refine.max,
  };
}

// So hai giá trị JSON không kể thứ tự khoá
export const sameJson = (a, b) => {
  const norm = v => Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map(k => [k, norm(v[k])])) : v;
  return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
};

if (process.argv[1]?.endsWith('ky-cfg.mjs')) console.log(JSON.stringify(kyCfg(f => JSON.parse(readFileSync(join('data', f), 'utf8')))));
