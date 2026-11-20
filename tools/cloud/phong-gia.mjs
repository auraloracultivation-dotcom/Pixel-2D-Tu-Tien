// Phòng giả cho bài thử hai máy tự động (tools/hai-may.mjs): chạy ĐÚNG mã máy chủ phòng cloud/src/phong.js trong Node (nap.mjs), nối với
// trình duyệt qua WebSocket do Playwright chặn lại (context.routeWebSocket), nên tin đi đủ đường thật: máy gửi → bộ lọc máy chủ phòng
// (proto.js cleanProf, cleanMove, cleanCast, gom lô 200 ms) → máy người xem. Không ra mạng, không chạm máy chủ thật.
// Mỗi phòng ("dao:<bản đồ>#<tuyến>") một lớp Phong riêng như trên Cloudflare. Phần boss, PvP, nhịp sống cần lõi Mang nên ở đây im lặng
// (env rỗng: các lời gọi đó tự bắt lỗi), bài thử này không đụng tới.
import { join } from 'node:path';
import { chepCloud } from './nap.mjs';

export async function taoPhongGia() {
  const dir = chepCloud('phong-gia-');
  globalThis.WebSocketRequestResponsePair ??= class { constructor(a, b) { this.a = a; this.b = b; } };
  globalThis.Response = class { constructor(body, init) { this.status = init?.status; this.webSocket = init?.webSocket; } };   // Response của Node không nhận mã 101
  // Đầu máy chủ của một kết nối: phòng gọi send / close / (de)serializeAttachment như WebSocket của Cloudflare; `day` là hàm đẩy xuống trình duyệt
  let day = null;   // đặt ngay trước room.fetch: fetch tạo WebSocketPair trước mọi lệnh await nên lấy đúng kết nối đang vào
  class DauMayChu {
    constructor() { this.readyState = 1; this.att = null; this.day = day; this.dong = null; }
    send(s) { if (this.readyState !== 1) throw new Error('closed'); this.day?.send(s); }
    close(code, why) { if (this.readyState !== 1) return; this.readyState = 3; this.dong = code; this.day?.close(code, why); }
    accept() {}
    serializeAttachment(a) { this.att = structuredClone(a); }
    deserializeAttachment() { return this.att ? structuredClone(this.att) : null; }
  }
  globalThis.WebSocketPair = class { constructor() { this[0] = { peer: null }; this[1] = new DauMayChu(); } };
  const P = await import(join(dir, 'proto.js'));
  const { Phong } = await import(join(dir, 'phong.js'));
  const phong = new Map();   // tên phòng → { room, ctx }
  const lay = ten => {
    if (!phong.has(ten)) {
      const ctx = { list: [], storage: { getAlarm: async () => 1, setAlarm: async () => {} }, setWebSocketAutoResponse() {},
        acceptWebSocket(ws, tags) { ws.tags = tags; this.list.push(ws); },
        getWebSockets(tag) { return this.list.filter(w => w.readyState === 1 && (!tag || w.tags?.includes(tag))); } };
      phong.set(ten, { room: new Phong(ctx, {}), ctx });
    }
    return phong.get(ten);
  };
  const dem = { vao: 0, len: {}, xuong: {} };   // đếm tin theo loại: bài thử soi được máy nào gửi gì

  // Nối một kết nối trình duyệt (WebSocketRoute của Playwright) vào phòng nó xin (địa chỉ ...?r=<phòng>&l=<tuyến>) với mã người chơi uid.
  // Nghe tin ngay từ đầu (tin tới trước lúc vào phòng xong thì xếp hàng), kẻo rơi mất tin đầu của máy khách.
  function noi(route, uid, ten = '') {
    const u = new URL(route.url()), r = P.parseRoom(u.searchParams.get('r'), u.searchParams.get('l'));
    if (!r) { route.close({ code: 1008, reason: 'phong_sai' }); return; }
    const { room, ctx } = lay(r.name), cho = [];
    let may = null, dong = false;
    const xuLy = m => {
      try { const t = JSON.parse(m).t; dem.len[t] = (dem.len[t] || 0) + 1; } catch { /* tin rác: phòng tự bỏ */ }
      room.webSocketMessage(may, m).catch(e => console.error('phòng giả: lỗi xử lý tin', e));
    };
    route.onMessage(m => {
      if (m === 'ping') { route.send('pong'); return; }
      if (typeof m !== 'string') return;
      if (may) xuLy(m); else cho.push(m);
    });
    route.onClose(code => { dong = true; if (may?.readyState === 1) { may.readyState = 3; room.webSocketClose(may, code || 1000).catch(() => {}); } });
    const cua = day = { send: s => { const t = s[0] === '{' ? JSON.parse(s).t : s; dem.xuong[t] = (dem.xuong[t] || 0) + 1; if (!dong) route.send(s); }, close: (code, reason) => { try { route.close({ code, reason }); } catch { /* đã đóng */ } } };
    const h = new Map([['x-uid', uid], ['x-kind', r.kind], ['x-cap', String(r.cap)], ['x-map', r.kind === 'dao' ? r.room.slice(4) : ''], ['x-name', ten ? encodeURIComponent(ten) : '']]);
    return room.fetch({ headers: { get: k => h.get(k) || null } }).then(() => {
      may = ctx.list.find(w => w.day === cua) || null;   // đúng đầu máy chủ của kết nối này; phòng đầy thì không có (phòng đã đóng mã 4009)
      if (!may) return;
      dem.vao++;
      if (dong) { may.readyState = 3; room.webSocketClose(may, 1000).catch(() => {}); return; }
      for (const m of cho.splice(0)) xuLy(m);
    });
  }
  return { noi, dem, phong, P };
}
