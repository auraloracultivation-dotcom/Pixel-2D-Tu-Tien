// Khiên PvP ngay sau tên (chủ dự án 06/11/2026 10:49; 10:56: hiện ở mọi nơi, tắt ở đâu cũng được; 19/11/2026: đánh nhau ở mọi nơi trừ vòng pháp trận): trên đầu nhân vật mình hiện "tên 🛡" (còn khiên),
// "tên ⚔" (đã tắt khiên); người khác cũng thấy biểu tượng sau tên mình (render/draw-nguoi.js). Chạm biểu tượng của mình → bảng
// xác nhận "Bạn có muốn tắt khiên không?". Khiên chỉ bật lại khi chết hồi sinh (máy chủ phòng cloud/src/pvp.js giữ). Chữ ở
// data/pvp.json → text, kiểu ở pvp.css. Nhãn là chữ HTML bám theo đầu nhân vật mỗi khung hình (chạm được, không vẽ lên khung game).
// Hóa ma (chủ dự án 22/11/2026 01:54: "Tắt khiên thêm 1 nút bên cạnh nữa, hoá ma!"; 02:21: khiên đổi thành đầu lâu, thanh máu màu đen): bảng xác nhận có
// thêm nút "Hóa ma!" cạnh "Tắt khiên" (cả khi đã tắt khiên); bấm thì hiện bảng thứ hai nói rõ luật rồi mới hóa (src/game/pvp-ma.js hoaMa). Đang là ma:
// biểu tượng là đầu lâu kèm số điểm ma (số lần còn phải chết), thanh máu dưới tên màu đen; chạm vào thì nhắc còn mấy lần.
import { goc } from '../core/build.js';
import { togglePvp, pvpLeft } from '../game/pvp.js';
import { hoaMa, toiMa, toiMoi } from '../game/pvp-ma.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

export function createPvpBtn(game) {
  const C = game.data.pvp;
  if (!C) return;
  const T = C.text;
  const css = el('link'); css.rel = 'stylesheet'; css.href = goc('src/ui/pvp.css');
  document.head.append(css);
  const tag = el('button', 'pvp-tag'); tag.id = 'pvp-tag'; tag.type = 'button'; tag.hidden = true;
  const nm = el('span'), ic = el('b'), so = el('em');   // so: điểm ma cạnh đầu lâu
  const hp = el('i', 'pvp-hp'), hpIn = el('u');   // thanh máu dưới tên (chủ dự án 09/11/2026 10:42)
  hp.append(hpIn);
  tag.append(nm, ic, so, hp);
  document.body.append(tag);

  // Bảng xác nhận: một khung, hai lượt (tắt khiên / hóa ma → luật hóa ma)
  const box = el('div', 'pvp-ask'); box.hidden = true;
  const card = el('div', 'pvp-ask-card'), q = el('p', 'pvp-ask-q'), note = el('p', 'pvp-ask-note'), row = el('div', 'pvp-ask-row');
  card.append(q, note, row); box.append(card);
  document.body.append(box);
  const close = () => { box.hidden = true; game.uiOpen = game.uiOpen === 'pvp-ask' ? null : game.uiOpen; };
  const nut = (cls, text, fn) => { const b = el('button', cls, text); b.type = 'button'; b.addEventListener('click', ev => { ev.stopPropagation(); fn(); }); return b; };
  const mo = () => { box.hidden = false; if (!game.uiOpen) game.uiOpen = 'pvp-ask'; };
  function lan1() {   // tắt khiên (còn khiên), hoặc chỉ nút hóa ma (đã tắt khiên: khiên tự bật sau reshield_s giây / Ngoại Vực chỉ bật khi chết)
    card.classList.remove('ma');
    const off = !!game.pvp?.off, s = off ? pvpLeft(game) : null;
    q.textContent = off ? T.off : T.ask;
    note.textContent = off ? (s === null ? T.only_death : T.wait_on.replace('{s}', s)) : T.ask_note;
    row.replaceChildren(nut('pvp-no', T.no, close), nut('pvp-ma', T.ma_btn, lan2), ...(off ? [] : [nut('pvp-yes', T.yes, () => { close(); togglePvp(game, true); })]));
    mo();
  }
  function lan2() {   // luật hóa ma, bấm lần nữa mới hóa
    if (toiMoi(game)) { close(); game.toast(T.ma_moi, 2.6); return; }
    card.classList.add('ma');
    q.textContent = T.ma_ask; note.textContent = T.ma_note;
    row.replaceChildren(nut('pvp-no', T.no, close), nut('pvp-yes pvp-ma-yes', T.ma_yes, () => { close(); hoaMa(game); }));
    mo();
  }
  box.addEventListener('pointerdown', ev => { ev.stopPropagation(); if (ev.target === box) close(); });

  tag.addEventListener('pointerdown', ev => ev.stopPropagation());
  tag.addEventListener('click', ev => {
    ev.stopPropagation();
    if (toiMa(game)) { game.toast(fill(T.ma_khong_bat, { n: game.pvp.ma }), 2.6); return; }
    if (!game.online?.pvpOff) { game.toast(T.offline, 2); return; }
    lan1();
  });

  let key = '', tf = 0;
  const frame = t => {
    requestAnimationFrame(frame);
    if (t - tf < 32) return; tf = t;   // ~30 lần/giây là đủ bám nhân vật (máy nóng, 09/11/2026)
    const p = game.player, show = !!p && !!game.online && !game.trip && !!game.save && !game.dialog?.open && (!game.uiOpen || game.uiOpen === 'pvp-ask');
    if (!show) { if (!tag.hidden) tag.hidden = true; key = ''; return; }
    const off = !!game.pvp?.off, ma = game.pvp?.ma || 0, name = game.online?.me?.name || game.save.name || '', k = `${off}|${ma}|${name}`;
    if (k !== key) {   // hình khiên bật / tắt, đầu lâu ở pvp.css (ảnh chủ dự án 07/11/2026; đầu lâu tools/art/dau_lau.py)
      key = k; nm.textContent = name; ic.textContent = ''; so.textContent = ma > 0 ? String(ma) : '';
      tag.classList.toggle('off', off); tag.classList.toggle('ma', ma > 0);
      tag.title = ma > 0 ? fill(T.ma_tag, { n: ma }) : off ? T.off : T.on;
    }
    const s = game.screen.toScreen(p.x, p.y - (p.top || 24) - (p.riding || p.flying ? p.lift || 0 : 0) - 8);   // tên sát đầu, danh hiệu nằm trên tên (chủ dự án 18/11/2026 09:49: "tên ở dưới, danh hiệu ở trên")
    tag.hidden = false;
    const hk = Math.max(0, Math.min(1, p.hp / (p.maxHp || 1))), hw = `${Math.round(hk * 100)}%`, mau = ma > 0 ? '#050507' : hk > 0.5 ? '#e0484a' : hk > 0.25 ? '#e8823a' : '#f2c94c';
    if (hpIn.style.width !== hw) hpIn.style.width = hw;
    if (hpIn.dataset.mau !== mau) { hpIn.dataset.mau = mau; hpIn.style.background = mau; }   // ma: thanh máu đen (chủ dự án 02:20)
    tag.style.transform = `translate(${Math.round(s.x)}px, ${Math.round(s.y)}px) translate(-50%, -100%)`;
  };
  requestAnimationFrame(frame);
}
