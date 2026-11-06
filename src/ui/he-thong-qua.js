// Mục Triệu hồi của Hệ Thống (data/he-thong.json → pool, cost, text): điểm đang có, nút Triệu hồi, bảng tỉ lệ. Máy chủ quay quà
// (net/he-thong.js htSummon → p2d_ht_trieu), quà vào Hòm thư rồi nhận luôn.
// Món trúng phát sáng theo màu phẩm (trang bị: màu dòng; ngọc: màu ngọc; Linh Thạch: vàng; thú, khôi lỗi, áo: tím).
import { itemName, gemInfo } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { grade } from '../game/tiers.js';
import { spriteIcon } from './sprite-icon.js';
import { gemIcon } from './gem-icon.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const GEMS = ['hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc'];
const pickOf = a => a[Math.floor(Math.random() * a.length)];

// Độ hiếm một ô quà: 2 = hiếm (hệ thống sốc), 1 = khá, 0 = thường
function rank(p) {
  if (p.gear) return p.gear[0] >= 5 ? 2 : p.gear[0] >= 3 ? 1 : 0;
  if (p.gem) return p.gem[0] >= 7 ? 2 : p.gem[0] >= 5 ? 1 : 0;
  if (p.coins) return p.coins >= 1000000 ? 2 : p.coins >= 200000 ? 1 : 0;
  if (p.mount || p.comp || p.outfit) return 1;
  return p.pill === 'tay-tuy-dan' || p.mat === 'dao-van-thach' ? 1 : 0;
}

// Tên, hình, màu sáng của một ô quà (p: ô trong bảng quà; nd: nội dung thư thật khi đã trúng)
function look(game, p, nd) {
  const D = game.data, T = D.items.line_tiers.list, X = D['he-thong'].text, sh = D.shop?.name || 'Linh Thạch';
  if (nd?.doi) return { name: `${(nd.coins || 0).toLocaleString('vi-VN')} ${sh}`, sub: fill(X.dup, { x: look(game, p).name }), ico: () => spriteIcon(game, 'ui.ic-linh-thach', 0, 64), glow: '#ffd24a' };
  if (p.coins) return { name: `${p.coins.toLocaleString('vi-VN')} ${sh}`, ico: s => spriteIcon(game, 'ui.ic-linh-thach', 0, s), glow: '#ffd24a' };
  if (p.gem) {
    const key = nd?.gem?.key || `${pickOf(GEMS)}:${p.gem[0]}`, g = gemInfo(D, key);
    return { name: nd ? `${g?.name || key} ×${nd.gem.n}` : fill(X.pool_gem1, { a: p.gem[0] }), ico: s => gemIcon(game, key, s), glow: g?.color || '#9fe8ff' };
  }
  if (p.gear) {
    const t = T[p.gear[0]], bases = Object.keys(D.items.bases).filter(b => D.art.sprites['ui.vk-' + b]), base = nd?.item?.base || pickOf(bases);
    return { name: nd?.item ? itemName(D, nd.item) : fill(X.pool_gear, { t: t?.name || '' }), sub: nd?.item ? fill(X.grade, { g: grade(D, nd.item).name }) : '', ico: s => spriteIcon(game, 'ui.vk-' + base, 0, s), glow: t?.edge ? '#ff4a5a' : t?.color || '#fff' };   // Thượng Cổ màu đen: sáng đỏ thẫm như viền dòng đen
  }
  if (p.pill) { const x = D.cave.pills[p.pill]; return { name: `${x?.name || p.pill} ×${p.n}`, ico: s => spriteIcon(game, 'ui.vk-' + p.pill, 0, s), glow: x?.color || '#ff9ad0' }; }
  if (p.mat) { const x = matInfo(D, p.mat); return { name: `${x?.name || p.mat} ×${p.n}`, ico: s => spriteIcon(game, 'ui.vk-' + p.mat, 0, s), glow: x?.color || '#bfe6f4' }; }
  if (p.mount) return { name: D.pets.mounts[p.mount]?.name || p.mount, sub: X.k_mount, ico: s => spriteIcon(game, 'mount.' + p.mount, 0, s, 'mt-ico', true), glow: '#c07aff' };
  if (p.comp) return { name: `${X.k_comp} ${D.npcs[p.comp]?.name || p.comp}`, ico: s => spriteIcon(game, 'comp.' + p.comp, 0, s, 'mt-ico', true), glow: '#c07aff' };
  if (p.outfit) { const g = nd?.g || game.save?.gioi || 'nam'; return { name: D.fashion.list[p.outfit]?.name || p.outfit, sub: X.k_outfit, ico: s => spriteIcon(game, `hero.y-${p.outfit}-${g}`, 0, s, 'mt-ico', true), glow: '#c07aff' }; }
  return { name: '?', ico: () => el('i'), glow: '#fff' };
}

// Sân khấu rương (chủ dự án 06/11/2026 23:19): rương đóng chờ sẵn, nút Triệu hồi bên dưới. Bấm: rương bật mở, các món bay lên trên
// miệng rương, rương đóng lại; món phía trên đổi liên tục, chậm dần rồi dừng ở món trúng, phát sáng theo màu phẩm. Màn cuối: rương
// đóng và món vừa nhận, để nguyên cho người chơi chụp khoe; chạm vào sân khấu hoặc quay tiếp mới thôi. Hình rương: mat.ruong
// (tools/art/he_thong_ruong.py).
const wait = ms => new Promise(r => setTimeout(r, ms));
function chestImg(game, open) {
  const R = game.data['he-thong'].mat?.ruong;
  return R ? new URL(`../../${open ? R.mo : R.dong}`, import.meta.url).href : '';
}

