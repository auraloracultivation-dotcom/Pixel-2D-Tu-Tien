// Âm thanh tổng hợp theo data/sounds.json: tiếng hiệu ứng (dựng bằng src/core/synth.js thành buffer, lần đầu phát mới dựng),
// nhạc nền ở music.js. Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên, nên khởi động âm thanh lúc đó.
import { createMusic } from './music.js';
import { renderSfx } from './synth.js';

const MUTE_KEY = 'p2d.mute';

export function createAudio(cfg) {
  let ac = null, sfxGain = null, musicGain = null, noise = null, sfxVerb = null;
  const bufs = new Map();   // tiếng đã dựng
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
    bufs.clear();
    setTimeout(() => { for (const k of cfg.warm || []) buf(k); }, 50);   // dựng sẵn tiếng hay dùng (đánh, trúng, nhặt) cho lần đầu khỏi trễ
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

  function buf(name) {
    if (bufs.has(name)) return bufs.get(name);
    const rec = cfg.sfx[name];
    if (!rec || !ac) return null;
    const d = renderSfx(rec, ac.sampleRate, name.length * 7919 + 1), b = ac.createBuffer(1, d.length, ac.sampleRate);
    b.getChannelData(0).set(d); bufs.set(name, b);
    return b;
  }

  // vol: nhân âm lượng; rec.gap: tối thiểu giây giữa hai lần cùng tiếng (trúng nhiều quái một lúc), rec.jit: lệch cao độ ngẫu nhiên (cung)
  function play(name, vol = 1) {
    if (!ac || muted) return;
    const rec = cfg.sfx[name], now = ac.currentTime;
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
    music: id => { want = id; music?.play(id); },
    rain: on => { if (on === wantRain) return; wantRain = on; music?.rain(on); },
    night: on => { wantNight = on; music?.night(on); },
    combat: k => music?.combat?.(k),
    note: (step, v) => { if (!muted) music?.note?.(step, v); },   // nốt đàn khi đánh trúng (music.js)   // 0 yên … 1 đánh dữ: lớp trống nhạc nền (music.js)
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
