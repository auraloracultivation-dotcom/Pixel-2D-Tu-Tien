// PvP (data/pvp.json; chủ dự án 06/11/2026, 19/11/2026 16:25: mọi tinh cầu, trừ vòng pháp trận Thiên Kiếm Tinh server.safe). Tắt bảo vệ thì
// mỗi lần vung đòn hoặc tung chiêu, máy này báo máy chủ phòng "đánh người tắt bảo vệ gần nhất trong tầm" (net/online-cf.js pvpHit);
// máy chủ phòng (cloud/src/pvp.js) tự kiểm tầm, nhịp, lực chiến, giữ máu PvP và báo lại cho cả phòng (ph: trúng, pd: gục).
// Mình gục: hồi sinh như thường, bảo vệ bật lại, rồi trả nợ (net/pvp.js → máy chủ p2d_pvp_tra trừ 10% Linh Thạch + 1 món trong túi
// không đang mặc, gửi người hạ) và sửa bản lưu trong máy y như máy chủ. Vào game cũng trả nợ cũ (ai thoát game để né).
import { addNumber, addFx } from './combat.js';
import { addCoins } from './shop.js';
import { itemName } from './items.js';
import { matInfo } from './cave.js';
import { canTrade } from './market.js';

const P = game => game.data.pvp;
const fill = (s, o) => String(s).replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const S = game => P(game).server;
export const pvpNgoai = game => !!(P(game) && game.map?.id === S(game).map);   // Ngoại Vực: rơi món, khiên chỉ bật lại khi chết
// Chỗ (x, y) trên bản đồ đang đứng có nằm trong vòng pháp trận an toàn không (máy chủ phòng kiểm lại, cloud/src/pvp.js inSafe)
export const pvpSafe = (game, x, y) => { const z = P(game)?.server.safe; return !!(z && game.map?.id === z.map && Math.hypot(x - z.x, y - z.y) <= z.r); };
export const pvpMap = game => !!P(game) && !game.trip;   // đánh nhau được ở mọi bản đồ có phòng mạng

export function createPvp(game) {
  game.pvp = { off: false, cd: 0, wasSwing: false, map: null, at: 0, ask: 0, safe: null };   // at: lúc tắt khiên / giao chiến cuối (ms)
  setTimeout(() => settle(game), 20000);   // nợ cũ (gục rồi thoát game)
}

// Tắt khiên (đã xác nhận ở src/ui/pvp-btn.js). Bật lại: Ngoại Vực chỉ khi chết hồi sinh; nơi khác tự bật sau reshield_s giây không giao chiến (updatePvp), máy chủ phòng giữ.
export function togglePvp(game, off = true) {
  const T = P(game).text;
  if (!off || game.pvp.off) return;
  if (!game.online?.pvpOff || !game.online.pvpOff(true)) game.toast(T.offline, 2);
}

// Đánh người tắt bảo vệ gần nhất trong tầm (máy chủ kiểm lại theo vị trí của nó)
export function pvpTryHit(game) {
  const s = game.pvp, p = game.player;
  if (!s?.off || s.cd > 0 || !p || !pvpMap(game) || !game.online?.pvpHit || pvpSafe(game, p.x, p.y)) return;
  const R = P(game).server.range * 0.95;
  let best = null, bd = R;
  for (const o of game.others.list.values()) {
    if (!o.pk || o.x === null || pvpSafe(game, o.x, o.y)) continue;
    const d = Math.hypot(o.x - p.x, o.y - p.y);
    if (d < bd) { bd = d; best = o; }
  }
  if (!best) return;
  s.cd = P(game).server.gap_s;
  game.online.pvpHit(best.id);
}

export function updatePvp(game, dt) {
  const s = game.pvp, p = game.player;
  if (!s || !p) return;
  if (s.map !== game.map?.id) s.map = game.map?.id;   // đổi bản đồ: máy chủ phòng báo lại khiên (pk) lúc vào phòng mới
  s.cd = Math.max(0, s.cd - dt);
  const sw = p.swingT > 0.15;
  if (sw && !s.wasSwing) pvpTryHit(game);
  s.wasSwing = sw;
  if (!s.off) { s.safe = null; return; }
  const T = P(game).text, safe = pvpSafe(game, p.x, p.y);
  if (s.safe !== null && safe !== s.safe) game.toast(safe ? T.safe : T.zone_pk, 2);   // bước vào / ra vòng pháp trận
  s.safe = safe;
  // ngoài Ngoại Vực: đủ reshield_s giây không giao chiến thì xin máy chủ bật lại khiên (máy chủ kiểm lại giờ), 30 giây hỏi một lần
  const now = Date.now();
  if (!pvpNgoai(game) && s.at && now - s.at >= S(game).reshield_s * 1000 && now - s.ask > 30000 && game.online?.pvpOff) { s.ask = now; game.online.pvpOff(false); }
}
// Giây còn lại tới lúc khiên tự bật (ước ở máy này; null: ở Ngoại Vực hoặc đang có khiên)
export const pvpLeft = game => (!game.pvp?.off || pvpNgoai(game)) ? null : Math.max(0, Math.ceil(((game.pvp.at || 0) + S(game).reshield_s * 1000 - Date.now()) / 1000));