export function renderGacha(game, body, ht, onDone) {
  const H = game.data['he-thong'], X = H.text, R = H.mat?.ruong;
  const pts = el('div', 'ht-pts', fill(X.points, { p: ht.diem }));
  body.append(el('div', 'ht-sub', X.summon_title), pts);   // rương và nút ngay đầu cho thấy hết trong khung; chữ giải thích để dưới
  const stage = el('div', 'ht-chest-stage'), slot = el('div', 'ht-slot'), chest = el('img', 'ht-chest');
  chest.src = chestImg(game, false); chest.alt = ''; chest.draggable = false;
  if (R) chest.style.width = `${Math.round(R.w * 1.7)}px`;
  stage.append(slot, chest);
  const btn = el('button', 'ht-btn big', fill(X.summon, { c: H.cost })), need = el('p', 'ht-line ht-muted');
  btn.type = 'button';
  let diem = ht.diem, busy = false;
  const sync = () => {
    pts.textContent = fill(X.points, { p: diem });
    btn.disabled = busy || !game.cloud || diem < H.cost;
    need.textContent = !game.cloud ? X.login : diem < H.cost ? fill(X.summon_need, { c: H.cost, p: diem }) : '';
    need.hidden = !need.textContent;
  };
  const clear = () => { if (busy) return; slot.textContent = ''; slot.className = 'ht-slot'; stage.classList.remove('lit', 'rare'); };
  stage.onclick = clear;   // chạm sân khấu: cất món đang khoe
  const show = (L, big) => {
    slot.textContent = '';
    const ico = el('div', big ? 'ht-hit-ico' : 'ht-reel-ico'); ico.append(L.ico(big ? 72 : 48));
    slot.append(ico, el('b', null, L.name)); stage.style.setProperty('--g', L.glow);
    return slot;
  };
  btn.onclick = async () => {
    if (busy) return;
    clear(); busy = true; sync();
    const N = import('../net/he-thong.js').then(m => m.htSummon());
    N.catch(() => {});
    // rương bật mở, món bay lên
    chest.src = chestImg(game, true); chest.classList.add('pop'); game.sfx?.('door');
    slot.className = 'ht-slot rise';
    let last = null;
    const roll = () => { let p; do p = pickOf(H.pool); while (H.pool.length > 1 && p === last); last = p; show(look(game, p), false); game.sfx?.('click'); };
    roll();
    await wait(450); roll(); await wait(450);
    chest.src = chestImg(game, false); chest.classList.remove('pop'); slot.className = 'ht-slot spin';   // rương đóng, món lơ lửng đổi tiếp
    let r = null, err = null; N.then(x => { r = x; }, e => { err = e; });
    let ms = 70;
    while (ms < 430 || (!r && !err)) { roll(); await wait(ms); ms = Math.min(430, ms * 1.14); if (err) break; }
    if (err) {
      busy = false; clear(); diem = ht.diem; sync();
      const m = String(err?.message || '');
      game.htFace?.react(m.includes('thieu_diem') ? 'thieu_diem' : 'loi'); game.toast(m.includes('thieu_diem') ? fill(X.summon_need, { c: H.cost, p: diem }) : X.summon_err, 2.2);
      return;
    }
    const hit = H.pool.find(p => p.id === r.qua) || H.pool[0], rk = rank(hit), L = look(game, hit, r.noi_dung);
    show(L, true); slot.className = `ht-slot hit${rk > 1 ? ' rare' : ''}`; stage.classList.add('lit'); stage.classList.toggle('rare', rk > 1);
    if (L.sub) slot.append(el('small', 'ht-hit-sub', L.sub));
    if (rk > 1) slot.append(el('small', 'ht-rare', X.rare));
    game.toast(fill(X.summon_got, { name: L.name }), 3); game.sfx?.(rk > 1 ? 'levelup' : 'pickup');
    game.htFace?.react(rk > 1 ? 'hiem' : rk ? 'trieu_kha' : 'trieu', rk > 1 ? 'phan-khich' : undefined);
    import('../game/market.js').then(M => M.claimMail(game)).catch(() => {});   // quà vào túi liền, khỏi đợi lượt dò thư
    diem = r.diem; busy = false; sync(); onDone(r);   // món trúng để nguyên trên rương (không vẽ lại bảng)
  };
  sync();
  body.append(stage, btn, need, el('p', 'ht-line ht-muted', fill(X.summon_desc, { c: H.cost })), el('div', 'ht-sub', fill(X.odds_eq, { n: H.pool.length, p: +(100 / H.pool.length).toFixed(2) })));
  const tb = el('div', 'ht-odds');
  for (const p of H.pool) { const L = look(game, p), r = el('div', `ht-odd${rank(p) > 1 ? ' rare' : ''}`), s = el('span', null, L.name); s.style.color = rank(p) ? L.glow : ''; r.append(s); tb.append(r); }
  body.append(tb);
}
