// Đo tiếng hiệu ứng mà không cần nghe: dựng từng tiếng bằng chính src/core/synth.js rồi in dài, đỉnh, độ to, phổ, thời gian dựng.
// Chạy: node tools/sfx-check.mjs [tên hoặc tiền tố, cách nhau dấu phẩy] [--wav <thư mục>] [--chieu] [--do <file.json>]
//   --wav: ghi từng tiếng ra file WAV (nghe thử, vẽ phổ)       --chieu: chỉ kiểm bảng tiếng riêng từng chiêu (data/tieng-chieu.json)
//   --do: ghi số đo ra file JSON (tools/sfx_chieu.py dùng để tự chỉnh âm lượng từng tiếng về độ to đích "to")
// Cột: dài (giây) · đỉnh · LA (độ to gần đúng theo tai người, dB, lấy 1/8 giây to nhất như máy đo mức âm chế độ nhanh) · LP (như LA nhưng bỏ phần dưới 300 Hz mà loa
// điện thoại không ra: độ to nghe trên loa điện thoại; LA − LP lớn nghĩa là tiếng chỉ "nặng" khi đeo tai nghe) · tâm phổ (Hz) · phần năng lượng 5 dải
// (<200 · 200–800 · 800–2500 · 2500–6000 · >6000 Hz) · ms dựng. Cảnh báo: vỡ tiếng, quá dài, chói (nhiều năng lượng 2,5–6 kHz, chủ dự án
// 09/11/2026 chê "chói tai", "ting ting"), bụp đầu tiếng, dựng nặng. Có cảnh báo thì thoát mã 1 (trừ cảnh báo "nặng").
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderSfx } from '../src/core/synth.js';

const ROOT = new URL('..', import.meta.url).pathname, J = f => JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8'));
const args = process.argv.slice(2), opt = k => (args.includes(k) ? args[args.indexOf(k) + 1] : null), wavDir = opt('--wav'), doFile = opt('--do'), onlyChieu = args.includes('--chieu');
const pick = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--wav' && args[i - 1] !== '--do').flatMap(a => a.split(','));
const sounds = J('sounds.json'), chieu = J('tieng-chieu.json'), skills = J('skills.json');
const ALL = { ...sounds.sfx, ...chieu.sfx }, SR = 44100, N = 2048, HOP = 1024;

// FFT cơ số 2 tại chỗ
function fft(re, im) {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = -2 * Math.PI / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr;
        re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
}
// Đường cong A (tai người nghe rõ nhất quanh 2–4 kHz, kém ở dải trầm)
const aW = f => { const f2 = f * f, r = (12194 ** 2 * f2 * f2) / ((f2 + 20.6 ** 2) * Math.sqrt((f2 + 107.7 ** 2) * (f2 + 737.9 ** 2)) * (f2 + 12194 ** 2)); return (r * 1.2589) ** 2; };
const AW = Array.from({ length: N / 2 }, (_, k) => aW(Math.max(1, k * SR / N))), HANN = Array.from({ length: N }, (_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
const PH = Array.from({ length: N / 2 }, (_, k) => { const r = (k * SR / N / 300) ** 2; return (r * r) / (1 + r * r); });   // loa điện thoại: lọc cao bậc 2 ở 300 Hz
const BANDS = [200, 800, 2500, 6000, 1e9];

function measure(x) {
  const band = [0, 0, 0, 0, 0], frames = [], phone = [];
  let cen = 0, tot = 0;
  for (let s = 0; s + N <= x.length + HOP; s += HOP) {
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let i = 0; i < N; i++) re[i] = (x[s + i] || 0) * HANN[i];
    fft(re, im);
    let la = 0, lp = 0;
    for (let k = 1; k < N / 2; k++) {
      const p = re[k] * re[k] + im[k] * im[k], f = k * SR / N;
      la += p * AW[k]; lp += p * AW[k] * PH[k]; cen += p * f; tot += p; band[BANDS.findIndex(b => f < b)] += p;
    }
    frames.push(la); phone.push(lp);
  }
  const W = Math.max(1, Math.round(0.125 * SR / HOP)), db = v => 10 * Math.log10(v / (N * N / 8) + 1e-12);
  const top = F => { let best = 0; for (let i = 0; i < F.length; i++) { let a = 0; for (let j = i; j < Math.min(F.length, i + W); j++) a += F[j]; best = Math.max(best, a / W); } return best; };
  let pk = 0; for (const v of x) pk = Math.max(pk, Math.abs(v));
  return { dur: x.length / SR, pk, la: db(top(frames)), lp: db(top(phone)), cen: tot ? cen / tot : 0, band: band.map(b => (tot ? b / tot : 0)) };
}

function wav(x) {
  const b = Buffer.alloc(44 + x.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + x.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(x.length * 2, 40);
  for (let i = 0; i < x.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, x[i])) * 32767), 44 + i * 2);
  return b;
}

