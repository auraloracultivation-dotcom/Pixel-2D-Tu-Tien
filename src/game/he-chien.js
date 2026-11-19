// Hệ chiến đấu mới (docs/11-HE-CHIEN-DAU.md; số ở data/he-chien.json; chủ dự án 16/11/2026 13:35–14:26).
// Thuần tính toán: không đụng màn hình, không gọi mạng, chạy được trong Node (tools/he-chien.test.mjs).
// 14 món: 6 trang bị theo ô, linh thú, thú cưỡi, 4 pháp bảo, 2 khôi lỗi. Chỉ 6 trang bị mang cảnh giới lúc nhặt
// (it.lvl = tầng tu lúc rơi); pháp bảo, linh thú, thú cưỡi, khôi lỗi lớn theo cảnh giới của chủ.
// Chỉ số trả về (sumStats): hp, atk, def phẳng; crit, cd (ST bạo thêm), cdr, ls, thorns tính bằng %; spd: đòn mỗi giây đã tính chiêu.
import { mountKeyOf } from './inst.js';

export const HC = data => data?.['he-chien'];
// Bật cho tài khoản này chưa: on (mọi người) hoặc tài khoản chơi thử (test_uid, như phap-bao.json)
export const hcOn = game => { const H = HC(game?.data); return !!(H && (H.on || (game.owner && H.test_uid?.includes(game.owner)))); };

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const GEAR = ['vu-khi', 'mu', 'giap', 'giay', 'ngoc-boi', 'nhan'];
export const PCT = ['atk_pct', 'hp_pct', 'def_pct', 'crit', 'crit_dmg', 'cdr', 'lifesteal', 'thorns'];
const LAYERS = 9;

export const capOf = (H, realm) => H.plus_cap[clamp(realm | 0, 0, H.plus_cap.length - 1)];
export const flatK = (H, pham, ir) => H.realm_grow ** ir * (1 + H.pham_step / 100 * pham);
export const linesOf = (H, pham) => H.lines[clamp(pham | 0, 0, H.lines.length - 1)];
export const tempo = (H, cdr) => 1 + H.skill_share / 100 * (1 / (1 - Math.min(cdr, 60) / 100) - 1);
// Hệ số nhận sát thương: đòn có lực công atk đánh vào người có Thủ def (Công gấp đôi Thủ thì ăn 2/3)
export const takeK = (atk, def) => (atk > 0 ? atk / (atk + Math.max(0, def || 0)) : 1);

// Giá trị một dòng theo màu t (frac 0..1 trong khoảng của màu), đã nhân hệ số của chỉ số k
export function lineVal(H, k, t, frac = 0.5) {
  const T = H.tiers[clamp(t | 0, 0, H.tiers.length - 1)];
  return (T.min + frac * (T.max - T.min)) * (H.line_f[k] ?? 1);
}
// Kỳ vọng một dòng (chưa nhân hệ số), theo trọng số màu
export const expLine = H => { const W = H.tiers.reduce((s, t) => s + t.w, 0); return H.tiers.reduce((s, t) => s + t.w / W * (t.min + t.max) / 2, 0); };

// Dòng cũ { s, v, t } → dòng mới { k, v, t }; null nếu không tính vào sức đánh. Giá trị lấy theo màu dòng (giữa khoảng),
// không lấy số cũ: dòng cũ nhân theo cấp món và màu tới 4,6 lần, có cả số sai do hack.
export function mapLine(H, l) {
  const k = H.line_from[l?.s];
  if (!k) return null;
  const t = Number.isInteger(l.t) ? clamp(l.t, 0, H.tiers.length - 1) : 0;
  return { k, v: lineVal(H, k, t), t };
}
// Các dòng được tính của một món: đổi sang dòng mới, giữ những dòng màu cao nhất. Chủ dự án 16/11/2026 16:20 "giữ hên xui":
// số dòng vẫn theo trần ẩn 1–10 của tẩy luyện, mọi dòng đều tính (H.lines_all, tối đa H.lines_max); trần từng chỉ số chặn không cho lố.
export const keptLines = (H, lines, pham) =>
  (lines || []).map(l => mapLine(H, l)).filter(Boolean).sort((a, b) => b.t - a.t || b.v - a.v).slice(0, H.lines_all ? H.lines_max ?? 10 : linesOf(H, pham));

