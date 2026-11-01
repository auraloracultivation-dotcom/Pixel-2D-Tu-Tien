// Tấm chi tiết món đồ trong Túi đồ: trượt lên từ đáy túi khi chạm một món, nên không phải cuộn xuống cuối túi.
// Thứ tự từ trên xuống: tên + ô + cấp → nút chính (Mặc / Thay / Tháo) và lực chiến đổi bao nhiêu → so với món đang mặc
// cùng ô → chỉ số, dòng phụ, ngọc → việc khác (cường hoá, luyện, tẩy luyện, phân giải, bán).
import {
  equip, unequip, salvage, reroll, rerollFee, unsocket, gemInfo, rarityOf, itemName, statText, artOf, enhanceRefund,
} from '../game/items.js';
import { salvageIron, costText } from '../game/cave.js';
import { sell, sellPrice } from '../game/shop.js';
import { dailyEvent } from '../game/daily.js';
import { enhance, enhanceCost, setStats } from '../game/enhance.js';
import { isArt, refine, refineCost, salvageArt } from '../game/refine.js';
import { rerollEl } from '../game/daovan.js';
import { quality, tierOf } from '../game/tiers.js';
import { playerStats } from '../game/stats.js';
import { power } from '../game/achieve.js';
import { trial } from '../game/autoequip.js';
import { gemIcon } from './gem-icon.js';

const bonusText = (s, v) => ({ lifesteal: `hút máu ${v}%`, thorns: `phản đòn ${v}%`, regen: `hồi ${v} máu/giây` })[s] || null;

