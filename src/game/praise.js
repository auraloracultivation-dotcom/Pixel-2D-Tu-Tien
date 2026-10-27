// Đạo lữ khen (data/praise.json): đột phá, hạ boss, được đồ hiếm, lên hạng... thì đạo lữ (hoặc bạn đồng hành thân) nói vài câu.
import { daoLuHere, affinity } from './affinity.js';

const C = game => game.data.praise;
const pick = a => a[Math.floor(Math.random() * a.length)];

// Ai khen: đạo lữ; chưa có thì bạn đồng hành đang đi cùng đủ thân
function speaker(game) {
  const d = daoLuHere(game);
  if (d) return { id: d, close: true };
  const c = game.comp?.id;
  return c && affinity(game, c) >= C(game).min_aff ? { id: c, close: false } : null;
}

export function praise(game, kind, vars = {}) {
  const cfg = C(game), who = speaker(game);
  if (!who || !game.save || game.story?.busy) return;
  const big = cfg.big.includes(kind);
  if (!big) {
    if (!who.close || game.time < (game.praiseT || 0) || Math.random() > cfg.small_chance) return;
    game.praiseT = game.time + cfg.small_cd;
  } else if (!who.close && Math.random() > cfg.comp_chance) return;
  const mine = (cfg.lines[who.id]?.[kind] || []).filter(l => who.close || !l.includes('đạo lữ'));   // chưa kết đạo lữ thì không nói "đạo lữ của ta"
  const set = mine.length ? mine : cfg.lines.default[kind];
  if (!set) return;
  const text = pick(set).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const q = game.praiseQ ??= { list: [], t: 1.6 };   // nói sau thông báo của game một nhịp, từng câu một
  if (q.list.length < 2) q.list.push([`♥ ${game.data.npcs[who.id].name}`, text]);
}

// Theo dõi thay đổi trong bản lưu để khen: cảnh giới, tầng, hạng, tháp, thành tựu, đồ mới
export function updatePraise(game, dt) {
  const s = game.save, q = game.praiseQ;
  if (q && (q.t -= dt) <= 0) { game.say(...q.list.shift(), C(game).sec); q.t = C(game).sec + 0.4; if (!q.list.length) game.praiseQ = null; }
  if ((game.praisePoll = (game.praisePoll || 0) - dt) > 0) return;
  game.praisePoll = 0.5;
  const now = { realm: s.realm, layer: s.layer, arena: s.arena?.best || 0, tower: s.tower?.best || 0, achv: Object.keys(s.achv || {}).length, uid: s.nextUid };
  const was = game.praiseSnap;
  game.praiseSnap = now;
  if (!was) return;
  const d = game.data;
  if (now.realm > was.realm) return praise(game, 'realm', { realm: d.realms.names[now.realm] });
  if (now.arena && now.arena !== was.arena) return praise(game, 'arena', { rank: now.arena });
  if (now.achv > was.achv) { const a = d.status.achievements.find(a => s.achv[a.id] === 1); return praise(game, 'achv', { name: a?.name || '' }); }
  if (now.tower > was.tower && now.tower % 5 === 0) return praise(game, 'tower', { rank: now.tower });
  const it = now.uid !== was.uid && s.bag.find(i => i.uid === now.uid - 1);
  if (it) {
    const r = d.items.rarities.findIndex(x => x.id === it.rarity), idx = id => d.items.rarities.findIndex(x => x.id === id);
    const name = d.items.bases[it.base]?.name || '';
    if (r >= idx(C(game).rare_from)) return praise(game, 'rare', { item: name });
    if (r >= idx(C(game).item_from)) return praise(game, 'item', { item: name });
  }
  if (now.layer !== was.layer && now.realm === was.realm) praise(game, 'layer');
}
