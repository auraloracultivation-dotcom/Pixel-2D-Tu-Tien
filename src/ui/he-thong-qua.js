// Mục Triệu hồi của Hệ Thống (data/he-thong.json → pool, cost, text): điểm đang có, nút Triệu hồi, bảng tỉ lệ. Máy chủ quay quà
// (net/he-thong.js htSummon → p2d_ht_trieu), quà vào Hòm thư rồi nhận luôn.
// Món trúng phát sáng theo màu phẩm (trang bị: màu dòng; ngọc: màu ngọc; Linh Thạch: vàng; thú, khôi lỗi, áo: tím).
import { goc } from '../core/build.js';
import { itemName, gemInfo } from '../game/items.js';
import { matInfo } from '../game/cave.js';
import { grade } from '../game/tiers.js';
import { dailyEvent } from '../game/daily.js';
import { spriteIcon } from './sprite-icon.js';
import { gemIcon } from './gem-icon.js';

function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
const fill = (t, o) => String(t).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const GEMS = ['hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc'];
const pickOf = a => a[Math.floor(Math.random() * a.length)];

// Triệu hồi chia bậc (data/he-thong.json → bac, pool[].b; docs/10-CAI-HON.md việc 6 dòng 18a): bật cùng lúc với máy chủ (bac.on). Tắt: bảng ngang nhau như cũ.
const bacOf = game => { const B = game.data['he-thong'].bac; return B?.on ? B : null; };

// Độ hiếm một ô quà: 2 = hiếm (hệ thống sốc), 1 = khá, 0 = thường. Có bậc (B): Cực hiếm trở lên = 2, Hiếm = 1
function rank(p, B) {
  if (B) return p.b >= 3 ? 2 : p.b >= 2 ? 1 : 0;
  if (p.gear) return p.gear[0] >= 5 ? 2 : p.gear[0] >= 3 ? 1 : 0;
  if (p.gem) return p.gem[0] >= 8 ? 2 : p.gem[0] >= 5 ? 1 : 0;
  if (p.coins) return p.coins >= 1000000 ? 2 : p.coins >= 200000 ? 1 : 0;
  if (p.mount || p.comp || p.outfit) return 1;
  return p.mat === 'dao-van-thach' ? 2 : p.pill === 'tay-tuy-dan' ? 1 : 0;
}

// Màu một ô quà theo bảng màu phẩm (data/items.json line_tiers; chủ dự án 07/11/2026 00:46): Linh Thạch 1–2 triệu, ngọc 8, Đạo Vận
// Thạch đỏ; Linh Thạch 200k–500k, ngọc 5–7 vàng; trang bị theo màu phẩm thật (Thượng Cổ đen thì sáng đỏ thẫm); thú, khôi lỗi, áo tím;
// Tẩy Tủy Đan giữ màu đan; còn lại lục. Chữ bảng tỉ lệ, ánh sáng khi trúng, chữ bảng khoe đều dùng màu này.
function tone(game, p, nd) {
  const D = game.data, T = D.items.line_tiers.list, [G, Y, Rd] = [T[0].color, T[4].color, T[5].color];
  const by = i => T[i]?.edge ? '#ff4a5a' : T[i]?.color || G;
  if (nd?.doi) return (nd.coins || 0) >= 1000000 ? Rd : (nd.coins || 0) >= 200000 ? Y : G;
  if (p.coins) return p.coins >= 1000000 ? Rd : p.coins >= 200000 ? Y : G;
  if (p.gem) { const a = +(nd?.gem?.key || '').split(':')[1] || p.gem[0]; return a >= 8 ? Rd : a >= 5 ? Y : G; }
  if (p.gear) return by(nd?.item ? grade(D, nd.item).idx : p.gear[0]);
  if (p.mount || p.comp || p.outfit) return '#c07aff';
  if (p.mat === 'dao-van-thach') return Rd;
  if (p.pill === 'tay-tuy-dan') return D.cave.pills[p.pill]?.color || '#ff9ad0';
  return G;
}

