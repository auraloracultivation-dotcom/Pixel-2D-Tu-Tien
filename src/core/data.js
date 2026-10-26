// Nạp mọi file trong data/. Code chỉ đọc số liệu và nội dung từ đây, không viết cứng.
const FILES = ['config', 'tiles', 'elements', 'weapons', 'skills', 'mobs', 'npcs', 'realms', 'story'];

async function getJson(path) {
  const r = await fetch(path, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`không tải được ${path}`);
  return r.json();
}

export async function loadData() {
  const data = { maps: {} };
  await Promise.all(FILES.map(async f => { data[f] = await getJson(`data/${f}.json`); }));
  await Promise.all(data.config.maps.map(async id => { data.maps[id] = await getJson(`data/maps/${id}.json`); }));
  return data;
}
