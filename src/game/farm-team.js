// Tổ đội farm ngoài thế giới mở (chủ dự án chốt 04/11/2026; chữ, số ở data/doi-farm.json; luật ở máy chủ:
// migration 20261104090000_p2d_doi_farm.sql). Khác tổ đội bí cảnh (game/party.js, kênh Realtime, mã 5 chữ).
// Đã đăng nhập thì cứ poll_s giây gửi nhịp tổ đội kèm bản đồ đang đứng (cả bí cảnh, động phủ: đồng đội thấy mình màu xám) và
// nhận lại danh sách tổ đội trên tinh cầu này cùng tổ đội của mình; đổi bản đồ thì gửi ngay. Mất nhịp quá 60 giây (thoát game,
// tắt màn hình lâu) thì máy chủ tự cho rời đội. Thưởng Linh Thạch / linh khí hạ quái: game.farmTeamMul (gọi ở shop.js coinDrop
// và combat.js killMob), chỉ khi đang ở thế giới mở; hạn mức ngày của máy chủ vẫn giữ nguyên.
import { every } from '../core/ticker.js';   // trang ẩn thì bỏ lượt
import { teamOthers, teamMul, teamPct } from './farm-team-bonus.js';
import { cleanText } from './social.js';

const net = () => import('../net/farm-team.js');
export const FT = game => game.data['doi-farm'];
export const isOpenWorld = game => !!game.map?.def?.planet;   // tinh cầu ngoài trời (bí cảnh, động phủ, đài không có planet)
export const teamOn = game => !!(game.online && game.cloud);   // chơi không tài khoản thì không có tổ đội
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');

export function startFarmTeam(game, onChange) {
  const c = FT(game);
  const view = game.farmTeam = { st: null, at: 0, map: null };
  let busy = false, lastMap = null, next = 0;
  const others = () => teamOthers(c, view, game.map?.id, isOpenWorld(game), Date.now());
  game.farmTeamMul = () => teamMul(c, others());
  game.farmTeamPct = () => teamPct(c, others());

  async function beat() {
    if (busy || !teamOn(game) || !game.map) return;
    busy = true;
    const map = game.map.id;
    try { Object.assign(view, { st: await (await net()).teamBeat(map), at: Date.now(), map }); }
    catch { /* mất mạng: giữ dữ liệu cũ, cũ quá stale_s thì thôi cộng thưởng */ }
    busy = false; next = Date.now() + gap() * 1000;
    onChange?.();
  }
  // Nhịp nhanh poll_s chỉ khi cần: đang trong tổ đội (60 giây không nhịp là máy chủ cho rời đội, thưởng tổ đội cần số mới), hoặc đang chờ
  // duyệt đơn xin vào. Còn lại idle_s giây một lần cho danh sách tổ đội trên tinh cầu này (chạm vào khung tổ đội thì đọc lại ngay: fresh).
  // Trước 20/11/2026 ai đã đăng nhập cũng gọi máy chủ poll_s = 12 giây một lần: 4,4 lệnh gọi máy chủ dữ liệu mỗi phút mỗi người online, mà hàm
  // p2d_doi_nhip lại giữ một khoá chung của cả máy chủ (thiết kế máy chủ 1 000 người: 1 000 người là khoá bận 70%).
  const gap = () => (view.st?.toi || view.st?.ds?.some(d => d.xin) ? c.poll_s : c.idle_s || c.poll_s);
  every(() => {
    if (!teamOn(game)) { if (view.st) { view.st = null; onChange?.(); } return; }
    const id = game.map?.id;
    if (id !== lastMap) { lastMap = id; next = 0; }
    if (Date.now() >= next) beat();
  }, 1000);
  view.refresh = () => { next = 0; return beat(); };
  view.fresh = (s = 10) => { if (Date.now() - view.at > s * 1000) view.refresh(); };   // người chơi vừa chạm khung tổ đội: số cũ quá s giây thì đọc lại
  return view;
}

// Chạy một lệnh tổ đội rồi báo kết quả, đọc lại danh sách. name: tên hiện trong câu báo
async function run(game, fn, name) {
  const c = FT(game).text;
  try {
    const r = await fn(await net());
    const mode = c.mode_name[r?.che_do] || '';
    game.toast(fill(c.done[r?.kq] || '', { name, mode }), 2.2);
  } catch (e) { game.toast(c.err[e?.message] || c.err.net, 2.4); }
  await game.farmTeam?.refresh?.();
}

export async function createTeam(game) {
  const c = FT(game), T = c.text;
  const raw = await game.dialog.ask(T.name_ask, T.name_ph, c.name_max, T.ok, T.back);
  if (raw == null) return;
  const name = String(raw).replace(/\s+/g, ' ').trim();
  if (name.length < c.name_min || name.length > c.name_max) return game.toast(T.err.ten_dai, 2.4);
  if (cleanText(game, name) !== name) return game.toast(T.err.ten_bay, 2.4);   // có từ bậy (lọc như chat, data/social.json)
  return run(game, n => n.teamCreate(name, game.map.id), name);
}

export function joinTeam(game, d) {
  const c = FT(game);
  if (d.n >= c.max) return game.toast(fill(c.text.full, { name: d.ten }), 2);
  return run(game, n => n.teamJoin(d.id, game.map.id), d.ten);
}

export async function leaveTeam(game) {
  const T = FT(game).text, mine = game.farmTeam?.st?.toi;
  if (!mine) return;
  if ((await game.dialog.choose(fill(T.leave_ask, { name: mine.ten }), [{ id: 'no', label: T.back }, { id: 'yes', label: T.leave }])) !== 'yes') return;
  return run(game, n => n.teamLeave(), mine.ten);
}

export async function kickMember(game, m) {
  const T = FT(game).text;
  if ((await game.dialog.choose(fill(T.kick_ask, { name: m.ten }), [{ id: 'no', label: T.back }, { id: 'yes', label: T.kick }])) !== 'yes') return;
  return run(game, n => n.teamKick(m.k), m.ten);
}

export const decideJoin = (game, r, yes) => run(game, n => n.teamDecide(r.k, yes), r.ten);

export function toggleMode(game) {
  const mine = game.farmTeam?.st?.toi;
  if (mine?.truong) return run(game, n => n.teamMode(mine.che_do === 'mo' ? 'duyet' : 'mo'), mine.ten);
}
