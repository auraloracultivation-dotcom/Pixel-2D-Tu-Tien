// Linh thú đi theo, thú cưỡi dưới chân người chơi, vầng sáng quanh quái dị chủng.
// Linh thú, thú cưỡi có hình pixel pet.<id>, mount.<id> (tools/art/pets.py); chưa có hình thì vẽ hình khối như cũ.
import { spriteImage } from './sprites.js';
import { ACT, actFrame, drawAct, isAct, walkFrame, UNIT_PER_PX } from './draw-acts.js';

const INK = '#1b1830';

// Vẽ khung f của hình id, chân ở (x, y), dir: 1 nhìn phải, -1 lật trái, k: cỡ. Trả false nếu chưa có hình.
// Hình có spr.scale (ảnh AI vẽ chi tiết gấp đôi, data/art.json) thì thu theo scale, cỡ ngoài thế giới đã tính sẵn nên bỏ k.
function sprite(ctx, art, id, f, x, y, dir, k = 1) {
  const spr = art && art.sprites[id], im = spr && spriteImage(spr);
  if (!im) return false;
  if (spr.scale) k = spr.scale;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y)); ctx.scale(dir * k, k); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, (f % spr.frames) * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  return true;
}
const circle = (ctx, x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };

export function drawPet(ctx, pet, t, art) {
  // linh thú tiến hóa: to hơn, có vầng sáng
  if (pet.def.evo) {
    ctx.save(); ctx.translate(pet.x, pet.y); ctx.scale(1.4, 1.4); ctx.translate(-pet.x, -pet.y);
    ctx.globalAlpha = 0.3 + 0.15 * Math.sin(t * 3); ctx.fillStyle = pet.def.color; circle(ctx, pet.x, pet.y - 4, 7); ctx.globalAlpha = 1;
    drawBody(ctx, pet, t, art);
    ctx.fillStyle = '#ffe27a'; ctx.fillRect(pet.x - 2, pet.y - 12 - (pet.moving ? Math.abs(Math.sin(pet.hop)) * 2 : 0), 4, 1.5);
    ctx.restore(); return;
  }
  drawBody(ctx, pet, t, art);
}

function drawBody(ctx, pet, t, art) {
  const id = 'pet.' + pet.id;
  if (isAct(art, id)) {   // ảnh 6 động tác: ngủ dùng khung nằm, vừa ra đòn thì lấy đà rồi đánh
    const f = pet.sleep && !pet.moving ? ACT.down : actFrame(art.sprites[id], pet, t, pet.def.cd);
    ctx.fillStyle = 'rgba(27,24,48,0.22)'; ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 1, 7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
    drawAct(ctx, art, id, f, pet.x, pet.y + 1, pet.face < 0 ? -1 : 1, f === ACT.idle && Math.sin(t * 3) > 0.6 ? 0.5 : 0);
    return;
  }
  if (pet.sleep && !pet.moving) { drawSleep(ctx, pet, t); return; }
  const hop = pet.moving ? Math.abs(Math.sin(pet.hop)) * 2 : Math.sin(t * 3) * 0.5, y = pet.y - hop;
  ctx.fillStyle = 'rgba(27,24,48,0.22)'; ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 1, 4, 1.8, 0, 0, Math.PI * 2); ctx.fill();
  if (sprite(ctx, art, 'pet.' + pet.id, pet.moving ? Math.floor(pet.hop / Math.PI) : Math.floor(t * 2), pet.x, y + 1, pet.face < 0 ? -1 : 1, 0.7)) return;   // linh thú nhỏ hơn quái cùng loài
  ctx.fillStyle = INK; circle(ctx, pet.x, y - 4, 4.6);
  ctx.fillStyle = pet.def.color; circle(ctx, pet.x, y - 4, 3.8);
  // tai nhỏ và mắt nhìn theo hướng đi
  ctx.fillRect(pet.x - 3.5, y - 9.5, 2, 3); ctx.fillRect(pet.x + 1.5, y - 9.5, 2, 3);
  ctx.fillStyle = INK; const f = pet.face * 1.2;
  ctx.fillRect(pet.x - 1.8 + f, y - 5, 1, 1.4); ctx.fillRect(pet.x + 0.8 + f, y - 5, 1, 1.4);
}

