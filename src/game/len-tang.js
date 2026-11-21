// Lên tầng (thăng tiểu cảnh giới) và đột phá cảnh giới sau thiên kiếp (thăng đại cảnh giới): việc phải làm lúc tu vi vừa lên, và màn mừng của nó
// (docs/10-CAI-HON.md việc 4b; chủ dự án 14/11/2026 17:25 "nói chung mạnh lên là phải chúc mừng", 17:38 "cả hiệu ứng thăng tiểu cảnh giới và đại cảnh giới").
//   layerUp: src/game/game.js gainQi gọi khi linh khí vừa đầy một tầng (broke = số tầng vừa lên). Trên nhân vật: trận đồ nở dưới chân, cột sáng vọt lên,
//     đốm sáng bay lên (juice.js juiceUp). Trên màn: thẻ "Đột phá" ngay trên đầu cột sáng: tên tầng, thang chín ô sáng thêm ô mới, chỉ số trước → sau,
//     quà tu vi, tầng kế sẽ mở gì (pháp bảo, chiêu khảm: phap-bao-grant.js pbNext), lực chiến tăng bao nhiêu. Không dừng game (đang đánh quái vẫn đánh).
//   realmUp: src/game/tribulation.js finish gọi sau khi đã sang cảnh giới mới. Nghi lễ cả màn: nhân vật giữa vầng sáng màu cảnh giới mới, tên cảnh giới
//     đập xuống, chỉ số trước → sau, cảnh giới gia trì, quà đột phá, lực chiến, nút Tiếp tục.
//   Cả hai: lực chiến đã nằm trong màn mừng nên chữ nổ giữa màn (power-pop.js) không báo lần nữa; các dòng báo khác nổ ra đúng lúc ấy (pháp bảo mới,
//   chiêu khảm mới…) được giữ lại, màn mừng xong mới hiện lần lượt (mừng trước, lời dặn sau; khỏi che nhân vật đang toả sáng, khỏi trôi mất sau nền tối).
// Công tắc data/juice.json → mung.on (tắt: chỉ máy mở địa chỉ có ?mung=1 thấy). Tắt, hoặc đang im (game.mungMute: bế quan lúc vắng đã có thẻ Xuất quan kể
// từng tầng) thì y như trước: dòng báo "Đột phá! …" / "Độ kiếp thành công! …". Màn diễn: src/ui/mung-canh.js (đặt game.mungTang, game.mungCanh). Số, chữ: mung.
import { addFx } from './combat.js';
import { realmLabel } from './stats.js';
import { power } from './achieve.js';
import { juiceUp } from './juice.js';
import { buffBits } from './realm-gift.js';
import { pbNext } from './phap-bao-grant.js';
import { t } from '../core/i18n.js';
import { canhGioiY } from './tran-ma-ky.js';   // ý nghĩa của cảnh giới trong truyện Trấn Ma Kỷ (data/tran-ma-ky.json → canh_gioi)
import { TN, tnOn, diemCon } from './tiem-nang.js';   // điểm tiềm năng mỗi lần đột phá đại cảnh giới
import { phat } from './phat.js';   // người cùng tinh cầu thấy mình lên tầng   // chữ ghép: dịch theo khuôn

const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const list = parts => parts.map(p => [...p.replace(/ /g, '\u00a0')].join('\u2060')).join('\u00a0· ');   // nhiều ý nối bằng dấu ·: câu dài chỉ xuống dòng sau dấu · giữa hai ý, không ngắt giữa "Linh Thạch" (dấu nối chữ U+2060 giữa mọi ký tự: chữ Hán cũng không bị ngắt giữa "法寶")
const num = n => Math.round(n).toLocaleString('vi-VN');
const cfg = game => game.data.juice.mung;
// Màu của cảnh giới: hào quang quanh người ở cảnh giới ấy (data/status.json → auras); Luyện Khí chưa có hào quang thì màu linh khí.
// Hào quang gần như trắng (Trúc Cơ, Đại Thừa) thì màn mừng dùng màu đậm hơn cùng sắc (mung.canh.colors) cho vầng sáng, thẻ ra màu
const hue = (game, realm, base) => cfg(game).canh.colors?.[realm] || game.data.status.auras?.[realm]?.color || base;
// Màu của BẢNG chúc mừng đột phá (thẻ lên tầng, nghi lễ đột phá cảnh giới): màu bảng nhận đồ Tiên phẩm (chủ dự án 20/11/2026 01:35: "mọi bảng chúc mừng
// đột phá đều giống màu của bảng nhận đồ tiên phẩm, vì đột phá là việc lớn"). mung.pham: mã màu trong items.line_tiers.list; hiệu ứng trên nhân vật ngoài
// bản đồ (juiceUp) vẫn theo màu cảnh giới
const bang = (game, base) => { const q = game.data.items.line_tiers.list.find(x => x.id === cfg(game).pham); return q ? q.edge || q.color : base; };

// Chỉ số ngay trước lúc lên, để màn mừng so trước → sau
export const upSnap = game => ({ hp: game.player.maxHp, atk: game.player.atk, pow: power(game), realm: game.save.realm });

function statLines(game, a) {
  const N = game.data.items.stats, p = game.player;
  return [['hp', p.maxHp], ['atk', p.atk]].filter(([k, v]) => v !== a[k]).map(([k, v]) => ({ label: N[k].name, from: num(a[k]), to: num(v) }));
}

