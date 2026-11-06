// Phần thuần của máy chủ phòng (không gọi mạng, không dùng API Cloudflare): kiểm tên phòng, làm sạch tin, giới hạn tốc độ, gói lô.
// Dùng chung cho src/phong.js và bài thử tools/cloud/phong.test.mjs (chạy trong Node).

// Hai loại phòng:
//  - "dao:<bản đồ>" : người cùng bản đồ thấy nhau. Tối đa CAP.dao người mỗi tuyến; vị trí gom lô 200 ms rồi phát một gói cho mọi người.
//  - "to:<mã đội>"  : tổ đội bí cảnh (tối đa CAP.to người). Tin của đội chuyển tiếp ngay (cần nhanh: quái, đòn đánh).
export const CAP = { dao: 40, to: 6 };
export const LINES_MAX = 60;            // tối đa 60 tuyến mỗi bản đồ = 2.400 người cùng một bản đồ
export const BATCH_MS = 200;
export const MSG_MAX = 8192;            // byte mỗi tin gửi lên (tin đội có danh sách quái)
// Giới hạn tốc độ mỗi kết nối (thùng token): rate tin/giây, tối đa burst. Vượt kéo dài thì đóng kết nối.
export const RATE = { dao: { rate: 6, burst: 20 }, to: { rate: 14, burst: 40 } };
export const KICK_DROPS = 200;          // bị bỏ quá 200 tin liên tiếp vì quá nhanh → đóng (máy khách sửa đổi gửi dồn dập)

const ROOM = /^(dao|to):[A-Za-z0-9_:-]{1,80}$/;
export function parseRoom(r, line) {
  if (typeof r !== 'string' || !ROOM.test(r)) return null;
  const kind = r.slice(0, r.indexOf(':'));
  const l = kind === 'dao' ? Math.min(LINES_MAX, Math.max(1, Math.floor(Number(line) || 1))) : 1;
  return { kind, room: r, line: l, name: kind === 'dao' ? `${r}#${l}` : r, cap: CAP[kind] };
}

const BAD = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿<>]/g;
export const cleanStr = (v, max) => (typeof v === 'string' ? Array.from(v.replace(BAD, '').replace(/\s+/g, ' ').trim()).slice(0, max).join('') : '');
const WORD = /^[\w-]{1,48}$/;
const word = v => (typeof v === 'string' && WORD.test(v) ? v : undefined);
const num = (v, lo, hi) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : null);

// Hồ sơ hiển thị (máy người xem vẫn tự lọc lại theo data/ ở game/others-net.js)
export function cleanProf(p) {
  if (!p || typeof p !== 'object') return {};
  const o = { name: cleanStr(p.name, 24) || 'Đạo hữu', realm: cleanStr(p.realm, 24) };
  for (const k of ['element', 'look', 'outfit', 'mount', 'pet', 'comp', 'title']) { const w = word(p[k]); if (w) o[k] = w; }
  return o;
}

// Một gói vị trí → mảng gọn [x, y, fx, fy, sw, act] (null nếu sai)
export function cleanMove(m) {
  const x = num(m?.x, -1, 1e5), y = num(m?.y, -1, 1e5);
  if (x === null || y === null) return null;
  return [Math.round(x), Math.round(y), +(num(m.fx, -1, 1) || 0).toFixed(2), +(num(m.fy, -1, 1) || 0).toFixed(2), m.sw ? 1 : 0, word(m.a) || 0];
}

// Chào hỏi / trò chuyện tại chỗ: { e: mã biểu cảm } hoặc { m: chữ ≤ 120 }
export function cleanSay(s) {
  const e = word(s?.e);
  if (e) return { e };
  const m = cleanStr(s?.m, 120);
  return m ? { m } : null;
}

// Hiệu ứng chiêu cho người xem (chỉ để nhìn, không tính sát thương): { k: mã chiêu, x, y, fx, fy }
export function cleanCast(c) {
  const k = word(c?.k), mv = cleanMove(c);
  return k && mv ? { k, x: mv[0], y: mv[1], fx: mv[2], fy: mv[3] } : null;
}

// Thùng token
export function bucket(cfg, now) { return { t: cfg.burst, at: now, drop: 0 }; }
export function take(b, cfg, now) {
  b.t = Math.min(cfg.burst, b.t + (now - b.at) / 1000 * cfg.rate); b.at = now;
  if (b.t >= 1) { b.t -= 1; b.drop = 0; return true; }
  b.drop += 1;
  return false;
}

// Gói lô gửi xuống: { t: 'b', m: [[id, x, y, fx, fy, sw, act], ...], s: [[id, say]], k: [[id, cast]] } (chỉ vị trí mới nhất mỗi người)
export function makeBatch(moves, says, casts) {
  const out = { t: 'b' };
  if (moves.size) out.m = [...moves].map(([id, mv]) => [id, ...mv]);
  if (says.length) out.s = says;
  if (casts.length) out.k = casts;
  return out;
}
