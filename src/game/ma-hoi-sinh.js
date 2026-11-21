// Ma gục thì hồi sinh ở một chỗ ngẫu nhiên xa làng (chủ dự án 22/11/2026 03:17: "quên mất chưa làm điểm hồi sinh cho người hoá ma"; bảng câu hỏi
// 03:2x: "Chỗ ngẫu nhiên xa làng" — mỗi lần một chỗ khác trên tinh cầu đó, không ai canh được; "ma phải hồi sinh ở chỗ của ma" — đang là ma
// mà gục thì không hỏi "Về động phủ", ghost.js). ghost.js maHoiSinh gọi khi ma gục trên tinh cầu ngoài trời; bí cảnh, tháp, trong nhà, động phủ,
// đài so tài, độ kiếp: hồi sinh như cũ. Số ở data/pvp.json → ma.hoi_sinh. Thuần (chỉ đọc bản đồ): tools/ma-hoi-sinh.test.mjs thử trên mọi tinh cầu.

// Mốc làng (toạ độ ô): điểm vào và mọi điểm đến từ nơi khác, mốc có tên (pháp trận, bến cầu...), cổng, NPC. them: mốc thêm (vòng pháp trận PvP)
export function mocLang(def, them = []) {
  const o = [], vao = v => { if (Array.isArray(v) && Number.isFinite(v[0]) && Number.isFinite(v[1])) o.push([v[0], v[1]]); };
  for (const v of Object.values(def.spawns || {})) vao(v);
  for (const v of Object.values(def.moc || {})) vao(v);
  for (const x of [...(def.portals || []), ...(def.npcs || [])]) vao(x?.at);
  for (const v of them) vao(v);
  return o;
}

// Các ô đi tới được từ ô (x0, y0): loang bốn hướng qua ô không chắn (ma không bị thả vào chỗ kín vách đá, nước bao quanh). Trả chỉ số ô y * w + x
export function oToi(map, x0, y0) {
  const W = map.w, seen = new Uint8Array(W * map.h), q = [];
  const vao = (x, y) => {
    if (x < 0 || y < 0 || x >= W || y >= map.h) return;
    const i = y * W + x;
    if (seen[i] || map.solidTile(x, y)) return;
    seen[i] = 1; q.push(i);
  };
  vao(x0, y0);
  for (let k = 0; k < q.length; k++) { const i = q[k], x = i % W, y = (i - x) / W; vao(x + 1, y); vao(x - 1, y); vao(x, y + 1); vao(x, y - 1); }
  return q;
}

// Các ô ma có thể hồi sinh: đi tới được từ điểm vào, cách mốc làng gần nhất ít nhất can = min(xa, ti_le × khoảng cách xa nhất có được) ô (tinh cầu
// nhỏ không đủ xa thì lấy phần xa nhất), ưu tiên ô ngoài bãi quái (bán kính bãi + quai ô) nếu còn ít nhất it ô. o: { H: ma.hoi_sinh, r: bán kính người,
// quai: các bãi quái { at, spread }, them: mốc thêm, rnd }. Trả { o: chỉ số ô, can, max } (bài thử đọc can, max)
export function oMa(map, o) {
  const { H, r = 6, quai = [], them = [], rnd = Math.random } = o, def = map.def, sp = def.spawns?.vao, W = map.w;
  if (!H || !sp) return null;
  const s0 = map.freeNear(sp[0], sp[1], 0, r, rnd), ds = oToi(map, Math.floor(s0.x / map.T), Math.floor(s0.y / map.T));
  const moc = mocLang(def, them), xa = new Float32Array(ds.length);
  let max = 0;
  for (let k = 0; k < ds.length; k++) {
    const x = ds[k] % W, y = (ds[k] - x) / W;
    let d = Infinity;
    for (const m of moc) { const v = Math.hypot(x - m[0], y - m[1]); if (v < d) d = v; }
    xa[k] = d; if (d > max && d < Infinity) max = d;
  }
  const can = Math.min(H.xa, max * H.ti_le), ngoai = [], gan = [];
  for (let k = 0; k < ds.length; k++) {
    if (!(xa[k] >= can)) continue;
    const x = ds[k] % W, y = (ds[k] - x) / W;
    (quai.some(s => s?.at && Math.hypot(x - s.at[0], y - s.at[1]) < (s.spread ?? 3) + H.quai) ? gan : ngoai).push(ds[k]);
  }
  return { o: ngoai.length >= H.it ? ngoai : ngoai.concat(gan), can, max };
}

// Chọn một chỗ ngẫu nhiên trong các ô trên (tâm ô, điểm ảnh; thân người không chạm vách). null: tinh cầu không có chỗ nào (không xảy ra trên bản đồ thật)
export function choMa(map, o) {
  const c = oMa(map, o), rnd = o.rnd || Math.random;
  if (!c?.o.length) return null;
  for (let i = 0; i < 40; i++) {
    const t = c.o[Math.floor(rnd() * c.o.length)], x = t % map.w, p = map.center(x, (t - x) / map.w);
    if (!map.blocked(p.x, p.y, o.r ?? 6)) return p;
  }
  return null;
}
