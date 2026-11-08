// Xuất nhạc nền ra file để nghe thử (không cần mở game): dựng nhạc bằng chính src/core/music.js trong OfflineAudioContext.
// Chạy: node tools/nghe-thu.mjs <bản đồ> <giây> <mức đánh 0..1> <file.wav>
// Thêm tham số thứ 5 "danh": chèn chuỗi đòn chém (tiếng hit/crit + nốt đàn theo Liên Kích, data/juice.json → note) để nghe thử.
// Ví dụ: node tools/nghe-thu.mjs boss 40 1 /tmp/boss.wav   (rồi ffmpeg -i /tmp/boss.wav boss.mp3 để gửi điện thoại)
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const [map = 'boss', sec = '30', k = '1', out = 'nghe-thu.wav', danh = ''] = process.argv.slice(2);
const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const srv = createServer(async (q, r) => {
  const f = normalize(decodeURIComponent(new URL(q.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html';
  try { const b = await readFile(join(ROOT, f)); r.writeHead(200, { 'content-type': TYPES[extname(f)] || 'application/octet-stream' }); r.end(b); }
  catch { r.writeHead(404); r.end(); }
}).listen(0);
const port = srv.address().port;

const b = await chromium.launch();
const p = await b.newPage();
await p.goto(`http://localhost:${port}/data/sounds.json`);   // trang trống cùng gốc, để import được src/
const wav = await p.evaluate(async ({ map, sec, k, danh }) => {
  const { createMusic } = await import('/src/core/music.js'), { renderSfx } = await import('/src/core/synth.js');
  const cfg = await (await fetch('/data/sounds.json')).json();
  const sr = 44100, ac = new OfflineAudioContext(2, Math.ceil(sr * sec), sr);
  const noise = ac.createBuffer(1, sr, sr), d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  const g = ac.createGain(); g.gain.value = cfg.volume.music * 2.2; g.connect(ac.destination);
  const m = createMusic(ac, g, noise, cfg.music);
  m.combat(k);
  m.score(map, sec);
  if (danh) {   // chuỗi 8 đòn mỗi 0,22 giây, đòn thứ 5 chí mạng, đòn cuối hạ quái; nghỉ 1,2 giây rồi lặp, Liên Kích cộng dồn
    const J = await (await fetch('/data/juice.json')).json(), N = J.note, sg = ac.createGain(); sg.gain.value = cfg.volume.sfx * 1.6; sg.connect(ac.destination);
    const bufs = {}, sfx = (name, at) => { const r = cfg.sfx[name]; if (!r) return;
      const b2 = bufs[name] || (bufs[name] = (() => { const d2 = renderSfx(r, sr, name.length * 31 + 7), bb = ac.createBuffer(1, d2.length, sr); bb.getChannelData(0).set(d2); return bb; })());
      const s2 = ac.createBufferSource(), g2 = ac.createGain(); s2.buffer = b2; g2.gain.value = r.gain ?? 1; s2.connect(g2); g2.connect(sg); s2.start(at); };
    let combo = 0;
    for (let t = 1; t < sec - 2; t += 8 * 0.22 + 1.2) for (let i = 0; i < 8; i++) {
      const at = t + i * 0.22, crit = i === 4; combo++;
      sfx('swing', at - 0.05); sfx(crit ? 'crit' : 'hit', at);
      if (N.on) m.note((combo - 1) % N.steps + (crit ? N.crit_up : 0), crit ? N.v_crit : N.v, at);
      if (i === 7) { sfx('die', at + 0.02); if (N.on) m.note(N.kill, N.v_crit, at + 0.07); }
      if (i === 7 && combo % 16 === 0) sfx('pickup', at + 0.5);
    }
  }
  const buf = await ac.startRendering();
  // WAV 16 bit
  const n = buf.length, ch = 2, bytes = 44 + n * ch * 2, v = new DataView(new ArrayBuffer(bytes));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, bytes - 8, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true);
  v.setUint32(24, sr, true); v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const L = buf.getChannelData(0), R = buf.getChannelData(1);
  let peak = 0;
  for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
  const gain = peak > 0.98 ? 0.98 / peak : 1;
  for (let i = 0, o = 44; i < n; i++) for (const c of [L, R]) { v.setInt16(o, Math.max(-1, Math.min(1, c[i] * gain)) * 32767, true); o += 2; }
  let s = ''; const u = new Uint8Array(v.buffer);
  for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000));
  return btoa(s);
}, { map, sec: +sec, k: +k, danh });
await writeFile(out, Buffer.from(wav, 'base64'));
console.log('đã ghi', out);
await b.close(); srv.close();
