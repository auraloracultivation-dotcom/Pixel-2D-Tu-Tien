// Cổng vào máy chủ phòng: GET /ws?r=<phòng>&l=<tuyến> (WebSocket). Vé đăng nhập Supabase đi trong Sec-WebSocket-Protocol: "p2d, <jwt>"
// (trình duyệt không gắn được header khác cho WebSocket; không để vé trong đường dẫn cho khỏi lọt vào nhật ký).
// Kiểm vé xong mới chuyển sang Durable Object của phòng; phòng đầy thì phòng đóng kết nối mã 4009 để máy khách thử tuyến kế tiếp.
import { verifyToken } from './auth.js';
import { parseRoom } from './proto.js';
export { Phong } from './phong.js';

const text = (s, status, extra = {}) => new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...extra } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') return text('p2d-phong ok', 200);
    if (url.pathname !== '/ws') return text('not found', 404);
    if (req.headers.get('Upgrade') !== 'websocket') return text('cần WebSocket', 426);
    const origin = req.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (origin && allowed.length && !allowed.includes(origin)) return text('origin', 403);
    const room = parseRoom(url.searchParams.get('r'), url.searchParams.get('l'));
    if (!room) return text('phòng sai', 400);
    const protos = (req.headers.get('Sec-WebSocket-Protocol') || '').split(',').map(s => s.trim());
    if (protos[0] !== 'p2d') return text('giao thức', 400);
    // DEV_NO_AUTH chỉ đặt khi chạy thử trên máy (wrangler dev --var DEV_NO_AUTH:1), không bao giờ có trong wrangler.jsonc
    const uid = env.DEV_NO_AUTH === '1' ? url.searchParams.get('dev_uid') : await verifyToken(protos[1], env.SUPABASE_URL, env.SUPABASE_KEY);
    if (!uid) return text('chưa đăng nhập', 401);
    const stub = env.PHONG.get(env.PHONG.idFromName(room.name));
    const headers = new Headers(req.headers);
    headers.set('x-uid', uid);
    headers.set('x-kind', room.kind);
    headers.set('x-cap', String(room.cap));
    return stub.fetch(new Request(req, { headers }));
  },
};
