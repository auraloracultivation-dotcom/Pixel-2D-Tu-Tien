// Game online (chủ dự án 31/10/2026): đã đăng nhập thì cứ beat_s giây gửi nhịp sống (src/net/heartbeat.js). Quá lost_s giây
// không liên lạc được máy chủ thì game đứng lại, hiện bảng "Mất kết nối"; nối lại được thì chơi tiếp. Mất quá reload_s giây
// thì tải lại trang về màn đăng nhập. Thẻ trình duyệt bị ẩn (khoá máy, chuyển ứng dụng) thì không tính, mở lại gửi nhịp ngay.
// Số giây và chữ ở data/config.json → net_watch.

export function startNetWatch(game) {
  const c = game.data.config.net_watch;
  if (!c) return;
  let lastOk = Date.now(), lostAt = 0, busy = false, nextBeat = 0, box = null;
  const on = () => !!game.save && !!(game.cloud || game.cloudDown) && !document.hidden;

  const run = game.update;
  game.update = dt => { if (!lostAt) run(dt); };   // mất kết nối: đứng hình, không tính gì

  function show(yes) {
    if (yes && !box) {
      box = document.createElement('div');
      box.id = 'net-lost';
      box.innerHTML = '<div class="nl-box"><b></b><p></p></div>';
      box.querySelector('b').textContent = c.text.title;
      box.querySelector('p').textContent = c.text.sub;
      document.body.appendChild(box);
    }
    if (box) box.hidden = !yes;
  }

  async function send() {
    busy = true;
    let ok = false;
    try { ok = await (await import('../net/heartbeat.js')).beat(c.timeout_s * 1000); } catch { /* mất mạng lúc tải mã */ }
    busy = false;
    if (!ok) return;
    lastOk = Date.now();
    if (lostAt) { lostAt = 0; show(false); game.toast?.(c.text.back, 2); }
  }

  function tick() {
    if (!on()) { lastOk = Date.now(); nextBeat = 0; return; }   // chưa vào game, chơi không tài khoản, thẻ ẩn: không tính
    const now = Date.now();
    if (!busy && now >= nextBeat) { nextBeat = now + c.beat_s * 1000; send(); }
    if (!lostAt && now - lastOk > c.lost_s * 1000) { lostAt = now; show(true); }
    if (lostAt && now - lostAt > c.reload_s * 1000) {
      try { game.persist?.(); } catch { /* vẫn tải lại */ }
      location.reload();
    }
  }
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastOk = Date.now(); nextBeat = 0; tick(); } });
  game.netLost = () => !!lostAt;
}
