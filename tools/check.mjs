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
  const items = read('items.json'), quests = read('quests.json'), techs = read('techniques.json'), cave = read('cave.json'), pets = read('pets.json'), daily = read('daily.json');
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
  for (const [id, w] of Object.entries(weapons)) need(!w.skill || skills[w.skill], `weapons/${id}: chiêu "${w.skill}" không có`);
  need(weapons[cfg.start.weapon] && maps[cfg.start.map], 'config.start: vũ khí hoặc bản đồ khởi đầu không có');
  for (const id of Object.keys(items.drops)) need(mobs[id], `items.drops: quái "${id}" không có`);
  for (const [id, b] of Object.entries(items.bases)) {
    need(items.slots[b.slot], `items.bases/${id}: ô "${b.slot}" không có`);
    for (const s of [...b.pool, ...Object.keys(b.main)]) need(items.stats[s], `items.bases/${id}: chỉ số "${s}" không có`);
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
  need(cave.pills[cave.pill_button] && matOk(cave.garden.herb), 'cave: pill_button hoặc garden.herb không có');
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
