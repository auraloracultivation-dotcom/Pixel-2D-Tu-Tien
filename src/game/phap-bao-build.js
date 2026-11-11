// Dựng "cây đòn" của một pháp bảo từ đòn gốc (data/phap-bao.json types.*.emit) và chiêu khảm theo thứ tự ô (mods).
// Luật (chủ dự án 12/11/2026): ô sau tác động lên thứ ô trước tạo ra (con trỏ cur luôn là phần sâu nhất của cây);
// thứ sinh ra kế thừa hệ của thứ sinh ra nó (nút con chép els lúc tạo, hệ khảm sau chỉ vào nút đang trỏ).
// Nút: { kind: shot|wave|ring|blast|zone|seal, look, mul, r, speed, range, arc, dur, tick, n, spread, rep, gap,
//        pierce, bounce, chain, homing, seek, orbit, els[], child (nổ khi trúng), shards (mảnh bắn ra khi nổ / hết) }
// Cờ chung cả món: steal (hút máu), dmgMul, cdMul, mpMul, procs (Lôi Kích, Phản Chấn, Tử Bạo, Bạo Kích Liên Hoàn).
import { PB, pbMods } from './phap-bao.js';

const DIRECTED = new Set(['shot', 'wave']);

export function buildCast(game, it) {
  const D = PB(game), T = D.types[it.type];
  const root = { ...T.emit, mul: T.mult, n: 1, spread: 0, rep: 0, pierce: 0, bounce: 0, chain: 0, els: [], color: T.color };
  const out = { it, T, root, steal: 0, dmgMul: 1, cdMul: 1, mpMul: 1, procs: {}, lvMul: 1 + D.level.per * (it.lv || 0) };
  let cur = root;
  for (const id of pbMods(game, it)) {
    const M = D.mods[id];
    switch (M.group) {
      case 'he':
        if (!cur.els.includes(M.el)) cur.els.push(M.el);
        cur.mul *= D.elements.dmg;
        break;
      case 'kich':
        out.procs[id] = M;
        break;
      case 'ho':
        if (M.steal) out.steal += M.steal;
        if (M.dmg) out.dmgMul *= M.dmg;
        if (M.cd) out.cdMul *= M.cd;
        if (M.mp) out.mpMul *= M.mp;
        break;
      default:
        cur = shape(id, M, cur, T);
    }
  }
  // Lớn dần theo phẩm, cấp (data/phap-bao.json → fx, chủ dự án 12/11/2026 04:14): nhân cả vùng trúng lẫn hình (draw-phap-bao.js đọc vis, look)
  const F = D.fx, G = F?.grade?.[it.grade] || {};
  out.vis = (G.k || 1) * (1 + (F?.lv_k || 0) * (it.lv || 0));
  out.look = G;
  grow(root, out.vis, new Set());
  return out;
}

// Nhân bán kính, tầm, vòng xoay của cả cây đòn (nút con, mảnh) theo k
function grow(n, k, seen) {
  if (!n || seen.has(n) || k === 1) return;
  seen.add(n);
  for (const f of ['r', 'range', 'reach', 'bounceR']) if (n[f]) n[f] *= k;
  if (n.orbit) n.orbit = { ...n.orbit, rad: n.orbit.rad * k };
  grow(n.child, k, seen); grow(n.shards, k, seen);
}

// Chiêu Hình Dạng: đổi nút đang trỏ, trả nút trỏ mới (nút con nếu vừa sinh ra)
function shape(id, M, cur, T) {
  switch (id) {
    case 'toa-nhanh':
      if (DIRECTED.has(cur.kind) && !cur.orbit) { cur.n = Math.min(9, cur.n * M.n); cur.spread = M.spread; cur.mul *= M.mul; return cur; }
      // đòn vùng (nổ, sóng vòng, trận, ấn) hoặc cầu xoay: khi nổ / hết thì bắn 3 mảnh tỏa đều; mảnh thành nút đang trỏ
      cur.shards = { kind: 'shot', look: 'manh', speed: 300, range: 105, r: 10, mul: T.mult * M.mul, n: M.n, spread: 360, rep: 0, pierce: 0, bounce: 0, chain: 0, els: [...cur.els], color: cur.color };
      return cur.shards;
    case 'lien-phat':
      cur.rep += 1; cur.gap = M.gap; cur.mul *= M.mul;
      return cur;
    case 'danh-lan':
      cur.mul *= M.mul;
      cur.child = { kind: 'blast', look: 'no', r: M.r, mul: T.mult * M.child, n: 1, spread: 0, rep: 0, pierce: 0, bounce: 0, chain: 0, els: [...cur.els], color: cur.color };
      return cur.child;
    case 'xuyen-thau':
      if (cur.kind === 'shot') { cur.pierce += M.pierce; cur.speed *= M.speed; }
      else { cur.r = (cur.r || 0) * M.grow; if (cur.range) cur.range *= M.grow; cur.mul *= M.mul; }
      return cur;
    case 'nay-bat':
      if (cur.kind === 'shot') cur.bounce += M.bounce; else cur.chain += M.bounce;
      cur.bounceMul = M.mul; cur.bounceR = M.range;
      return cur;
    case 'cau-xoay':
      cur.orbit = { rad: M.rad, dur: M.dur, tick: M.tick, n: Math.max(M.n, cur.n) };
      cur.mul *= M.mul;
      return cur;
    case 'truy-kich':
      if (cur.kind === 'shot') cur.homing = M.turn; else cur.seek = true;
      cur.mul *= M.mul;
      return cur;
  }
  return cur;
}

// Hai hệ cùng một nút: tương sinh thì hiệu ứng hệ sau mạnh thêm, tương khắc thì cả hai yếu đi
export function elementMul(game, els) {
  const E = PB(game).elements, mul = {};
  for (const e of els) mul[e] = 1;
  for (const [a, b] of E.sinh) if (els.includes(a) && els.includes(b)) mul[b] *= E.sinh_mul;
  for (const [a, b] of E.khac) if (els.includes(a) && els.includes(b)) { mul[a] *= E.khac_mul; mul[b] *= E.khac_mul; }
  return mul;
}
