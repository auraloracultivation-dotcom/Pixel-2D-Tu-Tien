// Ô trang bị trên bảng Nhân vật (src/ui/self-panel.js; chủ dự án 11/11/2026 00:39, mẫu My Heroes Dungeon Raid):
// khung ảnh theo phẩm, hình món ở giữa, +cường hoá góc trên phải, số dòng tẩy luyện và chữ hệ góc dưới phải; mép trái là cột ngọc
// khảm xếp dọc (chủ dự án 11/11/2026 01:57, theo mẫu): mỗi lỗ một viên đá, có ngọc thì viên đá màu của ngọc (ui-pc-da-*), trống thì đá tối.
import { el, icon } from './bag-detail.js';
import { rarityOf, gemInfo } from '../game/items.js';
import { quality } from '../game/tiers.js';
import { spriteIcon } from './sprite-icon.js';

const HAN = { kim: '金', moc: '木', thuy: '水', hoa: '火', tho: '土' };   // chữ hệ trên ô (ngũ hành)

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
    else gm.style.backgroundImage = daUrl(d, 'den');
    col.append(gm);
  }
  return col;
}

// Ô một món đang mặc (hoặc ô trống của chỗ đó), cột ngọc khảm dọc mép trái
export function gearCell(game, slot, side, onPick) {
  const { data, save } = game, it = save.bag.find(i => i.uid === save.equip[slot]);
  const wrap = el('div', 'sv-cell'), b = el('button', 'sv-slot' + (it ? '' : ' empty'));
  b.setAttribute('aria-label', data.items.slots[slot]);
  if (!it) {
    const ico = icon(data, { base: Object.keys(data.items.bases).find(k => data.items.bases[k].slot === slot) });
    b.append(ico, el('span', 'sv-name', data.items.slots[slot]));
  } else {
    b.style.setProperty('--q', gradeColor(data, it)); b.dataset.o = gradeId(data, it);
    b.append(icon(data, it));
    if (it.plus) b.append(el('b', 'sv-plus', '+' + it.plus));
    const br = el('span', 'sv-br');   // góc dưới phải: số dòng tẩy luyện, chữ hệ
    if (it.lines?.length) br.append(el('span', 'sv-ln', '◆' + it.lines.length));
    if (it.el) { const e = el('span', 'sv-el', HAN[it.el] || '?'); e.style.setProperty('--e', data.elements[it.el]?.color || '#ccc'); br.append(e); }
    b.append(br);
    const gems = socketCol(game, it); if (gems) b.append(gems);
  }
  b.onclick = () => onPick(slot, it);
  wrap.append(b);
  return wrap;
}

// Ô thứ cộng sức mạnh dưới nhân vật (chủ dự án 11/11/2026 01:07: linh thú, khôi lỗi, thú cưỡi, cái gì buff sức mạnh thì một ô,
// chừa một ô cho tính năng sau). kind: 'pet' | 'comp' | 'comp2' | 'mount' | 'spare'. Chạm: mở bảng của nó.
const BUFF = { pet: ['Linh thú', 'ui.ic-linh-thu'], comp: ['Khôi lỗi', 'ui.ic-dao-lu'], comp2: ['Khôi lỗi', 'ui.ic-dao-lu'], mount: ['Thú cưỡi', 'ui.ic-thu-cuoi'], spare: ['Sắp mở', 'ui.ic-khoa'] };
// Biểu tượng ảnh có sẵn (data/art.json ui.*), làm nền một thẻ i
export function uiIco(data, key, cls = 'sv-uico') {
  const spr = data.art.sprites[key], i = el('i', cls);
  if (spr) i.style.backgroundImage = `url("${spr.file}?v=${spr.v}")`;
  return i;
}
export function buffCell(game, kind, onOpen) {
  const { data, save } = game, [nm, han] = BUFF[kind], b = el('button', 'sv-slot buff' + (kind === 'spare' ? ' spare' : ''));
  const id = kind === 'pet' ? save.pet : kind === 'mount' ? save.mount : kind === 'comp' ? save.companion : kind === 'comp2' ? save.companion2 : null;
  const spr = id && [kind === 'pet' ? 'pet.' + id : kind === 'mount' ? 'mount.' + id : 'comp.' + id, 'npc.' + id].find(k => data.art.sprites[k]);
  b.setAttribute('aria-label', nm);
  if (spr) { b.style.setProperty('--q', '#9a7ad8'); b.append(spriteIcon(game, spr, 0, 34, 'sv-spr', true)); }
  else b.append(uiIco(data, han));
  if (kind === 'spare') b.disabled = true; else b.onclick = () => onOpen(kind);
  b.title = nm;
  return b;
}
