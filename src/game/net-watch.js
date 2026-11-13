// Game online (chủ dự án 31/10/2026): đã đăng nhập thì cứ beat_s giây (socket Realtime khoẻ: beat_rt_s) gửi nhịp sống (src/net/heartbeat.js). Quá lost_s giây
// không liên lạc được máy chủ thì game đứng lại, hiện bảng "Mất kết nối"; nối lại được thì chơi tiếp. Mất quá reload_s giây
// thì tải lại trang về màn đăng nhập. Thẻ trình duyệt bị ẩn (khoá máy, chuyển ứng dụng) thì không tính, mở lại gửi nhịp ngay.
// Số giây và chữ ở data/config.json → net_watch.

export function startNetWatch(game) {
  const c = game.data.config.net_watch;
  if (!c) return;
  addEventListener('p2d-qua-nhanh', () => game.toast?.(c.text.qua_nhanh || 'Đang tải… vui lòng chờ', 1.4));   // bấm nhanh hơn 1 giây / thao tác
  let lastOk = Date.now(), lostAt = 0, busy = false, nextBeat = 0, box = null, sockOk = 0, beatOk = Date.now(), hooked = false;
  // Realtime (05/11/2026): socket trả nhịp ok trong rt_fresh_s giây thì nhịp sống giãn ra beat_rt_s giây (máy chủ vẫn cộng giờ online
  // khi hai lần liên lạc cách nhau tối đa 15 giây; lần lưu p2d_luu2 cũng tính là liên lạc). Nhịp socket cũng tính là còn liên lạc.
  const sockFresh = () => Date.now() - sockOk < (c.rt_fresh_s || 12) * 1000;
  const gapS = () => (sockFresh() && c.beat_rt_s ? c.beat_rt_s : c.beat_s);
  async function hookSocket() {
    hooked = true;
    try { (await import('../net/heartbeat.js')).onSocketBeat(ok => { if (ok) { sockOk = Date.now(); if (!lostAt) lastOk = Math.max(lastOk, sockOk); } }); }
    catch { /* không có Realtime: giữ nhịp sống beat_s như cũ */ }
  }
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

  // Nhịp qua phòng Cloudflare (src/net/online-cf.js cfBeat): phòng trả 'p2d-nhip' là còn liên lạc; phòng chưa hỗ trợ (bản máy chủ cũ)
  // hoặc chưa vào phòng thì gửi nhịp kiểu cũ (src/net/heartbeat.js), 5 phút sau mới thử lại phòng.
  let cfOffUntil = 0;
  addEventListener('p2d-khac', () => { if (phien && !kicked) kick(); });
  const cfAck = ms => new Promise(ok => {
    const done = v => { removeEventListener('p2d-nhip', yes); clearTimeout(t); ok(v); };
    const yes = () => done(true), t = setTimeout(() => done(false), ms);
    addEventListener('p2d-nhip', yes);
  });
  async function sendCf() {
    if (!phien || Date.now() < cfOffUntil) return false;
    try {
      const cf = await import('../net/online-cf.js');
      const wait = cfAck(Math.min(4000, c.timeout_s * 1000));
      if (!cf.cfBeat(phien)) return false;
      if (await wait) return true;
      cfOffUntil = Date.now() + 300000;
    } catch { /* chưa có phòng */ }
    return false;
  }

  async function send() {
    busy = true;
    let ok = false;
    try {
      const hb = await import('../net/heartbeat.js');
      if (game.cloud && claimedFor !== game.cloud) await claim(hb);
      if (await sendCf()) ok = true;
      else if (phien) { const r = await hb.beat2(phien, c.timeout_s * 1000); ok = r.ok; if (r.khac && !kicked) { busy = false; kick(); return; } }
      else ok = await hb.beat(c.timeout_s * 1000);
    } catch { /* mất mạng lúc tải mã */ }
    busy = false;
    if (!ok || kicked) return;
    lastOk = beatOk = Date.now();
    if (lostAt) { lostAt = 0; show(false); game.toast?.(c.text.back, 2); }
  }

  function tick() {
    if (kicked) return;
    if (!on()) { lastOk = beatOk = Date.now(); nextBeat = 0; return; }   // chưa vào game, chơi không tài khoản, thẻ ẩn: không tính
    if (!hooked) hookSocket();
    const now = Date.now();
    if (!busy && now >= nextBeat) { nextBeat = now + gapS() * 1000; send(); }
    // mất cả nhịp sống lẫn nhịp socket quá lost_s giây; hoặc socket còn mà máy chủ không nhận nhịp sống quá lost_s + beat_rt_s giây
    if (!lostAt && (now - lastOk > c.lost_s * 1000 || now - beatOk > (c.lost_s + gapS()) * 1000)) { lostAt = now; show(true); }
    if (lostAt && now - lostAt > c.reload_s * 1000) {
      try { game.persist?.(); } catch { /* vẫn tải lại */ }
      dispatchEvent(new Event('p2d-tai-lai'));   // src/ui/tu-vao.js: tải lại xong tự vào game
      location.reload();
    }
  }
  setInterval(tick, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) { lastOk = beatOk = Date.now(); nextBeat = 0; tick(); } });
  game.netLost = () => !!lostAt;
}
