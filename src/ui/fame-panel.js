// Bảng vinh danh góp ý (data/referral.json → fame): top 20 người có nhiều báo lỗi / đề xuất được nhận nhất, mỗi vấn đề được nhận
// thưởng 1 viên ngọc (máy chủ tự gửi qua Hòm thư khi đội làm game đánh dấu đã sửa / sẽ làm). Mở bằng game.openFame().
const net = () => import('../net/referral.js');
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createFame(game) {
  const F = game.data.referral?.fame;
  if (!F) return;
  const root = el('div', 'panel ev-panel'); root.hidden = true;
  const head = el('div', 'bag-head'), x = el('button', 'mini', F.close), body = el('div', 'ev-body');
  head.append(el('b', null, F.title), x);
  root.append(head, body);
  document.body.append(root);
  let ticket = 0, back = null;   // back: bảng đang mở bên dưới (báo lỗi, thông báo), đóng thì hiện lại

  function close() {
    root.hidden = true; ticket++;
    if (back) { back.hidden = false; back = null; } else game.uiOpen = false;
  }
  x.onclick = close;
  root.addEventListener('pointerdown', e => e.stopPropagation());

  const say = t => { body.textContent = ''; body.append(el('p', 'ev-rule', fill(F.rule, { gem: F.gem })), el('p', 'muted', t)); };

  async function open(from) {
    if (root.hidden && from && !from.hidden) { back = from; from.hidden = true; }
    root.hidden = false; game.uiOpen = true;
    if (!game.online) return say(F.login);
    const my = ++ticket;
    say(F.loading);
    const r = await net().then(m => m.fameRank()).catch(() => ({ error: 'net' }));
    if (my !== ticket) return;
    if (r.error) return say(r.error === 'chua_dang_nhap' ? F.login : F.error);
    const d = r.data;
    body.textContent = '';
    body.append(el('p', 'ev-rule', fill(F.rule, { gem: F.gem })));
    if (d.toi) body.append(el('p', 'fb-msg', fill(F.me, { n: d.toi.tong, c: d.toi.cho })));
    const list = el('div', 'ev-fame');
    if (!d.top.length) list.append(el('p', 'muted', F.empty));
    for (const t of d.top) {
      const row = el('div', 'ev-fame-row' + (t.la_toi ? ' me' : '') + (t.hang <= 3 ? ` top${t.hang}` : ''));
      row.append(el('b', null, t.hang <= 3 ? ['🥇', '🥈', '🥉'][t.hang - 1] : t.hang), el('span', null, t.ten), el('small', null, fill(F.row, { loi: t.loi, dx: t.de_xuat })), el('i', null, `💎${t.tong}`));
      list.append(row);
    }
    body.append(list);
  }
  game.openFame = open;
}
