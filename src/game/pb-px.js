// Đòn pháp bảo điểm ảnh (chủ dự án 13/11/2026: "xây lại toàn bộ hiệu ứng kỹ năng", bỏ ảnh GPT; từ Mùa 2 thứ người chơi thấy mỗi lần bấm nút
// là đòn pháp bảo). File này giữ nhịp phần hình cho các thực thể ở game.pbx.list (src/game/phap-bao-run.js) khi hiệu ứng điểm ảnh bật
// (src/game/pfx.js → pxOn): lúc một thực thể vừa sinh thì bật hình một lượt (nổ, quạt phẩy, lưỡi gió, sét…), mỗi khung thì rải hạt (đuôi
// đạn, linh khí hút về hồ lô, bụi sáng trong trận), lúc trúng quái thì tóe tia. Hình bám theo thực thể (kiếm, châu, ấn đang rơi, cờ, khiên)
// vẽ ở src/render/draw-pb-px.js. Số ở data/vfx.json → pb (dải màu, hạt, cỡ). Px tắt thì không làm gì: bộ vẽ cũ lo hết.
import { pxOn, pxAdd, pxSpray } from './pfx.js';
import { pbSfx, warmPbSfx } from './skill-sfx.js';
import { pbWorn } from './phap-bao.js';

const TAU = Math.PI * 2, rnd = (a, b) => a + Math.random() * (b - a);
const cfg = game => game.data.vfx.pb;
const half = v => Math.max(0.5, Math.round(v * 2) / 2);
const lowFx = () => +(globalThis.document?.body?.dataset.perf || 0) >= 3;   // máy chậm: nửa số hạt

export const pbPx = game => pxOn(game) && !!game.data.vfx.pb;
// Dải màu của một đòn: hệ khảm sau cùng của nút, không thì dải riêng của món
export function pbRamp(game, e) { const N = e.node || e.cast?.root, el = N?.els?.[N.els.length - 1]; return el || cfg(game).base[e.cast?.it?.type] || 'vang'; }
export const pbVis = e => e.cast?.vis || 1;
// Số điểm khung vẽ cho một điểm hình kiểu look (lớn dần theo phẩm, cấp; làm tròn nửa điểm cho nét đều)
export const pbK = (game, e, look, mul = 1) => half((cfg(game).k[look] || 1) * pbVis(e) * mul);
// Món vẽ theo cỡ điểm của nhân vật (tranh gốc thu về, tools/art/pb_vat.py): chỉ phóng số nguyên, nét mới đều
export const pbKi = (game, e, look) => Math.max(1, Math.round((cfg(game).k[look] || 1) * pbVis(e)));
export const pbCol = (game, ramp, u = 0.6) => { const R = cfg(game).ramps[ramp]; return R[Math.round(u * (R.length - 1))]; };
// Cỡ để nửa bề ngang của hình s phủ bán kính r (đơn vị bản đồ) × f; không quá max (điểm ảnh to quá 1,5 lần điểm thế giới thì thô)
const fitK = (game, s, r, f = 1, max = 3) => { const q = game.data.art.sprites['pfx.' + s]; return q ? Math.min(max, half(r * f / (q.w * (q.k || 0.5) * 0.5))) : 1; };

// Chỗ khối ấn đang treo / đang giáng (chân khối): nửa đầu treo trên cao tụ linh khí, nửa sau lao xuống càng lúc càng nhanh
export function pbSeal(e, vis = 1) {
  const k = Math.min(1, e.t / e.life), u = Math.max(0, (k - 0.55) / 0.45), H = 78 * Math.sqrt(vis);
  return [e.x, e.y - H * (1 - u * u * u) + (u ? 0 : Math.sin(e.t * 7) * 1.5)];
}
// Trái hồ lô lúc hít (hình pb-holo, dáng như tranh gốc: miệng chếch lên 40 độ về phía mặt nhân vật): điểm tựa của hình lơ lửng trên đầu,
// tâm miệng (linh khí bị hút về đó), cỡ hiệu ứng, có lật không. HOLO: tâm miệng cách điểm tựa 35,2 điểm hình theo hướng miệng.
// Trái hồ lô luôn vẽ đúng cỡ điểm nhân vật (k = 1, nét mịn); phẩm cao, cấp cao thì phần hiệu ứng quanh nó (phễu, luồng, sóng) to gấp đôi.
const HOLO = { m: 35.2, ax: Math.cos(-40 * Math.PI / 180), ay: Math.sin(-40 * Math.PI / 180), low: 56 };
export function pbGourd(game, e) {
  const p = game.player, sd = (p.lookX || Math.sign(p.face?.x || 1) || 1) < 0 ? -1 : 1;
  const x = p.x + sd * 2, y = p.y - 26 - HOLO.low * 0.5 + Math.sin((game.time || 0) * 5) * 1.5;
  return [x, y, x + sd * HOLO.m * HOLO.ax * 0.5, y + HOLO.m * HOLO.ay * 0.5, pbKi(game, e, 'holo'), sd < 0];
}

