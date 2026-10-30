// Bộ Đạo Vận và Con Đường Đạo Vận (data/daovan.json, chủ dự án chốt 28/10/2026): đích lớn đầu tiên từ Kim Đan, xong trong 1–2 tuần, không bán.
// Bộ = 6 món trang bị + Đạo Vận Ấn + 2 chiêu hệ đang mang + linh thú; tính "hợp hệ" khi cùng hệ linh căn người chơi.
// Món Đạo Vận giống nhau, hệ ngẫu nhiên lúc nhận (it.el); đổi hệ bằng Đạo Vận Thạch.
import { rollItem, addItem, equipped, itemName } from './items.js';
import { progress } from './achieve.js';
import { totalLayer, weaponId } from './stats.js';
import { addMat } from './cave.js';
import { skillSlots } from './skills.js';
import { fitBag } from './autoequip.js';

const V = data => data.daovan;
const today = () => { const d = new Date(); return Math.floor((d.getTime() - d.getTimezoneOffset() * 60000) / 86400000); };
export const elList = data => Object.keys(data.elements).filter(k => !k.startsWith('_'));
const matName = (data, id) => data.cave.materials[id]?.name || id;

// Số món hợp hệ: trang bị Đạo Vận cùng hệ (tối đa 7), chiêu hệ đang mang (tối đa 2), linh thú cùng hệ (1).
// Chưa mặc món Đạo Vận hợp hệ nào thì chưa tính bộ (chiêu, linh thú chỉ cộng thêm khi đã có món).
export function matchInfo(save, data) {
  const el = save.element, D = V(data);
  if (!el || !D) return { gear: 0, skills: 0, pet: 0, n: 0, el };
  const gear = equipped(save).filter(it => data.items.bases[it.base]?.dv && it.el === el).length;
  const mine = data.elements[el]?.skills || [];
  const skills = Math.min(2, skillSlots({ save, data }).filter(id => mine.includes(id)).length);   // theo các ô chiêu đang hiện (chưa chọn thì ô mặc định)
  const pet = save.pet && D.pet_el[save.pet] === el ? 1 : 0;
  return { gear, skills, pet, n: gear ? gear + skills + pet : 0, el };
}

// Thưởng bộ theo hệ và số món hợp hệ (stats.js cộng vào chỉ số)
export function daoVanStats(save, data) {
  const m = matchInfo(save, data), out = {};
  for (const [need, b] of Object.entries(V(data)?.bonus[m.el] || {})) {
    if (m.n < Number(need)) continue;
    for (const [k, v] of Object.entries(b)) out[k] = (out[k] || 0) + v;
  }
  return out;
}

// Con đường: null khi chưa tới Kim Đan
export function dvState(game) {
  const s = game.save;
  if ((s.realm || 0) < V(game.data).realm) return null;
  return (s.dv ??= { start: today(), step: 0, base: null });
}
const counter = (game, need) => (need.type === 'layer' ? totalLayer(game.save, game.data.realms) : progress(game, need));

// Bước đang làm: mở chưa (theo ngày), làm được bao nhiêu, xong chưa
export function stepInfo(game) {
  const st = dvState(game);
  if (!st) return null;
  const step = V(game.data).steps[st.step];
  if (!step) return { st, all: true };
  const day = today() - st.start, open = day >= step.day;
  if (open && st.base == null) st.base = step.need.abs ? 0 : counter(game, step.need);   // tính từ lúc bước mở, việc làm trước đó không tính
  const have = open ? Math.max(0, Math.floor(counter(game, step.need) - (step.need.abs ? 0 : st.base))) : 0;
  const R = game.data.realms, top = R.names.length * R.layers - 1;   // gần đỉnh tu vi: bước lên tầng chỉ cần tới đỉnh
  const goal = step.need.type === 'layer' && st.base != null ? Math.max(0, Math.min(step.need.n, top - st.base)) : step.need.n;
  return { st, step, open, day, have, goal, ready: open && have >= goal };
}

export function makeDv(game, base, rnd = Math.random) {
  const it = rollItem(game.data, game.save, { base, rarity: V(game.data).rarity, lvl: Math.min(81, totalLayer(game.save, game.data.realms)) });
  const els = elList(game.data);
  it.el = els[Math.floor(rnd() * els.length)];
  if (game.data.items.bases[base].slot === 'vu-khi') it.wt = weaponId(game.save, game.data);   // Đạo Vận Binh theo loại vũ khí đang dùng
  return it;
}

// Nhận thưởng bước vừa xong: trả về { got: [...] } hoặc { full: true } khi túi đầy, null khi chưa xong
export function claimStep(game) {
  const k = stepInfo(game);
  if (!k?.ready) return null;
  const g = k.step.give, s = game.save, d = game.data, got = [];
  if (g.dv) {
    if ((s.bag?.length || 0) >= d.items.bag_size) fitBag(game, 1);   // báo lỗi #22: túi đầy thì tự phân giải món thấp nhất chưa mặc, như lúc túi lố
    if ((s.bag?.length || 0) >= d.items.bag_size) return { full: true };
    const it = makeDv(game, g.dv);
    addItem(d, s, it); got.push(itemName(d, it));
  }
  for (const [id, n] of Object.entries(g.mats || {})) { addMat(s, id, n); got.push(`${n} ${matName(d, id)}`); }
  if (g.flag) s.flags[g.flag] = true;
  k.st.step++; k.st.base = null; k.st.told = null;
  game.persist();
  return { got };
}

// Đổi hệ một món Đạo Vận: tốn Đạo Vận Thạch, ra hệ khác hệ cũ
export function rerollEl(game, uid, rnd = Math.random) {
  const s = game.save, d = game.data, R = V(d).reroll, it = s.bag.find(i => i.uid === uid);
  if (!it || !d.items.bases[it.base]?.dv || (s.mats[R.mat] || 0) < R.n) return null;
  s.mats[R.mat] -= R.n;
  const els = elList(d).filter(e => e !== it.el);
  it.el = els[Math.floor(rnd() * els.length)];
  game.refreshStats(); game.persist();
  return it.el;
}

// Dòng mục tiêu dưới truyện chính (Con Đường Đạo Vận đi song hành): bước đang mở và chưa nhận
export function dvGoal(game) {
  const k = game.save && stepInfo(game);
  if (!k || k.all || !k.open) return null;
  const T = V(game.data);
  return k.ready ? T.texts.goal_ready : `${T.texts.goal}: ${T.need_text[k.step.need.type].replace('{n}', k.goal)} (${Math.min(k.have, k.goal)}/${k.goal})`;
}

// Báo khi bước xong (một lần mỗi bước); tự hành thì tự nhận
export function updateDaoVan(game, dt) {
  if (!game.save || (game.dvPoll = (game.dvPoll || 0) - dt) > 0) return;
  game.dvPoll = 2;
  const k = stepInfo(game);
  if (!k?.ready) return;
  if (game.pilot) {
    const r = claimStep(game);
    if (r?.got) { game.toast(V(game.data).texts.got.replace('{what}', r.got.join(', ')), 2.6); game.sfx('levelup'); return; }
  }
  if (k.st.told === k.st.step) return;
  k.st.told = k.st.step; game.newDaily = true;
  game.toast(V(game.data).texts.ready.replace('{name}', k.step.name), 3);
}
