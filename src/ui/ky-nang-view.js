// Mục Kỹ năng trong bảng Nhân vật → Công pháp (chủ dự án 21/11/2026 17:23: "kỹ năng thì nằm trong phần công pháp"; src/ui/self-panel.js gọi renderKyNang).
// Trên: ba ô đang mang (chạm để chọn ô). Dưới: các kỹ năng của người chơi theo truyện, cái chưa học hiện mờ kèm "mở theo nhiệm vụ chính". Chạm một kỹ năng
// đã học để mở phần chi tiết: mang vào ô đang chọn, SÁCH (ghép hai cuốn cùng cấp thành một cuốn cấp trên, lời chủ dự án), KHẢM TÍNH CHẤT (ô mở theo cấp
// sách). Logic ở src/game/ky-nang.js, số và chữ ở data/ky-nang.json. Kiểu: ky-nang-hud.css.
import { KN, knOn, knCua, knO, knDat, knDef, knCap, knDem, knThuong, ghepDuoc, ghepSach, knSoO, knKham, khamVao, thaoRa, tinhHop, chepSach } from '../game/ky-nang.js';
import { manaCost } from '../game/mana.js';
import { totalLayer } from '../game/stats.js';

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in o ? o[k] : m));
const so = x => String(Math.round(x * 10) / 10).replace('.', ',');
const hinh = (d, id) => { const s = d.skills[id], spr = d.art.sprites['pxi.' + id] || d.art.sprites['vfx.' + id] || d.art.sprites['icon.' + (s.icon || s.fx || 'orb')]; return spr ? `url("${spr.file}?v=${spr.v}")` : ''; };

export function renderKyNang(game, st, mid, bar, changed) {
  const D = game.data, K = KN(D), X = K.text, wrap = el('div', 'knv'), R = D.realms;
  mid.classList.remove('sheet'); bar.hidden = true; bar.replaceChildren();
  if (!knOn(game)) { mid.replaceChildren(wrap); return; }
  const lo = knO(game), ds = knCua(game), n = totalLayer(game.save, R), moc = t => `${R.names[Math.floor(t / R.layers)]} tầng ${t % R.layers + 1}`;
  if (!(st.knSlot >= 0 && st.knSlot < 3)) st.knSlot = Math.max(0, lo.indexOf(null));
  const veLai = (luu = true) => { if (luu) game.persist(); changed(false); };
  // Ba ô đang mang
  const o = el('div', 'knv-o');
  lo.forEach((id, i) => { const b = el('button', i === st.knSlot ? 'on' : '', id ? D.skills[id].name : X.trong); b.append(el('small', null, fill(X.chua_mang, { i: i + 1 }))); b.onclick = () => { st.knSlot = i; veLai(false); }; o.append(b); });
  wrap.append(o, el('div', 'knv-ghi', ds.some(id => knCap(game, id)) ? X.sub : X.chua));
  const trong = game.save.knTrong | 0;   // sách trống từ mốc nhiệm vụ chính 5, 10, 15...
  if (trong > 0) wrap.append(el('div', 'knv-trong', fill(X.trong, { n: trong })));
  for (const id of ds) {
    const s = knDef(game, id), lv = knCap(game, id), the = el('div', 'knv-the' + (lv ? '' : ' khoa') + (lo.includes(id) ? ' mang' : '')), dau = el('div', 'knv-dau'), ten = el('div', 'knv-ten'), h = el('i', 'knv-hinh');
    the.style.setProperty('--mau', s.color); h.style.backgroundImage = hinh(D, id);
    ten.append(el('b', null, s.name), el('small', null, lv ? `${fill(X.cap, { lv })} · ${fill(X.day, { ai: s.day })}` : `${fill(X.day, { ai: s.day })} · ${X.khoa_truyen}`));
    dau.append(h, ten); the.append(dau);
    if (lv) dau.onclick = () => { st.knSel = st.knSel === id ? null : id; veLai(false); };
    the.append(el('div', 'knv-ta', `${fill(X.hoi, { x: so(s.cd) })} · ${fill(X.ton, { x: manaCost(game, id, s) })}${lv > 1 ? ' · ' + fill(X.sat_thuong, { x: Math.round((knThuong(game, id) - 1) * 100) }) : ''}`));
    if (!lv || st.knSel !== id) { if (lv && !lo.includes(id)) the.append(nutMang()); wrap.append(the); continue; }
    the.append(el('div', 'knv-ta', s.desc));
    if (lo[st.knSlot] !== id) the.append(nutMang());
    // Sách: đang có những cuốn nào, ghép hai cuốn cùng cấp
    const dem = knDem(game, id), cao = dem.find(([l]) => ghepDuoc(game, id, l));
    the.append(el('div', 'knv-muc', fill(X.dem, { ds: dem.map(([l, c]) => fill(X.cuon, { n: c, lv: l })).join(', ') })));
    if (trong > 0) { const b = el('button', 'knv-nut phu', fill(X.chep, { ten: s.name })); b.onclick = () => { if (chepSach(game, id)) { game.sfx('pickup'); veLai(); } }; the.append(b); }
    if (cao) { const b = el('button', 'knv-nut', fill(X.ghep, { n: K.sach.ghep, a: cao[0], b: cao[0] + 1 })); b.onclick = () => { if (ghepSach(game, id, cao[0])) { game.sfx('levelup'); if (knCap(game, id) > lv) game.toast(fill(X.ghep_ok, { ten: s.name, lv: knCap(game, id) }), 3); veLai(); } }; the.append(b); }
    else the.append(el('div', 'knv-ghi', lv >= K.sach.max ? X.toi_da : fill(X.ghep_thieu, { n: K.sach.ghep, b: lv + 1 })));
    // Khảm tính chất
    const soO = knSoO(game, lv), dang = knKham(game, id), ke = K.kham.o.find(x => lv < x);
    the.append(el('div', 'knv-muc', [fill(X.kham_dem, { a: dang.length, b: soO }), ke ? fill(X.o_ke, { lv: ke }) : ''].filter(Boolean).join(' · ')));
    for (const [m, T] of Object.entries(K.kham.tinh)) {
      if (!tinhHop(game, id, m)) continue;
      const co = dang.includes(m), khoa = n < T.at, b = el('button', 'kn-t' + (co ? ' co' : ''));
      b.append(el('b', null, T.ten), el('small', null, khoa ? fill(X.kham_khoa, { moc: moc(T.at) }) : co ? `${T.mo_ta} · ${X.thao}` : T.mo_ta));
      b.disabled = !co && (khoa || dang.length >= soO);
      b.onclick = () => { if (co) thaoRa(game, id, m); else if (!khamVao(game, id, m)) return; game.sfx(co ? 'click' : 'pickup'); veLai(); };
      the.append(b);
    }
    wrap.append(the);
    function nutMang() { const b = el('button', 'knv-nut phu', `Mang vào ô ${st.knSlot + 1}`); b.onclick = e => { e.stopPropagation(); knDat(game, st.knSlot, id); st.knSlot = (st.knSlot + 1) % 3; game.sfx('pickup'); veLai(false); }; return b; }
  }
  const keep = mid.scrollTop; mid.replaceChildren(wrap); mid.scrollTop = keep;
}
