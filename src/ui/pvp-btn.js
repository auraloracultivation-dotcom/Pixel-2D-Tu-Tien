// Khiên PvP ngay sau tên (chủ dự án 06/11/2026 10:49; 10:56: hiện ở mọi nơi, tắt ở đâu cũng được, chỉ Ngoại Vực mới đánh nhau): trên đầu nhân vật mình hiện "tên 🛡" (còn khiên) hoặc
// "tên ⚔" (đã tắt khiên); người khác cũng thấy biểu tượng sau tên mình (render/draw.js drawOther). Chạm biểu tượng của mình → bảng
// xác nhận "Bạn có muốn tắt khiên không?". Khiên chỉ bật lại khi chết hồi sinh (máy chủ phòng cloud/src/pvp.js giữ). Chữ ở
// data/pvp.json → text, kiểu ở pvp.css. Nhãn là chữ HTML bám theo đầu nhân vật mỗi khung hình (chạm được, không vẽ lên khung game).
import { togglePvp } from '../game/pvp.js';

const ver = () => new URL(import.meta.url).searchParams.get('v') || 'dev';

export function createPvpBtn(game) {
  const C = game.data.pvp;
  if (!C) return;
  const T = C.text;
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL(`./pvp.css?v=${ver()}`, import.meta.url).href;
  document.head.append(css);
  const tag = document.createElement('button');
  tag.className = 'pvp-tag'; tag.id = 'pvp-tag'; tag.type = 'button'; tag.hidden = true;
  const nm = document.createElement('span'), ic = document.createElement('b');
  tag.append(nm, ic);
  document.body.append(tag);

  // Bảng xác nhận tắt khiên
  const box = document.createElement('div');
  box.className = 'pvp-ask'; box.hidden = true;
  const card = document.createElement('div'); card.className = 'pvp-ask-card';
  const q = document.createElement('p'); q.className = 'pvp-ask-q'; q.textContent = T.ask;
  const note = document.createElement('p'); note.className = 'pvp-ask-note'; note.textContent = T.ask_note;
  const row = document.createElement('div'); row.className = 'pvp-ask-row';
  const yes = document.createElement('button'); yes.type = 'button'; yes.className = 'pvp-yes'; yes.textContent = T.yes;
  const no = document.createElement('button'); no.type = 'button'; no.className = 'pvp-no'; no.textContent = T.no;
  row.append(no, yes); card.append(q, note, row); box.append(card);
  document.body.append(box);
  const close = () => { box.hidden = true; game.uiOpen = game.uiOpen === 'pvp-ask' ? null : game.uiOpen; };
  no.addEventListener('click', ev => { ev.stopPropagation(); close(); });
  box.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (ev.target === box) close(); });
  yes.addEventListener('click', ev => { ev.stopPropagation(); close(); togglePvp(game, true); });

  tag.addEventListener('pointerdown', ev => ev.stopPropagation());
  tag.addEventListener('click', ev => {
    ev.stopPropagation();
    if (game.pvp?.off) { game.toast(T.only_death, 2.4); return; }
    if (!game.online?.pvpOff) { game.toast(T.offline, 2); return; }
    box.hidden = false; if (!game.uiOpen) game.uiOpen = 'pvp-ask';
  });

  let key = '', tf = 0;
  const frame = t => {
    requestAnimationFrame(frame);
    if (t - tf < 32) return; tf = t;   // ~30 lần/giây là đủ bám nhân vật (máy nóng, 09/11/2026)
    const p = game.player, show = !!p && !!game.online && !game.trip && !!game.save && !game.dialog?.open && (!game.uiOpen || game.uiOpen === 'pvp-ask');
    if (!show) { if (!tag.hidden) tag.hidden = true; key = ''; return; }
    const off = !!game.pvp?.off, name = game.online?.me?.name || game.save.name || '', k = `${off}|${name}`;
    if (k !== key) { key = k; nm.textContent = name; ic.textContent = ''; tag.classList.toggle('off', off); tag.title = off ? T.off : T.on; }   // hình khiên bật / tắt ở pvp.css (ảnh chủ dự án 07/11/2026)
    const s = game.screen.toScreen(p.x, p.y - (p.top || 24) - (game.save.title ? 20 : 8));
    tag.hidden = false;
    tag.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
  };
  requestAnimationFrame(frame);
}
