// Tờ khai màn mừng (src/ui/mung.js) cho các việc rèn trong bảng Trang bị. Số, chữ: data/juice.json → mung.
//   Tấm chi tiết món đồ (bag-detail.js gọi sau khi máy chủ báo thành công): cường hoá lên +N, tẩy luyện mở dòng mới, luyện pháp bảo lên ★N.
//   Tấm chi tiết pháp bảo (self-pb-page.js): nâng cấp lên +N, đục ô thành công.
import { statText } from '../game/items.js';
import { lineText } from './hc-text.js';
import { tierOf, quality } from '../game/tiers.js';

const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const icoUrl = (data, it) => { const A = data.art.sprites, s = A['ui.vk-' + it.base] || A['ui.ic-' + data.items.bases[it.base]?.slot]; return s ? `url("${s.file}?v=${s.v}")` : ''; };
const val = (data, s, v) => `${(v || 0).toLocaleString('vi-VN')}${data.items.stats[s]?.pct ? '%' : ''}`;
const at = (list, i) => list[Math.max(0, Math.min(list.length - 1, i))] || 0;
const tiers = data => data.items.line_tiers.list;

// Cường hoá vừa lên +N. m0 / m1: chỉ số chính trước / sau (mainStats của bag-detail.js); gain: lực chiến tăng (0 khi món không đang mặc).
// Cấp càng cao càng khó lên nên diễn càng lớn (mung.lvl_plus); cứ mỗi big_every cấp là một mốc, dải chữ đổi thành "Cường hóa +N!"
export function mungEnhance(game, it, m0, m1, gain) {
  const data = game.data, C = data.juice.mung, X = C.text, n = it.plus || 0;
  return { kind: 'enhance', fx: 'lua', lvl: at(C.lvl_plus, n - 1), ray: C.ray.enhance, ico: icoUrl(data, it), badge: '+' + n, gain,
    title: n % C.big_every === 0 ? fill(X.enhance_big, { n }) : X.enhance,
    lines: Object.keys(m1).filter(s => m1[s] !== m0[s]).map(s => ({ label: data.items.stats[s].name, from: val(data, s, m0[s]), to: val(data, s, m1[s]) })) };
}

// Tẩy luyện vừa mở một dòng mới. res: { line, last } của kyReroll; q0: phẩm của món trước khi tẩy (quality). Vầng sáng và bụi sao theo màu dòng mới;
// dòng màu cao diễn lớn hơn (mung.lvl_tier), dòng cuối của món lớn thêm một nấc. Phẩm món lên thì báo; phẩm tụt (dòng mới màu thấp) thì không nhắc.
export function mungReroll(game, it, res, q0, gain) {
  const data = game.data, C = data.juice.mung, X = C.text, t = tierOf(data, res.line.t), up = at(C.lvl_tier, res.line.t), q1 = quality(data, it), L = tiers(data);
  const lines = [{ text: '◆ ' + lineText(data, res.line), color: t.edge ? '#ffd6d6' : t.color, big: true }];
  if (q0 && q1 && L.indexOf(q1) > L.indexOf(q0)) lines.push({ text: fill(X.quality, { a: q0.name, b: q1.name }), color: q1.edge ? '#ffd6d6' : q1.color });
  if (res.last) lines.push({ text: fill(X.last, { n: it.lines.length }) });
  return { kind: 'reroll', fx: 'sao', lvl: Math.min(3, up + (res.last ? 1 : 0)), ray: t.edge || t.color, ico: icoUrl(data, it), gain, lines,
    title: up >= 1 ? fill(X.reroll_big, { tier: t.name }) : X.reroll };
}

// Luyện pháp bảo vừa lên ★N
export function mungRefine(game, it, gain) {
  const C = game.data.juice.mung, n = it.pb || 0;
  return { kind: 'refine', fx: 'lua', lvl: at(C.lvl_star, n - 1), ray: C.ray.refine, ico: icoUrl(game.data, it), badge: '★' + n, title: C.text.refine, lines: [], gain };
}

// Pháp bảo vừa nâng cấp lên +N (nút Nâng cấp, không bao giờ hỏng). T, g: loại và phẩm của món; ico: hình món (chuỗi nền CSS); s0 / s1: chỉ số gốc của món
// trước / sau đã ghi thành chữ ({ 'Công': '+4%' }); cap: cấp tối đa ở cảnh giới này. Người chơi hay bấm liền nhiều cấp nên cấp thường diễn nhỏ nhất
// (lvl 0); cứ mỗi big_every cấp là một mốc: lớn hơn một nấc, dải chữ nêu tên món; chạm cấp tối đa lớn thêm nấc nữa. Vầng sáng theo màu phẩm của món.
// Tiếng búa do pbUpgrade tự phát (quiet.hit).
export function mungPbUp(game, it, T, g, ico, s0, s1, gain, cap) {
  const C = game.data.juice.mung, X = C.text, n = it.lv || 0, big = n % C.big_every === 0;
  return { kind: 'pbup', fx: 'lua', quiet: { hit: true }, lvl: (big ? 1 : 0) + (n >= cap ? 1 : 0), ray: g.color, ico, badge: '+' + n, gain,
    title: big ? fill(X.pbup_big, { name: T.name, n }) : X.pbup,
    lines: Object.keys(s1).filter(k => s1[k] !== s0[k]).map(k => ({ label: k, from: s0[k], to: s1[k] })) };
}

// Đục ô thành công: thêm một ô khảm. Việc may rủi (50% / 25% / 10%) nên ô càng về sau diễn càng lớn (mung.lvl_slot theo số ô vừa có). Bụi sao màu phẩm.
// Tiếng mừng do pbDrill tự phát (quiet).
export function mungPbDrill(game, it, g, ico) {
  const C = game.data.juice.mung, X = C.text, n = it.slots;
  return { kind: 'drill', fx: 'sao', quiet: { hit: true, burst: true }, lvl: at(C.lvl_slot, n - 1), ray: g.color, ico, badge: '◆' + n, title: X.drill, gain: 0,
    lines: [{ label: X.slots, from: String(n - 1), to: String(n) }] };
}
