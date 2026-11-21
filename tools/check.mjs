// Kiểm tra tự động: JSON hợp lệ, không lộ khoá bí mật, file ngắn, index.html không chứa logic,
// chỉ src/net được gọi Supabase, bản đồ và kịch bản tham chiếu đúng ID trong data/.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { kyCfg, bcCfg, tnCfg, sameJson } from './ky-cfg.mjs';

const errors = [];
const SKIP = new Set(['.git', 'node_modules']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    statSync(p).isDirectory() ? walk(p, out) : out.push(p);
  }
  return out;
}

for (const file of walk('.')) {
  const ext = extname(file);
  if (!['.json', '.js', '.mjs', '.html', '.css', '.md', '.py'].includes(ext)) continue;
  const text = readFileSync(file, 'utf8');
  if (ext === '.json') {
    try { JSON.parse(text); } catch (e) { errors.push(`${file}: JSON lỗi — ${e.message}`); }
  }
  if (/service_role|sb_secret_/i.test(text) && !file.endsWith('.md') && !file.startsWith('tools')) {
    errors.push(`${file}: có dấu hiệu khoá bí mật`);
  }
  if (ext === '.js' && file.startsWith('src')) {
    const r = spawnSync(process.execPath, ['--experimental-default-type=module', '--check', file], { encoding: 'utf8' });
    if (r.status !== 0) errors.push(`${file}: lỗi cú pháp — ${(r.stderr.match(/SyntaxError[^\n]*/) || [r.stderr.trim().split('\n').pop()])[0]}`);
    if (text.split('\n').length > 400) errors.push(`${file}: quá 400 dòng, hãy tách module`);
    if (/supabase/i.test(text) && !file.startsWith(join('src', 'net'))) errors.push(`${file}: chỉ src/net/ được gọi Supabase`);
    if (file === join('src', 'render', 'draw-nguoi.js') && /\bgame\.save\b|\bsave\.[a-z]/.test(text.replace(/\/\/.*$/gm, ''))) errors.push(`${file}: hàm vẽ nhân vật dùng chung cho mình và người khác không được đọc bản lưu (game.save); ngoại hình lấy từ hồ sơ h (data/dong-bo.json), thiếu thì thêm trường vào bảng`);
    if (/online\??\.cast\b/.test(text) && !file.startsWith(join('src', 'net')) && file !== join('src', 'game', 'phat.js')) errors.push(`${file}: gửi tin hiệu ứng cho người khác chỉ qua phat() ở src/game/phat.js (một cửa), không gọi thẳng online.cast`);
  }
  if (file === 'index.html' && /<script(?![^>]*\bsrc=)[^>]*>[\s\S]*?\S[\s\S]*?<\/script>/i.test(text)) {
    errors.push('index.html: không được chứa logic inline, chỉ nạp src/main.js');
  }
}

