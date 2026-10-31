// Màn tải và màn đăng nhập (chủ dự án 01/11/2026: "từ loading vào game tới đăng nhập khá thô sơ, chưa thuận mắt, không có hiệu ứng").
// Chỉ thêm hiệu ứng, không đụng logic đăng nhập (login.js): một lớp canvas điểm ảnh sau nội dung (cánh hoa rơi, đốm linh khí bay lên),
// câu mẹo đổi dần dưới thanh tải, chớp sáng chuyển cảnh lúc vào game. Nạp bằng thẻ script riêng trong index.html để chạy ngay khi
// màn tải hiện (trước khi main.js tải xong cả game). Số liệu ở data/man-dau.json. Máy chậm (perf-calm) hoặc tắt chuyển động: đứng yên.
const $ = id => document.getElementById(id);
const PX = 3;   // mỗi điểm ảnh hiệu ứng = 3 điểm màn hình, cho cùng độ thô với nền
const still = () => document.body.classList.contains('perf-calm') || matchMedia('(prefers-reduced-motion: reduce)').matches;

function host() {
  const m = $('menu'), l = $('loading');
  if (l && !l.hidden) return l;
  if (m && !m.hidden) return m;
  return null;
}

function makeParts(cfg, W, H) {
  const le = document.body.dataset.le, pc = (le && cfg.le_petals[le]) || cfg.petal_colors;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const petals = Array.from({ length: cfg.petals }, () => ({ x: rnd(0, W), y: rnd(-H, H), v: rnd(6, 13), s: rnd(0, 6.3), w: rnd(0.6, 1.4), c: pc[Math.floor(Math.random() * pc.length)], big: Math.random() < 0.35 }));
  const motes = Array.from({ length: cfg.motes }, () => ({ x: rnd(0, W), y: rnd(0, H), v: rnd(3, 8), t: rnd(0, 6.3), c: cfg.mote_colors[Math.floor(Math.random() * cfg.mote_colors.length)] }));
  return { petals, motes };
}

function startFx(cfg) {
  const cv = document.createElement('canvas');
  cv.id = 'man-dau-fx'; cv.setAttribute('aria-hidden', 'true');
  const g = cv.getContext('2d');
  let W = 0, H = 0, parts = null, last = 0, on = false;
  const fit = () => {
    W = Math.ceil(innerWidth / PX); H = Math.ceil(innerHeight / PX);
    if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; parts = makeParts(cfg, W, H); }
  };
  function draw(dt, now) {
    g.clearRect(0, 0, W, H);
    for (const p of parts.petals) {
      p.y += p.v * dt; p.s += dt * p.w * 2; p.x += Math.sin(p.s) * 8 * dt + 3 * dt;
      if (p.y > H + 4) { p.y = -4; p.x = Math.random() * W; }
      if (p.x > W + 4) p.x = -4;
      const x = Math.round(p.x), y = Math.round(p.y), flip = Math.sin(p.s * 1.7) > 0;
      g.fillStyle = p.c;
      if (p.big) { g.fillRect(x, y, 2, 1); g.fillRect(x + (flip ? 1 : 0), y + 1, 1, 1); } else g.fillRect(x, y, flip ? 2 : 1, 1);
    }
    for (const m of parts.motes) {
      m.y -= m.v * dt; m.t += dt * 3;
      if (m.y < -2) { m.y = H + 2; m.x = Math.random() * W; }
      const a = 0.35 + 0.65 * Math.abs(Math.sin(m.t)), x = Math.round(m.x + Math.sin(m.t * 0.4) * 2), y = Math.round(m.y);
      g.globalAlpha = a * 0.35; g.fillStyle = m.c; g.fillRect(x - 1, y, 3, 1); g.fillRect(x, y - 1, 1, 3);
      g.globalAlpha = a; g.fillRect(x, y, 1, 1);
      g.globalAlpha = 1;
    }
  }
  function frame(now) {
    const h = host();
    if (!h) { on = false; cv.remove(); return; }
    if (cv.parentNode !== h) h.prepend(cv);
    fit();
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    if (still()) g.clearRect(0, 0, W, H); else draw(dt, now);
    requestAnimationFrame(frame);
  }
  const wake = () => { if (on || !host()) return; on = true; last = 0; requestAnimationFrame(frame); };
  wake();
  return wake;
}

function startTips(cfg) {
  const el = $('ld-tip');
  if (!el || !cfg.tips.length) return;
  let i = Math.floor(Math.random() * cfg.tips.length);
  const show = () => { el.classList.remove('in'); void el.offsetWidth; el.textContent = cfg.tips[i++ % cfg.tips.length]; el.classList.add('in'); };
  show();
  const t = setInterval(() => { if ($('loading')?.hidden) { clearInterval(t); return; } show(); }, cfg.tip_sec * 1000);
}

// Vào game (màn đăng nhập ẩn đi): chớp sáng linh khí rồi tan, che cú giật lúc thế giới hiện lên
function watchEnter(wake) {
  const menu = $('menu'), load = $('loading');
  let was = menu.hidden;
  new MutationObserver(() => {
    if (!was && menu.hidden && !still()) {
      const f = document.createElement('div');
      f.id = 'man-dau-flash';
      document.body.append(f);
      f.addEventListener('animationend', () => f.remove());
    }
    if (was && !menu.hidden) wake();   // về lại màn đầu (đăng xuất, mất mạng quá lâu): hiệu ứng chạy lại
    was = menu.hidden;
  }).observe(menu, { attributes: true, attributeFilter: ['hidden'] });
  if (load) new MutationObserver(wake).observe(load, { attributes: true, attributeFilter: ['hidden'] });
}

async function start() {
  let cfg;
  try { cfg = await fetch('data/man-dau.json').then(r => r.json()); } catch { return; }   // thiếu số liệu thì thôi, màn vẫn dùng được
  const wake = startFx(cfg);
  startTips(cfg);
  watchEnter(wake);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
