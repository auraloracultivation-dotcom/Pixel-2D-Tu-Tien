// Nhận pháp bảo theo mốc tu vi (chủ dự án 12/11/2026 04:07, data/phap-bao.json → grants) và báo chiêu khảm mới mở.
// Gọi lúc vào game (đủ mốc thì nhận bù, không chọn) và mỗi lần lên tầng, qua bước truyện (src/game/skills.js checkUnlocks).
// save.phapBao.got: chỉ số mốc đã nhận; save.phapBao.mods: chiêu khảm đã biết (để chỉ báo chiêu mới).
import { PB, pbOn, pbState, pbAdd, pbType, pbGrade } from './phap-bao.js';
import { power } from './achieve.js';
import { rewardOn } from './reward.js';
import { t } from '../core/i18n.js';   // chữ ghép: dịch theo khuôn

const total = s => (s.realm || 0) * 9 + (s.layer || 1) - 1;
let picking = false;

export function pbGrants(game, quiet = false) {
  if (!pbOn(game) || !game.save) return;
  const hold = game.story?.pbHold?.();   // chặng leo bậc đầu game (story.js): pháp bảo là phần thưởng của một bậc thì chờ truyện trao (pbGive, có nghi lễ), chưa nhận theo mốc
  const D = PB(game), U = D.ui, s = game.save, st = pbState(game);
  st.got ??= [];
  const have = t => st.items.some(i => i.type === t), n = total(s);
  let changed = false;
  D.grants.forEach((g, k) => {
    if (st.got.includes(k) || !(n >= g.at || (g.step != null && (s.step || 0) >= g.step))) return;
    if (hold && g.type && hold.has(g.type) && !have(g.type)) return;
    if (g.stones) { st.got.push(k); st.stones = (st.stones || 0) + g.stones; changed = true; if (!quiet) game.toast(U.stones_got.replace('{n}', g.stones), 2.4); return; }
    if (g.pick) {
      const left = g.pick.filter(t => !have(t));
      if (!left.length) { st.got.push(k); return; }
      if (left.length === 1 || quiet || !game.dialog?.choose) { give(game, left[0], g, quiet); st.got.push(k); changed = true; return; }
      if (picking || game.dialog.open) return;   // lần sau chọn
      picking = true;
      game.dialog.choose(U.pick_q, left.map(t => ({ id: t, label: pbType(game, { type: t }).name, desc: pbType(game, { type: t }).desc, color: pbType(game, { type: t }).color })))
        .then(t => { if (!st.got.includes(k)) { give(game, left.includes(t) ? t : left[0], g, false); st.got.push(k); game.persist?.(); } })
        .finally(() => { picking = false; });
      return;
    }
    const t = g.type || (g.other || []).find(x => !have(x));
    st.got.push(k); changed = true;
    if (t && !have(t)) give(game, t, g, quiet);
  });
  if (changed) { game.refreshStats?.(); game.persist?.(); }
  newMods(game, quiet);
}

// Tầng kế tiếp sẽ mở gì (thẻ lên tầng nhắc trước, src/game/len-tang.js: Luyện Khí từ 15/11/2026 mỗi tầng dài gấp đôi tầng trước nên tầng nào cũng phải có
// thứ để mong): pháp bảo và Đá Khai Khiếu theo mốc chưa nhận, chiêu khảm mới. Trả mảng chữ (rỗng: không có gì).
export function pbNext(game) {
  if (!pbOn(game) || !game.save) return [];
  const D = PB(game), st = pbState(game), n = total(game.save) + 1, have = x => st.items.some(i => i.type === x), name = x => t(pbType(game, { type: x }).name), out = [];
  D.grants.forEach((g, k) => {
    if (g.at !== n || (st.got || []).includes(k)) return;
    if (g.stones) return void out.push(t('{n} Đá Khai Khiếu', { n: g.stones }));
    const list = g.pick ? g.pick.filter(x => !have(x)) : [g.type || (g.other || []).find(x => !have(x))].filter(x => x && !have(x));
    if (list.length) out.push(t('pháp bảo {name}', { name: list.map(name).join(t(' hoặc ')) }));
  });
  const mods = Object.values(D.mods).filter(m => m.at === n).map(m => t(m.name));
  if (mods.length) out.push(t('chiêu khảm {names}', { names: mods.join(', ') }));
  return out;
}

// Pháp bảo trao hẳn hoi trong truyện (lệnh phap_bao ở data/story.json, chặng leo bậc): thêm vào túi pháp bảo (tự mặc vào ô trống) rồi diễn nghi lễ nhận thưởng
// (ui/reward-show.js). Trả lời hứa, xong khi người chơi đóng nghi lễ. Đã có món loại này thì thôi. r: { type, grade }
export function pbGive(game, r) {
  if (!pbOn(game) || pbState(game).items.some(i => i.type === r.type)) return undefined;
  const p0 = power(game), it = pbAdd(game, r.type, r.grade || 'pham'), T = pbType(game, it), G = pbGrade(game, it), U = PB(game).ui;
  game.refreshStats?.(); game.persist?.(); game.newItems = true;
  if (!rewardOn(game) || !game.rewardGive) { game.toast(U.got.replace('{name}', T.name), 3); game.sfx?.('rare'); return undefined; }
  return game.rewardGive({ qua: { ray: G.color, ink: G.color, lvl: 1, name: T.name, tag: `Phẩm ${G.name}`, sub: U.title, spr: { id: T.icon, frame: T.icon_f || 0 }, lines: [{ text: T.desc, desc: true }], gain: power(game) - p0 } });
}

function give(game, type, g, quiet) {
  const it = pbAdd(game, type, g.grade || 'pham'), U = PB(game).ui, name = pbType(game, it).name;
  if (!quiet) { game.toast((g.say === 'boss' ? U.got_boss : U.got).replace('{name}', name), 3); game.sfx?.('rare'); game.newItems = true; }
}

// Chiêu khảm vừa mở (theo tổng tầng tu): báo một lần
function newMods(game, quiet) {
  const D = PB(game), st = pbState(game), n = total(game.save);
  const open = Object.entries(D.mods).filter(([, m]) => n >= (m.at ?? 99)).map(([id]) => id);
  if (!st.mods) { st.mods = open; return; }
  const fresh = open.filter(id => !st.mods.includes(id));
  if (!fresh.length) return;
  st.mods.push(...fresh);
  if (!quiet) { game.toast(D.ui.mod_new.replace('{names}', fresh.map(id => D.mods[id].name).join(', ')), 4); game.newItems = true; }
}
