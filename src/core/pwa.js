// Cài game lên điện thoại (PWA): đăng ký service worker, giữ lời mời cài của trình duyệt để hiện nút "Cài vào máy".
let ask = null;

export function initPwa(button) {
  if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => {});
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (installed || !button) return;
  addEventListener('beforeinstallprompt', e => { e.preventDefault(); ask = e; button.hidden = false; });
  addEventListener('appinstalled', () => { ask = null; button.hidden = true; });
  // iPhone không có lời mời cài: hiện nút để chỉ cách thêm vào màn hình chính
  if (/iphone|ipad/i.test(navigator.userAgent)) button.hidden = false;
  button.onclick = async () => {
    if (!ask) { alertIos(); return; }
    ask.prompt();
    await ask.userChoice;
    ask = null; button.hidden = true;
  };
}

function alertIos() {
  const msg = document.getElementById('login-msg');
  if (msg) msg.textContent = 'Trên iPhone: bấm nút Chia sẻ ở Safari rồi chọn "Thêm vào màn hình chính".';
}

// Lỗi lúc khởi động thường do máy giữ trang cũ lẫn với code mới: xoá bộ nhớ đệm, gỡ service worker rồi tải lại một lần.
export async function recoverStale() {
  try {
    if (sessionStorage.getItem('p2d-recover')) return false;
    sessionStorage.setItem('p2d-recover', '1');
  } catch { return false; }
  try {
    if ('caches' in self) for (const k of await caches.keys()) await caches.delete(k);
    if ('serviceWorker' in navigator) for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
  } catch { /* vẫn tải lại */ }
  const u = new URL(location.href); u.searchParams.set('r', Date.now());
  location.replace(u.href);
  return true;
}
