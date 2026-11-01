// Vẽ thế giới bằng hình khối đơn giản (bản tạm): người, quái, đạn, hiệu ứng, chỉ đường, cần gạt.
import { drawMaKhi, drawNpcWeapon } from './draw-ma-khi.js';
import { drawLanterns, drawMeteors } from './draw-lantern.js';
import { guideTarget } from '../game/guide.js';
import { drawSky, drawMap, circle } from '../world/draw-map.js';
import { skillSlots } from '../game/skills.js';
import { weaponId } from '../game/stats.js';
import { drawWeapon } from './weapon.js';
import { drawPet, drawMount, drawRareGlow } from './draw-pet.js';
import { hasSide } from '../game/side.js';
import { drawAura, drawTitle } from './draw-aura.js';
import { outfit } from '../game/fashion.js';
import { drawDayNight } from './draw-sky.js';
import { drawClouds } from './draw-clouds.js';
import { drawLamps, drawGlow } from './draw-glow.js';
import { drawFairWorld, drawFairSky } from './draw-fair.js';
import { drawStalls } from './draw-stall.js';
import { drawHamlets } from './draw-hamlet.js';
import { drawBanner } from './draw-banner.js';
import { drawWeather } from './draw-weather.js';
import { drawHoiFlat, hoiEnts, drawHoiItem } from './draw-hoi.js';
import { drawHoiSky } from './draw-hoi-sky.js';
import { drawSongTu } from './draw-songtu.js';
import { drawDecor } from './draw-decor.js';
import { drawCritters, drawWild } from './draw-critter.js';
import { drawVeins } from './draw-vein.js';
import { drawFishing, drawScenic } from './draw-fish.js';
import { drawBubbles } from './draw-bubble.js';
import { drawHero, heroLook } from './draw-hero.js';
import { drawSpriteFx } from './draw-sprite-fx.js';
import { drawSlashes } from './draw-slash.js';
import { drawBolt, drawBoltLead } from './draw-bolt.js';
import { drawFocus, textQ } from './draw-focus.js';
import { drawNumbers } from './draw-numbers.js';
import { drawBullets, drawMeteor } from './draw-bullets.js';
import { drawUltFx } from './draw-ult.js';
import { drawMobSprite, drawRivalSprite, drawCorpse, corpseLife } from './draw-mob-sprite.js';
import { drawLoot, drawQuestPickups } from './draw-loot.js';
import { ring, disc } from './pixel-shapes.js';
import { drawFlyWeapon } from './draw-flyweapon.js';
import { drawNpcSprite } from './draw-npc-sprite.js';
import { drawTorches, drawDarkness } from './draw-light.js';
import { gatherLights, drawBloom } from './draw-lights.js';
import { drawAim } from './draw-aim.js';
import { actFrame, drawAct, isAct, ACT } from './draw-acts.js';
import { drawRunDust, drawHitSwoosh, drawDowns } from './draw-act-fx.js';
import { drawStoryFx } from './draw-story-fx.js';
import { drawDen } from './draw-den.js';
import { drawDuelist } from './draw-duel.js';
import { duelFoes } from '../game/duel.js';

const INK = '#1b1830';

function shadow(ctx, x, y, r) {
  ctx.fillStyle = 'rgba(27,24,48,0.25)';
  ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
}

function body(ctx, x, y, r, color, flash) {
  ctx.fillStyle = INK; circle(ctx, x, y, r + 1);
  ctx.fillStyle = flash ? '#fff' : color; circle(ctx, x, y, r);
}