// Tham chiếu ID giữa các file trong data/
const read = f => JSON.parse(readFileSync(join('data', f), 'utf8'));
try {
  const cfg = read('config.json'), tiles = read('tiles.json'), mobs = read('mobs.json'), npcs = read('npcs.json');
  const skills = read('skills.json'), elements = read('elements.json'), weapons = read('weapons.json'), story = read('story.json');
  const items = read('items.json'), techs = read('techniques.json'), cave = read('cave.json'), pets = read('pets.json'), daily = read('daily.json'), gear = read('gear.json'), comps = read('companions.json'), shop = read('shop.json'), wb = read('worldboss.json');
  const maps = Object.fromEntries(cfg.maps.map(id => [id, read(`maps/${id}.json`)]));
  const need = (ok, msg) => { if (!ok) errors.push(msg); };
  for (const [id, m] of Object.entries(maps)) {
    need(m.id === id, `maps/${id}: id không khớp tên file`);
    m.grid.forEach((row, y) => [...row].forEach((ch, x) => need(tiles.types[ch], `maps/${id}: ký tự lạ "${ch}" ở (${x},${y})`)));
    for (const n of m.npcs) need(npcs[n.id], `maps/${id}: NPC "${n.id}" không có trong npcs.json`);
    for (const s of m.spawners) need(mobs[s.mob], `maps/${id}: quái "${s.mob}" không có`);
    for (const r of m.rooms || []) for (const s of r.mobs) need(mobs[s.mob], `maps/${id}: quái "${s.mob}" không có`);
    for (const p of m.portals) need(maps[p.to]?.spawns[p.spawn], `maps/${id}: cổng tới ${p.to}/${p.spawn} không có`);
    need(m.spawns.vao, `maps/${id}: thiếu điểm vào "vao"`);
  }
  for (const [id, e] of Object.entries(elements)) if (!id.startsWith('_')) for (const s of e.skills) need(skills[s], `elements/${id}: chiêu "${s}" không có`);
  need(!elements._reroot || (read('npcs.json')[elements._reroot.npc] && Object.keys(elements._reroot.cost.mats).every(m => read('cave.json').materials[m])), 'elements._reroot: npc hoặc nguyên liệu sai');
  for (const [id, w] of Object.entries(weapons)) need(!w.skill || skills[w.skill], `weapons/${id}: chiêu "${w.skill}" không có`);
  for (const [id, w] of Object.entries(weapons)) for (const [sid, at] of w.more || []) need(skills[sid] && at >= 0, `weapons/${id}: chiêu thêm "${sid}" không có hoặc tầng mở sai`);
  need(weapons[cfg.start.weapon] && maps[cfg.start.map], 'config.start: vũ khí hoặc bản đồ khởi đầu không có');
  for (const [id, d] of Object.entries(items.drops)) { need(mobs[id], `items.drops: quái "${id}" không có`); need(!d.set || gear.sets[d.set[0]], `items.drops/${id}: bộ không có`); }
  for (const [id, b] of Object.entries(items.bases)) {
    need(items.slots[b.slot], `items.bases/${id}: ô "${b.slot}" không có`);
    for (const s of [...b.pool, ...Object.keys(b.main)]) need(items.stats[s], `items.bases/${id}: chỉ số "${s}" không có`);
    need(!b.art || skills[b.art], `items.bases/${id}: chiêu pháp bảo "${b.art}" không có`);
    need(!b.set || gear.sets[b.set], `items.bases/${id}: bộ "${b.set}" không có`);
  }
  for (const [id, g] of Object.entries(items.gems.types)) need(items.stats[g.stat] && g.values.length === items.gems.max_level, `items.gems/${id}: chỉ số hoặc số cấp sai`);
  const techStatsOk = new Set([...Object.keys(items.stats), 'lifesteal', 'thorns', 'regen', 'regen_pct', 'dr', 'mp_pct', 'mp_regen']);   // 4 chỉ số % của công pháp (05/11/2026)
  for (const [id, t] of Object.entries(techs.list)) for (const s of Object.keys(t.per_level)) need(techStatsOk.has(s), `techniques/${id}: chỉ số "${s}" không có`);
  for (const id of Object.keys(techs.drops)) need(mobs[id], `techniques.drops: quái "${id}" không có`);
  for (const [id, l] of Object.entries(techs.boss_drops)) { need(mobs[id], `techniques.boss_drops: quái "${id}" không có`); for (const t of l) need(techs.list[t], `techniques.boss_drops/${id}: công pháp "${t}" không có`); }
  need(techs.list[techs.starter], 'techniques.starter không có');
  const matOk = id => cave.materials[id] || items.materials[id];
  need(maps[cave.map], `cave.map: bản đồ "${cave.map}" không có`);
  for (const [mob, l] of Object.entries(cave.mat_drops)) { need(mobs[mob], `cave.mat_drops: quái "${mob}" không có`); for (const [m] of l) need(matOk(m), `cave.mat_drops/${mob}: nguyên liệu "${m}" không có`); }
  for (const [id, p] of Object.entries(cave.pills)) for (const m of Object.keys(p.recipe)) need(matOk(m), `cave.pills/${id}: nguyên liệu "${m}" không có`);
  for (const r of cave.forge) { need(items.rarities.some(x => x.id === r.min_rarity), `cave.forge/${r.id}: độ hiếm không có`); for (const m of Object.keys(r.cost)) need(matOk(m), `cave.forge/${r.id}: nguyên liệu "${m}" không có`); }
  need(cave.pills[cave.pill_button], 'cave: pill_button không có');
  const gd = read('garden.json');
  for (const [x, y] of gd.plots) need(maps[gd.map]?.grid[y][x] === 'G', `garden: ô (${x},${y}) không phải linh điền`);
  need(gd.open_cost.length === gd.plots.length - gd.start, 'garden: open_cost phải đủ cho các luống khai hoang');
  for (const [id, c] of Object.entries(gd.crops)) need(matOk(id) && Object.keys(c.seed || {}).every(matOk), `garden/${id}: cây hoặc hạt không có trong nguyên liệu`);
  for (const [id, p] of Object.entries(cave.pills)) need((p.rate ?? cave.brew.default) > 0 && (p.rate ?? 0) <= 1, `cave.pills/${id}: tỉ lệ luyện sai`);
  need(matOk(items.reroll_lock.mat), 'items.reroll_lock: nguyên liệu không có');
  const af = read('affinity.json'), cl = read('companions.json').list;
  for (const g of af.gifts) need(g.kind === 'coins' || (g.kind === 'pill' ? cave.pills[g.id] : matOk(g.id)), `affinity.gifts: món "${g.id}" không có`);
  for (const [id, g] of Object.entries(af.likes)) need(cl[id] && af.gifts.some(x => x.id === g), `affinity.likes/${id}: người hoặc quà không có`);
  for (const id of [...Object.keys(af.scenes), ...Object.values(af.dao_lu.can).flat()]) need(cl[id] && npcs[id], `affinity: "${id}" không phải bạn đồng hành`);
  { const G = read('gender.json'), hl = read('heroes.json').list;   // nam / nữ: hình mặc định và đạo lữ theo giới tính
    need(G.list[G.default] && Object.entries(G.list).every(([k, g]) => hl[g.look] && af.dao_lu.can[k]?.length), 'gender: giới tính mặc định, hình (look) hoặc đạo lữ theo giới tính sai');
    const bad = readdirSync('data').filter(f => f.endsWith('.json') && f !== 'art.json').flatMap(f => (readFileSync(`data/${f}`, 'utf8').match(/\{[^{}"]*\|[^{}"]*\}/g) || []).filter(x => x.split('|').length !== 2).map(x => `${f}: ${x}`));
    need(!bad.length, `chữ {nam|nữ} viết sai: ${bad.slice(0, 3).join(', ')}`); }
  for (const [id, f] of Object.entries(read('fashion.json').list)) need(f.from.start || f.from.uid?.length || f.from.shop > 0 || f.from.tn > 0 || f.from.elite || read('status.json').achievements.some(a => a.id === f.from.achv) || f.from.fest, `fashion/${id}: nguồn có không đúng`);
  const art = read('art.json').sprites;   // hình: cỡ tấm PNG khớp art.json; khung động tác nhân vật và hiệu ứng chiêu phải có
  // cỡ ảnh: PNG (IHDR) hoặc WebP (VP8X / VP8L / VP8; hiệu ứng nhiều màu ghi WebP từ 17/11/2026)
  const imgSize = b => { if (b.toString('ascii', 0, 4) !== 'RIFF') return [b.readUInt32BE(16), b.readUInt32BE(20)];
    const k = b.toString('ascii', 12, 16);
    if (k === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
    if (k === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff]; };
  for (const [id, a] of Object.entries(art)) { const [w, h] = imgSize(readFileSync(a.file)); need(w === a.w * a.frames && h === a.h * (a.rows || 1), `art/${id}: cỡ ${a.file} không khớp w×frames, h×rows`); }
  { const H = read('heroes.json'); need(H.char_height > 0 && H.npc_cm > 0 && H.npc_kg > 0, 'heroes: thiếu char_height, npc_cm, npc_kg (người chuẩn NPC)'); }
  for (const [id, h] of Object.entries(read('heroes.json').list)) {
    if (!h.sprite) continue;
    const a = art[h.sprite];
    need(a && Object.values(h.anims).flat().every(f => f >= 0 && f < a.frames), `heroes/${id}: khung động tác vượt quá số khung của ${h.sprite}`);
    need((h.attacks || []).every(k => h.anims[k] && h.fps[k]), `heroes/${id}: động tác đánh thiếu khung hoặc fps`);
    need(h.body > 0 && a && h.body <= a.h && !('height' in h), `heroes/${id}: cần body (điểm ảnh thân người) để tính cỡ theo NPC, không dùng height riêng`);
    need(h.cm >= 100 && h.cm <= 260 && h.kg >= 25 && h.kg <= 250, `heroes/${id}: cần cm, kg (bảng chỉ số chủ dự án điền)`);
  }
  for (const [id, s] of Object.entries(skills)) need(!s.fx || art['fx.' + s.fx] || art['proj.' + s.fx], `skills/${id}: hiệu ứng fx.${s.fx} không có`);
  for (const [id, w] of Object.entries(weapons)) need(!w.fx || art['proj.' + w.fx], `weapons/${id}: hình đạn proj.${w.fx} không có`);
  for (const [id, w] of Object.entries(weapons)) need(!w.slash || art[w.slash], `weapons/${id}: vệt chém ${w.slash} không có`);
  for (const [id, h] of Object.entries(read('hints.json').buttons)) need(h.flag || story.steps.some(x => x.id === h.after), `hints/${id}: bước truyện không có`);
  const dun = read('dungeon.json');
  for (const m of dun.modes) need(!m.reward || ((!m.reward.item || items.rarities.some(r => r.id === m.reward.item)) && Object.keys(m.reward.mats || {}).every(matOk)), `dungeon/${m.id}: thưởng sai`);
  for (const [mp, st] of Object.entries(dun.story_step)) if (mp !== '_note') need(maps[mp]?.rooms?.length && story.steps.some(x => x.id === st), `dungeon.story_step/${mp}: bản đồ hoặc bước truyện sai`);
  for (const l of cave.levels.slice(1)) need(Object.keys(l.cost).every(matOk) && l.realm != null, `cave.levels/${l.name}: nguyên liệu hoặc cảnh giới sai`);
  need(Object.values(read('pets.json').pets).every(p => p.evo) && Object.keys(read('pets.json').evolve.cost).every(matOk), 'pets.evolve: thiếu tên tiến hóa hoặc nguyên liệu sai');
  need(npcs[pets.npc] && pets.pets[pets.starter_pet] && (pets.starter_mount == null || pets.mounts[pets.starter_mount]), 'pets: npc, starter_pet hoặc starter_mount không có');
  for (const [id, p] of Object.entries(pets.pets)) { need(mobs[id], `pets/${id}: quái "${id}" không có`); need(!p.mount || pets.mounts[p.mount[0]], `pets/${id}: thú cưỡi không có`); }
  for (const [id, [m]] of Object.entries(pets.mount_drops)) need(mobs[id] && pets.mounts[m], `pets.mount_drops/${id}: quái hoặc thú cưỡi không có`);
  const rewardOk = (r, where) => {
    need(!r.item || items.rarities.some(x => x.id === r.item), `${where}: độ hiếm "${r.item}" không có`);
    for (const m of Object.keys(r.mats || {})) need(matOk(m), `${where}: nguyên liệu "${m}" không có`);
    for (const m of Object.keys(r.pills || {})) need(cave.pills[m], `${where}: đan "${m}" không có`);
  };
  for (const t of daily.pool) { need(!t.mob || mobs[t.mob], `daily/${t.id}: quái "${t.mob}" không có`); rewardOk(t.reward, `daily/${t.id}`); }
  rewardOk(daily.chest, 'daily.chest');
  for (const id of Object.keys(comps.list)) need(npcs[id], `companions: NPC "${id}" không có`);
  need(npcs[shop.npc], 'shop: NPC không có');
  for (const r of items.rarities) need(shop.sell[r.id] != null, `shop.sell: thiếu giá phẩm "${r.id}"`);
  for (const x of shop.items) need(x.kind === 'gem' || (x.kind === 'skill' ? skills[x.ref]?.type : x.kind === 'pill' ? cave.pills[x.ref] : matOk(x.ref)), `shop: món "${x.ref}" không có`);
  const tb = read('realms.json').tribulation;
  for (const b of tb.by_realm) need(tb.kinds[b.kind], `realms.tribulation: kiểu kiếp "${b.kind}" không có`);
  need(tb.by_realm.length >= read('realms.json').names.length - 1 && mobs['tam-ma'], 'realms.tribulation: thiếu kiếp cho cảnh giới hoặc quái tâm ma');
  for (const [m, v] of Object.entries(wb.maps)) for (const id of [v].flat()) need(maps[m] && mobs[id]?.ai === 'boss', `worldboss: ${m} → ${id} không đúng`);
  // Tinh đồ: mọi thiên thể trỏ đúng bản đồ, mọi bản đồ bay tới được đều có trên tinh đồ, quỹ đạo nằm trong vòng ma khí
  const sm = read('starmap.json'), smMaps = new Set(), nRealm = read('realms.json').names.length;
  need(sm.orbits.first + sm.orbits.step * (Math.max(...sm.bodies.map(b => b.orbit)) - 1) < 1 && sm.makhi.from < 1, 'starmap: quỹ đạo ngoài cùng hoặc ma khí vượt khung');
  for (const b of sm.bodies) {
    need(sm.kinds[b.kind] && b.orbit >= 1 && b.size > 0 && (b.map ? maps[b.map] : b.id && b.name) && (b.realm == null || b.realm < nRealm), `starmap/${b.map || b.id}: kiểu, quỹ đạo, bản đồ hoặc cảnh giới sai`);
    for (const m of [b, ...(b.moons || [])]) if (m.map) { need(!smMaps.has(m.map) && maps[m.map] && sm.kinds[m.kind], `starmap/${m.map}: trùng hoặc không có`); smMaps.add(m.map); }
  }
  for (const [id, m] of Object.entries(maps)) need(!m.world || smMaps.has(id), `maps/${id}: có world nhưng không có trên tinh đồ (starmap.json)`);
  for (const [id, f] of Object.entries(read('fashion.json').list)) need(!f.from.elite || (maps[f.from.elite.map]?.spawners.some(sp => sp.mul > 1) && f.from.elite.n > 0), `fashion/${id}: tinh cầu không có bãi quái nhiễm ma khí`);
  need(Object.values(read('techniques.json').list).every(t => elements[t.el]), 'techniques: mỗi công pháp phải có hệ (el) hợp lệ');   // Đạo Vận mới
  { const MK = read('planets.json').makhi;   // vùng ma khí
    need(!MK || (maps[MK.map] && MK.mobs.every(id => mobs[id]) && MK.tiers.every(t => t.mul > 0 && t.w > 0 && t.tag)), 'planets.makhi: bản đồ, quái hoặc bậc ma khí sai'); }
  { const NG = read('shop.json').npc_goods || {}, cv = read('cave.json'), fa = read('fashion.json');   // món riêng của NPC
    for (const [id, g] of Object.entries(NG)) if (!id.startsWith('_')) need(npcs[id] && g.price > 0 && (g.kind === 'pill' ? cv.pills[g.id] : g.kind === 'mat' ? cv.materials[g.id] : g.kind === 'outfit' && fa.list[g.id]) && (g.kind === 'outfit' || g.per_day > 0), `shop.npc_goods/${id}: NPC, món hoặc giá sai`); }
  { const dv = read('daovan.json'), els = Object.keys(elements).filter(k => !k.startsWith('_')), extra = ['regen', 'thorns', 'lifesteal'];   // Đạo Vận
    const dvBases = Object.entries(items.bases).filter(([, b]) => b.dv);
    need(new Set(dvBases.map(([, b]) => b.slot)).size === Object.keys(items.slots).length && dvBases.length === Object.keys(items.slots).length, 'daovan: phải đủ mỗi ô một món Đạo Vận');
    for (const [id, b] of dvBases) need(!b.art_by_el || els.every(e => skills[b.art_by_el[e]]), `items.bases/${id}: chiêu pháp bảo theo hệ thiếu`);
    need(Object.entries(dv.pet_el).every(([p, e]) => pets.pets[p] && els.includes(e)) && Object.keys(dv.bonus).every(e => els.includes(e)) && Object.values(dv.bonus).every(t => Object.values(t).every(b => Object.keys(b).every(s => items.stats[s] || extra.includes(s)))), 'daovan: linh thú, hệ hoặc chỉ số thưởng bộ sai');
    for (const [i, st] of dv.steps.entries()) need(dv.need_text[st.need.type] && st.need.n > 0 && (!st.give.slot || items.slots[st.give.slot]) && Object.keys(st.give.mats || {}).every(matOk) && (!st.give.flag || read('status.json').achievements.some(a => a.need.flag === st.give.flag)) && (i === 0 || st.day >= dv.steps[i - 1].day), `daovan.steps[${i}]: việc, thưởng hoặc ngày sai`);
    need(new Set(dv.steps.filter(s => s.give.slot).map(s => s.give.slot)).size === Object.keys(items.slots).length && matOk(dv.reroll.mat) && items.rarities.some(r => r.id === dv.rarity), 'daovan: con đường phải cho đủ mỗi ô trang bị, nguyên liệu đổi hệ, độ hiếm phải có'); }
  { const sl = cfg.skill_lv; need(sl.book_base === 1 && sl.book_r === 1.25 && sl.max === 30 && sl.mat === 'bi-kip-chieu', 'config.skill_lv: giá sách / cấp tối đa đổi thì sửa cả p2d_sach_cap, p2d_kiem_cap_chieu (supabase/migrations 20261028120000)'); }
  const dm = read('demon.json');
  need(maps[dm.map]?.demon && maps[dm.map].rooms?.some(r => r.boss) && dm.bosses.every(x => mobs[x.mob]?.ai === 'boss' && x.name) && /^\d{4}-\d\d-\d\d$/.test(dm.epoch) && new Date(dm.epoch + 'T00:00:00Z').getUTCDay() === 1 && dm.need_realm < nRealm && sm.bodies.some(b => b.map === dm.map), 'demon: bản đồ, boss, ngày bắt đầu (thứ Hai) hoặc tinh đồ sai');
  const wl = read('wildlife.json');
  for (const [mp, list] of Object.entries(wl.maps)) for (const [k, n] of list) need(maps[mp] && wl.kinds[k] && n > 0, `wildlife/${mp}: bản đồ hoặc kiểu thú "${k}" sai`);
  const ev =read('events.json'), giftOk = g => (!g.item || items.rarities.some(r => r.id === g.item)) && (g.tier == null || (g.item && items.line_tiers.list[g.tier])) && Object.keys(g).every(k => ['coins', 'stones', 'gem', 'item', 'tier', 'qi', 'contrib', 'mats', 'pills', 'thu_lenh'].includes(k));   // thu_lenh: Thú Lệnh quầy Tiên Ngọc, máy chủ cộng (22/11/2026)   // tier: màu dòng định sẵn (rương Tiên phẩm, 17/11/2026)
  for (const w of ev.weekly) need((w.mul || w.points) && (w.milestones || []).every(m => giftOk(m.give)), `events/${w.id}: thiếu mul/points hoặc thưởng mốc sai`);
  const tp = read('topup.json'), fl = read('fashion.json').list;
  for (const x of tp.shop) need(x.tn > 0 && (x.outfit ? fl[x.outfit]?.from.tn === x.tn : giftOk(x.give)), `topup/${x.id}: giá, thời trang hoặc quà sai`);
  need(tp.card.days > 0 && giftOk(tp.card.daily.give) && tp.packs.every(p => p.tn > 0 && p.vnd > 0), 'topup: thẻ tháng hoặc gói nạp sai');
  // Số máy chủ phải khớp data/: giá Tiên Ngọc, quà, ngưỡng chỉ số trang bị, độ hiếm, thuế chợ (migration mới nhất có câu insert/hàm đó)
  const migs = readdirSync('supabase/migrations').filter(f => f.endsWith('.sql')).sort().map(f => readFileSync(join('supabase/migrations', f), 'utf8'));
  const lastWith = re => [...migs].reverse().find(t => re.test(t)) || '';
  const tuples = (sql, table) => { const m = sql.match(new RegExp(`insert into public\\.${table} [^;]*?values([\\s\\S]*?)on conflict`)); return m ? [...m[1].matchAll(/\(([^()]*)\)/g)].map(x => x[1].split(',').map(v => v.trim().replace(/^'|'$/g, ''))) : []; };
  const tnRows = Object.fromEntries(tuples(lastWith(/insert into public\.p2d_tn_gia/), 'p2d_tn_gia').map(([k, v]) => [k, +v]));
  for (const x of tp.shop) need(tnRows[x.id] === x.tn, `topup/${x.id}: giá ${x.tn} khác giá trên máy chủ (p2d_tn_gia: ${tnRows[x.id]})`);
  need(tnRows._qua_ra_mat === tp.starter && tnRows._the_ngay === tp.card.daily.tn && tnRows._the_ngay_lt === (tp.card.daily.give.coins || 0), 'topup: quà ra mắt / quà thẻ tháng khác số trên máy chủ (p2d_tn_gia)');
  const csRows = Object.fromEntries(tuples(lastWith(/insert into public\.p2d_chi_so/), 'p2d_chi_so').map(([k, a, b, c]) => [k, [+a, +b, c === 'true']]));
  for (const [k, d] of Object.entries(items.stats)) {
    const main = Math.max(0, ...Object.values(items.bases).map(b => b.main[k] || 0));
    need(csRows[k] && csRows[k][0] === main && csRows[k][1] === d.max && csRows[k][2] === !!d.pct, `items.stats/${k}: ngưỡng trên máy chủ (p2d_chi_so) không khớp: cần (${main}, ${d.max}, ${!!d.pct})`);
  }
  const phRows = Object.fromEntries(tuples(lastWith(/insert into public\.p2d_pham/), 'p2d_pham').map(([k, m, l, s]) => [k, [+m, +l, +s]]));
  for (const r of items.rarities) need(phRows[r.id] && phRows[r.id][0] === r.mult && phRows[r.id][1] === r.lines && phRows[r.id][2] === r.sockets, `items.rarities/${r.id}: hệ số, dòng, lỗ khảm khác máy chủ (p2d_pham)`);
  need(items.main_per_lvl === 0.12 && items.line_per_lvl === 0.08 && gear.enhance.max === 20 && ['iron', 'stones', 'coins', 'rate'].every(k => gear.enhance[k].length === 20) && items.bag_size === 40, 'items: main_per_lvl/line_per_lvl/gear.max/bag_size đổi thì sửa cả p2d_mon_hop_le, p2d_luu (supabase/migrations)');
  const muaSql = lastWith(/function public\.p2d_mua\(/), tax = (muaSql.match(/ceil\(v_c\.gia \* ([0-9.]+)\)/) || [])[1];
  need(+tax === read('market.json').tax, `market.tax ${read('market.json').tax} khác thuế trong hàm p2d_mua (${tax})`);
  // Tông môn: số trong data/guild.json phải khớp bảng p2d_bang_cfg trên máy chủ
  const gdd = read('guild.json'), gm = lastWith(/insert into public\.p2d_bang_cfg/).match(/values \('cfg', '(\{[^']*\})'::jsonb\)/);
  const gcfg = gm ? JSON.parse(gm[1]) : null, gkeys = ['need_realm', 'cost', 'max', 'max_pho', 'max_lao', 'checkin', 'donate', 'min_pts', 'leave_hours', 'milestones'];
  need(gcfg && gkeys.every(k => JSON.stringify(gcfg[k]) === JSON.stringify(gdd[k])), `guild: số khác bảng p2d_bang_cfg trên máy chủ (${gkeys.filter(k => !gcfg || JSON.stringify(gcfg[k]) !== JSON.stringify(gdd[k])).join(', ')}); đổi số thì thêm migration mới`);
  // Khai Hoang Tinh Cầu: số trong data/khai-hoang.json phải khớp bảng p2d_kh_cfg trên máy chủ
  const khd = read('khai-hoang.json'), khm = lastWith(/insert into public\.p2d_kh_cfg/).match(/values \('cfg', '(\{[^']*\})'::jsonb\)/);
  const khc = khm ? JSON.parse(khm[1]) : null, khk = ['mat', 'ring', 'per_ring', 'ten_max', 'lose_wait', 'fight_min', 'fight_max', 'idle_days', 'empty_days', 'levels'];
  need(khc && khk.every(k => JSON.stringify(khc[k]) === JSON.stringify(khd[k])) && JSON.stringify(khc.dat) === JSON.stringify(Object.keys(khd.grounds))
    && JSON.stringify(khc.ct) === JSON.stringify(Object.fromEntries(Object.entries(khd.ct).map(([k, v]) => [k, { lt: v.lt, loai: v.loai }])))
    && JSON.stringify(khc.do) === JSON.stringify(khd.do) && khc.do_lt === khd.do_lt && khc.kc_wait === khd.kc_wait
    && JSON.stringify(khc.anh) === JSON.stringify(Object.fromEntries(Object.entries(khd.anh).filter(([k]) => !k.startsWith('_'))))
    && JSON.stringify(khc.loai_anh) === JSON.stringify([...new Set(Object.values(khd.ct).filter(c => c.loai === 'cn').map(c => c.npc))].sort().concat('nha')), `khai-hoang: số khác bảng p2d_kh_cfg trên máy chủ; đổi số thì thêm migration mới`);
  // Tiềm năng, sách Kỹ năng: máy chủ quay huyết mạch và kiểm sách theo bảng p2d_ky_cfg dòng 'tn' (tools/ky-cfg.mjs tn dựng); đổi tộc, điểm, kỹ năng, mốc, bước truyện thì thêm migration mới
  { const m = lastWith(/insert into public\.p2d_ky_cfg[^;]*values \('tn'/).match(/values \('tn', '(\{[^']*\})'::jsonb\)/);
    need(m && sameJson(JSON.parse(m[1]), tnCfg(read)), 'tiem-nang / ky-nang / story: số khác bảng p2d_ky_cfg dòng tn trên máy chủ; chạy node tools/ky-cfg.mjs tn rồi thêm migration mới'); }
  // Chữ ký món: máy chủ tự tẩy luyện, cường hoá, đổi hệ theo bảng p2d_ky_cfg; số phải khớp data/ (tools/ky-cfg.mjs dựng)
  { const km = lastWith(/insert into public\.p2d_ky_cfg[^;]*values \('cfg'/).match(/values \('cfg', '(\{[^']*\})'::jsonb\)/), want = kyCfg(read);
    need(km && sameJson(JSON.parse(km[1]), want), 'items / gear / elements / daovan: số tẩy luyện, cường hoá, đổi hệ khác bảng p2d_ky_cfg trên máy chủ; chạy node tools/ky-cfg.mjs rồi thêm migration mới');
    need(items.ky_mon?.busy && items.ky_mon.err?.other, 'items.ky_mon: thiếu chữ báo');
    // Mức nhận đồ rơi mới (migration 20261105030000_p2d_ky_roi.sql): thùng Thiên phải chứa đủ một túi và hồi đủ thưởng bí cảnh mỗi ngày
    const rb = items.drop_budget, dg = read('dungeon.json'), nDun = Object.keys(dg.drops).filter(k => !k.startsWith('_')).length, rids = items.rarities.map(r => r.id);
    need(rb && ['phut', 'gio', 'tran'].every(k => rids.every(r => rb[k][r] >= 0)) && rb.tran.thien >= items.bag_size && rb.gio.thien * 24 >= dg.per_day * nDun
      && rb.mau.t >= 0 && rb.mau.tran > 0 && rb.nang >= 1 && rb.nho > 0 && read('config.json').guard.texts.roi?.includes('{n}'),
      `items.drop_budget: thiếu số, thùng Thiên < túi (${items.bag_size}) hoặc hồi Thiên mỗi ngày < thưởng bí cảnh (${dg.per_day} × ${nDun}), hoặc thiếu chữ config.guard.texts.roi`); }
  // Thưởng bí cảnh: máy chủ không tính thưởng cấp và Linh Thạch rơi của lượt bí cảnh vào thùng hạn mức (p2d_mien_bi_canh, bảng p2d_ky_cfg
  // dòng 'bi_canh'); đổi dungeon.json, quái trong phòng bí cảnh, shop.drop, sự kiện tuần mà không thêm migration thì người chơi thật bị cờ linh_thach
  { const bm = lastWith(/insert into public\.p2d_ky_cfg[^;]*values \('bi_canh'/).match(/values \('bi_canh', '(\{[^']*\})'::jsonb\)/);
    need(bm && sameJson(JSON.parse(bm[1]), bcCfg(read)), "dungeon / mobs / maps / shop.drop / events.weekly: thưởng bí cảnh khác bảng p2d_ky_cfg dòng 'bi_canh' trên máy chủ; chạy tools/ky-cfg.mjs bcCfg rồi thêm migration mới"); }
  // Sự kiện giới thiệu, thưởng góp ý: số trong data/referral.json phải khớp hàm p2d_gt_luat, p2d_gop_y_thuong trên máy chủ
  const rf = read('referral.json'), gt = lastWith(/function public\.p2d_gt_luat/), gtv = k => +(gt.match(new RegExp(`'${k}', (\\d+)`)) || [])[1];
  need(gt.includes(`'${rf.starts}'::timestamptz`) && gt.includes(`'${rf.ends}'::timestamptz`) && gtv('phut') === rf.minutes && gtv('ngat_phut') === rf.gap && gtv('cap_gt') === rf.gem_ref && gtv('cap_moi') === rf.gem_new && gtv('nhap_ngay') === rf.join_days, 'referral: ngày, số phút, cấp ngọc khác hàm p2d_gt_luat trên máy chủ (supabase/migrations)');
  need(lastWith(/function public\.p2d_gop_y_thuong/).includes(`':${rf.fame.gem}'`) && rf.gems.every(t => items.gems.types[t]), 'referral.fame.gem khác cấp ngọc trong p2d_gop_y_thuong, hoặc gems có loại ngọc lạ');
  // Điểm danh: số quà trong data/checkin.json phải khớp hàm p2d_dd_luat trên máy chủ
  const cki = read('checkin.json'), ckm = lastWith(/function public\.p2d_dd_luat/).match(/select '(\{[^']*\})'::jsonb/);
  need(ckm && JSON.stringify(JSON.parse(ckm[1])) === JSON.stringify(cki.rules), 'checkin.rules khác hàm p2d_dd_luat trên máy chủ (supabase/migrations); đổi số thì thêm migration mới');
  need(['m7', 'm28', 'm112'].every(k => cki.names[k] && cki.mail['diem_danh_' + k] && cki.rules[k]?.moi > 0) && cki.mail.diem_danh_ngay && cki.rules.vong > 0, 'checkin: thiếu tên mốc, tiêu đề thư hoặc số ngày mốc');
  // Pháp bảo hạ cấp hoàn Linh Thạch (migration p2d_pb_ha_cap): giá nâng cấp, trần cấp, tỉ lệ hoàn trong hàm máy chủ phải khớp data/phap-bao.json → level
  { const L = read('phap-bao.json').level, t = lastWith(/function public\.p2d_pb_gia/);
    if (t) {
      need(t.includes(`round(${L.base} * power(${L.grow}::numeric, p_lv) * (1 + 0.5 *`), 'phap-bao.json level.base / grow khác hàm p2d_pb_gia trên máy chủ: thêm migration thay hàm');
      need(t.includes(`v_cap int[] := '{${L.cap.join(',')}}'`), 'phap-bao.json level.cap khác hàm p2d_pb_nang_cap: thêm migration thay hàm');
      need(t.includes(`floor(${L.refund} * coalesce(v_tra, 0))`), 'phap-bao.json level.refund khác hàm p2d_pb_ha_cap: thêm migration thay hàm');
      need(JSON.stringify(read('phap-bao.json').grades.map(g => g.id)) === JSON.stringify(['pham', 'linh', 'huyen', 'dia', 'thien']) && t.includes("array['pham', 'linh', 'huyen', 'dia', 'thien']"), 'phap-bao.json grades khác danh sách phẩm trong p2d_pb_gia');
    }
  }
  // Triệu hồi chia bậc (he-thong.json → bac, pool[].b; việc 6 dòng 18a): bậc hợp lệ, tỉ lệ các bậc cộng đủ 100, món bậc báo kênh thế giới có tên; bảng trong
  // migration mới nhất (chuỗi sinh bằng tools/he-thong-sql.py bac) phải khớp data, kẻo bảng tỉ lệ người chơi thấy khác bảng máy chủ quay
  { const H = read('he-thong.json'), B = H.bac;
    if (B) {
      const n = B.list.map((_, i) => H.pool.filter(e => (e.b || 0) === i).length);
      need(H.pool.every(e => Number.isInteger(e.b) && e.b >= 0 && e.b < B.list.length) && n.every(k => k > 0) && Math.abs(B.list.reduce((a, t) => a + t.pct, 0) - 100) < 1e-9, 'he-thong.bac: mỗi món phải có bậc b hợp lệ, bậc nào cũng có món, tỉ lệ các bậc cộng lại 100');
      need(H.pool.filter(e => e.b >= B.loa).every(e => B.ten[e.id]) && B.bao_hiem.hiem > 1 && B.bao_hiem.cuc > B.bao_hiem.hiem && B.lvl.length === B.list.length, 'he-thong.bac: món bậc báo kênh thế giới thiếu tên (ten), hoặc bảo hiểm / cỡ nghi lễ sai');
      const mg = lastWith(/update public\.p2d_ht_cfg set v = v \|\| '\{"pool"/), m = mg && mg.match(/update public\.p2d_ht_cfg set v = v \|\| '(\{"pool"[^']*\})'::jsonb where k = 'cfg'/), srv = m && JSON.parse(m[1]);
      const pool = H.pool.map(e => { const { w, ...o } = e; return { ...o, b: e.b, w: Math.round(B.list[e.b].pct / n[e.b] * 1e6) / 1e6 }; });
      need(srv && sameJson(srv.pool, pool) && sameJson(srv.bh, B.bao_hiem) && sameJson(srv.loa, { b: B.loa, ten: B.ten }), 'he-thong.bac / pool: bảng quà chia bậc khác migration mới nhất (chạy python3 tools/he-thong-sql.py bac rồi thêm migration mới)');
      need(!B.on || (srv && srv.qua_dau === H.qua_dau.diem), 'he-thong.qua_dau.diem khác số quà gặp mặt trong migration triệu hồi chia bậc');
    } }
  const rl = read('realms.json'), lk = lastWith(/function public\.p2d_tong_lk/).match(/round\((\d+) \* power\(([\d.]+), least\(i, (\d+)\)\) \* power\(([\d.]+), greatest/);
  need(lk && +lk[1] === rl.qi_base && +lk[2] === rl.qi_growth && +lk[3] === rl.qi_soft_from && +lk[4] === rl.qi_soft_growth, 'realms: linh khí mỗi tầng khác hàm p2d_tong_lk trên máy chủ (hạn mức linh khí); đổi số thì thêm migration mới');
  // Bảng linh khí riêng từng tầng (realms.need_layer, việc 6 dòng 18d): đủ số tầng, tăng dần, và không tầng nào cần ít hơn công thức gốc của máy chủ
  // (máy khách cần ít hơn thì mỗi lần lên tầng máy chủ thấy tổng linh khí nhảy vọt, cắt và ghi cờ người chơi thật)
  { const goc = i => Math.round(rl.qi_base * rl.qi_growth ** Math.min(i, rl.qi_soft_from) * rl.qi_soft_growth ** Math.max(0, i - rl.qi_soft_from));
    need(Object.entries(rl.need_layer || {}).every(([r, a]) => rl.names[+r] && Array.isArray(a) && a.length === rl.layers
      && a.every((v, i) => v > 0 && (i === 0 || v > a[i - 1]) && v * (rl.need_mul?.[+r] ?? 1) >= goc(+r * rl.layers + i))),
    'realms.need_layer: mỗi cảnh giới phải đủ số tầng, tăng dần, không tầng nào thấp hơn công thức gốc (qi_base × qi_growth^n) mà máy chủ đang tính'); }
  need(['chu', 'pho', 'lao', 'de'].every(r => gdd.roles[r]) && ['home', 'members', 'chat', 'find'].every(t => gdd.tabs[t]), 'guild: thiếu tên chức vụ hoặc tên tab');
  const pt = read('party.json');
  need(read('npcs.json')[pt.npc] && maps[pt.home] && maps[pt.home].npcs.some(n => n.id === pt.npc) && pt.max >= 2, 'party: npc, đảo về hoặc số người sai');
  { const df = read('doi-farm.json'), ds = lastWith(/function public\.p2d_doi_vao/);   // tổ đội farm: số người tối đa, độ dài tên khớp máy chủ
    need(ds.includes(`>= ${df.max} then raise exception 'day'`) && ds.includes(`'max', ${df.max})`) && ds.includes(`char_length(v_ten) < ${df.name_min} or char_length(v_ten) > ${df.name_max}`) && df.pct_each > 0 && df.show >= 1,
      'doi-farm: max / name_min / name_max khác hàm p2d_doi_* trên máy chủ (supabase/migrations); đổi số thì thêm migration mới'); }
  const mk = read('market.json');
  need(read('npcs.json')[mk.npc] && Object.values(maps).some(m => m.npcs.some(n => n.id === mk.npc)) && mk.tax > 0 && mk.tax < 1 && items.rarities.every(r => mk.price.item[r.id] > 0), 'market: npc, thuế hoặc giá gợi ý sai');
  const stt = read('status.json'), kinds = ['realm', 'kills', 'bosses', 'rares', 'tower', 'arena', 'coins', 'pets', 'techs', 'comps', 'power', 'flag', 'fish', 'lantern', 'pat', 'tea', 'cook', 'sit'];
  need(stt.auras.length >= read('realms.json').names.length, 'status.auras: thiếu hào quang cho cảnh giới');
  for (const a of stt.achievements) need(kinds.includes(a.need.type) && (!a.title || stt.titles[a.title]) && (!a.give.item || items.rarities.some(r => r.id === a.give.item)), `status/${a.id}: điều kiện, danh hiệu hoặc thưởng sai`);
  const gr = read('home.json').greet;
  need(gr && ['night', 'morning'].every(k => gr[k].hours.length === 2 && gr[k].lines.default?.length), 'home.greet: thiếu giờ hoặc câu mặc định');
  const vis = read('visitors.json'), vnpc = read('npcs.json'), vmat = read('cave.json').materials;
  for (const [id, v] of Object.entries(vis.strangers)) need(vnpc[id] && v.stories.length && (!v.trade || Object.keys(v.trade.mats).every(m => vmat[m])), `visitors/${id}: thiếu NPC, chuyện kể hoặc hàng sai`);
  for (const who of Object.keys(read('letters.json').lines)) need(npcs[who], `letters: "${who}" không phải NPC`);
  const dn = read('daynight.json').phases;
  need(dn[0].from === 0 && dn.every((p, i) => !i || p.from > dn[i - 1].from), 'daynight: pha phải bắt đầu từ 0 giờ và tăng dần');
  for (const [id, f] of Object.entries(read('fishing.json').fish)) need(cave.materials[id] && (f.maps || []).every(m => maps[m]) && (!f.season || read('weather.json').seasons.some(s => s.id === f.season)), `fishing/${id}: cá hoặc đảo không có`);
  const pr = read('praise.json');
  for (const [who, set] of Object.entries(pr.lines)) need(who === 'default' || npcs[who], `praise: "${who}" không phải NPC`);
  for (const k of [...pr.big, ...pr.small]) need(pr.lines.default[k]?.length, `praise: thiếu câu mặc định cho "${k}"`);
  for (const k of ['multi', 'elite', 'clutch', 'streak', 'hurt', 'fight']) need(pr.lines.default[k]?.length, `praise.fight: thiếu câu mặc định cho "${k}"`);
  need(pr.fight.multi.n > 1 && pr.fight.streak_every > 0 && pr.fight.fight_every > 0 && pr.fight.cd.dao_lu > 0 && pr.fight.cd.comp > 0, 'praise.fight: số sai');
  const e = gear.enhance;
  need(['iron', 'stones', 'rate'].every(k => e[k].length === e.max), 'gear.enhance: iron/stones/rate phải đủ max phần tử');
  for (const [id, s] of Object.entries(gear.sets)) for (const b of Object.values(s.bonus)) for (const k of Object.keys(b)) need(techStatsOk.has(k), `gear.sets/${id}: chỉ số "${k}" không có`);
  const both = v => String(v).match(/^\{([^|{}]*)\|([^|{}]*)\}$/)?.slice(1) || [v];   // {nam|nữ}: kiểm cả hai
  for (const s of story.steps) {
    need(!s.map || maps[s.map], `story/${s.id}: bản đồ "${s.map}" không có`);
    need(typeof s.target !== 'string' || maps[s.target_map || s.map]?.moc?.[s.target], `story/${s.id}: mốc "${s.target}" không có trong moc của bản đồ`);   // ô đích theo tên mốc (docs/12-LUAT-THE-GIOI.md)
    for (const a of s.do || []) {
      if (a.say) for (const [w] of a.say) for (const who of both(w)) need(!who || who === 'he-thong' || npcs[who], `story/${s.id}: NPC "${who}" không có`);
      if (a.spawn && !a.fly) need(mobs[a.spawn], `story/${s.id}: quái "${a.spawn}" không có`);
      if (a.fly) need(maps[a.fly], `story/${s.id}: bản đồ "${a.fly}" không có`);
      if (a.weapon) for (const w of both(a.weapon)) need(weapons[w], `story/${s.id}: vũ khí "${w}" không có`);
      if (a.npc_add) for (const n of both(a.npc_add)) need(npcs[n], `story/${s.id}: NPC "${n}" không có`);
      for (const b of (a.gear || []).flatMap(both)) need(items.bases[b], `story/${s.id}: trang bị "${b}" không có`);
      if (a.reward?.base) for (const b of both(a.reward.base)) need(items.bases[b], `story/${s.id}: phần thưởng "${b}" không có`);
      if (a.pickups) need(items.quest_items[a.pickups], `story/${s.id}: vật nhặt "${a.pickups}" chưa có trong items.quest_items`);
      if (a.with) for (const n of both(a.with)) need(npcs[n], `story/${s.id}: NPC "${n}" không có`);
      for (const m of Object.keys(a.mats || {})) need(cave.materials[m] || items.materials[m], `story/${s.id}: nguyên liệu "${m}" không có`);
      for (const m of Object.keys(a.pills || {})) need(cave.pills[m], `story/${s.id}: đan "${m}" không có`);
      if (a.technique) need(techs.list[a.technique], `story/${s.id}: công pháp "${a.technique}" không có`);
    }
    if (s.until.talk) for (const n of both(s.until.talk)) need(npcs[n], `story/${s.id}: NPC "${n}" không có`);
    if (s.until.kill) need(mobs[s.until.kill], `story/${s.id}: quái "${s.until.kill}" không có`);
  }
} catch (e) {
  errors.push(`Kiểm tra tham chiếu lỗi — ${e.message}`);
}

// Trang, file tĩnh mà các trang HTML trỏ tới phải nằm trong danh sách chép lên trang game (tools/goi.mjs → TINH; script này dùng chung
// cho GitHub Pages và Vercel từ 20/11/2026, trước đó hai nơi mỗi nơi một danh sách và từng lệch nhau: 02/11, 11/11/2026)
{
  const deploy = JSON.parse((readFileSync('tools/goi.mjs', 'utf8').match(/export const TINH = (\[[^\]]*\])/)?.[1] || '[]').replace(/'/g, '"'));
  if (!deploy.length) errors.push('tools/goi.mjs: không đọc được danh sách TINH (tệp tĩnh chép lên trang game)');
  for (const f of deploy) if (!existsSync(f)) errors.push(`tools/goi.mjs chép ${f} nhưng kho không có tệp này`);
  for (const page of ['index.html', ...deploy.filter(f => f.endsWith('.html'))]) {
    for (const [, f] of readFileSync(page, 'utf8').matchAll(/(?:href|src)="([\w-]+\.(?:html|css))"/g)) {
      if (!deploy.includes(f)) errors.push(`${page} trỏ tới ${f} nhưng tools/goi.mjs không chép file này lên trang game`);
    }
  }
  for (const css of deploy.filter(f => f.endsWith('.css'))) {   // tệp @import trong tệp kiểu ở gốc (02/11/2026: style-ui-kit*.css bị sót, trên mạng không thấy khung mới)
    for (const [, f] of readFileSync(css, 'utf8').matchAll(/@import url\("([\w-]+\.css)"\)/g)) {
      if (!deploy.includes(f)) errors.push(`${css} @import ${f} nhưng tools/goi.mjs không chép file này lên trang game`);
    }
  }
  // Hai nơi đưa lên đều phải gọi script gói chung, không tự chép tay
  for (const f of ['.github/workflows/pages.yml', 'tools/build-site.sh']) if (!/node tools\/goi\.mjs/.test(readFileSync(f, 'utf8'))) errors.push(`${f} phải gọi node tools/goi.mjs để gói bản đưa lên`);
  // Code không tự suy đường dẫn, số phiên bản từ vị trí tệp (bản gói nhập nhiều tệp làm một): dùng src/core/build.js
  for (const f of walk('src').filter(f => f.endsWith('.js') && !f.includes('vendor') && !f.endsWith('core/build.js'))) if (/import\.meta\.url/.test(readFileSync(f, 'utf8'))) errors.push(`${f} dùng import.meta.url: bản đưa lên được gói lại nên phải dùng goc() / BUILD ở src/core/build.js`);
}

// Đa ngôn ngữ (data/i18n/<ngôn ngữ>.json, src/core/i18n.js): bản dịch phải giữ đủ chỗ trống {n}; in tỉ lệ đã dịch.
// Thiếu bản dịch không làm trượt kiểm tra (game tự hiện tiếng Việt), nhưng nên dịch bù: node tools/i18n-extract.mjs --missing en
{
  const { collect, PH } = await import('./i18n-extract.mjs');
  const keys = [...collect('.').keys()], cov = [];
  for (const f of readdirSync(join('data', 'i18n')).filter(f => f.endsWith('.json'))) {
    const d = JSON.parse(readFileSync(join('data', 'i18n', f), 'utf8'));
    for (const [k, v] of Object.entries(d)) if (!k.startsWith('_') && PH(k) !== PH(v)) errors.push(`data/i18n/${f}: bản dịch của "${k.slice(0, 50)}" làm mất / đổi chỗ trống {…}`);
    cov.push(`${f.replace('.json', '')} ${(keys.filter(k => d[k]).length / keys.length * 100).toFixed(1)}%`);
  }
  console.log(`Đa ngôn ngữ: ${keys.length} câu, đã dịch ${cov.join(', ')}`);
}

// Tệp quy trình GitHub (.github/workflows/*.yml): lệnh `run:` viết một dòng mà có dấu hai chấm + cách (ví dụ trong chuỗi echo) là YAML hỏng,
// GitHub bỏ cả tệp, không chạy kiểm tra nào mà Pull Request vẫn hiện gộp được (20/11/2026: lỗi này lọt vì ở máy không có gì đọc thử YAML).
for (const f of existsSync(join('.github', 'workflows')) ? readdirSync(join('.github', 'workflows')).filter(f => /\.ya?ml$/.test(f)) : []) {
  const yml = readFileSync(join('.github', 'workflows', f), 'utf8');
  for (const job of yml.replace(/^\s*#.*$/gm, '').split(/\n {2}(?=[\w-]+:\n)/).slice(1)) if ((job.match(/npm (i|install) --no-save/g) || []).length > 1) errors.push(`.github/workflows/${f}: một việc có hai lệnh npm i --no-save; lệnh sau gỡ gói của lệnh trước, hãy cài chung một lệnh`);
  readFileSync(join('.github', 'workflows', f), 'utf8').split('\n').forEach((l, i) => {
    const m = /^\s*(?:-\s+)?(run|name):\s+(.*)$/.exec(l), v = m?.[2] || '';
    if (m && !/^[|>'"]/.test(v) && /:\s|:$|\s#/.test(v)) errors.push(`.github/workflows/${f} dòng ${i + 1}: giá trị ${m[1]} có dấu hai chấm (hoặc dấu # sau khoảng trắng) mà không nằm trong nháy / khối |: YAML hỏng, GitHub sẽ bỏ cả tệp`);
  });
}

// Một nguồn cho "người khác thấy gì" (data/dong-bo.json): bản sao của máy chủ phòng khớp bảng, trường nào cũng có nơi lấy giá trị
errors.push(...(await import('./dong-bo.mjs')).soat());
// Quái chung (data/config.json → quai_chung): bản sao bảng bãi của máy chủ phòng (cloud/src/quai-cfg.js) khớp data/, số luật hợp lệ
errors.push(...(await import('./quai-chung.mjs')).soat());

// Hai nhịp lưu (data/config.json → luu_hai_nhip; src/net/save-diff.js, src/net/profile.js): số nhảy gom gửi thưa, thứ quan trọng vẫn nhanh,
// không tự gây xung đột phiên bản, trang ẩn thì gửi ngay
{
  const r = spawnSync(process.execPath, [join('tools', 'kiem', 'luu-hai-nhip.test.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) { const out = (r.stderr || r.stdout).trim().split('\n'); errors.push(`lưu: bài thử hai nhịp lưu trượt — ${(out.filter(l => /Error|at file/.test(l)).slice(0, 3).join(' | ') || out.slice(0, 3).join(' | '))}`); }
}

// Máy chủ phòng Cloudflare (cloud/): bài thử thuần Node
{
  const r = spawnSync(process.execPath, [join('tools', 'cloud', 'phong.test.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) { const out = (r.stderr || r.stdout).trim().split('\n'); errors.push(`cloud: bài thử máy chủ phòng trượt — ${(out.filter(l => /Error|at file/.test(l)).slice(0, 3).join(' | ') || out.slice(0, 3).join(' | '))}`); }
  const pv = spawnSync(process.execPath, [join('tools', 'cloud', 'pvp.test.mjs')], { encoding: 'utf8' });   // trọng tài PvP (cloud/src/pvp.js)
  if (pv.status !== 0) { const out = (pv.stderr || pv.stdout).trim().split('\n'); errors.push(`cloud: bài thử trọng tài PvP trượt — ${(out.filter(l => /Error|at file/.test(l)).slice(0, 3).join(' | ') || out.slice(0, 3).join(' | '))}`); }
  const qc = spawnSync(process.execPath, [join('tools', 'cloud', 'quai.test.mjs')], { encoding: 'utf8' });   // trọng tài quái chung (cloud/src/quai.js)
  if (qc.status !== 0) { const out = (qc.stderr || qc.stdout).trim().split('\n'); errors.push(`cloud: bài thử trọng tài quái chung trượt — ${(out.filter(l => /Error|at file/.test(l)).slice(0, 3).join(' | ') || out.slice(0, 3).join(' | '))}`); }
  const qk = spawnSync(process.execPath, [join('tools', 'cloud', 'quai-kh.test.mjs')], { encoding: 'utf8' });   // quái chung tinh cầu tông môn (cloud/src/quai-kh.js, src/game/kh-bai.js)
  if (qk.status !== 0) { const out = (qk.stderr || qk.stdout).trim().split('\n'); errors.push(`cloud: bài thử quái chung tinh cầu tông môn trượt — ${(out.filter(l => /Error|at file/.test(l)).slice(0, 3).join(' | ') || out.slice(0, 3).join(' | '))}`); }
  const n = spawnSync(process.execPath, [join('tools', 'cloud', 'nhip.test.mjs')], { encoding: 'utf8' });   // nhịp sống qua phòng (cloud/src/nhip.js)
  if (n.status !== 0) errors.push(`cloud: bài thử nhịp sống trượt — ${(n.stderr || n.stdout).trim().split('\n').slice(0, 3).join(' | ')}`);
  // Ba trận giả trên ĐÚNG mã máy chủ phòng (tools/cloud/tai-chien.mjs), có mạng giả (trễ, chập chờn) và mắt máy khách giả (hình người khác đi
  // sau vị trí thật như trong game), nhịp gửi vị trí lúc giao chiến lấy từ data/config.json (realtime.pvp_ms), số ngẫu nhiên cố định (--hat)
  // nên lần nào cũng ra y một kết quả: (1) 10 vs 10 + 20 người đi dạo, mạng thường; (2) lao ra lao vào quanh mép tầm (bài thử thật trên game
  // 20/11/2026 chỉ được 56%); (3) đuổi đánh người bỏ chạy ở mép tầm nhìn thấy, mạng yếu. Phòng không được bỏ tin vì luật tốc độ và phải tính
  // gần hết đòn hợp lệ trên màn hình người đánh. Mã máy chủ phòng bản 32e571ff (trước đợt sửa đêm 20/11/2026) ra 92% / 55% / 0%. Ai nới nhịp gửi, siết luật tốc độ
  // (cloud/src/proto.js RATE), bỏ vị trí kèm đòn, bỏ bù trễ hay siết nhịp đòn (cloud/src/pvp.js, data/pvp.json → server) là bài này báo.
  const pvpMs = read('config.json').realtime?.pvp_ms;
  for (const [ten, can, ts] of [['10 vs 10', 94, ['--nguoi', '40', '--danh', '20', '--doi', '2']], ['ra vào quanh mép tầm', 97, ['--nguoi', '20', '--danh', '20', '--kieu', 'ravao']],
    ['đuổi người bỏ chạy, mạng yếu', 95, ['--nguoi', '20', '--danh', '20', '--kieu', 'duoi', '--toc', '190', '--cach', '300', '--len', '250', '--rung', '120']]]) {
    const c = spawnSync(process.execPath, [join('tools', 'cloud', 'tai-chien.mjs'), ...ts, '--giay', '20', '--vt', String(pvpMs), '--hat', '20261121'], { encoding: 'utf8' });
    let kq = null;
    try { kq = JSON.parse(c.stdout.trim().split('\n').pop()); } catch { /* không ra kết quả */ }
    if (!(pvpMs > 0) || !kq) errors.push(`cloud: trận giả "${ten}" không chạy được (pvp_ms ${pvpMs}) — ${(c.stderr || c.stdout || '').trim().split('\n').slice(-2).join(' | ')}`);
    else if (kq.bi_bo_vi_qua_nhanh_pct > 0 || kq.bi_da > 0 || !(kq.don_duoc_tinh_pct >= can)) errors.push(`cloud: trận giả "${ten}" tính sai đòn — ${kq.don_duoc_tinh_pct}% đòn được tính (cần ≥ ${can}), ${kq.bi_bo_vi_qua_nhanh_pct}% tin bị bỏ (cần 0), ${kq.bi_da} người bị đá (cần 0)`);
  }
}

// Luật chiến đấu mới (src/game/he-chien.js, data/he-chien.json): bài thử thuần Node
{
  const r = spawnSync(process.execPath, [join('tools', 'he-chien.test.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`he-chien: bài thử luật chiến đấu mới trượt — ${(r.stderr || r.stdout).trim().split('\n').filter(l => /Assertion|Error|message/.test(l)).slice(0, 3).join(' | ')}`);
}

// Chuỗi nhiệm vụ chính của truyện (data/story.json, data/tran-ma-ky.json): dữ liệu trỏ đúng người, bản đồ, ô đi được, quái, vật nhặt, tiếng (bài thử thuần Node)
{
  const r = spawnSync(process.execPath, [join('tools', 'truyen.test.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`truyen: bài thử chuỗi nhiệm vụ trượt — ${(r.stderr || r.stdout).trim().split('\n').filter(l => /Assertion|Error|message/.test(l)).slice(0, 3).join(' | ')}`);
}

// Tiềm năng (data/tiem-nang.json, src/game/tiem-nang.js): tỉ lệ tộc, khoảng quay, các tộc ngang sức, bản lưu sửa tay không vượt luật (bài thử thuần Node)
{
  const r = spawnSync(process.execPath, [join('tools', 'tiem-nang.test.mjs')], { encoding: 'utf8' });
  if (r.status !== 0) errors.push(`tiem-nang: bài thử trượt — ${(r.stderr || r.stdout).trim().split('\n').filter(l => /Assertion|Error|message/.test(l)).slice(0, 3).join(' | ')}`);
}

if (errors.length) {
  console.error('❌ Kiểm tra thất bại:\n' + errors.map(e => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('✅ Kiểm tra đạt');
