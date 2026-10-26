// Âm thanh tổng hợp bằng WebAudio theo data/sounds.json: tiếng hiệu ứng và nhạc nền ngũ cung sinh tự động.
// Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên, nên khởi động âm thanh lúc đó.
const MUTE_KEY = 'p2d.mute';
const DARK_SCALE = [0, 3, 5, 7, 10];

export function createAudio(cfg) {
  let ac = null, sfxGain = null, musicGain = null, noise = null;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* không có bộ nhớ: mặc định bật tiếng */ }
  const lastPlay = {};
  const music = { map: null, timer: null, beat: 0, note: 2 };

  function init() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    const master = ac.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ac.destination);
    sfxGain = ac.createGain(); sfxGain.gain.value = cfg.volume.sfx; sfxGain.connect(master);
    musicGain = ac.createGain(); musicGain.gain.value = cfg.volume.music; musicGain.connect(master);
    api.master = master;
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (music.map) startMusic(music.map);
  }
  for (const ev of ['pointerdown', 'keydown']) window.addEventListener(ev, () => { init(); if (ac?.state === 'suspended') ac.resume(); }, { capture: true });

  function tone(n, at, out) {
    const t0 = at + (n.t || 0), t1 = t0 + n.d;
    let src;
    if (n.wave === 'noise') { src = ac.createBufferSource(); src.buffer = noise; }
    else {
      src = ac.createOscillator(); src.type = n.wave;
      src.frequency.setValueAtTime(n.f, t0);
      if (n.f2) src.frequency.exponentialRampToValueAtTime(n.f2, t1);
    }
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(n.v, t0 + Math.min(0.01, n.d / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, t1);
    let node = src;
    if (n.q) { const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = n.q; node.connect(f); node = f; }
    node.connect(g); g.connect(out);
    src.start(t0); src.stop(t1 + 0.02);
  }

  function play(name, vol = 1) {
    if (!ac || muted) return;
    const now = ac.currentTime;
    if (lastPlay[name] && now - lastPlay[name] < 0.045) return; // tránh chồng tiếng khi trúng nhiều quái
    lastPlay[name] = now;
    const notes = cfg.sfx[name];
    if (!notes) return;
    for (const n of notes) tone(vol === 1 ? n : { ...n, v: n.v * vol }, now, sfxGain);
  }

  // Nhạc nền: giai điệu đi bước nhỏ trên thang ngũ cung + nốt đệm mỗi 4 phách
  function startMusic(id) {
    music.map = id;
    clearInterval(music.timer);
    const m = cfg.music.maps[id];
    if (!ac || !m) return;
    const scale = m.mood === 'toi' ? DARK_SCALE : cfg.music.scale;
    const beat = 60 / m.bpm;
    const freq = step => m.root * Math.pow(2, (scale[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);
    music.timer = setInterval(() => {
      if (muted || ac.state !== 'running') return;
      const at = ac.currentTime + 0.05;
      music.beat++;
      if (music.beat % 4 === 1) tone({ wave: m.pad, f: freq(music.note - 5), t: 0, d: beat * 3.8, v: 0.18, q: 900 }, at, musicGain);
      if (Math.random() < 0.72) {
        music.note = Math.max(0, Math.min(9, music.note + [-2, -1, -1, 1, 1, 2, 0][Math.floor(Math.random() * 7)]));
        tone({ wave: m.wave, f: freq(music.note), t: 0, d: beat * (Math.random() < 0.3 ? 1.8 : 0.9), v: 0.2, q: 2200 }, at, musicGain);
      }
    }, beat * 1000);
  }

  const api = {
    play,
    music: id => { if (id !== music.map || !music.timer) startMusic(id); },
    get muted() { return muted; },
    toggle() {
      muted = !muted;
      try { localStorage.setItem(MUTE_KEY, muted ? '1' : '0'); } catch { /* bỏ qua */ }
      if (api.master) api.master.gain.value = muted ? 0 : 1;
      return muted;
    },
  };
  return api;
}