export function drawPerson(ctx, e, color, hair, t, flash, face) {
  const bob = e.moving ? Math.abs(Math.sin(e.walkT * 12)) * 1.5 : Math.sin(t * 2.5 + (e.bob || 0)) * 0.5;
  const y = e.y - bob;
  shadow(ctx, e.x, e.y + 1, 5);
  body(ctx, e.x, y - 4, 4.5, color, flash);            // thân
  body(ctx, e.x, y - 11, 4.2, '#fbe3d2', flash);       // đầu
  ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(e.x, y - 12, 4.2, Math.PI, 0); ctx.fill();
  if (!flash && face) {                                  // mắt nhìn theo hướng
    ctx.fillStyle = INK;
    const fx = face.x * 1.6, fy = Math.max(-0.5, face.y) * 1.2;
    if (face.y > -0.7) { ctx.fillRect(e.x - 1.8 + fx, y - 11 + fy, 1, 1.6); ctx.fillRect(e.x + 0.8 + fx, y - 11 + fy, 1, 1.6); }
  }
}

function drawPlayer(ctx, game, t) {
  const p = game.player, el = game.save.element ? game.data.elements[game.save.element].color : '#e6ebf7';
  const w = game.data.weapons[weaponId(game.save, game.data)];
  if (p.invT > 0 && Math.floor(t * 20) % 2 && p.flash <= 0) ctx.globalAlpha = 0.5;
  if (p.riding) { const lift = drawMount(ctx, p, game.data.pets.mounts[game.save.mount], t, game.data.art, game.save.mount); ctx.save(); ctx.translate(0, -lift - (p.moving && Math.floor(p.walkT * 7) % 2 ? 1 : 0)); }   // người cưỡi nhún theo nhịp phi
  if (p.meditating) {
    ctx.globalAlpha = 0.5 + 0.3 * Math.sin(t * 3); ring(ctx, p.x, p.y - 6, 12 + Math.sin(t * 2) * 2, el); ctx.globalAlpha = 1;
  }
  drawAura(ctx, game, p, t);
  drawFlyWeapon(ctx, game, 'back');   // ngự kiếm: vũ khí treo sau lưng vẽ trước thân người
  if (!drawHero(ctx, game, p, t, p.flash > 0)) {   // chưa có hình thì vẽ hình khối, màu theo thời trang
    const fit = outfit(game);
    drawPerson(ctx, p, fit.robe, fit.hair, t, p.flash > 0, p.face);
    ctx.fillStyle = fit.sash || el; ctx.fillRect(p.x - 4, p.y - 6, 8, 1.5);   // đai lưng màu hệ
    drawWeapon(ctx, p, w);
  }
  drawFlyWeapon(ctx, game, 'front');
  if (p.shield > 0) { ctx.globalAlpha = 0.7; ring(ctx, p.x, p.y - 6, 10, p.shieldColor); }
  if (p.buffT > 0) { ctx.fillStyle = p.buffColor; ctx.globalAlpha = 0.25; circle(ctx, p.x, p.y - 6, 10); }
  ctx.globalAlpha = 1;
  drawTitle(ctx, game, p);
  if (p.riding) ctx.restore();
}

// Bạn đồng hành: chủ đả tọa thì ngồi cạnh nhắm mắt, quầng sáng nhạt thở theo
function drawComp(ctx, e, t, art) {
  const calm = e.sleep && !e.moving;
  if (calm) {
    ctx.globalAlpha = 0.3 + 0.2 * Math.sin(t * 2.4 + 1); ring(ctx, e.x, e.y - 6, 10 + Math.sin(t * 1.6) * 1.5, e.npc.color); ctx.globalAlpha = 1;
  }
  const id = 'comp.' + e.id;   // ảnh 7 động tác (draw-acts.js): đứng, chạy, lấy đà, đánh, ngã; bụi chạy, vệt đánh (draw-act-fx.js)
  if (isAct(art, id)) {
    const f = actFrame(art.sprites[id], e, t, e.def.cd), dir = e.face < 0 ? -1 : 1;
    if (e.moving) drawRunDust(ctx, e, t, dir);
    if (drawAct(ctx, art, id, f, e.x, e.y + 1, dir)) {
      if (f === ACT.hit) drawHitSwoosh(ctx, e, e.npc.color, dir, Math.min(1, (e.def.cd - e.cd) / 0.32));
      return;
    }
  }
  drawPerson(ctx, e, e.npc.color, e.npc.hair || '#5a4a86', t, false, calm ? { x: 0, y: -1 } : { x: e.face, y: 0.3 });
  if (calm) { ctx.fillStyle = INK; ctx.fillRect(e.x - 2, e.y - 10.4, 1.4, 0.7); ctx.fillRect(e.x + 0.6, e.y - 10.4, 1.4, 0.7); }   // mắt nhắm
}

