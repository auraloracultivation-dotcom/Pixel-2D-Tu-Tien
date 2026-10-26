// Thanh máu, linh khí, nhiệm vụ, nút chiêu, thông báo, màn bay giữa các đảo, menu đầu game.
import { createDialog } from './dialog.js';
import { qiNeed, realmLabel } from '../game/stats.js';
import { skillSlots } from '../game/skills.js';

const $ = id => document.getElementById(id);

export function createHud() {
  const dialog = createDialog();
  let toastTimer = null;
  const ui = { dialog };

  ui.toast = (text, sec = 1.6) => {
    const t = $('toast');
    t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, sec * 1000);
  };

  ui.fly = (text, midway) => new Promise(resolve => {
    const f = $('fly');
    $('fly-text').textContent = text;
    f.hidden = false;
    f.style.animation = 'none'; void f.offsetWidth; f.style.animation = '';
    setTimeout(midway, 800);
    setTimeout(() => { f.hidden = true; resolve(); }, 1800);
  });

  ui.showPlay = on => { $('hud').hidden = !on; $('buttons').hidden = !on; $('menu').hidden = on; };


  let last = '';
  ui.update = game => {
    if (!game.save || !game.player) return;
    const p = game.player, s = game.save, d = game.data;
    const need = qiNeed(s, d.realms);
    const key = [Math.ceil(p.hp), p.maxHp, Math.floor(s.qi), need, s.realm, s.layer, Math.ceil(p.shield)].join();
    if (key !== last) {
      last = key;
      $('realm').textContent = realmLabel(s, d.realms);
      $('hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      $('hp-text').textContent = `${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}` + (p.shield > 0 ? ` (+${Math.ceil(p.shield)})` : '');
      $('qi-fill').style.width = Math.min(100, s.qi / need * 100) + '%';
      $('qi-text').textContent = `Linh khí ${Math.floor(s.qi)}/${need}`;
    }
    const goal = game.story.goal();
    const gt = goal ? goal.text : '';
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
      const cd = id ? Math.max(0, p.skillCd[i]) / d.skills[id].cd : 0;
      b.style.setProperty('--cd', cd.toFixed(3));
    }
    const act = $('btn-act');
    act.hidden = !game.actLabel;
    if (game.actLabel && act.textContent !== game.actLabel) act.textContent = game.actLabel;
  };
  return ui;
}