// Một hạt điểm ảnh tự đặt vận tốc (đuôi đạn, linh khí hút vào, bụi sáng bốc lên)
function part(game, name, x, y, vx, vy, life, o = {}) {
  const P = game.data.vfx.part_px?.[name], S = game.vfx;
  if (!P || !S?.pp) return;
  if (S.pp.length >= (game.data.vfx.max_parts || 260)) S.pp.shift();
  S.pp.push({ x, y, vx, vy, g: o.g ?? (P.g || 0) * 0.3, drag: o.drag ?? 0, t: 0, life, s: o.s || (Math.random() < (P.big ?? 0.3) ? 2 : 1), ramp: P.c, add: P.add !== false });
}

// Lúc bấm nút: pháp trận nhỏ bật dưới chân theo màu đòn; Đồng Chung thì quả chuông hiện trên đầu
export function pbPxCast(game, cast) {
  if (!pbPx(game)) return;
  const p = game.player, e = { cast, node: cast.root }, pal = pbRamp(game, e), col = pbCol(game, pal);
  pxAdd(game, { s: 'pb-tran-mo', x: p.x, y: p.y, on: p, g: true, pal });
  if (cast.T.emit.look === 'am') { const K = pbK(game, e, 'chuong'); pxAdd(game, { s: 'pb-chuong', x: p.x, y: p.y, on: p, oy: 27.5 * K - 30, k: K, pal, col }); }
}