// Tên, hình, màu sáng của một ô quà (p: ô trong bảng quà; nd: nội dung thư thật khi đã trúng)
// Bạo kích ghi kiểu "x3 · 1.000.000": tên là số gốc một lần, dòng phụ ghi tổng đã nhận (chủ dự án 11/11/2026 20:33: ghi tổng cạnh chữ 3x
// thì ai cũng tưởng nhân thêm lần nữa). L.got: chữ cho thông báo trúng (có tổng khi bạo kích)
function look(game, p, nd) {
  const L = look0(game, p, nd), bk = nd?.bk || 1, X = game.data['he-thong'].text;
  L.glow = tone(game, p, nd); L.got = L.name;
  if (bk > 1 && L.total) { L.sub = fill(X.bk_sum, { k: bk, t: L.total }); L.got = fill(X.bk_got, { name: L.name, k: bk, t: L.total }); }
  return L;
}
const base = (nd, n) => Math.max(1, Math.round(n / (nd?.bk || 1)));   // số gốc một lần trước bạo kích
function look0(game, p, nd) {
  const D = game.data, T = D.items.line_tiers.list, X = D['he-thong'].text, sh = D.shop?.name || 'Linh Thạch';
  if (nd?.doi) return { name: `${(nd.coins || 0).toLocaleString('vi-VN')} ${sh}`, sub: fill(X.dup, { x: look0(game, p).name }), ico: () => spriteIcon(game, 'ui.ic-linh-thach', 0, 64), glow: '#ffd24a' };
  if (p.coins) { const c = nd?.coins || p.coins; return { name: `${base(nd, c).toLocaleString('vi-VN')} ${sh}`, total: `${c.toLocaleString('vi-VN')} ${sh}`, ico: s => spriteIcon(game, 'ui.ic-linh-thach', 0, s), glow: '#ffd24a' }; }
  if (p.gem) {
    const key = nd?.gem?.key || `${pickOf(GEMS)}:${p.gem[0]}`, g = gemInfo(D, key);
    return { name: nd ? `${g?.name || key} ×${base(nd, nd.gem.n)}` : fill(X.pool_gem1, { a: p.gem[0] }), total: nd ? `${g?.name || key} ×${nd.gem.n}` : '', ico: s => gemIcon(game, key, s), glow: g?.color || '#9fe8ff' };
  }
  if (p.gear) {
    const ik = b => D.art.sprites['ui.vk-' + b] ? 'ui.vk-' + b : D.art.sprites['gear.' + b] ? 'gear.' + b : null;   // nhẫn, ngọc bội… chỉ có hình gear.*
    const t = T[p.gear[0]], bases = Object.keys(D.items.bases).filter(ik), base = nd?.item?.base || pickOf(bases);
    return { name: nd?.item ? itemName(D, nd.item) : fill(X.pool_gear, { t: t?.name || '' }), sub: nd?.item ? fill(X.grade, { g: grade(D, nd.item).name }) : '', ico: s => spriteIcon(game, ik(base) || 'ui.vk-' + base, 0, s), glow: t?.edge ? '#ff4a5a' : t?.color || '#fff' };   // Thượng Cổ màu đen: sáng đỏ thẫm như viền dòng đen
  }
  if (p.pill) { const x = D.cave.pills[p.pill], n = nd?.pill?.n || p.n; return { name: `${x?.name || p.pill} ×${base(nd, n)}`, total: `${x?.name || p.pill} ×${n}`, ico: s => spriteIcon(game, 'ui.vk-' + p.pill, 0, s), glow: x?.color || '#ff9ad0' }; }
  if (p.mat) { const x = matInfo(D, p.mat), n = nd?.mat?.n || p.n; return { name: `${x?.name || p.mat} ×${base(nd, n)}`, total: `${x?.name || p.mat} ×${n}`, ico: s => spriteIcon(game, 'ui.vk-' + p.mat, 0, s), glow: x?.color || '#bfe6f4' }; }
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
  return R ? goc(open ? R.mo : R.dong, false) : '';
}

