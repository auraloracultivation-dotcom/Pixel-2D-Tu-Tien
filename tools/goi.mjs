#!/usr/bin/env node
// Gói bản đưa lên mạng (đợt làm nhẹ 20/11/2026; chủ dự án: "làm nhẹ game"). Một script cho mọi nơi đưa lên: GitHub Pages
// (.github/workflows/pages.yml), Vercel (tools/build-site.sh), bài chơi thử trên bản gói (.github/workflows/check.yml).
//   node tools/goi.mjs [thư mục ra, mặc định _site]
// Mã nguồn trong kho giữ nguyên từng tệp nhỏ; chỉ bản đưa lên được gói:
//   - JS: gần 500 tệp nhập thành một tệp vào game + vài khúc chung + khúc nạp sau (esbuild, bỏ khoảng trắng và chú thích, GIỮ tên
//     hàm để lỗi người chơi gửi về còn đọc được), kèm bản đồ nguồn .map.
//   - Dữ liệu: mọi tệp data nạp lúc đầu gộp thành data/_all.json (src/core/data.js đọc tệp này khi có số phiên bản).
//   - CSS: style.css nuốt các tệp @import thành một tệp; CSS nạp sau của từng bảng (src/ui/*.css) giữ riêng, chỉ nén.
//   - Số phiên bản V (8 ký tự mã commit): ghi vào src/core/build.js, sw.js và sau tên tệp trong index.html để máy không dùng tệp cũ.
// Biến môi trường: V (mã bản), ESBUILD (đường dẫn esbuild; không có thì thử npx), GOI=0 (không gói: chép từng tệp và gắn ?v= như
// trước 20/11/2026: đường lùi khi bản gói có chuyện, cũng là cách chạy khi máy không có esbuild).
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(process.cwd(), process.argv[2] || '_site');
const V = (process.env.V || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim()).slice(0, 8);
if (!/^[0-9a-zA-Z]{6,8}$/.test(V)) throw new Error(`mã bản không hợp lệ: ${V}`);
// Tệp tĩnh ở gốc kho được chép lên trang game (tools/check.mjs soát: trang HTML, CSS trỏ tới tệp nào thì tệp đó phải có ở đây)
export const TINH = ['index.html', 'privacy.html', 'terms.html', 'xoa-tai-khoan.html', 'legal.css', 'style.css', 'style-khung.css', 'style-ui-kit.css', 'style-ui-kit2.css', 'style-ui-kit3.css', 'style-ui-hoa-dao.css', 'style-ui-icon.css', 'style-ui-x.css', 'style-self.css', 'style-self2.css', 'style-hud-tren.css', 'style-man-dau.css', 'manifest.webmanifest', 'sw.js', 'robots.txt', 'sitemap.xml'];
const VAO = ['main.js', 'ui/man-dau.js'];   // tệp code index.html gọi thẳng

const rd = f => readFileSync(f, 'utf8'), wr = (f, s) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, s); };
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const kb = f => Math.round(statSync(f).size / 1024);

function timEsbuild() {
  if (process.env.GOI === '0') return null;
  const thu = [process.env.ESBUILD, join(ROOT, 'node_modules/.bin/esbuild'), '/opt/npm-tools/node_modules/esbuild/bin/esbuild'].filter(Boolean);
  for (const p of thu) if (existsSync(p)) return [p];
  try { execFileSync('npx', ['--no-install', 'esbuild', '--version'], { stdio: 'ignore' }); return ['npx', '--no-install', 'esbuild']; } catch { return null; }
}
const ES = timEsbuild();
const es = (args, opt = {}) => execFileSync(ES[0], [...ES.slice(1), ...args], { stdio: ['ignore', 'inherit', 'inherit'], ...opt });

rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
for (const f of TINH) cpSync(join(ROOT, f), join(OUT, f));
cpSync(join(ROOT, 'data'), join(OUT, 'data'), { recursive: true });
if (existsSync(join(ROOT, 'assets'))) cpSync(join(ROOT, 'assets'), join(OUT, 'assets'), { recursive: true });

