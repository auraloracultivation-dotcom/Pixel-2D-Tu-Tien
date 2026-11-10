// Gắn một bảng có sẵn của game vào khung phải bảng Nhân vật (chủ dự án 11/11/2026 01:43: ô Công pháp gồm công pháp và kỹ năng,
// ô Thời trang). Không viết lại bảng: chuyển chính phần tử bảng đó (#skills, #achv) vào khung, mở nó bằng nút cũ, chọn đúng tab;
// rời mục thì trả bảng về chỗ cũ và ẩn đi. Kiểu khi đang gắn: .sv-hosted (style-self.css).
const $ = id => document.getElementById(id);

// Các trang gắn được: [phần tử bảng, nút mở cũ, nhóm tab, tab]
export const HOSTS = {
  cp: ['skills', 'btn-skills', 'skills-tabs', 'chieu'],
  tt: ['achv', 'btn-achv', 'achv-tabs', 'thoi-trang'],
};

let cur = null;   // id bảng đang gắn

// Tấm chi tiết của ô (src/ui/grid-cards.js .gc-sheet) trong bảng đang gắn: nút gọn như phần trang bị (chủ dự án 03:54):
// hình + tên ngắn một dòng + giá chữ nhỏ, xếp ô ba cột; chữ "Việc (giá)" tách thành tên và giá.
const cut = s => s.replace(/\s*\(.*$/, '');
const ICO = [[/^Luyện lên cấp/, 'cuong-hoa', s => s.replace(/^Luyện lên cấp (\d+).*/, 'Cấp $1')], [/^Mua nhanh/, 'lich-su', () => 'Mua'],
  [/^Mang vào ô/, 'mac-tot', s => cut(s).replace('Mang vào ô ', 'Mang ô')], [/^(Mang|Mặc|Thay|Đeo|Cưỡi|Dùng)/, 'mac-tot', cut], [/^(Mua|Đổi)/, 'ban', cut], [/^(Tháo|Bỏ)/, 'tab-trang-bi', s => s]];
function tidy(game, sheet) {
  if (sheet.dataset.svTidy) return;
  sheet.dataset.svTidy = 1;
  for (const b of sheet.querySelectorAll('.gc-body button:not(.d-close)')) {
    const t = b.textContent.trim(), k = ICO.find(([re]) => re.test(t)), cost = (t.match(/\(([^)]*)\)\s*$/) || [])[1];
    b.classList.add('sv-gbtn');
    b.textContent = '';
    const spr = k && game.data.art.sprites['ui.nv-' + k[1]];
    if (spr) { const i = document.createElement('i'); i.className = 'sv-aico'; i.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`; b.append(i); }
    const n = document.createElement('b'); n.textContent = k ? k[2](t) : t.replace(/\s*\(.*$/, ''); b.append(n);
    if (cost) { const c = document.createElement('small'); c.textContent = cost; b.append(c); }
  }
  const acts = [...sheet.querySelectorAll('.sv-gbtn')];
  if (acts.length) { const row = document.createElement('div'); row.className = 'sv-gacts'; acts[0].before(row); row.append(...acts); }
}
let watch = null;
function watchSheets(game, box) {
  watch?.disconnect();
  watch = new MutationObserver(() => { for (const sh of box.querySelectorAll('.gc-sheet:not([data-sv-tidy])')) tidy(game, sh); });
  watch.observe(box, { childList: true, subtree: true });
}

export function unhost() {
  if (!cur) return;
  watch?.disconnect(); watch = null;
  const p = $(cur);
  if (p) { p.hidden = true; p.classList.remove('sv-hosted'); document.body.append(p); }
  cur = null;
}

// box: chỗ gắn; key: 'cp' | 'tt'; tab: tab muốn mở (mặc định theo HOSTS)
export function host(box, key, tab, game) {
  const [id, btn, tabs, t0] = HOSTS[key], p = $(id);
  if (!p) return false;
  if (cur !== id) {
    unhost();
    p.classList.add('sv-hosted'); box.append(p); cur = id;
    if (game) watchSheets(game, box);
    $(btn)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // bảng tự vẽ như khi bấm nút cũ
    document.querySelector(`#${tabs} [data-tab="${tab || t0}"]`)?.click();   // chỉ chọn tab lúc mới gắn, sau đó giữ tab người chơi đang xem
  } else if (p.parentNode !== box) box.append(p);
  p.hidden = false;
  return true;
}