// Một thực thể vừa sinh ra
function born(game, e) {
  const C = cfg(game), p = game.player, N = e.node, pal = pbRamp(game, e), P = C.part[pal], col = pbCol(game, pal);
  e.px = { acc: 0, seed: Math.random() * 100 };
  switch (e.kind) {
    case 'shot': pxSpray(game, P, e.x, e.y, N.look === 'manh' ? 2 : 6, 70, { dir: Math.atan2(e.vy, e.vx), cone: 0.5 }); if (N.look === 'manh') pbSfx(game, 'fx', 'manh'); break;
    case 'orbit': pbSfx(game, 'fx', 'xoay'); break;
    case 'wave': {
      const hf = N.arc * Math.PI / 360, go = N.dur;
      if (N.look === 'holo') {   // Hồ Lô phun: trái hồ lô lơ lửng trên đầu chúc miệng xuống vùng trước mặt (lấy đà, phun, xẹp; giật lùi), luồng linh tuyền dội xuống, ba con sóng lan theo hình nón
        const K = pbKi(game, e, 'holo'), c = Math.cos(e.ang), sn = Math.sin(e.ang), gx = c * 5, gy = -42;
        const aim = Math.atan2(sn * N.range * 0.42 - 6 - gy, c * N.range * 0.42 - gx), ca = Math.cos(aim), sa = Math.sin(aim), mx = gx + ca * HOLO.m * 0.5, my = gy + sa * HOLO.m * 0.5, rc = { x: -ca * 8, y: -sa * 8, k: 9 };
        pxAdd(game, { s: 'pb-holo-phun', x: p.x + gx, y: p.y + gy, on: p, ox: gx, oy: gy, dir: aim, snap: 1, k: 1, col, fo: 0.14, rc });
        pxAdd(game, { s: 'pb-holo-tia', x: p.x + mx, y: p.y + my, on: p, ox: mx, oy: my, rot: aim, k: K, pal, col, loop: true, dur: go + 0.14, delay: 0.06, fo: 0.14, rc });
        for (const f of [-0.52, 0.52, 0]) {
          const a = e.ang + f * hf, wx = Math.cos(a), wy = Math.sin(a), d0 = N.range * (f ? 0.34 : 0.44), d1 = N.range * (f ? 0.86 : 0.97);
          pxAdd(game, { s: 'pb-holo-song', x: e.x + wx * d0, y: e.y + wy * d0, rot: a, k: K, pal, col, loop: true, dur: go + 0.2, delay: f ? 0.12 : 0.09, fo: 0.16,
            sw: { x0: e.x + wx * d0, y0: e.y + wy * d0, x1: e.x + wx * d1, y1: e.y + wy * d1, go: go + 0.06, acc: 0 } });
        }
        pxSpray(game, P, p.x + mx + ca * 20, p.y + my + sa * 20, 30, 240, { dir: e.ang, cone: hf * 0.9, life: 0.9 });
        break;
      }
      // Bảo Phiến: chiếc quạt phẩy + ba lưỡi gió toả theo hình nón
      const K = pbK(game, e, 'phong');
      pxAdd(game, { s: 'pb-quat', x: e.x, y: e.y, on: e.follow ? p : null, ox: Math.cos(e.ang) * 7, oy: -4 + Math.sin(e.ang) * 5, dir: e.ang, snap: 1, k: pbK(game, e, 'quat'), pal, col });
      for (const f of [-0.62, 0.62, 0]) {
        const a = e.ang + f * hf, c = Math.cos(a), s = Math.sin(a), d0 = N.range * (f ? 0.2 : 0.3), d1 = N.range * (f ? 0.84 : 0.95);
        pxAdd(game, { s: 'pb-phong', x: e.x + c * d0, y: e.y + s * d0, dir: a, snap: 1, k: K, pal, col, loop: true, dur: go + 0.16, delay: f ? 0 : 0.03,
          sw: { x0: e.x + c * d0, y0: e.y + s * d0, x1: e.x + c * d1, y1: e.y + s * d1, go, acc: 0 } });
      }
      pxSpray(game, P, e.x + Math.cos(e.ang) * 14, e.y + Math.sin(e.ang) * 14, 14, 190, { dir: e.ang, cone: hf * 0.9, life: 0.9 });
      break;
    }
    case 'blast': {
      const big = C.boom[pal], s = big || 'pb-no', tp = big ? null : pal, x = e.x, y = e.y;
      if (N.look === 'an') {   // ấn giáng: đất nứt, đá văng, khối ấn nằm lại một nhịp rồi tan
        const K = half(e.r / 40);
        pxAdd(game, { s: 'dia-chan-d', x, y, g: true, k: K }); pxAdd(game, { s: 'dia-chan', x, y, k: K, col });
        pxAdd(game, { s: 'pb-an', x, y, k: pbK(game, e, 'an'), loop: true, dur: 0.5, fo: 0.3 });
        if (pal !== 'vang') pxAdd(game, { s, pal: tp, x, y: y - 4, k: fitK(game, s, e.r, 0.9), col });
        pxSpray(game, 'da', x, y - 4, 14, 150); pxSpray(game, P, x, y - 8, 12, 120);
      } else if (N.look === 'khien') {   // khiên vỡ: nổ lớn theo màu khiên, mảnh sáng văng
        pxAdd(game, { s, pal: tp, x, y: y - 4, k: fitK(game, s, e.r), col });
        pxSpray(game, P, x, y - 6, 18, 170); pxSpray(game, 'tuyet', x, y - 10, 10, 150);
      } else {   // nổ lan (Đánh Lan, Tử Bạo): nổ vừa; nhiều vụ cùng lúc thì từ vụ thứ ba chỉ còn vành xung kích + hạt (khỏi phủ kín màn)
        const now = game.time || 0, B = (game.pbx.boomT ||= []), s2 = C.hit[pal] || 'pb-no';
        while (B.length && now - B[0] > 0.12) B.shift();
        if (B.length < 2) { B.push(now); pxAdd(game, { s: s2, pal: C.hit[pal] ? null : pal, x, y: y - 4, k: fitK(game, s2, e.r, 0.9, 2.5), col }); pbSfx(game, 'fx', 'no'); }
        pxSpray(game, P, x, y - 6, 8, 110);
      }
      break;
    }
    case 'zap': pxSpray(game, P, e.x2, e.y2, 5, 60); break;
    case 'bolt': pxAdd(game, { s: 'pb-set', x: e.x, y: e.y, col: '#bfe0ff' }); pxAdd(game, { s: 'set-dat', x: e.x, y: e.y, g: true }); pxSpray(game, 'set', e.x, e.y - 6, 8, 90); break;
  }
}

