// Mục Triệu hồi của Hệ Thống (data/he-thong.json → pool, cost, text): điểm đang có, nút Triệu hồi, bảng tỉ lệ. Máy chủ quay quà
// (net/he-thong.js htSummon → p2d_ht_trieu), quà vào Hòm thư rồi nhận luôn.
// Hiệu ứng (chủ dự án 06/11/2026 22:37): ô quay đổi liên tục tên và hình các món trong bảng quà, chậm dần rồi dừng ở món trúng; món
// trúng hiện to hơn, phát sáng phía sau theo màu phẩm (trang bị: màu dòng; ngọc: màu ngọc; Linh Thạch: vàng; thú, khôi lỗi, áo: tím).
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

// Ô quay: đổi món liên tục, chậm dần (nhịp ×1.13 từ 45 ms tới ~420 ms, ~2,8 giây), dừng ở món trúng
function spin(game, stage, pool, hit, nd) {
  return new Promise(done => {
    const box = el('div', 'ht-reel'), ic = el('div', 'ht-reel-ico'), nm = el('b');
    box.append(ic, nm); stage.append(box);
    let ms = 45, last = null;
    const tick = () => {
      let p; do p = pickOf(pool); while (pool.length > 1 && p === last); last = p;
      const L = look(game, p); ic.replaceChildren(L.ico(44)); nm.textContent = L.name; box.style.setProperty('--g', L.glow);
      game.sfx?.('click');
      ms *= 1.13;
      if (ms < 420) setTimeout(tick, ms);
      else setTimeout(() => { box.remove(); done(look(game, hit, nd)); }, ms);
    };
    tick();
  });
}

export function renderGacha(game, body, ht, onDone) {
  const H = game.data['he-thong'], X = H.text;
  body.append(el('div', 'ht-sub', X.summon_title), el('p', 'ht-line', fill(X.summon_desc, { c: H.cost })), el('div', 'ht-pts', fill(X.points, { p: ht.diem })));
  const stage = el('div', 'ht-stage'), btn = el('button', 'ht-btn big', fill(X.summon, { c: H.cost }));
  btn.type = 'button'; btn.disabled = !game.cloud || ht.diem < H.cost;
  if (game.cloud && ht.diem < H.cost) body.append(el('p', 'ht-line ht-muted', fill(X.summon_need, { c: H.cost, p: ht.diem })));
  if (!game.cloud) body.append(el('p', 'ht-line ht-muted', X.login));
  btn.onclick = async () => {
    btn.disabled = true; stage.textContent = ''; stage.className = 'ht-stage spin';
    try {
      const N = await import('../net/he-thong.js'), r = await N.htSummon();
      const hit = H.pool.find(p => p.id === r.qua) || H.pool[0], rk = rank(hit), L = await spin(game, stage, H.pool, hit, r.noi_dung);
      stage.className = `ht-stage open${rk > 1 ? ' rare' : ''}`; stage.style.setProperty('--g', L.glow);
      const ico = el('div', 'ht-hit-ico'); ico.append(L.ico(72));
      stage.append(ico, el('b', null, L.name));
      if (L.sub) stage.append(el('small', 'ht-hit-sub', L.sub));
      if (rk > 1) stage.append(el('small', null, X.rare));
      game.toast(fill(X.summon_got, { name: L.name }), 3); game.sfx?.(rk > 1 ? 'levelup' : 'pickup');
      game.htFace?.react(rk > 1 ? 'hiem' : rk ? 'trieu_kha' : 'trieu', rk > 1 ? 'phan-khich' : undefined);
      import('../game/market.js').then(M => M.claimMail(game)).catch(() => {});   // quà vào túi liền, khỏi đợi lượt dò thư
      setTimeout(() => onDone(r), 3200);
    } catch (e) { stage.className = 'ht-stage'; stage.textContent = ''; game.htFace?.react(String(e?.message || '').includes('thieu_diem') ? 'thieu_diem' : 'loi'); game.toast(String(e?.message || '').includes('thieu_diem') ? fill(X.summon_need, { c: H.cost, p: ht.diem }) : X.summon_err, 2.2); btn.disabled = false; }
  };
  body.append(btn, stage, el('div', 'ht-sub', fill(X.odds_eq, { n: H.pool.length, p: +(100 / H.pool.length).toFixed(2) })));
  const tb = el('div', 'ht-odds');
  for (const p of H.pool) { const L = look(game, p), r = el('div', `ht-odd${rank(p) > 1 ? ' rare' : ''}`), s = el('span', null, L.name); s.style.color = rank(p) ? L.glow : ''; r.append(s); tb.append(r); }
  body.append(tb);
}
