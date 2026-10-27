// Kiểm tra tự động: JSON hợp lệ, không lộ khoá bí mật, file ngắn, index.html không chứa logic,
// chỉ src/net được gọi Supabase, bản đồ và kịch bản tham chiếu đúng ID trong data/.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { spawnSync } from 'node:child_process';

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
  const items = read('items.json'), quests = read('quests.json'), techs = read('techniques.json'), cave = read('cave.json'), pets = read('pets.json'), daily = read('daily.json'), gear = read('gear.json'), tower = read('tower.json'), comps = read('companions.json'), side = read('side.json'), shop = read('shop.json'), rr = read('resrun.json'), wb = read('worldboss.json');
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
  need(weapons[cfg.start.weapon] && maps[cfg.start.map], 'config.start: vũ khí hoặc bản đồ khởi đầu không có');
  for (const [id, d] of Object.entries(items.drops)) { need(mobs[id], `items.drops: quái "${id}" không có`); need(!d.set || gear.sets[d.set[0]], `items.drops/${id}: bộ không có`); }
  for (const [id, b] of Object.entries(items.bases)) {
    need(items.slots[b.slot], `items.bases/${id}: ô "${b.slot}" không có`);
    for (const s of [...b.pool, ...Object.keys(b.main)]) need(items.stats[s], `items.bases/${id}: chỉ số "${s}" không có`);
    need(!b.art || skills[b.art], `items.bases/${id}: chiêu pháp bảo "${b.art}" không có`);
    need(!b.set || gear.sets[b.set], `items.bases/${id}: bộ "${b.set}" không có`);
  }
  for (const [id, g] of Object.entries(items.gems.types)) need(items.stats[g.stat] && g.values.length === items.gems.max_level, `items.gems/${id}: chỉ số hoặc số cấp sai`);
  const techStatsOk = new Set([...Object.keys(items.stats), 'lifesteal', 'thorns', 'regen']);
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
  for (const id of [...Object.keys(af.scenes), ...af.dao_lu.can]) need(cl[id] && npcs[id], `affinity: "${id}" không phải bạn đồng hành`);
  for (const [id, f] of Object.entries(read('fashion.json').list)) need(f.from.start || f.from.shop > 0 || f.from.tn > 0 || read('status.json').achievements.some(a => a.id === f.from.achv) || read('events.json').festivals.some(x => x.id === f.from.fest), `fashion/${id}: nguồn có không đúng`);
  const art = read('art.json').sprites;   // hình: cỡ tấm PNG khớp art.json; khung động tác nhân vật và hiệu ứng chiêu phải có
  for (const [id, a] of Object.entries(art)) { const b = readFileSync(a.file); need(b.readUInt32BE(16) === a.w * a.frames && b.readUInt32BE(20) === a.h, `art/${id}: cỡ ${a.file} không khớp w×frames, h`); }
  for (const [id, h] of Object.entries(read('heroes.json').list)) {
    if (!h.sprite) continue;
    const a = art[h.sprite];
    need(a && Object.values(h.anims).flat().every(f => f >= 0 && f < a.frames), `heroes/${id}: khung động tác vượt quá số khung của ${h.sprite}`);
    need((h.attacks || []).every(k => h.anims[k] && h.fps[k]), `heroes/${id}: động tác đánh thiếu khung hoặc fps`);
    for (const key of ['weapon', 'fx']) {
      if (!h[key]) continue;
      const [sid, f] = h[key], b = art[sid];
      need(b && f >= 0 && f < b.frames, `heroes/${id}: ${key} ${sid} khung ${f} không có trong art`);
    }
  }
  for (const [id, s] of Object.entries(skills)) need(!s.fx || art['fx.' + s.fx], `skills/${id}: hiệu ứng fx.${s.fx} không có`);
  for (const [id, h] of Object.entries(read('hints.json').buttons)) need(h.flag || story.steps.some(x => x.id === h.after), `hints/${id}: bước truyện không có`);
  const dun = read('dungeon.json');
  for (const m of dun.modes) need(!m.reward || ((!m.reward.item || items.rarities.some(r => r.id === m.reward.item)) && Object.keys(m.reward.mats || {}).every(matOk)), `dungeon/${m.id}: thưởng sai`);
  for (const [mp, st] of Object.entries(dun.story_step)) if (mp !== '_note') need(maps[mp]?.rooms?.length && story.steps.some(x => x.id === st), `dungeon.story_step/${mp}: bản đồ hoặc bước truyện sai`);
  for (const l of cave.levels.slice(1)) need(Object.keys(l.cost).every(matOk) && l.realm != null, `cave.levels/${l.name}: nguyên liệu hoặc cảnh giới sai`);
  need(Object.values(read('pets.json').pets).every(p => p.evo) && Object.keys(read('pets.json').evolve.cost).every(matOk), 'pets.evolve: thiếu tên tiến hóa hoặc nguyên liệu sai');
  need(npcs[pets.npc] && pets.pets[pets.starter_pet] && pets.mounts[pets.starter_mount], 'pets: npc, starter_pet hoặc starter_mount không có');
  for (const [id, p] of Object.entries(pets.pets)) { need(mobs[id], `pets/${id}: quái "${id}" không có`); need(!p.mount || pets.mounts[p.mount[0]], `pets/${id}: thú cưỡi không có`); }
  for (const [id, [m]] of Object.entries(pets.mount_drops)) need(mobs[id] && pets.mounts[m], `pets.mount_drops/${id}: quái hoặc thú cưỡi không có`);
  const rewardOk = (r, where) => {
    need(!r.item || items.rarities.some(x => x.id === r.item), `${where}: độ hiếm "${r.item}" không có`);
    for (const m of Object.keys(r.mats || {})) need(matOk(m), `${where}: nguyên liệu "${m}" không có`);
    for (const m of Object.keys(r.pills || {})) need(cave.pills[m], `${where}: đan "${m}" không có`);
  };
  for (const t of daily.pool) { need(!t.mob || mobs[t.mob], `daily/${t.id}: quái "${t.mob}" không có`); rewardOk(t.reward, `daily/${t.id}`); }
  for (const r of daily.ranks) if (r.gift) rewardOk(r.gift, `daily.ranks/${r.id}`);
  for (const it of daily.shop) { rewardOk(it.give, `daily.shop/${it.id}`); need(!it.rank || daily.ranks.some(r => r.id === it.rank), `daily.shop/${it.id}: chức vị không có`); }
  rewardOk(daily.chest, 'daily.chest');
  for (const id of Object.keys(comps.list)) need(npcs[id], `companions: NPC "${id}" không có`);
  for (const [id, q] of Object.entries(side.quests)) {
    need(npcs[q.npc], `side/${id}: NPC "${q.npc}" không có`); rewardOk(q.reward, `side/${id}`);
    need(q.kind === 'kill' ? mobs[q.mob] : maps[q.map] && items.quest_items[q.item] && q.at.length >= q.n, `side/${id}: quái, bản đồ hoặc vật không có`);
    for (const [x, y] of q.at || []) need(!tiles.types[maps[q.map].grid[y][x]]?.solid, `side/${id}: ô ${x},${y} bị chắn`);
  }
  need(npcs[shop.npc] && npcs[rr.npc] && maps[rr.map]?.res, 'shop/resrun: NPC hoặc bản đồ không có');
  for (const r of items.rarities) need(shop.sell[r.id] != null, `shop.sell: thiếu giá phẩm "${r.id}"`);
  for (const x of shop.items) need(x.kind === 'gem' || (x.kind === 'pill' ? cave.pills[x.ref] : matOk(x.ref)), `shop: món "${x.ref}" không có`);
  for (const [id, k] of Object.entries(rr.kinds)) { need(mobs[k.mob], `resrun/${id}: quái không có`); for (const m of k.mats || []) need(matOk(m), `resrun/${id}: nguyên liệu "${m}" không có`); }
  const tb = read('realms.json').tribulation;
  for (const b of tb.by_realm) need(tb.kinds[b.kind], `realms.tribulation: kiểu kiếp "${b.kind}" không có`);
  need(tb.by_realm.length >= read('realms.json').names.length - 1 && mobs['tam-ma'], 'realms.tribulation: thiếu kiếp cho cảnh giới hoặc quái tâm ma');
  for (const [m, id] of Object.entries(wb.maps)) need(maps[m] && mobs[id]?.ai === 'boss', `worldboss: ${m} → ${id} không đúng`);
  const ev = read('events.json'), giftOk = g => (!g.item || items.rarities.some(r => r.id === g.item)) && Object.keys(g).every(k => ['coins', 'stones', 'gem', 'item', 'qi', 'contrib', 'mats', 'pills'].includes(k));
  for (const w of ev.weekly) need((w.mul || w.points) && (w.milestones || []).every(m => giftOk(m.give)), `events/${w.id}: thiếu mul/points hoặc thưởng mốc sai`);
  for (const f of ev.festivals) need(/^\d{4}-\d\d-\d\d$/.test(f.from) && f.from <= f.to && giftOk(f.gift), `events/${f.id}: ngày hoặc quà sai`);
  for (const f of ev.festivals.filter(x => x.candy)) need((f.mob ? mobs[f.mob] : f.drop_p > 0) && read('cave.json').materials[f.candy] && f.drop?.length === 2 && read('npcs.json')[f.npc] && maps[f.npc_map] && (f.swap || []).every(x => x.cost > 0 && giftOk(x.give)), `events/${f.id}: quái, kẹo, NPC hoặc quà đổi sai`);
  const tp = read('topup.json'), fl = read('fashion.json').list;
  for (const x of tp.shop) need(x.tn > 0 && (x.outfit ? fl[x.outfit]?.from.tn === x.tn : giftOk(x.give)), `topup/${x.id}: giá, thời trang hoặc quà sai`);
  need(tp.card.days > 0 && giftOk(tp.card.daily.give) && tp.packs.every(p => p.tn > 0 && p.vnd > 0), 'topup: thẻ tháng hoặc gói nạp sai');
  const pt = read('party.json');
  need(read('npcs.json')[pt.npc] && maps[pt.home] && maps[pt.home].npcs.some(n => n.id === pt.npc) && pt.max >= 2, 'party: npc, đảo về hoặc số người sai');
  const mk = read('market.json');
  need(read('npcs.json')[mk.npc] && Object.values(maps).some(m => m.npcs.some(n => n.id === mk.npc)) && mk.tax > 0 && mk.tax < 1 && items.rarities.every(r => mk.price.item[r.id] > 0), 'market: npc, thuế hoặc giá gợi ý sai');
  const stt = read('status.json'), kinds = ['realm', 'kills', 'bosses', 'rares', 'tower', 'arena', 'coins', 'pets', 'techs', 'comps', 'power', 'flag', 'fish', 'lantern', 'pat', 'tea', 'cook', 'sit'];
  need(stt.auras.length >= read('realms.json').names.length, 'status.auras: thiếu hào quang cho cảnh giới');
  for (const a of stt.achievements) need(kinds.includes(a.need.type) && (!a.title || stt.titles[a.title]) && (!a.give.item || items.rarities.some(r => r.id === a.give.item)), `status/${a.id}: điều kiện, danh hiệu hoặc thưởng sai`);
  const ck = read('cooking.json'), cmats = read('cave.json').materials;
  for (const [id, r] of Object.entries(ck.recipes)) need(Object.keys(r.need).every(m => cmats[m]) && r.buff.qi > 1 && r.buff.min > 0, `cooking/${id}: nguyên liệu hoặc hiệu ứng sai`);
  need(!ck.away || ck.recipes[ck.away.dish], 'cooking.away: món không có');
  const gr = read('home.json').greet;
  need(gr && ['night', 'morning'].every(k => gr[k].hours.length === 2 && gr[k].lines.default?.length), 'home.greet: thiếu giờ hoặc câu mặc định');
  const vis = read('visitors.json'), vnpc = read('npcs.json'), vmat = read('cave.json').materials;
  for (const [id, v] of Object.entries(vis.strangers)) need(vnpc[id] && v.stories.length && (!v.trade || Object.keys(v.trade.mats).every(m => vmat[m])), `visitors/${id}: thiếu NPC, chuyện kể hoặc hàng sai`);
  need(npcs[tower.npc] && maps[tower.map]?.tower, 'tower: npc hoặc bản đồ tháp không có');
  for (const who of Object.keys(read('letters.json').lines)) need(npcs[who], `letters: "${who}" không phải NPC`);
  const dn = read('daynight.json').phases;
  need(dn[0].from === 0 && dn.every((p, i) => !i || p.from > dn[i - 1].from), 'daynight: pha phải bắt đầu từ 0 giờ và tăng dần');
  for (const s of read('scenic.json').spots) { const g = maps[s.map]?.grid; need(g && !tiles.types[g[s.at[1]][s.at[0]]].solid && g[s.at[1] + 1]?.[s.at[0]] === '~', `scenic: "${s.name}" phải ở ô đi được, sát biển mây phía nam`); }
  for (const [id, f] of Object.entries(read('fishing.json').fish)) need(cave.materials[id] && (f.maps || []).every(m => maps[m]) && (!f.season || read('weather.json').seasons.some(s => s.id === f.season)), `fishing/${id}: cá hoặc đảo không có`);
  const pr = read('praise.json');
  for (const [who, set] of Object.entries(pr.lines)) need(who === 'default' || npcs[who], `praise: "${who}" không phải NPC`);
  for (const k of [...pr.big, ...pr.small]) need(pr.lines.default[k]?.length, `praise: thiếu câu mặc định cho "${k}"`);
  const ar = read('arena.json');
  need(npcs[ar.npc] && maps[ar.map]?.arena && maps[ar.back.map]?.spawns[ar.back.spawn] && ar.daily.length === ar.rivals.length, 'arena: npc, bản đồ, chỗ về hoặc thưởng ngày sai');
  ar.rivals.forEach((r, i) => need(r.rank === ar.rivals.length - i && mobs[r.base]?.person && (!r.first.item || items.rarities.some(x => x.id === r.first.item)), `arena/${r.id}: hạng, mẫu đấu sĩ hoặc thưởng sai`));
  for (const t of tower.tiers) { need(mobs[t.boss], `tower: boss "${t.boss}" không có`); for (const m of t.pool) need(mobs[m], `tower: quái "${m}" không có`); }
  for (const r of tower.reward.boss_items) need(items.rarities.some(x => x.id === r), `tower: độ hiếm "${r}" không có`);
  const e = gear.enhance;
  need(['iron', 'stones', 'rate'].every(k => e[k].length === e.max), 'gear.enhance: iron/stones/rate phải đủ max phần tử');
  for (const [id, s] of Object.entries(gear.sets)) for (const b of Object.values(s.bonus)) for (const k of Object.keys(b)) need(techStatsOk.has(k), `gear.sets/${id}: chỉ số "${k}" không có`);
  for (const b of quests.bounties) {
    need(mobs[b.mob], `quests/${b.id}: quái "${b.mob}" không có`);
    need(!b.reward.item || items.rarities.some(r => r.id === b.reward.item), `quests/${b.id}: độ hiếm "${b.reward.item}" không có`);
  }
  for (const s of story.steps) {
    need(!s.map || maps[s.map], `story/${s.id}: bản đồ "${s.map}" không có`);
    for (const a of s.do || []) {
      if (a.say) for (const [who] of a.say) need(!who || npcs[who], `story/${s.id}: NPC "${who}" không có`);
      if (a.spawn && !a.fly) need(mobs[a.spawn], `story/${s.id}: quái "${a.spawn}" không có`);
      if (a.fly) need(maps[a.fly], `story/${s.id}: bản đồ "${a.fly}" không có`);
      if (a.weapon) need(weapons[a.weapon], `story/${s.id}: vũ khí "${a.weapon}" không có`);
      if (a.npc_add) need(npcs[a.npc_add], `story/${s.id}: NPC "${a.npc_add}" không có`);
      for (const b of a.gear || []) need(items.bases[b], `story/${s.id}: trang bị "${b}" không có`);
      if (a.reward?.base) need(items.bases[a.reward.base], `story/${s.id}: phần thưởng "${a.reward.base}" không có`);
      if (a.pickups) need(items.quest_items[a.pickups], `story/${s.id}: vật nhặt "${a.pickups}" chưa có trong items.quest_items`);
      if (a.with) need(npcs[a.with], `story/${s.id}: NPC "${a.with}" không có`);
      for (const m of Object.keys(a.mats || {})) need(cave.materials[m] || items.materials[m], `story/${s.id}: nguyên liệu "${m}" không có`);
      for (const m of Object.keys(a.pills || {})) need(cave.pills[m], `story/${s.id}: đan "${m}" không có`);
      if (a.technique) need(techs.list[a.technique], `story/${s.id}: công pháp "${a.technique}" không có`);
    }
    if (s.until.talk) need(npcs[s.until.talk], `story/${s.id}: NPC "${s.until.talk}" không có`);
    if (s.until.kill) need(mobs[s.until.kill], `story/${s.id}: quái "${s.until.kill}" không có`);
  }
} catch (e) {
  errors.push(`Kiểm tra tham chiếu lỗi — ${e.message}`);
}

if (errors.length) {
  console.error('❌ Kiểm tra thất bại:\n' + errors.map(e => ' - ' + e).join('\n'));
  process.exit(1);
}
console.log('✅ Kiểm tra đạt');