// Mỗi khung: rải hạt theo từng kiểu thực thể
function tick(game, e, dt, low) {
  const C = cfg(game), p = game.player, N = e.node, X = e.px, P = C.part[pbRamp(game, e)], vis = pbVis(e), q = low ? 0.5 : 1;
  switch (e.kind) {
    case 'shot': {
      const sp = Math.hypot(e.vx, e.vy) || 1, ux = e.vx / sp, uy = e.vy / sp, chau = N.look === 'chau', kiem = N.look === 'kiem', back = (chau ? 8 : kiem ? 12 : 4) * vis;
      for (X.acc += dt * (chau ? 34 : kiem ? 26 : 9) * q; X.acc >= 1; X.acc--) part(game, P, e.x - ux * back + rnd(-3, 3) * vis, e.y - uy * back + rnd(-3, 3) * vis, -e.vx * 0.1 + rnd(-10, 10), -e.vy * 0.1 + rnd(-10, 10), rnd(0.25, 0.5), { drag: 1.8 });
      if (e.t >= e.life && !X.end) { X.end = 1; pxSpray(game, P, e.x, e.y, 5, 45); if (e.back && e.cast) pbSfx(game, e.cast.it.type, 've'); }
      break;
    }
    case 'suck': {   // linh khí quanh mình bị hút thẳng về miệng hồ lô
      const R = e.cast.T.pre.r, [, , mx, my] = pbGourd(game, e);
      for (X.acc += dt * 64 * q; X.acc >= 1; X.acc--) { const a = rnd(0, TAU), d = R * rnd(0.4, 1), x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * C.sy, L = rnd(0.3, 0.55); part(game, P, x, y, (mx - x) / L, (my - y) / L, L, { g: 0, s: Math.random() < 0.5 ? 2 : 1 }); }
      break;
    }
    case 'zone': {
      if (!X.land && e.t >= 0.16) { X.land = 1; pxSpray(game, 'da', e.x, e.y, 6, 60); pxSpray(game, P, e.x, e.y - 4, 8, 90); }   // cờ cắm xuống
      if (X.next !== e.next) { X.next = e.next; X.pulse = e.t; if (e.t > 0.3 && game.mobs.some(m => !m.dead && Math.hypot(m.x - e.x, m.y - e.y) < N.r + m.r)) pbSfx(game, e.cast.it.type, 'k'); }   // mỗi nhịp trận gây sát thương: một vành sáng nở ra (draw-pb-px.js), có quái trong trận thì kèm một tiếng khẽ
      for (X.acc += dt * 10 * q * vis; X.acc >= 1; X.acc--) { const a = rnd(0, TAU), d = Math.sqrt(Math.random()) * N.r; part(game, P, e.x + Math.cos(a) * d, e.y + Math.sin(a) * d * C.sy, rnd(-4, 4), -rnd(10, 26), rnd(0.6, 1.1), { g: 0, drag: 0.4, s: 1 }); }
      break;
    }
    case 'seal': {   // linh khí tụ về khối ấn lúc còn treo
      const k = e.t / e.life, [bx, by] = pbSeal(e, vis), cy = by - 14 * pbK(game, e, 'an');
      if (k < 0.55) for (X.acc += dt * 26 * q; X.acc >= 1; X.acc--) { const a = rnd(0, TAU), d = rnd(26, 48) * vis, x = bx + Math.cos(a) * d, y = cy + Math.sin(a) * d, L = rnd(0.22, 0.4); part(game, P, x, y, (bx - x) / L, (cy - y) / L, L, { g: 0 }); }
      break;
    }
    case 'orbit': {
      const O = N.orbit;
      for (X.acc += dt * 12 * q * O.n; X.acc >= 1; X.acc--) { const a = e.t * 4 + Math.floor(Math.random() * O.n) / O.n * TAU; part(game, P, e.x + Math.cos(a) * O.rad + rnd(-2, 2), e.y + Math.sin(a) * O.rad * 0.6 + rnd(-2, 2), rnd(-8, 8), rnd(-8, 8), rnd(0.25, 0.45), { drag: 1.5 }); }
      break;
    }
    case 'ring': {   // hạt bay theo mặt sóng âm
      if (e.t < 0) break;
      const R = N.r * Math.min(1, e.t / e.life);
      for (X.acc += dt * 40 * q; X.acc >= 1; X.acc--) { const a = rnd(0, TAU); part(game, P, e.x + Math.cos(a) * R, e.y + Math.sin(a) * R * C.sy, Math.cos(a) * 30, Math.sin(a) * 26 - 8, rnd(0.25, 0.45), { drag: 2 }); }
      break;
    }
    case 'shield':
      if (!e.done && p.shield < (X.sh ?? p.shield)) { X.hit = e.t; pxSpray(game, P, p.x, p.y - 10, 6, 90); }   // khiên vừa đỡ một đòn: gợn sáng + hạt tóe
      X.sh = p.shield;
      if (!e.done) for (X.acc += dt * 5; X.acc >= 1; X.acc--) { const a = rnd(0, TAU); part(game, P, p.x + Math.cos(a) * 16 * vis, p.y - 12 + Math.sin(a) * 18 * vis, 0, -rnd(6, 14), rnd(0.4, 0.7), { g: 0, s: 1 }); }
      break;
  }
}

