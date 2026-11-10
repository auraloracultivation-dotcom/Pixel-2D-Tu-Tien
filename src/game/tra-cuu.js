// Tàng Thư của Hệ Thống (chủ dự án 10/11/2026 09:16: "nâng cấp hệ thống cho thông minh hơn, nhiều thông tin hữu dụng hơn", mẫu: wiki
// cotienlo.com). Không chép tay: đọc thẳng data/ (chiêu, công pháp, quái, bản đồ, đan, nguyên liệu, linh thú, thú cưỡi, cảnh giới, linh căn,
// NPC, thời trang) thành mục tra cứu, nối chéo hai chiều (quái ↔ bản đồ ↔ vật rơi ↔ đan dùng nó…). Sửa chỉ số ở data/ là Tàng Thư đổi theo.
// Nhãn chữ ở data/he-thong.json → tra. Dùng: traIndex(game) (dựng một lần), traSearch, traLink (chữ trùng tên mục thành nút bấm được).
const norm = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
const own = o => Object.entries(o || {}).filter(([k]) => !k.startsWith('_'));
const clean = n => String(n || '').replace(/\s*\(.*?\)\s*/g, ' ').trim();   // "Lão Thiết (thợ rèn)" → "Lão Thiết"
const pct = v => `${Math.round(v * 1000) / 10}%`;

export function traIndex(game) {
  if (game.traIdx) return game.traIdx;
  const D = game.data, L = D['he-thong']?.tra?.row || {}, E = new Map();
  const add = (kind, key, name, o = {}) => {
    if (!name) return null;
    const id = `${kind}:${key}`, e = E.get(id) || { id, kind, key, name: clean(name), full: name, rows: [], rel: new Set(), desc: '' };
    Object.assign(e, o); E.set(id, e); return e;
  };
  const rel = (a, b) => { const x = E.get(a), y = E.get(b); if (x && y && a !== b) { x.rel.add(b); y.rel.add(a); } };
  const stat = k => D.items?.stats?.[k]?.name || k;

  // Cảnh giới, linh căn
  const R = D.realms;
  R?.names?.forEach((n, i) => add('realm', i, n, { desc: (L.realm_desc || '').replace('{n}', i + 1).replace('{l}', R.layers), rows: [[L.layers, R.layers], [L.next, R.names[i + 1] || '—']] }));
  for (const r of R?.roots?.list || []) add('root', r.id, `${r.name} linh căn`, { color: r.color, rows: [[L.qi, `×${r.qi}`], [L.chance, `${r.weight}%`]] });
  // Chiêu
  for (const [k, s] of own(D.skills)) {
    add('skill', k, s.name, { color: s.color, desc: s.desc, rows: [[L.cd, `${s.cd} giây`], [L.mp, s.mp], [L.mult, s.mult != null ? `×${s.mult}` : null], [L.range, s.range]] });
  }
  // Công pháp
  for (const [k, t] of own(D.techniques?.list)) {
    add('tech', k, t.name, { color: t.color, desc: t.desc, rows: own(t.per_level).map(([s, v]) => [`${stat(s)} / ${L.level}`, `+${v}${D.items?.stats?.[s]?.pct || /pct|gain|regen/.test(s) ? '%' : ''}`]) });
  }
  // Quái
  for (const [k, m] of own(D.mobs)) {
    const boss = m.ai === 'boss' || /vuong|boss/.test(k);
    add(boss ? 'boss' : 'mob', k, m.name, { color: m.color, rows: [[L.hp, m.hp], [L.atk, m.atk], [L.qi, m.qi]] });
  }
  const mobId = k => E.has(`mob:${k}`) ? `mob:${k}` : `boss:${k}`;
  // Bản đồ: quái đứng ở đâu, NPC ở đâu
  for (const id of D.config?.maps || []) {
    const M = D.maps?.[id]; if (!M) continue;
    add('map', id, M.name);
    const mobs = new Set([...(M.spawners || []).map(s => s.mob), ...(M.rooms || []).flatMap(r => (r.mobs || []).map(x => x.mob))]);
    for (const k of mobs) rel(`map:${id}`, mobId(k));
    for (const n of M.npcs || []) if (D.npcs?.[n.id]) { add('npc', n.id, D.npcs[n.id].name, { color: D.npcs[n.id].color, desc: D.npcs[n.id].lines?.[0] }); rel(`map:${id}`, `npc:${n.id}`); }
  }
  for (const [mapId, list] of own(D.worldboss?.maps)) for (const k of list) rel(`map:${mapId}`, mobId(k));
  for (const [k, n] of own(D.npcs)) add('npc', k, n.name, { color: n.color, desc: n.lines?.[0] });
  // Nguyên liệu, đan, luyện đan
  const C = D.cave;
  for (const [k, m] of own(C?.materials)) add('mat', k, m.name, { color: m.color, desc: m.desc });
  for (const [k, m] of own(D.items?.materials)) add('mat', k, m.name, { color: m.color, desc: m.desc });
  for (const [mob, list] of own(C?.mat_drops)) for (const [mat, p] of list) { rel(mobId(mob), `mat:${mat}`); const e = E.get(`mat:${mat}`); if (e) (e.drop ||= []).push([mob, p]); }
  for (const [k, p] of own(C?.pills)) {
    const e = add('pill', k, p.name, { color: p.color, desc: p.desc, rows: [[L.cd, p.cd ? `${p.cd} giây` : null], [L.rate, p.rate ? pct(p.rate) : null], [L.make, p.make]] });
    for (const [mat, n] of own(p.recipe)) { rel(`pill:${k}`, `mat:${mat}`); (e.recipe ||= []).push([mat, n]); }
  }
  for (const [mob, p] of own(D.techniques?.drops)) { const e = E.get(mobId(mob)); if (e) e.rows.push([L.tech_drop, pct(p)]); }
  // Cửa hàng
  for (const it of D.shop?.items || []) { const e = E.get(`${it.kind === 'pill' ? 'pill' : 'mat'}:${it.ref}`); if (e) e.rows.push([L.shop, `${it.price} ${L.coin} / ${it.n}`]); }
  // Linh thú, thú cưỡi, thời trang
  for (const [k, p] of own(D.pets?.pets)) add('pet', k, p.name, { color: p.color, desc: p.desc, rows: [[L.evo, p.evo]] });
  for (const [k, p] of own(D.pets?.mounts)) add('mount', k, p.name, { color: p.color, desc: p.desc, rows: [[L.speed, p.speed ? `+${Math.round(p.speed * 100)}%` : null]] });
  for (const [k, f] of own(D.fashion?.list)) add('outfit', k, f.name, { color: f.robe, rows: [[L.price, f.from?.shop ? `${f.from.shop.toLocaleString('vi-VN')} ${L.coin}` : f.from?.tn ? `${f.from.tn} ${L.gem}` : null]] });

  for (const e of E.values()) {
    if (e.drop) e.rows.push([L.drop_from, e.drop.map(([m, p]) => `${E.get(mobId(m))?.name || m} ${pct(p)}`).join(', ')]);
    if (e.recipe) e.rows.push([L.recipe, e.recipe.map(([m, n]) => `${E.get(`mat:${m}`)?.name || m} ×${n}`).join(', ')]);
    e.rows = e.rows.filter(r => r[1] != null && r[1] !== '');
    e.n = norm(e.name); e.hay = norm(`${e.name} ${e.desc || ''}`);
  }
  const list = [...E.values()], same = new Map();
  for (const e of list) { const o = same.get(e.n); if (o) rel(o.id, e.id); else same.set(e.n, e); }   // boss và NPC cùng tên: nối nhau
  // Tên để nối chữ: dài trước (Hỏa Long Kiếm trước Hỏa Long), bỏ tên quá ngắn dễ trùng chữ thường
  const names = list.filter(e => e.n.length >= 4).sort((a, b) => b.n.length - a.n.length);
  return (game.traIdx = { list, get: id => E.get(id), names });
}

