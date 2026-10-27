// Service worker: cho cài game lên màn hình chính và chơi lại khi mất mạng.
// Mạng trước, hỏng mạng thì lấy bản đã lưu. Mỗi bản dựng một kho riêng, kho cũ bị xoá khi bản mới chạy.
const V = 'dev';
const KHO = `p2d-${V}`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('p2d-') && k !== KHO).map(k => caches.delete(k)))).then(() => self.clients.claim())
));

self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || (u.origin !== location.origin && u.host !== 'cdn.jsdelivr.net')) return;   // Supabase và chat luôn đi thẳng
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(KHO).then(k => k.put(r, c)); }
    return res;
  }).catch(() => caches.match(r).then(x => x || caches.match(r, { ignoreSearch: true })).then(x => x || Response.error())));
});