let bad = 0;
const warn = (name, msg, soft) => { console.log(`  ! ${name}: ${msg}`); if (!soft) bad++; };

// Bảng tiếng riêng từng chiêu: mã chiêu và tên tiếng phải có thật
for (const [id, O] of Object.entries(chieu.by_skill || {})) {
  if (!skills[id]) warn(id, 'by_skill có mã chiêu không có trong data/skills.json');
  for (const [k, v] of Object.entries(O)) { const n = Array.isArray(v) ? v[0] : v; if (!ALL[n]) warn(id, `by_skill.${k} trỏ tới tiếng "${n}" không có`); }
}
for (const [id, s] of Object.entries(skills)) if (s && typeof s === 'object' && s.type && !chieu.by_skill?.[id]) warn(id, 'chiêu chưa có tiếng riêng trong data/tieng-chieu.json → by_skill', true);
const used = new Set(Object.values(chieu.by_skill || {}).flatMap(O => Object.values(O).map(v => (Array.isArray(v) ? v[0] : v))));
for (const n of Object.keys(chieu.sfx || {})) if (!used.has(n)) warn(n, 'tiếng trong data/tieng-chieu.json không chiêu nào dùng', true);

const names = Object.keys(onlyChieu ? chieu.sfx : ALL).filter(n => !pick.length || pick.some(p => n === p || n.startsWith(p)));
if (wavDir) mkdirSync(wavDir, { recursive: true });
const DO = {};
console.log('tiếng'.padEnd(22), 'dài   đỉnh   LA     LP    tâm   <200 <800 <2k5 <6k  >6k   ms  lớp');
for (const name of names) {
  const rec = ALL[name], t0 = performance.now(), x = renderSfx(rec, SR, name.length * 7919 + 1), ms = performance.now() - t0, m = measure(x);
  console.log(name.padEnd(22), m.dur.toFixed(2).padStart(4), m.pk.toFixed(2).padStart(6), m.la.toFixed(1).padStart(6), m.lp.toFixed(1).padStart(6), String(Math.round(m.cen)).padStart(6), ' ',
    m.band.map(b => String(Math.round(b * 100)).padStart(3) + '%').join(' '), String(Math.round(ms)).padStart(4), String(rec.L?.length ?? rec.length).padStart(4));
  DO[name] = { lp: +m.lp.toFixed(2), la: +m.la.toFixed(2), pk: +m.pk.toFixed(3), dur: +m.dur.toFixed(3), ms: Math.round(ms) };
  if (rec.to != null && Math.abs(m.lp - rec.to) > 1.5) warn(name, `độ to trên loa điện thoại ${m.lp.toFixed(1)} dB lệch đích ${rec.to} dB (chạy lại tools/sfx_chieu.py)`, true);
  if (m.pk > 0.97) warn(name, 'đỉnh quá 0,97 (dễ vỡ tiếng)');
  if (m.dur > 4.2) warn(name, `dài ${m.dur.toFixed(1)} giây`);
  if (m.band[3] > 0.45 || m.band[4] > 0.25) warn(name, `chói: ${Math.round(m.band[3] * 100)}% năng lượng 2,5–6 kHz, ${Math.round(m.band[4] * 100)}% trên 6 kHz`);
  if (Math.abs(x[0]) > 0.05) warn(name, 'bụp đầu tiếng (mẫu đầu khác 0)');
  if (ms > 120) warn(name, `dựng ${Math.round(ms)} ms (điện thoại chậm hơn 3–4 lần)`, true);
  if (wavDir) writeFileSync(join(wavDir, name.replace(/[^\w.-]/g, '_') + '.wav'), wav(x));
}
if (doFile) writeFileSync(doFile, JSON.stringify(DO));
console.log(bad ? `${bad} cảnh báo` : 'ổn', '·', names.length, 'tiếng');
process.exit(bad ? 1 : 0);
