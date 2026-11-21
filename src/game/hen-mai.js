// "Hẹn ngày mai" (docs/10-CAI-HON.md việc 5b: lý do quay lại ngày mai). Trước khi người chơi rời game, cho thấy ba điều đang có sẵn trong game mà
// chưa ai chỉ cho họ: nghỉ một đêm thì bế quan được bao nhiêu linh khí, lên tới tầng nào (đúng công thức src/game/offline.js); quà điểm danh ngày mai
// và còn mấy ngày tới mốc 7 ngày (data/checkin.json); bậc kế tiếp là gì, còn bao xa (mốc nhận pháp bảo, data/phap-bao.json → grants).
// Không doạ mất gì: chỉ hứa điều sẽ có. Thẻ do src/ui/hen-mai.js vẽ; số, chữ, công tắc ở data/juice.json → mai (mai.on tắt: chỉ máy có ?mai=1 thấy).
// Thẻ tự hiện một lần mỗi ngày trên mỗi máy, lúc yên (không thoại, không bảng, không quái đang đánh): người mới thì ngay khi đi hết truyện mở đầu
// (lúc 36 / 62 người chỉ chơi một ngày đã rời đi; đang đi truyện thì không chen ngang), người đã qua truyện thì sau after_min phút chơi.
import { every } from '../core/ticker.js';
import { hetMoDau } from './story.js';
import { qiNeed, realmBuff, realmLabel, totalLayer } from './stats.js';
import { checkinOn, checkinCached, loadCheckin } from './checkin.js';
import { PB, pbOn, pbState, pbType } from './phap-bao.js';

const M = game => game.data.juice?.mai;
let ON = null;
export function maiOn(game) {
  if (ON != null) return ON;
  let v = null;
  try { const q = new URLSearchParams(location.search).get('mai'); if (q != null) localStorage.setItem('p2d-mai', q); v = localStorage.getItem('p2d-mai'); } catch { /* không có kho nhớ: theo mặc định */ }
  return (ON = !!M(game) && (v != null ? v === '1' : !!M(game).on));
}

// Leo tầng bằng một lượng linh khí, như addQi (stats.js) nhưng đếm cả số linh khí thật sự dùng được: đầy tới đỉnh cảnh giới thì phần thừa bỏ đi.
// Trả { qi: số dùng được, from, to, up: số tầng lên, full: đầy tới đỉnh, label: tên tầng tới được, p0, p1: phần đường tới tầng kế trước / sau }
export function restSpan(R, from, amount) {
  const to = { ...from }; let left = amount;
  for (;;) {
    const need = qiNeed(to, R) - to.qi;
    if (left < need) { to.qi += left; left = 0; break; }
    if (to.layer >= R.layers) { to.qi = qiNeed(to, R); left -= need; break; }
    left -= need; to.qi = 0; to.layer += 1;
  }
  const frac = c => Math.min(1, c.qi / qiNeed(c, R));
  return { qi: Math.round(amount - left), from, to, up: totalLayer(to, R) - totalLayer(from, R), full: to.layer >= R.layers && frac(to) >= 1, label: realmLabel(to, R), p0: frac(from), p1: frac(to) };
}

// Nghỉ đủ số giờ bế quan tối đa thì được gì. Tính như offline.js + game.gainQi (không tính đan nhân đôi và hệ số động phủ: con số hứa là mức thấp nhất).
// Thêm hours: số giờ nêu trên thẻ (đầy tới đỉnh sớm thì chỉ cần chừng ấy giờ)
export function restForecast(game) {
  const s = game.save, R = game.data.realms, cfg = game.data.config, o = cfg.offline;
  const maxH = o.max_hours + (realmBuff(s, R).off || 0);
  const perH = cfg.meditate.qi_per_sec * o.rate * 3600 * (game.player?.st.qiMul || 1) * (game.daoLuMul?.() || 1) * (R.qi_rate ?? 1);
  const F = restSpan(R, { realm: s.realm, layer: s.layer, qi: s.qi }, Math.round(perH * maxH));
  return { ...F, hours: F.full ? Math.max(1, Math.min(maxH, Math.ceil(F.qi / perH))) : maxH };
}

