// Lưu phần thay đổi (supabase/migrations/20261105090000_p2d_luu_vi.sql): nhớ bản máy chủ đã nhận lần cuối theo từng khoá
// cấp đầu (chuỗi JSON của giá trị), mỗi lần lưu chỉ gửi khoá đổi + khoá đã xoá. Không đụng mạng: src/net/profile.js gọi.
// - VOLATILE: khoá lần nào cũng khác (mã phiên, đồng hồ, mốc giờ, phiên bản) — không tính là "đổi", nhưng có gửi thì gửi kèm.
// - Máy chủ trả "sua" (src/game/cloud-guard.js applyFix sửa lại số trong máy): quên các khoá bị sửa để lần sau gửi lại cả khoá đó,
//   y như bản gửi cả; trường lạ trong sua thì quên hết (lần sau gửi cả bản).

export const VOLATILE = new Set(['ss', 'clk', 'lastSeen', 'pb']);
const FIX_KEYS = {
  realm: ['realm', 'layer', 'qi'], layer: ['realm', 'layer', 'qi'], qi: ['realm', 'layer', 'qi'],
  lingshi: ['lingshi'], mats: ['mats'], tran: ['lingshi', 'mats'], best: ['tower'], gems: ['gems'], mon: ['bag'], roi: ['bag', 'equip'],
  thu: ['pets', 'comps', 'mounts', 'mountLine', 'outfits', 'outfitLine', 'techs', 'techSlots', 'skillLv', 'caveLv', 'pet', 'mount', 'companion', 'companion2'],
};

// HAI NHỊP LƯU (chủ dự án 21/11/2026 chọn "Cách A: lưu hai nhịp"; số ở data/config.json → luu_hai_nhip). Đo 24 giờ 20–21/11: 75% lần
// lưu là gói dưới 2 KB chỉ có mấy con số nhảy liên tục lúc farm (linh khí, Linh Thạch, đếm quái, việc ngày); mỗi người gọi máy chủ lưu
// 4–6 giây một lần, 1 000 người là quá sức cơ sở dữ liệu. Nên chia thay đổi làm hai loại:
//   - CHẬM (plan().cham = true): mọi khoá đổi chỉ là SỐ NHẢY: cùng hình dạng, chỉ số khác số; khoá đếm thêm / bớt cũng tính là số
//     (nguyên liệu mới có lần đầu, đan uống hết); túi đồ chỉ thêm / mất món phẩm thường (tuiDoiThuong). Loại này src/net/profile.js gom cham_ms gửi một lần.
//   - NHANH: mọi thứ còn lại (chữ, cờ, thêm / mất món phẩm cao, khoá bị xoá, khoá trong danh sách nhanh như cảnh giới, tầng, bước truyện).
//     Loại này gửi theo nhịp cũ. Khoá lạ, hình dạng lạ đều rơi vào NHANH: quên khai thì chỉ là lưu dày như cũ, không bao giờ chậm oan.
export function chiSoNhay(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return true;
  if (a === b) return true;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((v, i) => chiSoNhay(v, b[i]));
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const x = a[k], y = b[k];
    if (x === undefined || y === undefined) { if (typeof (x ?? y) !== 'number') return false; }   // khoá đếm thêm / bớt: chỉ khi giá trị là số
    else if (!chiSoNhay(x, y)) return false;
  }
  return true;
}
// Túi đồ chỉ đổi ở món phẩm thường: nhặt thêm món phẩm thường, mất món phẩm thường (túi đầy thì Tự đánh tự bán / phân giải món rẻ sau
// mỗi lần nhặt), còn mọi món khác giữ nguyên (so theo uid, chỉ số nhảy; thứ tự trong túi không tính). Thêm hay mất món phẩm cao, món
// đổi chữ / cờ (khoá, phẩm, dòng): không phải.
// 21/11/2026: bản đầu chỉ coi "thêm món ở cuối" là chậm, nên túi đầy thì mỗi lần nhặt (phân giải một món rẻ, nhét món mới) là một
// lần gửi nhanh kèm cả túi. Đo bằng tools/kiem/do-nhip.mjs: ở đảo đầu game chỉ bớt được 0–1 lần gửi mỗi 3 phút (đồ rơi thưa), nơi
// đồ rơi dày thì bớt nhiều hơn; treo máy lâu thì ai cũng đầy túi.
export function tuiDoiThuong(cu, moi, thuong) {
  if (!Array.isArray(cu) || !Array.isArray(moi)) return false;
  const con = new Map();
  for (const it of cu) { if (!it || typeof it.uid !== 'number' || con.has(it.uid)) return false; con.set(it.uid, it); }
  for (const it of moi) {
    if (!it || typeof it.uid !== 'number') return false;
    const c = con.get(it.uid);
    if (c) { if (!chiSoNhay(c, it)) return false; con.delete(it.uid); }
    else if (!thuong.has(it.rarity)) return false;   // món mới phẩm cao
  }
  for (const it of con.values()) if (!thuong.has(it.rarity)) return false;   // mất món phẩm cao
  return true;
}

