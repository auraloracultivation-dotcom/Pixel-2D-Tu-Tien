// Gắn một bảng có sẵn của game vào khung phải bảng Nhân vật (chủ dự án 11/11/2026 01:43: ô Công pháp gồm công pháp và kỹ năng,
// ô Thời trang). Không viết lại bảng: chuyển chính phần tử bảng đó (#skills, #achv, #pets) vào khung, mở nó bằng nút cũ, chọn đúng tab;
// rời mục thì trả bảng về chỗ cũ và ẩn đi. Kiểu khi đang gắn: .sv-hosted (style-self.css).
const $ = id => document.getElementById(id);

// Các trang gắn được: [phần tử bảng, nút mở cũ, nhóm tab, tab]
export const HOSTS = {
  cp: ['skills', 'btn-skills', 'skills-tabs', 'chieu'],
  tt: ['achv', 'btn-achv', 'achv-tabs', 'thoi-trang'],
  lt: ['pets', 'btn-pets', 'pets-tabs', 'linh-thu'],   // linh thú, thú cưỡi, khôi lỗi (chủ dự án 04:03: không bị dắt ra trang khác)
};

let cur = null;   // id bảng đang gắn

// Tấm chi tiết của ô (src/ui/grid-cards.js .gc-sheet) trong bảng đang gắn: nút gọn như phần trang bị (chủ dự án 03:54):
// hình + tên ngắn một dòng + giá chữ nhỏ, xếp ô ba cột; chữ "Việc (giá)" tách thành tên và giá.
const cut = s => s.replace(/\s*\(.*$/, '');
const ICO = [[/^Luyện lên cấp/, 'cuong-hoa', s => s.replace(/^Luyện lên cấp (\d+).*/, 'Cấp $1')], [/^Mua nhanh/, 'lich-su', () => 'Mua'],
  [/^Mang vào ô/, 'mac-tot', s => cut(s).replace('Mang vào ô ', 'Mang ô')], [/^(Mang|Mặc|Thay|Đeo|Cưỡi|Dùng)/, 'mac-tot', cut], [/^(Mua|Đổi)/, 'ban', cut], [/^(Tháo|Bỏ)/, 'tab-trang-bi', s => s],
  // linh thú, thú cưỡi, khôi lỗi (src/ui/pets-panel.js): "Bán 4.000 Linh Thạch" tách giá xuống dòng nhỏ, hỏi lại thì "Bán thật?"
  [/^Tẩy luyện|^Đã đủ dòng/, 'tu-luyen', cut], [/^Cất đi/, 'tab-trang-bi', s => s], [/^Tiến hóa/, 'cuong-hoa', () => 'Tiến hóa'], [/^Bấm lần nữa để bán/, 'ban', () => 'Bán thật?'], [/^Bán/, 'ban', () => 'Bán']];
function tidy(game, sheet) {
  if (sheet.dataset.svTidy) return;
  sheet.dataset.svTidy = 1;
  for (const b of sheet.querySelectorAll('.gc-body button:not(.d-close):not(.bm-b)')) {   // ô mua (buy-mats.js) giữ nguyên
    const t = b.textContent.trim(), k = ICO.find(([re]) => re.test(t)), cost = (t.match(/\(([^)]*)\)\s*$/) || t.match(/^Bán ([\d.]+ Linh Thạch)$/) || [])[1];
    b.classList.add('sv-gbtn');
    b.textContent = '';
    const spr = k && game.data.art.sprites['ui.nv-' + k[1]];
    if (spr) { const i = document.createElement('i'); i.className = 'sv-aico'; i.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`; b.append(i); }
    const n = document.createElement('b'); n.textContent = k ? k[2](t) : t.replace(/\s*\(.*$/, ''); b.append(n);
    if (cost) { const c = document.createElement('small'); c.textContent = cost; b.append(c); }
  }
  for (const g of sheet.querySelectorAll('.sv-gbtn.gc-go:disabled')) {   // nút chính mờ trùng chữ một nút khác (khôi lỗi đang mang: hai nút "Cất đi") thì bỏ
    if ([...sheet.querySelectorAll('.sv-gbtn:not(.gc-go)')].some(b => b.textContent === g.textContent)) g.remove();
  }
  const acts = [...sheet.querySelectorAll('.sv-gbtn')];
  if (acts.length) { const row = document.createElement('div'); row.className = 'sv-gacts'; acts[0].before(row); row.append(...acts); }
}
let watch = null, later = 0;
// Theo dõi bảng đang gắn: tấm chi tiết mới thì gọn nút; bảng vẽ lại (mang linh thú, cưỡi, mặc thời trang…) thì báo onChange
// để thẻ nhân vật bên trái đổi ngay (chủ dự án 11/11/2026 10:44: phải bấm sang trang bị mới đổi hình)
function watchSheets(game, box, onChange) {
  watch?.disconnect();
  watch = new MutationObserver(() => {
    for (const sh of box.querySelectorAll('.gc-sheet:not([data-sv-tidy])')) tidy(game, sh);
    if (onChange) { clearTimeout(later); later = setTimeout(onChange, 60); }
  });
  watch.observe(box, { childList: true, subtree: true });
}

export function unhost() {
  if (!cur) return;
  watch?.disconnect(); watch = null; clearTimeout(later);
  const p = $(cur);
  if (p) { p.hidden = true; p.classList.remove('sv-hosted'); document.body.append(p); }
  cur = null;
}

// box: chỗ gắn; key: 'cp' | 'tt' | 'lt'; tab: tab muốn mở (mặc định theo HOSTS); onChange: bảng gắn vừa vẽ lại
export function host(box, key, tab, game, onChange) {
  const [id, btn, tabs, t0] = HOSTS[key], p = $(id);
  if (!p) return false;
  if (cur !== id) {
    unhost();
    p.classList.add('sv-hosted'); box.append(p); cur = id;
    if (game) watchSheets(game, box, onChange);
    $(btn)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // bảng tự vẽ như khi bấm nút cũ
  } else if (p.parentNode !== box) box.append(p);
  const tb = document.querySelector(`#${tabs} [data-tab="${tab || t0}"]`);
  if (tb && !tb.classList.contains('on')) tb.click();   // đúng tab đang chọn ở hàng mục con (bấm ô linh thú / thú cưỡi / khôi lỗi)
  p.hidden = false;
  return true;
}
