// Nhạc nền rải hợp âm bằng mộc cầm (data/sounds.json → music.arp; chủ dự án 09/11/2026 01:28 gửi clip mẫu: "thích mấy âm
// này kết hợp nhau", bỏ kiểu đàn tranh gảy lác đác). Học từ clip: móc đơn đều tăm tắp (nốt nửa phách), mỗi ô nhịp rải một
// hợp âm leo hai quãng tám rồi quay xuống, tiếng tròn như gõ mộc cầm (src/core/synth.js → malletBuffer), dây trầm ngân
// nốt chủ mỗi ô nhịp, vài ô nhịp sau thì nền dây ngân vào cho dày; vang nhiều. Đảo tối (mood 'toi') giọng thứ, còn lại
// giọng trưởng. 01:39 chủ dự án: clip "có cảm giác nước và bong bóng" → tiếng nốt kiểu bọt nước (A.voice 'bubble'), tiếng
// vọng nảy hai bên tai như giọt nước rơi trong hang (A.echo), lác đác tiếng bọt nổi lên (A.bubbles). 09:12: "chói tai, ong ong":
// tiếng ly thuỷ tinh đựng nước (voice 'glass'), thưa nốt có nhịp (shapes có chỗ nghỉ null), tiếng suối chảy nền (A.stream), bỏ nền dây ngân. Hợp âm đi theo prog (bậc trong thang 7 nốt), hình rải theo shapes (bậc tính từ nốt chủ hợp âm).
import { malletBuffer } from './synth.js';

const SCALES = { sang: [0, 2, 4, 5, 7, 9, 11], toi: [0, 2, 3, 5, 7, 8, 10] };

export function createArp(ac, bus, A) {
  const deg = (base, mood, d) => {
    const sc = SCALES[mood], o = Math.floor(d / 7), i = ((d % 7) + 7) % 7;
    return base * Math.pow(2, (sc[i] + 12 * o) / 12);
  };
  const pan = (node, p) => {
    if (!ac.createStereoPanner) return node;
    const s = ac.createStereoPanner(); s.pan.value = p; node.connect(s); return s;
  };
  // Tiếng vọng: trễ nảy trái phải, mỗi vòng tối dần (lọc thấp trong vòng hồi)
  let echo = bus;
  if (A.echo) {
    const E = A.echo, inp = ac.createGain(), dl = ac.createDelay(2), dr = ac.createDelay(2), fb = ac.createGain(), lp = ac.createBiquadFilter(), wet = ac.createGain();
    dl.delayTime.value = dr.delayTime.value = E.t; fb.gain.value = E.fb; lp.type = 'lowpass'; lp.frequency.value = E.lp; wet.gain.value = E.wet;
    inp.connect(dl); dl.connect(lp); lp.connect(dr); dr.connect(fb); fb.connect(dl);
    pan(dl, -0.6).connect(wet); pan(dr, 0.6).connect(wet); wet.connect(bus);
    echo = inp;
  }
  function mallet(f, at, v, p) {
    const s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = malletBuffer(ac, f, A.voice); g.gain.value = v;
    s.connect(g); const o = pan(g, p); o.connect(bus); if (echo !== bus) o.connect(echo); s.start(at);
  }
  // Tiếng suối chảy (A.stream): hai dải nhiễu lọc, tần số và độ to trôi chậm theo hai nhịp lệch nhau, chạy suốt
  if (A.stream?.v) {
    const sr = ac.sampleRate, nb = ac.createBuffer(1, sr * 2, sr), ch = nb.getChannelData(0);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
    for (const [f, q, rate, v] of A.stream.bands) {
      const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain(), lfo = ac.createOscillator(), lg = ac.createGain(), lfo2 = ac.createOscillator(), lg2 = ac.createGain();
      s.buffer = nb; s.loop = true; fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; g.gain.value = A.stream.v * v;
      lfo.frequency.value = rate; lg.gain.value = f * 0.35; lfo.connect(lg); lg.connect(fl.frequency);
      lfo2.frequency.value = rate * 1.7; lg2.gain.value = A.stream.v * v * 0.5; lfo2.connect(lg2); lg2.connect(g.gain);
      s.connect(fl); fl.connect(g); pan(g, (Math.random() - 0.5) * 0.8).connect(bus); s.start(); lfo.start(); lfo2.start();
    }
  }
  // Bọt nước nổi: sin vút lên rất nhanh rồi tắt
  function bubble(at) {
    const o = ac.createOscillator(), g = ac.createGain(), f = (A.bubbles.f ?? 300) * (1 + Math.random() * 1.6);
    o.frequency.setValueAtTime(f, at); o.frequency.exponentialRampToValueAtTime(f * (A.bubbles.up ?? 2) * (1 + Math.random() * 0.5), at + 0.05);
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(A.bubbles.v, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    o.connect(g); pan(g, Math.random() * 1.4 - 0.7).connect(bus); o.start(at); o.stop(at + 0.08);
  }
  // Dây trầm: sin + tam giác qua lọc thấp, vào nhẹ, ngân hết ô nhịp
  function bass(f, at, d, v) {
    const g = ac.createGain(), fl = ac.createBiquadFilter();
    fl.type = 'lowpass'; fl.frequency.value = 500;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
    for (const w of ['sine', 'triangle']) { const o = ac.createOscillator(); o.type = w; o.frequency.value = f; o.connect(fl); o.start(at); o.stop(at + d + 0.05); }
    fl.connect(g); g.connect(bus);
  }
  // Nền dây ngân: răng cưa lệch nhẹ qua lọc thấp, lên chậm, xuống chậm
  function pad(fs, at, d, v) {
    for (const f of fs) for (const det of [-6, 6]) {
      const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      fl.type = 'lowpass'; fl.frequency.value = A.pad.lp;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + d * 0.35);
      g.gain.setValueAtTime(v, at + d * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(fl); fl.connect(g); g.connect(bus); o.start(at); o.stop(at + d + 0.05);
    }
  }

  // Một phách (gọi theo nhịp nhạc nền): n số phách từ lúc vào khúc, 4 phách một ô nhịp, mỗi phách hai nốt rải
  return function step(at, beat, m, n, night) {
    const mood = m.mood === 'toi' ? 'toi' : 'sang', prog = A.prog[mood], bar = Math.floor(n / 4);
    const chord = prog[bar % prog.length], shape = A.shapes[Math.floor(bar / prog.length) % A.shapes.length];
    const base = m.root < A.low ? m.root * 2 : m.root, V = A.v * (night ? A.night : 1);
    for (let h = 0; h < 2; h++) {
      const e = (n % 4) * 2 + h, d = shape[e];
      if (d == null) continue;
      mallet(deg(base, mood, chord + d), at + h * beat / 2 + Math.random() * A.swing, V * (e === 0 ? 1.15 : 0.85 + Math.random() * 0.15), (e / 7 - 0.5) * 0.7);
    }
    if (A.bubbles && Math.random() < A.bubbles.p) { const k = 1 + Math.floor(Math.random() * 3); for (let i = 0; i < k; i++) bubble(at + Math.random() * beat); }
    if (n % 4) return;
    if (A.bass) bass(deg(base, mood, chord - 14), at, beat * 4.2, A.bass * (night ? A.night : 1));
    if (A.pad.v && bar >= A.pad_from) pad([0, 2, 4].map(x => deg(base, mood, chord + x - 7)), at, beat * 4.4, A.pad.v);
  };
}