// Dữ liệu một tệp
{
  const F = JSON.parse(rd(join(ROOT, 'src/core/data.js')).match(/const FILES = (\[[^\]]*\])/)[1].replace(/'/g, '"')), d = { maps: {} };
  for (const f of F) d[f] = JSON.parse(rd(join(ROOT, 'data', f + '.json')));
  for (const id of d.config.maps) d.maps[id] = JSON.parse(rd(join(ROOT, 'data/maps', id + '.json')));
  wr(join(OUT, 'data/_all.json'), JSON.stringify(d));
}

// Mã nguồn có số phiên bản (bản chép tạm, không đụng kho)
const TAM = join(OUT, '.tam'), SRC = join(TAM, 'src');
cpSync(join(ROOT, 'src'), SRC, { recursive: true });
{
  const f = join(SRC, 'core/build.js'), s = rd(f);
  if (!s.includes("export const BUILD = 'dev';")) throw new Error('src/core/build.js: không thấy dòng BUILD');
  wr(f, s.replace("export const BUILD = 'dev';", `export const BUILD = '${V}';`));
}

if (ES) {
  es([...VAO.map(f => join(SRC, f)), '--bundle', '--format=esm', '--splitting', `--outdir=${join(OUT, 'src')}`, `--outbase=${SRC}`, '--entry-names=[dir]/[name]', '--chunk-names=c/[name]-[hash]',
    '--minify-whitespace', '--minify-syntax', '--charset=utf8', '--legal-comments=eof', '--sourcemap', '--sources-content=false', '--log-level=warning']);
  for (const f of walk(join(SRC, 'ui')).filter(f => f.endsWith('.css'))) es([f, '--minify', '--charset=utf8', `--outfile=${join(OUT, 'src/ui', f.slice(join(SRC, 'ui').length + 1))}`, '--log-level=warning']);
  cpSync(join(SRC, 'vendor/mp4-muxer.LICENSE'), join(OUT, 'src/vendor/mp4-muxer.LICENSE'));
  // style.css nuốt các tệp @import; ảnh, phông trong url() giữ nguyên đường dẫn (cùng thư mục gốc)
  es([join(ROOT, 'style.css'), '--bundle', '--minify', '--charset=utf8', '--external:*.png', '--external:*.webp', '--external:*.jpg', '--external:*.gif', '--external:*.svg', '--external:*.woff2', '--external:*.woff', '--external:*.ttf', `--outfile=${join(OUT, 'style.css')}`, '--log-level=warning']);
  for (const f of TINH.filter(f => /^style-.*\.css$/.test(f) && f !== 'style-man-dau.css')) rmSync(join(OUT, f));   // đã nằm trong style.css
  for (const f of ['style-man-dau.css', 'legal.css']) es([join(ROOT, f), '--minify', '--charset=utf8', `--outfile=${join(OUT, f)}`, '--log-level=warning']);
} else {
  // Không gói: chép từng tệp, gắn ?v= vào mọi import và @import (như quy trình trước 20/11/2026)
  cpSync(SRC, join(OUT, 'src'), { recursive: true });
  for (const f of walk(join(OUT, 'src')).filter(f => f.endsWith('.js'))) wr(f, rd(f).replace(/((?:from\s+|import\()\s*['"])(\.{1,2}\/[^'"]+?\.js)(['"])/g, `$1$2?v=${V}$3`));
  wr(join(OUT, 'style.css'), rd(join(OUT, 'style.css')).replace(/(style-[a-z0-9-]+\.css)/g, `$1?v=${V}`));
}
rmSync(TAM, { recursive: true, force: true });

// index.html, sw.js: số phiên bản
{
  const f = join(OUT, 'index.html'); let s = rd(f);
  for (const [a, b] of [['src/main.js', `src/main.js?v=${V}`], ['style.css', `style.css?v=${V}`], ['style-man-dau.css', `style-man-dau.css?v=${V}`], ['src/ui/man-dau.js', `src/ui/man-dau.js?v=${V}`]]) {
    if (!s.includes(a)) throw new Error(`index.html: không thấy ${a}`);
    s = s.replace(a, b);
  }
  wr(f, s);
  const w = join(OUT, 'sw.js'), t = rd(w);
  if (!t.includes("const V = 'dev'")) throw new Error("sw.js: không thấy dòng const V = 'dev'");
  wr(w, t.replace("const V = 'dev'", `const V = '${V}'`));
}

const js = walk(join(OUT, 'src')).filter(f => f.endsWith('.js'));
console.log(`${ES ? 'đã gói' : 'KHÔNG gói (chép từng tệp)'} bản ${V} vào ${OUT}: ${js.length} tệp JS ${js.reduce((a, f) => a + kb(f), 0)} KB (tệp vào game ${kb(join(OUT, 'src/main.js'))} KB), dữ liệu gộp ${kb(join(OUT, 'data/_all.json'))} KB, style.css ${kb(join(OUT, 'style.css'))} KB`);
