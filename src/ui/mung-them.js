// Màn mừng cho những việc mạnh lên còn lại (docs/10-CAI-HON.md việc 4b ghi "chưa làm"; chủ dự án 14/11/2026 "nói chung mạnh lên là phải chúc mừng",
// 21/11/2026 03:47 "đồ hoạ phải nhiều hiệu ứng chúc mừng, lễ thăng cấp… làm họ thấy vui, thấy tiến bộ"). Cùng ngôn ngữ hình với cường hoá, tẩy luyện
// (src/ui/mung-mon.js). Số, chữ, tiếng: data/juice.json → mung.them, mung.sfx.hit.
//   Trong bảng (game.mung, src/ui/mung.js: không dừng tay người chơi, tự tan): linh thú tiến hoá, ghép sao (pets-panel.js); động phủ lên cấp
//     (cave-panel.js); khảm ngọc (bag.js, self-bag.js); ghép ngọc (bag-stock.js). Nơi gọi chụp trước (petSnap / power) rồi gọi sau khi việc thành công.
//   Trên đầu nhân vật (game.mungTang, src/ui/mung-canh.js: đang đánh quái vẫn đánh): công pháp lên tầng (thang ô = số tầng của công pháp), linh thú lên
//     cấp ở các mốc pet_every cấp. Phần luật gọi game.mungLen(loại, mã, cấp) (src/game/techniques.js, pets.js); trả true khi đã mừng bằng thẻ, nơi gọi
//     khỏi hiện dòng báo cũ. Linh thú lên cấp thường: một vòng sáng nở dưới chân con thú, dòng báo cũ vẫn hiện.
// Màn mừng tắt (mung.on) hoặc đang im (game.mungMute: bế quan lúc vắng) thì mọi thứ như trước: chỉ dòng báo.
import { power } from '../game/achieve.js';
import { addFx } from '../game/combat.js';
import { petDef, petMax, caveLv } from '../game/evolve.js';
import { gemInfo } from '../game/items.js';
import { gemText } from './hc-text.js';

const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const at = (list, i) => list[Math.max(0, Math.min(list.length - 1, i))] || 0;
const M = game => game.data.juice.mung.them;
const pct = v => `${Math.round(v * 100)}%`;
const vn = v => (Math.round(v * 10) / 10).toLocaleString('vi-VN');
// Lực chiến tăng từ mốc p0: màn mừng tự kể nên chữ nổ giữa màn (power-pop.js) khỏi báo lần nữa
const gain = (game, p0) => { const p = power(game); game.powerSeen = p; return Math.max(0, p - p0); };
const spr = (game, id) => (game.data.art.sprites[id] ? { id } : null);

// Chụp một linh thú trước khi tiến hoá / ghép sao: tên, sát thương so với công của chủ, cấp tối đa, sao, lực chiến
export function petSnap(game, id) {
  const s = game.save, P = game.data.pets, d = petDef(game.data, s, id), st = s.pets[id];
  return { name: d.name, dmg: d.mult * (1 + (st.lv - 1) * P.lv_bonus) * (1 + (st.star || 0) * P.merge.bonus), max: petMax(game.data, s, id), star: st.star || 0, pow: power(game) };
}

// Linh thú vừa tiến hoá: việc lớn nhất của một con thú nên diễn lớn nhất. Tiếng mừng do evolvePet tự phát (quiet.burst)
export function mungEvolve(game, id, a) {
  const X = M(game).text, b = petSnap(game, id), d = petDef(game.data, game.save, id);
  return { kind: 'evolve', fx: 'sao', lvl: 3, ray: d.color, spr: spr(game, 'pet.' + id), quiet: { burst: true }, title: X.evolve, gain: gain(game, a.pow),
    lines: [{ text: fill(X.arrow, { a: a.name, b: b.name }), big: true }, { label: X.dmg, from: pct(a.dmg), to: pct(b.dmg) }, { label: X.max_lv, from: String(a.max), to: String(b.max) }] };
}

// Linh thú vừa ghép sao lên ★N: sao càng cao (tốn 2^N bản sao) diễn càng lớn
export function mungMerge(game, id, a) {
  const T = M(game), b = petSnap(game, id), d = petDef(game.data, game.save, id);
  return { kind: 'merge', fx: 'sao', lvl: at(T.lvl_star, b.star - 1), ray: d.color, spr: spr(game, 'pet.' + id), badge: '★' + b.star, quiet: { burst: true }, title: T.text.merge, gain: gain(game, a.pow),
    lines: [{ label: T.text.dmg, from: pct(a.dmg), to: pct(b.dmg) }] };
}

