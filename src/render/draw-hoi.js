// Đồ lễ hội trên tinh cầu (chủ dự án 02/11/2026: đêm trăng, phố hội đèn đuốc). Hình từ ảnh GPT đã về điểm ảnh thật
// (tools/art/le_hoi.py, data/art.json hb.*), toạ độ, kiểu chân ở src/world/hoi-foot.js. Hiệu ứng vẽ bằng code để điều khiển được:
// đèn lồng, pha lê hắt quầng sáng lập loè (hoiLights → draw-glow.js), mặt hồ lấp lánh (glints), lò lửa có lưỡi lửa nhảy và tàn bay
// (flame). Đồ phẳng (sân lát, gợn nước) vẽ sát đất dưới người; đồ đứng xếp theo chân cùng người, quái (draw.js).
import { spriteImage } from './sprites.js';
import { drawNpcSprite } from './draw-npc-sprite.js';
import { hoiAnim, drawAnimated, drawTro } from './draw-hoi-tro.js';
import { ACT, drawAct, walkFrame } from './draw-acts.js';
import { drawHero } from './draw-hero.js';

const flat = it => it.foot.flat;
const flameKind = it => it.spr.flame_c || (it.id.includes('lam') ? 'lam' : it.id.includes('hong') ? 'hong' : 'vang');

// Đồ phẳng: vẽ ngay sau nền, trước mọi thứ đứng trên đất
export function drawHoiFlat(ctx, game, t) {
  const items = game.map?.hoi;
  if (!items?.length) return;
  for (const it of items) if (flat(it)) drawHoiItem(ctx, game, it, t);
}

// Đồ đứng trong khung nhìn (chừa lề cho hình cao), để draw.js xếp theo chân cùng người, quái
export function hoiEnts(game, view) {
  const items = game.map?.hoi || [];
  if (!items.length && !game.khach) return [];
  const out = [];
  for (const it of items) {
    if (flat(it) || it.x + it.w / 2 < view.x0 || it.x - it.w / 2 > view.x1 || it.y < view.y0 || it.y - it.h > view.y1) continue;
    out.push(['h', it]);
  }
  for (const n of game.khach || []) if (n.x > view.x0 - 20 && n.x < view.x1 + 20 && n.y > view.y0 && n.y < view.y1 + 50) out.push(['h', n]);   // khách đi hội (hoi-khach.js)
  return out;
}