// Phẩm 0..6 của trang bị: theo màu dòng trung bình (như tiers.js quality), chưa có dòng màu thì theo độ hiếm cũ
export function itemPham(data, it) {
  const ls = (it?.lines || []).filter(l => Number.isInteger(l.t));
  if (ls.length) return clamp(Math.round(ls.reduce((a, l) => a + l.t, 0) / ls.length), 0, 6);
  return Math.max(0, (data?.items?.rarities || []).findIndex(r => r.id === it?.rarity));
}

// Cộng chỉ số chính của một món vào out. kind: khoá trong H.pieces; ir: cảnh giới của món (số thực); plus: cấp đã kẹp trần.
// Số phẳng (hp, atk, def) lớn theo cảnh giới, phẩm, cấp; số [a, b] là % = a + b × phẩm.
export function addPiece(H, out, kind, pham, ir, plus) {
  const P = H.pieces[kind];
  if (!P) return out;
  const k = flatK(H, pham, ir) * (1 + H.plus_per / 100 * plus);
  for (const [s, v] of Object.entries(P)) out[s] = (out[s] || 0) + (Array.isArray(v) ? v[0] + v[1] * pham : v * k);
  return out;
}

// Ngọc đang khảm của một món ("hong-ngoc:5") → [{ k, v }] theo H.gems (mỗi cấp + %); số lỗ theo phẩm
export function gemLines(H, sockets, pham) {
  const n = H.sockets?.[clamp(pham | 0, 0, 6)] ?? 3;
  return (sockets || []).filter(Boolean).slice(0, n).map(g => {
    const [type, lv] = String(g).split(':'), G = H.gems?.[type];
    return G ? { k: G[0], v: G[1] * clamp(Number(lv) || 0, 0, 20) } : null;
  }).filter(Boolean);
}

// Danh sách món đang mang của một bản lưu: [{ kind, pham, ir, plus, lines, gems, nl }]
export function loadout(save, data) {
  const H = HC(data), realm = save?.realm || 0, layer = realm * LAYERS + Math.max(0, (save?.layer || 1) - 1), cap = capOf(H, realm);
  const own = layer / LAYERS, out = [];
  for (const slot of GEAR) {
    const uid = save?.equip?.[slot], it = uid != null && (save.bag || []).find(i => i.uid === uid);
    if (!it) continue;
    const pham = itemPham(data, it);
    out.push({ slot, kind: slot, pham, ir: Math.min(it.lvl || 0, layer) / LAYERS, plus: Math.min(it.plus || 0, cap), lines: it.lines, gems: gemLines(H, it.sockets, pham) });
  }
  const D = data?.['phap-bao'], st = save?.phapBao;
  if (D && st) {
    const n = D.wear_n || 4;
    (st.wear || []).slice(0, n).forEach((uid, i) => {
      if (i >= 3 && realm < (D.slot4_realm ?? H.pb4_realm)) return;   // ô thứ 4 mở ở Nguyên Anh
      const it = uid != null && (st.items || []).find(x => x.uid === uid), T = it && D.types[it.type];
      if (!T) return;
      const g = Math.max(0, D.grades.findIndex(x => x.id === it.grade));
      out.push({ slot: 'phap-bao', kind: T.group === 'thu' ? 'pb-thu' : 'pb-cong', pham: g, ir: own, plus: Math.min(it.lv || 0, cap), lines: [], nl: true });
    });
  }
  const beast = (kind, b) => b && out.push({ slot: kind, kind, pham: clamp((b.star || 0) + (b.evo ? 1 : 0), 0, 6), ir: own, plus: Math.min(b.lv || 0, cap), lines: b.lines });
  if (save?.pet) beast('linh-thu', save.pets?.[save.pet]);
  for (const id of [save?.companion, save?.companion2]) if (id) beast('khoi-loi', save.comps?.[id]);
  if (save?.mount) {   // thú cưỡi không có cấp: lớn theo chủ (chạm trần), phẩm theo màu dòng của nó
    const l = save.mountLine?.[mountKeyOf(save)];   // bản đang chọn (src/game/inst.js)
    out.push({ slot: 'thu-cuoi', kind: 'thu-cuoi', pham: Number.isInteger(l?.t) ? l.t : 0, ir: own, plus: cap, lines: l?.s ? [l] : [] });
  }
  return out;
}

