// Hai tab của bảng Tông môn: "Tông môn" (thông tin, việc tuần: điểm danh, góp Linh Thạch, thưởng mốc; Tông chủ/Phó sửa giới thiệu,
// đóng mở cửa; rời tông môn) và "Đồng môn" (lời xin vào, danh sách, đổi chức, mời ra, nhường chức). Chữ ở data/guild.json.
import { guildState, guildAct, donate, claimMilestone } from '../game/guild.js';
import { coins } from '../game/shop.js';
import { realmLabel } from '../game/stats.js';

const fmt = n => Number(n || 0).toLocaleString('vi-VN');
const fill = (s, o) => Object.entries(o).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), s);

export function renderHome(ctx) {
  const { game, list, el, mini, card, twice, run, T, G, form } = ctx, m = guildState(game).mine;
  if (!m) {
    list.append(card('#c8c4d0', G.name, [T.none, fill(T.create_need, { realm: game.data.realms.names[G.need_realm], cost: fmt(G.cost) })], mini(T.create, ctx.goFind)));
    return;
  }
  const b = m.bang, me = m.toi, officer = m.chuc === 'chu' || m.chuc === 'pho';
  const left = G.donate.day_max - me.gop_diem, have = coins(game.save);
  const gifts = [10, 25, 50].filter((p, i, a) => p <= left || (i === 0 && left > 0)).map(p => Math.min(p, left));
  list.append(card('#6a4ab8', b.ten, [
    b.mo_ta, `${fill(T.members, { n: m.tv.length, max: G.max })} · ${b.mo ? T.open : T.closed}`,
    fill(T.week, { pts: fmt(b.diem_tuan) }), fill(T.my_week, { pts: fmt(me.cong_tuan) }),
  ],
  mini(me.diem_danh ? T.checked : fill(T.checkin, { n: G.checkin }), () => run(() => guildAct(game, 'checkin'), r => `+${r.diem}`), me.diem_danh),
  ...[...new Set(gifts)].map(p => mini(`${T.donate} ${fmt(p * G.donate.per)}`, () => run(() => donate(game, p * G.donate.per),
    r => fill(T.donated, { coins: fmt(r.lt), pts: r.diem })), have < p * G.donate.per))));
  G.milestones.forEach((x, i) => {
    const got = me.thuong.includes(i), ok = b.diem_tuan >= x.pts && me.cong_tuan >= G.min_pts;
    list.append(card(got ? '#c8c4d0' : ok ? '#f2c94c' : '#e2dcef', fill(T.milestone, { pts: fmt(x.pts), coins: fmt(x.coins), stones: x.stones }),
      [`${fmt(Math.min(b.diem_tuan, x.pts))}/${fmt(x.pts)}`],
      mini(got ? T.claimed : T.claim, () => run(() => claimMilestone(game, i), r => fill(T.got, { coins: fmt(r.coins), stones: r.stones })), got || !ok)));
  });
  if (officer) {
    const box = card('#5fa0d0', T.edit, []);
    const inp = el('input', 'guild-input'); inp.maxLength = 60; inp.value = form.motto ?? b.mo_ta; inp.oninput = () => { form.motto = inp.value; };
    const row = el('div', 'card-acts wrap');
    row.append(mini(T.edit, () => run(() => guildAct(game, 'edit', inp.value, null), () => { form.motto = undefined; return ''; })),
      mini(fill(T.toggle_open, { state: b.mo ? T.closed : T.open }), () => run(() => guildAct(game, 'edit', null, !b.mo), '')));
    box.append(inp, row); list.append(box);
  }
  const alone = m.tv.length === 1;
  list.append(card('#d06a6a', T.leave, [],
    twice('leave', T.leave, alone && m.chuc === 'chu' ? T.disband_ask : fill(T.leave_ask, { h: G.leave_hours }),
      () => run(() => guildAct(game, 'leave'), T.left))));
}

export function renderMembers(ctx) {
  const { game, list, el, mini, card, twice, run, T, G } = ctx, m = guildState(game).mine;
  if (!m) { list.append(el('div', 'empty', T.none)); return; }
  const R = G.roles, my = m.chuc, realm = x => x.canh_gioi == null ? '' : realmLabel({ realm: x.canh_gioi, layer: x.tang }, game.data.realms);
  if (m.xin.length) {
    list.append(el('div', 'guild-head', fill(T.requests, { n: m.xin.length })));
    for (const x of m.xin) list.append(card('#f2c94c', x.ten, [realm(x)],
      mini(T.approve, () => run(() => guildAct(game, 'review', x.k, true), '')),
      mini(T.reject, () => run(() => guildAct(game, 'review', x.k, false), ''))));
  }
  for (const x of m.tv) {
    const color = { chu: '#e0604a', pho: '#c08aff', lao: '#5fa0d0', de: '#8fbf6a' }[x.chuc];
    const btns = [];
    const can = !x.la_toi && (my === 'chu' || (my === 'pho' && (x.chuc === 'lao' || x.chuc === 'de')));
    if (can) {
      const roles = (my === 'chu' ? ['pho', 'lao', 'de'] : ['lao', 'de']).filter(r => r !== x.chuc);
      for (const r of roles) btns.push(mini(R[r], () => run(() => guildAct(game, 'role', x.k, r), '')));
      if (my === 'chu') btns.push(twice('chu:' + x.k, `${T.promote}: ${R.chu}`, fill(T.transfer_ask, { name: x.ten }), () => run(() => guildAct(game, 'role', x.k, 'chu'), '')));
      btns.push(twice('kick:' + x.k, T.kick, fill(T.kick_ask, { name: x.ten }), () => run(() => guildAct(game, 'kick', x.k), '')));
    }
    list.append(card(color, `${x.ten} ${x.la_toi ? T.you : ''}`, [`${R[x.chuc]} · ${realm(x)}`, fill(T.member_pts, { pts: fmt(x.cong_tuan), total: fmt(x.cong_hien) })], ...btns));
  }
}
