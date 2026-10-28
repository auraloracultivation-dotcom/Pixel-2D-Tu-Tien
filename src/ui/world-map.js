// Nút Bản đồ (ngoài HUD): hai tab. "Tinh cầu này": bản đồ tinh cầu đang đứng, chạm chỗ nào là ngự kiếm bay tới (src/ui/planet-map.js).
// "Tinh hệ": tinh đồ Thiên Kiếm Tinh Hệ vẽ bằng canvas; chạm thiên thể để xem, nơi đã tới hoặc đã mở đường bay thì bay tới (ngoài bí cảnh).
import { bodiesOf, dangerOf, whyNot, flyOpen } from '../game/starmap.js';
import { drawStarmap } from '../render/draw-starmap.js';
import { panZoom } from './pan-zoom.js';
import { weekLine } from '../game/demon.js';
import { fairMap } from '../game/fair.js';
import { drawPlanet, tapPlanet } from './planet-map.js';
import { hopTo, hopWhy } from '../game/hop.js';

const $ = id => document.getElementById(id);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

export function createWorldMap(game) {
  const { data } = game, sm = data.starmap, H = data.dungeon.hint;
  const bodies = bodiesOf(sm, data.maps);
  const hint = { easy: H.easy_color, fair: H.fair_color, hard: H.hard_color };
  const hintText = { easy: H.easy_text, fair: H.fair_text, hard: H.hard_text };
  let canvas = null, ctx = null, raf = 0, pts = [], sel = null, t0 = 0, view = null, mode = 'sys', lay = null, tabs = null;

  // Đang ở bí cảnh, đang độ kiếp hay truyện đang chạy thì không bay
  const blocked = () => (game.map.def.rooms || []).length ? 'Đang ở bí cảnh, ra cổng trước đã.'
    : game.map.def.tower || game.map.def.res ? 'Đang trong tháp hoặc bí cảnh, ra cổng trước đã.'
    : game.trib.active ? 'Đang độ kiếp!' : game.story.busy ? 'Đang có chuyện, đợi xong đã.' : null;

  const seen = b => b.sun || b.kind === 'lost' || b.kind === 'soon' || !!data.maps[b.map]?.demon || !!game.save.visited?.[b.map] || (!!b.map && flyOpen(game, b.map));

  function fit() {
    const box = $('world-sky'), dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = box.clientWidth, h = box.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  function frame() {
    if ($('world').hidden) { raf = 0; return; }
    const { w, h } = fit();
    if (mode === 'here') { lay = drawPlanet(ctx, w, h, (performance.now() - t0) / 1000, game); raf = requestAnimationFrame(frame); return; }
    pts = drawStarmap(ctx, w, h, sm, bodies, {
      min: Date.now() / 60000, t: (performance.now() - t0) / 1000, realm: game.save.realm || 0,
      here: game.map.id, sel: sel?.id, seen, hint, view,
    });
    raf = requestAnimationFrame(frame);
  }

  function card() {
    const box = $('world-card'); box.innerHTML = '';
    box.hidden = !sel;
    if (!sel) return;
    const b = sel, known = seen(b);
    box.append(el('b', null, known ? b.name : sm.texts.unknown), el('small', null, sm.kinds[b.kind] || ''));
    if (known && b.desc) box.append(el('p', null, b.desc));
    const dg = known && dangerOf(b, game.save.realm || 0);
    if (data.maps[b.map]?.demon) box.append(el('p', 'wc-danger', weekLine(game)));   // Ma Vương tuần này
    if (known && fairMap(game) === b.map) box.append(el('p', 'wc-danger', data.fair.texts.card));   // hội đèn tối nay
    if (dg) { const p = el('p', 'wc-danger', sm.texts.danger + ' '); const s = el('span', null, hintText[dg]); s.style.color = hint[dg]; p.append(s); box.append(p); }
    if (b.sun || b.kind === 'lost' || b.kind === 'soon') return;
    const here = game.map.id === b.map, why = here ? sm.texts.here : whyNot(game, b) || blocked();
    const go = el('button', 'wc-go', why || sm.texts.fly);
    go.disabled = !!why;
    go.onclick = () => {
      const m = data.maps[b.map];
      close();
      game.travel(b.map, 'vao', true, { text: sm.texts.trip.replace('{name}', b.name), kind: m.indoor || m.rooms?.length ? 'portal' : 'flight' });
    };
    box.append(go);
  }

  // Chạm ở tab tinh cầu: bay tới chỗ đó (bị chặn thì báo lý do, bảng vẫn mở)
  function hop(x, y) {
    const hit = tapPlanet(lay, x, y, game);
    if (!hit) return;
    const why = hopWhy(game);
    if (why) { game.toast(why, 1.6); return; }
    close();
    hopTo(game, hit.at[0], hit.at[1], hit.name);
  }

  function setMode(m) {
    mode = m; sel = null; view?.reset(); card();
    for (const b of tabs.children) b.classList.toggle('on', b.dataset.mode === m);
    $('world-title').textContent = m === 'here' ? game.map.def.name : sm.name;
    $('world-sub').textContent = m === 'here' ? hopWhy(game) || '' : blocked() || sm.sub;
  }

  // Chạm: chọn thiên thể gần nhất; chạm chỗ trống thì đóng thẻ
  function tap(x, y) {
    if (mode === 'here') { hop(x, y); return; }
    let best = null, bd = Infinity;
    for (const p of pts) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < Math.max(16, p.r + 8) && d - p.r < bd) { bd = d - p.r; best = p.b; }
    }
    sel = best; card();
  }

  function open() {
    if (!game.save || game.dialog.open || game.trip || game.traveling) return;
    game.uiOpen = true; $('world').hidden = false;
    if (!canvas) {
      canvas = el('canvas'); ctx = canvas.getContext('2d');
      view = panZoom(canvas, { max: 3.5, onTap: tap });
      $('world-sky').prepend(canvas);
      tabs = el('div', 'world-tabs');
      for (const [m, label] of [['here', sm.texts.tab_here], ['sys', sm.texts.tab_sys]]) {
        const b = el('button', null, label); b.dataset.mode = m;
        b.onclick = () => setMode(m);
        tabs.append(b);
      }
      $('world-sky').before(tabs);
    }
    tabs.children[0].hidden = !game.map.def.planet;   // trong bí cảnh, động phủ thì chỉ có tinh hệ
    setMode(game.map.def.planet ? 'here' : 'sys');
    t0 = performance.now();
    if (!raf) raf = requestAnimationFrame(frame);
  }
  function close() { game.uiOpen = false; $('world').hidden = true; }

  $('world-close').onclick = close;
  $('btn-world').addEventListener('pointerdown', ev => { ev.stopPropagation(); open(); });
  // Truyện bảo sang tinh cầu khác (không còn cổng giẫm, chỉ bay bằng Bản đồ): nút Bản đồ sáng nhắc
  setInterval(() => {
    const u = game.save && game.story?.current?.()?.until, to = u?.map, def = to && data.maps[to];
    $('btn-world').classList.toggle('glow-hint', !!def?.world && to !== game.map?.id && !game.pilot && (flyOpen(game, to) || !!game.save.visited?.[to]));
  }, 1000);
  return { open, close, get pts() { return pts; } }; // pts: chỗ vẽ từng thiên thể (kiểm thử tự động chạm theo)
}