// Bộ đồ của tu sĩ chuẩn (mốc làm quái): đủ món, phẩm std_pham, cấp chạm trần (+ thêm), dòng trung bình, ngọc std_gem.
// realm có thể lẻ (quái theo tầng: tầng / 9). Cảnh giới có std_kit (Luyện Khí) thì dùng bộ thật hơn: ít món, phẩm, cấp thấp.
export function stdList(H, realm, extra = 0) {
  const r = clamp(Math.floor(realm), 0, H.std_pham.length - 1), ir = realm;
  const kit = H.std_kit_new && realm * LAYERS <= H.std_kit_new.to_tang + 1e-9 ? H.std_kit_new : H.std_kit?.[r];   // người mới: quái tầng 0–1 cân theo người vừa cầm kiếm
  const pham = kit?.pham ?? H.std_pham[r], plus = (kit?.plus ?? capOf(H, r)) + extra, gp = H.std_gem?.[r] || 0;
  const gems = gp ? [{ k: 'atk_pct', v: gp }, { k: 'hp_pct', v: gp }, { k: 'def_pct', v: gp }, { k: 'crit', v: gp / 2 }] : [];
  const kinds = kit?.kinds || [...GEAR, 'linh-thu', 'thu-cuoi', 'khoi-loi', 'khoi-loi', 'pb-cong', 'pb-thu', 'pb-cong', ...(r >= H.pb4_realm ? ['pb-thu'] : [])];
  return kinds.map((kind, i) => ({ kind, pham, ir, plus, nl: kind.startsWith('pb-'), gems: i === 0 ? gems : [] }));
}

// Cộng chỉ số chính, dòng và ngọc của một danh sách món ra chỉ số cuối. avg: dòng tính theo kỳ vọng (tu sĩ chuẩn, quái).
// add: phần ngoài 14 món của người chơi thật: add.lines (dòng thời trang, tính chung trần dòng), add.pct (công pháp, bộ đồ,
// Đạo Vận, đan dược: đã kẹp trần riêng của từng nguồn, cộng ngoài như ngọc).
export function sumStats(H, realm, list, avg = false, add = null) {
  const main = {}, L = {}, G = {}, e = expLine(H);
  for (const p of list) {
    addPiece(H, main, p.kind, p.pham, p.ir, p.plus);
    for (const g of p.gems || []) G[g.k] = (G[g.k] || 0) + g.v;
    if (p.nl) continue;
    if (avg) { const n = linesOf(H, p.pham); for (const k of PCT) L[k] = (L[k] || 0) + e * (H.line_f[k] ?? 1) * n / PCT.length; }
    else for (const l of keptLines(H, p.lines, p.pham)) L[l.k] = (L[l.k] || 0) + l.v;
  }
  for (const l of add?.lines || []) L[l.k] = (L[l.k] || 0) + l.v;
  const B = H.base, g = B.grow ** realm, gem = k => Math.min(G[k] || 0, H.gem_cap?.[k] ?? 0);
  // Dòng + chỉ số chính %: càng dồn càng ít thêm (như hyp của plunworld): x × M / (x + M), không bao giờ vượt M.
  // H.soft[k] = M; thiếu thì dùng trần cứng H.cap[k]. Ngọc có trần riêng, cộng ngoài.
  const soft = (k, x) => { const m = H.soft?.[k]; return Math.min(m ? x * m / (x + m) : x, H.cap?.[k] ?? 999); };   // càng dồn càng ít thêm, và không quá trần cứng
  const cap = k => soft(k, (L[k] || 0) + (main[k] || 0)) + gem(k) + (add?.pct?.[k] || 0);
  const s = {
    hp: Math.round((B.hp * g + (main.hp || 0)) * (1 + cap('hp_pct') / 100)),
    atk: Math.round((B.atk * g + (main.atk || 0)) * (1 + cap('atk_pct') / 100)),
    def: Math.round((B.def * g + (main.def || 0)) * (1 + cap('def_pct') / 100)),
    crit: B.crit + cap('crit'), cd: cap('crit_dmg'), cdr: cap('cdr'), ls: cap('lifesteal'), thorns: cap('thorns'),
  };
  s.spd = B.spd * tempo(H, s.cdr);
  return s;
}

