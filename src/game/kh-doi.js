// Tổ đội Khai Tinh (chủ dự án 19/11/2026 16:28, chọn 20/11/2026 00:4x): đồng môn lập tổ đội trong bảng Tông môn (không cần mã: mã đội suy
// ra từ mã tông môn), tối đa party.max (4) người, dùng đường tổ đội bí cảnh có sẵn (src/game/party.js, party-sync.js).
// Chỉ tông chủ mở trận (máy chủ p2d_kh_mo kiểm); tông chủ vào trận thì báo cả đội { t:'start', kh: vé }, máy đồng môn dựng cùng bản đồ trận
// (kh-gen.js từ hạt giống trong vé) rồi bay vào. Trùm GIỮ NGUYÊN máu (không mạnh theo số người); máy đội trưởng tổ đội sinh và điều khiển
// trùm (đội trưởng của lượt = tông chủ, party.js hostId), máy khác không tự sinh quái (game.js updateSpawners). Hạ trùm: ai cũng nhận thưởng như hạ trùm thường; máy tông chủ báo thắng
// (khai-hoang.js khKill cho cả trùm do đội trưởng hạ).
import { openParty, leaveParty, isHost } from './party.js';
import { resetSync } from './party-sync.js';
import { khEnter } from './khai-hoang.js';
import { guildState } from './guild.js';

const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
// Mã đội của tông môn: 'K' + 4 ký tự băm từ mã tông môn (cùng tông môn ra cùng mã)
export function khTeamCode(game) {
  const id = guildState(game).mine?.bang?.id;
  if (id == null) return null;
  let h = 2166136261;
  for (const ch of String(id)) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
  let s = 'K';
  for (let i = 0; i < 4; i++) { s += A[h % A.length]; h = Math.floor(h / A.length); }
  return s;
}

export const inKhTeam = game => !!game.party && game.party.code === khTeamCode(game);

export async function khTeamJoin(game) {
  const code = khTeamCode(game);
  if (!code || !game.online) return false;
  if (game.party && game.party.code !== code) await leaveParty(game);
  if (!game.party) await openParty(game, code);
  return true;
}
export const khTeamLeave = game => (inKhTeam(game) ? leaveParty(game) : null);

// Vé gửi cho đội: chỉ phần dựng bản đồ (không có quyền gì: thắng / thua máy chủ chỉ nhận từ tông chủ)
const vePublic = t => ({ ve: t.ve, cap: t.cap, ten: t.ten, mat_dat: t.mat_dat, hat: t.hat });

// Mình vừa vào bản đồ trận (khai-hoang.js khEnter): đang trong tổ đội Khai Tinh thì đánh dấu lượt chạy chung, và nếu mình mở trận
// (tông chủ) thì báo cả đội vào theo
export function khTeamAfterEnter(game, t, mapId) {
  const p = game.party;
  if (!p || !inKhTeam(game)) return;
  p.run = { map: mapId, mode: 0, n: p.roster.length, kh: true, host: t.cua_toi ? p.me : p.khFrom || p.roster[0]?.id }; game.dunMode = 0; resetSync(game);   // tông chủ làm đội trưởng lượt này: máy tông chủ sinh trùm
  if (t.cua_toi) p.net?.send({ t: 'start', kh: vePublic(t) });
}

// Tin từ đồng đội: vào trận (party-sync.js onPartyMsg)
export async function khTeamStart(game, kh, from) {
  if (!inKhTeam(game) || !kh || typeof kh !== 'object') return;
  game.party.khFrom = from;
  const ve = String(kh.ve || ''), cap = Math.floor(+kh.cap), hat = Math.floor(+kh.hat);
  if (!ve || !Number.isFinite(cap) || !Number.isFinite(hat) || !game.data['khai-hoang']?.grounds?.[kh.mat_dat]) return;
  if (game.map?.id === 'kt-' + ve.slice(0, 8)) return;
  game.toast(game.data['khai-hoang'].text.team_go || '', 2.4);
  await khEnter(game, { ve, cap, hat, ten: String(kh.ten || '').slice(0, 40), mat_dat: kh.mat_dat, cua_toi: false });
}

export const khTeamHost = game => inKhTeam(game) && isHost(game);
