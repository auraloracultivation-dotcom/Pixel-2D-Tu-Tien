// Nạp mọi file trong data/. Code chỉ đọc số liệu và nội dung từ đây, không viết cứng.
import { ready, translateData } from './i18n.js';   // ngôn ngữ khác tiếng Việt: dịch chữ ngay khi nạp
const BUILD = 'dev'; // quy trình đưa lên mạng thay bằng mã phiên bản
const FILES = ['config', 'tiles', 'elements', 'weapons', 'skills', 'mobs', 'npcs', 'realms', 'story', 'sounds', 'items', 'techniques', 'cave', 'pets', 'daily', 'gear', 'companions', 'shop', 'worldboss', 'events', 'status', 'dungeon', 'affinity', 'hints', 'fashion', 'praise', 'garden', 'daynight', 'letters', 'fishing', 'home', 'weather', 'journal', 'chatter', 'social', 'visitors', 'heroes', 'art', 'market', 'topup', 'party', 'light', 'guild', 'starmap', 'planets', 'wildlife', 'demon', 'gender', 'daovan', 'community', 'menu', 'inbox', 'duel', 'referral', 'notice', 'checkin', 'le-hoi', 'faq', 'doi-farm', 'vfx', 'juice', 'thien-mang', 'pvp', 'he-thong'];

async function getJson(path) {
  const r = await fetch(`${path}?v=${BUILD}`, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`không tải được ${path}`);
  return r.json();
}

export async function loadData() {
  // bản đưa lên mạng: tools/build-site.sh gộp mọi file data thành data/_all.json, một lần tải thay cho gần 90 lần (màn tải đỡ kẹt)
  if (BUILD !== 'dev') try { const all = await getJson('data/_all.json'); await ready; return translateData(all); } catch { /* tải từng file như cũ */ }
  const data = { maps: {} };
  await Promise.all(FILES.map(async f => { data[f] = await getJson(`data/${f}.json`); }));
  await Promise.all(data.config.maps.map(async id => { data.maps[id] = await getJson(`data/maps/${id}.json`); }));
  await ready;
  return translateData(data);
}
