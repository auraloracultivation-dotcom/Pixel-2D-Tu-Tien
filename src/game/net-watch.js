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

  // Một tài khoản một máy (góp ý #72): mỗi lần có lưu máy chủ mới (vào game) thì nhận mã phiên; nhịp sống báo máy khác vào sau
  // thì thôi lưu, hiện bảng rồi đăng xuất (không đăng xuất thì tải lại sẽ tự vào và đá máy kia ra).
  let claimedFor = null, phien = null, kicked = false;
  async function claim(hb) {
    claimedFor = game.cloud;
    phien = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => (b % 36).toString(36)).join('') + Date.now().toString(36);
    if (!(await hb.claimSession(phien).catch(() => false))) phien = null;
  }
  async function kick() {
    kicked = true; game.cloud = null; game.persist = () => {};   // không ghi đè tiến độ của máy kia
    show(true);
    box.querySelector('b').textContent = c.text.kick_title; box.querySelector('p').textContent = c.text.kick_sub;
    setTimeout(async () => { try { await (await import('../net/auth.js')).signOut(); } catch { /* vẫn tải lại */ } location.reload(); }, 4000);
  }

  async function send() {
    busy = true;
    let ok = false;
    try {
      const hb = await import('../net/heartbeat.js');
      if (game.cloud && claimedFor !== game.cloud) await claim(hb);
      if (phien) { const r = await hb.beat2(phien, c.timeout_s * 1000); ok = r.ok; if (r.khac && !kicked) { busy = false; kick(); return; } }
      else ok = await hb.beat(c.timeout_s * 1000);
    } catch { /* mất mạng lúc tải mã */ }
    busy = false;
    if (!ok || kicked) return;
    lastOk = Date.now();
    if (lostAt) { lostAt = 0; show(false); game.toast?.(c.text.back, 2); }
  }

  function tick() {
    if (kicked) return;
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
