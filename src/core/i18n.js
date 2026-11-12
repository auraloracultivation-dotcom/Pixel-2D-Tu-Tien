// Đa ngôn ngữ (chủ dự án 05/11/2026: "thêm tiếng trung phồn thể và tiếng anh"). Tiếng Việt là gốc: mọi câu chữ vẫn viết tiếng
// Việt trong data/ và code; từ điển data/i18n/<ngôn ngữ>.json ghi { "<câu tiếng Việt y nguyên>": "<bản dịch>" }, giữ chỗ trống {n}.
// Chọn tiếng Việt thì file này không làm gì (không tải từ điển, không đổi chữ nào). Ngôn ngữ khác:
//  1. translateData: dịch chữ trong data/ ngay khi nạp (src/core/data.js), so khớp nguyên câu.
//  2. Chữ code đặt vào trang (textContent, innerHTML, placeholder, title, aria-label) và chữ tĩnh index.html: một MutationObserver
//     đổi nút chữ trùng nguyên câu trong từ điển; câu ghép từ chuỗi mẫu `...${x}...` khớp theo khuôn có chỗ trống ({x} lấy lại giá trị).
//  3. Chữ vẽ lên canvas (fillText, strokeText, measureText) và alert / confirm / prompt đi qua cùng bộ dịch.
//  4. Chỗ nào ghép chữ kiểu khác (cộng chuỗi): gọi t('câu {n}', { n }) ngay tại chỗ.
// Đổi ngôn ngữ: setLang() ghi máy rồi tải lại trang. Ngôn ngữ chưa dịch câu nào thì giữ tiếng Việt.
export const LANGS = [{ id: 'vi', name: 'Tiếng Việt' }, { id: 'en', name: 'English' }, { id: 'zh-Hant', name: '繁體中文' }];
const KEY = 'p2d_lang';
const VI = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;

function pick() {
  if (typeof navigator === 'undefined') return 'vi';   // chạy ngoài trình duyệt (công cụ Node)
  let saved = null;
  try { saved = localStorage.getItem(KEY); } catch { /* chế độ riêng tư */ }
  if (LANGS.some(l => l.id === saved)) return saved;
  // Người chơi cũ (đã có bản lưu trên máy) hoặc máy ở giờ Việt Nam: giữ tiếng Việt dù máy đặt tiếng Anh; đổi được trong Menu
  try { for (let i = 0; i < localStorage.length; i++) if (localStorage.key(i)?.startsWith('p2d.save')) return 'vi'; } catch { /* chế độ riêng tư */ }
  const nav = (navigator.languages?.[0] || navigator.language || '').toLowerCase();
  if (nav.startsWith('zh')) return 'zh-Hant';
  try { if (/^Asia\/(Ho_Chi_Minh|Saigon)$/.test(Intl.DateTimeFormat().resolvedOptions().timeZone)) return 'vi'; } catch { /* trình duyệt cũ */ }
  if (nav.startsWith('en')) return 'en';
  return 'vi';
}
export const lang = pick();
export const isVi = lang === 'vi';
if (typeof document !== 'undefined') document.documentElement.lang = lang;

const dict = new Map(), back = new Map(), pats = [], cache = new Map();
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function compile(k, v) {
  const names = [], parts = k.split(/\{(\w+)\}/);
  let re = '';
  parts.forEach((p, i) => { if (i % 2) { names.push(p); re += '([\\s\\S]*?)'; } else re += esc(p); });
  if (!/\p{L}/u.test(parts.filter((_, i) => !(i % 2)).join(''))) return;   // khuôn toàn chỗ trống: bỏ
  pats.push({ re: new RegExp(`^${re}$`), names, v });
}