// nhip: { nhanh: [khoá luôn gửi nhanh], do_thuong: [phẩm món nhặt thêm vẫn tính là chậm] }; không đưa thì plan().cham luôn false (một nhịp như cũ)
export function createSaveDiff(nhip) {
  let snap = null;   // Map khoá → chuỗi JSON, bản máy chủ đã nhận
  const nhanh = new Set(nhip?.nhanh || []), thuong = new Set(nhip?.do_thuong || []);
  const khoaCham = (k, s) => {   // khoá k đổi từ bản máy chủ đã nhận sang chuỗi s: có phải chỉ là số nhảy không
    if (nhanh.has(k)) return false;
    let moi; try { moi = JSON.parse(s); } catch { return false; }
    if (!snap.has(k)) return typeof moi === 'number';
    let cu; try { cu = JSON.parse(snap.get(k)); } catch { return false; }
    return chiSoNhay(cu, moi) || (k === 'bag' && tuiDoiThuong(cu, moi, thuong));
  };

  // So bản sắp gửi với bản đã nhận: { cur, full (chưa có gốc), changed, cham (mọi thay đổi chỉ là số nhảy: gom gửi thưa được),
  // vi (khoá đổi + khoá VOLATILE), xoa (khoá đã xoá) }
  function plan(body) {
    const cur = new Map();
    for (const [k, v] of Object.entries(body)) { const s = JSON.stringify(v); if (s !== undefined) cur.set(k, s); }
    if (!snap) return { cur, full: true, changed: true, cham: false, vi: null, xoa: [] };
    const vi = {}, xoa = [];
    let changed = false, cham = !!nhip;
    for (const [k, s] of cur) {
      if (VOLATILE.has(k)) vi[k] = body[k];
      else if (snap.get(k) !== s) { vi[k] = body[k]; changed = true; if (cham && !khoaCham(k, s)) cham = false; }
    }
    for (const k of snap.keys()) if (!cur.has(k) && !VOLATILE.has(k)) { xoa.push(k); changed = true; cham = false; }
    return { cur, full: false, changed, cham: changed && cham, vi, xoa };
  }

  // Máy chủ đã nhận bản p.cur (gửi cả hay gửi phần đổi đều vậy: khoá không gửi vốn y bản cũ)
  function ack(p, sua) {
    snap = new Map(p.cur);
    if (!sua || typeof sua !== 'object') return;
    for (const k of Object.keys(sua)) {
      if (!FIX_KEYS[k]) { snap = null; return; }
      for (const key of FIX_KEYS[k]) snap.delete(key);
    }
  }

  return { plan, ack, reset: () => { snap = null; }, get ready() { return !!snap; } };
}
