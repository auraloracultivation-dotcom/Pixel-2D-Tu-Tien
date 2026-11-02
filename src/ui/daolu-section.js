// Phần Đạo lữ đầu bảng Bạn bè (chủ dự án chốt 02/11/2026 14:39): đạo lữ hiện tại (tặng trang bị, nguyên liệu, Linh Thạch;
// huỷ bấm hai lần), lời mời đến (đồng ý sau khi đọc cảnh báo 30 ngày), lời mời đã gửi, hạn chờ sau khi huỷ. Nút "Mời làm
// đạo lữ" trên từng người bạn: inviteBtn. Logic ở src/game/daolu.js; chữ data/social.json → dao_lu.text.
import { inviteDaoLu, cancelDaoLu, giftDaoLu, daoLuErr } from '../game/daolu.js';
import { isEquipped, itemName, rarityOf } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { coins } from '../game/shop.js';

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const day = t => new Date(t).toLocaleDateString('vi-VN', { day: 'numeric', month: 'numeric', year: 'numeric' });
let sure = false;

// Hỏi lại kèm cảnh báo trước khi mời / đồng ý
async function warn(game, title) {
  const T = game.data.social.dao_lu.text;
  return (await game.dialog.choose(`${title}\n${T.warn}`, [{ id: 'yes', label: 'Đồng ý', color: '#ff7ab6' }, { id: 'no', label: 'Thôi' }])) === 'yes';
}

export function inviteBtn(game, st, r, btn, rerender) {
  const T = game.data.social.dao_lu.text;
  if (!st || st.dao_lu || st.cho_den || st.toi_moi.some(x => x.k === r.k)) return;
  btn(T.invite, async () => { if (!(await warn(game, fill(T.sure_invite, { name: r.ten })))) return; rerender(await inviteDaoLu(game, r.k)); });
}

async function pickGift(game, kind) {
  const s = game.save, D = game.data;
  let opts;
  if (kind === 'mon') opts = s.bag.filter(it => !isEquipped(s, it.uid) && !D.items.bases[it.base]?.dv).slice(-15).reverse()
    .map(it => ({ id: String(it.uid), label: itemName(D, it), desc: `${rarityOf(D.items, it.rarity)?.name || ''} · cấp ${it.lvl}`, color: rarityOf(D.items, it.rarity)?.color }));
  else if (kind === 'nl') opts = Object.entries(s.mats || {}).filter(([id, n]) => n > 0 && matInfo(D, id) && id !== 'dao-van-thach').slice(0, 15)
    .map(([id, n]) => ({ id, label: `${matInfo(D, id).name} ×${Math.floor(n)}`, desc: `Tặng ${Math.min(10, Math.floor(n))}` }));
  else opts = [1000, 10000, 100000].filter(n => coins(s) >= n).map(n => ({ id: String(n), label: `${n.toLocaleString('vi-VN')} ${D.shop.name}`, desc: '' }));
  if (!opts.length) { game.toast('Không có gì để tặng.', 2); return null; }
  opts.push({ id: 'thoi', label: 'Thôi', desc: '' });
  const id = await game.dialog.choose('Chọn quà tặng đạo lữ', opts);
  if (!id || id === 'thoi') return null;
  if (kind === 'mon') return { uid: Number(id) };
  if (kind === 'nl') return { id, n: Math.min(10, Math.floor(s.mats[id])) };
  return { n: Number(id) };
}

// st: trạng thái từ máy chủ (loadDaoLu); rerender(note) vẽ lại bảng
export function renderDaoLu(game, body, st, { say, rerender }) {
  const T = game.data.social.dao_lu.text;
  if (!st) return;
  const box = el('div', 'ev-note top'), acts = el('div', 'pf-acts');
  box.append(el('b', 'ev-note-title', T.title));
  const btn = (t, fn, cls = 'act-btn') => { const b = el('button', cls, t); b.onclick = async () => { b.disabled = true; try { await fn(); } catch (e) { say(daoLuErr(game, e)); b.disabled = false; } }; acts.append(b); };
  if (st.dao_lu) {
    const d = st.dao_lu;
    box.append(el('p', null, fill(T.partner, { name: d.ten })), el('p', null, fill(T.since, { date: day(d.tu) })));
    for (const [k, label] of [['mon', T.gift_item], ['nl', T.gift_mat], ['lt', T.gift_lt]]) {
      btn(label, async () => { const m = await pickGift(game, k); if (!m) return; await giftDaoLu(game, k, m); rerender(fill(T.sent, { name: d.ten })); }, 'act-btn primary');
    }
    btn(sure ? T.sure_divorce : T.divorce, async () => { if (!sure) { sure = true; rerender(); return; } sure = false; rerender(await cancelDaoLu(game, d.k)); });
  } else {
    box.append(el('p', null, T.warn));
    if (st.cho_den) box.append(el('p', 'muted', fill(T.wait, { date: day(st.cho_den) })));
  }
  for (const r of st.moi_toi || []) {
    box.append(el('p', null, fill(T.invited_me, { name: r.ten })));
    btn(T.accept, async () => { if (!(await warn(game, fill(T.invited_me, { name: r.ten })))) return; rerender(await inviteDaoLu(game, r.k)); }, 'act-btn primary');
    btn(T.decline, async () => rerender(await cancelDaoLu(game, r.k)));
  }
  for (const r of st.toi_moi || []) {
    box.append(el('p', 'muted', fill(T.i_invited, { name: r.ten })));
    btn(T.cancel_invite, async () => rerender(await cancelDaoLu(game, r.k)));
  }
  box.append(acts);
  body.append(box);
}
