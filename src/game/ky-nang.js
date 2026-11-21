// Kỹ năng (chủ dự án 21/11/2026 17:23 và hai bảng câu hỏi; docs/15-TIEM-NANG-KY-NANG.md; số và chữ ở data/ky-nang.json): lớp chiêu hồi ngắn giữa đánh
// thường và pháp bảo. Ba ô kỹ năng (nút sk0–sk2, xếp dọc sát mép phải trên khung dưới) mang BỘ KỸ NĂNG MỚI THEO TRUYỆN (data/ky-nang.json → chieu), không
// phải 48 chiêu cũ của data/skills.json (chủ dự án đã bảo xoá). Bộ máy ra chiêu và hiệu ứng dùng lại của game (src/game/skills.js castSkill).
//   - knNap: lúc nạp game đưa các kỹ năng vào bảng chiêu của bộ máy và cho mượn hiệu ứng, biểu tượng, tiếng của chiêu ghi ở hinh.
//   - SÁCH: mỗi kỹ năng là những cuốn sách có cấp (save.knSach { mã: [số cuốn cấp 1, cấp 2, ...] }). Truyện phát cuốn đầu (lệnh { ky_nang: 'khoá' } →
//     hocKyNang). Hai cuốn cùng cấp ghép thành một cuốn cấp trên (ghepSach); cấp kỹ năng = cấp cuốn cao nhất đang có.
//   - knDef: số liệu khi ra chiêu = kỹ năng gốc + thưởng theo cấp sách + các tính chất đang khảm (save.knKham). Ô khảm mở theo cấp sách.
// Hồi chiêu ba ô nằm ở player.knCd (src/game/player.js), không chung với pháp bảo (player.skillCd).
import { pbOn } from './phap-bao.js';
import { totalLayer } from './stats.js';

export const KN = data => data?.['ky-nang'];
export const knOn = game => !!(game?.save && KN(game.data)?.on && pbOn(game));   // chỉ có nghĩa khi 4 nút chiêu cũ đã thành pháp bảo

// Gọi một lần lúc nạp dữ liệu (src/main.js): kỹ năng vào bảng chiêu của bộ máy; mượn hiệu ứng điểm ảnh, biểu tượng, tiếng của chiêu ghi ở hinh
export function knNap(data) {
  const K = KN(data);
  if (!K?.chieu) return data;
  for (const [id, s] of Object.entries(K.chieu)) {
    data.skills[id] = s;
    const h = s.hinh;
    if (!h) continue;
    for (const T of [data.vfx?.px, data.vfx?.skills, data['tieng-chieu']?.by_skill]) if (T?.[h] && !T[id]) T[id] = T[h];
    for (const p of ['pxi.', 'vfx.']) if (data.art?.sprites?.[p + h] && !data.art.sprites[p + id]) data.art.sprites[p + id] = data.art.sprites[p + h];
  }
  return data;
}

// Sách: số cuốn theo cấp, cấp kỹ năng (0 = chưa học)
const sach = (game, id) => game.save.knSach?.[id] || [];
export const knCap = (game, id) => { const a = sach(game, id); for (let i = a.length - 1; i >= 0; i--) if (a[i] > 0) return i + 1; return 0; };
export const knDem = (game, id) => sach(game, id).map((n, i) => [i + 1, n | 0]).filter(x => x[1] > 0);   // [[cấp, số cuốn], ...]
export function nhanSach(game, id, n = 1, lv = 1) {   // nhận thêm sách (truyện phát cuốn đầu; nguồn rơi về sau cũng gọi vào đây)
  if (!KN(game.data).chieu[id]) return false;
  const a = ((game.save.knSach ??= {})[id] ??= []);
  while (a.length < lv) a.push(0);
  a[lv - 1] = (a[lv - 1] | 0) + n; cache.clear();
  return true;
}
export const ghepDuoc = (game, id, lv) => lv < KN(game.data).sach.max && (sach(game, id)[lv - 1] | 0) >= KN(game.data).sach.ghep;
export function ghepSach(game, id, lv) {   // ghep cuốn cấp lv thành 1 cuốn cấp lv + 1
  if (!ghepDuoc(game, id, lv)) return false;
  const a = game.save.knSach[id];
  a[lv - 1] -= KN(game.data).sach.ghep; while (a.length < lv + 1) a.push(0); a[lv] = (a[lv] | 0) + 1; cache.clear();
  return true;
}

// Kỹ năng đã học (có ít nhất một cuốn), theo thứ tự khai trong data; kỹ năng của người chơi này (đã học + sẽ học theo hệ linh căn) để bảng hiện cả ô khoá
export const knMo = game => Object.keys(KN(game.data).chieu).filter(id => knCap(game, id) > 0);
export const knCua = game => Object.values(KN(game.data).hoc).map(h => h.id || h.he?.[game.save.element]).filter(Boolean);

