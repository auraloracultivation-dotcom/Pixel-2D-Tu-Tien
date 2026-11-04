// Chọn ngôn ngữ (src/core/i18n.js): dòng chữ ở màn đầu và mục Ngôn ngữ trong Menu (data/menu.json, src/ui/side-nav.js).
// Tên ngôn ngữ luôn viết bằng chính ngôn ngữ đó (translate="no"); chọn xong tải lại trang.
import { LANGS, lang, setLang } from '../core/i18n.js';

// Màn đầu: "Tiếng Việt · English · 繁體中文" ngay trên dòng Quyền riêng tư
export function langRow(menu) {
  if (!menu || menu.querySelector('.lang-row')) return;
  const p = document.createElement('p');
  p.className = 'legal lang-row'; p.setAttribute('translate', 'no');
  LANGS.forEach((l, i) => {
    if (i) p.append(' · ');
    const a = document.createElement('a');
    a.href = '#'; a.textContent = l.name;
    if (l.id === lang) a.style.fontWeight = 'bold';
    a.onclick = e => { e.preventDefault(); if (l.id !== lang) setLang(l.id); };
    p.append(a);
  });
  menu.insertBefore(p, menu.querySelector('.legal'));
}

// Mục Ngôn ngữ trong Menu: mỗi ngôn ngữ một nút, nút đang dùng bị khoá
export function renderLang(body, it, card, mini) {
  const row = document.createElement('div');
  row.className = 'card-acts wrap'; row.setAttribute('translate', 'no');
  for (const l of LANGS) row.append(mini(l.name, () => setLang(l.id), l.id === lang));
  const c = card('#b8a0e0', it.label, [it.text || '']);
  c.append(row);
  body.append(c);
}
