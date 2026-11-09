// Nhạc nền êm (data/sounds.json → music): đàn tranh gảy từng câu ngắn (dây Karplus-Strong, src/core/synth.js), sáo trúc
// ngân dài, nhị hồ ở đảo trầm, dây trầm và nền ngân, tiếng vang, xen tiếng gió, chim (đêm thì dế), nước, lửa theo từng đảo.
// Lớp trống (combat 0…1): khi đánh nhau thì trống trầm vào dần, đánh dữ thì thêm trống nhỏ; trùm thì thêm chiêng.
// Khúc trùm đánh dữ: lớp nhạc trận dồn dập (music-tran.js) thay trống trầm, trống nhỏ.
// Bật music.arp.on (09/11/2026 01:28): thay đàn tranh, sáo, nhị bằng mộc cầm rải hợp âm (music-arp.js), nhịp nhanh hơn tempo lần.
// Tất cả tổng hợp bằng WebAudio, không cần file (chủ dự án 06/11/2026 19:15: làm lại bộ âm thanh bằng code).
import { renderSfx, zitherBuffer } from './synth.js';
import { createTran } from './music-tran.js';
import { createArp } from './music-arp.js';

const DARK = [0, 3, 5, 7, 10];
const pick = a => a[Math.floor(Math.random() * a.length)];

