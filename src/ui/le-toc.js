// Màn lễ Cây Thế Giới gọi tên huyết mạch (src/game/le-toc.js gọi game.leTocUI(kq) sau khi kết quả đã ghi vào bản lưu).
// Bảy ấn tộc xếp vòng, vệt sáng chạy quanh nhanh rồi chậm dần và dừng ở tộc quay được; ấn giữa nở ra theo màu tộc, hiện tên, độ hiếm, một dòng
// lai lịch, rồi từng dòng chỉ số trời cho và thiên phú (nếu có). Chạm lúc đang quay: chạy nhanh tới kết quả (không bỏ qua kết quả).
// Game đứng yên trong lúc lễ (game.uiOpen). Đang Tự hành / Tự đánh thì tự nhận sau ít giây. Số và chữ: data/tiem-nang.json → le. Kiểu: le-toc.css.
import { goc } from '../core/build.js';
import { TN, gocPct } from '../game/tiem-nang.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createLeTocUI(game) {
  const T = TN(game.data);
  if (!T) return;
  const css = el('link'); css.rel = 'stylesheet'; css.href = goc('src/ui/le-toc.css'); document.head.append(css);
  const root = el('div'); root.id = 'le-toc'; root.hidden = true; document.body.append(root);
  game.leTocUI = kq => new Promise(xong => {
    const L = T.le, ids = Object.keys(T.toc), t = T.toc[kq.toc], H = game.data['he-chien'], n = ids.length, sfx = k => { if (L.sfx?.[k]) game.sfx?.(L.sfx[k]); };
    root.textContent = ''; root.className = ''; root.style.setProperty('--mau', '#cfe9d6');
    const goi = el('div', 'lt-goi', L.goi), vong = el('div', 'lt-vong'), an = el('div', 'lt-an'), han = el('b', 'lt-han'), duoi = el('div', 'lt-duoi');
    const os = ids.map((id, i) => { const o = el('i', 'lt-o', T.toc[id].han); o.style.setProperty('--goc', `${(i * 360 / n).toFixed(1)}deg`); o.style.setProperty('--m', T.toc[id].mau); vong.append(o); return o; });
    for (let i = 0; i < 14; i++) { const h = el('u', 'lt-hat'); h.style.cssText = `left:${(8 + (i * 37) % 84)}%;--tre:${(-(i * 0.53) % 5).toFixed(2)}s;--dai:${(4 + (i % 4) * 0.9).toFixed(1)}s`; root.append(h); }
    an.append(han); vong.append(an); root.append(goi, vong, duoi);
    const wasOpen = game.uiOpen; game.uiOpen = true; root.hidden = false; sfx('mo');
    // Vệt sáng đi tong bước (mấy vòng + tới ô đích), bước sau chậm hơn bước trước; tổng thời gian quay_s giây
    const dich = ids.indexOf(kq.toc), tong = 3 * n + dich, w = Array.from({ length: tong + 1 }, (_, i) => 1 + 9 * (i / tong) ** 3), W = w.reduce((a, b) => a + b, 0);
    let i = 0, tm = 0, nhanh = false, het = false;
    const soi = k => { const id = ids[k % n]; os.forEach((o, j) => o.classList.toggle('sang', j === k % n)); han.textContent = T.toc[id].han; an.style.setProperty('--m', T.toc[id].mau); };
    const buoc = () => {
      soi(i); sfx('nhip');
      if (i >= tong) { ra(); return; }
      const cho = nhanh ? 28 : (L.quay_s ?? 3) * 1000 * w[i] / W; i++;
      tm = setTimeout(buoc, cho);
    };
    const dong = (cls, text, cho) => { const d = el('div', cls, text); d.style.setProperty('--tre', `${cho.toFixed(2)}s`); duoi.append(d); return d; };
    function ra() {   // dừng ở tộc quay được
      het = true; sfx('dung'); root.style.setProperty('--mau', t.mau); root.classList.add('ra', 'h-' + t.hiem); goi.textContent = L.ten;
      const hiem = T.hiem[t.hiem], ten = dong('lt-ten', t.ten, 0.15), the = el('small', 'lt-hiem', hiem.ten); the.style.setProperty('--h', hiem.mau); ten.append(the);
      dong('lt-loi', t.loi, 0.45);
      const ds = Object.entries(kq.goc).sort((a, b) => b[1] - a[1]), d0 = 1.0, ds_s = L.dong_s ?? 0.4;
      dong('lt-nhan', L.goc, d0 - 0.1);
      ds.forEach(([k, v], j) => { dong('lt-so', `${H.ten?.[k] || k}  +${String(gocPct(game.data, k, v)).replace('.', ',')}%`, d0 + j * ds_s); setTimeout(() => { if (!root.hidden) sfx('dong'); }, (d0 + j * ds_s) * 1000); });
      let sau = d0 + ds.length * ds_s;
      if (t.thien_phu) { const p = dong('lt-tp', '', sau); p.append(el('b', '', t.thien_phu.ten), el('span', '', t.thien_phu.mo_ta)); sau += ds_s; }
      dong('lt-mot', L.mot_luot, sau + 0.1);
      const nut = el('button', 'lt-nut', L.nhan); nut.style.setProperty('--tre', `${(sau + 0.4).toFixed(2)}s`); duoi.append(nut);
      const dong_lai = () => { if (root.hidden) return; clearTimeout(tm); root.hidden = true; game.uiOpen = wasOpen; sfx('nhan'); xong(); };
      nut.onclick = e => { e.stopPropagation(); dong_lai(); };
      const tu = () => { if (root.hidden) return; if (game.pilot || game.auto) dong_lai(); else tm = setTimeout(tu, 500); };   // Tự hành / Tự đánh: không giữ chân
      tm = setTimeout(tu, (sau + 0.4 + (L.tu_dong_s ?? 2)) * 1000);
    }
    root.onclick = () => { if (!het) nhanh = true; };
    tm = setTimeout(buoc, 700);
  });
}
