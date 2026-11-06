// PvP ở Ngoại Vực Vết Nứt (chủ dự án 06/11/2026: chỉ ở vet-nut-ngoai, chỉ khi cả hai tắt bảo vệ, chỉ tính khi đứng trong tầm chiêu;
// Luyện Khí đánh Độ Kiếp cũng được; chết rơi 1 món trong kho + 10% Linh Thạch, đồ đang mặc không mất).
// Máy chủ phòng là trọng tài: máu PvP, tầm đánh (theo vị trí phòng giữ), nhịp đánh, sát thương theo lực chiến Supabase báo
// (máy khách chỉ nói "tôi đánh người X"). Gục thì lõi Mang ký gửi Supabase (p2d_pvp_ghi), máy người gục tự trả nợ (p2d_pvp_tra).
// Số ở data/pvp.json → server (bản sao trong mang-cfg.js PVP, bài thử so khớp).
import { PVP } from './mang-cfg.js';

const pool = pw => Math.max(pw || 0, PVP.pw_min) * PVP.hp_k;

// Tắt khiên (ở đâu cũng tắt được, chủ dự án 06/11/2026 10:56; chỉ Ngoại Vực mới đánh nhau được). Khiên chỉ bật lại khi chết hồi sinh (chủ dự án 06/11/2026 10:49): xin bật lại thì từ chối.
// Trạng thái khiên giữ ở lõi Mang theo tài khoản (mang.js pk), nên đổi tuyến, ra vào bản đồ, mất mạng vào lại vẫn y như cũ.
export async function pvpToggle(room, ws, a, off) {
  const now = Date.now();
  if (!off) return send(ws, { t: 'pe', e: 'only_death' });
  if (now < (a.immune || 0)) return send(ws, { t: 'pe', e: 'immune', s: Math.ceil((a.immune - now) / 1000) });
  if (a.pk) return;
  a.pk = true; a.p.pk = 1;
  ws.serializeAttachment(a);
  room.all({ t: 'pk', id: a.id, on: 1 });
  try { await mang(room).pkSet(a.id, true, 0); } catch { /* lõi Mang lỗi: chỉ phòng này nhớ */ }
}

// Lúc vào phòng bản đồ PvP: lấy trạng thái khiên đã giữ ở Mang
export async function pvpLoad(env, uid) {
  try { return await env.MANG.get(env.MANG.idFromName('cuu-dau')).pkGet(uid); } catch { return null; }
}
const mang = room => room.env.MANG.get(room.env.MANG.idFromName('cuu-dau'));

// a đánh người id. Hợp lệ khi: cùng phòng PvP, cả hai tắt bảo vệ, cả hai có vị trí, trong tầm, đủ nhịp.
export async function pvpHit(room, ws, a, id) {
  if (!a.pk || a.map !== PVP.map || typeof id !== 'string' || id === a.id) return;
  const tw = room.ctx.getWebSockets(id).find(w => w.readyState === 1), b = tw?.deserializeAttachment();
  if (!b?.pk) return;
  const pa = room.pos.get(a.id), pb = room.pos.get(id);
  if (!pa || !pb || Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) > PVP.range) return;
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
  ws.serializeAttachment(a); tw.serializeAttachment(b);
  if (left > 0) { hp.set(id, { hp: left, at: now }); room.all({ t: 'ph', from: a.id, to: id, n, r: +(left / max).toFixed(3) }); return; }
  // gục: về điểm hồi sinh (máy người đó), bật lại bảo vệ, miễn PvP immune_s giây
  hp.delete(id);
  b.pk = false; b.p.pk = 0; b.immune = now + PVP.immune_s * 1000; b.pvpAt = 0;
  tw.serializeAttachment(b);
  try { await mang(room).pkSet(id, false, b.immune); } catch { /* lõi Mang lỗi */ }
  let ok = false;
  try { ok = await mang(room).pvp(a.id, id); } catch { /* mạng lỗi: không rơi đồ */ }
  room.all({ t: 'pd', from: a.id, to: id, n, by: a.nm || a.p?.name || 'Đạo hữu', loot: ok ? 1 : 0 });
  room.all({ t: 'pk', id, on: 0 });
}

function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { /* đang đóng */ } }