// Bậc kế tiếp: mốc nhận pháp bảo gần nhất chưa tới (theo tổng số tầng), không còn mốc nào thì cảnh giới kế. Trả { label, name, pick, far } hoặc { realm } hoặc null
export function nextStep(game) {
  const s = game.save, R = game.data.realms, n = totalLayer(s, R);
  if (pbOn(game)) {
    const st = pbState(game), got = st.got || [];
    const g = PB(game).grants.map((x, k) => ({ ...x, k })).filter(x => !got.includes(x.k) && x.at > n && (x.type || x.pick || x.other)).sort((a, b) => a.at - b.at)[0];
    if (g) return { label: realmLabel({ realm: Math.floor(g.at / R.layers), layer: g.at % R.layers + 1 }, R), name: g.type ? pbType(game, { type: g.type }).name : '', pick: !g.type, far: g.at - n };
  }
  return s.realm < R.names.length - 1 ? { realm: R.names[s.realm + 1] } : null;
}

// Quà điểm danh ngày mai. Trả { guest } (chưa có tài khoản), { wait } (chưa đọc được), hoặc { day, coins, k: số ngày nữa tới mốc 7 ngày (0: chính ngày mai), m7, today: hôm nay chưa điểm danh }
export function giftTomorrow(game) {
  if (!checkinOn(game)) return { guest: true };
  const st = checkinCached(), C = game.data.checkin.rules;
  if (!st || st.vi_tri == null) { if (!st) loadCheckin(game).catch(() => {}); return { wait: true }; }
  const day = ((st.vi_tri || 0) + (st.hom_nay ? 0 : 1)) % C.vong + 1;
  return { day, coins: C.ngay.coins, k: (C.m7.moi - day % C.m7.moi) % C.m7.moi, m7: C.m7, today: !st.hom_nay };
}

const dayKey = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
export function startHenMai(game) {
  if (!maiOn(game)) return;
  const C = M(game), t0 = performance.now();
  let xong0 = null;   // lúc vào game đã đi hết phần mở đầu chưa (truyện còn chạy tiếp bằng nhiệm vụ chính: src/game/story.js hetMoDau)
  every(() => {
    const s = game.save, p = game.player;
    if (!s || !p || !game.henMaiShow) return;
    xong0 ??= hetMoDau(game);
    let seen = null; try { seen = localStorage.getItem('p2d-mai-d'); } catch { /* không có kho nhớ: mỗi buổi chơi hiện một lần */ }
    if (seen === dayKey() || game.maiSeen || totalLayer(s, game.data.realms) >= C.until_total) return;   // người đã tu cao: thẻ không tự hiện (một đêm bế quan chỉ nhích vài phần trăm, lời hứa nhạt)
    if (!hetMoDau(game)) return;   // còn đang đi truyện mở đầu: không chen ngang, chờ đi hết truyện
    const phut = (performance.now() - t0) / 60000;
    if (xong0 && phut < C.after_min) return;   // đã qua truyện từ buổi trước: chờ đủ after_min phút chơi
    // Sau phần mở đầu truyện đi tiếp bằng chuỗi nhiệm vụ chính (21/11/2026): đang dở một nhiệm vụ (gặp người, tới nơi, hạ trùm) thì cũng không chen ngang, chờ tới chỗ
    // truyện nghỉ (nhiệm vụ "Tu luyện tới…": đúng lúc lời hứa bế quan một đêm có nghĩa nhất). Dở mãi quá 2 × after_min phút chơi thì thôi không chờ nữa.
    if (game.story?.nghi === false && phut < C.after_min * 2) return;
    if (game.dialog?.open || game.uiOpen || game.traveling || game.trip || game.story?.busy || game.story?.xong || game.story?.rung?.() || game.dungeon) return;
    if (game.mobs.some(m => !m.dead && m.aggro && !m.dummy && (m.x - p.x) ** 2 + (m.y - p.y) ** 2 < C.calm_r * C.calm_r)) return;
    game.maiSeen = true; try { localStorage.setItem('p2d-mai-d', dayKey()); } catch { /* bỏ qua */ }
    const show = () => { try { game.henMaiShow(); } catch (e) { console.error('hen mai', e); } };
    if (checkinOn(game) && !checkinCached()) loadCheckin(game).catch(() => {}).finally(show);   // đọc bảng điểm danh trước cho hàng "Quà ngày mai" có số
    else show();
  }, 2000);
}
