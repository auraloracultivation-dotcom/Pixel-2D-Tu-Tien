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

// Hỏi lại kèm cảnh báo trước khi mời / đồng ý
async function warn(game, title) {
  const T = game.data.social.dao_lu.text;
  return (await game.dialog.choose(`${title}\n${T.warn}`, [{ id: 'no', label: 'Thôi' }, { id: 'yes', label: 'Đồng ý', color: '#ff7ab6' }])) === 'yes';
}

export function inviteBtn(game, st, r, btn, rerender) {
  const T = game.data.social.dao_lu.text;
  if (!st || st.dao_lu || st.cho_den || st.toi_moi.some(x => x.k === r.k)) return;
  btn(T.invite, async () => { if (!(await warn(game, fill(T.sure_invite, { name: r.ten })))) return; rerender(await inviteDaoLu(game, r.k)); });
}

// Danh sách quà: hiện ngay trong khung Đạo lữ, cuộn được (nút bấm bằng click nên vuốt không chọn nhầm); chạm một món thì hỏi lại
function giftList(game, kind) {
  const s = game.save, D = game.data;
  if (kind === 'mon') return s.bag.filter(it => !isEquipped(s, it.uid) && !D.items.bases[it.base]?.dv).slice().reverse()
    .map(it => ({ label: itemName(D, it), desc: `${rarityOf(D.items, it.rarity)?.name || ''} · cấp ${it.lvl}`, color: rarityOf(D.items, it.rarity)?.color, mon: { uid: it.uid } }));
  if (kind === 'nl') return Object.entries(s.mats || {}).filter(([id, n]) => n >= 1 && matInfo(D, id) && id !== 'dao-van-thach')
    .map(([id, n]) => ({ label: `${matInfo(D, id).name} ×${Math.min(10, Math.floor(n))}`, desc: `Đang có ${Math.floor(n)}`, mon: { id, n: Math.min(10, Math.floor(n)) } }));
  return [1000, 10000, 100000].filter(n => coins(s) >= n).map(n => ({ label: `${n.toLocaleString('vi-VN')} ${D.shop.name}`, desc: '', mon: { n } }));
}
const ask = async (game, text, yes, color) => (await game.dialog.choose(text, [{ id: 'no', label: 'Thôi' }, { id: 'yes', label: yes, color }])) === 'yes';   // "Thôi" đứng trước: chạm vội không làm mất gì

// st: trạng thái từ máy chủ (loadDaoLu); rerender(note) vẽ lại bảng
export function renderDaoLu(game, body, st, { say, rerender }) {
  const T = game.data.social.dao_lu.text;
  if (!st) return;
  const box = el('div', 'ev-note top');
  body.append(box);
  let picking = null;
  paint();
  function paint() {
  box.replaceChildren();
  const acts = el('div', 'pf-acts');
  box.append(el('b', 'ev-note-title', T.title));
  const btn = (t, fn, cls = 'act-btn') => { const b = el('button', cls, t); b.onclick = async () => { b.disabled = true; try { await fn(); } catch (e) { say(daoLuErr(game, e)); b.disabled = false; } }; acts.append(b); };
  if (st.dao_lu) {
    const d = st.dao_lu;
    box.append(el('p', null, fill(T.partner, { name: d.ten })), el('p', null, fill(T.since, { date: day(d.tu) })));
    for (const [k, label] of [['mon', T.gift_item], ['nl', T.gift_mat], ['lt', T.gift_lt]]) btn(label, async () => { picking = picking === k ? null : k; paint(); }, 'act-btn' + (picking === k ? ' primary' : ''));
    btn(T.divorce, async () => {   // huỷ: luôn hỏi lại bằng hộp thoại, "Thôi" đứng trước (bản cũ bấm hai lần liền là huỷ, người chơi chạm vội bị huỷ oan)
      if (!(await ask(game, `${T.divorce} với ${d.ten}? Huỷ rồi cả hai phải chờ 30 ngày mới kết đạo lữ mới.`, T.divorce, '#e0484a'))) return;
      rerender(await cancelDaoLu(game, d.k));
    });
    if (picking) {
      const list = el('div', 'dl-gifts'), items = giftList(game, picking);
      if (!items.length) list.append(el('p', 'muted', 'Không có gì để tặng.'));
      for (const g of items) {
        const b = el('button', 'dl-gift'); b.append(el('b', null, g.label), el('small', null, g.desc));
        if (g.color) b.style.borderLeftColor = g.color;
        b.onclick = async () => {
          if (!(await ask(game, `Tặng ${g.label} cho ${d.ten}?`, 'Tặng', '#ff7ab6'))) return;
          try { await giftDaoLu(game, picking, g.mon); say(fill(T.sent, { name: d.ten })); paint(); } catch (e) { say(daoLuErr(game, e)); }
        };
        list.append(b);
      }
      box.append(acts, list);
      return;
    }
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
  }
}