// Gọi mỗi khung từ updatePhapBao, TRƯỚC khi lọc thực thể hết giờ (đạn chết ngay khung đầu vẫn kịp nổ hình)
export function updatePbPx(game, dt) {
  const S = game.pbx;
  if (!S || !pbPx(game)) return;
  const low = lowFx();
  warmPbSfx(game, pbWorn(game).map(it => it?.type || ''));
  for (const e of S.list) {
    if (e.kind === 'wait' || e.kind === 'anim') continue;
    if (!e.px) born(game, e);
    tick(game, e, dt, low);
  }
}

// Một đòn trúng quái m: tia trúng theo hệ + hạt tóe (mỗi con quái tối đa ~14 lần / giây; đòn rỉ rả của trận, cầu xoay thưa hơn)
export function pbPxHit(game, node, m, e, soft) {
  if (!m || !pbPx(game)) return;
  const now = game.time || 0, C = cfg(game), pal = pbRamp(game, { node, cast: e?.cast }), y = m.y - (m.r || 6) * 0.7;
  if (now < (m.pbFx || 0)) return;
  m.pbFx = now + (soft ? 0.3 : 0.07);
  if (!soft || e?.kind === 'orbit') { const s = C.hit[pal] || 'pb-trung'; pxAdd(game, { s, pal: C.hit[pal] ? null : pal, x: m.x, y, k: half(C.k.trung * (node.look === 'chau' || node.kind === 'blast' ? 1.5 : 1)), col: pbCol(game, pal) }); }
  pxSpray(game, C.part[pal], m.x, y, soft ? 2 : 5, 60);
}

// Quái vừa bị đóng băng (đủ số đòn hệ Thuỷ): vụn băng tóe + tiếng băng nứt
export function pbPxFreeze(game, m) {
  if (!pbPx(game)) return;
  pxSpray(game, 'tuyet', m.x, m.y - (m.r || 6), 10, 80);
  pbSfx(game, 'fx', 'bang');
}

// Nguồn sáng của đòn pháp bảo cho lớp tối ngày đêm (src/render/draw-lights.js gatherLights)
export function pbLights(game, out, rgbOf) {
  if (!game.pbx || !pbPx(game)) return;
  for (const e of game.pbx.list) {
    if (!e.px) continue;
    const c = rgbOf(pbCol(game, pbRamp(game, e))), N = e.node, v = pbVis(e), k = e.t / e.life;
    if (e.kind === 'shot') out.push({ x: e.x, y: e.y, r: (N.look === 'chau' ? 46 : 30) * v, c, a: 1 });
    else if (e.kind === 'zone') out.push({ x: e.x, y: e.y, r: N.r * 1.15, c, a: 0.75 * Math.min(1, (e.life - e.t) * 2) });
    else if (e.kind === 'seal') out.push({ x: e.x, y: e.y, r: N.r * (0.5 + 0.6 * k), c, a: 0.8 });
    else if (e.kind === 'ring' && e.t >= 0) out.push({ x: e.x, y: e.y, r: N.r * (0.4 + 0.7 * k), c, a: 1 - k });
    else if (e.kind === 'suck') { const [, , mx, my] = pbGourd(game, e); out.push({ x: mx, y: my, r: 44 * v, c, a: 0.5 + 0.5 * k }); }
    else if (e.kind === 'wave') out.push({ x: e.x + Math.cos(e.ang) * N.range * 0.5, y: e.y + Math.sin(e.ang) * N.range * 0.5, r: N.range * 0.6, c, a: 1 - 0.5 * k });
    else if (e.kind === 'shield' && !e.done) out.push({ x: game.player.x, y: game.player.y - 10, r: 34 * v, c, a: 0.6 });
    else if (e.kind === 'orbit') out.push({ x: e.x, y: e.y, r: N.orbit.rad * 1.5, c, a: 0.7 });
  }
}
