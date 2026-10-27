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