function drawMob(ctx, m, t, game) {
  if (m.duel && drawDuelist(ctx, game, m, t)) return;   // bản sao so tài: hình nhân vật theo hồ sơ người kia (draw-duel.js)
  const squash = m.def.ai === 'passive' ? Math.abs(Math.sin(m.hop)) * 0.15 : 0;
  const r = m.r, wind = m.state === 'windup';
  shadow(ctx, m.x, m.y + 1, r);
  if (m.tele) drawTele(ctx, m);
  if (m.rare) drawRareGlow(ctx, m, t);
  if (m.elite) { ctx.fillStyle = `rgba(150,70,210,${(0.22 + 0.1 * Math.sin(t * 3 + m.x)).toFixed(2)})`; ctx.beginPath(); ctx.ellipse(m.x, m.y, r * 1.6, r * 0.8, 0, 0, Math.PI * 2); ctx.fill(); }   // nhiễm ma khí: vòng ngoài tinh cầu, mạnh gấp bội
  if (m.def.look && drawMobSprite(ctx, game, m, t, wind)) {   // quái đã có hình pixel (tools/art/mobs.py)
  } else if (m.def.person) {   // đấu sĩ luận võ: chibi pixel theo màu áo tóc (chưa có hình thì hình người, đai màu theo đối thủ)
    if (!(m.def.rival && drawRivalSprite(ctx, game, m, t, wind))) {
      drawPerson(ctx, m, m.def.color, m.def.hair || '#2a1a1a', t, m.flash > 0, { x: m.fx || 0, y: m.fy || 0 });
      ctx.fillStyle = m.def.sash || '#f2c94c'; ctx.fillRect(m.x - 4, m.y - 6, 8, 1.5);
    }
    if (wind) ring(ctx, m.x, m.y - 6, 9, '#ff4a5a');
  } else if (m.def.blade) {   // kiếm hồn: thanh kiếm lơ lửng, mũi hướng về phía lao tới
    const a = Math.atan2(m.fy || 1, m.fx || 0), bob = Math.sin(t * 5 + m.x) * 1.5;
    ctx.save(); ctx.translate(m.x, m.y - 8 + bob); ctx.rotate(a + (wind ? Math.sin(t * 40) * 0.3 : 0));
    ctx.fillStyle = 'rgba(40,20,60,0.35)'; ctx.fillRect(-10, -2.5, 20, 5);   // khói đen quấn quanh
    ctx.fillStyle = m.flash > 0 ? '#fff' : m.def.color; ctx.fillRect(-3, -1.2, 12, 2.4);
    ctx.beginPath(); ctx.moveTo(9, -1.2); ctx.lineTo(12, 0); ctx.lineTo(9, 1.2); ctx.fill();
    ctx.fillStyle = '#7a5a2a'; ctx.fillRect(-4, -3.5, 1.6, 7); ctx.fillRect(-8, -0.8, 4, 1.6);
    ctx.restore();
  } else if (m.def.shadow) {   // tâm ma: bóng đen hình người, mắt tím
    ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 6);
    drawPerson(ctx, m, m.def.color, '#120a1a', t, m.flash > 0, null);
    ctx.globalAlpha = 1; ctx.fillStyle = '#d0a0ff';
    ctx.fillRect(m.x - 1.8, m.y - 11.5, 1.2, 1.4); ctx.fillRect(m.x + 0.8, m.y - 11.5, 1.2, 1.4);
  } else {
    ctx.save();
    ctx.translate(m.x, m.y - r);
    ctx.scale(1 + squash, 1 - squash);
    if (wind) ctx.scale(1.15, 0.9);
    body(ctx, 0, 0, r, m.def.color, m.flash > 0);
    if (m.def.snow) {   // người tuyết: đầu nhỏ, mũi cà rốt, khăn đỏ
      body(ctx, 0, -r * 1.05, r * 0.6, m.def.color, m.flash > 0);
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(r * 0.1, -r * 1.1, r * 0.5, 1.4);
      ctx.fillStyle = '#d84a4a'; ctx.fillRect(-r * 0.6, -r * 0.55, r * 1.2, 1.6);
      ctx.fillStyle = INK; ctx.fillRect(-r * 0.3, -r * 1.25, 1.2, 1.2); ctx.fillRect(r * 0.1, -r * 1.25, 1.2, 1.2);
    }
    if (m.def.stem) {   // bí ngô: cuống xanh, khía dọc
      ctx.fillStyle = '#3a8a3a'; ctx.fillRect(-1, -r - 2.5, 2, 3.5); ctx.fillRect(1, -r - 2.5, 2.5, 1.2);
      ctx.fillStyle = 'rgba(120,40,0,0.35)'; ctx.fillRect(-r * 0.4, -r * 0.8, 1, r * 1.5); ctx.fillRect(r * 0.4 - 1, -r * 0.8, 1, r * 1.5);
    }
    if (m.flash <= 0 && !m.def.snow) {
      ctx.fillStyle = m.def.ai === 'passive' && !m.def.stem ? INK : '#ffe27a';
      const fx = (m.fx || 0) * r * 0.3;
      ctx.fillRect(fx - r * 0.45, -r * 0.2, r * 0.22, r * 0.3); ctx.fillRect(fx + r * 0.22, -r * 0.2, r * 0.22, r * 0.3);
      if (m.def.ai === 'boss') { ctx.fillStyle = '#2a0a12'; ctx.fillRect(-r * 0.8, -r - 2, 3, 5); ctx.fillRect(r * 0.8 - 3, -r - 2, 3, 5); }
    }
    ctx.restore();
  }
  if (m.stunT > 0) { ctx.fillStyle = '#ffe27a'; for (let i = 0; i < 3; i++) circle(ctx, m.x + Math.cos(t * 6 + i * 2) * 5, m.y - (m.top || r * 2) - 3 + Math.sin(t * 6 + i * 2), 1); }
  if (m.slowT > 0) { ctx.fillStyle = 'rgba(90,184,240,0.35)'; circle(ctx, m.x, m.y - r, r + 1.5); }
  if (m.hp < m.maxHp && m.def.ai !== 'boss') {
    const hy = m.y - (m.top || r * 2) - 5;
    ctx.fillStyle = INK; ctx.fillRect(m.x - 7, hy, 14, 2.5);
    ctx.fillStyle = '#e0484a'; ctx.fillRect(m.x - 7, hy, 14 * Math.max(0, m.hp / m.maxHp), 2.5);
  }
}

