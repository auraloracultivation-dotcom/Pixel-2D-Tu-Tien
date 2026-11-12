// Khai Hoang Tinh Cầu (data/khai-hoang.json, máy chủ src/net/khai-hoang.js). Giữ danh sách tinh cầu tông môn trên Vành Khai Hoang:
// dựng bản đồ từng tinh cầu (kh-gen.js) đưa vào data.maps, thêm thiên thể vào tinh đồ (data.starmap.bodies), mức lực chiến quái vào
// config.mob_cp.maps. Mảnh Vỡ Tinh Cầu rơi (khKill, khDun). Trận Khai Tinh: tông chủ mở vé trên máy chủ, bay vào bản đồ trận (trùm giữa sân),
// tự hạ trùm thì báo thắng, máy chủ trừ kho và khai / nâng cấp. Đồng môn vào cùng vé để trợ chiến.
import { genPlanet, levelOf } from './kh-gen.js';
import { addCoins } from './shop.js';

const K = game => game.data['khai-hoang'];
const net = async () => (await import('../net/khai-hoang.js')).khCalls;
export const khState = game => (game.kh ??= { list: [], mine: undefined, fight: null, seenT: 0 });

export function khErr(game, e) {
  const m = String(e?.message || ''), E = K(game).err;
  return E[Object.keys(E).find(k => m.includes(k))] || E.other;
}

// Đưa một tinh cầu (hoặc bản đồ trận) vào game: bản đồ, mức lực chiến quái
function inject(game, p, opts) {
  const { def, mobCp } = genPlanet(K(game), p, opts);
  game.data.maps[def.id] = def;
  const C = game.data.config.mob_cp;
  if (C?.maps) { C.maps[def.id] = mobCp; if (game.mobCpCache) delete game.mobCpCache[def.id]; }
  return def;
}

// Thiên thể trên tinh đồ: bỏ các tinh cầu khai hoang cũ rồi thêm lại theo danh sách mới
function toStarmap(game, list) {
  const sm = game.data.starmap, Kd = K(game), T = Kd.text;
  sm.kinds.khai ??= T.body_kind;
  sm.bodies = sm.bodies.filter(b => !b.kh);
  for (const p of list) {
    const G = Kd.grounds[p.mat_dat] || {};
    sm.bodies.push({ kh: true, map: p.id, name: p.ten, kind: 'khai', orbit: p.vong, angle: p.goc, size: 3 + p.cap, color: G.ground || '#9a8aff',
      realm: levelOf(Kd, p.cap).realm, desc: T.body_desc.replace('{bang}', p.bang || '?').replace('{cap}', p.cap) });
  }
}

export async function khLoad(game) {
  const s = khState(game);
  try { s.list = (await (await net()).list()) || []; } catch { return s.list; }
  for (const p of s.list) inject(game, p);
  toStarmap(game, s.list);
  return s.list;
}

export async function khMine(game) {
  const s = khState(game);
  s.mine = game.online ? (await (await net()).mine()) || null : null;
  return s.mine;
}

const matOf = game => K(game).mat;
export const myShards = game => game.save?.mats?.[matOf(game)] || 0;

function addShards(game, n, why) {
  if (!n || !game.save) return;
  const k = matOf(game);
  game.save.mats[k] = (game.save.mats[k] || 0) + n;
  game.autoNote?.(K(game).text.drop.replace('{n}', n), 2);
  if (why) game.persist();
}

// Mỗi lần hạ quái (daily.js dailyKill): Mảnh Vỡ rơi; hạ trùm trận Khai Tinh thì báo thắng
export function khKill(game, m) {
  const kh = game.map?.def?.kh, D = K(game)?.drop;
  if (!D || m.dummy || m.wb || m.remote) return;
  if (kh?.fight && m.def.ai === 'boss') { fightWon(game); return; }
  if (game.dungeon || m.def.ai === 'boss') return;
  const rate = kh ? D.rate_kh : (m.elite >= 2 ? D.rate_out : 0);
  if (rate && Math.random() < rate) addShards(game, 1);
}

// Phá bí cảnh / càn quét (dun-mode.js, dun-run.js)
export function khDun(game) {
  const D = K(game)?.drop?.dun;
  if (D) addShards(game, D[0] + Math.floor(Math.random() * (D[1] - D[0] + 1)), true);
}

export async function khGive(game, manh, lt) {
  const c = await net();
  return game.cloud.run(() => c.give(manh, lt), r => {
    game.save.mats[matOf(game)] = Math.max(0, myShards(game) - r.manh);
    addCoins(game, -r.lt, 'khai-hoang');
    game.refreshStats?.(); game.persist();
  });
}

// Vé trận (mở mới hoặc vé đang mở) → bay vào bản đồ trận
export async function khOpen(game, ten, dat) {
  const r = await (await net()).open(ten, dat);
  await khEnter(game, { ...r, cua_toi: true });
  return r;
}

export async function khEnter(game, t) {
  const s = khState(game), id = 'kt-' + String(t.ve).slice(0, 8);
  s.fight = { ve: t.ve, cap: t.cap, ten: t.ten, mine: !!t.cua_toi, id };
  const def = inject(game, { id, ten: t.ten, mat_dat: t.mat_dat, hat: t.hat, cap: t.cap }, { fight: true, cap: t.cap, ticket: t.ve });
  await game.travel(id, 'vao', true, { force: true, text: def.name });
  const boss = game.data.mobs[K(game).grounds[t.mat_dat]?.boss]?.name || '';
  game.toast(K(game).text.fight_toast.replace('{boss}', boss).replace('{ten}', t.ten), 3);
}

export async function khQuit(game) {
  const f = khState(game).fight;
  if (!f) return;
  khState(game).fight = null;
  if (f.mine) await (await net()).lose(f.ve).catch(() => {});
}

async function fightWon(game) {
  const s = khState(game), f = s.fight, T = K(game).text;
  if (!f || game.map.id !== f.id) return;
  if (!f.mine) { game.toast(T.fight_note, 3); return; }
  try {
    const p = await (await net()).win(f.ve);
    s.fight = null;
    game.toast(T.won.replace('{ten}', p.ten).replace('{cap}', p.cap), 4);
    await khLoad(game); khMine(game).catch(() => {});
    if (game.data.maps[p.id]) setTimeout(() => game.travel(p.id, 'vao', true, { force: true }), 2500);
  } catch (e) { game.toast(khErr(game, e), 3); }
}

export async function khFly(game, id) {
  if (!game.data.maps[id]) await khLoad(game);
  if (game.data.maps[id]) await game.travel(id, 'vao', true, { force: true });
}

// Ghé tinh cầu tông môn mình: báo máy chủ (giữ khỏi ma khí); kiểm mỗi 20 giây, máy chủ tự bỏ qua nếu chưa đủ một giờ
export function khWatch(game) {
  khLoad(game).catch(() => {});
  setInterval(() => {
    const s = khState(game), id = game.map?.id, mine = s.mine?.tinh?.id;
    if (game.online && s.mine === undefined) { s.mine = null; khMine(game).catch(() => { s.mine = undefined; }); }
    if (game.online && mine && id === mine && Date.now() - s.seenT > 3600e3) { s.seenT = Date.now(); net().then(c => c.visit(id)).catch(() => {}); }
  }, 20e3);
}
