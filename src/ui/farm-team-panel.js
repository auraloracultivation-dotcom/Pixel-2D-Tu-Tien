// Bảng tổ đội farm (chủ dự án chốt 04/11/2026): chữ trơn, không viền, nền trong suốt, bên trái màn hình dưới chỗ cột nhặt đồ.
// Chỉ hiện khi đã đăng nhập và đang ở tinh cầu ngoài trời. Chưa có đội: tên vài tổ đội trên tinh cầu này (chạm để vào / xin vào),
// "Xem thêm" mở hết, rồi "Lập tổ đội". Có đội: tên đội, thành viên (sáng: cùng tinh cầu; xám: tinh cầu khác), đội trưởng chạm tên
// để mời ra, đổi chế độ mở / duyệt, nhận / từ chối lời xin; "Thoát tổ đội". Dòng thưởng "Tổ đội +x%..." đứng đầu khi có thưởng.
// Chạm dòng "Tổ đội" để thu gọn (nhớ trong máy). Chữ ở data/doi-farm.json, kiểu ở src/ui/farm-team.css.
import { startFarmTeam, FT, isOpenWorld, teamOn, createTeam, joinTeam, leaveTeam, kickMember, decideJoin, toggleMode } from '../game/farm-team.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
const KEY = 'p2d-doi-farm-gon';
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
function el(tag, cls, text, onTap) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (onTap) { e.classList.add('tap'); e.addEventListener('click', ev => { ev.stopPropagation(); onTap(); }); }
  return e;
}

export function createFarmTeamPanel(game) {
  const c = FT(game), T = c.text;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./farm-team.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const box = el('div', 'ft-panel'); box.id = 'farm-team'; box.hidden = true;
  box.addEventListener('pointerdown', e => { if (e.target.closest('.tap')) e.stopPropagation(); });   // chạm chữ không thành cần gạt
  document.body.append(box);
  let more = false, gon = false, key = '';
  try { gon = localStorage.getItem(KEY) === '1'; } catch { /* chế độ riêng tư */ }

  function paint() {
    const show = teamOn(game) && isOpenWorld(game) && !game.trip;
    box.hidden = !show;
    if (!show) { key = ''; return; }
    const st = game.farmTeam?.st, pct = game.farmTeamPct?.() || 0;
    const k = JSON.stringify([st, pct, more, gon]);
    if (k === key) return;
    key = k;
    const rows = [];
    if (pct > 0) rows.push(el('div', 'ft-buff', fill(T.buff, { pct })));
    rows.push(el('div', 'ft-head', `${T.head} ${gon ? '▸' : '▾'}`, () => {
      gon = !gon; try { localStorage.setItem(KEY, gon ? '1' : '0'); } catch { /* chế độ riêng tư */ }
      paint();
    }));
    if (!gon && st) rows.push(...(st.toi ? mine(st.toi) : list(st.ds || [])));
    box.replaceChildren(...rows);
  }

  // Chưa có đội: danh sách tổ đội có người trên tinh cầu này
  function list(ds) {
    const out = [];
    if (!ds.length) out.push(el('div', 'ft-muted', T.none));
    for (const d of more ? ds : ds.slice(0, c.show)) {
      const tag = [fill(T.count, { n: d.n, max: c.max }), T.mode_tag[d.che_do], d.xin ? T.asked : ''].filter(Boolean).join(' · ');
      const row = el('div', 'ft-team' + (d.n >= c.max ? ' full' : ''), null, () => joinTeam(game, d));
      row.append(el('span', null, d.ten), el('small', null, ` ${tag}`));
      out.push(row);
    }
    if (ds.length > c.show) out.push(el('div', 'ft-more', more ? T.less : T.more, () => { more = !more; paint(); }));
    out.push(el('div', 'ft-btn', T.create, () => createTeam(game)));
    return out;
  }

  // Có đội: thành viên, việc của đội trưởng
  function mine(t) {
    const out = [el('div', 'ft-mine', fill(T.mine, { name: t.ten, n: t.tv.length, max: c.max }))];
    for (const m of t.tv) {
      const tap = t.truong && !m.la_toi ? () => kickMember(game, m) : null;
      out.push(el('div', 'ft-mem ' + (m.cung ? 'on' : 'xa') + (m.la_toi ? ' me' : ''), `${m.truong ? T.lead_mark + ' ' : ''}${m.ten}`, tap));
    }
    if (t.truong) {
      out.push(el('div', 'ft-mode', fill(T.mode, { mode: T.mode_name[t.che_do] }), () => toggleMode(game)));
      if (t.xin?.length) {
        out.push(el('div', 'ft-muted', T.req_head));
        for (const r of t.xin) {
          const row = el('div', 'ft-req');
          row.append(el('span', null, r.ten + ' '), el('b', 'ft-yes', T.accept, () => decideJoin(game, r, true)), el('span', null, ' · '),
            el('b', 'ft-no', T.decline, () => decideJoin(game, r, false)));
          out.push(row);
        }
      }
    }
    out.push(el('div', 'ft-btn', T.leave, () => leaveTeam(game)));
    return out;
  }

  startFarmTeam(game, paint);
  every(paint, 500);
}
