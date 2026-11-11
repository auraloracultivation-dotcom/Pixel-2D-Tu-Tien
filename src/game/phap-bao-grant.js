// Nhận pháp bảo theo mốc tu vi (chủ dự án 12/11/2026 04:07, data/phap-bao.json → grants) và báo chiêu khảm mới mở.
// Gọi lúc vào game (đủ mốc thì nhận bù, không chọn) và mỗi lần lên tầng, qua bước truyện (src/game/skills.js checkUnlocks).
// save.phapBao.got: chỉ số mốc đã nhận; save.phapBao.mods: chiêu khảm đã biết (để chỉ báo chiêu mới).
import { PB, pbOn, pbState, pbAdd, pbType } from './phap-bao.js';

const total = s => (s.realm || 0) * 9 + (s.layer || 1) - 1;
let picking = false;

export function pbGrants(game, quiet = false) {
  if (!pbOn(game) || !game.save) return;
  const D = PB(game), U = D.ui, s = game.save, st = pbState(game);
  st.got ??= [];
  const have = t => st.items.some(i => i.type === t), n = total(s);
  let changed = false;
  D.grants.forEach((g, k) => {
    if (st.got.includes(k) || !(n >= g.at || (g.step != null && (s.step || 0) >= g.step))) return;
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
