// Hàng chữ lớn bên trái màn hình (chủ dự án 21/11/2026 08:48: khẩu quyết trong bong bóng chat thì nhỏ, không ai đọc được; "có thể tạo hiệu ứng thành
// hàng chữ to bên trái màn hình"). Dùng cho khẩu quyết lúc thi triển pháp bảo (src/game/tu-linh.js) và vài khoảnh khắc của nhiệm vụ chính (lệnh { chu: … }
// trong data/story.json). Chữ quét ra từ trái sang như nét bút, chữ lệnh đập xuống sau cùng, phía sau là chữ Hán mờ của chữ lệnh; đứng một nhịp rồi tan.
//   game.chuLon({ cau: 'câu' | ['dòng 1', 'dòng 2'], lenh: 'Trảm', han: '斬', mau: '#màu', giu: giây đứng yên, ky: true | nhan: 'chữ nhỏ phía trên' })
// ky: dòng này là một dòng Hệ Thống CHÉP VÀO SỔ Trấn Ma Kỷ (tiếng chuông gửi người bị giữ, một cái tên đã về): phía trên có nhãn nhỏ "Trấn Ma Kỷ chép"
// (data/tran-ma-ky.json → chu.ky). Cuốn sổ không nằm trong bảng nào: nó hiện ra thành chữ ngay trên màn chơi, đúng lúc việc ấy xảy ra.
// Không nhận chạm, không dừng game. Đang hiện mà gọi nữa thì thay luôn. Kiểu: chu-lon.css. Số ở data/tran-ma-ky.json → chu.
import { goc } from '../core/build.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

export function createChuLon(game) {
  const C = game.data['tran-ma-ky']?.chu || {};
  const css = el('link'); css.rel = 'stylesheet'; css.href = goc('src/ui/chu-lon.css'); document.head.append(css);
  const box = el('div'); box.id = 'chu-lon'; box.hidden = true; box.setAttribute('aria-hidden', 'true'); document.body.append(box);
  let tm = 0, last = -9;
  game.chuLon = K => {
    if (!K || C.on === false || game.cheMan || game.manToi) return;   // màn đang che (tải bản đồ) hoặc màn tối: không ai đọc
    const now = performance.now() / 1000, lines = [].concat(K.cau || []).filter(Boolean), step = C.step_s ?? 0.16, giu = K.giu ?? C.giu_s ?? 1.0;
    if (K.thua && now - last < (C.gap_s ?? 2)) return;   // thua: lời hô lặp lại nhiều (pháp bảo): hai lần cách nhau ít nhất gap_s giây
    last = now;
    box.textContent = ''; box.style.setProperty('--mau', K.mau || '#ffd98a');
    if (K.han) box.append(el('i', 'cl-han', K.han));
    const nhan = K.nhan || (K.ky && C.ky), eNhan = nhan ? el('small', 'cl-nhan', nhan) : null;
    if (eNhan) box.append(eNhan);
    lines.forEach((s, i) => { const d = el('div', 'cl-cau', s); d.style.animationDelay = `${(i * step).toFixed(2)}s`; box.append(d); });
    if (K.lenh) { const b = el('b', 'cl-lenh', K.lenh); b.style.animationDelay = `${(lines.length * step + 0.08).toFixed(2)}s`; box.append(b); }
    const vao = lines.length * step + (K.lenh ? 0.3 : 0.2);
    box.style.setProperty('--ra', `${(vao + giu).toFixed(2)}s`);
    box.hidden = false; box.classList.remove('chay'); void box.offsetWidth; box.classList.add('chay');   // đọc bề ngang để trình duyệt chạy lại chuyển động từ đầu
    // dòng chép sổ: báo chỗ cuối nhãn cho biểu tượng Hệ Thống bay tới đậu như người cầm bút (src/ui/he-thong-dao.js)
    game.chepO = null;
    if (eNhan && K.ky) requestAnimationFrame(() => { if (box.hidden || !eNhan.isConnected) return; const r = eNhan.getBoundingClientRect(); if (r.width) game.chepO = { x: r.right + 4, yb: r.bottom + 1 }; });   // yb: mép dưới nhãn; biểu tượng đậu TRÊN dòng nhãn, không đè lên câu bên dưới
    clearTimeout(tm); tm = setTimeout(() => { box.hidden = true; box.classList.remove('chay'); game.chepO = null; }, (vao + giu + 0.45) * 1000);
  };
}
