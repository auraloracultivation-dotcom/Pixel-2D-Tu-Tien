// Nhiệm vụ hằng ngày hiện thẳng trên màn hình (chủ dự án 02/11/2026 13:38: "kéo ra ngoài dạng chữ, nền trong suốt, đừng chắn
// phần hiện đồ nhận được khi farm"). Cột chữ bên phải, ngay dưới khung nhiệm vụ truyện (cột nhận đồ #feed nằm bên trái).
// Dòng đầu là điểm danh, rồi từng việc hôm nay, cuối là rương. Dòng đã xong mà chưa nhận thì sáng màu, chạm để nhận;
// chạm dòng điểm danh để điểm danh; chạm dòng chưa xong thì tự hành đi làm việc ngày (kéo cần chạy để dừng). Nút Nhiệm vụ: chạm để ẩn / hiện cột này (nhớ trên máy); bảng đầy đủ mở từ dòng "Chi tiết".
import { ensureDaily, taskDef, taskText, claimTask, claimChest } from '../game/daily.js';
import { checkinOn, checkinCached, loadCheckin, doCheckin } from '../game/checkin.js';
import { pilotDaily } from '../game/pilot.js';

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
    const d = el('div', 'qd-line ' + cls, text);
    if (onTap) d.onclick = () => { onTap(); key = ''; paint(); };
    return d;
  };

  function paint() {
    const goal = document.getElementById('goal'), r = goal?.getBoundingClientRect();
    box.style.top = `${Math.round((r && r.height ? r.bottom : 8) + 6)}px`;
    const dl = ensureDaily(game), ck = checkinOn(game) ? checkinCached() : null;
    const k = [hide, ck?.hom_nay, ck?.vi_tri, dl.chest, ...dl.tasks.map(t => `${t.n}${t.got}`)].join('|');
    if (k === key) return;
    key = k; box.replaceChildren();
    box.append(el('div', 'qd-head', 'Nhiệm vụ hằng ngày'));
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
    const off = hide || !game.save || !game.player || game.trip || game.dialog.open;
    box.hidden = off;
    if (off) return;
    if (checkinOn(game) && Date.now() - loaded > 300000) { loaded = Date.now(); loadCheckin(game).then(() => { key = ''; }); }
    paint();
  }
  setInterval(tick, 1000);
}
