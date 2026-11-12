// Tab "Tinh cầu" của bảng Tông môn (data/khai-hoang.json, src/game/khai-hoang.js): tinh cầu của tông môn, kho Mảnh Vỡ và Linh Thạch,
// góp vào kho (mọi chức), mở trận Khai Tinh / nâng cấp (chỉ tông chủ, chọn tên và mặt đất khi khai), vào trận đang mở (đồng môn), người góp nhiều.
import { guildState } from '../game/guild.js';
import { coins } from '../game/shop.js';
import { khState, khErr, khGive, khOpen, khEnter, khQuit, khFly, myShards } from '../game/khai-hoang.js';

const fmt = n => Number(n || 0).toLocaleString('vi-VN');
const fill = (s, o) => Object.entries(o).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), s);
const pick = { name: '', ground: '' };   // chữ đang gõ, mặt đất đang chọn (giữ khi vẽ lại)

export function renderKh(ctx, redraw) {
  const { game, list, el, mini, card } = ctx, K = game.data['khai-hoang'], T = K.text, m = guildState(game).mine, km = khState(game).mine;
  if (!m) { list.append(el('div', 'empty', K.err.khong_co)); return; }
  if (km === undefined) { list.append(el('div', 'empty', ctx.T.loading)); return; }
  if (!km) { list.append(el('div', 'empty', K.err.other)); return; }
  // việc gọi máy chủ: lỗi đổi thành câu của khai-hoang.json
  const act = (fn, ok) => ctx.run(async () => { try { return fill(ok, await fn() || {}); } catch (e) { return khErr(game, e); } }, r => r);
  const chu = km.chuc === 'chu', p = km.tinh, G = K.grounds;

  // tinh cầu
  list.append(p
    ? card(G[p.mat_dat]?.ground || '#6a4ab8', fill(T.planet, { ten: p.ten, cap: p.cap, ground: G[p.mat_dat]?.name || '' }), [],
      mini(T.fly, () => { game.ui?.closeAll?.(); document.getElementById('guild-close')?.click(); khFly(game, p.id); }, game.map.id === p.id))
    : card('#c8c4d0', T.tab, [T.none]));

  // kho
  const have = myShards(game), lt = coins(game.save);
  list.append(card('#f2c94c', fill(T.kho, { manh: fmt(km.kho.manh), lt: fmt(km.kho.lt) }), [fill(T.my_mat, { n: fmt(have) }), T.gop_note],
    mini(`${T.gop} ${fmt(have)} mảnh`, () => act(() => khGive(game, have, 0), T.gop_ok.replace('{manh}', fmt(have)).replace('{lt}', 0)), !have),
    ...[10000, 50000, 200000].map(v => mini(`${T.gop} ${fmt(v)} LT`, () => act(() => khGive(game, 0, v), T.gop_ok.replace('{manh}', 0).replace('{lt}', fmt(v))), lt < v))));

  // cấp kế tiếp, trận Khai Tinh
  const next = K.levels.find(l => l.cap === (p?.cap || 0) + 1);
  if (!next) list.append(card('#8fbf6a', T.max, []));
  else {
    const Gd = G[p?.mat_dat || pick.ground] || Object.values(G)[0], boss = game.data.mobs[Gd.boss]?.name || '';
    const box = card('#b0503a', p ? fill(T.open_up, { cap: next.cap }) : T.open, [
      fill(T.need, { cap: next.cap, manh: fmt(next.manh), lt: fmt(next.lt), realm: game.data.realms.names[next.realm], boss, cp: fmt(next.boss_cp) }),
      km.cho > 0 ? fill(T.lost_wait, { s: km.cho }) : '', km.tran ? T.fight_note : '', chu ? '' : T.only_chu,
    ].filter(Boolean));
    const row = el('div', 'card-acts wrap');
    if (km.tran) {
      row.append(mini(T.join, () => { document.getElementById('guild-close')?.click(); khEnter(game, km.tran); }));
      if (km.tran.cua_toi) row.append(mini('Bỏ trận', () => act(async () => { khState(game).fight = { ve: km.tran.ve, mine: true }; await khQuit(game); }, '')));
    } else if (chu) {
      if (!p) {   // khai mới: ô tên + nút mặt đất đặt ngoài thẻ (thẻ thành ô lưới, tấm chi tiết chỉ chép thẻ nên ô gõ trong thẻ không nhận chữ: grid-cards.js)
        const wrap = el('div', 'kh-pick'); wrap.style.cssText = 'grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px;align-items:center';
        const n = el('input', 'guild-input'); n.placeholder = T.pick_name; n.maxLength = K.ten_max; n.value = pick.name; n.oninput = () => { pick.name = n.value; };
        n.style.flex = '1 1 100%';
        wrap.append(n, el('small', null, T.pick_ground));
        for (const [id, g] of Object.entries(G)) {
          const b = mini(g.name, () => { pick.ground = id; redraw(); });
          b.style.outline = pick.ground === id ? '2px solid #f2c94c' : ''; b.style.background = g.ground; b.style.color = '#1a1426';
          wrap.append(b);
        }
        list.append(wrap);
      }
      const ready = km.kho.manh >= next.manh && km.kho.lt >= next.lt && (game.save.realm || 0) >= next.realm && !(km.cho > 0);
      row.append(mini(p ? fill(T.open_up, { cap: next.cap }) : T.open, () => {
        if (!p && (pick.name.trim().length < 2 || !pick.ground)) { game.toast(pick.ground ? K.err.ten_sai : K.err.dat_sai, 2.4); return; }   // tên, mặt đất kiểm lúc bấm
        document.getElementById('guild-close')?.click();
        khOpen(game, pick.name.trim(), pick.ground).catch(e => game.toast(khErr(game, e), 3));
      }, !ready));
    }
    if (row.children.length) box.append(row);
    list.append(box);
  }

  // người góp nhiều
  if (km.top.length) list.append(card('#5fa0d0', T.top, km.top.map(x => fill(T.top_row, { name: x.name, manh: fmt(x.manh), lt: fmt(x.lt) }))));
}
