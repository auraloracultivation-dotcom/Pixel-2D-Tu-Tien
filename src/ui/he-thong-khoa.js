// Khoá Hệ Thống (chủ dự án 18/11/2026 08:55): "thêm 1 nút khoá cho Hệ Thống đứng im, thêm dấu ! khi nó không được di chuyển,
// chấm đỏ khi có nhiệm vụ chưa nhận". Nút khoá nhỏ ở góc biểu tượng: chạm để khoá / mở (nhớ trong save.htKhoa).
// Đang khoá: Hệ Thống đứng yên một chỗ (vẫn kéo đi chỗ khác được, thả ra thì đứng yên ở chỗ mới), đầu có dấu "!".
// Chấm đỏ: có nhiệm vụ Hệ Thống đã xong mà chưa nhận điểm (missionList ... ok). Chữ ở data/he-thong.json → khoa.
export function addLock(game, ic, C) {
  const T = C.khoa || {};
  const lk = document.createElement('span'); lk.className = 'ht-lock'; lk.setAttribute('role', 'button'); lk.title = T.title || 'Khoá';
  const bang = document.createElement('span'); bang.className = 'ht-bang'; bang.textContent = '!'; bang.hidden = true;
  const cham = document.createElement('span'); cham.className = 'ht-cham'; cham.hidden = true;
  ic.append(lk, bang, cham);
  const sync = () => { const on = !!game.save?.htKhoa; lk.classList.toggle('on', on); lk.textContent = on ? '🔒' : '🔓'; bang.hidden = !on; };
  lk.addEventListener('pointerdown', e => e.stopPropagation());
  lk.addEventListener('click', e => {
    e.stopPropagation(); e.preventDefault();
    if (!game.save) return;
    game.save.htKhoa = !game.save.htKhoa; sync();
    game.toast?.(game.save.htKhoa ? (T.on || 'Hệ Thống đứng yên.') : (T.off || 'Hệ Thống đi lại tự do.'), 1.6);
    game.sfx?.('click');
  });
  sync();
  return {
    locked: () => !!game.save?.htKhoa,
    tick(claim) { sync(); cham.hidden = !claim; },
  };
}
