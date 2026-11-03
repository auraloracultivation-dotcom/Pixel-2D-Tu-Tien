// Bạn bè và thăm nhà bạn (chủ dự án chốt 02/11/2026). Thăm nhà: bay tới động phủ, đồ trang trí vẽ theo nhà bạn (game.visiting,
// decor.js → hasDecor), không gọi đạo lữ / khách nhà mình ra. Đi nơi khác (hoặc "Về nhà mình") là hết thăm.
import { md5 } from '../core/md5.js';

const net = () => import('../net/friends.js');

// Phòng online của động phủ (chủ dự án 04/11/2026, góp ý #114: "mỗi người một động phủ riêng trừ khi tới nhà nhau chơi").
// Ở nhà mình: phòng "dong-phu:<mã mình>", đang thăm: "dong-phu:<mã chủ nhà>", nên chỉ chủ nhà và khách thăm thấy nhau.
// Mã là mã công khai 12 ký tự (giống p2d_chat_key ở máy chủ, tính lại từ mã tài khoản như game/social.js).
export function caveRoom(game, uid) {
  const k = game.visiting ? game.visiting.k : uid && md5('chat:' + uid).slice(0, 12);
  return /^[0-9a-f]{12}$/.test(k || '') ? `${game.map.id}:${k}` : null;   // mã lạ: chơi một mình
}

export const friendList = async () => (await net()).friendList();
export const addFriend = async k => (await net()).addFriend(k);
export const removeFriend = async k => (await net()).removeFriend(k);

// Gắn một lần lúc dựng giao diện: đi bất cứ đâu không phải lượt thăm thì thôi thăm
export function hookVisit(game) {
  const go = game.travel;
  game.travel = (id, spawn, fly, opts = {}) => { if (!opts.visit) game.visiting = null; return go(id, spawn, fly, opts); };
}

export async function visitFriend(game, k, ten) {
  const r = await (await net()).visitHouse(k);
  const H = game.data.home, sp = Object.keys(game.data.maps[H.map].spawns || {})[0] || 'vao';
  game.visiting = { k, ten: r?.ten || ten, decor: r?.decor || {} };
  await game.travel(H.map, sp, true, { text: `Tới nhà ${game.visiting.ten}`, kind: 'portal', visit: true });
  game.toast(`Nhà của ${game.visiting.ten}`, 2.4);
}

export async function goHome(game) {
  const H = game.data.home, sp = Object.keys(game.data.maps[H.map].spawns || {})[0] || 'vao';
  game.visiting = null;
  await game.travel(H.map, sp, true, { text: 'Về động phủ', kind: 'portal' });
}