const memo = new WeakMap();
// Tu sĩ chuẩn của cảnh giới (nhớ theo bảng luật)
// Tu sĩ chuẩn theo tầng, nối mượt giữa các mốc: người mới (tầng 0), rồi giữa mỗi cảnh giới (tầng 4, 13, 22…) theo bộ đồ của cảnh giới đó.
// Giữa hai mốc: Máu, Công, Thủ nhân dần (theo cấp số nhân), chỉ số % cộng dần; tránh quái hai đảo sát tầng mà lệch nhau gấp đôi.
const anchor = (H, tang, extra) => sumStats(H, tang / LAYERS, stdList(H, tang / LAYERS, extra), true);
export function stdPlayer(H, realm, extra = 0) {
  let m = memo.get(H);
  if (!m) memo.set(H, m = {});
  const key = `${realm}:${extra}`;
  if (m[key]) return m[key];
  const n = H.std_pham.length, T = clamp(realm * LAYERS, 0, n * LAYERS - 1);
  const marks = [0, ...Array.from({ length: n }, (_, r) => r * LAYERS + 4)];   // tầng mốc
  let i = marks.findIndex((t, j) => T >= t && (j === marks.length - 1 || T < marks[j + 1]));
  if (i === marks.length - 1) i = marks.length - 2;   // sau mốc cuối: nối theo hai mốc cuối
  const t0 = marks[i], t1 = marks[i + 1], f = (T - t0) / (t1 - t0);
  const a = anchor(H, t0, extra), b = anchor(H, t1, extra), geo = k => Math.round(a[k] * (b[k] / a[k]) ** f), lin = k => a[k] + (b[k] - a[k]) * f;
  return m[key] = { hp: geo('hp'), atk: geo('atk'), def: geo('def'), crit: lin('crit'), cd: lin('cd'), cdr: lin('cdr'), ls: lin('ls'), thorns: lin('thorns'), spd: lin('spd') };
}

// Lực chiến: căn của (máu hiệu dụng trước đòn tu sĩ chuẩn × sát thương mỗi giây) × power_k. Người chơi thật mang s.realm
// (so với người chuẩn của chính cảnh giới đó, xem hồ sơ người khác vẫn đúng số). power_k = 40: số lực chiến cỡ như luật cũ
// (người Trúc Cơ giữa ~26 nghìn), các mốc đang dùng số lực chiến (thành tựu, Khai Hoang 10% lực chiến trùm) vẫn hợp.
export function powerOf(H, s, realm) {
  const r = s.realm ?? realm;
  const ref = stdPlayer(H, clamp(r | 0, 0, H.std_pham.length - 1) + 4 / LAYERS), a0 = Math.max(1, ref.atk), d0 = ref.def;   // tu sĩ chuẩn giữa cảnh giới (tầng 5)
  const ehp = s.hp / takeK(a0, s.def) * (1 + ((s.ls || 0) + (s.thorns || 0)) / 100);   // máu chịu được trước đòn của người chuẩn
  const dps = s.atk * takeK(s.atk, d0) * (s.spd || H.base.spd) * (1 + (s.crit || 0) / 100 * ((H.base.crit_mult + (s.cd || 0)) / 100 - 1));   // sát thương mỗi giây vào người chuẩn
  return Math.round(Math.sqrt(ehp * dps) * (H.power_k ?? 10));
}

