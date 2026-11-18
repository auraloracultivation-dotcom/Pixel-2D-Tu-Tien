// Đồ cao che người (luật thế giới, mục che khuất; chủ dự án 18/11/2026 13:50 "check xem hợp lý chưa"): nhà, cổng, cây, tượng làm lại
// bằng SpriteCook cao tới 12 ô, người đi phía sau bị che mất. Khi nhân vật MÌNH đứng sau một món cao và bị chính hình món đó che
// thì món đó mờ đi (LOW) cho còn thấy người, bước ra thì đặc lại dần. Xét theo điểm ảnh thật của hình (lưới CELL điểm một ô,
// dựng một lần cho mỗi hình), nên đứng sau khoảng trống của cổng, giữa hai cột đình thì món đó không mờ.
const CELL = 4, MIN_H = 36, LOW = 0.42, BODY = [3, 11, 19];   // BODY: ba điểm trên thân người (đơn vị trên chân) đem thử

function occ(spr, im) {
  if (spr._occ !== undefined) return spr._occ;
  try {
    const cv = document.createElement('canvas'); cv.width = spr.w; cv.height = spr.h;
    const g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0, spr.w, spr.h, 0, 0, spr.w, spr.h);
    const d = g.getImageData(0, 0, spr.w, spr.h).data, cw = Math.ceil(spr.w / CELL), ch = Math.ceil(spr.h / CELL), m = new Uint8Array(cw * ch);
    for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) m[y * cw + x] = d[(Math.min(spr.h - 1, y * CELL + 2) * spr.w + Math.min(spr.w - 1, x * CELL + 2)) * 4 + 3] > 40 ? 1 : 0;
    spr._occ = { m, cw, ch };
  } catch { spr._occ = null; }   // không đọc được điểm ảnh (hình chưa tải xong): thôi không mờ
  return spr._occ;
}

// Độ đặc để vẽ món it khung này (1 = đặc). Gọi mỗi khung cho món đang vẽ; tự nhớ độ đặc hiện tại ở it.fa để đổi dần.
export function hoiFade(game, it, im) {
  const p = game.player, s = it.spr, k = it.k;
  let want = 1;
  if (p && !game.bay?.on && it.h >= MIN_H && p.y < it.y - 2) {
    const ox = it.x - s.anchor[0] * k, oy = it.y - s.anchor[1] * k;
    if (p.x > ox && p.x < ox + s.w * k && p.y > oy && p.y - BODY[2] < oy + s.h * k) {
      const o = occ(s, im);
      let hit = 0;
      if (o) for (const dy of BODY) {
        const sx = (p.x - ox) / k, cx = Math.floor((it.flip ? s.w - sx : sx) / CELL), cy = Math.floor((p.y - dy - oy) / k / CELL);
        if (cx >= 0 && cy >= 0 && cx < o.cw && cy < o.ch && o.m[cy * o.cw + cx]) hit++;
      }
      if (hit >= 2) want = LOW;
    }
  }
  const cur = it.fa ?? 1;
  return (it.fa = Math.abs(want - cur) < 0.03 ? want : cur + (want - cur) * 0.2);
}
