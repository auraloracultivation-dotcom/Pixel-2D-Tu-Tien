// Vẽ hiệu ứng chiêu điểm ảnh (trạng thái ở src/game/pfx.js, công thức data/vfx.json → px, hình pfx.* vẽ bằng ./pfx.js).
// Hai lớp: lớp DƯỚI CHÂN (trận pháp, mặt đất của vùng chiêu) vẽ trước người, quái để không che họ; lớp TRÊN CÙNG (đạn, nổ, khiên,
// cột sáng, hạt) vẽ sau cùng, đè nhà cửa, người (quy tắc chiêu 05/11/2026, docs/02-CHUAN-PIXEL.md).
import { pxOf } from '../../game/pfx.js';
import { pfxBegin, pfxDraw, pfxParts, pfxWarm, pfxReady, pfxClipAhead } from './pfx.js';
import { skillSlots } from '../../game/skills.js';
import { darkness } from '../draw-lights.js';

const lightK = game => (game.data.vfx.px_light?.[0] ?? 0.6) + (game.data.vfx.px_light?.[1] ?? 0.4) * darkness(game);   // trời tối: lớp sáng rực hơn

function zone(ctx, art, z, Z) {
  const fade = Math.min(1, z.t * 4, (z.dur - z.t) * 2);
  if (fade > 0) pfxDraw(ctx, art, Z.s, z.x, z.y + (Z.dy || 0), z.t, { loop: true, a: fade * (Z.a ?? 1), k: Z.k });
}
function inst(ctx, art, f) {
  if (f.t < 0) return;
  if (!pfxReady(art, f.s) && (f.wait = (f.wait || 0) + 1) < 150) { f.t = 0; return; }   // hình chưa tải xong (chiêu của người khác, lần đầu): giữ ở khung đầu, tải xong mới diễn
  pfxDraw(ctx, art, f.s, f.x, f.y, f.t, { dir: f.dir, flip: f.flip, k: f.k, a: f.a, loop: false });
}

// Tải sẵn hình của các chiêu đang gắn trên thanh chiêu (đổi chiêu thì tải thêm): lần tung đầu không bị trống hình
let warmed = '';
function warm(game, art) {
  const ids = skillSlots(game).filter(Boolean), sig = ids.join();
  if (sig === warmed) return;
  warmed = sig;
  for (const id of ids) {
    const R = pxOf(game, id);
    if (R) for (const s of [R.shot?.s, R.zone?.s, R.self?.s, ...[R.cast, R.hit, R.boom, R.mob].flatMap(l => (l || []).map(c => c.s))]) if (s) pfxWarm(art, s);
  }
}

function self(ctx, game, art, who) {
  const Rs = who.shield > 0 && who.shieldT > 0 && pxOf(game, who.shieldSk)?.self, Rb = who.buffT > 0 && pxOf(game, who.buffSk)?.self;
  if (Rs) pfxDraw(ctx, art, Rs.s, who.x, who.y + (Rs.dy || 0), game.time, { loop: true, a: Math.min(1, who.shieldT * 2) * (Rs.a ?? 1), k: Rs.k });
  if (Rb) pfxDraw(ctx, art, Rb.s, who.x, who.y + (Rb.dy || 0), game.time, { loop: true, a: Math.min(1, who.buffT * 2) * (Rb.a ?? 1), k: Rb.k });
}

// Lớp dưới chân: gọi trong lượt vẽ thế giới, trước khi vẽ người và quái
export function drawPxGround(ctx, game) {
  const S = game.vfx, art = game.data.art;
  if (!game.data.vfx?.px || (!S?.px?.length && !game.zones.length)) return;
  ctx.save(); pfxBegin(ctx, lightK(game));
  for (const z of game.zones) { const Z = pxOf(game, z.sk)?.zone; if (Z?.g) zone(ctx, art, z, Z); }
  for (const f of S?.px || []) if (f.g) inst(ctx, art, f);
  ctx.restore();
}

// Lớp trên cùng: gọi trong drawVfx
export function drawPx(ctx, game) {
  const S = game.vfx, art = game.data.art;
  if (!game.data.vfx?.px) return;
  warm(game, art);
  ctx.save(); pfxBegin(ctx, lightK(game));
  for (const z of game.zones) { const Z = pxOf(game, z.sk)?.zone; if (Z && !Z.g) zone(ctx, art, z, Z); }
  self(ctx, game, art, game.player);
  for (const e of game.duel?.mob ? game.duel.foes : []) self(ctx, game, art, e);
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
