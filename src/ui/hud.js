// Thanh máu, linh khí, nhiệm vụ, nút chiêu, thông báo, màn bay giữa các đảo, menu đầu game.
import { atkIcon } from './hud-atk.js';
import { skillGrade } from '../game/skill-grade.js';
import { createDialog } from './dialog.js';
import { guideLine, guideNext } from '../game/guide.js';
import { qiNeed, realmLabel, rootOf, artSkill } from '../game/stats.js';
import { power } from '../game/achieve.js';
import { createHints } from './hints.js';
import { skillSlots } from '../game/skills.js';
import { toggleAuto } from '../game/auto.js';
import { togglePilot, pilotLabel } from '../game/pilot.js';
import { teaLeft } from '../game/home.js';
import { phase } from '../game/daynight.js';
import { season } from '../game/weather.js';
import { pbOn } from '../game/phap-bao.js';
import { pbHud } from './phap-bao-hud.js';
import { pxOn } from '../game/pfx.js';

const $ = id => document.getElementById(id);
// Ghi kiểu CSS chỉ khi giá trị đổi: ui.update chạy 15 lần mỗi giây, ghi lại giá trị cũ vẫn bắt trình duyệt tính lại kiểu (nóng máy)
const css = (el, k, v) => { const m = el._css ||= {}; if (m[k] !== v) { m[k] = v; el.style.setProperty(k, v); } };

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
  const paintMute = () => { mute.textContent = audio.muted ? '🔇' : '🔊'; mute.classList.toggle('off', audio.muted); };   // .off: biểu tượng loa mờ (style-khung.css)
  mute.addEventListener('pointerdown', e => { e.stopPropagation(); audio.toggle(); paintMute(); });
  paintMute();

  // Nút Menu mở bảng Menu (src/ui/menu-panel.js); #hud-menu giữ các nút bảng cũ, luôn ẩn, bảng Menu bấm hộ
  let gameRef = null;
  let hints = null;
  $('btn-auto').addEventListener('pointerdown', e => { e.stopPropagation(); if (gameRef?.player) { toggleAuto(gameRef); if (gameRef.auto) gameRef.pilot = null; } });
  $('btn-pilot').addEventListener('pointerdown', e => { e.stopPropagation(); if (gameRef?.player) togglePilot(gameRef); });
  $('goal').addEventListener('pointerdown', e => {   // chạm khung nhiệm vụ: tự hành làm nhiệm vụ (chủ dự án 02/11/2026: không còn nút Tự hành), chạm lần nữa thì dừng
    e.stopPropagation();
    if (!gameRef?.player) return;
    togglePilot(gameRef);
    if (gameRef.pilot && guideNext(gameRef)) gameRef.sfx?.('pickup');   // mũi tên chỉ việc kế tiếp (src/game/guide.js)
  });

  ui.showPlay = on => { $('hud').hidden = !on; $('buttons').hidden = !on; $('menu').hidden = on; };


  let last = '';
  ui.update = game => {
    if (!game.save || !game.player) return;
    const p = game.player, s = game.save, d = game.data;
    gameRef = game;
    (hints ??= createHints(game))();
    const need = qiNeed(s, d.realms);
    const key = [Math.ceil(p.hp), p.maxHp, Math.floor(p.mp ?? 0), p.mpMax, Math.floor(s.qi), need, s.realm, s.layer, Math.ceil(p.shield), s.element, game.cloud?.name, (s.qiX2 || 0) > Date.now()].join();
    if (key !== last) {
      last = key;
      const R = $('realm');   // cảnh giới dòng trên, linh căn dòng dưới nhỏ hơn (trước gộp một dòng nên bị cắt mất chữ "Thiên")
      if (R.childElementCount !== 2) {
        R.textContent = ''; const b = document.createElement('b'), nm = document.createElement('span');
        nm.className = 'hud-name'; nm.onclick = () => gameRef?.openRename?.();   // chủ dự án 30/10: tên trước cảnh giới, chạm để đổi tên
        b.append(nm, document.createElement('span')); R.append(b, document.createElement('small'));
      }
      const nm = R.children[0].children[0];
      nm.textContent = game.cloud?.name || ''; nm.hidden = !game.cloud?.name;
      R.children[0].children[1].textContent = realmLabel(s, d.realms);
      R.children[1].textContent = s.element ? `${d.elements[s.element].name} căn · ${rootOf(s, d).name}` : '';
      document.documentElement.style.setProperty('--el-line', s.element ? d.elements[s.element].color + 'dd' : '');   // đề xuất #41: viền nút theo hệ Linh căn (style-khung.css)
      $('hp-fill').style.width = Math.max(0, p.hp / p.maxHp * 100) + '%';
      $('hp-text').textContent = `Sinh lực ${Math.max(0, Math.ceil(p.hp))}/${p.maxHp}` + (p.shield > 0 ? ` (+${Math.ceil(p.shield)})` : '');
      // thanh Linh lực (chủ dự án 04/11/2026 12:57) giữa Sinh lực và Linh khí; Linh khí (tu vi đột phá) thành thanh mảnh bên dưới
      let mb = document.getElementById('mp-fill');
      if (!mb) { const bar = document.createElement('div'); bar.className = 'bar mp'; bar.innerHTML = '<i id="mp-fill"></i><span id="mp-text"></span>'; document.querySelector('#hud .bar.qi')?.before(bar); mb = document.getElementById('mp-fill'); }
      mb.style.width = Math.max(0, (p.mp ?? 0) / (p.mpMax || 1) * 100) + '%';
      $('mp-text').textContent = `Linh lực ${Math.floor(p.mp ?? 0)}/${p.mpMax || 0}`;
      let rb = document.getElementById('no-fill');   // thanh Nộ (chủ dự án 09/11/2026 00:30, src/game/juice.js): đầy thì Bạo Nộ
      if (!rb) { const bar = document.createElement('div'); bar.className = 'bar no'; bar.innerHTML = '<i id="no-fill"></i><span id="no-text"></span>'; document.querySelector('#hud .bar.qi')?.before(bar); rb = document.getElementById('no-fill'); }
      const J = game.juice, rf = J ? J.rage / (d.juice?.rage.full || 100) : 0;
      rb.style.width = Math.max(0, rf * 100) + '%'; rb.parentNode.classList.toggle('on', J?.rageOn > 0);
      $('no-text').textContent = J?.rageOn > 0 ? 'Bạo Nộ!' : `Nộ ${Math.floor(rf * 100)}%`;
      $('qi-fill').style.width = Math.min(100, s.qi / need * 100) + '%';
      $('qi-text').textContent = `Linh khí ${Math.floor(s.qi)}/${need}` + ((s.qiX2 || 0) > Date.now() ? ' ×2' : '');
    }
    const gl = guideLine(game), goals = game.goals().split('\n').map(l => (gl && l === gl && game.goals().includes('\n') ? '➤ ' + l : l)).join('\n');   // nhiều việc: ➤ là việc mũi tên đang chỉ (chạm khung để đổi)
    const noStory = d['he-thong']?.story_ui === false;   // bỏ khung việc truyện cũ (chủ dự án 12/11/2026 11:05): chỉ còn dòng Tự hành khi đang chạy
    const pl = pilotLabel(game), gt = [noStory ? '' : goals, pl].filter(Boolean).join('\n');
    $('goal').hidden = !gt;   // dòng Con Đường Đạo Vận đã bỏ khỏi khung (chủ dự án 02/11/2026)
    if ($('goal').textContent !== gt) $('goal').textContent = gt;

    const boss = game.mobs.find(m => (m.def.ai === 'boss' || m.arena) && !m.dead && !m.wboss);   // đầu boss thế giới có bảng riêng (ui/mang-panel.js)
    $('boss').hidden = !boss;
    if (boss && $('boss-name').textContent !== boss.def.name) $('boss-name').textContent = boss.def.name;
    if (boss) { css($('boss-fill'), 'width', (boss.hp / boss.maxHp * 100).toFixed(1) + '%'); }

    atkIcon(game);   // nút đánh thường: hình bản mệnh pháp bảo (hud-atk.js)
    const slots = skillSlots(game), pbMode = pbOn(game);   // hệ pháp bảo mới (tài khoản thử): nút chiêu, nút Luyện chế do pbHud vẽ
    if (!pbMode) for (let i = 0; i < 3; i++) {
      const b = $('btn-s' + i), id = slots[i];
      b.classList.toggle('off', !id);
      const name = id ? d.skills[id].name : '—';
      const lbl = b.querySelector('b');
      if (lbl.textContent !== name) { lbl.textContent = name; b.style.backgroundImage = skillIcon(d, id); if (id) b.style.setProperty('--gc', skillGrade(d, id).color); else b.style.removeProperty('--gc'); }   // vòng ngoài theo phẩm chiêu (game/skill-grade.js)
      const cd = id ? Math.max(0, p.skillCd[i]) / (d.skills[id].cd * (1 - p.st.cdr)) : 0;
      css(b, '--cd', cd.toFixed(3));
    }
    $('bag-badge').hidden = !game.newItems;
    $('skills-badge').hidden = !game.newSkills;
    $('pets-badge').hidden = !game.newPets;
    $('daily-badge').hidden = !game.newDaily;
    $('achv-badge').hidden = !game.newAchv;
    $('menu-badge').hidden = !(game.newItems || game.newSkills || game.newPets || game.newDaily || game.newAchv);
    const tl = teaLeft(game), pw = `Lực chiến ${power(game).toLocaleString('vi-VN')}` + (tl ? ` · Trà ${tl} phút` : '');
    if ($('power').textContent !== pw) { $('power').textContent = pw; $('power').dataset.n = power(game).toLocaleString('vi-VN') + (tl ? ` · Trà ${tl}′` : ''); }   // data-n: chỉ số (khung trên mới đặt trên bảng song kiếm, style-hud-tren.css)
    const H = game.data.weather.hud, se = season(game);   // mùa, giờ, trời (luôn đêm: chỉ ghi chữ Đêm khi đúng giờ đêm, đả tọa +20%, không ghi Ban ngày dưới trời trăng)
    const sky = [se && H.season.replace('{name}', se.name), (!d.daynight.always_night || phase(game).id === 'dem') && phase(game).name, game.raining && H.rain.replace('{pct}', Math.round((d.weather.rain.meditate - 1) * 100))].filter(Boolean).join(' · ');
    if ($('sky').textContent !== sky) $('sky').textContent = sky;
    $('btn-auto').classList.toggle('on', !!game.auto);
    $('btn-pilot').classList.toggle('on', !!game.pilot);
    const pid = d.cave.pill_button, pn = s.pills?.[pid] || 0, pb = $('btn-pill');
    pb.hidden = !pn;
    if (pn) {
      const t = `Đan ${pn}`;
      if (pb.querySelector('b').textContent !== t) pb.querySelector('b').textContent = t;
      css(pb, '--cd', (Math.max(0, p.pillCd || 0) / d.cave.pills[pid].cd).toFixed(3));
    }
    const art = pbMode ? null : artSkill(s, d), ab = $('btn-art');
    if (pbMode) pbHud(game);
    else ab.hidden = !art;
    if (art) {
      if (ab.querySelector('b').textContent !== d.skills[art].name) ab.querySelector('b').textContent = d.skills[art].name;
      css(ab, '--cd', (Math.max(0, p.artCd || 0) / (d.skills[art].cd * (1 - p.st.cdr))).toFixed(3));
    }
    css($('btn-dash'), '--cd', (Math.max(0, p.dashCd || 0) / d.config.dash.cd).toFixed(3));
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
  const spr = (pxOn({ data: d }) && d.art.sprites['pxi.' + id]) || d.art.sprites['vfx.' + (d.vfx?.skills?.[id]?.icon || id)] || d.art.sprites['icon.' + (s.icon || s.fx || { heal: 'heal', shield: 'shield', buff: 'buff' }[s.type] || 'orb')];   // hình riêng từng chiêu (ảnh GPT 05/11/2026)
  return spr ? `url("${spr.file}?v=${spr.v}")` : '';
}