// Tin PvP từ máy chủ phòng
export function onPvp(game, m) {
  const T = P(game)?.text, me = game.online?.me?.id, p = game.player;
  if (!T || !p) return;
  if (m.t === 'pe') { if (m.e === 'wait_on' && game.pvp.ask) { game.pvp.at = Date.now() - S(game).reshield_s * 1000 + m.s * 1000; return; } game.toast(fill(T[m.e] || T.offline, { s: m.s }), 2); return; }
  if (m.t === 'pk') { if (m.id === me) { const was = game.pvp.off; game.pvp.off = !!m.on; if (m.on && !was) game.pvp.at = Date.now(); if (was !== !!m.on) game.toast(m.on ? T.turned_off : T.turned_on, m.on ? 3.5 : 1.6); } return; }
  if ((m.t === 'ph' || m.t === 'pd') && (m.to === me || m.from === me)) game.pvp.at = Date.now();   // giao chiến: hẹn bật khiên tính lại
  const o = game.others.list.get(m.to);
  if (m.t === 'ph') {
    if (m.to === me) {
      p.hp = Math.min(p.hp, Math.max(1, Math.round(p.maxHp * m.r)));
      addNumber(game, p.x, p.y - 14, m.n, '#ff6a6a'); p.flash = 0.12; game.sfx('hurt');
      game.screen.shake(game.data.config.feel.shake, 0.12);
    } else if (o) { o.pvpR = m.r; o.pvpAt = game.time; addNumber(game, o.x, o.y - 16, m.n, m.from === me ? '#fff' : '#ff9a9a'); }
    return;
  }
  if (m.t === 'pd') {
    if (m.to === me) {
      game.pvp.off = false;
      game.toast(fill(T.killed, { name: m.by }), 3);
      p.hp = 0;   // game.js tự hồi sinh ở điểm hồi sinh
      if (m.loot) setTimeout(() => settle(game), 800);
    } else {
      if (o) { o.pk = 0; o.pvpR = 1; addFx(game, { type: 'puff', x: o.x, y: o.y, life: 0.5, r: 14, color: '#ff5a5a' }); }
      if (m.from === me) game.toast(fill(T.kill, { name: o?.def?.name || 'Đạo hữu' }), 2.5);
    }
  }
}

// Trả nợ PvP: máy chủ trừ trong bản lưu trên máy chủ, máy này sửa y như vậy
export async function settle(game) {
  if (!canTrade(game) || game.pvpSettling) return;
  game.pvpSettling = true;
  try {
    const { settlePvp } = await import('../net/pvp.js');
    const T = P(game).text, s = game.save, lines = [];
    await game.cloud.run(() => settlePvp(), r => {
      for (const x of r?.mat || []) {
        let item = '';
        if (x.lt > 0) addCoins(game, -x.lt, 'pvp');
        if (x.item_uid != null) {
          const it = s.bag.find(i => i.uid === x.item_uid);
          if (it) { item = itemName(game.data, it); s.bag = s.bag.filter(i => i.uid !== x.item_uid); for (const k of Object.keys(s.equip)) if (s.equip[k] === x.item_uid) delete s.equip[k]; }
        }
        if (x.mat_id) { s.mats[x.mat_id] = Math.max(0, (s.mats[x.mat_id] || 0) - x.n); item = `${matInfo(game.data, x.mat_id)?.name || x.mat_id} ×${x.n}`; }
        lines.push(fill(T.lost, { lt: x.lt || 0, item: item ? fill(T.lost_item, { name: item }) : '' }));
      }
      game.refreshStats(); game.persist();
    });
    if (lines.length) game.toast(lines.join(' · '), 4);
  } catch { /* mạng lỗi: lần sau (vào game lại) */ }
  finally { game.pvpSettling = false; }
}