export function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function icon(data, it) {
  const ico = el('i', 'ico'), spr = data.art.sprites['gear.' + it.base];   // biểu tượng pixel của món gốc (tools/art/gear.py)
  if (spr) ico.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`;
  return ico;
}

// Chỉ số chính đã nhân cường hoá và hợp hệ Đạo Vận (như lúc tính vào người)
export function mainStats(data, save, it) {
  const base = data.items.bases[it.base];
  const k = (1 + (it.plus || 0) * data.gear.enhance.main_per) * (base.dv && it.el === save.element ? 1 + data.daovan.match_main : 1);
  return Object.fromEntries(Object.entries(it.main).map(([s, v]) => [s, Math.round(v * k)]));
}

// Lực chiến đổi bao nhiêu nếu mặc món này (0 nếu đang mặc)
export function powerGain(game, it) {
  const s = game.save, slot = game.data.items.bases[it.base].slot;
  if (s.equip[slot] === it.uid) return 0;
  return trial(game, slot, it.uid) - power(game, playerStats(s, game.data));
}

const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '±') + Math.abs(n).toLocaleString('vi-VN');

// box: nơi vẽ; st: trạng thái túi; changed(): lưu, tính lại, vẽ lại túi; close(): đóng tấm chi tiết
// Dòng phụ tô màu theo bậc (lục → đen; đen có viền đỏ sẫm)
function tierLine(data, l) {
  const t = Number.isInteger(l.t) ? tierOf(data, l.t) : null, d = el('div', 'd-line' + (t?.edge ? ' tier-den' : ''), '◆ ' + statText(data, l.s, l.v));
  if (t) { d.style.color = t.edge ? '#ffd6d6' : t.color; if (t.edge) d.style.setProperty('--edge', t.edge); }
  return d;
}

export function renderDetail(game, st, box, changed, close) {
  const { data } = game, save = game.save;
  box.innerHTML = '';
  const it = save.bag.find(i => i.uid === st.sel);
  if (!it) return false;
  const r0 = rarityOf(data.items, it.rarity), q = quality(data, it), r = q ? { ...r0, name: `Phẩm ${q.name}`, color: q.edge || q.color } : r0, base = data.items.bases[it.base], slot = base.slot;
  const worn = save.equip[slot] === it.uid, cur = !worn && save.bag.find(i => i.uid === save.equip[slot]);

  // đầu tấm: biểu tượng, tên, ô, nút đóng
  const head = el('div', 'd-head');
  const title = el('div', 'd-title', itemName(data, it)); title.style.color = r.color;
  const sub = el('div', 'd-sub', `${r.name} · ${data.items.slots[slot]} · cấp ${it.lvl}`);
  if (worn) sub.append(el('span', 'd-worn', 'Đang mặc'));
  const txt = el('div', 'd-name'); txt.append(title, sub);
  const x = el('button', 'd-close', '✕'); x.setAttribute('aria-label', 'Đóng chi tiết'); x.onclick = close;
  const ico = icon(data, it); ico.style.borderColor = r.color;
  head.append(ico, txt, x);
  box.append(head);

  // nút chính ngay dưới tên
  const main = el('div', 'd-primary');
  if (worn) {
    const b = el('button', 'act-btn', 'Tháo xuống'); b.onclick = () => { unequip(save, slot); changed(); };
    main.append(b);
  } else {
    const gain = powerGain(game, it);
    const b = el('button', 'act-btn primary', cur ? 'Thay vào' : 'Mặc vào');
    b.onclick = () => { equip(save, data, it.uid); game.sfx('shield'); st.msg = cur ? 'Đã thay.' : 'Đã mặc.'; changed(); };
    const g = el('span', 'd-gain ' + (gain > 0 ? 'up' : gain < 0 ? 'down' : ''), `Lực chiến ${signed(gain)}`);
    main.append(b, g);
  }
  box.append(main);
  if (st.msg) { box.append(el('div', 'd-msg', st.msg)); st.msg = ''; }

  // so với món đang mặc cùng ô
  const mine = mainStats(data, save, it);
  if (cur) {
    const old = mainStats(data, save, cur), cmp = el('div', 'd-compare');
    cmp.append(el('div', 'd-label', `So với ${itemName(data, cur)}`));
    for (const s of new Set([...Object.keys(mine), ...Object.keys(old)])) {
      const d = (mine[s] || 0) - (old[s] || 0), row = el('div', 'd-diff ' + (d > 0 ? 'up' : d < 0 ? 'down' : ''));
      row.append(el('span', null, data.items.stats[s].name), el('b', null, `${signed(d)}${data.items.stats[s].pct ? '%' : ''}`));
      cmp.append(row);
    }
    box.append(cmp);
  }

  // chỉ số
  const stats = el('div', 'd-stats');
  for (const [s, v] of Object.entries(mine)) stats.append(el('div', 'd-main', statText(data, s, v)));
  const art = artOf(data, it);
  if (art) stats.append(el('div', 'd-line', `Chiêu pháp bảo ${data.skills[art].name}: ${data.skills[art].desc}`));
  if (base.dv) {   // món Đạo Vận: hệ ngẫu nhiên, hợp hệ linh căn thì chỉ số chính mạnh thêm
    const ok = it.el === save.element, t = el('div', 'd-line', `Đạo Vận hệ ${data.elements[it.el]?.name || '?'}: ${ok ? `hợp linh căn, chỉ số chính +${Math.round(data.daovan.match_main * 100)}%, tính vào bộ` : 'khác hệ linh căn, chưa tính vào bộ'}`);
    t.style.color = data.elements[it.el]?.color || '#ffd27a'; stats.append(t);
  }
  if (base.set) {
    const sd = data.gear.sets[base.set], n = setStats(data, save).count[base.set] || 0;
    const t = el('div', 'd-line', `${sd.name} (đang mặc ${n}): ` + Object.entries(sd.bonus).map(([need, b]) => `${need} món: ` + Object.entries(b).map(([s, v]) => bonusText(s, v) || statText(data, s, v)).join(', ')).join(' · '));
    t.style.color = sd.color; stats.append(t);
  }
  it.lines.forEach(l => stats.append(tierLine(data, l)));   // tẩy luyện mới: mỗi dòng một màu
  if (it.lines.length < data.items.line_tiers.max) stats.append(el('div', 'muted tiny', `${it.lines.length}/${data.items.line_tiers.max} dòng. Tẩy luyện có thể ra thêm dòng; đủ dòng rồi thì đổi màu một dòng (chỉ lên).`));
  if (it.sockets.length) {
    const row = el('div', 'd-sockets');
    it.sockets.forEach((g, idx) => {
      const b = el('button', 'socket' + (g ? ' full' : ''));
      if (g) { const gi = gemInfo(data, g); b.append(gemIcon(game, g, 20, 'gem-ico sm'), gi.name); b.style.borderColor = gi.color; b.onclick = () => { unsocket(save, it.uid, idx); changed(); }; }
      else { b.textContent = '+ Khảm ngọc'; b.onclick = () => { st.pickSocket = { uid: it.uid, idx }; st.tab = 'ngoc'; st.sel = null; changed(false); }; }
      row.append(b);
    });
    stats.append(row, el('div', 'muted tiny', 'Chạm ô có ngọc để gỡ ngọc về túi.'));
  }
  box.append(stats);

  // việc khác
  const acts = el('div', 'd-acts');
  const btn = (t, fn, off) => { const b = el('button', 'act-btn', t); b.disabled = !!off; b.onclick = fn; acts.append(b); };
  const ec = enhanceCost(data, it, save);
  if (ec?.locked) btn(`Cường hóa +${(it.plus || 0) + 1}: mở ở ${data.realms.names[Math.min(data.realms.names.length - 1, data.gear.enhance.open.from_realm + Math.ceil(((it.plus || 0) + 1 - data.gear.enhance.open.base) / data.gear.enhance.open.per_realm))]}`, () => {}, true);
  else if (ec) {
    const can = Object.entries(ec.cost).every(([m, n]) => (save.mats[m] || 0) >= n) && (save.lingshi || 0) >= ec.coins;
    btn(`Cường hóa +${(it.plus || 0) + 1} (${costText(data, ec.cost)}${ec.coins ? `, ${ec.coins.toLocaleString('vi-VN')} ${data.shop.name}` : ''}, ${Math.round(ec.rate * 100)}%)`, () => {
      const res = enhance(game, it.uid);
      st.msg = res === 'up' ? `Thành công! +${it.plus}` : res === 'drop' ? `Hỏng, tụt còn +${it.plus}` : 'Hỏng, giữ nguyên cấp';
      game.sfx(res === 'up' ? 'levelup' : 'hurt'); changed();
    }, !can);
  }
  const rc = refineCost(data, it), rm = data.gear.refine.mat;   // pháp bảo: luyện bằng mảnh
  if (isArt(data, it)) btn(rc == null ? `Luyện: đã tối đa ★${it.pb}` : `Luyện ★${(it.pb || 0) + 1} (${rc} ${data.cave.materials[rm].name}, có ${save.mats[rm] || 0})`, () => { if (refine(game, it)) { st.msg = `Luyện thành công! ★${it.pb}`; game.sfx('levelup'); changed(); } }, rc == null || (save.mats[rm] || 0) < rc);
  const stones = save.mats['tay-luyen-thach'] || 0, cost = data.items.reroll_cost, fee = rerollFee(data, save, it), free = (it.free || 0) > 0;
  btn(free ? `Tẩy luyện (miễn phí ×${it.free})` : `Tẩy luyện (${cost} thạch + ${fee.toLocaleString('vi-VN')} ${data.shop.name})`, () => {
    const res = reroll(data, save, it.uid);
    if (!res) return;
    st.msg = res.added ? `Ra thêm ${res.added.length} dòng: ${res.added.map(l => `${tierOf(data, l.t).name} ${statText(data, l.s, l.v)}`).join(', ')}.`
      : res.up ? `Một dòng lên màu ${tierOf(data, res.up.t).name}: ${statText(data, res.up.s, res.up.v)}.` : 'Lần này không ra dòng mới, cũng không lên màu.';
    game.sfx(res.added || res.up ? 'levelup' : 'heal'); changed();
  }, !free && (stones < cost || (save.lingshi || 0) < fee));
  const iron = data.cave.salvage_iron[it.rarity] || 0;
  if (base.dv) {   // Đạo Vận: đổi hệ bằng Đạo Vận Thạch; phân giải, bán cho tiệm phải bấm hai lần (không rao chợ)
    const R = data.daovan.reroll, have = save.mats[R.mat] || 0;
    btn(data.daovan.texts.reroll.replace('{n}', R.n).replace('{mat}', `${data.cave.materials[R.mat].name}, có ${have}`), () => { const e = rerollEl(game, it.uid); if (e) { st.msg = data.daovan.texts.rerolled.replace('{item}', data.items.bases[it.base].name).replace('{el}', data.elements[e].name); game.sfx('heal'); changed(); } }, have < R.n);
  }
  const sure = (act, fn) => () => {   // món Đạo Vận: lần bấm đầu chỉ hỏi lại
    if (base.dv && st.sure !== act + it.uid) { st.sure = act + it.uid; game.toast(data.daovan.texts.confirm.replace('{act}', act), 2); return; }
    st.sure = null; fn();
  };
  const rf = enhanceRefund(data, it), rfTxt = it.plus ? `, gồm ${Math.round(data.gear.enhance.refund * 100)}% nguyên liệu cường hoá` : '';   // trả lại một phần nguyên liệu cường hoá
  const dvTxt = base.dv ? Object.entries(data.daovan.salvage?.mats || {}).map(([m, k]) => `, +${k} ${data.cave.materials[m].name}`).join('') : '';
  btn(`Phân giải (+${r.salvage + rf.stones} thạch, +${iron + rf.iron} tinh thiết${dvTxt}${rfTxt})`, sure('phân giải', () => { if (salvage(data, save, it.uid)) { salvageArt(game, it); salvageIron(game, it.rarity); dailyEvent(game, 'salvage'); } st.sel = null; game.sfx('die'); changed(); }), worn);
  btn(`Bán (+${sellPrice(game, it)} ${data.shop.name})`, sure('bán', () => { sell(game, it.uid); st.sel = null; game.sfx('pickup'); changed(); }), worn);
  box.append(el('div', 'd-label', 'Rèn luyện'), acts);
  return true;
}