function drawTele(ctx, m) {
  const tl = m.tele;
  ctx.fillStyle = 'rgba(255,60,80,0.18)'; ctx.strokeStyle = 'rgba(255,60,80,0.6)'; ctx.lineWidth = 1;
  if (tl.type === 'circle') {
    circle(ctx, m.x, m.y, tl.r);
    ctx.fillStyle = 'rgba(255,60,80,0.25)'; circle(ctx, m.x, m.y, tl.r * Math.min(1, tl.k));
  } else {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(tl.a);
    ctx.fillRect(0, -m.r, tl.len, m.r * 2);
    ctx.fillStyle = 'rgba(255,60,80,0.3)'; ctx.fillRect(0, -m.r, tl.len * Math.min(1, tl.k), m.r * 2);
    ctx.restore();
  }
}

// Người chơi khác (game/others.js): hình nhân vật theo hình dáng, thời trang họ báo (bản game cũ chưa báo thì vẽ hình khối), tên trên đầu
function drawOther(ctx, o, game, t) {
  const el = o.element ? game.data.elements[o.element]?.color : null;
  const fit = { look: o.look, outfit: o.outfit };
  if (o.swingNew && o.look) { const A = heroLook(game, fit).attacks || []; if (A.length) o.heroAnim = { name: A[o.atkN++ % A.length], t0: game.time }; o.swingNew = false; }
  const hero = o.look && drawHero(ctx, game, o, t, false, fit);
  if (!hero) drawPerson(ctx, o, '#c8d0e8', '#3a3a4a', t, false, o.face);
  if (el && !hero) { ctx.fillStyle = el; ctx.fillRect(o.x - 4, o.y - 6, 8, 1.5); }
  const q = textQ(game, 6), ny = o.y - (o.top || 22) - 3;
  ctx.font = `bold ${6 * q}px system-ui`; ctx.textAlign = 'center'; ctx.lineWidth = 2 * q; ctx.strokeStyle = INK;
  ctx.strokeText(o.def.name, o.x, ny); ctx.fillStyle = el || '#e6ebf7'; ctx.fillText(o.def.name, o.x, ny);
  if (o.swingT > 0 && !hero) {
    const a = Math.atan2(o.face.y, o.face.x);
    ctx.globalAlpha = o.swingT / 0.18; ring(ctx, o.x, o.y - 3, 22, '#c8f6ff', a - 1.1, a + 1.1, 2); ctx.globalAlpha = 1;
  }
}

