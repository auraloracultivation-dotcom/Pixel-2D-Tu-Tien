// Ô trang bị trên bảng Nhân vật (src/ui/self-panel.js; chủ dự án 11/11/2026 00:39, mẫu My Heroes Dungeon Raid):
// khung ảnh theo phẩm, hình món ở giữa, +cường hoá góc trên phải, số dòng tẩy luyện và chữ hệ góc dưới phải; mép trái là cột ngọc
// khảm xếp dọc (chủ dự án 11/11/2026 01:57, theo mẫu): mỗi lỗ một viên đá, có ngọc thì viên đá màu của ngọc (ui-pc-da-*), trống thì đá tối.
import { el, icon } from './bag-detail.js';
import { rarityOf, gemInfo } from '../game/items.js';
import { quality } from '../game/tiers.js';
import { spriteIcon } from './sprite-icon.js';


// Mã phẩm cho khung ảnh [data-o] (style-ui-hoa-dao.css: ui-pc-luc / lam / tim / cam / vang / do / den), như Túi đồ
export const gradeId = (data, it) => quality(data, it)?.id || rarityOf(data.items, it.rarity).id;

// Màu khung theo phẩm: phẩm dòng tẩy luyện nếu có, không thì phẩm hiếm của món
export function gradeColor(data, it) {
  const q = quality(data, it);
  return q ? (q.edge || q.color) : rarityOf(data.items, it.rarity).color;
}

// Viên đá theo loại ngọc (assets/art/ui-pc-da-<màu>.png); lỗ trống dùng viên đá tối
const DA = { 'hong-ngoc': 'do', 'lam-ngoc': 'lam', 'hoang-ngoc': 'vang', 'luc-ngoc': 'luc' };
const daUrl = (data, c) => { const s = data.art.sprites['ui.pc-da-' + c]; return s ? `url("${s.file}?v=${s.v}")` : 'none'; };

// Cột ngọc khảm dọc mép trái ô đồ (cả ô đang mặc lẫn ô trong kho); null nếu món không có lỗ
export function socketCol(game, it) {
  if (!it?.sockets?.length) return null;
  const col = el('div', 'sv-gems'), d = game.data;
  for (const g of it.sockets) {
    const gm = el('i', 'sv-gm' + (g ? '' : ' off'));
    if (g) { const gi = gemInfo(d, g); gm.style.backgroundImage = daUrl(d, DA[g.split(':')[0]] || 'tim'); gm.title = gi.name; }
    else { const s = d.art.sprites['ui.nv-lo-kham']; gm.style.backgroundImage = s ? `url("${s.file}?v=${s.v}")` : daUrl(d, 'den'); }   // lỗ khảm trống (ảnh GPT)
    col.append(gm);
  }
  return col;
}

// Ô một món đang mặc (hoặc ô trống của chỗ đó), cột ngọc khảm dọc mép trái
export function gearCell(game, slot, side, onPick) {
  const { data, save } = game, it = save.bag.find(i => i.uid === save.equip[slot]);
  const wrap = el('div', 'sv-cell'), b = el('button', 'sv-slot' + (it ? '' : ' empty'));
  b.setAttribute('aria-label', data.items.slots[slot]);
  if (!it) {   // ô trống: hình chờ bóng mờ đúng chỗ mặc (ảnh GPT 11/11/2026), chưa có hình thì biểu tượng loại món như cũ
    const sp = data.art.sprites['ui.nv-cho-' + slot], ico = sp ? el('i', 'ico cho') : icon(data, { base: Object.keys(data.items.bases).find(k => data.items.bases[k].slot === slot) });
    if (sp) ico.style.setProperty('--ic', `url("${sp.file}?v=${sp.v}")`);
    b.append(ico, el('span', 'sv-name', data.items.slots[slot]));
  } else {
    b.style.setProperty('--q', gradeColor(data, it)); b.dataset.o = gradeId(data, it);
    b.append(icon(data, it));
    if (it.plus) b.append(el('b', 'sv-plus', '+' + it.plus));
    const br = el('span', 'sv-br');   // góc dưới phải: số dòng tẩy luyện, chữ hệ
    if (it.lines?.length) br.append(el('span', 'sv-ln', '◆' + it.lines.length));
    if (it.el) { const e = uiIco(data, 'ui.nv-' + it.el, 'sv-el'); e.title = data.elements[it.el]?.name || ''; br.append(e); }   // huy hiệu ngũ hành
    b.append(br);
    const gems = socketCol(game, it); if (gems) b.append(gems);
  }
  b.onclick = () => onPick(slot, it);
  wrap.append(b);
  return wrap;
}

