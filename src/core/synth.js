// Bộ tổng hợp tiếng hiệu ứng (chủ dự án 06/11/2026 19:15: làm lại bộ âm thanh bằng code, cổ phong Á Đông pha 16-bit).
// Tự tính từng mẫu âm bằng JS rồi đóng thành AudioBuffer một lần (phát lại rẻ, đổi cao độ được): sóng có phong bì, nhiễu lọc
// quét (gió, lửa, vút kiếm), dây gảy Karplus-Strong (đàn tranh, dây cung), FM (chuông ngọc, chiêng, kim loại ngân).
// Công thức ở data/sounds.json → sfx (mỗi tiếng: { v, jit, rev, L: [lớp…] }). Không đụng WebAudio ngoài createBuffer,
// nên chạy được cả trong Node để đo (tools/sfx-check.mjs: độ to, phổ, cảnh báo chói / vỡ).
const TAU = Math.PI * 2;

// Phong bì: lên a giây (tuyến tính), rồi tắt theo hàm mũ tới hết d (đuôi về 0), hold: giữ mức trước khi tắt
function env(i, sr, L) {
  const t = i / sr, a = L.a ?? 0.004, h = L.h ?? 0, d = L.d;
  if (t < a) return t / a;
  if (t < a + h) return 1;
  const k = (t - a - h) / Math.max(1e-4, d - a - h);
  return k >= 1 ? 0 : Math.pow(1 - k, L.c ?? 2.4);   // c: độ cong, lớn = tắt nhanh lúc đầu
}

// Đường cao độ: từ f tới f2 (hàm mũ) trong thời gian d (hoặc g giây nếu có)
const sweep = (f, f2, t, d) => (f2 ? f * Math.pow(f2 / f, Math.min(1, t / d)) : f);

// Bộ lọc biquad (RBJ) đổi tần số theo thời gian, tính lại hệ số mỗi 32 mẫu
function biquad(type, sr) {
  let b0 = 1, b1 = 0, b2 = 0, a1 = 0, a2 = 0, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return {
    set(f, q = 0.707) {
      const w = TAU * Math.min(f, sr * 0.45) / sr, s = Math.sin(w), c = Math.cos(w), al = s / (2 * q), a0 = 1 + al;
      if (type === 'lp') { b0 = (1 - c) / 2 / a0; b1 = (1 - c) / a0; b2 = b0; }
      else if (type === 'hp') { b0 = (1 + c) / 2 / a0; b1 = -(1 + c) / a0; b2 = b0; }
      else { b0 = al / a0; b1 = 0; b2 = -al / a0; }   // bp
      a1 = -2 * c / a0; a2 = (1 - al) / a0;
    },
    run(x) { const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = x; y2 = y1; y1 = y; return y; },
  };
}

function osc(wave, ph) {
  const p = ph - Math.floor(ph);
  if (wave === 'sine') return Math.sin(TAU * p);
  if (wave === 'tri') return 1 - 4 * Math.abs(p - 0.5);
  if (wave === 'saw') return 2 * p - 1;
  return p < (wave === 'pulse' ? 0.25 : 0.5) ? 1 : -1;   // square, pulse (25%)
}