function drawNpc(ctx, n, game, t) {
  // Hình NPC (draw-npc-sprite.js): người đồng hành dùng comp.<id> như lúc đi theo, NPC khác npc.<id>; ma khí (draw-ma-khi.js) hai lớp
  if (n.def.ma_khi) drawMaKhi(ctx, n, t, n.def.ma_khi, 'back');
  if (n.def.vu_khi) drawNpcWeapon(ctx, game, n, t, n.def.vu_khi);
  if (!drawNpcSprite(ctx, game, n, t)) drawPerson(ctx, n, n.def.color, n.def.hair || '#5a4a86', t, false, n.face || { x: 0, y: 1 });
  if (game.story.wants(n.id) || hasSide(game, n.id) || (n.id === game.data.pets.npc && !game.save.flags.nguThu)) {
    ctx.fillStyle = '#f2c94c'; ctx.font = '10px "Unifont VN", system-ui'; ctx.textAlign = 'center';
    ctx.fillText('!', n.x, n.y - 27 + Math.sin(t * 5) * 1.5);
  }
  if (n.def.ma_khi) drawMaKhi(ctx, n, t, n.def.ma_khi, 'front');
}

function drawFx(ctx, game) {
  for (const f of game.fx) {
    const k = f.t / f.life;
    ctx.globalAlpha = 1 - k;
    if (f.type === 'arc') {
      const rr = f.r * (0.7 + 0.3 * k);   // cung chém: viền màu dày mỏng dần, lõi trắng
      ring(ctx, f.x, f.y, rr + 2, f.color, f.a - f.half, f.a + f.half, 4 * (1 - k) + 1);
      ring(ctx, f.x, f.y, rr - 1, '#fff', f.a - f.half * 0.6, f.a + f.half * 0.6);
    } else if (f.type === 'ring') {
      const rr = f.r * (0.4 + 0.6 * k);
      if (f.fill) { ctx.globalAlpha = (1 - k) * 0.3; disc(ctx, f.x, f.y, rr, f.color); ctx.globalAlpha = 1 - k; }
      ring(ctx, f.x, f.y, rr, f.color, null, null, 2);
    } else if (f.type === 'spark' && drawSpriteFx(ctx, game, { ...f, id: 'fx.spark', y: f.y - 4 }, k)) {   // tia lửa pixel
    } else if (f.type === 'puff' && drawSpriteFx(ctx, game, { ...f, id: 'fx.puff', y: f.y - 4, s: Math.max(0.6, f.r / 10) }, k)) {   // khói tan pixel
    } else if (f.type === 'spark' || f.type === 'bite') {
      ctx.fillStyle = f.color;
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3; circle(ctx, f.x + Math.cos(a) * 6 * k, f.y - 4 + Math.sin(a) * 6 * k, 1.3); }
    } else if (f.type === 'puff') {
      ctx.fillStyle = '#e6e1f0'; circle(ctx, f.x, f.y - 4, f.r * (0.5 + k));
    } else if (f.type === 'heart') {   // tim nhỏ bay lên, lắc nhẹ
      const x = Math.round(f.x + Math.sin(k * 9) * 2), y = Math.round(f.y - 14 - 16 * k);
      ctx.fillStyle = f.color; ctx.fillRect(x - 2, y, 2, 2); ctx.fillRect(x + 1, y, 2, 2); ctx.fillRect(x - 2, y + 1, 5, 2); ctx.fillRect(x - 1, y + 3, 3, 1); ctx.fillRect(x, y + 4, 1, 1);
    } else if (f.type === 'note') {   // nốt nhạc bay lên, lượn nhẹ
      const x = Math.round(f.x + Math.sin(k * 7) * 3), y = Math.round(f.y - 16 - 20 * k);
      ctx.fillStyle = f.color; ctx.fillRect(x - 2, y + 4, 3, 2); ctx.fillRect(x, y, 1, 5); ctx.fillRect(x + 1, y, 2, 1); ctx.fillRect(x + 2, y + 1, 1, 1);
    } else if (f.type === 'sprite') {
      drawSpriteFx(ctx, game, f, k);
    } else if (f.type === 'bolt') {
      ctx.globalAlpha = 1; drawBolt(ctx, game, f);
    } else if (f.type === 'ult') {
      drawUltFx(ctx, f, k);
    } else if (f.type === 'line') {
      ctx.strokeStyle = f.color; ctx.lineWidth = 5 * (1 - k);
      ctx.beginPath(); ctx.moveTo(f.x, f.y - 5); ctx.lineTo(f.x2, f.y2 - 5); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// Đòn từ trời: vòng báo trên đất, rồi tia sét / quả cầu lửa rơi xuống ở nhịp cuối
function drawStrikeMarks(ctx, game) {
  for (const s of game.strikes) {
    if (s.hit) continue;
    const k = Math.min(1, s.t / s.delay);
    const c = s.kind === 'thunder' ? '120,220,255' : '255,90,40';
    disc(ctx, s.x, s.y, s.r, `rgba(${c},0.22)`); ring(ctx, s.x, s.y, s.r, `rgba(${c},${0.6 + 0.4 * Math.sin(s.t * 20)})`, null, null, 2);
    disc(ctx, s.x, s.y, s.r * k, `rgba(${c},0.45)`);   // vòng trong lớn dần tới lúc giáng
  }
}

function drawStrikeFalls(ctx, game) {
  for (const s of game.strikes) {
    const left = s.delay - s.t;
    if (s.kind === 'thunder') {   // vệt tiên dẫn rơi xuống trước lúc giáng; tia sét là hiệu ứng 'bolt' thêm lúc giáng
      const lead = game.data.config.bolt?.lead ?? 0.1;
      if (left > 0 && left < lead) drawBoltLead(ctx, game, s, 1 - left / lead);
    } else if (s.kind === 'meteor' && left > 0 && left < 0.35) {
      const h = left / 0.35 * 120;
      if (drawMeteor(ctx, game, s.x, s.y, h, s.t)) continue;
      ctx.fillStyle = '#ffb03a'; circle(ctx, s.x + h * 0.4, s.y - h, 5);
      ctx.fillStyle = '#fff3c0'; circle(ctx, s.x + h * 0.4, s.y - h, 2.5);
    }
  }
}

export function drawWorld(game, screen, t) {
  const ctx = screen.ctx;
  if (!game.map) return;
  drawSky(ctx, screen, game.map, t);
  screen.worldTransform();
  drawMap(ctx, game.map, game.data.tiles, screen.viewRect(), t, game); drawHoiFlat(ctx, game, t);   // đồ hội phẳng: sân lát, gợn nước
  drawTorches(ctx, game, screen.viewRect(), t);
  drawScenic(ctx, game);
  drawDecor(ctx, game, t);
  drawHamlets(ctx, game, t); drawLamps(ctx, game, t); drawStalls(ctx, game, t); drawFairWorld(ctx, game, t);   // đồ ở sân xóm, đèn xóm, quán linh thực, dây đèn hội
  drawCritters(ctx, game, t);
  drawWild(ctx, game, t);
  drawVeins(ctx, game, t);
  drawFocus(ctx, game, screen.viewRect());   // nền lùi lại: nhạt màu, tối chút; quái, người, đồ, hiệu ứng vẽ sau giữ nguyên màu
  drawQuestPickups(ctx, game, t);
  drawStrikeMarks(ctx, game);
  for (const z of game.zones) {   // vùng chiêu: vòng mờ nhấp nháy theo nhịp
    const k = 1 - Math.max(0, z.next) / z.tick;
    ctx.globalAlpha = 0.18 + 0.12 * k * Math.min(1, (z.dur - z.t) * 2); disc(ctx, z.x, z.y, z.radius, z.color);
    ctx.globalAlpha = 0.6; ring(ctx, z.x, z.y, z.radius, z.color, z.t * 3, z.t * 3 + Math.PI * 1.5); ctx.globalAlpha = 1;
  }
  drawAim(ctx, game);   // giữ / kéo nút chiêu: khung đúng hình và tầm của chiêu trên mặt đất
  drawSongTu(ctx, game, t);
  if (game.corpses?.length) game.corpses = game.corpses.filter(c => game.time - c.t0 <= corpseLife);
  drawDen(ctx, game, t);   // đèn trang trí trên đất: đuốc, đèn đá, đá tím, bí ngô (draw-den.js)
  const ents = [...game.npcs.map(n => ['n', n]), ...game.mobs.map(m => ['m', m]), ...(game.corpses || []).map(c => ['c', c]), ...game.others.visible().map(o => ['o', o]), ['p', game.player], ...(game.pet ? [['pet', game.pet]] : []), ...(game.comp ? [['comp', game.comp]] : []), ...duelFoes(game), ...hoiEnts(game, screen.viewRect())].sort((a, b) => a[1].y - b[1].y);
  for (const [k, e] of ents) {
    if (k === 'h') drawHoiItem(ctx, game, e, t);   // đồ lễ hội đứng (draw-hoi.js)
    else if (k === 'n') drawNpc(ctx, e, game, t);
    else if (k === 'm') drawMob(ctx, e, t, game);
    else if (k === 'c') drawCorpse(ctx, game, e);
    else if (k === 'o') drawOther(ctx, e, game, t);
    else if ((k === 'pet' || k === 'comp') && game.player.meditating && !e.target) continue;   // đả tọa: ẩn linh thú, đồng hành đang rảnh (đề xuất #24: run run nhức mắt)
    else if (k === 'pet') drawPet(ctx, e, t, game.data.art);
    else if (k === 'comp') drawComp(ctx, e, t, game.data.art);
    else drawPlayer(ctx, game, t);
  }
  drawStoryFx(ctx, game);   // dàn cảnh truyện: bàn tay ma khí (draw-story-fx.js)
  drawDowns(ctx, game);   // lượt gục: khung ngã nhạt dần, hồn bay lên (draw-act-fx.js)
  drawLoot(ctx, game, t);   // đồ rơi: viên ngọc thoi pixel theo màu độ hiếm
  drawBullets(ctx, game, t);
  drawStrikeFalls(ctx, game);
  drawFx(ctx, game);
  drawFishing(ctx, game, t);
  drawClouds(ctx, game, t);
  drawNumbers(ctx, game);
  drawBubbles(ctx, game);
  if (game.peek) {   // tên chỉ hiện khi chạm vào
    const e = game.peek.e, name = e.def.name, ny = e.y - Math.max(22, (e.top || 0) + 4, game.data.art.sprites['npc.' + e.id] ? 28 : 0);   // trên đỉnh hình
    const q = textQ(game, 7);   // máy quay xa: chữ không nhỏ quá
    ctx.font = `${7 * q}px "Unifont VN", system-ui`; ctx.textAlign = 'center';
    ctx.lineWidth = 2 * q; ctx.strokeStyle = INK; ctx.strokeText(name, e.x, ny); ctx.fillStyle = '#fff7d6'; ctx.fillText(name, e.x, ny);
  }
  screen.screenTransform();
  const lights = gatherLights(game, t);   // chiêu, đạn, người chơi: khoét lớp tối rồi phủ quầng sáng cuối cùng
  drawDayNight(ctx, game, screen, t, lights);
  drawGlow(ctx, game, screen, t); drawFairSky(ctx, game, screen, t); drawHoiSky(ctx, game, screen, t);   // đèn trời, pháo hoa lễ hội
  drawWeather(ctx, game, screen, t);
  drawMeteors(ctx, game, screen);
  drawLanterns(ctx, game, screen);
  if (!drawDarkness(ctx, game, screen, t, lights) && game.dark > 0.01) {
    const pos = screen.toScreen(game.player.x, game.player.y - 6);
    const g = ctx.createRadialGradient(pos.x, pos.y, 30, pos.x, pos.y, Math.max(screen.w, screen.h) * 0.7);
    g.addColorStop(0, `rgba(20,8,30,${game.dark * 0.3})`); g.addColorStop(1, `rgba(20,8,30,${game.dark})`);
    ctx.fillStyle = g; ctx.fillRect(0, 0, screen.w, screen.h);
  }
  drawBloom(ctx, game, screen, lights);
  screen.worldTransform(); drawSlashes(ctx, game); screen.screenTransform();   // vệt chém nổi trên mọi thứ, nhát sau chồng lên nhát trước
  if (game.flashT > 0) {   // chớp dịu (config.comfort): màu ấm, không trắng toát cả màn
    const c = game.data.config.comfort || {};
    ctx.fillStyle = `rgba(${c.flash_rgb || '255,255,255'},${Math.min(1, game.flashT / 0.35) * (c.flash_max ?? 1)})`; ctx.fillRect(0, 0, screen.w, screen.h);
  }
}

// Vạch ngắm khi kéo nút chiêu: dài theo tầm chiêu, vòng tròn cho chiêu diện rộng
export function drawOverlay(game, screen, input) {
  const ctx = screen.ctx;
  screen.screenTransform();
  if (!game.map || game.dialog.open) return;
  drawBanner(ctx, game, screen);
  // Mũi tên chỉ đường tới mục tiêu nhiệm vụ
  const c = guideTarget(game);   // việc đang chọn ở khung mục tiêu (src/game/guide.js), mặc định truyện chính
  if (c) {
    const s = screen.toScreen(c.x, c.y), pl = screen.toScreen(game.player.x, game.player.y);
    const d = Math.hypot(s.x - pl.x, s.y - pl.y);
    if (d > 60) {
      const a = Math.atan2(s.y - pl.y, s.x - pl.x), r = 46;
      ctx.save(); ctx.translate(pl.x + Math.cos(a) * r, pl.y - 10 + Math.sin(a) * r); ctx.rotate(a);
      ctx.fillStyle = '#f2c94c'; ctx.strokeStyle = INK; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(-5, -6); ctx.lineTo(-2, 0); ctx.lineTo(-5, 6); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#f2c94c'; ctx.beginPath(); ctx.arc(s.x, s.y - 18 + Math.sin(game.time * 5) * 3, 4, 0, Math.PI * 2); ctx.fill();
    }
  }
  if (input.joy) {
    const j = input.joy;
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(j.ox, j.oy, input.JOY_R, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const dx = j.x - j.ox, dy = j.y - j.oy, d = Math.hypot(dx, dy), m = Math.min(d, input.JOY_R);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(j.ox + (d ? dx / d * m : 0), j.oy + (d ? dy / d * m : 0), 18, 0, Math.PI * 2); ctx.fill();
  }
}