// Ô thứ cộng sức mạnh dưới nhân vật (chủ dự án 11/11/2026 01:07: linh thú, khôi lỗi, thú cưỡi, cái gì buff sức mạnh thì một ô,
// chừa một ô cho tính năng sau). kind: 'pet' | 'comp' | 'comp2' | 'mount' | 'spare'. Chạm: mở bảng của nó.
const BUFF = { pet: ['Linh thú', 'ui.nv-cho-linh-thu'], comp: ['Khôi lỗi', 'ui.nv-cho-khoi-loi'], comp2: ['Khôi lỗi', 'ui.nv-cho-khoi-loi'], mount: ['Thú cưỡi', 'ui.nv-cho-thu-cuoi'], spare: ['Sắp mở', 'ui.nv-cho-khoa'] };   // chưa có: hình chờ bóng mờ
// Biểu tượng ảnh có sẵn (data/art.json ui.*), làm nền một thẻ i
export function uiIco(data, key, cls = 'sv-uico') {
  const spr = data.art.sprites[key], i = el('i', cls);
  if (spr) i.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`;
  return i;
}
// Ô thú: to bằng ô trang bị hai bên (chủ dự án 11/11/2026 20:50), khung phẩm theo màu các dòng tẩy luyện như trang bị, góc trên phải
// cấp, góc dưới trái sao, góc dưới phải số dòng tẩy luyện. Thú cưỡi: không cấp, sao; một dòng % (save.mountLine).
export function buffCell(game, kind, onOpen) {
  const { data, save } = game, [nm, han] = BUFF[kind], b = el('button', 'sv-slot buff' + (kind === 'spare' ? ' spare' : ''));
  const id = kind === 'pet' ? save.pet : kind === 'mount' ? save.mount : kind === 'comp' ? save.companion : kind === 'comp2' ? save.companion2 : null;
  const spr = id && [kind === 'pet' ? 'pet.' + id : kind === 'mount' ? 'mount.' + id : 'comp.' + id, 'npc.' + id].find(k => data.art.sprites[k]);
  b.setAttribute('aria-label', nm);
  if (spr) {
    const st = kind === 'pet' ? save.pets?.[id] : kind === 'mount' ? null : save.comps?.[id];
    const lines = kind === 'mount' ? [save.mountLine?.[id]].filter(l => l?.s) : st?.lines || [], q = quality(data, { lines });
    b.dataset.o = q?.id || 'pham'; b.style.setProperty('--q', q ? (q.edge || q.color) : '#9a7ad8');
    b.append(el('i', 'sv-bfr'), spriteIcon(game, spr, 0, 34, 'sv-spr', true));
    if (st?.lv) b.append(el('b', 'sv-plus', 'c' + st.lv));
    if (st?.star) b.append(el('span', 'sv-star', '★' + st.star));
    if (lines.length) { const br = el('span', 'sv-br'); br.append(el('span', 'sv-ln', '◆' + lines.length)); b.append(br); }
    if (st?.evo) b.classList.add('evo');
    b.title = `${nm}${st?.lv ? ' · cấp ' + st.lv : ''}${st?.star ? ' · ★' + st.star : ''}${lines.length ? ' · ' + lines.length + ' dòng' : ''}`;
  } else { b.append(uiIco(data, han)); b.title = nm; }
  if (kind === 'spare') b.disabled = true; else b.onclick = () => onOpen(kind);
  return b;
}
