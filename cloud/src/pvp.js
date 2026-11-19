// PvP (chủ dự án 06/11/2026: chỉ khi cả hai tắt bảo vệ, chỉ tính khi đứng trong tầm chiêu, Luyện Khí đánh Độ Kiếp cũng được;
// 19/11/2026 16:18–16:25: đánh được ở MỌI tinh cầu, trừ vòng pháp trận Thiên Kiếm Tinh PVP.safe; Ngoại Vực rơi 1 món + 10% Linh Thạch,
// nơi khác 5% Linh Thạch không mất món (Supabase p2d_pvp_tra đọc nơi gục); ngoài Ngoại Vực khiên bật lại sau reshield_s giây không giao chiến).
// Máy chủ phòng là trọng tài: máu PvP, tầm đánh (theo vị trí phòng giữ), nhịp đánh, sát thương theo lực chiến Supabase báo
// (máy khách chỉ nói "tôi đánh người X"). Gục thì lõi Mang ký gửi Supabase (p2d_pvp_ghi), máy người gục tự trả nợ (p2d_pvp_tra).
// Số ở data/pvp.json → server (bản sao trong mang-cfg.js PVP, bài thử so khớp).
import { PVP } from './mang-cfg.js';

const pool = pw => Math.max(pw || 0, PVP.pw_min) * PVP.hp_k;

// Tắt khiên ở đâu cũng được (chủ dự án 06/11/2026 10:56). Bật lại: ở Ngoại Vực chỉ khi chết hồi sinh (06/11 10:49); nơi khác khi đã
// reshield_s giây không giao chiến (19/11 16:25), tính từ lúc tắt khiên hoặc đòn PvP cuối (a.pvpAt, giữ ở Mang cùng khiên).
// Trạng thái khiên giữ ở lõi Mang theo tài khoản (mang.js pk), nên đổi tuyến, ra vào bản đồ, mất mạng vào lại vẫn y như cũ.
export async function pvpToggle(room, ws, a, off) {
  const now = Date.now();
  if (!off) {
    if (!a.pk) return;
    if (a.map === PVP.map) return send(ws, { t: 'pe', e: 'only_death' });
    const left = (a.pvpAt || 0) + PVP.reshield_s * 1000 - now;
    if (left > 0) return send(ws, { t: 'pe', e: 'wait_on', s: Math.ceil(left / 1000) });
    a.pk = false; a.p.pk = 0;
    ws.serializeAttachment(a);
    room.all({ t: 'pk', id: a.id, on: 0 });
    try { await mang(room).pkSet(a.id, false, 0, 0); } catch { /* lõi Mang lỗi */ }
    return;
  }
  if (now < (a.immune || 0)) return send(ws, { t: 'pe', e: 'immune', s: Math.ceil((a.immune - now) / 1000) });
  if (a.pk) return;
  a.pk = true; a.p.pk = 1; a.pvpAt = now;
  ws.serializeAttachment(a);
  room.all({ t: 'pk', id: a.id, on: 1 });
  try { await mang(room).pkSet(a.id, true, 0, now); } catch { /* lõi Mang lỗi: chỉ phòng này nhớ */ }
}

// Vòng pháp trận an toàn (PVP.safe, đơn vị bản đồ)
export const inSafe = (map, p) => !!(PVP.safe && map === PVP.safe.map && p && Math.hypot(p[0] - PVP.safe.x, p[1] - PVP.safe.y) <= PVP.safe.r);

// Lúc vào phòng bản đồ PvP: lấy trạng thái khiên đã giữ ở Mang
export async function pvpLoad(env, uid) {
  try { return await env.MANG.get(env.MANG.idFromName('cuu-dau')).pkGet(uid); } catch { return null; }
}
const mang = room => room.env.MANG.get(room.env.MANG.idFromName('cuu-dau'));

// a đánh người id. Hợp lệ khi: cùng phòng, cả hai tắt bảo vệ, cả hai có vị trí, không ai đứng trong vòng pháp trận, trong tầm, đủ nhịp.
export async function pvpHit(room, ws, a, id) {
  if (!a.pk || typeof id !== 'string' || id === a.id) return;
  const tw = room.ctx.getWebSockets(id).find(w => w.readyState === 1), b = tw?.deserializeAttachment();
  if (!b?.pk) return;
  const pa = room.pos.get(a.id), pb = room.pos.get(id);
  if (!pa || !pb || Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > PVP.range) return;
  if (inSafe(a.map, pa) || inSafe(a.map, pb)) return;
  const now = Date.now(), hp = (room.php ??= new Map());
  const last = hp.get('t:' + a.id) || 0;
  if (now - last < PVP.gap_s * 1000) return;
  hp.set('t:' + a.id, now);
  const dt = Math.min(PVP.dt_max, (now - (last || now - PVP.gap_s * 1000)) / 1000);
  const max = pool(b.pw), cur = hp.get(id);
  let left = cur && now - cur.at < PVP.regen_s * 1000 ? cur.hp : max;   // lâu không trúng đòn PvP thì đầy lại
  const n = Math.max(1, Math.round(Math.max(a.pw || 0, PVP.pw_min) * PVP.dps_k * dt));
  left -= n;
  a.pvpAt = now; b.pvpAt = now;
  for (const x of [a, b]) if (now - (x.pkSaved || 0) > 30000) { x.pkSaved = now; mang(room).pkSet(x.id, true, x.immune || 0, now).catch(() => {}); }   // giữ lúc giao chiến ở Mang (vào lại không né được hẹn bật khiên), 30 giây một lần
  ws.serializeAttachment(a); tw.serializeAttachment(b);
  if (left > 0) { hp.set(id, { hp: left, at: now }); room.all({ t: 'ph', from: a.id, to: id, n, r: +(left / max).toFixed(3) }); return; }
  // gục: về điểm hồi sinh (máy người đó), bật lại bảo vệ, miễn PvP immune_s giây
  hp.delete(id);
  b.pk = false; b.p.pk = 0; b.immune = now + PVP.immune_s * 1000; b.pvpAt = 0;
  tw.serializeAttachment(b);
  try { await mang(room).pkSet(id, false, b.immune, 0); } catch { /* lõi Mang lỗi */ }
  try { await mang(room).pkSet(a.id, true, a.immune || 0, now); } catch { /* lõi Mang lỗi */ }
  let ok = false;
  try { ok = await mang(room).pvp(a.id, id, a.map === PVP.map ? 'ngoai' : 'thuong'); } catch { /* mạng lỗi: không rơi đồ */ }
  room.all({ t: 'pd', from: a.id, to: id, n, by: a.nm || a.p?.name || 'Đạo hữu', loot: ok ? 1 : 0 });
  room.all({ t: 'pk', id, on: 0 });
}

function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { /* đang đóng */ } }