export function createMusic(ac, out, noise, cfg) {
  // Phòng vang: xung phản hồi tự sinh (nhiễu tắt dần), trộn với tiếng khô
  const wet = ac.createGain(), dry = ac.createGain(), verb = ac.createConvolver();
  const len = ac.sampleRate * cfg.reverb.sec, ir = ac.createBuffer(2, len, ac.sampleRate);
  for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  verb.buffer = ir; wet.gain.value = cfg.reverb.wet; dry.gain.value = 1 - cfg.reverb.wet * 0.5;
  const bus = ac.createGain(); bus.connect(dry); bus.connect(verb); verb.connect(wet); dry.connect(out); wet.connect(out);

  const st = { id: null, m: null, timer: null, beat: 0, note: 4, phrase: [], rest: 1, amb: [], rain: null, night: false, want: 0, k: 0, erhu: false };
  const C = cfg.combat || {};
  const tran = cfg.tran && createTran(ac, out, bus, noise, cfg.tran);
  const arp = cfg.arp?.on && createArp(ac, bus, cfg.arp);
  const bpmOf = m => (arp && !m.boss ? cfg.arp.bpm ?? Math.round(m.bpm * (cfg.arp.tempo ?? 1)) : m.bpm);   // khúc trùm giữ nhịp cho lớp trận
  const tranOn = () => tran && st.m.boss && st.k >= cfg.tran.on;

  // Đàn tranh: phát dây đã dựng sẵn, thỉnh thoảng vuốt dây (cao độ trượt lên tới nốt)
  function zither(f, at, v, pan = -0.2, slide = false) {
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = zitherBuffer(ac, f);
    if (slide) { s.playbackRate.setValueAtTime(0.94, at); s.playbackRate.linearRampToValueAtTime(1, at + 0.12); }
    g.gain.value = v;
    let node = g;
    if (ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    s.connect(g); node.connect(bus); s.start(at);
  }

  // Trống: dựng một lần thành buffer (trống trầm, trống nhỏ, chiêng)
  const drums = {};
  const drum = name => drums[name] || (drums[name] = (() => {
    const d = renderSfx(cfg.drums[name], ac.sampleRate, name.length * 31 + 7), b = ac.createBuffer(1, d.length, ac.sampleRate);
    b.getChannelData(0).set(d); return b;
  })());
  function hitDrum(name, at, v, pan = 0) {
    if (!cfg.drums?.[name]) return;
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = drum(name); s.playbackRate.value = 1 + (Math.random() - 0.5) * 0.04; g.gain.value = v;
    let node = g;
    if (pan && ac.createStereoPanner) { const p = ac.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
    s.connect(g); node.connect(bus); s.start(at);
  }
  // Mỗi phách: trống trầm phách 1 và 3 (dữ thì thêm phách 4 lẻ), trống nhỏ nửa phách khi k cao; trùm: chiêng mỗi 16 phách
  function drumBeat(at, beat) {
    const k = st.k, b = st.beat % 4, V = C.vol ?? 0.5;
    if (k < 0.12) return;
    if (tranOn()) { if (st.m.boss && st.beat % 16 === 1) hitDrum('gong', at, V * 0.5, 0); return; }   // lớp nhạc trận đã có trống
    if (b === 1 || b === 3) hitDrum('taiko', at, V * k, 0);
    else if (k > 0.7) hitDrum('taiko', at, V * k * 0.55, 0);   // đánh dữ, Bạo Nộ: trống trầm mỗi phách, dồn như nhạc clip mẫu (09/11/2026)
    if (k > 0.55 && b === 0) hitDrum('taiko', at + beat * 0.5, V * k * 0.6, 0);
    if (k > 0.45) hitDrum('tick', at + beat * 0.5, V * 0.35 * k, b % 2 ? 0.3 : -0.3);
    if (k > 0.8 && b === 2) hitDrum('tick', at + beat * 0.75, V * 0.25 * k, 0.2);
    if (st.m.boss && st.beat % 16 === 1) hitDrum('gong', at, V * 0.7, 0);
  }

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
    if (a.includes('chim') && st.night) {   // đêm: tiếng dế rả rích thay tiếng chim
      if (Math.random() < cfg.amb.cricket) {
        const f0 = 4200 + Math.random() * 900, n = 3 + Math.floor(Math.random() * 3), pan = Math.random() * 1.4 - 0.7;
        for (let i = 0; i < n; i++) voice({ wave: 'sine', f: f0, a: 0.004, d: 0.035, v: 0.012, q: 8000, pan }, at + i * 0.06);
      }
    } else if (a.includes('chim') && Math.random() < cfg.amb.bird) {
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
    const m = st.m, beat = 60 / bpmOf(m), at = t ?? Math.max(st.next ?? 0, ac.currentTime + 0.05);
    if (t == null) st.next = at + beat;   // nối phách đều tăm tắp, không theo độ lệch của setInterval (rải móc đơn nghe rõ lệch)
    st.beat++;
    ambience(m, at);
    if (arp) arp(at, beat, m, st.beat - 1, st.night);
    // Nền: hai nốt trầm (chủ và năm) ngân dài mỗi 8 phách
    else if (st.beat % 8 === 1) for (const s of [0, 3]) voice({ wave: 'sine', f: freq(m, s) / 2, a: beat * 2, d: beat * 8.5, v: cfg.drone, q: 700 }, at);
    if (!arp && (st.beat % 8 === 1 || (st.k > 0.4 && st.beat % 4 === 1))) zither(freq(m, 0) / 2, at, (cfg.bass ?? 0.25) * (0.6 + st.k * 0.6), 0.1);   // dây trầm
    st.k += ((m.boss ? Math.max(st.want, C.boss ?? 0.75) : st.want) - st.k) * (st.want > st.k ? C.up ?? 0.5 : C.down ?? 0.12);   // vào nhanh, ra chậm
    drumBeat(at, beat);
    if (tran && m.boss) tran(at, beat, m.root, st.beat - 1, st.k);
    else if (tran) tran.lite(at, beat, st.beat - 1, st.k);   // đảo thường đánh đông quái: lồng nhịp trống nhẹ
    if (arp) return;
    if (st.phrase.length) {
      // Đàn tranh: gảy nốt, tắt dần; nốt nửa phách thì gảy hai nốt trong một phách
      const n = st.phrase.shift(), f = freq(m, n.step), lead = m.lead === 'sao' && Math.random() < 0.5;
      if (st.erhu) {   // nhị hồ: dây kéo, vào từ dưới nốt, rung sâu, tiếng mũi (lọc thấp)
        voice({ wave: 'sawtooth', from: f * 0.97, f, a: 0.22, d: beat * n.len * 1.5 + 0.35, v: cfg.erhu ?? 0.05, vib: 5.5, q: 1500, pan: 0.15 }, at);
      } else if (lead) {
        voice({ wave: 'sine', f, a: 0.18, d: beat * n.len * 1.6 + 0.4, v: cfg.flute, vib: 5, q: 3200 }, at);
        hiss(at, beat * n.len * 1.4, 0.006, f * 1.5, f * 2.5);
      } else {
        const pluck = (ff, t) => zither(ff, t, cfg.zither * 1.2, -0.2, Math.random() < 0.15);
        pluck(f, at);
        if (n.len === 0.5 && st.phrase.length) pluck(freq(m, st.phrase.shift().step), at + beat / 2);
      }
      if (!st.phrase.length) { st.rest = 2 + Math.floor(Math.random() * 4) + (st.night ? cfg.night_rest : 0) - (st.k > 0.5 ? 1 : 0); }
    } else if (--st.rest <= 0) { st.phrase = makePhrase(); st.erhu = m.mood === 'toi' && Math.random() < (cfg.erhu_p ?? 0.4); }
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
    night(on) { st.night = on; },
    combat(k) { st.want = Math.max(0, Math.min(1, k)); },
    play(id) {
      if (id === st.id && st.timer) return;
      stop();
      st.id = id; st.m = cfg.maps[id];
      if (!st.m) return;
      st.phrase = []; st.rest = 1; st.beat = 0; st.next = null;
      startWind(st.m);
      st.timer = setInterval(() => { if (ac.state === 'running') tick(); }, 60 / bpmOf(st.m) * 1000);
    },
    // Nốt đàn tranh khi đánh trúng (data/juice.json → note): theo thang âm khúc đang phát nên luôn hợp nhạc nền;
    // Liên Kích càng cao nốt càng leo, thành chuỗi rải như nhạc. step: bậc thang âm, v: âm lượng
    note(step, v, at = ac.currentTime) {   // at: chỉ để xuất file nghe thử (tools/nghe-thu.mjs)
      if (!st.m || at - (st.lastNote ?? -1) < (cfg.note_gap ?? 0.06)) return;
      st.lastNote = at;
      zither(freq(st.m, step), at, cfg.zither * v, (Math.random() - 0.5) * 0.4);
    },
    get id() { return st.id; },
    // Viết sẵn cả bản vào OfflineAudioContext để xuất file nghe thử
    score(id, sec) {
      st.m = cfg.maps[id]; st.phrase = []; st.rest = 1; st.beat = 0;
      startWind(st.m);
      for (let t = 0.05; t < sec; t += 60 / bpmOf(st.m)) tick(t);
    },
    stop,
  };
}
