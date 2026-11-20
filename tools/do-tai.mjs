// Đo độ nặng lúc tải game (đợt làm nhẹ 20/11/2026): số tệp, dung lượng trên đường truyền (có nén gzip như máy chủ thật), thời gian tới lúc
// bấm chơi được và tới lúc vào game, trên mạng 4G giả lập. So bản gói với bản chép từng tệp:
//   node tools/goi.mjs _site && node tools/do-tai.mjs _site          GOI=0 node tools/goi.mjs _cu && node tools/do-tai.mjs _cu
// Biến môi trường: MANG=4g (mặc định: trễ 150 ms, xuống 9 Mbit/giây) | 3g (trễ 300 ms, 1,6 Mbit/giây) | nhanh (không bóp).
// Cần playwright (như tools/playtest.mjs). Không gọi máy chủ thật (chặn thư viện Supabase), chơi thử bằng khách (?thu=1).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const ROOT = resolve(process.argv[2] || '.'), PORT = +(process.env.PORT || 8795);
const MANG = { '4g': { latency: 150, down: 9e6 / 8, up: 2e6 / 8 }, '3g': { latency: 300, down: 1.6e6 / 8, up: 0.75e6 / 8 }, nhanh: null }[process.env.MANG || '4g'];
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
const NEN = new Set(['.html', '.js', '.mjs', '.css', '.json', '.svg', '.webmanifest']), nho = new Map(), sent = [];
const server = createServer(async (req, res) => {
  const file = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([/\\])+/, '') || 'index.html', ext = extname(file);
  try {
    let body = nho.get(file);
    if (!body) { body = await readFile(join(ROOT, file)); if (NEN.has(ext)) body = gzipSync(body); nho.set(file, body); }
    sent.push([file, body.length]);
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', ...(NEN.has(ext) ? { 'content-encoding': 'gzip' } : {}), 'cache-control': 'no-store' }); res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT);

const { chromium } = await import('playwright');
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
await ctx.route(/supabase-js|posthog/, r => r.abort());
const p = await ctx.newPage(), errs = [];
p.on('pageerror', e => errs.push(e.message));
if (MANG) { const cdp = await ctx.newCDPSession(p); await cdp.send('Network.enable'); await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: MANG.latency, downloadThroughput: MANG.down, uploadThroughput: MANG.up }); }
const t0 = Date.now();
await p.goto(`http://localhost:${PORT}/?thu=1`, { timeout: 180000 });
await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 180000 });
const tSan = Date.now() - t0, nSan = sent.length, bSan = sent.reduce((a, [, n]) => a + n, 0);
await p.tap('#btn-guest');
await p.waitForFunction(() => window.__game?.save && window.__game.player, null, { timeout: 180000 });
await p.waitForTimeout(3000);
const tVao = Date.now() - t0 - 3000;
const loai = {}; for (const [f, n] of sent) { const e = extname(f) || '.html'; loai[e] = (loai[e] || 0) + n; }
console.log(JSON.stringify({ mang: process.env.MANG || '4g', toi_luc_bam_choi_duoc: { giay: +(tSan / 1000).toFixed(1), tep: nSan, kb: Math.round(bSan / 1024) }, vao_game: { giay: +(tVao / 1000).toFixed(1), tep: sent.length, kb: Math.round(sent.reduce((a, [, n]) => a + n, 0) / 1024) }, theo_loai_kb: Object.fromEntries(Object.entries(loai).map(([k, v]) => [k, Math.round(v / 1024)])), loi_js: errs }));
await b.close(); server.close();
