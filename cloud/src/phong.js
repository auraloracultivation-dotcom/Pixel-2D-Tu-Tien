// Durable Object "Phong": một phòng = một tuyến của một bản đồ ("dao:<map>#<tuyến>") hoặc một tổ đội ("to:<mã>").
// Dùng WebSocket Hibernation: không ai gửi gì thì phòng ngủ, Cloudflare không tính thời gian chạy; kết nối vẫn giữ.
// "ping" → "pong" do Cloudflare tự trả (không đánh thức phòng). Tin phát xuống người chơi không tính tiền (chỉ tin gửi lên, 20 tin = 1 yêu cầu).
// Mọi thứ ở đây chỉ để hiển thị (vị trí, hồ sơ, chào hỏi, hiệu ứng chiêu); đồ, Linh Thạch, sát thương vẫn do Supabase kiểm.
import { DurableObject } from 'cloudflare:workers';
import { HEAD, NEAR } from './mang-cfg.js';
import { pvpToggle, pvpHit, pvpLoad, pvpTrack } from './pvp.js';
import { ganHoSo, pvpMa } from './ma.js';
import { nhipVao, nhipGom } from './nhip.js';
import { quaiChao, quaiTin, quaiLo, quaiRoi } from './quai.js';
import { laKh, khNap } from './quai-kh.js';
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
    const tlh = req.headers.get('x-tl'), tl = tlh != null && tlh !== '' && Number.isFinite(+tlh) ? +tlh : undefined;   // tổng tầng tu (Supabase), che người mới khỏi ma (src/ma.js)
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
    const pk = kind === 'dao' ? await pvpLoad(this.env, uid) : null;   // khiên PvP giữ theo tài khoản (src/pvp.js)
    if (kind === 'dao') await khNap(this, map, Date.now());   // tinh cầu tông môn: đọc bảng quái chung trước khi chào (src/quai-kh.js)
    this.ctx.acceptWebSocket(server, [uid]);
    const at = Date.now();   // giờ vào phòng: tổ đội lấy người vào sớm nhất làm đội trưởng
    const att = { id: uid, kind, at, ip: req.headers.get('cf-connecting-ip') || '', nm, pw, co, map, tl, ma: pk?.ma || 0, pk: !!pk?.off || (pk?.ma || 0) > 0, immune: pk?.immune || 0, pvpAt: pk?.at || 0, p: { name: nm || 'Đạo hữu' } };
    ganHoSo(att);   // khiên, điểm ma, người mới vào hồ sơ phát cho người khác
    server.serializeAttachment(att);
    if (att.ma > 0) this.maAt = at;
    if (att.pk) server.send(JSON.stringify({ t: 'pk', id: uid, on: 1, ma: att.ma || 0 }));   // máy mình biết đang tắt khiên / đang là ma
    const q = kind === 'dao' ? quaiChao(this, map, at) : undefined;   // quái chung của bản đồ (src/quai.js): chữ ký bảng + ô nào đang chết, mất máu
    server.send(JSON.stringify({ t: 'w', me: uid, at, l: here.map(m => ({ id: m.a.id, joined: m.a.at, ...m.a.p, ...(this.pos.has(m.a.id) ? xy(this.pos.get(m.a.id)) : {}) })), q }));
    return new Response(null, { status: 101, webSocket: client, headers: { 'Sec-WebSocket-Protocol': 'p2d' } });
  }

  async webSocketMessage(ws, raw) {
    if (typeof raw !== 'string' || raw.length > MSG_MAX) return;
    const a = ws.deserializeAttachment();
    if (!a) return;
    const cfg = RATE[a.kind] || RATE.dao, now = Date.now();
    if ((a.ma || 0) > 0) this.maAt = now;   // có ma đang hoạt động trong phòng: ghi vết vị trí cả người còn khiên (place)
    let b = this.rate.get(ws);
    if (!b) { b = bucket(cfg, now); this.rate.set(ws, b); }
    if (!take(b, cfg, now)) { if (b.drop > KICK_DROPS) ws.close(4008, 'qua_nhanh'); return; }
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'p': {   // hồ sơ hiển thị (tên, cảnh giới, hình dáng, thời trang, thú cưỡi, linh thú)
        a.p = cleanProf(msg.p); if (a.nm) a.p.name = a.nm; ganHoSo(a);   // tên thật từ Supabase khi có (không cho giả tên người khác); khiên, điểm ma, người mới do phòng giữ (src/pvp.js, src/ma.js)
        ws.serializeAttachment(a);
        this.others(ws, { t: 'j', u: { id: a.id, joined: a.at, ...a.p } });
        break;
      }
      case 'm': { const mv = cleanMove(msg); if (mv) this.place(ws, a, mv, now); break; }
      case 's': { const s = cleanSay(msg); if (s) { this.says.push([a.id, s]); this.later(); } break; }
      case 'k': { const c = cleanCast(msg); if (c) { this.casts.push([a.id, c]); this.later(); } break; }
      case 'n': { if (a.kind === 'dao') await nhipVao(this, ws, a, msg.ph); break; }   // nhịp sống (src/nhip.js)
      case 'bv': { if (a.kind === 'dao') await pvpToggle(this, ws, a, !!msg.off, msg.off ? this.kem(a, msg) : null); break; }   // PvP: tắt / bật bảo vệ (src/pvp.js); tắt thì kèm chỗ đang đứng
      case 'mh': { if (a.kind === 'dao') await pvpMa(this, ws, a, this.kem(a, msg)); break; }   // hóa ma (src/ma.js), kèm chỗ đang đứng như lúc tắt khiên
      case 'h': {   // đòn PvP. Máy khách từ đợt sửa đêm 20/11/2026 gửi kèm vị trí mình lúc ra đòn (x, y): phòng xét tầm theo đó, khỏi dùng vị trí cũ
        if (a.kind !== 'dao') break;
        const mv = this.kem(a, msg);
        if (mv) this.place(ws, a, mv, now);
        await pvpHit(this, ws, a, msg.to);
        break;
      }
      case 'd': { if (a.kind === 'dao') this.bossHit(ws, a, msg.n); break; }   // sát thương lên Cửu Đầu Thôn Thiên Mãng (src/mang.js)
      case 'q': {   // quái chung (src/quai.js): quái mình đang giữ và đòn mình đánh, kèm chỗ mình đứng (phòng xét tầm theo đó, như đòn PvP)
        if (a.kind !== 'dao') break;
        const phat = laKh(a.map) && (msg.qr || this.q === undefined) ? await khNap(this, a.map, now, !!msg.qr) : false;   // tinh cầu tông môn: phòng vừa ngủ dậy, hay máy khách xin đọc lại bảng
        const mv = this.kem(a, msg);
        if (mv) this.place(ws, a, mv, now);
        quaiTin(this, ws, a, msg, now);
        if (msg.qr && !phat) { try { ws.send(JSON.stringify({ t: 'qv', q: quaiChao(this, a.map, now) })); } catch { /* đã đóng */ } }   // máy khách nạp lại bản đồ tại chỗ: gửi lại trạng thái quái chung như tin chào
        break;
      }
      case 'r': {   // tổ đội: chuyển tiếp ngay nguyên gói cho người khác trong đội
        if (a.kind === 'to' && msg.d && typeof msg.d === 'object') this.others(ws, { t: 'r', from: a.id, d: msg.d });
        break;
      }
      default: break;
    }
  }

  async alarm() { await nhipGom(this); }   // gom nhịp sống cả phòng gửi Supabase (src/nhip.js)

  async webSocketClose(ws, code) { this.gone(ws); try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch { /* đã đóng */ } }
  async webSocketError(ws) { this.gone(ws); }

  gone(ws) {
    this.rate.delete(ws);
    const a = ws.deserializeAttachment();
    if (!a) return;
    // còn kết nối khác của cùng tài khoản (vừa vào lại) thì không báo rời
    if (this.ctx.getWebSockets(a.id).some(w => w !== ws && w.readyState === 1)) return;
    this.pos.delete(a.id); this.moves.delete(a.id); this.vet?.delete(a.id); quaiRoi(this, a.id);
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

  // Vị trí mới của một người: giữ để xét tầm (boss, PvP), vào lô gửi xuống. Người đang tắt khiên (cả ma) thì ghi vào vết vị trí (pvp.js: bù
  // trễ mạng) và vào phần đính kèm kết nối (a.xy); người còn khiên chỉ ghi vết khi trong phòng có ma hoạt động trong MA_VET_MS vừa qua (ma đánh
  // được cả người còn khiên, 22/11/2026), phòng không có ma thì đỡ việc cho đám đông đi dạo như cũ. Lý do có a.xy: phòng ngủ sau khoảng 10 giây không ai gửi gì là quên sạch this.pos (thử thật
  // 20/11/2026: im 8 giây còn, im 12 giây mất), mà người đứng yên 30 giây mới gửi lại vị trí; không ghi bền thì người tắt khiên đứng yên
  // trong phòng vắng là không ai đánh trúng được, dù ngay trước mặt.
  place(ws, a, mv, now) {
    this.pos.set(a.id, mv); this.moves.set(a.id, mv);
    if (a.pk || (a.kind === 'dao' && now - (this.maAt || 0) < MA_VET_MS)) pvpTrack(this, a.id, mv, now);
    if (a.pk) { a.xy = [mv[0], mv[1]]; ws.serializeAttachment(a); }
    this.later();
  }

  // Vị trí gửi kèm trong tin khác (đòn 'h', tắt khiên 'bv'; máy khách từ đợt sửa đêm 20/11/2026): tin chỉ mang x, y nên giữ hướng nhìn cũ; cờ vung đòn
  // chỉ giữ nếu đang chờ trong lô này (kẻo đè mất hình vung đòn, mà cũng không tự vẽ thêm). null: tin không kèm vị trí (máy khách cũ) hoặc rác.
  kem(a, msg) {
    const mv = cleanMove(msg), old = mv && this.pos.get(a.id);
    return old ? [mv[0], mv[1], old[2], old[3], this.moves.get(a.id)?.[4] || 0, old[5]] : mv;
  }

  // Gom lô: vị trí, chào hỏi, hiệu ứng chiêu trong BATCH_MS gửi thành một gói cho mọi người
  later() {
    if (this.timer) return;
    this.timer = setTimeout(() => this.flush(), BATCH_MS);
  }

  flush() {
    this.timer = null;
    const quai = quaiLo(this);   // quái chung: vị trí quái đang có người giữ, máu vừa đổi (src/quai.js)
    if (!this.moves.size && !this.says.length && !this.casts.length && !quai) return;
    const s = JSON.stringify(makeBatch(this.moves, this.says, this.casts, quai));
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
  const list = [...d].map(([id, x]) => ({ id, name: x.name, n: x.co ? 0 : Math.round(x.n), s: x.co ? 0 : x.s, map: x.map, pw: x.pw || 0 }));   // cờ đỏ: vẫn thấy bảng, không tính sát thương, không thưởng
  let res;
  try { res = await this.env.MANG.get(this.env.MANG.idFromName('cuu-dau')).add(list); } catch { return; }
  for (const ws of this.ctx.getWebSockets()) {
    if (ws.readyState !== 1) continue;
    const id = ws.deserializeAttachment()?.id;
    try { ws.send(JSON.stringify({ t: 'bx', top: res.top, n: res.n, total: res.total, me: res.ranks[id] || null, lt: res.lt?.[id] ?? null, mo: res.mo })); } catch { /* đang đóng */ }
  }
};

const nearHead = (map, mv) => { const h = HEAD[map]; return !!(h && mv && (Array.isArray(h[0]) ? h : [h]).some(q => Math.hypot(mv[0] - q[0], mv[1] - q[1]) <= NEAR)); };   // vùng không gian: chín đầu
const xy = mv => ({ x: mv[0], y: mv[1], fx: mv[2], fy: mv[3] });
const MA_VET_MS = 30000;
