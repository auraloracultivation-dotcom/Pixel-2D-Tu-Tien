// Cổng vào máy chủ phòng: GET /ws?r=<phòng>&l=<tuyến> (WebSocket). Vé đăng nhập Supabase đi trong Sec-WebSocket-Protocol: "p2d, <jwt>"
// (trình duyệt không gắn được header khác cho WebSocket; không để vé trong đường dẫn cho khỏi lọt vào nhật ký).
// Kiểm vé xong mới chuyển sang Durable Object của phòng; phòng đầy thì phòng đóng kết nối mã 4009 để máy khách thử tuyến kế tiếp.
import { verifyToken } from './auth.js';
import { parseRoom } from './proto.js';
export { Phong } from './phong.js';
export { Mang } from './mang.js';
import { profileOf } from './ho-so.js';

const text = (s, status, extra = {}) => new Response(s, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...extra } });

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') return text('p2d-phong ok', 200);
    if (url.pathname === '/mang/kt') return text(await env.MANG.get(env.MANG.idFromName('cuu-dau')).vanTay() || 'chua', 200);   // vân tay khoá thưởng (so với p2d_mang_van_tay)
    if (url.pathname === '/mang/lenh') {   // lệnh quản trị có ký (mang.js lenh)
      let r;
      try { r = await env.MANG.get(env.MANG.idFromName('cuu-dau')).lenh(String(url.searchParams.get('a') || ''), String(url.searchParams.get('ts') || ''), String(url.searchParams.get('ky') || ''), String(url.searchParams.get('m') || '')); }
      catch (e) { return text('loi: ' + String(e?.message || e).slice(0, 200), 500); }
      return r ? new Response(JSON.stringify(r), { headers: { 'content-type': 'application/json' } }) : text('sai', 403);
    }
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
    if (room.kind === 'dao' && env.DEV_NO_AUTH !== '1') {   // tên, lực chiến, cờ đỏ thật từ Supabase (không tin máy khách tự khai)
      const pf = await profileOf(uid, protos[1], env);
      if (pf) { headers.set('x-name', encodeURIComponent(pf.name)); headers.set('x-power', String(pf.power)); headers.set('x-co', pf.co ? '1' : '0'); }
    }
    if (room.kind === 'dao') headers.set('x-map', room.room.slice(4));
    headers.set('x-cap', String(room.cap));
    return stub.fetch(new Request(req, { headers }));
  },
};
