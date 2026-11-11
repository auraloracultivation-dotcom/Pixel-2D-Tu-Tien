// Bảng Luyện chế (Hệ Pháp Bảo, tài khoản thử; mở bằng nút "Luyện chế" thay chỗ nút pháp bảo cũ). Chữ ở data/phap-bao.json ui, kiểu src/ui/phap-bao.css.
//   Đang mặc: 3 ô (chạm để xem, chọn ô sẽ mặc vào) · Chi tiết món đang chọn: chỉ số gốc, hồi chiêu, linh lực, 3 ô luyện chế nối mũi tên
//   (chạm ô rồi chạm chiêu để khảm, chạm chiêu đang khảm để tháo), Nâng cấp, Đục ô, Mặc vào ô · Danh sách chiêu khảm theo 4 nhóm
//   (khoá thì ghi mốc mở) · Pháp bảo của ta.
import { PB, pbOn, pbState, pbItem, pbWorn, pbType, pbGrade, pbItemStats, modOpen, modNeed, pbWear, pbSocket, pbUpgrade, pbUpCost, pbCap, pbDrill } from '../game/phap-bao.js';
import { pbIcon, typeIcon } from './phap-bao-hud.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';
function el(tag, cls, text, onTap) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (onTap) e.addEventListener('click', ev => { ev.stopPropagation(); onTap(); });
  return e;
}
const pct = (s, v) => (['speed', 'atk_pct', 'hp_pct', 'crit', 'crit_dmg', 'cdr', 'dr', 'regen_pct', 'mp_regen'].includes(s) ? `+${v}%` : `+${v}`);

