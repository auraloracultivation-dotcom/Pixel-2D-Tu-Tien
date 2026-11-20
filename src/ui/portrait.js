// Chân dung NPC phía trên hộp thoại (data/portraits.json). Không sửa dialog.js: theo dõi tên người nói (#dlg-who),
// tên trùng NPC có chân dung thì hiện ảnh, không thì ẩn. Ảnh pixel phóng nguyên lần, không làm mịn.
import { goc } from '../core/build.js';
const base = name => String(name || '').replace(/\s*\(.*\)\s*$/, '').trim().toLowerCase();

export async function createPortraits(game) {
  const box = document.getElementById('dialog'), who = document.getElementById('dlg-who');
  if (!box || !who) return;
  let cfg;
  try { const r = await fetch(goc('data/portraits.json'), { cache: 'no-cache' }); cfg = await r.json(); }
  catch { return; }
  const byName = new Map();
  for (const id of cfg.list || []) { const n = game.data.npcs?.[id]?.name; if (n) byName.set(base(n), id); }

  const l = document.createElement('link');
  l.rel = 'stylesheet'; l.href = goc('src/ui/portrait.css');
  document.head.append(l);
  const img = document.createElement('img');
  img.className = 'npc-portrait'; img.alt = ''; img.hidden = true; img.decoding = 'async';
  img.onload = () => { img.style.width = img.naturalWidth * cfg.scale + 'px'; img.style.height = img.naturalHeight * cfg.scale + 'px'; };
  box.prepend(img);

  const sync = () => {
    const id = !box.hidden && byName.get(base(who.textContent));
    if (!id) { img.hidden = true; return; }
    const src = goc(`assets/art/portraits/${id}.png`);
    if (img.src !== src) img.src = src;
    img.hidden = false;
  };
  new MutationObserver(sync).observe(who, { childList: true, characterData: true, subtree: true });
  new MutationObserver(sync).observe(box, { attributes: true, attributeFilter: ['hidden'] });
}
