// Âm thanh tổng hợp bằng WebAudio theo data/sounds.json: tiếng hiệu ứng; nhạc nền ở music.js.
// Trình duyệt chỉ cho phát tiếng sau lần chạm đầu tiên, nên khởi động âm thanh lúc đó.
import { createMusic } from './music.js';

const MUTE_KEY = 'p2d.mute';

export function createAudio(cfg) {
  let ac = null, sfxGain = null, musicGain = null, noise = null;
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
    noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    music = createMusic(ac, musicGain, noise, cfg.music);
    if (want) music.play(want);
    music.rain(wantRain); music.night(wantNight);
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

  const api = {
    play,
    music: id => { want = id; music?.play(id); },
    rain: on => { if (on === wantRain) return; wantRain = on; music?.rain(on); },
    night: on => { wantNight = on; music?.night(on); },
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
