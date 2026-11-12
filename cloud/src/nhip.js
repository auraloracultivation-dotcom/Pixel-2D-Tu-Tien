// Nhịp sống qua phòng (chủ dự án 13/11/2026 01:24: "onl kết nối các thứ khác cho hết Cloudflare xử lý", Supabase giữ kinh tế, chống hack).
// Trước đây mỗi người gọi Supabase p2d_nhip_song2 5–10 giây một lần (~40% số lệnh vào cơ sở dữ liệu). Giờ máy khách gửi "n" qua
// WebSocket phòng; phòng cộng giây online theo đồng hồ của phòng (khoảng cách hai nhịp tối đa 15 giây mới tính, như p2d_nhip_song),
// GOM_MS một lần nhờ lõi Mang ký HMAC gửi Supabase p2d_nhip_gop (migration 20261113020000) cho cả phòng, rồi báo "kh" cho máy nào
// mà Supabase thấy đã có máy khác vào cùng tài khoản. Máy khách gửi nhanh cũng không được thêm giây (giây tính theo đồng hồ phòng).
export const GOM_MS = 12000;   // < 15 giây: p2d_nhip_dung (lúc lưu) vẫn thấy lần liên lạc gần nhất
const GAP_MAX = 15000;

// Một nhịp từ máy khách: cộng giây kể từ nhịp trước (hoặc lúc vào phòng), trả lời "n1" (còn liên lạc), hẹn gom
export async function nhipVao(room, ws, a, ph) {
  const now = Date.now(), gap = now - (a.nt || a.at || now);
  a.g = (a.g || 0) + (gap > 0 && gap <= GAP_MAX ? gap / 1000 : 0);
  a.nt = now;
  if (typeof ph === 'string' && ph.length <= 64) a.ph = ph;
  ws.serializeAttachment(a);
  try { ws.send('{"t":"n1"}'); } catch { /* đang đóng */ }
  if (!(await room.ctx.storage.getAlarm())) await room.ctx.storage.setAlarm(now + GOM_MS);
}

// Hẹn giờ của phòng: gom giây của mọi người, gửi Supabase một lần, báo máy bị thay; còn người thì hẹn tiếp
export async function nhipGom(room) {
  const rows = [], socks = new Map();
  for (const ws of room.ctx.getWebSockets()) {
    if (ws.readyState !== 1) continue;
    const a = ws.deserializeAttachment();
    if (!a?.id || !(a.g > 0)) continue;
    const g = Math.round(a.g * 10) / 10;
    rows.push([a.id, g, a.ph || '', a.ip || '']);
    socks.set(a.id, [ws, g]);
  }
  if (rows.length) {
    let res = null;
    try { res = await room.env.MANG.get(room.env.MANG.idFromName('cuu-dau')).nhipGop(rows); } catch { /* lỗi: giữ giây, lần sau gửi tiếp */ }
    if (res) {
      for (const [ws, g] of socks.values()) {   // trừ phần đã gửi (trong lúc chờ có thể đã có nhịp mới)
        const a = ws.deserializeAttachment();
        if (a) { a.g = Math.max(0, (a.g || 0) - g); try { ws.serializeAttachment(a); } catch { /* đã đóng */ } }
      }
      for (const id of res.khac || []) { try { socks.get(id)?.[0].send('{"t":"kh"}'); } catch { /* đang đóng */ } }
    }
  }
  if (room.ctx.getWebSockets().some(ws => ws.readyState === 1)) await room.ctx.storage.setAlarm(Date.now() + GOM_MS);
}
