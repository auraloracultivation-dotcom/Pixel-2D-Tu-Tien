// Sổ điểm quản trị viên (chủ dự án 03/11/2026 02:34): dưới bảng QTV có nút mở sổ của mình — số dư, đã đổi tuần này, đổi điểm
// lấy Tiên Ngọc (1 = 1, tối đa 500 mỗi tuần), 100 dòng gần nhất. Máy chủ giữ sổ chỉ thêm (src/net/rank.js qtvLedger, qtvExchange).
// Chữ ở data/social.json → rank.qtv.ledger.
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const when = t => new Date(t).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export function qtvLedgerButton(game, L) {
  const T = game.data.social.rank.qtv.ledger;
  if (!game.online || !game.cloud) return;
  const box = el('div', 'qtv-ledger'), open = el('button', 'act-btn', T.open);
  box.append(open); L.append(box);
  open.onclick = () => paint();

  async function paint(note) {
    box.replaceChildren(el('b', null, T.title), el('small', 'muted', T.sub));
    const net = await import('../net/rank.js');
    let d;
    try { d = await net.qtvLedger(); } catch { box.append(el('p', 'muted', T.err.net)); return; }
    box.append(el('p', null, fill(T.bal, d)), el('p', 'muted', fill(T.week, { tuan: d.tuan, max: d.gioi_han })));
    if (note) box.append(el('p', 'qtv-note', note));
    const can = Math.min(d.du, d.gioi_han - d.tuan);
    if (can > 0) {
      const row = el('div', 'qtv-doi'), inp = el('input'), go = el('button', 'act-btn primary', T.go);
      inp.type = 'number'; inp.min = 1; inp.max = can; inp.value = can; inp.setAttribute('aria-label', T.ask);
      go.onclick = async () => {
        const n = Math.floor(Number(inp.value));
        if (!(n >= 1 && n <= can)) { paint(T.err.so_sai); return; }
        if ((await game.dialog.choose(`${T.ask} ${n} → ${n} Tiên Ngọc`, [{ id: 'no', label: 'Thôi' }, { id: 'yes', label: T.go }])) !== 'yes') return;
        go.disabled = true;
        try {
          let r;
          await game.cloud.run(() => net.qtvExchange(n), x => { r = x; game.save.tn = x.tn; game.persist(); });
          paint(fill(T.done, { n, tn: r?.tn ?? '' }));
        } catch (e) { paint(T.err[e?.message] || T.err.net); }
      };
      row.append(inp, go); box.append(row);
    }
    const list = el('div', 'qtv-dong');
    if (!d.dong.length) list.append(el('p', 'muted', T.empty));
    for (const r of d.dong) {
      const line = el('div', 'qtv-line ' + (r.diem >= 0 ? 'up' : 'down'));
      line.append(el('b', null, (r.diem > 0 ? '+' : '') + r.diem), el('span', null, `${T.src[r.nguon] || r.nguon} · ${r.ghi || ''}`), el('small', null, when(r.luc)));
      list.append(line);
    }
    box.append(list);
  }
}
