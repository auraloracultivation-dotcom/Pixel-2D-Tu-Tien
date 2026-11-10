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

export function unhost() {
  if (!cur) return;
  const p = $(cur);
  if (p) { p.hidden = true; p.classList.remove('sv-hosted'); document.body.append(p); }
  cur = null;
}

// box: chỗ gắn; key: 'cp' | 'tt'; tab: tab muốn mở (mặc định theo HOSTS)
export function host(box, key, tab) {
  const [id, btn, tabs, t0] = HOSTS[key], p = $(id);
  if (!p) return false;
  if (cur !== id) {
    unhost();
    p.classList.add('sv-hosted'); box.append(p); cur = id;
    $(btn)?.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));   // bảng tự vẽ như khi bấm nút cũ
    document.querySelector(`#${tabs} [data-tab="${tab || t0}"]`)?.click();   // chỉ chọn tab lúc mới gắn, sau đó giữ tab người chơi đang xem
  } else if (p.parentNode !== box) box.append(p);
  p.hidden = false;
  return true;
}
