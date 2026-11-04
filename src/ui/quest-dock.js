// Nhiệm vụ hằng ngày hiện thẳng trên màn hình (chủ dự án 02/11/2026 13:38: "kéo ra ngoài dạng chữ, nền trong suốt, đừng chắn
// phần hiện đồ nhận được khi farm"). Cột chữ bên phải, ngay dưới khung nhiệm vụ truyện (cột nhận đồ #feed nằm bên trái).
// Dòng đầu là điểm danh, rồi từng việc hôm nay, cuối là rương. Dòng đã xong mà chưa nhận thì sáng màu, chạm để nhận;
// chạm dòng điểm danh để điểm danh; chạm dòng chưa xong thì tự hành đi làm việc ngày (kéo cần chạy để dừng). Mũi tên ở dòng tiêu đề: chạm để thu / mở cột này (chủ dự án 04/11/2026 09:05, thay nút Nhiệm vụ; nhớ trên máy); bảng đầy đủ mở từ dòng "Chi tiết".
import { ensureDaily, taskDef, taskText, claimTask, claimChest } from '../game/daily.js';
import { checkinOn, checkinCached, loadCheckin, doCheckin } from '../game/checkin.js';
import { pilotDaily } from '../game/pilot.js';
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt

const KEY = 'p2d.questdock.v1';
function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}
const getHide = () => { try { return localStorage.getItem(KEY) === '0'; } catch { return false; } };
const setHide = h => { try { localStorage.setItem(KEY, h ? '0' : '1'); } catch { /* chế độ riêng tư */ } };

export function createQuestDock(game) {
  const C = game.data.checkin.text;
  const box = el('div', 'quest-dock'); box.id = 'quest-dock'; box.hidden = true;
  document.body.append(box);
  box.addEventListener('pointerdown', e => e.stopPropagation());
  let hide = getHide(), key = '', loaded = 0;

  const line = (cls, text, onTap) => {
    const d = el('div', 'qd-line ' + cls);   // một dấu ✓ đầu dòng: xanh là xong, xám là chưa (style-ui-kit.css)
    if (cls === 'more') d.textContent = text;
    else d.append(el('span', 'qd-ck', '✓'), text.replace(/^[✓▸•]\s*/, ''));
    if (onTap) d.onclick = () => { onTap(); key = ''; paint(); };
    return d;
  };

  function paint() {
    const r = document.querySelector('#hud .bar.qi')?.getBoundingClientRect();
    box.style.top = `${Math.round((r && r.height ? r.bottom : 90) + 10)}px`;   // bên trái, dưới thanh linh khí (chủ dự án 04/11/2026 09:19)
    const dl = ensureDaily(game), ck = checkinOn(game) ? checkinCached() : null;
    const k = [hide, ck?.hom_nay, ck?.vi_tri, dl.chest, ...dl.tasks.map(t => `${t.n}${t.got}`)].join('|');
    if (k === key) return;
    key = k; box.replaceChildren();
    const head = el('div', 'qd-head', 'Nhiệm vụ hằng ngày'), arrow = el('i', 'qd-arrow' + (hide ? ' dong' : ''));
    head.append(arrow); head.onclick = () => game.toggleQuestDock();
    box.append(head); box.classList.toggle('gon', hide);
    if (hide) return;
    if (ck && ck.vi_tri != null) {
      box.append(ck.hom_nay ? line('done', `✓ ${C.title}: ngày ${ck.vi_tri}/112`)
        : line('ready', `▸ ${C.btn} (ngày ${(ck.vi_tri || 0) % 112 + 1}/112)`, async () => { const r = await doCheckin(game); if (r.msg) game.toast(r.msg, 2.4); key = ''; paint(); }));
    }
    dl.tasks.forEach((t, i) => {
      const d = taskDef(game, t.id); if (!d) return;
      const done = t.n >= d.n;
      if (t.got) box.append(line('done', '✓ ' + taskText(d, t.n)));
      else if (done) box.append(line('ready', '▸ ' + taskText(d, t.n) + ' · Nhận', () => { const g = claimTask(game, i); if (g) { game.toast('Nhận: ' + g.join(', '), 2); game.sfx('levelup'); } }));
      else box.append(line('todo', '• ' + taskText(d, t.n), () => pilotDaily(game)));   // chạm: tự hành làm việc ngày
    });
    const all = dl.tasks.every(t => t.got);
    if (dl.chest) box.append(line('done', '✓ Rương hằng ngày'));
    else if (all) box.append(line('ready', '▸ Mở rương hằng ngày', () => { const g = claimChest(game); if (g) { game.toast('Rương: ' + g.join(', '), 2); game.sfx('levelup'); } }));
    else box.append(line('todo', `• Rương: nhận đủ ${dl.tasks.length} việc để mở`));
    box.append(line('more', 'Chi tiết ›', () => { game.closeAll?.(); game.openOldPanel?.({ btn: 'btn-daily' }); }));
  }

  game.toggleQuestDock = () => { hide = !hide; setHide(hide); key = ''; tick(); };
  function tick() {
    const off = !game.save || !game.player || game.trip || game.dialog.open;
    box.hidden = off;
    if (off) return;
    if (checkinOn(game) && Date.now() - loaded > 300000) { loaded = Date.now(); loadCheckin(game).then(() => { key = ''; }); }
    paint();
  }
  every(tick, 2000);
}
