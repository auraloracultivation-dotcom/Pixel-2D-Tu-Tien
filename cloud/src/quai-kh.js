// Quái chung trên tinh cầu tông môn (Khai Hoang). Chủ dự án 22/11/2026 00:1x chọn "Máu theo cấp tinh cầu": quái ở đó một mức máu cho
// mọi người, nên làm quái chung được như các tinh cầu hệ.
// Tinh cầu tông môn không có trong bảng sinh sẵn ./quai-cfg.js: mỗi máy khách tự dựng bản đồ từ dòng tinh cầu (hạt giống, mặt đất, cấp,
// bố cục công trình). Phòng đọc đúng dòng đó qua p2d_kh_ds (hàm công khai, khoá publishable như máy khách) rồi dựng bảng bằng CÙNG đoạn
// mã với máy khách (./kh-bai.js, bản chép tự động của src/game/kh-bai.js), số đo của loài lấy ở QUAI.kh (tools/quai-chung.mjs tính sẵn).
// Hai bên so chữ ký bảng như mọi bản đồ quái chung: lệch thì máy khách về quái riêng.
//   - Người vào phòng: bảng đã đọc trong TUOI_MS thì dùng luôn, cũ hơn thì đọc lại trước khi chào.
//   - Phòng ngủ dậy (quên hết) mà có tin 'q': đọc lại trước khi xét đòn.
//   - Máy khách thấy bảng mình khác bảng phòng (tông chủ vừa bày lại công trình) gửi 'q' kèm qr: đọc lại, cách lần trước ít nhất HOI_MS.
//   - Bảng đổi: sổ quái làm lại từ đầu (mọi con sống, đầy máu) và phát 'qv' cho cả tuyến; ai khớp bảng mới thì vào lại quái chung.
//     Bảng không đổi: chỉ người xin nhận 'qv' (phong.js), như mọi bản đồ quái chung khi máy khách nạp lại bản đồ tại chỗ.
// Không đọc được Supabase: phòng không có bảng, người vào dùng quái riêng như cũ; lần vào sau thử lại.
import { QUAI } from './quai-cfg.js';
import { khBangQuai } from './kh-bai.js';
import { soMoi, quaiChao } from './quai.js';

const LA = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TUOI_MS = 60000, HOI_MS = 10000;

// Bản đồ là tinh cầu tông môn (mã tinh cầu dạng uuid) và bảng phòng có phần tinh cầu tông môn
export const laKh = map => !!QUAI.kh && LA.test(map || '');

// Đọc (lại) bảng của tinh cầu map nếu cần. ep: máy khách xin đọc lại (tin 'q' có qr). Trả null (không đọc) hoặc lời hứa ra true khi
// bảng đổi và đã phát 'qv' cho cả tuyến
export function khNap(room, map, now, ep = false) {
  if (!laKh(map)) return null;
  const tuoi = now - (room.khLuc || 0);
  if (room.khLuc && room.q !== undefined && tuoi < (ep ? HOI_MS : TUOI_MS)) return null;
  if (room.khP) return room.khP;
  const p = docBang(room, map).finally(() => { if (room.khP === p) room.khP = null; });
  room.khP = p;
  return p;
}

async function docBang(room, map) {
  const env = room.env || {};
  let ds = null;
  if (env.SUPABASE_URL) {
    try {
      const r = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/p2d_kh_ds`, { method: 'POST', headers: { apikey: env.SUPABASE_KEY, 'content-type': 'application/json' }, body: '{}' });
      ds = r.ok ? await r.json() : null;
    } catch { ds = null; }
  }
  room.khLuc = Date.now();
  if (!Array.isArray(ds)) { if (room.q === undefined) room.q = null; return false; }
  const p = ds.find(x => x && x.id === map);
  let B = null;
  try { B = p ? khBangQuai(QUAI.kh, p) : null; } catch { B = null; }
  const cu = room.q;
  if (cu !== undefined && (cu?.B?.v || '') === (B?.v || '')) return false;   // bảng như cũ: giữ nguyên máu, lúc chết
  room.q = soMoi(B);
  if (cu === undefined) return false;
  room.all({ t: 'qv', q: quaiChao(room, map, Date.now()) || { v: '', d: [] } });
  return true;
}
