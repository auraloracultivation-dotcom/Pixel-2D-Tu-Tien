// Hóa ma (chủ dự án 22/11/2026 01:54 và bảng câu hỏi 02:0x; luật ở data/pvp.json → _ma, ma, server.ma). Máy chủ phòng làm trọng tài:
// - quyen(a, b): a đánh b được không và kiểu trận: 'giet' (ma đồ sát người, kể cả người còn khiên), 'diet' (người, còn khiên hay không, diệt ma),
//   'pvp' (hai người thường cùng tắt khiên, luật cũ), null (không đánh được: hai ma cùng loại, người mới được che, người còn khiên với nhau).
// - pvpMa: bấm "Hóa ma" (tin 'mh'): lõi Mang hỏi Supabase (p2d_ma_ghi 'hoa', có ký) rồi mới cho thành ma. Ma = đã tắt khiên, không bật lại được.
// - maGuc: một bên gục trong trận 'giet' / 'diet': báo Supabase (điểm ma, công đức, nợ Linh Thạch / tu vi), đổi điểm ma trong phòng, báo cả phòng.
// Supabase là nơi giữ điểm (bảng p2d_ma_hoa); lõi Mang (mang.js pk) và phần đính kèm kết nối (a.ma) chỉ giữ bản sao để phòng xét nhanh.
import { PVP } from './mang-cfg.js';

const mang = room => room.env.MANG.get(room.env.MANG.idFromName('cuu-dau'));
function send(ws, obj) { try { ws.send(JSON.stringify(obj)); } catch { /* đang đóng */ } }

export const laMa = a => (a?.ma || 0) > 0;
// Người mới được che (tổng tầng tu tl dưới server.ma.min_tl, Supabase báo lúc vào phòng). Chưa biết tl (hồ sơ Supabase lỗi) thì cũng che cho chắc.
export const moi = a => !((a?.tl ?? -1) >= (PVP.ma?.min_tl ?? 4));

export function quyen(a, b) {
  if (laMa(a)) return laMa(b) || moi(b) ? null : 'giet';
  if (laMa(b)) return moi(a) ? null : 'diet';
  return a.pk && b.pk ? 'pvp' : null;
}

// Hồ sơ phát cho người khác: khiên, điểm ma, người mới (dữ liệu do phòng gắn, máy khách không tự khai được; data/dong-bo.json ai: may-chu)
export function ganHoSo(a) {
  if (!a.p) a.p = {};
  a.p.pk = a.pk ? 1 : 0;
  if (laMa(a)) a.p.ma = String(a.ma); else delete a.p.ma;
  if (moi(a)) a.p.bm = 1; else delete a.p.bm;
}
export function datMa(a, n) { a.ma = Math.max(0, n | 0); if (a.ma > 0) a.pk = true; ganHoSo(a); }

// Bấm "Hóa ma". mv: chỗ đang đứng gửi kèm (như lúc tắt khiên). Đọc lại phần đính kèm sau khi chờ Supabase: trong lúc chờ có thể đã có tin khác ghi vào.
export async function pvpMa(room, ws, a, mv) {
  const now = Date.now();
  if (laMa(a)) return;
  if (moi(a)) return send(ws, { t: 'pe', e: 'ma_moi' });
  if (now < (a.immune || 0)) return send(ws, { t: 'pe', e: 'immune', s: Math.ceil((a.immune - now) / 1000) });
  let r = null;
  try { r = await mang(room).ma('hoa', a.id); } catch { /* lõi Mang lỗi */ }
  if (!(r?.ma > 0)) return send(ws, { t: 'pe', e: r?.loi === 'moi' ? 'ma_moi' : 'ma_loi' });
  const b = ws.deserializeAttachment() || a;
  datMa(b, r.ma); b.pvpAt = now; room.maAt = now;
  const q = mv || room.pos.get(b.id);
  if (q) room.place(ws, b, q, now); else ws.serializeAttachment(b);
  room.all({ t: 'pk', id: b.id, on: 1, ma: b.ma });
  try { await mang(room).pkSet(b.id, true, b.immune || 0, now, b.ma); } catch { /* lõi Mang lỗi: chỉ phòng này nhớ */ }
}

// Gục trong trận 'giet' (a là ma, b là người) hoặc 'diet' (a là người, b là ma). n: đòn cuối. pvpHit đã đặt b.immune trước khi gọi.
export async function maGuc(room, ws, a, tw, b, kieu, n, now) {
  let r = null;
  try { r = await mang(room).ma(kieu, a.id, b.id, a.map === PVP.map ? 'ngoai' : 'thuong'); } catch { /* mạng lỗi: không đổi điểm ai */ }
  a = ws.deserializeAttachment() || a; b = tw.deserializeAttachment() || b;
  if (r) datMa(kieu === 'giet' ? a : b, r.ma);
  if (!laMa(b)) b.pk = false;   // người thường gục (hoặc ma vừa hết điểm): khiên bật lại như PvP; ma còn điểm thì vẫn là ma
  ganHoSo(b); b.pvpAt = 0; delete b.xy;
  ws.serializeAttachment(a); tw.serializeAttachment(b);
  try { await mang(room).pkSet(b.id, !!b.pk, b.immune || 0, 0, b.ma || 0); } catch { /* lõi Mang lỗi */ }
  try { await mang(room).pkSet(a.id, !!a.pk, a.immune || 0, now, a.ma || 0); } catch { /* lõi Mang lỗi */ }
  room.all({ t: 'pd', from: a.id, to: b.id, n, by: a.nm || a.p?.name || 'Đạo hữu', loot: r?.no ? 1 : 0, k: kieu, ma: (kieu === 'giet' ? a.ma : b.ma) || 0, ...(r?.cd != null ? { cd: r.cd } : {}) });
  room.all({ t: 'pk', id: b.id, on: b.pk ? 1 : 0, ma: b.ma || 0 });
  if (kieu === 'giet') room.all({ t: 'pk', id: a.id, on: 1, ma: a.ma || 0 });   // điểm ma của kẻ đồ sát vừa tăng
}
