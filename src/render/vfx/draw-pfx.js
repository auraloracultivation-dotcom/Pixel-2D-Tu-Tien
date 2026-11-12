// Vẽ hiệu ứng chiêu điểm ảnh (trạng thái ở src/game/pfx.js, công thức data/vfx.json → px, hình pfx.* vẽ bằng ./pfx.js).
// Hai lớp: lớp DƯỚI CHÂN (trận pháp, mặt đất của vùng chiêu) vẽ trước người, quái để không che họ; lớp TRÊN CÙNG (đạn, nổ, khiên,
// cột sáng, hạt) vẽ sau cùng, đè nhà cửa, người (quy tắc chiêu 05/11/2026, docs/02-CHUAN-PIXEL.md).
import { pxOf } from '../../game/pfx.js';
import { pfxBegin, pfxDraw, pfxParts, pfxWarm, pfxReady, pfxClipAhead } from './pfx.js';
import { skillSlots } from '../../game/skills.js';
import { darkness } from '../draw-lights.js';
import { drawPbGround } from '../draw-pb-px.js';

// trời tối: lớp sáng rực hơn; máy đã tự hạ xuống mức nhẹ nhất (src/core/perf.js, mức 3): bỏ hẳn lớp sáng cộng (phần nặng nhất khi vẽ)
export const pxLightK = game => (+(document.body.dataset.perf || 0) >= 3 ? 0 : (game.data.vfx.px_light?.[0] ?? 0.6) + (game.data.vfx.px_light?.[1] ?? 0.4) * darkness(game));
const lightK = pxLightK;

const zfade = z => Math.min(1, z.t * 4, (z.dur - z.t) * 2);
const zones = game => (game.vfx?.pz?.length ? game.zones.concat(game.vfx.pz) : game.zones);   // vùng thật + vùng chỉ hình của người khác (pfx.js)
const zone = (ctx, art, z, name, Z) => { const fade = zfade(z); if (name && fade > 0) pfxDraw(ctx, art, name, z.x, z.y + (Z.dy || 0), z.t, { loop: true, a: fade * (Z.a ?? 1), k: Z.k }); };
function orbit(ctx, art, z, O) {   // hình bay vòng quanh tâm vùng (kim luân): con ở nửa xa vẽ trước; ghost: số bóng mờ kéo sau mỗi con
  const fade = zfade(z), list = [];
  for (let i = 0; i < O.n; i++) for (let g = O.ghost || 0; g >= 0; g--) {
    const a = z.t * (O.spd || 1) * Math.PI * 2 + (i * Math.PI * 2) / O.n - g * 0.17;
    list.push([z.x + Math.cos(a) * z.radius * O.r, z.y - 8 + Math.sin(a) * z.radius * O.r * 0.84, g ? 0.42 / g : 1, g ? 0.3 : 1]);
  }
  list.sort((a, b) => a[1] - b[1] || a[2] - b[2]);
  for (const [x, y, al, li] of list) pfxDraw(ctx, art, O.s, x, y, z.t, { loop: true, a: fade * al, light: li });
}

function inst(ctx, art, f) {
  if (f.t < 0) return;
  if (!pfxReady(art, f.s) && (f.wait = (f.wait || 0) + 1) < 150) { f.t = 0; return; }   // hình chưa tải xong (chiêu của người khác, lần đầu): giữ ở khung đầu, tải xong mới diễn
  const w = f.sw, o = { dir: f.dir, flip: f.flip, k: f.k, a: f.fo ? f.a * Math.max(0, Math.min(1, (f.dur - f.t) / f.fo)) : f.a, loop: !!f.loop, pal: f.pal, snap: f.snap, rot: f.rot };
  if (w) {   // hình lướt: ba bóng mờ ở các vị trí vừa đi qua, tới nơi thì tan nhanh
    const al = f.t < w.go ? 1 : Math.max(0, 1 - (f.t - w.go) / (f.dur - w.go));
    for (let i = 3; i >= 1; i--) { const u = Math.max(0, Math.min(1, (f.t - i * 0.035) / w.go)), e = 1 - (1 - u) ** 2; pfxDraw(ctx, art, f.s, w.x0 + (w.x1 - w.x0) * e, w.y0 + (w.y1 - w.y0) * e, f.t, { ...o, a: 0.3 * al / i, light: 0.4 }); }
    o.a = al;
  }
  pfxDraw(ctx, art, f.s, f.x, f.y, f.t, o);
}

