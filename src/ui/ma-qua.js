// Mục "Nhập mã quà" trong Menu (chủ dự án 04/11/2026 17:38; data/menu.json → nav.menu, chữ ở data/menu.json → ma_qua):
// ô nhập + nút Nhận, máy chủ kiểm (src/net/rank.js → redeemCode); đúng thì cộng điểm QTV hoặc điểm hệ thống (loai 'ht').
const net = () => import('../net/rank.js');

export function renderCodePane(game, body) {
  const T = game.data.menu.ma_qua, el = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  const box = el('div', 'skill-card wide-card'); box.style.borderLeftColor = '#f2c94c';
  const inp = el('input', 'dlg-input'); inp.maxLength = 32; inp.placeholder = T.placeholder; inp.autocomplete = 'off'; inp.autocapitalize = 'characters';
  const msg = el('small', null, game.online && game.cloud ? T.hint : T.login), go = el('button', 'mini primary', T.btn);
  inp.addEventListener('pointerdown', e => e.stopPropagation());
  go.onclick = async () => {
    const ma = inp.value.trim().toUpperCase();
    if (!ma) return;
    go.disabled = true; msg.textContent = T.wait;
    try {
      const r = await (await net()).redeemCode(ma);
      msg.textContent = r?.ok ? (r.loai === 'ht' && T.ok_ht ? T.ok_ht : T.ok).replace('{n}', r.diem) : T[r?.ly_do] || T.sai_ma;
      if (r?.ok) { inp.value = ''; game.sfx?.('levelup'); game.toast(msg.textContent, 2.5); }
    } catch (e) { msg.textContent = e.message === 'chua_dang_nhap' ? T.login : T.net; }
    go.disabled = false;
  };
  const row = el('div', 'card-acts'); row.append(inp, go);
  box.append(el('b', null, T.title), msg, row);
  body.append(box);
}
