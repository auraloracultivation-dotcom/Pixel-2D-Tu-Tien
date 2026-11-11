// Hệ Pháp Bảo Luyện Chế (chủ dự án 12/11/2026; số ở data/phap-bao.json): trạng thái, chỉ số gốc, mặc 3 ô, khảm chiêu, nâng cấp, đục ô.
// Đợt 1 chỉ tài khoản trong test_uid (Hoa Than): 3 nút chiêu thành 3 nút pháp bảo (src/game/phap-bao-run.js tung đòn).
// Bản lưu: save.phapBao = { items: [{ uid, type, grade, lv, slots, mods: [id|null ×3], miss }], wear: [uid|null ×3], stones, next }.
// Chưa có máy chủ kiểm: dữ liệu đi trong bản lưu như khoá thường (đợt sau thêm hàm máy chủ quay số ô, kiểm Đá Khai Khiếu).
const totalLayer = (save, R) => save.realm * R.layers + (save.layer - 1);   // như stats.js (không nhập để khỏi vòng nhập: stats.js gọi pbStats)

export const PB = game => game.data['phap-bao'];
export const pbOn = game => !!(game.owner && PB(game)?.test_uid?.includes(game.owner));
const gradeIdx = (D, g) => Math.max(0, D.grades.findIndex(x => x.id === g));

// Lấy (và lần đầu tạo) trạng thái pháp bảo: tặng bộ khởi đầu cho tài khoản thử
export function pbState(game) {
  const D = PB(game), s = game.save;
  if (!s.phapBao) {
    const st = { items: [], wear: [null, null, null], stones: D.starter.stones, next: 1 };
    for (const [type, grade, slots] of D.starter.items) st.items.push({ uid: st.next++, type, grade, lv: 0, slots, mods: [null, null, null], miss: 0 });
    st.wear = D.starter.wear.map(t => st.items.find(i => i.type === t)?.uid ?? null);
    s.phapBao = st;
  }
  return s.phapBao;
}

export const pbItem = (game, uid) => uid == null ? null : pbState(game).items.find(i => i.uid === uid) || null;
export const pbWorn = game => pbState(game).wear.map(uid => pbItem(game, uid));
export const pbType = (game, it) => it && PB(game).types[it.type];
export const pbGrade = (game, it) => PB(game).grades[gradeIdx(PB(game), it?.grade)];
export const pbName = (game, it) => `${pbType(game, it).name} · ${pbGrade(game, it).name}`;

// Chỉ số gốc một món: base × hệ số phẩm × (1 + per × cấp), làm tròn 1 chữ số
export function pbItemStats(D, it) {
  const T = D.types[it.type], g = D.grades[gradeIdx(D, it.grade)], k = g.mul * (1 + D.level.per * (it.lv || 0)), out = {};
  for (const [s, v] of Object.entries(T.base)) out[s] = Math.round(v * k * 10) / 10;
  return out;
}

// Cộng chỉ số 3 món đang mặc (src/game/stats.js playerStats gọi; chỉ bản lưu có phapBao mới có)
export function pbStats(save, data) {
  const st = save.phapBao, D = data['phap-bao'], out = {};
  if (!st || !D) return out;
  for (const uid of st.wear || []) {
    const it = uid != null && st.items.find(i => i.uid === uid);
    if (!it || !D.types[it.type]) continue;
    for (const [s, v] of Object.entries(pbItemStats(D, it))) out[s] = (out[s] || 0) + v;
  }
  return out;
}

// Chiêu khảm đã mở theo tổng tầng tu (mods.*.at)
export const modOpen = (game, id) => totalLayer(game.save, game.data.realms) >= (PB(game).mods[id]?.at ?? 99);
export const modNeed = (game, id) => { const n = PB(game).mods[id].at, R = game.data.realms; return `${R.names[Math.floor(n / R.layers)]} tầng ${n % R.layers + 1}`; };
// Chiêu đang khảm của một món theo thứ tự ô (bỏ ô trống, chỉ trong số ô đang có)
export const pbMods = (game, it) => (it?.mods || []).slice(0, it?.slots || 0).filter(id => id && PB(game).mods[id]);

// Mặc món uid vào ô i (đang ở ô khác thì đổi chỗ); ô vừa đổi chờ swap_cd giây
export function pbWear(game, i, uid) {
  const st = pbState(game), j = st.wear.indexOf(uid);
  if (j === i) return;
  if (j >= 0) st.wear[j] = st.wear[i];
  st.wear[i] = uid;
  const p = game.player, cd = PB(game).swap_cd;
  if (p?.skillCd) { p.pbCdMax ||= []; for (const k of j >= 0 ? [i, j] : [i]) { p.skillCd[k] = Math.max(p.skillCd[k] || 0, cd); p.pbCdMax[k] = Math.max(p.skillCd[k], 0.01); } }
  done(game);
}

// Khảm chiêu id vào ô k của món (null: tháo). Chiêu phải đã mở; ô phải trong số ô đang có.
export function pbSocket(game, it, k, id) {
  if (!it || k < 0 || k >= it.slots) return false;
  if (id && !modOpen(game, id)) return false;
  it.mods[k] = id || null;
  done(game);
  return true;
}

// Nâng cấp: tốn linh thạch, không thất bại; cấp tối đa theo cảnh giới
export const pbCap = game => { const c = PB(game).level.cap; return c[Math.min(c.length - 1, game.save.realm || 0)]; };
export function pbUpCost(game, it) {
  const L = PB(game).level;
  return Math.round(L.base * Math.pow(L.grow, it.lv || 0) * (1 + 0.5 * gradeIdx(PB(game), it.grade)));
}
export function pbUpgrade(game, it) {
  const U = PB(game).ui;
  if ((it.lv || 0) >= pbCap(game)) return U.cap;
  const c = pbUpCost(game, it);
  if ((game.save.lingshi || 0) < c) return U.no_ls;
  game.save.lingshi -= c; it.lv = (it.lv || 0) + 1;
  game.sfx?.('anvil');
  done(game);
  return null;
}

// Đục ô: tỉ lệ theo số ô đang có, hụt pity lần liên tiếp thì lần sau chắc chắn
export function pbDrill(game, it) {
  const D = PB(game), U = D.ui, st = pbState(game);
  if (it.slots >= 3) return { msg: U.max };
  if ((st.stones || 0) <= 0) return { msg: U.no_stone };
  st.stones--;
  const ok = (it.miss || 0) >= D.drill.pity || Math.random() < D.drill.rate[it.slots - 1];
  if (ok) { it.slots++; it.miss = 0; game.sfx?.('rare'); } else { it.miss = (it.miss || 0) + 1; game.sfx?.('anvil'); }
  done(game);
  return { ok, msg: ok ? U.drill_ok : U.drill_fail.replace('{n}', it.miss).replace('{pity}', D.drill.pity) };
}

function done(game) { game.refreshStats?.(); game.persist?.(); }
