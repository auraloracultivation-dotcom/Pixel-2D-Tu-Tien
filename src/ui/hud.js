// Thanh máu, linh khí, nhiệm vụ, nút chiêu, thông báo, màn bay giữa các đảo, menu đầu game.
import { createDialog } from './dialog.js';
import { qiNeed, realmLabel, rootOf, artSkill } from '../game/stats.js';
import { power } from '../game/achieve.js';
import { createHints } from './hints.js';
import { skillSlots } from '../game/skills.js';
import { toggleAuto } from '../game/auto.js';
import { togglePilot, pilotLabel } from '../game/pilot.js';
import { teaLeft } from '../game/home.js';
import { mealHud } from '../game/cooking.js';
import { snackHud } from '../game/snack.js';
import { dvGoal } from '../game/daovan.js';
import { phase } from '../game/daynight.js';
import { season } from '../game/weather.js';

const $ = id => document.getElementById(id);

export function createHud(audio) {
  const dialog = createDialog(() => audio.play('talk'));
  let toastTimer = null, nextTimer = null, shownAt = 0;
  const ui = { dialog }, queue = [], MIN = 1400, MAXQ = 4;

  // Dòng báo: dòng đang hiện chưa đủ MIN ms thì dòng mới xếp hàng (tối đa MAXQ, bỏ dòng cũ nhất), để việc tự hành báo dồn không che mất nhau
  const show = (text, sec) => {
    const t = $('toast');
    t.textContent = text; t.hidden = false; shownAt = performance.now();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, sec * 1000);
  };
  const drain = () => {
    nextTimer = null;
    const q = queue.shift();
    if (q) show(q.text, q.sec);
    if (queue.length) nextTimer = setTimeout(drain, MIN);
  };
  ui.toast = (text, sec = 1.6) => {
    const t = $('toast'), age = performance.now() - shownAt;
    if (!queue.length && (t.hidden || age >= MIN)) { show(text, sec); return; }
    if ((!t.hidden && t.textContent === text) || queue.some(q => q.text === text)) return;
    queue.push({ text, sec }); if (queue.length > MAXQ) queue.shift();
    nextTimer ??= setTimeout(drain, Math.max(0, MIN - age));
  };

  ui.tripMode = on => document.body.classList.toggle('trip', on); // ẩn nút khi đang bay

  const mute = $('btn-mute');
  const paintMute = () => { mute.textContent = audio.muted ? '🔇' : '🔊'; };
  mute.addEventListener('pointerdown', e => { e.stopPropagation(); audio.toggle(); paintMute(); });
  paintMute();

  // Nút Menu mở bảng Menu (src/ui/menu-panel.js); #hud-menu giữ các nút bảng cũ, luôn ẩn, bảng Menu bấm hộ
  let gameRef = null;
  let hints = null;
  $('btn-auto').addEventListener('pointerdown', e => { e.stopPropagation(); if (gameRef?.player) { toggleAuto(gameRef); if (gameRef.auto) gameRef.pilot = null; } });
  $('btn-pilot').addEventListener('pointerdown', e => { e.stopPropagation(); if (gameRef?.player) togglePilot(gameRef); });

  ui.showPlay = on => { $('hud').hidden = !on; $('buttons').hidden = !on; $('menu').hidden = on; };


  let last = '';
  ui.update = game => {
    if (!game.save || !game.player) return;
    const p = game.player, s = game.save, d = game.data;
    gameRef = game;
    (hints ??= createHints(game))();
    const need = qiNeed(s, d.realms);
    const key = [Math.ceil(p.hp), p.maxHp, Math.floor(s.qi), need, s.realm, s.layer, Math.ceil(p.shield), s.element].join();
    if (key !== last) {
      last = key;
      const R = $('realm');   // cảnh giới dòng trên, linh căn dòng dưới nhỏ hơn (trước gộp một dòng nên bị cắt mất chữ "Thiên")
      if (R.childElementCount !== 2) { R.textContent = ''; R.append(document.createElement('b'), document.createElement('small')); }
      R.children[0].textContent = realmLabel(s, d.realms);
      R.children[1].textContent = s.element ? `${d.elements[s.element].name} căn · ${rootOf(s, d).name}` : '';
      $('hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      $('hp-text').textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}` + (p.shield > 0 ? ` (+${Math.ceil(p.shield)})` : '');
      $('qi-fill').style.width = Math.min(100, s.qi / need * 100) + '%';
      $('qi-text').textContent = `Linh khí ${Math.floor(s.qi)}/${need}`;
    }
    const pl = pilotLabel(game), gt = [game.goals(), dvGoal(game), pl].filter(Boolean).join('\n');   // Con Đường Đạo Vận song hành truyện chính
    if ($('goal').textContent !== gt) $('goal').textContent = gt;

    const boss = game.mobs.find(m => (m.def.ai === 'boss' || m.arena) && !m.dead);
    $('boss').hidden = !boss;
    if (boss) { $('boss-name').textContent = boss.def.name; $('boss-fill').style.width = boss.hp / boss.maxHp * 100 + '%'; }

    const slots = skillSlots(game);
    for (let i = 0; i < 3; i++) {
      const b = $('btn-s' + i), id = slots[i];
      b.classList.toggle('off', !id);
      const name = id ? d.skills[id].name : '—';
      const lbl = b.querySelector('b');
      if (lbl.textContent !== name) { lbl.textContent = name; b.style.backgroundImage = skillIcon(d, id); }
      const cd = id ? Math.max(0, p.skillCd[i]) / (d.skills[id].cd * (1 - p.st.cdr)) : 0;
      b.style.setProperty('--cd', cd.toFixed(3));
    }
    $('bag-badge').hidden = !game.newItems;
    $('skills-badge').hidden = !game.newSkills;
    $('pets-badge').hidden = !game.newPets;
    $('daily-badge').hidden = !game.newDaily;
    $('achv-badge').hidden = !game.newAchv;
    $('menu-badge').hidden = !(game.newItems || game.newSkills || game.newPets || game.newDaily || game.newAchv);
    const tl = teaLeft(game), pw = `Lực chiến ${power(game).toLocaleString('vi-VN')}` + (tl ? ` · Trà ${tl} phút` : '') + (mealHud(game) ? ` · ${mealHud(game)}` : '') + (snackHud(game) ? ` · ${snackHud(game)}` : '');
    if ($('power').textContent !== pw) $('power').textContent = pw;
    const H = game.data.weather.hud, se = season(game);   // mùa, giờ, trời
    const sky = [se && H.season.replace('{name}', se.name), phase(game).name, game.raining && H.rain.replace('{pct}', Math.round((d.weather.rain.meditate - 1) * 100))].filter(Boolean).join(' · ');
    if ($('sky').textContent !== sky) $('sky').textContent = sky;
    $('btn-auto').classList.toggle('on', !!game.auto);
    $('btn-pilot').classList.toggle('on', !!game.pilot);
    const pid = d.cave.pill_button, pn = s.pills?.[pid] || 0, pb = $('btn-pill');
    pb.hidden = !pn;
    if (pn) {
      const t = `Đan ${pn}`;
      if (pb.querySelector('b').textContent !== t) pb.querySelector('b').textContent = t;
      pb.style.setProperty('--cd', (Math.max(0, p.pillCd || 0) / d.cave.pills[pid].cd).toFixed(3));
    }
    const art = artSkill(s, d), ab = $('btn-art');
    ab.hidden = !art;
    if (art) {
      if (ab.querySelector('b').textContent !== d.skills[art].name) ab.querySelector('b').textContent = d.skills[art].name;
      ab.style.setProperty('--cd', (Math.max(0, p.artCd || 0) / (d.skills[art].cd * (1 - p.st.cdr))).toFixed(3));
    }
    $('btn-dash').style.setProperty('--cd', (Math.max(0, p.dashCd || 0) / d.config.dash.cd).toFixed(3));
    const act = $('btn-act');
    act.hidden = !game.actLabel;
    if (game.actLabel && act.textContent !== game.actLabel) act.textContent = game.actLabel;
  };
  return ui;
}

// Biểu tượng pixel của chiêu (data/art.json icon.<loại>): theo fx của chiêu, không có fx thì theo kiểu chiêu.
function skillIcon(d, id) {
  const s = id && d.skills[id];
  if (!s) return '';
  const spr = d.art.sprites['icon.' + (s.fx || { heal: 'heal', shield: 'shield', buff: 'buff' }[s.type] || 'orb')];
  return spr ? `url("${spr.file}?v=${spr.v}")` : '';
}