export function createPhapBaoPanel(game) {
  const D = () => PB(game), U = () => D().ui;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./phap-bao.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const box = el('div', 'panel pb-panel'); box.id = 'phap-bao'; box.hidden = true;
  box.addEventListener('pointerdown', e => e.stopPropagation());
  document.body.append(box);
  let sel = null, wearAt = 0, k = 0, note = '', tries = 0;

  function open() {
    if (!game.save || !pbOn(game) || game.dialog?.open || game.trip) return;
    pbState(game);
    sel ??= pbWorn(game)[0]?.uid ?? pbState(game).items[0]?.uid;
    game.uiOpen = true; box.hidden = false; note = ''; tries = 0; paint();
  }
  function close() { game.uiOpen = false; box.hidden = true; }
  const say = t => { note = t || ''; paint(); };

  function paint() {
    const st = pbState(game), it = pbItem(game, sel), Uu = U();
    const head = el('div', 'bag-head');
    head.append(el('b', null, Uu.title), el('span', 'panel-sub', `${D().drill.name}: ${st.stones || 0} · Linh Thạch: ${(game.save.lingshi || 0).toLocaleString('vi-VN')}`), el('button', 'close-x', '✕', close));
    const body = el('div', 'pb-body');
    body.append(el('div', 'pb-h', Uu.wear), wornRow());
    if (it) body.append(detail(it));
    if (note) body.append(el('div', 'pb-note', note));
    if (it) body.append(modList(it));
    body.append(el('div', 'pb-h', Uu.bag), bagRow(), el('div', 'pb-hint', `${Uu.dummy}.`));
    box.replaceChildren(head, body);
    if ([...box.querySelectorAll('.pb-ic')].some(i => !i.style.backgroundImage) && (tries = (tries || 0) + 1) < 10) setTimeout(() => { if (!box.hidden) paint(); }, 300);   // hình chưa tải xong: vẽ lại
  }

  function card(it, small, onTap, on) {
    const T = pbType(game, it), g = pbGrade(game, it), c = el('div', 'pb-card' + (small ? ' sm' : '') + (on ? ' on' : ''), null, onTap);
    const ic = el('i', 'pb-ic'); ic.style.backgroundImage = typeIcon(game, T); ic.style.borderColor = g.color;
    c.append(ic, el('span', 'pb-nm', T.name), el('small', null, `${g.name} · cấp ${it.lv || 0} · ${it.slots} ô`));
    c.style.setProperty('--gc', g.color);
    return c;
  }

  function wornRow() {
    const row = el('div', 'pb-row');
    pbWorn(game).forEach((it, i) => {
      if (!it) { row.append(el('div', 'pb-card empty' + (wearAt === i ? ' on' : ''), `Ô ${i + 1} trống`, () => { wearAt = i; paint(); })); return; }
      const c = card(it, false, () => { sel = it.uid; wearAt = i; k = 0; note = ''; paint(); }, sel === it.uid);
      c.prepend(el('em', 'pb-slotno', `${i + 1}`));
      row.append(c);
    });
    return row;
  }

  function detail(it) {
    const T = pbType(game, it), Uu = U(), wrap = el('div', 'pb-detail');
    const top = el('div', 'pb-top'), ic = el('i', 'pb-ic big'); ic.style.backgroundImage = typeIcon(game, T); ic.style.borderColor = pbGrade(game, it).color;
    const info = el('div', 'pb-info');
    info.append(el('b', null, `${T.name} · ${pbGrade(game, it).name} · cấp ${it.lv || 0}/${pbCap(game)}`), el('span', 'pb-chip ' + T.group, D().groups[T.group]), el('p', null, T.desc));
    const S = D().stats, stats = Object.entries(pbItemStats(D(), it)).map(([s, v]) => `${S[s] || s} ${pct(s, v)}`).join(' · ');
    info.append(el('small', null, `${stats} · Hồi ${T.cd} giây · ${T.mp} linh lực · Mạnh: ${T.good} · Yếu: ${T.bad}`));
    top.append(ic, info);
    wrap.append(top, el('div', 'pb-h', `${Uu.slots} · ${Uu.order}`), sockets(it));
    const acts = el('div', 'pb-acts');
    const up = (it.lv || 0) >= pbCap(game) ? Uu.cap : `${Uu.up} (${pbUpCost(game, it).toLocaleString('vi-VN')} Linh Thạch)`;
    acts.append(el('button', 'pb-btn', up, () => say(pbUpgrade(game, it) || `${T.name} lên cấp ${it.lv}!`)));
    acts.append(el('button', 'pb-btn', it.slots >= 3 ? Uu.max : `${Uu.drill} (${Math.round(D().drill.rate[it.slots - 1] * 100)}%)`, () => say(pbDrill(game, it).msg)));
    const at = pbState(game).wear.indexOf(it.uid);
    for (let i = 0; i < 3; i++) acts.append(el('button', 'pb-btn sm' + (at === i ? ' on' : ''), at === i ? Uu.worn.replace('{i}', i + 1) : Uu.equip.replace('{i}', i + 1), () => { pbWear(game, i, it.uid); wearAt = i; paint(); }));
    wrap.append(acts);
    return wrap;
  }

  function sockets(it) {
    const row = el('div', 'pb-sockets'), M = D().mods;
    for (let i = 0; i < 3; i++) {
      if (i) row.append(el('span', 'pb-arrow', '→'));
      const id = it.mods[i], locked = i >= it.slots;
      const s = el('div', 'pb-sock' + (locked ? ' lock' : '') + (k === i && !locked ? ' on' : ''), null, () => { if (!locked) { k = i; paint(); } });
      if (locked) s.append(el('small', null, 'Chưa khai'));
      else if (id && M[id]) { const ic = el('i', 'pb-ic sm'); ic.style.backgroundImage = pbIcon(game, M[id].icon); s.append(ic, el('small', null, M[id].name)); }
      else s.append(el('small', null, `Ô ${i + 1}`));
      row.append(s);
    }
    return row;
  }

  function modList(it) {
    const D2 = D(), wrap = el('div', 'pb-mods');
    wrap.append(el('div', 'pb-hint', D2.ui.pick));
    for (const [g, gname] of Object.entries(D2.mod_groups)) {
      wrap.append(el('div', 'pb-h', gname));
      const grid = el('div', 'pb-grid');
      for (const [id, M] of Object.entries(D2.mods)) {
        if (M.group !== g) continue;
        const open = modOpen(game, id), inK = it.mods[k] === id, used = it.mods.slice(0, it.slots).map((x, i) => (x === id ? i + 1 : 0)).filter(Boolean);
        const c = el('div', 'pb-mod' + (open ? '' : ' lock') + (inK ? ' on' : ''), null, () => {
          if (!open) return say(D2.ui.locked.replace('{realm}', modNeed(game, id)));
          if (k >= it.slots) return say(D2.ui.max);
          pbSocket(game, it, k, inK ? null : id);
          if (!inK && k < it.slots - 1) k++;
          note = ''; paint();
        });
        const ic = el('i', 'pb-ic sm'); ic.style.backgroundImage = pbIcon(game, M.icon);
        const tx = el('div', 'pb-mtx');
        tx.append(el('b', null, M.name + (used.length ? ` (ô ${used.join(', ')})` : '')), el('small', 'gain', M.gain), el('small', 'lose', open ? M.lose : D2.ui.locked.replace('{realm}', modNeed(game, id))));
        c.append(ic, tx);
        grid.append(c);
      }
      wrap.append(grid);
    }
    return wrap;
  }

  function bagRow() {
    const row = el('div', 'pb-row wrap');
    for (const it of pbState(game).items) row.append(card(it, true, () => { sel = it.uid; k = 0; note = ''; paint(); }, sel === it.uid));
    return row;
  }

  // Nút "Luyện chế" (#btn-art) khi đang dùng hệ mới: chặn trước bộ điều khiển (src/core/input.js) rồi mở bảng
  window.addEventListener('pointerdown', e => {
    if (!pbOn(game) || !e.target.closest?.('#btn-art')) return;
    e.stopPropagation(); e.preventDefault();
    if (box.hidden) open(); else close();
  }, true);
  game.openPhapBao = open;
  return { open, close, paint };
}
