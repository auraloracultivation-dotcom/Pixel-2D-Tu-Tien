// Durable Object "Phong": một phòng = một tuyến của một bản đồ ("dao:<map>#<tuyến>") hoặc một tổ đội ("to:<mã>").
// Dùng WebSocket Hibernation: không ai gửi gì thì phòng ngủ, Cloudflare không tính thời gian chạy; kết nối vẫn giữ.
// "ping" → "pong" do Cloudflare tự trả (không đánh thức phòng). Tin phát xuống người chơi không tính tiền (chỉ tin gửi lên, 20 tin = 1 yêu cầu).
// Mọi thứ ở đây chỉ để hiển thị (vị trí, hồ sơ, chào hỏi, hiệu ứng chiêu); đồ, Linh Thạch, sát thương vẫn do Supabase kiểm.
import { DurableObject } from 'cloudflare:workers';
import { HEAD, NEAR } from './mang-cfg.js';
import { pvpToggle, pvpHit } from './pvp.js';
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
    const map = req.headers.get('x-map') || '';
    const nm = req.headers.get('x-name') ? decodeURIComponent(req.headers.get('x-name')) : '', pw = Number(req.headers.get('x-power')) || 0, co = req.headers.get('x-co') === '1';
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
    server.serializeAttachment({ id: uid, kind, at, nm, pw, co, map, p: { name: nm || 'Đạo hữu' } });
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
        a.p = cleanProf(msg.p); if (a.nm) a.p.name = a.nm; a.p.pk = a.pk ? 1 : 0;   // trạng thái bảo vệ do phòng giữ (src/pvp.js)   // tên thật từ Supabase khi có (không cho giả tên người khác)
        ws.serializeAttachment(a);
        this.others(ws, { t: 'j', u: { id: a.id, joined: a.at, ...a.p } });
        break;
      }
      case 'm': { const mv = cleanMove(msg); if (mv) { this.pos.set(a.id, mv); this.moves.set(a.id, mv); this.later(); } break; }
      case 's': { const s = cleanSay(msg); if (s) { this.says.push([a.id, s]); this.later(); } break; }
      case 'k': { const c = cleanCast(msg); if (c) { this.casts.push([a.id, c]); this.later(); } break; }
      case 'bv': { if (a.kind === 'dao') pvpToggle(this, ws, a, !!msg.off); break; }   // PvP Ngoại Vực: tắt / bật bảo vệ (src/pvp.js)
      case 'h': { if (a.kind === 'dao') await pvpHit(this, ws, a, msg.to); break; }
      case 'd': { if (a.kind === 'dao') this.bossHit(ws, a, msg.n); break; }   // sát thương lên Cửu Đầu Thôn Thiên Mãng (src/mang.js)
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

  all(obj) {
    const s = JSON.stringify(obj);
    for (const ws of this.ctx.getWebSockets()) if (ws.readyState === 1) { try { ws.send(s); } catch { /* đang đóng */ } }
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

// Boss thế giới: kẹp sát thương mỗi người theo lực chiến máy chủ giữ (tối đa max(lực chiến, 1000) × 5 mỗi giây, như bảng
// Sát thương/giây p2d_gui_dps), gom 2 giây gửi lõi Mang; trả bảng xếp hạng cho cả phòng kèm hạng riêng từng người.
Phong.prototype.bossHit = function (ws, a, n) {
  const now = Date.now(), d = (this.dmg ??= new Map()), cur = d.get(a.id) || { n: 0, s: 0, at: now - 2000, name: a.nm || a.p?.name || 'Đạo hữu', co: a.co, pw: a.pw, map: a.map };
  const dt = Math.min(10, Math.max(0.5, (now - cur.at) / 1000));
  const v = typeof n === 'number' && Number.isFinite(n) && n > 0 ? Math.min(n, Math.max(cur.pw || 0, 1000) * 5 * dt) : 0;
  if (v > 0 && nearHead(a.map, this.pos.get(a.id))) cur.s += Math.min(dt, 3);   // giây chém thật để tính Linh Thạch (gửi 2 giây/lần)
  if (v > 0 || !d.has(a.id)) { cur.n += v; cur.at = now; }
  d.set(a.id, cur);
  if (!this.bossTimer) this.bossTimer = setTimeout(() => this.bossFlush(), 2000);
};

Phong.prototype.bossFlush = async function () {
  this.bossTimer = null;
  const d = this.dmg; this.dmg = new Map();
  if (!d?.size) return;
  const list = [...d].map(([id, x]) => ({ id, name: x.name, n: x.co ? 0 : Math.round(x.n), s: x.co ? 0 : x.s, map: x.map }));   // cờ đỏ: vẫn thấy bảng, không tính sát thương, không thưởng
  let res;
  try { res = await this.env.MANG.get(this.env.MANG.idFromName('cuu-dau')).add(list); } catch { return; }
  for (const ws of this.ctx.getWebSockets()) {
    if (ws.readyState !== 1) continue;
    const id = ws.deserializeAttachment()?.id;
    try { ws.send(JSON.stringify({ t: 'bx', top: res.top, n: res.n, total: res.total, me: res.ranks[id] || null, lt: res.lt?.[id] ?? null })); } catch { /* đang đóng */ }
  }
};

const nearHead = (map, mv) => { const h = HEAD[map]; return !!(h && mv && Math.hypot(mv[0] - h[0], mv[1] - h[1]) <= NEAR); };
const xy = mv => ({ x: mv[0], y: mv[1], fx: mv[2], fy: mv[3] });
