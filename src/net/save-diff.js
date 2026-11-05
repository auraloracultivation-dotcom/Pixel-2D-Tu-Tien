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

export function createSaveDiff() {
  let snap = null;   // Map khoá → chuỗi JSON, bản máy chủ đã nhận

  // So bản sắp gửi với bản đã nhận: { cur, full (chưa có gốc), changed, vi (khoá đổi + khoá VOLATILE), xoa (khoá đã xoá) }
  function plan(body) {
    const cur = new Map();
    for (const [k, v] of Object.entries(body)) { const s = JSON.stringify(v); if (s !== undefined) cur.set(k, s); }
    if (!snap) return { cur, full: true, changed: true, vi: null, xoa: [] };
    const vi = {}, xoa = [];
    let changed = false;
    for (const [k, s] of cur) {
      if (VOLATILE.has(k)) vi[k] = body[k];
      else if (snap.get(k) !== s) { vi[k] = body[k]; changed = true; }
    }
    for (const k of snap.keys()) if (!cur.has(k) && !VOLATILE.has(k)) { xoa.push(k); changed = true; }
    return { cur, full: false, changed, vi, xoa };
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
