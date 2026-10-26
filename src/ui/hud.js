// Thanh máu, linh khí, nhiệm vụ, nút chiêu, thông báo, màn bay giữa các đảo, menu đầu game.
import { createDialog } from './dialog.js';
import { qiNeed, realmLabel, rootOf, artSkill } from '../game/stats.js';
import { power } from '../game/achieve.js';
import { skillSlots } from '../game/skills.js';
import { toggleAuto } from '../game/auto.js';

const $ = id => document.getElementById(id);

export function createHud(audio) {
  const dialog = createDialog(() => audio.play('talk'));
  let toastTimer = null;
  const ui = { dialog };

  ui.toast = (text, sec = 1.6) => {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, sec * 1000);
  };

  ui.tripMode = on => document.body.classList.toggle('trip', on); // ẩn nút khi đang bay

  const mute = $('btn-mute');
  const paintMute = () => { mute.textContent = audio.muted ? '🔇' : '🔊'; };
  mute.addEventListener('pointerdown', e => { e.stopPropagation(); audio.toggle(); paintMute(); });
  paintMute();

  // Nút Menu: mở/thu danh sách bảng; chạm một bảng thì thu lại
  const menu = $('hud-menu');
  $('btn-menu').addEventListener('pointerdown', e => { e.stopPropagation(); menu.hidden = !menu.hidden; });
  menu.addEventListener('pointerdown', () => { setTimeout(() => { menu.hidden = true; }); }, true);
  let gameRef = null;
  $('btn-auto').addEventListener('pointerdown', e => { e.stopPropagation(); if (gameRef?.player) toggleAuto(gameRef); });

  ui.showPlay = on => { $('hud').hidden = !on; $('buttons').hidden = !on; $('menu').hidden = on; };


  let last = '';
  ui.update = game => {
    if (!game.save || !game.player) return;
    const p = game.player, s = game.save, d = game.data;
    gameRef = game;
    const need = qiNeed(s, d.realms);
    const key = [Math.ceil(p.hp), p.maxHp, Math.floor(s.qi), need, s.realm, s.layer, Math.ceil(p.shield)].join();
    if (key !== last) {
      last = key;
      $('realm').textContent = realmLabel(s, d.realms) + (s.element ? ` · ${d.elements[s.element].name} căn ${rootOf(s, d).name}` : '');
      $('hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      $('hp-text').textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}` + (p.shield > 0 ? ` (+${Math.ceil(p.shield)})` : '');
      $('qi-fill').style.width = Math.min(100, s.qi / need * 100) + '%';
      $('qi-text').textContent = `Linh khí ${Math.floor(s.qi)}/${need}`;
    }
    const gt = game.goals();
    if ($('goal').textContent !== gt) $('goal').textContent = gt;

    const boss = game.mobs.find(m => m.def.ai === 'boss' && !m.dead);
    $('boss').hidden = !boss;
    if (boss) { $('boss-name').textContent = boss.def.name; $('boss-fill').style.width = boss.hp / boss.maxHp * 100 + '%'; }

    const slots = skillSlots(game);
    for (let i = 0; i < 3; i++) {
      const b = $('btn-s' + i), id = slots[i];
      b.classList.toggle('off', !id);
      const name = id ? d.skills[id].name : '—';
      const lbl = b.querySelector('b');
      if (lbl.textContent !== name) lbl.textContent = name;
      const cd = id ? Math.max(0, p.skillCd[i]) / (d.skills[id].cd * (1 - p.st.cdr)) : 0;
      b.style.setProperty('--cd', cd.toFixed(3));
    }
    $('bag-badge').hidden = !game.newItems;
    $('skills-badge').hidden = !game.newSkills;
    $('pets-badge').hidden = !game.newPets;
    $('daily-badge').hidden = !game.newDaily;
    $('achv-badge').hidden = !game.newAchv;
    $('menu-badge').hidden = !(game.newItems || game.newSkills || game.newPets || game.newDaily || game.newAchv);
    const pw = `Lực chiến ${power(game).toLocaleString('vi-VN')}`;
    if ($('power').textContent !== pw) $('power').textContent = pw;
    $('btn-auto').classList.toggle('on', !!game.auto);
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