async function load() {
  try {
    const v = new URL(import.meta.url).searchParams.get('v') || 'dev';   // số phiên bản do quy trình đưa lên mạng gắn vào
    const r = await fetch(`data/i18n/${lang}.json?v=${v}`, { cache: 'no-cache' });
    const d = await r.json();
    for (const [k, v] of Object.entries(d)) {
      if (k.startsWith('_') || typeof v !== 'string' || !v) continue;
      const lead = /^[✓▸•·]\s*/, pairs = [[k, v]];
      if (lead.test(k)) pairs.push([k.replace(lead, ''), v.replace(lead, '')]);   // code hay tách dấu đầu dòng ra phần tử riêng
      for (const [a, b] of pairs) {
        if (dict.has(a)) continue;
        dict.set(a, b); back.set(b, a);
        if (/\{\w+\}/.test(a)) compile(a, b);
      }
    }
    pats.sort((a, b) => b.re.source.length - a.re.source.length);   // khuôn dài (cụ thể) thử trước
  } catch { /* thiếu từ điển: giữ tiếng Việt */ }
  if (!dict.size) return;
  document.title = tr(document.title);
  langCss();
  watchDom(); patchCanvas(); patchDialogs();
}
export const ready = isVi ? Promise.resolve() : load();

const fill = (s, vars) => vars ? s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m)) : s;
// Dịch một câu tiếng Việt (có thể có chỗ trống), rồi điền giá trị
export function t(vi, vars) { return fill(dict.get(vi) || vi, vars); }
// Câu gốc tiếng Việt của một chữ đã dịch (code cần so chữ gốc, ví dụ lọc câu có "đạo lữ")
export function srcOf(s) { return back.get(s) || s; }
export function setLang(id) {
  try { localStorage.setItem(KEY, id); } catch { /* chế độ riêng tư */ }
  location.reload();
}

// Dịch chữ hiển thị bất kỳ: khớp nguyên câu, rồi khớp khuôn (giá trị trong chỗ trống dịch tiếp một lớp)
function exact(s, ui) {
  const v = dict.get(s);
  if (!v) return null;
  if (ui && !/\s/.test(s) && !VI.test(s)) return null;   // một chữ không dấu (Linh, Kim, Nam…): dễ trùng tên người chơi, chỉ dịch trong data
  return v;
}
function tr(s, ui = true, depth = 0) {
  if (!s || typeof s !== 'string' || !dict.size) return s;
  const m = s.match(/^(\s*)([\s\S]*?)(\s*)$/), core = m[2];
  if (!core) return s;
  const hit = exact(core, ui);
  if (hit) return m[1] + hit + m[3];
  if (!VI.test(core) || depth > 2) return s;
  if (cache.has(core)) { const c = cache.get(core); return c === core ? s : m[1] + c + m[3]; }
  let out = core;
  for (const p of pats) {
    const g = core.match(p.re);
    if (!g) continue;
    const vars = {};
    p.names.forEach((n, i) => { vars[n] = tr(g[i + 1], false, depth + 1); });
    out = fill(p.v, vars);
    break;
  }
  if (out === core) {   // ký hiệu dính đầu / cuối (⇅ Mới nhặt, Túi đồ ▾): dịch phần chữ, giữ ký hiệu
    const s2 = core.match(/^([^\p{L}\p{N}{]*)([\s\S]*?\p{L}[\s\S]*?)([^\p{L}\p{N}}]*)$/u);
    if (s2 && (s2[1] || s2[3])) { const mid = tr(s2[2], ui, depth + 1); if (mid !== s2[2]) out = s2[1] + mid + s2[3]; }
  }
  if (out === core && core.includes(', ')) {   // danh sách ghép bằng dấu phẩy (quà nhận: "3 Tẩy Luyện Thạch, 2 Bí Kíp Chiêu"): dịch từng phần
    const parts = core.split(', '), done = parts.map(x => tr(x, false, depth + 1));
    if (done.some((x, i) => x !== parts[i])) out = done.join(lang === 'zh-Hant' ? '、' : ', ');
  }
  if (cache.size > 4000) cache.clear();
  cache.set(core, out);
  return out === core ? s : m[1] + out + m[3];
}
export { tr };

