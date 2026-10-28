// Hình 6 khung theo động tác (ảnh Canva, tools/art/ai_sprites.py "acts"): 0 đứng, 1–2 bước đi, 3 lấy đà, 4 đánh, 5 ngã.
// Linh thú, thú cưỡi, bạn đồng hành dùng chung. Hình gốc nhìn phải, quay trái lật gương.
import { spriteImage } from './sprites.js';

export const ACT = { idle: 0, walk: [1, 2], wind: 3, hit: 4, down: 5, skill: 6 };   // khung 6 (nếu có): tung chiêu riêng
const SKILL = 0.45;   // giây giữ khung tung chiêu

// Khung bước: hình có spr.walk (thú cưỡi 4 bước) thì đi theo thứ tự đó
export const walkFrame = (spr, t) => { const w = spr?.walk || ACT.walk; return w[Math.floor(t * 7) % w.length]; };
const ATTACK = 0.32;   // giây: lấy đà rồi đánh ngay sau mỗi đòn

// Chọn khung: e là thực thể có cd (thời gian chờ đòn kế), def.cd; moving; t là giây trò chơi
export function actFrame(spr, e, t, cdMax) {
  if (!spr || spr.frames < 6) return null;
  if (e.down) return ACT.down;
  const sk = e.def?.skill?.cd, since2 = sk && e.skillCd != null ? sk - e.skillCd : 99;
  if (spr.frames > ACT.skill && since2 > 0 && since2 < SKILL) return ACT.skill;   // linh thú vừa tung chiêu
  const since = cdMax && e.cd != null ? cdMax - e.cd : 99;
  if (since > 0 && since < ATTACK) return since < ATTACK * 0.35 ? ACT.wind : ACT.hit;   // = 0: vừa sinh ra, chưa đánh (trước đây chú thích nuốt mất lệnh return)
  if (e.moving) return walkFrame(spr, t);
  return ACT.idle;
}

// Mật độ điểm ảnh như nhân vật chính (thân ~45 điểm ảnh = 24 đơn vị bản đồ, data/heroes.json): ảnh AI vẽ chi tiết hơn quái code,
// thu về cỡ đó mới giữ được mắt, mặt. Làm tròn để mỗi điểm ảnh hình là số nguyên điểm màn hình như draw-hero.js.
export const UNIT_PER_PX = 24 / 45;
export function isAct(art, id) { const s = art && art.sprites[id]; return !!s && s.frames >= 6; }

// Vẽ khung f của hình id, chân ở (x, y). Trả false nếu chưa có hình 6 động tác.
export function drawAct(ctx, art, id, f, x, y, dir, bob = 0) {
  const spr = art && art.sprites[id], im = spr && spriteImage(spr);
  if (!im || f == null || spr.frames < 6) return false;
  const d = Math.abs(ctx.getTransform().d) || 1, k = Math.max(1, Math.round(UNIT_PER_PX * d)) / d;
  ctx.save(); ctx.translate(Math.round(x), Math.round(y - bob)); ctx.scale(dir * k, k); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, f * spr.w, 0, spr.w, spr.h, -spr.anchor[0], -spr.anchor[1], spr.w, spr.h);
  ctx.restore();
  return true;
}
