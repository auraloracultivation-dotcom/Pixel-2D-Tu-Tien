// Tab Đạo Vận trong bảng Việc: Con Đường Đạo Vận (bước đang làm, nhận thưởng), số món hợp hệ, thưởng bộ theo hệ linh căn.
import { stepInfo, claimStep, matchInfo, dvState } from '../game/daovan.js';

export function renderDaoVan(game, list, { card, mini, say }) {
  const d = game.data, D = d.daovan, T = D.texts, s = game.save;
  const sub = document.getElementById('daily-sub');
  if (!dvState(game)) { sub.textContent = T.locked; list.append(card('#c8c4d0', T.tab, [T.locked])); return; }
  const m = matchInfo(s, d), el = d.elements[s.element];
  sub.textContent = T.sub.replace('{n}', m.n).replace('{el}', el?.name || '');
  const k = stepInfo(game), all = D.steps.length;
  if (k.all) list.append(card('#ffd27a', T.path.replace('{i}', all).replace('{all}', all), [T.done_all]));
  else {
    const need = D.need_text[k.step.need.type].replace('{n}', k.goal);
    const lines = [k.step.text, `${need} (${Math.min(k.have, k.goal)}/${k.goal})`, `Thưởng: ${giveText(d, k.step.give)}`];
    if (!k.open) lines.push(T.wait.replace('{day}', k.step.day + 1).replace('{left}', leftText(k.step.day - k.day)));
    list.append(card(k.ready ? '#5fd07a' : '#ffd27a', `${T.path.replace('{i}', k.st.step + 1).replace('{all}', all)}: ${k.step.name}`, lines,
      mini(k.ready ? T.claim : T.not_yet, () => {
        const r = claimStep(game);
        if (r?.full) { say(T.bag_full); game.toast(T.bag_full, 2.4); }   // bảng dạng lưới che dòng chữ dưới bảng: báo thêm bằng thông báo nổi
        else if (r?.got) { const t = T.got.replace('{what}', r.got.join(', ')); say(t); game.toast(t, 2.6); game.sfx('levelup'); game.refreshStats(); }
      }, !k.ready)));
  }
  const tiers = D.bonus[s.element] || {};
  list.append(card(el?.color || '#ffd27a', T.bonus_title.replace('{el}', el?.name || ''), [
    T.match.replace('{gear}', m.gear).replace('{skills}', m.skills).replace('{pet}', m.pet),
    ...Object.entries(tiers).map(([n, b]) => `${m.n >= +n ? '✓' : '·'} ${n} món: ` + Object.entries(b).map(([st, v]) => statLabel(d, st, v)).join(', ')),
  ]));
}

function giveText(d, g) {
  const out = [];
  if (g.dv) out.push(`${d.items.bases[g.dv].name} (hệ ngẫu nhiên)`);
  for (const [id, n] of Object.entries(g.mats || {})) out.push(`${n} ${d.cave.materials[id]?.name || id}`);
  if (g.flag) out.push('danh hiệu');
  return out.join(', ');
}

const EXTRA = { regen: 'Hồi máu', thorns: 'Phản đòn', lifesteal: 'Hút máu' };
function statLabel(d, s, v) {
  const def = d.items.stats[s];
  return def ? `${def.name} +${v}${def.pct ? '%' : ''}` : `${EXTRA[s] || s} +${v}${s === 'regen' ? '' : '%'}`;
}

// Còn bao lâu tới nửa đêm của ngày bước sau mở
function leftText(days) {
  const now = new Date(), next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + Math.max(1, days));
  const m = Math.ceil((next - now) / 60000), d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60);
  return d ? `${d} ngày ${h} giờ` : h ? `${h} giờ ${m % 60} phút` : `${m} phút`;
}