// Một lớp vào mảng out (cộng dồn), bắt đầu ở mẫu s0. rnd: hàm ngẫu nhiên có hạt (tiếng giống nhau mỗi lần dựng).
// Trả về hàm chạy tiếp tối đa m mẫu (true khi xong lớp), để tiếng dài dựng rải được qua nhiều khung hình (sfxJob).
function layer(out, sr, L, rnd) {
  const s0 = Math.floor((L.t || 0) * sr), n = Math.min(out.length - s0, Math.ceil(L.d * sr)), v = L.v ?? 0.5;
  const lp = L.lp && biquad('lp', sr), hp = L.hp && biquad('hp', sr), bp = L.bp && biquad('bp', sr);
  let ph = 0, mph = 0, last = 0, i = 0;
  if (L.k === 'pluck') {   // Karplus-Strong: vòng trễ đầy nhiễu, mỗi vòng lấy trung bình 2 mẫu kề (dây tắt dần, sáng → tối)
    const N = Math.max(2, Math.round(sr / L.f)), buf = new Float32Array(N), damp = L.damp ?? 0.5, br = L.br ?? 0.5, E = { a: 0.001, d: L.d, c: L.c ?? 1.2 };
    let prev = 0, idx = 0;
    for (let k = 0; k < N; k++) { const w = rnd() * 2 - 1; prev = prev + (w - prev) * (0.2 + 0.8 * br); buf[k] = prev; }
    if (lp) lp.set(L.lp);
    return m => {
      for (const end = Math.min(n, i + m); i < end; i++) {
        const a = buf[idx], b = buf[(idx + 1) % N], y = (a + b) * 0.5 * (0.996 + 0.0035 * (1 - damp));
        buf[idx] = y; idx = (idx + 1) % N;
        let x = a * env(i, sr, E);
        if (lp) x = lp.run(x);
        out[s0 + i] += x * v;
      }
      return i >= n;
    };
  }
  return m => {
    for (const end = Math.min(n, i + m); i < end; i++) {
      const t = i / sr;
      let x;
      if (L.k === 'noise') {
        const w = rnd() * 2 - 1;
        x = L.crackle ? (rnd() < L.crackle ? w * 3 : w * 0.15) : w;   // lửa lách tách: thỉnh thoảng một hạt to
        if (L.smooth) { last += (x - last) * L.smooth; x = last; }
      } else if (L.k === 'fm') {   // chuông, chiêng: sóng mang + sóng điều chế, chỉ số điều chế giảm dần (tiếng "keng" rồi ngân)
        const f = sweep(L.f, L.f2, t, L.g ?? L.d), idx = (L.i ?? 3) * (L.i2 != null ? sweep(1, L.i2 / (L.i ?? 3) || 1e-3, t, L.d) : Math.max(0, 1 - t / L.d));
        mph += f * (L.r ?? 1.4) / sr;
        ph += f / sr;
        x = Math.sin(TAU * ph + idx * Math.sin(TAU * mph));
      } else {
        let f = sweep(L.f, L.f2, t, L.g ?? L.d);
        if (L.vib) f *= 1 + (L.vd ?? 0.01) * Math.sin(TAU * L.vib * t) * Math.min(1, t / 0.15);
        ph += f / sr;
        x = osc(L.w || 'sine', ph);
      }
      if (L.dist) x = Math.tanh(x * L.dist) / Math.tanh(L.dist);
      if (i % 32 === 0) {
        if (lp) lp.set(sweep(L.lp, L.lp2, t, L.d), L.lq);
        if (hp) hp.set(sweep(L.hp, L.hp2, t, L.d), L.hq);
        if (bp) bp.set(sweep(L.bp, L.bp2, t, L.d), L.bq ?? 2);
      }
      if (lp) x = lp.run(x); if (hp) x = hp.run(x); if (bp) x = bp.run(x);
      if (L.am) x *= 1 - (L.amd ?? 0.6) * (0.5 + 0.5 * Math.sin(TAU * L.am * t));   // rung âm lượng (vo ve, khiên)
      out[s0 + i] += x * v * env(i, sr, L);
    }
    return i >= n;
  };
}

// Gõ mộc cầm (marimba, chủ dự án 09/11/2026 01:28 theo clip: tiếng tròn, gần như sóng sin thuần, có bồi âm gấp 4 tắt nhanh,
// tiếng gõ đầu dùi rất ngắn). { k: 'mallet', f, t, d, v } trong công thức tiếng đổi thành các lớp dưới đây.
const mallet = l => [
  { k: 'osc', w: 'sine', f: l.f, t: l.t, d: l.d, v: l.v ?? 0.5, a: 0.003, c: l.c ?? 2 },
  { k: 'osc', w: 'sine', f: l.f * 4, t: l.t, d: Math.min(l.d, 0.5), v: (l.v ?? 0.5) * (l.p4 ?? 0.2), a: 0.002, c: 3 },
  { k: 'osc', w: 'sine', f: l.f * 9.9, t: l.t, d: 0.04, v: (l.v ?? 0.5) * 0.05, a: 0.001, c: 2 },
  { k: 'noise', t: l.t, d: 0.01, v: (l.v ?? 0.5) * 0.06, hp: 2500 },
];

