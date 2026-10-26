// Nhạc nền êm (data/sounds.json → music): đàn tranh gảy từng câu ngắn, sáo trúc ngân dài, nền trầm, tiếng vang,
// xen tiếng gió, chim, nước, lửa theo từng đảo. Tất cả tổng hợp bằng WebAudio, không cần file.
const DARK = [0, 3, 5, 7, 10];
const pick = a => a[Math.floor(Math.random() * a.length)];

export function createMusic(ac, out, noise, cfg) {
  // Phòng vang: xung phản hồi tự sinh (nhiễu tắt dần), trộn với tiếng khô
  const wet = ac.createGain(), dry = ac.createGain(), verb = ac.createConvolver();
  const len = ac.sampleRate * cfg.reverb.sec, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  verb.buffer = ir; wet.gain.value = cfg.reverb.wet; dry.gain.value = 1 - cfg.reverb.wet * 0.5;
  const bus = ac.createGain(); bus.connect(dry); bus.connect(verb); verb.connect(wet); dry.connect(out); wet.connect(out);

  const st = { id: null, m: null, timer: null, beat: 0, note: 4, phrase: [], rest: 1, amb: [], rain: null };

  // Một nốt: a (giây lên), d (độ dài), vib (rung Hz), q (lọc), pan
  function voice(n, at) {
    const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
    o.type = n.wave; o.frequency.setValueAtTime(n.f, at);
    if (n.from) { o.frequency.setValueAtTime(n.from, at); o.frequency.exponentialRampToValueAtTime(n.f, at + 0.08); }  // vuốt dây
    if (n.vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = n.vib; lg.gain.value = n.f * 0.006; l.connect(lg); lg.connect(o.frequency); l.start(at + n.a); l.stop(at + n.d + 0.1); }
    f.type = 'lowpass'; f.frequency.value = n.q || 2400;
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(n.v, at + n.a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + n.d);
    let node = g;
    if (n.pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = n.pan; g.connect(p); node = p; }
    o.connect(f); f.connect(g); node.connect(bus);
    o.start(at); o.stop(at + n.d + 0.05);
  }

  // Tiếng nhiễu lọc (gió, nước, lửa, hơi sáo)
  function hiss(at, d, v, lo, hi, out2 = bus) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; s.loop = true;
    f.type = 'bandpass'; f.frequency.value = (lo + hi) / 2; f.Q.value = (lo + hi) / 2 / Math.max(1, hi - lo);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + Math.min(0.4, d / 3)); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    s.connect(f); f.connect(g); g.connect(out2);
    s.start(at, Math.random() * 0.5); s.stop(at + d + 0.05);
    return f;
  }

  const freq = (m, step) => {
    const sc = m.mood === 'toi' ? DARK : cfg.scale;
    return m.root * Math.pow(2, (sc[((step % 5) + 5) % 5] + 12 * Math.floor(step / 5)) / 12);
  };

  // Câu nhạc: 4 tới 7 nốt đi bước nhỏ, phách dài ngắn xen nhau, kết về nốt chủ hoặc nốt năm
  function makePhrase() {
    const n = 4 + Math.floor(Math.random() * 4), out2 = [];
    for (let i = 0; i < n; i++) {
      st.note = Math.max(2, Math.min(11, st.note + pick([-2, -1, -1, 1, 1, 2, 0])));
      out2.push({ step: i === n - 1 ? pick([5, 7, 10]) : st.note, len: pick([1, 1, 1, 2, 0.5]) });
    }
    return out2;
  }

  // Tiếng thiên nhiên: chim hót, giọt nước, lửa lách tách (rải ngẫu nhiên mỗi phách)
  function ambience(m, at) {
    const a = m.amb || [];
    if (a.includes('chim') && Math.random() < cfg.amb.bird) {
      const f0 = 2200 + Math.random() * 1600, n = 2 + Math.floor(Math.random() * 3), pan = Math.random() * 1.6 - 0.8;
      for (let i = 0; i < n; i++) voice({ wave: 'sine', from: f0 * 0.8, f: f0 * (1 + Math.random() * 0.15), a: 0.01, d: 0.09, v: 0.025, q: 6000, pan }, at + i * 0.13);
    }
    if (a.includes('nuoc') && Math.random() < cfg.amb.water) {
      const f0 = 500 + Math.random() * 700;
      voice({ wave: 'sine', from: f0 * 0.6, f: f0, a: 0.005, d: 0.12, v: 0.03, q: 3000, pan: Math.random() - 0.5 }, at);
    }
    if (a.includes('lua') && Math.random() < cfg.amb.fire) for (let i = 0; i < 3; i++) hiss(at + Math.random() * 0.4, 0.04, 0.03, 1800, 4200);
  }

  // Gió nền: nhiễu lọc thông dải, cao độ và âm lượng lên xuống chậm. Chạy suốt khi ở đảo có gió.
  function startWind(m) {
    if (!(m.amb || []).includes('gio')) return;
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    const lfo = ac.createOscillator(), lg = ac.createGain(), lfo2 = ac.createOscillator(), lg2 = ac.createGain();
    s.buffer = noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = 500; f.Q.value = 0.8;
    g.gain.value = cfg.amb.wind;
    lfo.frequency.value = 0.07; lg.gain.value = 260; lfo.connect(lg); lg.connect(f.frequency);
    lfo2.frequency.value = 0.05; lg2.gain.value = cfg.amb.wind * 0.8; lfo2.connect(lg2); lg2.connect(g.gain);
    s.connect(f); f.connect(g); g.connect(out);
    s.start(); lfo.start(); lfo2.start();
    st.amb.push(s, lfo, lfo2);
  }

  function tick(t) {
    const m = st.m, beat = 60 / m.bpm, at = t ?? ac.currentTime + 0.05;
    st.beat++;
    ambience(m, at);
    // Nền: hai nốt trầm (chủ và năm) ngân dài mỗi 8 phách
    if (st.beat % 8 === 1) for (const s of [0, 3]) voice({ wave: 'sine', f: freq(m, s) / 2, a: beat * 2, d: beat * 8.5, v: cfg.drone, q: 700 }, at);
    if (st.phrase.length) {
      // Đàn tranh: gảy nốt, tắt dần; nốt nửa phách thì gảy hai nốt trong một phách
      const n = st.phrase.shift(), f = freq(m, n.step), lead = m.lead === 'sao' && Math.random() < 0.5;
      if (lead) {
        voice({ wave: 'sine', f, a: 0.18, d: beat * n.len * 1.6 + 0.4, v: cfg.flute, vib: 5, q: 3200 }, at);
        hiss(at, beat * n.len * 1.4, 0.006, f * 1.5, f * 2.5);
      } else {
        const pluck = (ff, t) => { voice({ wave: 'triangle', from: Math.random() < 0.15 ? ff * 0.94 : 0, f: ff, a: 0.006, d: 1.8 + Math.random(), v: cfg.zither, q: 2600, pan: -0.2 }, t); voice({ wave: 'sine', f: ff * 2, a: 0.004, d: 0.6, v: cfg.zither * 0.25, q: 5000, pan: -0.2 }, t); };
        pluck(f, at);
        if (n.len === 0.5 && st.phrase.length) pluck(freq(m, st.phrase.shift().step), at + beat / 2);
      }
      if (!st.phrase.length) st.rest = 2 + Math.floor(Math.random() * 4);
    } else if (--st.rest <= 0) st.phrase = makePhrase();
  }

  function stop() {
    clearInterval(st.timer); st.timer = null;
    for (const n of st.amb) { try { n.stop(); } catch { /* đã dừng */ } }
    st.amb = [];
  }

  // Tiếng mưa: hai lớp nhiễu (mưa xa trầm, hạt gần trong), lên xuống từ từ
  function rain(on) {
    if (on && !st.rain) {
      const g = ac.createGain(); g.gain.setValueAtTime(0.0001, ac.currentTime); g.gain.exponentialRampToValueAtTime(cfg.amb.rain || 0.05, ac.currentTime + 3);
      const srcs = [[900, 0.6], [4200, 0.9]].map(([fq, q]) => {
        const s = ac.createBufferSource(), f = ac.createBiquadFilter();
        s.buffer = noise; s.loop = true; f.type = 'bandpass'; f.frequency.value = fq; f.Q.value = q;
        s.connect(f); f.connect(g); s.start(0, Math.random()); return s;
      });
      g.connect(out); st.rain = { g, srcs };
    } else if (!on && st.rain) {
      const r = st.rain; st.rain = null;
      r.g.gain.setTargetAtTime(0.0001, ac.currentTime, 1);
      for (const s of r.srcs) s.stop(ac.currentTime + 4);
    }
  }

  return {
    rain,
    play(id) {
      if (id === st.id && st.timer) return;
      stop();
      st.id = id; st.m = cfg.maps[id];
      if (!st.m) return;
      st.phrase = []; st.rest = 1; st.beat = 0;
      startWind(st.m);
      st.timer = setInterval(() => { if (ac.state === 'running') tick(); }, 60 / st.m.bpm * 1000);
    },
    get id() { return st.id; },
    // Viết sẵn cả bản vào OfflineAudioContext để xuất file nghe thử
    score(id, sec) {
      st.m = cfg.maps[id]; st.phrase = []; st.rest = 1; st.beat = 0;
      startWind(st.m);
      for (let t = 0.05; t < sec; t += 60 / st.m.bpm) tick(t);
    },
    stop,
  };
}
