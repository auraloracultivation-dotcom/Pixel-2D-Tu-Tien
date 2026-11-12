// Phần dưới tab "Tinh cầu" của bảng Tông môn (kh-view.js vẽ phần trên): mua công trình và đồ trang trí bằng kho tông môn (tông chủ),
// số đang có (ai cũng xem), giao trưởng lão bày (tông chủ), gửi ảnh công trình chờ duyệt (tông chủ) và các ảnh đã gửi.
// Thẻ mang data-icon là mã hình công trình nên ô lưới hiện đúng hình (grid-cards.js). Ô gõ, chọn ảnh đặt ngoài thẻ (tấm chi tiết chỉ chép thẻ).
import { guildState } from '../game/guild.js';
import { khBuy, khAssign, khSendImage } from '../game/kh-act.js';
import { khErr } from '../game/khai-hoang.js';
import { levelOf } from '../game/kh-gen.js';

const fmt = n => Number(n || 0).toLocaleString('vi-VN');
const fill = (s, o) => Object.entries(o).reduce((t, [k, v]) => t.split(`{${k}}`).join(v), s);
const form = { file: null, ten: '', loai: '', npc: '' };   // ô gửi ảnh (giữ khi vẽ lại)

export function renderKhMore(ctx, redraw, km) {
  const { game, list, el, mini, card } = ctx, K = game.data['khai-hoang'], T = K.text, N = game.data.npcs, chu = km.chuc === 'chu';
  const act = (fn, ok) => ctx.run(async () => { try { return fill(ok, await fn() || {}); } catch (e) { const m = String(e?.message || ''); return Object.keys(K.err).some(k => m.includes(k)) ? khErr(game, e) : /[À-ỹ]/.test(m) ? m : K.err.other; } }, r => r);
  const head = t => list.append(el('div', 'guild-head', t));
  const iconCard = (id, ...a) => { const c = card(...a); c.dataset.icon = id; c.dataset.key = 'kh:' + id; return c; };

  // công trình, đồ trang trí
  head(T.shop);
  if (km.tinh) { const L = levelOf(K, km.tinh.cap); list.append(el('div', 'empty', fill(T.limit, { cap: km.tinh.cap, ct: L.ct_max, do: L.do_max }) + ' · ' + T.bay_hint)); }
  for (const [id, c] of Object.entries(K.ct)) {
    const npc = c.loai === 'cn' ? N[c.npc]?.name : c.npc_name;
    list.append(iconCard(id, c.loai === 'cn' ? '#f2c94c' : '#8fbf6a', fill(T.shop_ct, { name: c.name, lt: fmt(c.lt), n: km.ct[id] || 0 }),
      [fill(T.shop_ct_note, { kind: c.loai === 'cn' ? T.kind_cn : T.kind_nha, r: c.r, npc: npc ? fill(T.npc_with, { npc }) : '' })],
      ...(chu ? [mini(T.buy, () => act(() => khBuy(game, id, 1), fill(T.buy_ok, { name: c.name })), km.kho.lt < c.lt)] : [])));
  }
  for (const [id, r] of Object.entries(km.rieng || {})) list.append(iconCard(id, '#c8a0ff', fill(T.shop_ct, { name: r.ten, lt: '—', n: km.ct[id] || 0 }), [r.npc]));
  for (const id of K.do) {
    const name = id.replace(/^[a-z]+\./, '').replace(/-m$/, '');
    list.append(iconCard(id, '#5fa0d0', `${name} · có ${km.ct[id] || 0}`, [fill(T.shop_do, { lt: fmt(K.do_lt) })],
      ...(chu ? [mini(`${T.buy} 1`, () => act(() => khBuy(game, id, 1), fill(T.buy_ok, { name })), km.kho.lt < K.do_lt),
        mini(`${T.buy} 5`, () => act(() => khBuy(game, id, 5), fill(T.buy_ok, { name })), km.kho.lt < K.do_lt * 5)] : [])));
  }

  if (!chu) return;
  // thợ: trưởng lão được giao bày
  const lao = (guildState(game).mine?.tv || []).filter(x => x.chuc === 'lao');
  if (lao.length) {
    head(T.tho);
    for (const x of lao) {
      const on = km.tho.includes(x.k);
      list.append(card(on ? '#8fbf6a' : '#c8c4d0', x.ten, [T.tho_note], mini(on ? T.tho_off : T.tho_on, () => act(() => khAssign(game, x.k, !on), ''))));
    }
  }

  // gửi ảnh công trình
  head(T.anh);
  const A = K.anh, box = el('div', 'kh-pick');
  box.style.cssText = 'grid-column:1/-1;display:flex;flex-wrap:wrap;gap:5px;align-items:center';
  box.append(el('small', null, fill(T.anh_note, A)));
  const f = el('input'); f.type = 'file'; f.accept = 'image/png,image/webp'; f.onchange = () => { form.file = f.files[0] || null; };
  const fb = mini(form.file ? `${T.anh_file}: ${form.file.name}` : T.anh_file, () => f.click()); f.hidden = true;
  f.addEventListener('change', () => { fb.textContent = form.file ? `${T.anh_file}: ${form.file.name}` : T.anh_file; });
  const inp = (ph, key, max) => { const i = el('input', 'guild-input'); i.placeholder = ph; i.maxLength = max; i.value = form[key]; i.oninput = () => { form[key] = i.value; }; i.style.flex = '1 1 45%'; return i; };
  const sel = el('select', 'guild-input'); sel.style.flex = '1 1 45%';
  const opts = [['', T.anh_loai], ...[...new Set(Object.values(K.ct).filter(c => c.loai === 'cn').map(c => c.npc))].map(n => [n, `${N[n]?.name || n}`]), ['nha', T.anh_loai_nha]];
  for (const [v, t] of opts) { const o = el('option', null, t); o.value = v; if (v === form.loai) o.selected = true; sel.append(o); }
  sel.onchange = () => { form.loai = sel.value; };
  box.append(f, fb, inp(T.anh_ten, 'ten', 24), sel, inp(T.anh_npc, 'npc', 16),
    mini(T.anh_gui, () => act(async () => { await khSendImage(game, form.file, form.ten, form.loai, form.npc); const t = form.ten; Object.assign(form, { file: null, ten: '', loai: '', npc: '' }); return { ten: t }; }, T.anh_ok)));
  list.append(box);
  for (const a of km.anh || []) list.append(card(a.trang_thai === 'xong' ? '#8fbf6a' : a.trang_thai === 'bo' ? '#b0503a' : '#f2c94c', a.ten_ct,
    [`${T.anh_tt[a.trang_thai] || a.trang_thai} · ${a.loai === 'nha' ? T.anh_loai_nha : N[a.loai]?.name || a.loai} · NPC ${a.ten_npc}`, a.ghi_chu]));
  void redraw;
}