// Lực chiến tăng từ lúc chụp a: màn mừng tự kể, chữ nổ giữa màn khỏi báo lần nữa
function powGain(game, a) { const pow = power(game); game.powerSeen = pow; return pow - a.pow; }
// Màn mừng xong: trả lần lượt các dòng báo đã giữ (wait: chờ thêm mấy giây cho hiệu ứng trên nhân vật diễn xong đã)
const later = (game, hold, wait = 0) => () => hold.forEach(([text, sec], i) => setTimeout(() => game.toast(text, sec), (wait + i * 2.6) * 1000));

// Gọi checkUnlocks (quà tu vi, pháp bảo theo mốc, chiêu mới) nhưng quà tu vi không tự báo: ghi vào tờ giữ cho màn mừng kể (realm-gift.js).
// hold: mảng hứng các dòng báo khác nổ ra trong lúc ấy
function unlocks(game, hold) {
  const gift = (game.giftHold = {}), toast = game.toast;
  game.toast = (text, sec) => { hold.push([text, sec]); };
  try { game.checkUnlocks(); } finally { game.giftHold = null; game.toast = toast; }
  return gift.parts?.length ? list(gift.parts) : '';
}

export function layerUp(game, broke) {
  const s = game.save, R = game.data.realms, p = game.player, C = cfg(game), show = game.mungTang && !game.mungMute, a = upSnap(game), hold = [];
  game.refreshStats(); p.hp = p.maxHp;
  const gift = show ? unlocks(game, hold) : (game.checkUnlocks(), '');
  addFx(game, { type: 'ring', x: p.x, y: p.y, r: 40, color: '#bff4ff', life: 0.8, fill: true });
  game.sfx('layer_up'); game.screen.shake(3, 0.3);
  if (!game.mungMute) phat(game, 'ks-up', 0);   // bế quan lúc vắng (đang im) thì thôi: lúc ấy chưa vào tinh cầu
  if (!show) { game.toast(`Đột phá! ${realmLabel(s, R)}`, 2.2); return; }
  const color = hue(game, s.realm, C.tang.color), pairs = statLines(game, a), lines = pairs.length ? [{ pairs }] : [];   // thẻ nhỏ: sinh lực và công chung một dòng
  if (gift) lines.push({ text: fill(C.text.gift, { list: gift }), gift: true, wrap: true });
  if (s.layer >= R.layers && s.realm < R.names.length - 1) lines.push({ text: C.text.peak, soft: true, wrap: true });   // đủ chín tầng: nhắc bậc kế tiếp là thiên kiếp
  else if (s.layer < R.layers) { const nx = pbNext(game); if (nx.length) lines.push({ text: fill(C.text.next, { name: t('{x} tầng {layer}', { x: R.names[s.realm], layer: s.layer + 1 }), list: list(nx) }), soft: true, wrap: true }); }   // tầng kế sẽ mở gì: có cái để mong (tên tầng dịch ngay ở đây: câu ghép lẫn hai thứ tiếng thì bộ dịch khuôn "… tầng …" nuốt cả câu)
  juiceUp(game, false, color);
  game.mungTang({ color: bang(game, color), title: C.text.tang, name: realmLabel(s, R), cells: { n: R.layers, from: Math.max(0, s.layer - broke), to: s.layer }, lines, gain: powGain(game, a), done: later(game, hold) });
}

// a: upSnap lấy trước khi sang cảnh giới mới. Trả false khi màn mừng tắt (nơi gọi tự báo như cũ)
export function realmUp(game, a) {
  if (!game.mungCanh) return false;
  const s = game.save, R = game.data.realms, C = cfg(game), X = C.text, hold = [], gift = unlocks(game, hold), color = hue(game, s.realm, C.canh.color);
  const lines = statLines(game, a), flush = later(game, hold, C.world.rune_life * C.world.big), buff = buffBits(game, s.realm);
  const y = canhGioiY(game, s.realm); if (y) lines.unshift({ text: y, soft: true, wrap: true });   // dòng đầu ngay dưới tên: cảnh giới này nghĩa là gì ("Trúc Cơ là cắm rễ…"), rồi mới tới con số
  if (buff.length) lines.push({ text: fill(X.buff, { realm: R.names[s.realm], list: list(buff) }), soft: true, wrap: true });
  if (gift) lines.push({ text: fill(X.gift_realm, { list: gift }), gift: true, wrap: true });
  const tn = tnOn(game.data) && s.tiem?.toc && s.realm > (s.tiem.max | 0) ? TN(game.data) : null;   // Tiềm năng (chủ dự án 21/11/2026 17:23): đột phá đại cảnh giới có thêm điểm; lên lại cảnh giới đã từng đạt (tụt vì hóa ma) thì không
  if (tn) lines.push({ text: fill(tn.text.len, { n: tn.diem.moi }), gift: true });
  game.mungCanh({ color: bang(game, color), title: X.canh, name: R.names[s.realm], sub: fill(X.from, { a: R.names[a.realm], b: R.names[s.realm] }), lines, gain: powGain(game, a),
    done: () => { juiceUp(game, true, color); flush(); if (tn && diemCon(s, game.data) > 0) game.toast(fill(tn.text.moi, { n: diemCon(s, game.data) }), 4); } });   // ra khỏi nghi lễ: nhân vật còn toả sáng ngoài bản đồ
  return true;
}
