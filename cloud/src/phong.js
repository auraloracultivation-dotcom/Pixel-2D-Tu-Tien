// Durable Object "Phong": một phòng = một tuyến của một bản đồ ("dao:<map>#<tuyến>") hoặc một tổ đội ("to:<mã>").
// Dùng WebSocket Hibernation: không ai gửi gì thì phòng ngủ, Cloudflare không tính thời gian chạy; kết nối vẫn giữ.
// "ping" → "pong" do Cloudflare tự trả (không đánh thức phòng). Tin phát xuống người chơi không tính tiền (chỉ tin gửi lên, 20 tin = 1 yêu cầu).
// Mọi thứ ở đây chỉ để hiển thị (vị trí, hồ sơ, chào hỏi, hiệu ứng chiêu); đồ, Linh Thạch, sát thương vẫn do Supabase kiểm.
import { DurableObject } from 'cloudflare:workers';
import { BATCH_MS, MSG_MAX, RATE, KICK_DROPS, cleanProf, cleanMove, cleanSay, cleanCast, bucket, take, makeBatch } from './proto.js';

export class Phong extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.pos = new Map();      // id → vị trí mới nhất (mất khi phòng ngủ; người kia gửi lại khi đi)
    this.rate = new Map();     // ws → thùng token
    this.moves = new Map(); this.says = []; this.casts = []; this.timer = null;
  }

  // Người trong phòng (bỏ kết nối đang đóng)
  members() {
    return this.ctx.getWebSockets().map(ws => ({ ws, a: ws.deserializeAttachment() })).filter(m => m.a && m.ws.readyState === 1);
  }

  async fetch(req) {
    const uid = req.headers.get('x-uid'), kind = req.headers.get('x-kind'), cap = Number(req.headers.get('x-cap')) || 40;
    if (!uid || !kind) return new Response('thiếu', { status: 400 });
    // cùng tài khoản vào lại (mở hai thẻ, mạng chập chờn): đóng kết nối cũ
    for (const old of this.ctx.getWebSockets(uid)) { try { old.close(4000, 'vao_lai'); } catch { /* đã đóng */ } }
    const here = this.members().filter(m => m.a.id !== uid);
    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (here.length >= cap) {   // trình duyệt không đọc được mã HTTP khi WebSocket hỏng: nhận rồi đóng mã 4009 để máy khách thử tuyến kế
      server.accept();
      server.close(4009, 'day');
      return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'p2d' } });
    }
    this.ctx.acceptWebSocket(server, [uid]);
    const at = Date.now();   // giờ vào phòng: tổ đội lấy người vào sớm nhất làm đội trưởng
    server.serializeAttachment({ id: uid, kind, at, p: { name: 'Đạo hữu' } });
    server.send(JSON.stringify({ t: 'w', me: uid, at, l: here.map(m => ({ id: m.a.id, joined: m.a.at, ...m.a.p, ...(this.pos.has(m.a.id) ? xy(this.pos.get(m.a.id)) : {}) })) }));
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'p2d' } });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MSG_MAX) return;
    const a = ws.deserializeAttachment();
    if (!a) return;
    const cfg = RATE[a.kind] || RATE.dao, now = Date.now();
    let b = this.rate.get(ws);
    if (!b) { b = bucket(cfg, now); this.rate.set(ws, b); }
    if (!take(b, cfg, now)) { if (b.drop > KICK_DROPS) ws.close(4008, 'qua_nhanh'); return; }
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'p': {   // hồ sơ hiển thị (tên, cảnh giới, hình dáng, thời trang, thú cưỡi, linh thú)
        a.p = cleanProf(msg.p); ws.serializeAttachment(a);
        this.others(ws, { t: 'j', u: { id: a.id, joined: a.at, ...a.p } });
        break;
      }
      case 'm': { const mv = cleanMove(msg); if (mv) { this.pos.set(a.id, mv); this.moves.set(a.id, mv); this.later(); } break; }
      case 's': { const s = cleanSay(msg); if (s) { this.says.push([a.id, s]); this.later(); } break; }
      case 'k': { const c = cleanCast(msg); if (c) { this.casts.push([a.id, c]); this.later(); } break; }
      case 'r': {   // tổ đội: chuyển tiếp ngay nguyên gói cho người khác trong đội
        if (a.kind === 'to' && msg.d && typeof msg.d === 'object') this.others(ws, { t: 'r', from: a.id, d: msg.d });
        break;
      }
      default: break;
    }
  }

  async webSocketClose(ws, code) { this.gone(ws); try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* đã đóng */ } }
  async webSocketError(ws) { this.gone(ws); }

  gone(ws) {
    this.rate.delete(ws);
    const a = ws.deserializeAttachment();
    if (!a) return;
    // còn kết nối khác của cùng tài khoản (vừa vào lại) thì không báo rời
    if (this.ctx.getWebSockets(a.id).some(w => w !== ws && w.readyState === 1)) return;
    this.pos.delete(a.id); this.moves.delete(a.id);
    this.others(ws, { t: 'l', id: a.id });
  }

  others(from, obj) {
    const s = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws !== from && ws.readyState === 1) { try { ws.send(s); } catch { /* đang đóng */ } }
  }

  // Gom lô: vị trí, chào hỏi, hiệu ứng chiêu trong BATCH_MS gửi thành một gói cho mọi người
  later() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), BATCH_MS);
  }

  flush() {
    this.timer = null;
    if (!this.moves.size && !this.says.length && !this.casts.length) return;
    const s = JSON.stringify(makeBatch(this.moves, this.says, this.casts));
    this.moves = new Map(); this.says = []; this.casts = [];
    for (const ws of this.ctx.getWebSockets()) if (ws.readyState === 1) { try { ws.send(s); } catch { /* đang đóng */ } }
  }
}

const xy = mv => ({ x: mv[0], y: mv[1], fx: mv[2], fy: mv[3] });
