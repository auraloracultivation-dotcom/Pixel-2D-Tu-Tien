// Lớp nhạc trận (data/sounds.json → music.tran; chủ dự án 08/11/2026 16:27: nhạc đánh boss dồn dập như video tham khảo,
// khoảng 140 nhịp, giọng thứ, bass dày, cứ 16 phách ngân rồi "thả"). Chạy chồng lên nhạc nền ở khúc trùm (music.maps.*.boss)
// khi mức đánh st.k vượt tran.on: trống đạp mỗi phách, trống con phách 2 và 4, xèng nửa phách, dây bass chạy móc theo hợp âm
// từng ô nhịp (i – VI – VII – v), nền ngân giữ hợp âm; 4 phách cuối mỗi đoạn nhiễu vút lên, phách đầu đoạn sau nện mạnh.
// Tổng hợp bằng WebAudio, không cần file. Mỗi tiếng tạo nút rồi tự dừng, không giữ gì giữa các phách.

export function createTran(ac, out, bus, noise, T) {
  const dry = ac.createGain(); dry.gain.value = T.vol ?? 0.5; dry.connect(out);   // trống, bass khô cho chắc tiếng
  const send = ac.createGain(); send.gain.value = (T.vol ?? 0.5) * (T.wet ?? 0.25); send.connect(bus);   // chút vang cho nền, xèng

  const env = (g, at, a, d, v) => {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(v, at + a);
    g.gain.exponentialRampToValueAtTime(0.0001, at + d);
  };
  function kick(at, v) {
    const K = T.kick, o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(K.f, at); o.frequency.exponentialRampToValueAtTime(K.f2, at + K.sweep);
    env(g, at, 0.003, K.d, K.v * v);
    o.connect(g); g.connect(dry); o.start(at); o.stop(at + K.d + 0.02);
    const c = ac.createOscillator(), cg = ac.createGain();   // tiếng "cộp" đầu búa cho loa điện thoại (không phát được bass sâu)
    c.type = 'triangle'; c.frequency.setValueAtTime(K.click, at); c.frequency.exponentialRampToValueAtTime(K.f, at + 0.03);
    env(cg, at, 0.001, 0.04, K.v * v * 0.35); c.connect(cg); cg.connect(dry); c.start(at); c.stop(at + 0.05);
  }
  function hiss(at, d, v, type, f, q, to = dry, f2) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noise; fl.type = type; fl.frequency.setValueAtTime(f, at); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(f2, at + d);
    env(g, at, Math.min(0.005, d / 4), d, v);
    if (f2) { g.gain.cancelScheduledValues(at); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(v, at + d * 0.95); g.gain.exponentialRampToValueAtTime(0.0001, at + d); }
    s.connect(fl); fl.connect(g); g.connect(to); s.start(at, Math.random() * 0.5); s.stop(at + d + 0.02);
  }
  function snare(at, v) {
    const S = T.snare;
    hiss(at, S.d, S.v * v, 'bandpass', S.f, 0.7, dry);
    hiss(at, S.d * 1.6, S.v * v * 0.4, 'bandpass', S.f, 0.7, send);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(S.tone, at); o.frequency.exponentialRampToValueAtTime(S.tone * 0.7, at + 0.08);
    env(g, at, 0.002, 0.1, S.v * v * 0.6); o.connect(g); g.connect(dry); o.start(at); o.stop(at + 0.12);
  }
  // Dây bass: răng cưa qua lọc thấp, mở lọc nhanh rồi đóng (tiếng "bập" có độ dày), nốt nửa phách
  function bass(at, f, d, v) {
    const B = T.bass, o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o2.type = 'square'; o.frequency.value = f; o2.frequency.value = f / 2; o2.detune.value = 4;
    fl.type = 'lowpass'; fl.Q.value = B.q; fl.frequency.setValueAtTime(B.lp * 2.4, at); fl.frequency.exponentialRampToValueAtTime(B.lp, at + d * 0.6);
    env(g, at, 0.006, d, B.v * v);
    o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(dry);
    o.start(at); o2.start(at); o.stop(at + d + 0.02); o2.stop(at + d + 0.02);
  }
  // Nền ngân: ba nốt hợp âm, răng cưa lệch nhẹ cho dày, lên chậm
  function pad(at, f0, d, v) {
    for (const [r, det] of [[1, -7], [1.1892, 5], [1.4983, 0]]) {   // nốt chủ, quãng ba thứ, quãng năm
      const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = f0 * r; o.detune.value = det;
      fl.type = 'lowpass'; fl.frequency.value = T.pad.lp;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(T.pad.v * v, at + d * 0.3);
      g.gain.setValueAtTime(T.pad.v * v, at + d * 0.85); g.gain.exponentialRampToValueAtTime(0.0001, at + d);
      o.connect(fl); fl.connect(g); g.connect(send); g.connect(dry);
      o.start(at); o.stop(at + d + 0.02);
    }
  }

  // Một phách. root: nốt chủ của khúc (Hz), n: số phách đã chạy, k: mức đánh 0…1
  return function step(at, beat, root, n, k) {
    if (k < (T.on ?? 0.5)) return;
    const v = Math.min(1, (k - T.on) / Math.max(0.01, 1 - T.on) * 0.5 + 0.5);   // vừa vào thì nhỏ, đánh dữ thì đủ
    const sec = T.drop.every, pos = n % sec, bar = Math.floor(n / 4) % T.chords.length, b4 = n % 4;
    const chord = root * Math.pow(2, T.chords[bar] / 12);
    const riser = pos >= sec - T.drop.rise;
    // Trống: đạp mỗi phách (phách cuối đoạn để trống cho cú thả), phách đầu đoạn nện mạnh thêm chiêng nhỏ
    if (pos !== sec - 1) kick(at, pos === 0 ? 1.25 * v : v);
    if (pos === 0) hiss(at, 1.2, T.drop.crash * v, 'highpass', 3000, 0.5, send);
    if (b4 === 1 || b4 === 3) snare(at, riser && pos === sec - 2 ? 1.3 * v : v);
    if (riser && pos >= sec - 2) snare(at + beat / 2, 0.7 * v);   // dồn trống con cuối đoạn
    for (const h of [0.5, riser ? 0.25 : -1, riser ? 0.75 : -1]) if (h >= 0) hiss(at + beat * h, 0.04, T.hat.v * v, 'highpass', T.hat.hp, 0.6, send);
    // Bass: 2 nốt mỗi phách theo mẫu (nửa cung so với hợp âm ô nhịp này); đoạn vút lên thì bass nghỉ cho thoáng
    if (!riser) for (let i = 0; i < 2; i++) {
      const s = T.bass.pat[(n * 2 + i) % T.bass.pat.length];
      if (s !== null) bass(at + i * beat / 2, chord / 2 * Math.pow(2, s / 12), beat * 0.45, v);
    }
    if (b4 === 0 && !riser) pad(at, chord, beat * 4, v);
    if (pos === sec - T.drop.rise) hiss(at, beat * T.drop.rise, T.drop.v * v, 'bandpass', 300, 1.2, send, 6000);   // nhiễu vút lên
  };
}
