// Luận Võ Đài (data/arena.json): đấu với bản sao tu sĩ theo bảng xếp hạng, thắng người ngay trên thì lên hạng.
import { grant, dailyEvent, ensureDaily, taskDef } from './daily.js';

const C = game => game.data.arena;
const today = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`; };
const byRank = (game, r) => C(game).rivals.find(x => x.rank === r);
const arenaTaskLeft = game => ensureDaily(game).tasks.some(t => { const d = taskDef(game, t.id); return d?.type === 'arena' && t.n < d.n; });

// best: hạng cao nhất (0 = chưa có hạng), left: lượt còn hôm nay, claimed: đã nhận thưởng ngày
export function arenaState(game) {
  const s = game.save, d = today();
  s.arena ??= { best: 0, beaten: {} };
  if (s.arena.day !== d) Object.assign(s.arena, { day: d, left: C(game).per_day, claimed: false });
  return s.arena;
}

// Đối thủ kế tiếp: người ngay trên hạng hiện tại; đã đứng đầu thì đấu lại hạng 1 để giữ ngôi
export function nextRival(game) {
  const a = arenaState(game), n = C(game).rivals.length;
  return byRank(game, a.best ? Math.max(1, a.best - 1) : n);
}

export const dailyReward = (game, best) => best ? C(game).daily[best - 1] : null;

// Dựng chỉ số đối thủ theo máu và công của người chơi
export function rivalDef(game, r) {
  const base = game.data.mobs[r.base], p = game.player;
  const hp = Math.round(p.maxHp * r.hp);
  return { ...base, name: `${r.name} (hạng ${r.rank})`, hp, atk: Math.round(p.atk * r.atk * 10) / 10, color: r.robe, hair: r.hair, sash: r.sash };
}

async function enter(game, r) {
  arenaState(game).left--;
  game.arena = { rival: r, wait: 1.2, t: C(game).time_limit, mob: null };
  game.persist();
  await game.travel(C(game).map, 'vao', true, { text: `Luận võ: ${r.name}, hạng ${r.rank}`, kind: 'portal' });
}

export async function leaveArena(game, text) {
  game.arena = null;
  if (text) game.toast(text, 2.6);
  const b = C(game).back;
  await game.travel(b.map, b.spawn, true, { text: 'Rời Luận Võ Đài', kind: 'portal' });
}

export async function talkArena(game, npc) {
  const name = npc.def.name;
  if (game.story.busy || game.trib.active) { await game.dialog.say([[name, 'Đang có chuyện lớn, luận võ để sau.']]); return; }
  for (;;) {
    const a = arenaState(game), r = nextRival(game), dr = dailyReward(game, a.best);
    const opts = [];
    const lock = game.save.realm < r.realm;
    opts.push({ id: 'fight', label: `Khiêu chiến ${r.name} (hạng ${r.rank})`, color: lock || !a.left ? '#b8b0c8' : '#f2c94c',
      desc: lock ? `Cần cảnh giới ${game.data.realms.names[r.realm]}` : a.beaten[r.id] ? `Còn ${a.left} lượt hôm nay` : `Lần đầu thắng: ${Object.keys(r.first).length} phần thưởng. Còn ${a.left} lượt` });
    if (dr && !a.claimed) opts.push({ id: 'claim', label: 'Nhận bổng lộc hôm nay', desc: `Theo hạng ${a.best}: ${dr.coins} ${game.data.shop.name}, ${dr.stones} Tẩy Luyện Thạch` });
    opts.push({ id: 'out', label: 'Để sau', desc: '' });
    const head = a.best ? `Ngươi đang đứng hạng ${a.best}.` : 'Ngươi chưa có tên trên bảng.';
    const want = !lock && a.left && arenaTaskLeft(game);   // tự hành: nhận bổng lộc, đánh cho xong việc hằng ngày
    const pick = game.pilot ? (dr && !a.claimed ? 'claim' : want ? 'fight' : 'out') : await game.dialog.choose(`${name}: ${head} Thắng người ngay trên thì lên hạng. Mỗi ngày ${C(game).per_day} trận.`, opts);
    if (pick === 'claim') { a.claimed = true; game.toast(`Bổng lộc: ${grant(game, dr).join(', ')}`, 2.4); game.sfx('pickup'); continue; }
    if (pick !== 'fight') return;
    if (lock) { await game.dialog.say([[name, 'Cảnh giới chưa tới, lên đài chỉ chuốc nhục.']]); continue; }
    if (!a.left) { await game.dialog.say([[name, 'Hôm nay đánh đủ rồi. Mai quay lại.']]); continue; }
    await enter(game, r); return;
  }
}

// Gọi mỗi khung: đếm ngược, gọi đối thủ ra, xét thắng thua
export function updateArena(game, dt) {
  const f = game.arena, onMap = game.map.def.arena;
  if (!onMap) { if (f && !game.traveling) game.arena = null; return; }
  if (!f) { if (!game.traveling) leaveArena(game); return; }   // nạp lại bản lưu đang ở trên đài
  if (f.done || game.traveling) return;
  if (f.wait > 0) { if ((f.wait -= dt) <= 0) spawnRival(game, f); return; }
  if ((f.t -= dt) <= 0) { finish(game, false, 'Hết giờ, trọng tài xử hoà là thua.'); return; }
  if (f.mob?.dead) finish(game, true);
}

function spawnRival(game, f) {
  const p = game.player, def = rivalDef(game, f.rival), T = game.map.T;
  p.hp = p.maxHp; p.shield = 0;
  const pos = game.map.freeNear(Math.floor(p.x / T), 2, 1, 6);
  f.mob = game.spawn(f.rival.base, pos.x, pos.y, { def, hp: def.hp, maxHp: def.hp, noQi: true, tower: true, arena: true, aggro: true, summoned: 2 });
  game.say(f.rival.name, f.rival.line, 1.8);
  game.sfx('warn');
}

async function finish(game, win, why) {
  const f = game.arena, a = arenaState(game), r = f.rival;
  f.done = true;
  dailyEvent(game, 'arena');
  if (!win) { game.persist(); await leaveArena(game, why || `Thua ${r.name}. Luyện thêm rồi quay lại.`); return; }
  let msg = `Thắng ${r.name}!`;
  if (!a.best || r.rank < a.best) { a.best = r.rank; msg += ` Lên hạng ${r.rank}.`; }
  if (!a.beaten[r.id]) { a.beaten[r.id] = true; msg += ` Thưởng: ${grant(game, r.first).join(', ')}.`; }
  game.sfx('levelup'); game.persist();
  game.player.hp = game.player.maxHp;
  await game.dialog.say([[r.name, r.rank === 1 ? 'Ghế này... của ngươi.' : 'Phục rồi. Hạng này nhường ngươi.']]);
  await leaveArena(game, msg);
}

// Gục trên đài: thua, không chết thật
export function arenaFail(game) {
  if (!game.arena) return false;
  const f = game.arena;
  if (!f.done) { f.done = true; dailyEvent(game, 'arena'); }
  leaveArena(game, `Thua ${f.rival.name}. Hạng giữ nguyên.`);
  return true;
}

export const arenaGoal = game => game.arena && `Luận võ: ${game.arena.rival.name}, còn ${Math.max(0, Math.ceil(game.arena.t))} giây`;