// Động phủ vừa lên cấp (p0: lực chiến trước đó, để mốc lực chiến không nhảy giả). Kể những thứ đổi: đả tọa, dược viên, luyện đan
export function mungCave(game) {
  const T = M(game), X = T.text, L = game.data.cave.levels, n = caveLv(game.save), cur = L[n], old = L[n - 1] || cur, lines = [{ text: cur.name, big: true }];
  if (cur.meditate_mul !== old.meditate_mul) lines.push({ label: X.meditate, from: '×' + vn(old.meditate_mul), to: '×' + vn(cur.meditate_mul) });
  if (cur.grow_min !== old.grow_min) lines.push({ label: X.grow, from: fill(X.min, { n: old.grow_min }), to: fill(X.min, { n: cur.grow_min }) });
  if (cur.yield !== old.yield) lines.push({ label: X.yield, from: String(old.yield), to: String(cur.yield) });
  if ((cur.brew_bonus || 0) !== (old.brew_bonus || 0)) lines.push({ label: X.brew, from: '+' + pct(old.brew_bonus || 0), to: '+' + pct(cur.brew_bonus || 0) });
  return { kind: 'cave', fx: 'sao', lvl: Math.min(3, n), ray: T.ray.cave, spr: spr(game, 'ui.ic-dong-phu'), quiet: { burst: true }, title: X.cave, lines, gain: 0 };
}

// Vừa khảm một viên ngọc vào món đồ (p0: lực chiến trước khi khảm). Ngọc cấp càng cao diễn càng lớn; vầng sáng theo màu ngọc
export function mungSocket(game, key, p0) {
  const T = M(game), data = game.data, gi = gemInfo(data, key);
  game.refreshStats?.();
  return { kind: 'socket', fx: 'sao', lvl: at(T.lvl_gem, gi.lv - 1), ray: gi.color, spr: spr(game, `gem.${gi.type}-${gi.lv}`), title: T.text.socket, gain: gain(game, p0),
    lines: [{ text: gi.name, big: true, color: gi.color }, { text: gemText(data, key) }] };
}

// Vừa ghép n lần ngọc key thành ngọc cấp kế. Tiếng mừng do nơi gọi phát (quiet.burst)
export function mungGemMerge(game, key, n) {
  const T = M(game), data = game.data, g0 = gemInfo(data, key), k1 = `${g0.type}:${g0.lv + 1}`, g1 = gemInfo(data, k1);
  return { kind: 'gem', fx: 'lua', lvl: at(T.lvl_gem, g1.lv - 1), ray: g1.color, spr: spr(game, `gem.${g1.type}-${g1.lv}`), badge: n > 1 ? '×' + n : '', quiet: { burst: true }, title: T.text.gem_merge, gain: 0,
    lines: [{ text: g1.name, big: true, color: g1.color }, { text: gemText(data, k1) }] };
}

export function createMungThem(game) {
  const T = M(game);
  if (!T) return;
  const X = T.text, name = k => game.data.items.stats[k]?.name || X.stat[k] || k;
  game.mungLen = (kind, id, lv) => {
    if (!game.mungTang || game.mungMute || !game.player) return false;
    const data = game.data, s = game.save;
    if (kind === 'tech') {   // công pháp lên tầng: thang ô là số tầng, mỗi dòng một chỉ số trước → sau
      const t = data.techniques.list[id]; if (!t) return false;
      const lines = Object.entries(t.per_level).slice(0, 3).map(([k, v]) => ({ label: name(k), from: `+${vn(v * (lv - 1))}%`, to: `+${vn(v * lv)}%` }));
      if (lv >= data.techniques.max_level) lines.push({ text: X.tech_max, gift: true, wrap: true });
      game.mungTang({ color: t.color, title: X.tech, name: fill(X.tech_name, { name: t.name, n: lv }), cells: { n: data.techniques.max_level, from: lv - 1, to: lv }, lines, gain: 0 });
      return true;
    }
    if (kind === 'pet') {
      const d = petDef(data, s, id), P = data.pets, pet = game.pet;
      if (pet && s.pet === id) addFx(game, { type: 'ring', x: pet.x, y: pet.y, r: 26, color: d.color, life: 0.7, fill: true });   // lần nào lên cấp con thú cũng loé một vòng sáng
      if (lv % T.pet_every && lv < petMax(data, s, id)) return false;   // cấp thường: dòng báo cũ là đủ
      const k = (1 + (s.pets[id].star || 0) * P.merge.bonus), dmg = n => pct(d.mult * (1 + (n - 1) * P.lv_bonus) * k), top = petMax(data, s, id);
      game.mungTang({ color: d.color, title: X.pet_up, name: fill(X.pet_name, { name: d.name, n: lv }), cells: { n: Math.ceil(top / T.pet_every), from: Math.ceil(lv / T.pet_every) - 1, to: Math.ceil(lv / T.pet_every) },
        lines: [{ label: X.dmg, from: dmg(lv - T.pet_every), to: dmg(lv) }, ...(lv >= top ? [{ text: s.pets[id].evo ? X.pet_max : X.pet_evo, gift: true, wrap: true }] : [])], gain: 0 });
      return true;
    }
    return false;
  };
}