// Món từ bậc bac.le trở lên: nghi lễ nhận thưởng cả màn (ui/reward-show.js), vầng sáng màu của bậc, bậc càng cao diễn càng lớn
function ceremony(game, B, b, L) {
  const T = B.list[b], X = game.data['he-thong'].text;
  game.rewardGive?.({ qua: { ray: T.color, ink: T.color, lvl: B.lvl[b] || 0, name: L.name, tag: fill(X.bac_tag, { name: T.name }), sub: X.bac_sub, node: L.ico,
    lines: [...(L.sub ? [{ text: L.sub, desc: true }] : []), ...(b >= 3 ? [{ text: X.rare, desc: true }] : [])], gain: null } });   // Cực hiếm trở lên: lời Hệ Thống "Khí vận nghịch thiên!" nói trong nghi lễ (trên rương chữ dài đè lên hình rương)
}

export function renderGacha(game, body, ht, onDone) {
  const H = game.data['he-thong'], X = H.text, R = H.mat?.ruong, B = bacOf(game);
  const pts = el('div', 'ht-pts', fill(X.points, { p: ht.diem }));
  body.append(el('div', 'ht-sub', X.summon_title), pts);   // rương và nút ngay đầu cho thấy hết trong khung; chữ giải thích để dưới
  const stage = el('div', 'ht-chest-stage'), slot = el('div', 'ht-slot'), chest = el('img', 'ht-chest');
  chest.src = chestImg(game, false); chest.alt = ''; chest.draggable = false;
  if (R) chest.style.width = `${Math.round(R.w * 1.7)}px`;
  const feed = el('div', 'ht-feed');   // 10 lần quay đáng khoe cả máy chủ: bạo kích từ x5 hoặc trang bị phẩm Thiên trở lên (chủ dự án 07/11/2026 00:07)
  const wrap = el('div', 'ht-chest-wrap');   // bảng khoe nằm ngoài sân khấu (sân khấu cắt viền ánh sáng) để kéo lên, ra sát mép bảng
  const bhEl = el('div', 'ht-bh');   // bảo hiểm của mình, mép trái sân khấu (đối xứng bảng khoe bên phải): luôn thấy cùng rương, khỏi phải vuốt xuống mới biết còn mấy lượt
  stage.append(slot, chest); wrap.append(stage, feed, bhEl);
  // một dòng quà: biểu tượng, tên người (bảng khoe) hoặc giờ (lịch sử của mình), món kèm số lần bạo kích
  const feedRow = (f, who) => {
    const p = H.pool.find(x => x.id === f.qua); if (!p) return null;
    const L = look(game, p, f.nd), bk = f.nd?.bk || 1, row = el('div', 'ht-feed-r'), ic = el('i'); ic.append(L.ico(18));
    // chủ dự án 09/11/2026 10:32: ghi số lần bạo kích ngay đầu, kiểu "4x 2.000.000", "3x Hồi Xuân Đan" (bỏ "×n" sau tên cho khỏi
    // hiểu nhầm nhân hai lần)
    const what = f.nd?.item ? grade(game.data, f.nd.item).name : f.nd?.coins && !f.nd?.doi ? base(f.nd, f.nd.coins).toLocaleString('vi-VN') : L.name.replace(/ ×1$/, '');   // bạo kích: "3x 1.000.000" (số gốc)
    const t = el('span'); t.append(el('b', null, String(who).slice(0, 11)), el('em', null, `${bk > 1 ? bk + 'x ' : ''}${what}`));
    t.lastChild.style.color = bk >= 5 ? '#ffa53a' : L.glow;
    row.title = `${who}: ${L.name}${bk > 1 ? ' x' + bk : ''}`; row.append(ic, t);
    return row;
  };
  const loadFeed = () => game.cloud && import('../net/he-thong.js').then(N => N.htFeed()).then(list => {
    feed.textContent = '';
    if (!list?.length) return;
    feed.append(el('div', 'ht-feed-h', X.feed_head));
    for (const f of list) { const r = feedRow(f, f.ten); if (r) feed.append(r); }
  }).catch(() => {});
  loadFeed();
  const btn = el('button', 'ht-btn big', fill(X.summon, { c: H.cost })), need = el('p', 'ht-line ht-muted');
  btn.type = 'button';
  let diem = ht.diem, busy = false, bh = [ht.bh2 || 0, ht.bh3 || 0];
  const sync = () => {
    pts.textContent = fill(X.points, { p: diem });
    bhEl.hidden = !B || !game.cloud;   // bảo hiểm: còn mấy lượt nữa chắc chắn ra bậc Hiếm / Cực hiếm
    if (B) { bhEl.textContent = ''; bhEl.append(el('div', 'ht-feed-h', X.bh_head)); [[B.bao_hiem.hiem, bh[0], 2], [B.bao_hiem.cuc, bh[1], 3]].forEach(([n, k, t]) => { const d = bhEl.appendChild(el('b', null, B.list[t].name)); d.style.color = B.list[t].color; bhEl.append(el('span', null, fill(X.bh_left, { n: Math.max(1, n - k) }))); }); }
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
    // Các món sẽ lướt qua: chọn sẵn và gọi hình trước (hình món nào chưa tải thì lúc lướt tới chỉ thấy tên, không thấy hình); số hình tải vẫn như trước, chỉ sớm hơn
    let last = null, ri = 0, hitL = null;
    const reel = Array.from({ length: 18 }, () => { let p; do p = pickOf(H.pool); while (H.pool.length > 1 && p === last); last = p; return look(game, p); });
    reel.forEach(L => L.ico(48));
    const roll = () => { show(reel[ri++ % reel.length], false); game.sfx?.('click'); };
    roll();
    await wait(450); roll(); await wait(450);
    chest.src = chestImg(game, false); chest.classList.remove('pop'); slot.className = 'ht-slot spin';   // rương đóng, món lơ lửng đổi tiếp
    const hitOf = x => H.pool.find(p => p.id === x.qua) || H.pool[0];
    let r = null, err = null; N.then(x => { r = x; hitL = look(game, hitOf(x), x.noi_dung); hitL.ico(72); }, e => { err = e; });   // máy chủ vừa trả lời: gọi hình món trúng ngay, lúc hiện ra đã có hình
    let ms = 70;
    while (ms < 430 || (!r && !err)) { roll(); await wait(ms); ms = Math.min(430, ms * 1.14); if (err) break; }
    if (err) {
      busy = false; clear(); diem = ht.diem; sync();
      const m = String(err?.message || '');
      game.htFace?.react(m.includes('thieu_diem') ? 'thieu_diem' : 'loi'); game.toast(m.includes('thieu_diem') ? fill(X.summon_need, { c: H.cost, p: diem }) : X.summon_err, 2.2);
      return;
    }
    const hit = hitOf(r), rk = rank(hit, B), L = hitL || look(game, hit, r.noi_dung), bac = B ? Math.min(B.list.length - 1, r.bac ?? r.noi_dung?.bac ?? hit.b ?? 0) : -1;
    const cer = !!B && bac >= B.le && !r.noi_dung?.doi;   // sẽ có nghi lễ cả màn: tiếng mừng để nghi lễ lo, trên rương chỉ một tiếng tách lúc món dừng (chủ dự án 15/11/2026 04:39: "bị lồng 2 âm thanh chúc mừng")
    show(L, true); slot.className = `ht-slot hit${rk > 1 ? ' rare' : ''}`;
    if (B) { stage.style.setProperty('--g', B.list[bac].color); const t = slot.appendChild(el('small', 'ht-bac', fill(X.bac_tag, { name: B.list[bac].name }))); t.style.color = B.list[bac].color; bh = [r.bh2 ?? bh[0], r.bh3 ?? bh[1]]; }
    const bk = r.bk || r.noi_dung?.bk || 1;
    if (bk > 1) {   // bạo kích: chữ x2, x3... to, không viền, chỉ có màu, góc trên phải ngoài món (chủ dự án 06/11/2026 23:52)
      const b = el('span', `ht-bk k${Math.min(bk, 10)}`, `x${bk}`); slot.querySelector('.ht-hit-ico')?.append(b);
      if (!cer) game.sfx?.(bk >= 5 ? 'boom' : 'crit');
    } stage.classList.add('lit'); stage.classList.toggle('rare', rk > 1);
    if (L.sub) slot.append(el('small', 'ht-hit-sub', L.sub));
    if (rk > 1 && !B) slot.append(el('small', 'ht-rare', X.rare));
    if (!B) game.toast(fill(X.summon_got, { name: L.got }), 3);   // có bậc: món và bậc hiện ngay trên rương, từ bậc bac.le có nghi lễ; dòng báo giữa màn sẽ che đúng tên món nên thôi
    game.sfx?.(cer ? 'click' : rk > 1 ? 'levelup' : 'pickup');
    game.htFace?.react(rk > 1 ? 'hiem' : rk ? 'trieu_kha' : 'trieu', rk > 1 ? 'phan-khich' : undefined);
    import('../game/market.js').then(M => M.claimMail(game)).catch(() => {});   // quà vào túi liền, khỏi đợi lượt dò thư
    dailyEvent(game, 'summon');   // việc ngày Triệu hồi
    if (cer) setTimeout(() => ceremony(game, B, bac, L), 500);   // thấy món nằm trên rương đã, rồi mới vào nghi lễ
    diem = r.diem; busy = false; sync(); onDone(r); setTimeout(loadFeed, 600);   // món trúng để nguyên trên rương (không vẽ lại bảng)
  };
  sync();
  body.append(wrap, btn, need, el('p', 'ht-line ht-muted', B ? fill(X.summon_desc_bac, { c: H.cost, a: B.bao_hiem.hiem, b: B.bao_hiem.cuc }) : fill(X.summon_desc, { c: H.cost })),
    el('div', 'ht-sub', B ? X.odds_bac : fill(X.odds_eq, { n: H.pool.length, p: +(100 / H.pool.length).toFixed(2) })));
  const odd = (tb, p, color) => { const L = look(game, p), r = el('div', `ht-odd${rank(p, B) > 1 ? ' rare' : ''}`), s = el('span', null, L.name); s.style.color = color || L.glow; r.append(s); tb.append(r); };
  if (B) {   // bảng tỉ lệ theo bậc, bậc hiếm nhất ở trên: tên bậc + tỉ lệ cả bậc, rồi các món của bậc (màu của bậc)
    for (let i = B.list.length - 1; i >= 0; i--) {
      const T = B.list[i], h = el('div', 'ht-bac-h', fill(X.bac_row, { name: T.name, pct: String(T.pct).replace('.', ',') })), tb = el('div', 'ht-odds');
      h.style.color = T.color; for (const p of H.pool) if (p.b === i) odd(tb, p, T.color);
      body.append(h, tb);
    }
  } else { const tb = el('div', 'ht-odds'); for (const p of H.pool) odd(tb, p); body.append(tb); }
  // Lịch sử triệu hồi của mình (đề xuất #153): bấm mở / gập, 50 lần gần nhất từ máy chủ
  if (!game.cloud || !X.ls_btn || !H.ls_on) return;   // ls_on: bật sau khi hàm máy chủ p2d_ht_ls_cua_toi đã áp lên (data/he-thong.json)
  const lsBtn = el('button', 'ht-btn', X.ls_btn), ls = el('div', 'ht-feed ht-ls');
  lsBtn.type = 'button'; ls.hidden = true;
  const hm = d => { const t = new Date(d); return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')} ${t.getDate()}/${t.getMonth() + 1}`; };
  lsBtn.onclick = () => {
    ls.hidden = !ls.hidden;
    if (ls.hidden) return;
    ls.textContent = '…';
    import('../net/he-thong.js').then(N => N.htMine()).then(list => {
      ls.textContent = '';
      ls.append(el('div', 'ht-feed-h', list?.length ? X.ls_head : X.ls_empty));
      for (const f of list || []) { const r = feedRow(f, hm(f.luc)); if (r) ls.append(r); }
    }).catch(() => { ls.textContent = X.summon_err; });
  };
  body.append(lsBtn, ls);
}
