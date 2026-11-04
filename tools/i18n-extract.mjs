// Gom mọi câu chữ tiếng Việt người chơi có thể thấy, làm khoá cho từ điển dịch data/i18n/<ngôn ngữ>.json.
// Nguồn: chữ trong data/*.json (bỏ khoá bắt đầu bằng "_" là ghi chú, bỏ ID, đường dẫn, màu), chuỗi có dấu tiếng Việt
// trong src/**/*.js (chuỗi mẫu `...${x}...` thành khoá có chỗ trống {x}), chữ tĩnh trong index.html.
// Chạy: node tools/i18n-extract.mjs            → in số câu
//       node tools/i18n-extract.mjs --list     → in từng câu (JSON) kèm nơi xuất hiện
//       node tools/i18n-extract.mjs --missing en → in các câu chưa dịch của một ngôn ngữ
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
// File không có chữ người chơi thấy (art.json: ghi chú hình do tools/art sinh ra)
export const SKIP_FILES = new Set(['art.json', 'sounds.json', 'portraits.json', 'light.json', 'tiles.json']);
const SKIP_KEYS = new Set(['id', 'file', 'icon', 'sprite', 'color', 'colors', 'font', 'css', 'rpc', 'url', 'src', 'img', 'tz', 'key', 'fn', 'cls', 'look', 'anim', 'sfx', 'music', 'note_art']);

