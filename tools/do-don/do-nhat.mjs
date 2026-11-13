// Phòng đo cảm giác ra đòn (docs/10-CAI-HON.md, bốn bước kiểm): node tools/do-don/do-nhat.mjs <thư mục ra> [--mob ma-tieu] [--hits 3] [--hp N] [--crop 260x220] [--frames 54] [--dist 18]
//   [--q "don=1"] [--passive 1] [--weapon kiem] [--el thuy] [--crit 0,1,0] [--patch '{"config.slash.glow":0}']. Ra: h<nhát>_<khung>.png + log.json. Xếp thành bảng: bang-nhat.py.
// Mỗi nhát: bấm đánh, bước từng khung 1/60 giây, chụp vùng quanh chỗ đánh và ghi trạng thái (khựng, loé, bật lùi, số, rung, tiếng).
import { mkdirSync, writeFileSync } from 'node:fs';
import { serve } from './may-chu.mjs';
const { chromium } = await import('playwright'); const stop = serve(8791);
const args = process.argv.slice(2), out = args.shift(), F = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) F[args[i].slice(2)] = args[++i];
mkdirSync(out, { recursive: true });
const MOB = F.mob ?? 'ma-tieu', HITS = +(F.hits ?? 3), DPR = +(F.dpr ?? 3), NF = +(F.frames ?? 54), DIST = +(F.dist ?? 18), [CW, CH] = (F.crop ?? '260x220').split('x').map(Number);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: DPR, hasTouch: true, isMobile: true, locale: 'vi-VN' });
await ctx.route(/posthog\.com|supabase\.co|workers\.dev/, r => r.abort());
const p = await ctx.newPage(); const errs = [];
p.on('pageerror', e => { errs.push(e.message); console.log('LỖI JS', e.message, (e.stack || '').split('\n')[1]); });
await p.goto('http://localhost:8791/?thu=1' + (F.q ? '&' + F.q : '')); await p.waitForSelector('#btn-guest:not([disabled])', { timeout: 30000 });
await p.click('#btn-guest'); await p.waitForFunction(() => window.__game?.save, null, { timeout: 30000 });
const info = await p.evaluate(async ({ MOB, DIST, HP, PASSIVE, PATCH, WEAPON, EL }) => {
  const g = window.__game, wait = ms => new Promise(r => setTimeout(r, ms));
  for (const [path, v] of Object.entries(PATCH)) { const ks = path.split('.'); let o = g.data; while (ks.length > 1) o = o[ks.shift()]; o[ks[0]] = v; }   // thử số: --patch '{"config.slash.glow":0}'
  g.data.config.perf.slow_ms = 1e9;
  for (let quiet = 0, i = 0; i < 400 && quiet < 12; i++) {
    const c = document.querySelector('#dlg-choices .choice');
    if (c) { c.click(); quiet = 0; } else if (g.dialog.open) { g.dialog.skip(); g.dialog.skip(); quiet = 0; } else quiet++;
    await wait(60);
  }
  g.dialog.say = () => Promise.resolve(); g.dialog.choose = () => Promise.resolve(null); g.dialog.ask = () => Promise.resolve(null);
  g.persist = () => {};
  const MB = await import('/src/game/mobs.js'); await wait(1500);
  if (WEAPON) { g.save.weapon = WEAPON; g.refreshStats?.(); }
  if (EL) g.save.element = EL;
  const pl = g.player; pl.face = { x: 1, y: 0 }; pl.vx = pl.vy = 0;
  for (const m of g.mobs) m.dead = true; g.mobs.length = 0;
  MB.spawnMob(g, MOB, pl.x + DIST, pl.y); const m = g.mobs[g.mobs.length - 1];
  if (HP) m.hp = m.maxHp = HP;
  if (PASSIVE) { m.aggro = false; m.__passive = true; }
  g.__mob = m; g.__log = [];
  const sf = g.sfx; g.sfx = (n, v) => { g.__log.push({ t: +g.time.toFixed(3), sfx: n, v }); return sf(n, v); };
  const up = g.update; g.__q = 0; g.__n = 0; g.__live = true;
  g.update = dt => { if (g.__live) return up(dt); if (g.__q > 0) { g.__q--; g.uiOpen = false; if (g.__mob.__passive && !g.__mob.dead) { g.__mob.atkCd = 9; g.__mob.vx = g.__mob.vy = 0; } up(1 / 60); g.__n++; } };
  g.__step = async () => { const n0 = g.__n; g.__q = 1; for (let i = 0; i < 120 && g.__n === n0; i++) await new Promise(r => requestAnimationFrame(r)); await new Promise(r => requestAnimationFrame(r)); };
  g.__grab = (cw, ch) => {
    const s = g.screen, c = document.createElement('canvas'); c.width = cw; c.height = ch;
    const P = s.toScreen(pl.x + DIST / 2 + 6, pl.y - 10), x = Math.round(P.x * s.dpr - cw / 2), y = Math.round(P.y * s.dpr - ch / 2);
    c.getContext('2d').drawImage(s.canvas, x, y, cw, ch, 0, 0, cw, ch);
    return c.toDataURL('image/png').slice(22);
  };
  g.__state = () => ({ t: +g.time.toFixed(3), hs: +(g.hitstop > 0 ? g.hitstop : 0).toFixed(3), sw: +Math.max(0, pl.swingT).toFixed(2), cd: +Math.max(0, pl.atkCd).toFixed(2),
    mhp: g.__mob.dead ? 'chết' : Math.round(g.__mob.hp), mx: +(g.__mob.x - pl.x).toFixed(1), fl: +Math.max(0, g.__mob.flash || 0).toFixed(2),
    sh: [+(g.screen.sx || 0).toFixed(1), +(g.screen.sy || 0).toFixed(1)], num: g.numbers.map(n => n.text + '@' + (n.t).toFixed(2)), fx: g.fx.map(f => f.type + (f.id ? ':' + f.id : '')),
    php: Math.round(pl.hp) });
  return { map: g.map.id, zoom: g.screen.zoom, dpr: g.screen.dpr, weapon: g.save.weapon, atk: pl.atk, mob: { id: MOB, hp: m.hp, r: m.r, atk: m.def.atk }, canvas: [g.screen.canvas.width, g.screen.canvas.height], juice: Object.keys(g.juice || {}) };
}, { MOB, DIST, HP: +(F.hp ?? 0), PASSIVE: !!F.passive, PATCH: JSON.parse(F.patch ?? '{}'), WEAPON: F.weapon || '', EL: F.el || '' });
console.log(JSON.stringify(info));
const log = []; let n = 0;
await p.evaluate(() => { window.__game.__live = false; });
for (let h = 0; h < HITS; h++) {
  for (let f = 0; f < NF; f++) {
    const r = await p.evaluate(async ({ f, cw, ch, CRIT }) => {
      const g = window.__game;
      if (CRIT >= 0) g.player.st.crit = CRIT;
      if (f === 2) g.input.held.add('atk'); if (f === 4) g.input.held.delete('atk');
      await g.__step();
      const ev = g.__log.splice(0);
      return { st: g.__state(), ev, img: g.__grab(cw, ch) };
    }, { f, cw: Math.round(CW * info.dpr), ch: Math.round(CH * info.dpr), CRIT: F.crit != null ? (String(F.crit).split(',')[h] ?? -1) * 1 : -1 });
    const name = `h${h}_${String(f).padStart(2, '0')}.png`;
    writeFileSync(`${out}/${name}`, Buffer.from(r.img, 'base64'));
    log.push({ h, f, ...r.st, ev: r.ev.length ? r.ev : undefined }); n++;
  }
}
writeFileSync(`${out}/log.json`, JSON.stringify({ info, log }));
console.log('khung:', n, 'lỗi JS:', errs.length);
await b.close(); stop();
