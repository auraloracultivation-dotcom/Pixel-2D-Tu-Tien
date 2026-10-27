// Linh thực (data/snacks.json): mỗi tinh cầu một món đặc sản bán ở xóm. Mua bằng Linh Thạch, ăn ngay,
// min phút cộng chỉ số nhỏ (tính trong stats.js); một món một lúc, món sau thay món trước.
import { coins, addCoins } from './shop.js';

const S = game => game.data.snacks;
const fill = (s, v) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

export const snackOf = (data, npcId) => Object.entries(data.snacks.list).find(([, d]) => d.npc === npcId) || null;
const snackHere = game => Object.entries(S(game).list).find(([, d]) => d.map === game.map?.id) || null;
export const activeSnack = save => ((save.snack?.until || 0) > Date.now() ? save.snack : null);

// Chỉ số cộng thêm của món đang ăn
export function snackStats(save, data) {
  const a = activeSnack(save), d = a && data.snacks?.list[a.id];
  return d ? d.stats : {};
}
export function effText(game, d) {
  const N = S(game).stat_names;
  return Object.entries(d.stats).map(([k, v]) => `+${v}% ${N[k] || k}`).join(', ');
}
export function snackHud(game) {
  const a = activeSnack(game.save), d = a && S(game).list[a.id];
  return d ? fill(S(game).hud, { name: d.name, min: Math.ceil((a.until - Date.now()) / 60000) }) : '';
}

export function buySnack(game, id) {
  const d = S(game).list[id], T = S(game);
  if (!d || coins(game.save) < d.price) return false;
  addCoins(game, -d.price);
  game.save.snack = { id, until: Date.now() + T.min * 60000 };
  game.refreshStats(); game.persist(); game.sfx('pickup');
  game.toast(fill(T.toast, { name: d.name, eff: effText(game, d), min: T.min }), 2.4);
  return true;
}

// Chạm người bán: chọn mua hay thôi
export async function talkSnack(game, npc) {
  const [id, d] = snackOf(game.data, npc.id), T = S(game);
  const pick = await game.dialog.choose(`${npc.def.name}: ${d.line}`, [
    { id: 'buy', label: fill(T.buy, { name: d.name, price: d.price }), desc: fill(T.eff_label, { eff: effText(game, d), min: T.min }), color: '#f2a14a' },
    { id: 'no', label: T.no },
  ]);
  if (pick === 'buy' && !buySnack(game, id)) game.toast(T.poor, 1.6);
}

// Món vừa hết thì tính lại chỉ số
export function updateSnack(game) {
  const s = game.save?.snack;
  if (s && !s.done && s.until <= Date.now()) { s.done = true; game.refreshStats(); }
}

// Tự hành trước khi treo máy: hết món, dư Linh Thạch (keep lần giá), tinh cầu này có người bán thì ghé mua
export function snackJob(game) {
  if (activeSnack(game.save)) return null;
  const e = snackHere(game);
  if (!e || coins(game.save) < e[1].price * S(game).keep) return null;
  const n = game.npcs.find(x => x.id === e[1].npc);
  return n ? { snack: e[0], at: n } : null;
}
