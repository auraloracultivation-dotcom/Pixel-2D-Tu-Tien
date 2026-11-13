// Âm thanh tổng hợp theo data/sounds.json: tiếng hiệu ứng (dựng bằng src/core/synth.js thành buffer, lần đầu phát mới dựng; tiếng chiêu
// đang mang thì dựng sẵn từng chút một qua nhiều khung hình, hàm warm), nhạc nền ở music.js. more: bảng tiếng thêm (data/tieng-chieu.json → sfx). Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên, nên khởi động âm thanh lúc đó.
import { createMusic } from './music.js';
import { sfxJob } from './synth.js';

const MUTE_KEY = 'p2d.mute';

export function createAudio(cfg, more) {
  const SFX = more ? { ...cfg.sfx, ...more } : cfg.sfx;
  let ac = null, sfxGain = null, musicGain = null, noise = null, sfxVerb = null;
  const bufs = new Map(), jobs = new Map(), hot = new Set();   // tiếng đã dựng, tiếng đang dựng dở, tiếng cần dựng sẵn
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* không có bộ nhớ: mặc định bật tiếng */ }
  const lastPlay = {};
  let want = null, music = null, wantRain = false, wantNight = false;

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = cfg.volume.sfx; sfxGain.connect(master);
    musicGain = ac.createGain(); musicGain.gain.value = cfg.volume.music; musicGain.connect(master);
    api.master = master;
    // phòng vang nhẹ cho tiếng hiệu ứng (rec.rev: phần gửi vào vang), ngắn hơn vang của nhạc
    const len = Math.floor(ac.sampleRate * 1.4), ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
    sfxVerb = ac.createConvolver(); sfxVerb.buffer = ir; sfxVerb.connect(sfxGain);
    bufs.clear(); jobs.clear();
    setTimeout(() => { for (const k of cfg.warm || []) buf(k); pump(); }, 50);   // dựng sẵn tiếng hay dùng (đánh, trúng, nhặt) cho lần đầu khỏi trễ
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music = createMusic(ac, musicGain, noise, cfg.music);
    if (want) music.play(want);
    music.rain(wantRain); music.night(wantNight);
  }
  // iPhone: sau khi ra màn hình chính, có cuộc gọi hay khoá máy, AudioContext sang 'interrupted' chứ không phải 'suspended',
  // nên chạm nào cũng thử bật lại khi chưa 'running'. Loại phiên 'playback' để gạt im lặng không tắt tiếng game (Safari 16.4+).
  // iPhone còn có lúc báo 'running' mà không ra tiếng, hoặc kẹt 'interrupted' dù đã chạm (báo lỗi #8 của tapsu, 29/10/2026):
  // đồng hồ âm thanh đứng yên giữa hai lần chạm cách nhau hơn 1,5 giây, hoặc bật lại hai lần không được, thì dựng AudioContext mới.
  let checkAt = 0, checkT = 0, failAt = 0, fails = 0;
  function rebuild() {
    const old = ac;
    try { music?.stop(); music?.rain(false); } catch { /* nhạc đã dừng */ }
    ac = null; checkAt = 0; failAt = 0; fails = 0;
    try { old.close(); } catch { /* đã đóng */ }
    init();
    ac?.resume().catch(() => {});
  }
  function wake() {
    init();
    try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch { /* trình duyệt không hỗ trợ */ }
    if (!ac || ac.state === 'closed') return;
    const now = performance.now();
    if (ac.state !== 'running') {
      if (!failAt) failAt = now; else if (now - failAt > 1000 && ++fails >= 2) { rebuild(); return; }
      checkAt = 0;   // vừa bị ngắt (ra màn hình chính, khoá máy): chạy lại thì đo lại từ đầu
      ac.resume().catch(() => {});
      return;
    }
    failAt = 0; fails = 0;
    if (checkAt && now - checkAt > 1500 && ac.currentTime - checkT < 0.05) { rebuild(); return; }
    checkAt = now; checkT = ac.currentTime;
  }
  for (const ev of ['pointerdown', 'touchend', 'keydown']) window.addEventListener(ev, wake, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!document.hidden && ac) wake(); });

  const job = name => jobs.get(name) || jobs.set(name, sfxJob(SFX[name], ac.sampleRate, name.length * 7919 + 1)).get(name);
  function keep(name, d) { const b = ac.createBuffer(1, d.length, ac.sampleRate); b.getChannelData(0).set(d); bufs.set(name, b); jobs.delete(name); return b; }
  function buf(name) {
    if (bufs.has(name)) return bufs.get(name);
    if (!SFX[name] || !ac) return null;
    const j = job(name);   // đang dựng dở thì dựng nốt
    while (!j.step());
    return keep(name, j.out);
  }
  // Dựng sẵn các tiếng trong hot: mỗi nhịp chỉ làm khoảng 4 ms rồi nhường cho khung hình (tiếng chiêu lớn dài 2–3 giây, chục lớp:
  // dựng liền một hơi mất cả trăm ms, khựng hình). Tiếng chưa kịp dựng mà đã cần phát thì buf() dựng nốt ngay.
  let pumping = false;
  function tick() {
    let name = null;
    if (ac) for (const n of hot) if (SFX[n] && !bufs.has(n)) { name = n; break; }
    if (!name) { pumping = false; return; }
    const j = job(name), t0 = performance.now();
    let fin = false;
    while (!(fin = j.step(4096)) && performance.now() - t0 < 4);
    if (fin) keep(name, j.out);
    setTimeout(tick, 12);
  }
  function pump() { if (!pumping && ac && hot.size) { pumping = true; setTimeout(tick, 30); } }

  // vol: nhân âm lượng; rec.gap: tối thiểu giây giữa hai lần cùng tiếng (trúng nhiều quái một lúc), rec.jit: lệch cao độ ngẫu nhiên (cung)
  function play(name, vol = 1) {
    if (!ac || muted) return;
    const rec = SFX[name], now = ac.currentTime;
    if (!rec) return;
    if (lastPlay[name] && now - lastPlay[name] < (rec.gap ?? 0.045)) return;
    lastPlay[name] = now;
    const b = buf(name);
    if (!b) return;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = b; s.playbackRate.value = Math.pow(2, ((Math.random() * 2 - 1) * (rec.jit ?? 0)) / 12);
    g.gain.value = vol * (rec.gain ?? 1);
    let node = g;
    if (ac.createStereoPanner && rec.pan !== 0) { const p = ac.createStereoPanner(); p.pan.value = (Math.random() * 2 - 1) * (rec.pan ?? 0.15); g.connect(p); node = p; }
    s.connect(g); node.connect(sfxGain);
    if (rec.rev) { const r = ac.createGain(); r.gain.value = rec.rev; node.connect(r); r.connect(sfxVerb); }
    s.start(now);
  }

  const api = {
    play,
    warm(names) { for (const n of names) if (n) hot.add(n); pump(); },   // tiếng sắp cần (chiêu đang mang): dựng sẵn lúc rảnh
    music: id => { want = id; music?.play(id); },
    rain: on => { if (on === wantRain) return; wantRain = on; music?.rain(on); },
    night: on => { wantNight = on; music?.night(on); },
    combat: k => music?.combat?.(k),   // 0 yên … 1 đánh dữ: lớp trống nhạc nền (music.js)
    note: (step, v) => { if (!muted) music?.note?.(step, v); },   // nốt đàn khi đánh trúng (music.js)
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* bỏ qua */ }
      if (api.master) api.master.gain.value = muted ? 0 : 1;
      if (!muted) wake();   // bật tiếng: chắc chắn âm thanh đang chạy
      return muted;
    },
  };
  return api;
}