// Quái theo loài: H.mobs[id] = [tầng quái, vai trò]; lệch theo kiểu đánh (bắn xa ít máu, công cao; đứng yên nhiều máu, công thấp).
// Loài chưa có trong bảng: tầng theo fallback (tầng của bãi), boss → boss_dao. Trả null nếu không áp (Mộc Nhân, đầu boss thế giới…).
export function mobFor(H, id, def = {}, fallback = 0) {
  if (def.dummy || def.ai === 'dummy' || def.wboss) return null;
  const e = H.mobs?.[id], tang = e ? e[0] : fallback, role = e ? e[1] : def.ai === 'boss' ? 'boss_dao' : 'thuong';
  return { tang, role, ...mobStats(H, tang / LAYERS, role, H.ai_net?.[def.ai]) };
}

// Quái: tu sĩ chuẩn cùng cảnh giới (cấp thêm theo vai trò) nhân theo vai trò. net: lệch riêng của loài { hp, atk, def, spd } (±25%)
export function mobStats(H, realm, role = 'thuong', net = null) {
  const r = H.roles[role] || H.roles.thuong, b = stdPlayer(H, realm, r.plus || 0), n = k => clamp(net?.[k] ?? 1, 0.75, 1.25);
  return {
    hp: Math.round(b.hp * r.hp * n('hp')), atk: Math.round(b.atk * r.atk * n('atk')), def: Math.round(b.def * r.def * n('def')),
    spd: +(b.spd * r.spd * n('spd')).toFixed(3), crit: b.crit + (r.crit || 0), cd: b.cd + (r.crit_dmg || 0),
    ls: b.ls + (r.lifesteal || 0), thorns: b.thorns + (r.thorns || 0),
  };
}

// Nguồn ngoài 14 món theo luật cũ (công pháp, bộ đồ, Đạo Vận) → % luật mới. Số phẳng Công / Máu / Thủ đổi ra % theo tổng luật cũ
// (base); mỗi chỉ số kẹp trần capK tính theo Công % tương đương (trần × tỷ giá dòng line_f). Chủ dự án 16/11/2026 16:20 "thưởng nhỏ có trần".
const FLAT = { atk: 'atk_pct', hp: 'hp_pct', def: 'def_pct' };
export function extraPct(H, map, base, capK) {
  const out = {};
  for (const [k, v] of Object.entries(map || {})) {
    const nk = FLAT[k] || H.line_from[k];
    if (!v || !nk) continue;
    out[nk] = (out[nk] || 0) + (FLAT[k] ? (base?.[k] > 0 ? v / base[k] * 100 : 0) : v);
  }
  for (const k of Object.keys(out)) out[k] = clamp(out[k], 0, capK * (H.line_f[k] ?? 1));
  return out;
}