// Ngủ: thân dẹt, mắt nhắm, chữ z bay lên
function drawSleep(ctx, pet, t) {
  const br = Math.sin(t * 2) * 0.4;
  ctx.fillStyle = 'rgba(27,24,48,0.22)'; ctx.beginPath(); ctx.ellipse(pet.x, pet.y + 1, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.beginPath(); ctx.ellipse(pet.x, pet.y - 2.5, 5.6 + br, 3.6 + br, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = pet.def.color; ctx.beginPath(); ctx.ellipse(pet.x, pet.y - 2.5, 4.8 + br, 2.8 + br, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; ctx.fillRect(pet.x - 2.5, pet.y - 3, 1.6, 0.8); ctx.fillRect(pet.x + 1, pet.y - 3, 1.6, 0.8);
  const k = (t * 0.6) % 1;
  ctx.globalAlpha = 1 - k; ctx.fillStyle = '#e8f0ff'; ctx.font = 'bold 5px system-ui'; ctx.textAlign = 'center';
  ctx.fillText('z', pet.x + 4 + k * 4, pet.y - 7 - k * 8); ctx.globalAlpha = 1;
}

// Thú cưỡi: thân dài, bốn chân bước, đầu theo hướng mặt
// Trả về độ cao chỗ người cưỡi ngồi (để nâng người lên trên lưng thú).
export function drawMount(ctx, p, m, t, art, id) {
  const dir = (p.face.x || 0) < -0.1 ? -1 : 1, step = p.moving ? Math.sin(p.walkT * 14) * 1.5 : 0;
  ctx.fillStyle = 'rgba(27,24,48,0.25)'; ctx.beginPath(); ctx.ellipse(p.x, p.y + 1, 9, 3, 0, 0, Math.PI * 2); ctx.fill();
  if (isAct(art, 'mount.' + id)) {   // ảnh 6 động tác: đứng / bước; chỗ ngồi tỉ lệ như hình code (11 trên cao 42)
    const spr = art.sprites['mount.' + id];
    drawAct(ctx, art, 'mount.' + id, p.moving ? walkFrame(spr, p.walkT) : ACT.idle, p.x, p.y + 1, dir);
    return m.seat ?? Math.round(spr.h * UNIT_PER_PX * 11 / 42);   // seat: độ cao chỗ ngồi đo theo lưng ảnh (data/pets.json)
  }
  if (sprite(ctx, art, 'mount.' + id, p.moving ? Math.floor(p.walkT * 8) : 0, p.x, p.y + 1, dir)) return 11;
  ctx.fillStyle = INK;
  for (const [lx, ph] of [[-6, 1], [-3, -1], [3, 1], [6, -1]]) ctx.fillRect(p.x + lx - 0.5, p.y - 4 + step * ph * 0.5, 2, 5);
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 5, 9, 4.5, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = m.color; ctx.beginPath(); ctx.ellipse(p.x, p.y - 5, 8, 3.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = INK; circle(ctx, p.x + dir * 9, p.y - 9, 3.6);
  ctx.fillStyle = m.color; circle(ctx, p.x + dir * 9, p.y - 9, 2.8);
  ctx.fillStyle = m.accent; ctx.fillRect(p.x + dir * 8 - 1, p.y - 14, 2, 3); ctx.fillRect(p.x - dir * 9, p.y - 7, 2, 2);
  ctx.fillStyle = INK; ctx.fillRect(p.x + dir * 10, p.y - 10, 1, 1.2);
  return 6;
}

export function drawRareGlow(ctx, m, t) {
  ctx.strokeStyle = `rgba(255,216,74,${0.55 + 0.35 * Math.sin(t * 5)})`; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(m.x, m.y - m.r, m.r + 3 + Math.sin(t * 3), 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = '#ffe27a';
  for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; ctx.fillRect(m.x + Math.cos(a) * (m.r + 5), m.y - m.r + Math.sin(a) * (m.r + 5), 1.5, 1.5); }
}