export function drawHoiItem(ctx, game, it, t) {
  if (it.khach) {   // khách đi hội: nhảy lên khi reo hò (hop)
    const hop = it.hop > 0 ? Math.sin(Math.min(1, it.hop / 0.45) * Math.PI) * 4 : 0;
    if (it.face && Math.abs(it.face.x) > 0.2) it.lookX = Math.sign(it.face.x);
    if (it.dress) { if (!drawHero(ctx, game, it, t + it.bob, false, it.dress)) drawNpcSprite(ctx, game, it, t); return; }   // khách mặc bộ có hình riêng (hoi-khach.js mac)
    if (it.hero) {   // đệ tử tông môn (hình thời trang nhân vật, 7 động tác)
      ctx.fillStyle = 'rgba(27,24,48,0.25)'; ctx.beginPath(); ctx.ellipse(it.x, it.y + 1, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill();
      drawAct(ctx, game.data.art, it.id, it.moving ? walkFrame(it.spr0 ??= game.data.art.sprites[it.id], t + it.bob) : hop ? ACT.hit : ACT.idle, it.x, it.y + 1, it.lookX || 1, hop);
    } else if (hop) { ctx.save(); ctx.translate(0, -hop); drawNpcSprite(ctx, game, it, t); ctx.restore(); }
    else drawNpcSprite(ctx, game, it, t);
    return;
  }
  const im = spriteImage(it.spr);
  if (!im) return;
  if (it.flip || game.bay?.sel === it) {   // lật ngang (bày cảnh), khung món đang chọn
    ctx.save();
    if (it.flip) { ctx.translate(it.x * 2, 0); ctx.scale(-1, 1); }
    drawHoiBody(ctx, game, it, im, t);
    ctx.restore();
    if (game.bay?.sel === it) { ctx.save(); ctx.strokeStyle = '#ffe36a'; ctx.lineWidth = 1; ctx.setLineDash([3, 2]); ctx.strokeRect(it.x - it.w / 2 - 1, it.y - it.h - 1, it.w + 2, it.h + 2); ctx.fillStyle = '#ffe36a'; ctx.fillRect(it.x - 1.5, it.y - 1.5, 3, 3); ctx.restore(); }
    return;
  }
  drawHoiBody(ctx, game, it, im, t);
}

function drawHoiBody(ctx, game, it, im, t) {
  const s = it.spr, k = it.k, ox = it.x - s.anchor[0] * k;
  let oy = it.y - s.anchor[1] * k;
  ctx.imageSmoothingEnabled = false;
  if (it.id.startsWith('hb.lan')) {   // lân múa: nhảy nhịp, lắc đầu qua lại, thỉnh thoảng nhảy cao
    const ph = it.x * 0.13, hop = Math.abs(Math.sin(t * 5 + ph)) * 2.2 + (Math.sin(t * 0.7 + ph) > 0.92 ? Math.abs(Math.sin(t * 5 + ph)) * 4 : 0);
    ctx.fillStyle = 'rgba(27,24,48,0.25)'; ctx.fillRect(it.x - it.w * 0.35, it.y - 1, it.w * 0.7, 2);
    ctx.save(); ctx.translate(it.x, it.y - hop); ctx.rotate(Math.sin(t * 2.6 + ph) * 0.06); ctx.scale(Math.sin(t * 0.45 + ph) > 0 ? 1 : -1, 1);
    ctx.drawImage(im, 0, 0, s.w, s.h, -s.anchor[0] * k, -s.anchor[1] * k, s.w * k, s.h * k);
    ctx.restore();
    return;
  }
  const an = it.anim === undefined ? (it.anim = hoiAnim(game, it.id)) : it.anim;
  if (an) drawAnimated(ctx, game, it, im, an, t); else ctx.drawImage(im, 0, 0, s.w, s.h, ox, oy, s.w * k, s.h * k);
  if (s.glints) glints(ctx, s.glints, ox, oy, k, t, it.x, /thac|voi|gieng|phun|suoi/.test(it.id));
  if (s.flame) flame(ctx, game, it, ox + s.flame[0] * k, oy + s.flame[1] * k, t);
  if (s.smoke) smoke(ctx, ox + s.smoke[0] * k, oy + s.smoke[1] * k, t, it.x);
  if (it.label) signLabel(ctx, game, it, oy);
  if (game.hoiTro) drawTro(ctx, game, it, t);   // trò diễn gắn với món này (tỷ võ, đánh trống, múa kiếm)
}

// Mặt nước, mặt băng lấp lánh: điểm sáng chớp lên rồi tắt, mỗi điểm một nhịp
function glints(ctx, pts, ox, oy, k, t, seed, flow) {
  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < pts.length; i++) {
    const v = Math.sin(t * 2.1 + i * 2.37 + seed * 0.013);
    const x0 = ox + pts[i][0] * k, y0 = oy + pts[i][1] * k, u = (t * 0.9 + i * 0.37) % 1;   // nước chảy: vệt sáng trôi xuống rồi mờ (thác, vòi, giếng)
    if (flow) { ctx.globalAlpha = 0.35 * (1 - u); ctx.fillRect(x0, y0 - 2 + u * 5, 0.6, 1.4); }
    if (v < 0.78) continue;
    const a = Math.min(1, (v - 0.78) * 5), x = x0, y = y0;
    ctx.globalAlpha = a; ctx.fillRect(x, y, 1, 1);
    if (v > 0.95) { ctx.globalAlpha = a * 0.6; ctx.fillRect(x - 1, y, 3, 0.6); ctx.fillRect(x, y - 1, 0.6, 3); }
  }
  ctx.globalAlpha = 1;
}