// Khảm: ô đã mở theo cấp sách, tính chất đang khảm, tính chất khảm được
export const knSoO = (game, lv) => KN(game.data).kham.o.filter(x => lv >= x).length;
export const tinhHop = (game, id, m) => { const s = KN(game.data).chieu[id], T = KN(game.data).kham.tinh[m]; return !!(s && T && (!T.hop || T.hop.includes(s.type)) && !(T.pierce && s.pierce)); };
export function knKham(game, id) {   // tính chất đang khảm (đã lọc: hợp kiểu chiêu, không trùng, không quá số ô, đã mở)
  const n = totalLayer(game.save, game.data.realms), T = KN(game.data).kham.tinh, so = knSoO(game, knCap(game, id)), out = [];
  for (const m of game.save.knKham?.[id] || []) if (out.length < so && T[m] && n >= T[m].at && !out.includes(m) && tinhHop(game, id, m)) out.push(m);
  return out;
}
export function khamVao(game, id, m) {
  const dang = knKham(game, id);
  if (dang.length >= knSoO(game, knCap(game, id)) || dang.includes(m) || !tinhHop(game, id, m) || totalLayer(game.save, game.data.realms) < KN(game.data).kham.tinh[m].at) return false;
  (game.save.knKham ??= {})[id] = [...dang, m]; cache.clear();
  return true;
}
export function thaoRa(game, id, m) { (game.save.knKham ??= {})[id] = knKham(game, id).filter(x => x !== m); cache.clear(); }

// Số liệu kỹ năng lúc ra chiêu (bản sao, không sửa dữ liệu gốc): thưởng theo cấp sách rồi tới các tính chất đang khảm
const cache = new Map();
export const knThuong = (game, id, lv = knCap(game, id)) => { const S = KN(game.data).sach, s = KN(game.data).chieu[id]; return 1 + Math.max(0, lv - 1) * (s?.mult ? S.per : S.per_ho_tro); };
export function knDef(game, id) {
  const s = game.data.skills[id];
  if (!s || !knOn(game) || !KN(game.data).chieu[id]) return s;
  const K = KN(game.data), lv = knCap(game, id), mods = knKham(game, id), key = `${id}|${lv}|${mods.join(',')}`;
  if (cache.has(key)) return cache.get(key);
  const o = { ...s }, C = game.data.config.combat, k = knThuong(game, id, lv);
  for (const f of ['mult', 'end_mult', 'amount']) if (o[f]) o[f] *= k;
  for (const m of mods) {
    const T = K.kham.tinh[m];
    if (T.cd) o.cd *= 1 + T.cd;
    if (T.mp) o.mp = Math.max(1, Math.round((o.mp ?? 10) * (1 + T.mp)));
    if (T.mult) for (const f of ['mult', 'end_mult']) if (o[f]) o[f] *= 1 + T.mult;
    if (T.rong) for (const f of ['radius', 'explode', 'dist']) if (o[f]) o[f] = Math.round(o[f] * (1 + T.rong));
    if (T.pierce) o.pierce = true;
    if (T.slow) o.slow = Math.max(o.slow || 0, T.slow);
    if (T.stun) o.stun = Math.max(o.stun || 0, T.stun);
    if (T.toa && o.type === 'projectile') { o.type = 'multi'; o.count = T.toa; o.spread = T.spread; o.mult *= T.mult_k * C.skill / C.multi; }   // chiêu nhiều đạn nhân hệ số multi: bù để mỗi nhánh đúng mult_k
  }
  if (cache.size > 200) cache.clear();
  cache.set(key, o);
  return o;
}

// Lệnh truyện { ky_nang: 'khoá' }: phát cuốn đầu tiên (một lần, theo cờ), kỹ năng tự vào ô trống, báo bằng hàng chữ lớn. Trả về tên kỹ năng vừa học.
export function hocKyNang(game, k) {
  const K = KN(game.data), h = K?.hoc[k], s = game.save;
  if (!h || !knOn(game) || s.flags[h.co]) return [];
  const id = h.id || h.he?.[s.element];
  if (!id || !K.chieu[id]) return [];
  s.flags[h.co] = true;
  if (!knCap(game, id)) nhanSach(game, id);
  const lo = knO(game).slice(), i = lo.indexOf(null);
  if (i >= 0 && !lo.includes(id)) lo[i] = id;
  s.knO = lo;
  const d = K.chieu[id];
  game.sfx?.('breakthrough'); game.chuLon?.({ nhan: K.text.hoc_nhan, cau: d.name, mau: d.color, giu: 1.8 }); game.toast?.(K.text.hoc_toast.replace('{ten}', d.name), 5);
  game.knMoi = (game.time || 0) + 6;   // nút kỹ năng nháy sáng vài giây (src/ui/ky-nang-hud.js)
  game.persist?.();
  return [d.name];
}

// Ba ô đang mang
export function knO(game) {
  if (!knOn(game)) return [null, null, null];
  const open = knMo(game), lo = game.save.knO || [];
  return [0, 1, 2].map(i => (open.includes(lo[i]) ? lo[i] : null));
}
export function knDat(game, i, id) {
  const lo = knO(game).slice(), j = lo.indexOf(id);
  if (j >= 0) lo[j] = lo[i];
  lo[i] = id; game.save.knO = lo;
  if (game.player?.knCd) { const c = Math.max(...game.player.knCd, 0); game.player.knCd = game.player.knCd.map(() => c); }   // đổi ô không xoá được hồi chiêu: cả ba ô chờ theo ô lâu nhất
  game.persist?.();
}