function dataText(s) {
  if (!/\p{L}/u.test(s)) return false;
  if (/^(#|https?:|assets\/|data\/|src\/)/.test(s)) return false;
  if (/^[a-z0-9_\-./:]+$/.test(s)) return false;   // ID, đường dẫn
  if (VI.test(s)) return true;
  if (!/\s/.test(s)) return /^\p{Lu}\p{Ll}+[!?.]?$/u.test(s);   // một chữ viết hoa (tên); bỏ lưới bản đồ, mã ký tự
  return true;
}
const SKIP_PATHS = new Set(['data/social.json.bad', 'data/planets.json.soft']);   // social.bad: bộ lọc chửi bậy, giữ nguyên

function walkData(o, path, add) {
  if (typeof o === 'string') { if (dataText(o)) add(o, path); return; }
  if (Array.isArray(o)) { o.forEach((v, i) => walkData(v, `${path}[${i}]`, add)); return; }
  if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) {
    if ((k.startsWith('_') && (typeof v !== 'object' || Array.isArray(v))) || k.endsWith('_note') || SKIP_KEYS.has(k) || SKIP_PATHS.has(`${path}.${k}`)) continue;   // "_…" là ghi chú, trừ khối cấu hình như elements._reroot
    walkData(v, `${path}.${k}`, add);
  }
}

// ---- Đọc chuỗi trong JS (bộ tách từ tối giản: chú thích, chuỗi, chuỗi mẫu lồng nhau, biểu thức chính quy)
const ESC = { n: '\n', t: '\t', r: '', b: '', f: '', v: '', 0: '\0' };
function unescape(s) {
  return s.replace(/\\(u\{[0-9a-f]+\}|u[0-9a-f]{4}|x[0-9a-f]{2}|[\s\S])/gi, (m, c) => {
    if (/^u\{/i.test(c)) return String.fromCodePoint(parseInt(c.slice(2, -1), 16));
    if (/^[ux]/i.test(c) && c.length > 1) return String.fromCharCode(parseInt(c.slice(1), 16));
    if (c === '\n') return '';
    return ESC[c] ?? c;
  });
}
function phName(expr, used) {
  const m = expr.trim().match(/([A-Za-z_$][\w$]*)\s*(\(\))?\s*$/);
  let n = m && /^[\w$.?\s]+$/.test(expr.trim()) ? m[1] : 'x';
  if (!/^[a-z]\w*$/i.test(n)) n = 'x';
  let k = n, i = 2;
  while (used.has(k)) k = n + i++;
  used.add(k);
  return `{${k}}`;
}
// Tách một chuỗi (có thể có chỗ trống) thành các đoạn chữ nằm giữa thẻ HTML
function segments(s) {
  return s.split(/<[^>]+>/).map(x => x.replace(/&nbsp;/g, ' ').trim()).filter(Boolean);
}

export function jsStrings(code) {
  const out = [];
  let i = 0, prev = '';   // prev: ký tự có nghĩa gần nhất (đoán / là chia hay biểu thức chính quy)
  const n = code.length;
  function readQuoted(q) {
    let s = ''; i++;
    while (i < n && code[i] !== q) { if (code[i] === '\\') { s += code[i] + code[i + 1]; i += 2; } else s += code[i++]; }
    i++;
    return unescape(s);
  }
  function readTemplate() {   // trả về chuỗi có chỗ trống {x}
    i++; let s = ''; const used = new Set();
    while (i < n && code[i] !== '`') {
      if (code[i] === '\\') { s += unescape(code[i] + code[i + 1]); i += 2; continue; }
      if (code[i] === '$' && code[i + 1] === '{') {
        i += 2; const start = i; let depth = 1;
        while (i < n && depth) {
          const c = code[i];
          if (c === '{') { depth++; i++; } else if (c === '}') { depth--; i++; }
          else if (c === "'" || c === '"') { const v = readQuoted(c); out.push(v); }
          else if (c === '`') { const v = readTemplate(); out.push(v); }
          else i++;
        }
        const expr = code.slice(start, i - 1);
        if (!s.endsWith('}') || !/\{\w+\}$/.test(s)) s += phName(expr, used);   // hai chỗ trống liền nhau gộp làm một
        continue;
      }
      s += code[i++];
    }
    i++;
    return s;
  }
  while (i < n) {
    const c = code[i];
    if (c === '/' && code[i + 1] === '/') { while (i < n && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') { i = code.indexOf('*/', i + 2); i = i < 0 ? n : i + 2; continue; }
    if (c === "'" || c === '"') { out.push(readQuoted(c)); prev = 'a'; continue; }
    if (c === '`') { out.push(readTemplate()); prev = 'a'; continue; }
    if (c === '/' && (/[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || prev === '' || /\b(return|typeof|case|in|of)$/.test(code.slice(Math.max(0, i - 8), i).trimEnd()))) {
      i++; let cls = false;   // biểu thức chính quy
      while (i < n) { const d = code[i]; if (d === '\\') { i += 2; continue; } if (d === '[') cls = true; else if (d === ']') cls = false; else if (d === '/' && !cls) break; else if (d === '\n') break; i++; }
      i++; while (/[a-z]/i.test(code[i] || '')) i++;
      prev = 'a'; continue;
    }
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out;
}

function walkFiles(dir, ext, list = []) {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) walkFiles(p, ext, list); else if (p.endsWith(ext)) list.push(p);
  }
  return list;
}

export function collect(root = '.') {
  const map = new Map();
  const add = (s, where) => { if (!map.has(s)) map.set(s, []); const w = map.get(s); if (w.length < 3) w.push(where); };
  const dataFiles = readdirSync(join(root, 'data')).filter(f => f.endsWith('.json') && !SKIP_FILES.has(f)).map(f => `data/${f}`)
    .concat(readdirSync(join(root, 'data/maps')).filter(f => f.endsWith('.json')).map(f => `data/maps/${f}`));
  for (const f of dataFiles) walkData(JSON.parse(readFileSync(join(root, f), 'utf8')), f, add);
  for (const f of walkFiles(join(root, 'src'), '.js')) {
    const rel = f.replace(/\\/g, '/').replace(/^\.\//, '');
    if (rel.startsWith('src/net/client') || rel === 'src/core/i18n.js') continue;   // tên ngôn ngữ giữ nguyên chữ của nó
    const code = readFileSync(f, 'utf8');
    for (const s of jsStrings(code)) {
      if (!VI.test(s)) continue;
      for (const seg of segments(s)) if (VI.test(seg)) add(seg, rel);
    }
  }
  const html = readFileSync(join(root, 'index.html'), 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  for (const m of html.matchAll(/>([^<>]+)</g)) { const s = m[1].trim(); if (s && /\p{L}/u.test(s)) add(s, 'index.html'); }
  for (const m of html.matchAll(/(?:placeholder|aria-label|title)="([^"]+)"/g)) add(m[1], 'index.html');
  return map;
}

export const PH = s => (s.match(/\{\w+\}/g) || []).sort().join(',');

if (import.meta.url === `file://${process.argv[1]}`) {
  const map = collect('.');
  const arg = process.argv[2];
  if (arg === '--list') console.log(JSON.stringify([...map].map(([k, w]) => ({ k, w })), null, 1));
  else if (arg === '--missing') {
    const d = JSON.parse(readFileSync(`data/i18n/${process.argv[3]}.json`, 'utf8'));
    console.log(JSON.stringify([...map.keys()].filter(k => !d[k]), null, 1));
  } else console.log(`${map.size} câu cần dịch`);
}