// Chỉ số người chơi theo luật mới, cùng dạng với stats.js playerStats (old: kết quả luật cũ, giữ phần ngoài trận:
// tốc chạy, tốc tu, linh lực). ext: phần ngoài 14 món của luật cũ { outfit: dòng thời trang đang mặc, tech, set, dao: bảng chỉ số
// công pháp / bộ đồ / Đạo Vận, pill: Máu đan Bồi Nguyên }. Thêm hc: chỉ số gốc của luật mới (lực chiến, sát thương).
export function playerStatsHC(save, data, old = {}, ext = {}) {
  const H = HC(data), E = H.extra_cap || {}, base = { atk: old.atk, hp: old.maxHp, def: old.def }, pct = {};
  const put = m => { for (const [k, v] of Object.entries(m)) pct[k] = (pct[k] || 0) + v; };
  put(extraPct(H, ext.tech, base, E.tech ?? 10));
  put(extraPct(H, ext.set, base, E.set ?? 6));
  put(extraPct(H, ext.dao, base, E.dao ?? 6));
  if (ext.pill > 0 && base.hp > 0) put({ hp_pct: Math.min(ext.pill / base.hp * 100, (E.pill ?? 5) * (H.line_f.hp_pct ?? 1)) });
  const ol = ext.outfit && mapLine(H, ext.outfit), realm = save?.realm || 0;   // thời trang: một dòng như dòng tẩy luyện cùng màu (16:20)
  const s = sumStats(H, realm, loadout(save, data), false, { lines: ol ? [ol] : [], pct });
  s.realm = realm;
  const k = old.maxHp > 0 ? s.hp / old.maxHp : 1;   // hồi máu luật cũ (số phẳng + % máu) theo cỡ máu mới
  return {
    ...old, maxHp: s.hp, atk: s.atk, def: s.def, crit: s.crit / 100, critMult: (H.base.crit_mult + s.cd) / 100,
    cdr: s.cdr / 100, lifesteal: s.ls / 100, thorns: s.thorns / 100, dr: 0, regen: (old.regen || 0) * k, hc: s,
  };
}

// Hệ số trận thật theo vai trò và tầng quái (data/he-chien.json → game_k: mốc tầng, mỗi vai trò một dãy hệ số, nối thẳng giữa các mốc,
// ngoài mốc đầu / cuối giữ nguyên). Chưa khai game_k thì dùng hp_game / atk_game cũ (một số cho mọi tầng).
export function gameK(H, key, role, tang) {
  const G = H.game_k, a = G?.[key]?.[role];
  if (!G || !a) return (key === 'hp' ? H.hp_game : H.atk_game)?.[role] ?? 1;
  const T = G.tang;
  if (tang <= T[0]) return a[0];
  for (let i = 1; i < T.length; i++) if (tang <= T[i]) return a[i - 1] + (a[i] - a[i - 1]) * (tang - T[i - 1]) / (T[i] - T[i - 1]);
  return a[a.length - 1];
}

// Bật luật mới cho cả bảng số (gọi một lần sau khi nạp data, src/main.js): quái lấy máu, công theo cảnh giới × vai trò
// (mobFor); công mỗi đòn = công mỗi giây × nhịp đánh thật của con quái (vồ + nghỉ), đã tính bạo kích trung bình. def.hc giữ chỉ số
// gốc cho combat.js (Công đọ Thủ, takeK) và lực chiến quái. Tắt áp chế lực chiến và hệ số đảo của luật cũ (trừ tinh cầu Khai Hoang);
// bí cảnh mỗi bậc nhẹ đi.
export function hcData(data) {
  const H = HC(data);
  if (!H?.on || data._hc) return data;
  data._hc = true;
  for (const [id, d] of Object.entries(data.mobs || {})) {
    if (id.startsWith('_') || !d || typeof d !== 'object' || H.skip_mobs?.includes(id)) continue;
    const m = mobFor(H, id, d);
    if (!m) continue;
    m.atk *= gameK(H, 'atk', m.role, m.tang);   // trận thật: người chơi có pháp bảo, linh thú, chiêu nên mạnh hơn mô hình nhiều (đo bằng Playwright 16/11)
    const cyc = Math.max(0.5, (d.windup || 0) + (d.cd || 1)), ca = 1 + m.crit / 100 * ((H.base.crit_mult + m.cd) / 100 - 1);
    const hit = +(m.atk * m.spd * cyc * ca).toFixed(2);
    data.mobs[id] = { ...d, hp: Math.round(m.hp * gameK(H, 'hp', m.role, m.tang)), atk: hit, hc: { tang: m.tang, role: m.role, atk: m.atk, def: m.def, hit, old: { hp: d.hp, atk: d.atk } } };
  }
  const C = data.config || {};
  if (C.cp_press) C.cp_press = { ...C.cp_press, on: false };
  if (C.mob_cp) C.mob_cp = { ...C.mob_cp, kh_only: true };   // hệ số đảo chỉ còn cho tinh cầu Khai Hoang (mức lực chiến theo cấp, mob-power.js)
  if (data.dungeon && H.dun_step_mul) data.dungeon = { ...data.dungeon, step_mul: H.dun_step_mul };
  const D = data.demon;
  if (D?.base) {   // Ma Vương tuần (Phương Thiên Địa): boss đảo của cảnh giới mở cửa, rồi nhân theo bậc như cũ
    const b = mobStats(H, (D.need_realm * LAYERS + 4) / LAYERS, H.demon_role || 'boss_dao');
    data.demon = { ...D, base: { hp: b.hp, atk: +(b.atk * b.spd * 1.4).toFixed(2) } };
  }
  return data;
}

