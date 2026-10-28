// Bảng sự kiện Dẫn đạo hữu nhập môn (data/referral.json): mã mời + link (sao chép, gửi), chọn loại ngọc muốn nhận, ô nhập mã
// cho người mới, tiến độ online của mình (nếu được mời), danh sách người mình đã mời. Mở bằng game.openReferral() (bảng thông
// báo, nút sự kiện trên bảng điều khiển, tab Sự kiện). Dữ liệu từ game/referral.js; chữ người chơi chỉ gán textContent.
import { loadRef, enterRef, pickRefGem, pendingCode, clearCode, refOn } from '../game/referral.js';

const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createReferral(game) {
  const R = game.data.referral, T = R?.text;
  if (!R) return;
  const root = el('div', 'panel ev-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', T.close), body = el('div', 'ev-body');
  head.append(el('b', null, T.title), x);
  root.append(head, body);
  document.body.append(root);
  let ticket = 0, msg = '', timer = 0;
  const gemName = t => game.data.items.gems.types[t]?.name || t;
  const link = code => `${location.origin}${location.pathname}?gt=${code}`;

  function close() { root.hidden = true; game.uiOpen = false; ticket++; clearInterval(timer); }
  x.onclick = close;
  root.addEventListener('pointerdown', e => e.stopPropagation());

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch { /* trình duyệt chặn: thử cách cũ */ }
    const t = el('textarea'); t.value = text; document.body.append(t); t.select();
    let ok = false; try { ok = document.execCommand('copy'); } catch { ok = false; }
    t.remove(); return ok;
  }

  function codeBox(info) {
    const box = el('div', 'ev-code'), code = el('div', 'ev-code-val', info.ma), acts = el('div', 'ev-row');
    const c = el('button', 'act-btn', T.copy), s = el('button', 'act-btn primary', T.share);
    c.onclick = async () => { msg = (await copy(link(info.ma))) ? T.copied : link(info.ma); paint(info); };
    s.onclick = async () => {
      const text = fill(T.share_text, { code: info.ma });
      if (navigator.share) { try { await navigator.share({ title: T.title, text, url: link(info.ma) }); return; } catch { /* huỷ chia sẻ: chép link */ } }
      msg = (await copy(`${text} ${link(info.ma)}`)) ? T.copied : link(info.ma); paint(info);
    };
    acts.append(c, s);
    box.append(el('small', 'muted', T.my_code), code, acts);
    return box;
  }

  function gemPick(info) {
    const row = el('div', 'ev-gems');
    for (const t of R.gems) {
      const g = game.data.items.gems.types[t], b = el('button', 'ev-gem' + (info.loai === t ? ' on' : ''), g.name);
      b.style.borderColor = g.color; if (info.loai === t) b.style.background = g.color + '33';
      b.onclick = async () => {
        if (info.loai === t) return;
        const r = await pickRefGem(game, t);
        if (!r.error) { info.loai = t; msg = fill(T.picked, { name: gemName(t) }); } else msg = T.errors.net;
        paint(info);
      };
      row.append(b);
    }
    const s = el('div', 'ev-sec'); s.append(el('div', 'pf-label', T.pick), row);
    return s;
  }

  function enterBox(info) {
    const s = el('div', 'ev-sec'), inp = el('input', 'ev-input'), b = el('button', 'act-btn primary', T.enter_btn), row = el('div', 'ev-row');
    inp.maxLength = 8; inp.placeholder = T.enter_ph; inp.value = pendingCode(); inp.autocapitalize = 'characters';
    inp.addEventListener('keydown', e => e.stopPropagation());
    b.onclick = async () => {
      b.disabled = true;
      const r = await enterRef(game, inp.value.trim().toUpperCase(), info.loai);
      b.disabled = false;
      if (r.error) { msg = fill(T.errors[r.error] || T.errors.net, { days: R.join_days, from: R.from.split('-').reverse().slice(0, 2).join('/') }); paint(info); return; }
      clearCode(); game.sfx('levelup');
      msg = fill(T.entered, { name: r.data?.ten || '?', new: R.gem_new });
      open(true);
    };
    row.append(inp, b);
    s.append(el('div', 'pf-label', T.enter), row);
    return s;
  }

  function bar(n, max) {
    const b = el('div', 'ev-bar'), i = el('i'); i.style.width = `${Math.min(100, n / max * 100)}%`; b.append(i); return b;
  }

  function paint(info) {
    body.textContent = '';
    const d = s => s.split('-').reverse().join('/');
    body.append(el('div', 'ev-when', fill(T.when, { from: d(R.from), to: d(R.to) })),
      el('p', 'ev-rule', fill(T.rule, { gap: R.gap, ref: R.gem_ref, new: R.gem_new })));
    if (!info.dang_chay) body.append(el('p', 'fb-msg', T.ended));
    if (msg) body.append(el('p', 'fb-msg', msg));
    body.append(codeBox(info), gemPick(info));
    if (info.nhap_duoc) body.append(enterBox(info));
    const me = info.cua_toi;
    if (me) {
      const s = el('div', 'ev-sec');
      s.append(el('div', 'pf-label', me.dat ? fill(T.mine_done, { name: me.ten }) : fill(T.mine, { name: me.ten, n: me.chuoi, max: R.minutes })));
      if (!me.dat) s.append(bar(me.chuoi, R.minutes), el('small', 'muted', fill(T.mine_note, { gap: R.gap })));
      body.append(s);
    }
    const inv = el('div', 'ev-sec');
    inv.append(el('div', 'pf-label', info.so_moi ? fill(T.invited, { n: info.so_moi, g: info.so_ngoc, ref: R.gem_ref }) : T.invited_none));
    for (const r of info.da_moi || []) {
      const row = el('div', 'ev-inv' + (r.dat ? ' done' : ''));
      row.append(el('span', null, r.dat ? fill(T.row_done, { name: r.ten }) : fill(T.row, { name: r.ten, n: r.chuoi, max: R.minutes })));
      if (!r.dat) row.append(bar(r.chuoi, R.minutes));
      inv.append(row);
    }
    body.append(inv);
  }

  async function open(force) {
    root.hidden = false; game.uiOpen = true;
    if (!game.online || !game.cloud) { body.textContent = ''; body.append(el('p', 'muted', T.login)); return; }
    const my = ++ticket;
    if (!force) { msg = ''; body.textContent = ''; body.append(el('p', 'muted', T.loading)); }
    try { const info = await loadRef(game, true); if (my === ticket) paint(info); }
    catch { if (my === ticket) { body.textContent = ''; body.append(el('p', 'muted', T.error)); } }
    clearInterval(timer);
    timer = setInterval(() => { if (!root.hidden && document.activeElement?.className !== 'ev-input') loadRef(game, true).then(i => { if (!root.hidden) paint(i); }).catch(() => {}); }, 30000);
  }
  game.openReferral = () => open(false);
  // Mở game bằng link mời: đăng nhập xong, lúc rảnh tay thì tự mở bảng để người mới nhập mã (đã tự điền)
  const auto = setInterval(async () => {
    if (!pendingCode()) { clearInterval(auto); return; }
    if (!game.online || !game.cloud || !game.save || game.dialog.open || game.story?.busy || game.uiOpen || game.traveling) return;
    clearInterval(auto);
    try { const info = await loadRef(game, true); if (info.nhap_duoc) open(false); else clearCode(); } catch { /* lần sau mở bảng thì thử lại */ }
  }, 3000);
  game.referralOn = () => refOn(game);
}