// Tìm: trùng tên trước, rồi đầu tên, rồi chứa trong tên, rồi trong mô tả. Không dấu, không phân biệt hoa thường.
export function traSearch(idx, q, kind) {
  const n = norm(q), pool = kind ? idx.list.filter(e => e.kind === kind) : idx.list;
  if (!n) return pool.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  const sc = e => e.n === n ? 0 : e.n.startsWith(n) ? 1 : e.n.includes(n) ? 2 : e.hay.includes(n) ? 3 : n.split(' ').every(w => e.hay.includes(w)) ? 4 : 9;
  return pool.map(e => [sc(e), e]).filter(([s]) => s < 9).sort((a, b) => a[0] - b[0] || a[1].name.length - b[1].name.length).map(([, e]) => e);
}

// Chữ thường → mảnh chữ + mục: [{ t: 'chữ' } | { t: 'Hỏa Long', e }]. Mỗi mục chỉ nối lần đầu gặp trong đoạn.
export function traLink(idx, text) {
  const s = String(text || ''), ns = norm(s);
  if (!idx || ns.length !== s.length) return [{ t: s }];   // chữ đổi độ dài khi bỏ dấu (hiếm): khỏi nối, giữ nguyên
  const hits = [], seen = new Set(), used = new Uint8Array(s.length);
  for (const e of idx.names) {
    let i = ns.indexOf(e.n);
    while (i >= 0 && !seen.has(e.id)) {
      const end = i + e.n.length, okL = i === 0 || !/[a-z0-9]/.test(ns[i - 1]), okR = end >= ns.length || !/[a-z0-9]/.test(ns[end]);
      if (okL && okR && !used.subarray(i, end).some(Boolean)) { hits.push([i, end, e]); used.fill(1, i, end); seen.add(e.id); }
      i = ns.indexOf(e.n, i + 1);
    }
  }
  hits.sort((a, b) => a[0] - b[0]);
  const out = []; let at = 0;
  for (const [i, end, e] of hits) { if (i > at) out.push({ t: s.slice(at, i) }); out.push({ t: s.slice(i, end), e }); at = end; }
  if (at < s.length) out.push({ t: s.slice(at) });
  return out;
}

// Gợi ý theo người chơi: quái ở bản đồ đang đứng, cảnh giới đang tu, chiêu đang mang
export function traSuggest(game, idx) {
  const out = [], push = id => { const e = idx.get(id); if (e && !out.includes(e)) out.push(e); };
  push(`map:${game.map?.id}`);
  for (const id of idx.get(`map:${game.map?.id}`)?.rel || []) push(id);
  const r = game.save?.realm; if (r != null) { push(`realm:${r}`); push(`realm:${r + 1}`); }
  for (const k of game.save?.loadout || []) if (k) push(`skill:${k}`);
  return out.slice(0, 12);
}