// Hiển thị theo luật mới (túi đồ, chợ, nghi lễ nhận thưởng, hồ sơ): chữ một dòng tẩy luyện (null: dòng không tính vào trận như tốc
// chạy, hấp thu linh khí, giữ chữ cũ), một viên ngọc, chỉ số chính một món trang bị khi người đang xem mặc (cảnh giới món, cấp kẹp trần).
const fmt = v => (Math.round(v * 10) / 10).toLocaleString('vi-VN');
export function hcLineText(H, l) { const m = mapLine(H, l); return m ? `${H.ten?.[m.k] || m.k} +${fmt(m.v)}%` : null; }
export function hcGemText(H, g) {
  const [type, lv] = String(g).split(':'), G = H.gems?.[type];
  return G ? `${H.ten?.[G[0]] || G[0]} +${fmt(G[1] * clamp(Number(lv) || 0, 0, 20))}%` : null;
}
// Dòng tổng chỉ số trong túi đồ: Sinh lực, Công, Phòng ngự phẳng; các chỉ số % (s: kết quả sumStats)
export function hcSummary(H, s) {
  const T = H.ten || {}, pc = [['crit', s.crit], ['crit_dmg', s.cd], ['cdr', s.cdr], ['lifesteal', s.ls], ['thorns', s.thorns]].filter(([, v]) => v > 0.05);
  return [`${T.hp_pct || 'Sinh lực'} ${Math.round(s.hp).toLocaleString('vi-VN')}`, `${T.atk_pct || 'Công'} ${Math.round(s.atk).toLocaleString('vi-VN')}`, `${T.def_pct || 'Phòng ngự'} ${Math.round(s.def).toLocaleString('vi-VN')}`,
    ...pc.map(([k, v]) => `${T[k] || k} ${fmt(v)}%`)].join(' · ');
}
export function hcMain(H, data, save, it) {
  const slot = data?.items?.bases?.[it?.base]?.slot;
  if (!GEAR.includes(slot)) return null;
  const realm = save?.realm || 0, layer = realm * LAYERS + Math.max(0, (save?.layer || 1) - 1), pham = itemPham(data, it);
  const o = addPiece(H, {}, slot, pham, Math.min(it.lvl || 0, layer) / LAYERS, Math.min(it.plus || 0, capOf(H, realm)));
  return Object.fromEntries(Object.entries(o).map(([k, v]) => [k, FLAT[k] ? Math.round(v) : Math.round(v * 10) / 10]));
}

// Công dùng để đọ Thủ của người bị đánh: quái theo luật mới lấy công gốc (nhân theo hệ số bí cảnh, ma khí đã nhân vào công mỗi đòn),
// bản sao so tài lấy Công của người, không rõ thì lấy chính số đòn
export const hitAtk = (who, dmg) => { const h = who?.def?.hc; return h ? h.atk * (who.def.atk / (h.hit || who.def.atk || 1)) : who?.st?.atk || dmg; };
// Hệ số trúng đòn vào quái theo luật mới (Công người đánh đọ Thủ của quái), 1 nếu quái theo luật cũ
export const mobTake = (atk, m) => (m?.def?.hc ? takeK(atk, m.def.hc.def) : 1);
