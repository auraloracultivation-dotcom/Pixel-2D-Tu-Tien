// Bang người chơi (data/guild.json). Máy chủ giữ thành viên, chức vụ, tiến độ việc tuần; máy này đếm việc
// (giết quái, luyện đan, câu cá, thu hoạch) rồi gửi gộp mỗi phút, nhận thưởng thì cộng vào bản lưu.
import { coins, addCoins } from './shop.js';
import { grant } from './daily.js';

const G = game => game.data.guild;
const net = () => import('../net/guild.js');

export const canGuild = game => !!(game.online && game.cloud && game.save);

export function guildErr(game, e) {
  const msg = String(e?.message || ''), E = G(game).err;
  return E[Object.keys(E).find(k => msg.includes(k))] || E.other;
}

// Gọi từ dailyEvent: đếm việc cho bang khi đang ở trong bang
export function guildTick(game, type, n = 1) {
  if (!game.guild) return;
  const t = G(game).tasks.find(x => x.type === type);
  if (!t) return;
  const p = (game.guildPend ??= {});
  p[t.id] = (p[t.id] || 0) + n;
}

export async function loadGuild(game) {
  if (!canGuild(game)) { game.guild = null; return null; }
  const { myGuild } = await net();
  game.guild = await myGuild();
  game.guildLoaded = true;
  return game.guild;
}

export async function flushGuild(game) {
  const p = game.guildPend;
  if (!game.guild || !p) return;
  const { contribute } = await net();
  for (const [id, n] of Object.entries(p)) {
    const k = Math.floor(n);
    if (k < 1) continue;
    p[id] -= k;
    try { await contribute(id, k); } catch { p[id] += k; return; }
  }
}

export async function create(game, name) {
  const g = G(game), s = game.save;
  if (s.realm < g.realm || coins(s) < g.cost) throw new Error('chua_du');
  game.persist(); await game.cloud.flush();
  const { createGuild } = await net();
  await createGuild(name);
  addCoins(game, -g.cost); game.persist();
  return loadGuild(game);
}

export async function act(game, fn) {
  await fn(await net());
  return loadGuild(game);
}

export async function claim(game, taskId) {
  const t = G(game).tasks.find(x => x.id === taskId);
  await flushGuild(game);
  const { claimTask } = await net();
  await claimTask(taskId);
  const got = grant(game, t.give);
  await loadGuild(game);
  return got;
}

// Tải bang khi vừa vào game (đã đăng nhập), gửi tiến độ đều đặn
export function startGuild(game) {
  setInterval(async () => {
    if (!canGuild(game)) return;
    try { if (!game.guildLoaded) await loadGuild(game); else await flushGuild(game); } catch { /* mạng lỗi: lần sau */ }
  }, G(game).flush * 1000);
  setTimeout(() => { if (canGuild(game)) loadGuild(game).catch(() => {}); }, 5000);
}