// Dựng một tiếng thành Float32Array (mono). Chuẩn hoá đỉnh về P (data: v) để mọi tiếng đều nhau, không vỡ.
// sfxJob: dựng dần, job.step(m) dựng thêm tối đa m mẫu của lớp đang làm và trả true khi xong cả tiếng (job.out). audio.js dùng để dựng
// sẵn tiếng chiêu dài rải qua nhiều khung hình (một tiếng 2 giây chục lớp dựng liền một hơi làm khựng hình trên điện thoại).
export function sfxJob(rec, sr, seed = 1) {
  const L = Array.isArray(rec) ? rec.map(n => ({ k: n.wave === 'noise' ? 'noise' : 'osc', w: { triangle: 'tri', sawtooth: 'saw' }[n.wave] || n.wave, f: n.f, f2: n.f2, t: n.t, d: n.d, v: n.v, lp: n.q })) : rec.L.flatMap(l => l.k === 'mallet' ? mallet(l) : [l]);   // công thức cũ (danh sách nốt) vẫn chạy
  const len = Math.ceil(Math.max(...L.map(l => (l.t || 0) + l.d)) * sr) + 8, out = new Float32Array(len);
  let s = seed >>> 0 || 1, at = 0, run = null;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const job = { out: null, step(m = 1e9) {
    if (job.out) return true;
    if (at < L.length) { run ||= layer(out, sr, L[at], rnd); if (run(m)) { run = null; at++; } }
    if (at < L.length) return false;
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(out[i]));
    const P = Array.isArray(rec) ? 0.5 : (rec.v ?? 0.6), k = pk > 0 ? P / pk : 1;
    for (let i = 0; i < len; i++) out[i] *= k;
    for (let i = 0; i < 64 && i < len; i++) out[len - 1 - i] *= i / 64;   // khử tiếng "bụp" cuối
    job.out = out;
    return true;
  } };
  return job;
}
export function renderSfx(rec, sr, seed = 1) { const j = sfxJob(rec, sr, seed); while (!j.step()); return j.out; }

// Nốt cho nhạc nền rải (src/core/music-arp.js), cache theo tần số và kiểu tiếng. kind 'bubble' (chủ dự án 09/11/2026 01:39:
// clip mẫu "có cảm giác nước và bong bóng"): sóng sin gần như thuần, vào mềm 25 ms, cao độ trượt nhẹ từ dưới lên như bọt nước
// nổi "bloop", ngân dài; 'mallet': mộc cầm.
const mallets = new Map();
const TONES = {
  bubble: f => [{ k: 'osc', w: 'sine', f: f * 0.88, f2: f, g: 0.035, d: 2.2, a: 0.025, c: 1.6, v: 1 },
    { k: 'osc', w: 'sine', f: f * 2, d: 0.4, a: 0.02, v: 0.04 }, { k: 'osc', w: 'sine', f: f * 3, d: 0.2, a: 0.02, v: 0.025 }],
  // ly thuỷ tinh đựng nước gõ nhẹ (chủ dự án 09/11/2026 09:12: nhạc chói, đầu ong ong, chỉ cần "bing bong" như gõ ly nước):
  // sin chủ + một sin lệch 0,3% cho tiếng rung nước, hai bồi âm kiểu chuông ly (×2,32 ×4,25) rất nhỏ, tắt nhanh hơn nốt chủ
  glass: f => [{ k: 'osc', w: 'sine', f, d: 1.8, a: 0.004, c: 2.2, v: 0.8 }, { k: 'osc', w: 'sine', f: f * 1.003, d: 1.6, a: 0.004, c: 2.2, v: 0.35 },
    { k: 'osc', w: 'sine', f: f * 2.32, d: 0.7, a: 0.003, c: 2.6, v: 0.12 }, { k: 'osc', w: 'sine', f: f * 4.25, d: 0.25, a: 0.002, c: 3, v: 0.04 }],
  mallet: f => [{ k: 'mallet', f, d: 2.4, v: 1 }],
};
export function malletBuffer(ac, f, kind = 'mallet') {
  const key = kind + Math.round(f * 2);
  if (mallets.has(key)) return mallets.get(key);
  const sr = ac.sampleRate, d = renderSfx({ v: 0.9, L: (TONES[kind] || TONES.mallet)(f) }, sr, Math.round(f * 2));
  const b = ac.createBuffer(1, d.length, sr); b.getChannelData(0).set(d);
  if (mallets.size > 64) mallets.delete(mallets.keys().next().value);
  mallets.set(key, b);
  return b;
}

// Dây đàn tranh gảy (nhạc nền dùng chung): Karplus-Strong + tiếng móng gảy, cache theo tần số
const plucks = new Map();
export function zitherBuffer(ac, f, dur = 2.6) {
  const key = Math.round(f * 2);
  if (plucks.has(key)) return plucks.get(key);
  const sr = ac.sampleRate, d = renderSfx({ v: 0.9, L: [{ k: 'pluck', f, d: dur, damp: 0.25, br: 0.7, c: 1.1 }, { k: 'noise', d: 0.02, v: 0.25, hp: 2500 }, { k: 'osc', w: 'sine', f: f * 2, d: 0.5, v: 0.12, c: 3 }] }, sr, key);
  const b = ac.createBuffer(1, d.length, sr); b.copyToChannel ? b.copyToChannel(d, 0) : b.getChannelData(0).set(d);
  if (plucks.size > 48) plucks.delete(plucks.keys().next().value);
  plucks.set(key, b);
  return b;
}
