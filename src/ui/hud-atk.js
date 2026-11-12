// Nút đánh thường mang hình bản mệnh pháp bảo đang dùng (chủ dự án 12/11/2026 03:23: vũ khí đổi tên thành bản mệnh pháp bảo,
// không còn chữ "Đánh", hình nút là hình món đang mặc ở ô vu-khi). Món chưa có hình riêng (ui-vk-<món>) thì biểu tượng loại ô; chưa mặc gì giữ chữ.
let last = null;
export function atkIcon(game) {
  const { data, save } = game, b = document.getElementById('btn-atk');
  const it = save?.bag?.find(i => i.uid === save.equip?.['vu-khi']), key = it?.base || '';
  if (!b || key === last) return;
  last = key;
  const S = data.art.sprites, spr = it && (S['ui.vk-' + it.base] || S['ui.ic-vu-khi']);
  let i = b.querySelector('.atk-ico');
  if (!i) { i = document.createElement('i'); i.className = 'atk-ico'; b.prepend(i); }
  i.style.backgroundImage = spr ? `url("${spr.file}?v=${spr.v}")` : '';
  b.classList.toggle('has-ico', !!spr);
  b.title = it ? (data.items.slots['vu-khi'] + ': ' + (it.name || data.items.bases[it.base]?.name || '')) : '';
}
