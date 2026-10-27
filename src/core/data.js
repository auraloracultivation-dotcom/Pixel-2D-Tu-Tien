// Nạp mọi file trong data/. Code chỉ đọc số liệu và nội dung từ đây, không viết cứng.
const BUILD = 'dev'; // quy trình đưa lên mạng thay bằng mã phiên bản
const FILES = ['config', 'tiles', 'elements', 'weapons', 'skills', 'mobs', 'npcs', 'realms', 'story', 'sounds', 'items', 'quests', 'techniques', 'cave', 'pets', 'daily', 'gear', 'tower', 'companions', 'side', 'shop', 'resrun', 'worldboss', 'events', 'status', 'dungeon', 'affinity', 'hints', 'fashion', 'arena', 'praise', 'garden', 'daynight', 'letters', 'fishing', 'scenic', 'home', 'weather', 'journal', 'chatter', 'kyngo', 'critters', 'social', 'cooking', 'visitors', 'heroes', 'art', 'market', 'topup', 'party', 'light', 'guild', 'starmap', 'planets', 'wildlife'];

async function getJson(path) {
  const r = await fetch(`${path}?v=${BUILD}`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`không tải được ${path}`);
  return r.json();
}

export async function loadData() {
  const data = { maps: {} };
  await Promise.all(FILES.map(async f => { data[f] = await getJson(`data/${f}.json`); }));
  await Promise.all(data.config.maps.map(async id => { data.maps[id] = await getJson(`data/maps/${id}.json`); }));
  return data;
}
