// Chân đồ lễ hội (data/le-hoi.json, bản đồ khai ở khoá hoi): mỗi món chắn đường theo kiểu chân của nó (nhà chắn cả bề ngang,
// cổng chỉ chắn hai chân cột, cây chắn gốc, cầu mở lối qua hồ băng). Trả về tập ô chắn và tập ô mở để map.js tra va chạm,
// cùng danh sách món đã tính sẵn toạ độ thế giới để src/render/draw-hoi.js vẽ.

// Kiểu chân của mã hình: tiền tố dài nhất trong kinds thắng
export function hoiKind(L, id) {
  let best = '', kind = 'nho';
  for (const p in L.kinds) if (id.startsWith(p) && p.length > best.length) { best = p; kind = L.kinds[p]; }
  return kind;
}

// Món hội của bản đồ: { id, spr, x, y (chân, đơn vị thế giới), w, h (cỡ hình theo đơn vị thế giới), kind, foot }
export function hoiItems(def, data, T) {
  const L = data['le-hoi'], S = data.art?.sprites || {};
  if (!def.hoi || !L) return [];
  const out = [];
  for (const [id, tx, ty] of def.hoi.do || []) {
    const spr = S[id];
    if (!spr) continue;
    const k = spr.scale || 1, kind = hoiKind(L, id);
    out.push({ id, spr, x: tx * T, y: ty * T, w: spr.w * k, h: spr.h * k, k, kind, foot: L.foot[kind] || {} });
  }
  return out.sort((a, b) => a.y - b.y);
}

// Ô chắn (solid) và ô mở (open: cầu) của mọi món
export function hoiCells(items, T) {
  const solid = new Set(), open = new Set();
  const mark = (set, x0, x1, y0, y1) => {   // ô có tâm nằm trong khung; khung hẹp hơn một ô thì lấy ô chứa giữa khung
    const n0 = set.size;
    for (let ty = Math.floor(y0 / T); ty * T < y1; ty++) for (let tx = Math.floor(x0 / T); tx * T < x1; tx++) {
      const cx = (tx + 0.5) * T, cy = (ty + 0.5) * T;
      if (cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1) set.add(tx + ',' + ty);
    }
    if (set.size === n0) set.add(Math.floor((x0 + x1) / 2 / T) + ',' + Math.floor((y1 - 1) / T));
  };
  for (const it of items) {
    const f = it.foot;
    if (f.flat || (!f.w && !f.walk)) continue;
    let d = f.dh ? it.h * f.dh : (f.d || 0) * T;
    if (f.d && f.dh) d = Math.min((f.d) * T, it.h * f.dh);
    if (f.cap) d = Math.min(d, f.cap * T);
    const w = Math.max(f.min || 0, it.w * f.w), y0 = it.y - d, y1 = it.y;
    if (f.walk) { mark(open, it.x - w / 2, it.x + w / 2, y0, y1); continue; }
    if (f.pillars) {
      const pw = it.w * f.w, L0 = it.x - it.w / 2 + it.w * 0.03, R1 = it.x + it.w / 2 - it.w * 0.03;
      mark(solid, L0, L0 + pw, y0, y1); mark(solid, R1 - pw, R1, y0, y1);
    } else mark(solid, it.x - w / 2, it.x + w / 2, y0, y1);
  }
  return { solid, open };
}

// Ô bị hình đồ hội đứng che (mái nhà, tán cây vươn lên trên chân): đặt mạch khoáng, đèn trang trí ở đó thì bị che khuất
export function hoiCovers(map, tx, ty) {
  const x = (tx + 0.5) * map.T, y = (ty + 0.5) * map.T;
  return (map.hoi || []).some(it => !it.foot.flat && x > it.x - it.w / 2 && x < it.x + it.w / 2 && y > it.y - it.h && y < it.y);
}