// Tải sẵn hình của các chiêu đang gắn trên thanh chiêu (đổi chiêu thì tải thêm): lần tung đầu không bị trống hình
let warmed = '';
function warm(game, art) {
  const ids = skillSlots(game).filter(Boolean), sig = ids.join();
  if (sig === warmed) return;
  warmed = sig;
  for (const id of ids) {
    const R = pxOf(game, id);
    if (R) for (const s of [R.shot?.s, R.zone?.s, R.zone?.g, R.zone?.orbit?.s, R.self?.s, R.self?.g, R.dash?.s, ...(R.warm || []), ...[R.cast, R.hit, R.boom, R.mob, R.dash?.end].flatMap(l => (l || []).map(c => c.s))]) if (s) pfxWarm(art, s);
  }
}

// Khiên, hào quang bọc người: layer 'g' lớp dưới chân, 's' lớp nổi
function self(ctx, game, art, who, layer) {
  const Rs = who.shield > 0 && who.shieldT > 0 && pxOf(game, who.shieldSk)?.self, Rb = who.buffT > 0 && pxOf(game, who.buffSk)?.self;
  if (Rs?.[layer]) pfxDraw(ctx, art, Rs[layer], who.x, who.y + (Rs.dy || 0), game.time, { loop: true, a: Math.min(1, who.shieldT * 2) * (Rs.a ?? 1), k: Rs.k });
  if (Rb?.[layer]) pfxDraw(ctx, art, Rb[layer], who.x, who.y + (Rb.dy || 0), game.time, { loop: true, a: Math.min(1, who.buffT * 2) * (Rb.a ?? 1), k: Rb.k });
}

// Lớp dưới chân: gọi trong lượt vẽ thế giới, trước khi vẽ người và quái
export function drawPxGround(ctx, game) {
  const S = game.vfx, art = game.data.art;
  if (!game.data.vfx?.px) return;
  ctx.save(); pfxBegin(ctx, lightK(game), game.data.vfx.pb?.ramps);
  for (const z of zones(game)) { const Z = pxOf(game, z.sk)?.zone; if (Z) zone(ctx, art, z, Z.g, Z); }
  self(ctx, game, art, game.player, 'g');
  for (const e of game.duel?.mob ? game.duel.foes : []) self(ctx, game, art, e, 'g');
  if (game.pfxOn) drawPbGround(ctx, game);   // đòn pháp bảo: vòng trận, vành xung kích, bóng ấn (../draw-pb-px.js)
  for (const f of S?.px || []) if (f.g) inst(ctx, art, f);
  ctx.restore();
}

// Lớp trên cùng: gọi trong drawVfx
export function drawPx(ctx, game) {
  const S = game.vfx, art = game.data.art;
  if (!game.data.vfx?.px) return;
  warm(game, art);
  ctx.save(); pfxBegin(ctx, lightK(game), game.data.vfx.pb?.ramps);
  for (const z of zones(game)) { const Z = pxOf(game, z.sk)?.zone; if (Z) { zone(ctx, art, z, Z.s, Z); if (Z.orbit) orbit(ctx, art, z, Z.orbit); } }
  self(ctx, game, art, game.player, 's');
  for (const e of game.duel?.mob ? game.duel.foes : []) self(ctx, game, art, e, 's');
  const many = {};   // chiêu bắn nhiều viên: chia bớt độ rực lớp sáng cho khỏi trắng xoá cả màn
  for (const b of game.bullets) if (pxOf(game, b.sk)?.shot) many[b.sk] = (many[b.sk] || 0) + 1;
  for (const b of game.bullets) {
    const B = pxOf(game, b.sk)?.shot;
    if (!B) continue;
    const dir = Math.atan2(b.vy, b.vx), o = { dir, loop: true, k: B.k, a: Math.min(1, (b.pt || 0) * 12 + 0.3), light: Math.min(1, 2.2 / many[b.sk]) };
    if (B.emerge && b.ox != null && Math.hypot(b.x - b.ox, b.y - b.oy) < B.emerge) { ctx.save(); pfxClipAhead(ctx, b.ox, b.oy, dir, 6); pfxDraw(ctx, art, B.s, b.x, b.y, b.pt || 0, o); ctx.restore(); }
    else pfxDraw(ctx, art, B.s, b.x, b.y, b.pt || 0, o);
  }
  for (const f of S?.px || []) if (!f.g) inst(ctx, art, f);
  if (S?.pp?.length) pfxParts(ctx, S.pp);
  ctx.restore();
}