// 1. Dữ liệu: đổi chữ trùng nguyên câu, bỏ khoá ghi chú "_…"
const SKIP_TOP = new Set(['art', 'sounds', 'tieng-chieu', 'portraits', 'light', 'tiles']);
export function translateData(data) {
  if (isVi || !dict.size) return data;
  const walk = o => {
    if (Array.isArray(o)) { for (let i = 0; i < o.length; i++) { const v = o[i]; if (typeof v === 'string') { const d = dict.get(v); if (d) o[i] = d; } else if (v && typeof v === 'object') walk(v); } return; }
    for (const k of Object.keys(o)) {
      const v = o[k];
      if ((k.startsWith('_') && typeof v !== 'object') || k === 'bad') continue;   // "_…" là ghi chú, trừ khối như elements._reroot
      if (typeof v === 'string') { const d = dict.get(v); if (d) o[k] = d; } else if (v && typeof v === 'object') walk(v);
    }
  };
  for (const [k, v] of Object.entries(data)) if (!SKIP_TOP.has(k) && v && typeof v === 'object') walk(v);
  return data;
}

// 2. Trang: đổi chữ khi code đặt vào
const ATTRS = ['placeholder', 'title', 'aria-label'];
// Bỏ qua: chỗ nhập chữ, tên ngôn ngữ (translate="no"), tin chat của người chơi (tên người, lời nói giữ nguyên)
const skipEl = e => !e || /^(SCRIPT|STYLE|TEXTAREA|INPUT)$/.test(e.tagName) || e.closest?.('[translate="no"], .chat-msg, .cd-line, #social-log .me');
function fixText(n) {
  if (skipEl(n.parentElement)) return;
  const v = tr(n.data);
  if (v !== n.data) n.data = v;
}
function fixAttrs(e) {
  for (const a of ATTRS) { const v = e.getAttribute?.(a); if (v) { const w = tr(v); if (w !== v) e.setAttribute(a, w); } }
}
function fixTree(root) {
  if (root.nodeType === 3) { fixText(root); return; }
  if (root.nodeType !== 1 || skipEl(root)) return;
  fixAttrs(root);
  const it = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = it.nextNode(); n; n = it.nextNode()) n.nodeType === 3 ? fixText(n) : fixAttrs(n);
}
function watchDom() {
  fixTree(document.body || document.documentElement);
  new MutationObserver(list => {
    for (const m of list) {
      if (m.type === 'characterData') fixText(m.target);
      else if (m.type === 'attributes') fixAttrs(m.target);
      else for (const n of m.addedNodes) fixTree(n);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}

// 3. Canvas và hộp hỏi của trình duyệt
function patchCanvas() {
  for (const C of [globalThis.CanvasRenderingContext2D, globalThis.OffscreenCanvasRenderingContext2D]) {
    if (!C) continue;
    for (const f of ['fillText', 'strokeText', 'measureText']) {
      const o = C.prototype[f];
      C.prototype[f] = function (s, ...a) { return o.call(this, typeof s === 'string' ? tr(s) : s, ...a); };
    }
  }
}
function patchDialogs() {
  for (const f of ['alert', 'confirm', 'prompt']) {
    const o = window[f];
    window[f] = (s, ...a) => o.call(window, typeof s === 'string' ? tr(s) : s, ...a);
  }
}

// CSS cho ngôn ngữ khác: chữ Hán lấy phông hệ thống (Unifont VN chỉ có chữ Latinh, không thêm file phông nặng);
// chữ do CSS sinh ra (content) không đi qua MutationObserver nên dịch ở đây.
function langCss() {
  const st = document.createElement('style');
  let css = `body[data-le="halloween"] #menu .sub::after { content: ' · ${t('Lễ Hội Bí Ngô')}'; }`;
  if (lang === 'zh-Hant') css += ' :root:lang(zh-Hant) * { font-family: "Unifont VN", "PingFang TC", "Noto Sans TC", "Noto Sans CJK TC", "Microsoft JhengHei", system-ui, sans-serif !important; }';
  st.textContent = css;
  document.head.append(st);
}