// Lò lửa: năm lưỡi lửa nhảy so le theo thời gian, lõi sáng, tàn lửa bay lên rồi tắt; màu theo tên lò (lam, hồng, vàng)
function flame(ctx, game, it, x, y, t) {
  const P = game.data['le-hoi'].flame, c = P[flameKind(it)];
  const ph = it.x * 0.07;
  for (let i = 0; i < 5; i++) {
    const dx = (i - 2) * 1.1, hh = 2.2 + 3.2 * Math.abs(Math.sin(t * 8.3 + i * 1.7 + ph)) * (i === 2 ? 1.4 : 1);
    ctx.fillStyle = c[2]; ctx.fillRect(x + dx - 0.6, y - hh, 1.2, hh);
    ctx.fillStyle = c[1]; ctx.fillRect(x + dx - 0.4, y - hh * 0.7, 0.8, hh * 0.7);
  }
  ctx.fillStyle = c[0]; ctx.fillRect(x - 1, y - 2.2, 2, 2.2);
  for (let i = 0; i < 3; i++) {   // tàn lửa
    const u = (t * 0.9 + i / 3 + ph) % 1;
    ctx.globalAlpha = 1 - u; ctx.fillStyle = c[1];
    ctx.fillRect(x + Math.sin(u * 6 + i * 2) * 2.5, y - 4 - u * 12, 0.8, 0.8);
  }
  ctx.globalAlpha = 1;
}

// Tên vùng trên biển gỗ chỉ lối: hiện dần khi người chơi lại gần (trong near ô), xa thì ẩn cho cảnh gọn
function signLabel(ctx, game, it, oy) {
  const p = game.player, d = Math.hypot(p.x - it.x, p.y - it.y) / game.map.T, a = Math.max(0, Math.min(1, (7 - d) / 2));
  if (a <= 0) return;
  ctx.save(); ctx.globalAlpha = a;
  ctx.font = '7px "Unifont VN", system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
  const w = ctx.measureText(it.label).width + 6, y = oy - 2;
  ctx.fillStyle = 'rgba(40,26,18,0.82)'; ctx.fillRect(it.x - w / 2, y - 9, w, 9);
  ctx.fillStyle = '#c99256'; ctx.fillRect(it.x - w / 2, y - 9, w, 1);
  ctx.fillStyle = '#ffe9c0'; ctx.fillText(it.label, it.x, y - 0.5);
  ctx.restore();
}

// Khói (ống khói lò rèn, lư hương): năm cụm khói xám nhạt bay lên, nở to, trôi nghiêng theo gió rồi tan
function smoke(ctx, x, y, t, seed) {
  ctx.fillStyle = '#d8d4e0';
  for (let i = 0; i < 5; i++) {
    const u = (t * 0.22 + i / 5 + seed * 0.01) % 1, r = 1 + u * 3.2;
    ctx.globalAlpha = 0.45 * (1 - u) * Math.min(1, u * 6);
    ctx.beginPath(); ctx.arc(x + Math.sin(u * 4 + i) * 1.5 + u * 5, y - u * 18, r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// Nguồn sáng của đồ hội cho lớp quầng đêm (draw-glow.js)
export function hoiLights(game) {
  const items = game.map?.hoi, G = game.data['le-hoi']?.glow;
  if (!items?.length || !G) return [];
  const out = [];
  for (const it of items) {
    const s = it.spr, k = it.k, ox = it.x - s.anchor[0] * k, oy = it.y - s.anchor[1] * k;
    for (const [lx, ly, kind] of s.lights || []) {
      const g = G[kind] || G.warm;
      out.push({ x: ox + lx * k, y: oy + ly * k, r: g.r, c: g.c, a: g.a, ph: (lx * 7 + ly * 13 + it.x) % 10 });
    }
    if (s.flame) { const g = G[{ lam: 'cold', hong: 'pink', vang: 'warm' }[flameKind(it)]]; out.push({ x: ox + s.flame[0] * k, y: oy + s.flame[1] * k - 3, r: g.r + 8, c: g.c, a: g.a * 1.4, ph: it.x % 10 }); }
  }
  return out;
}
