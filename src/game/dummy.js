// Mộc Nhân trong động phủ (data/home.json → dummy, chủ dự án 04/11/2026, góp ý #114): hình nộm gỗ đứng yên, không chết,
// không đánh. Đánh trúng lần đầu thì bắt đầu đếm; đánh liền test_s giây là xong một lượt, sát thương/giây = tổng ÷ test_s.
// Ngừng đánh idle_s giây thì dừng đếm. Kết quả cao nhất giữ ở save.dpsBest, gửi lên bảng xếp hạng Sát thương/giây.
import { spawnMob } from './mobs.js';

const C = game => game.data.home.dummy;

// Gọi lúc dựng bản đồ (home.js → spawnHome): động phủ nào cũng có một Mộc Nhân, kể cả khi thăm nhà bạn
export function spawnDummy(game) {
  const D = C(game);
  if (!D || game.map.id !== game.data.home.map || !game.data.mobs[D.mob]) return;
  const c = game.map.center(D.at[0], D.at[1]);
  spawnMob(game, D.mob, c.x, c.y, { dummy: { on: false, t0: 0, last: 0, sum: 0, show: null, showT: 0 }, aggro: false });
}

// combat.js → hitMob: mỗi đòn trúng Mộc Nhân (máu đã được trả lại đầy ở đó)
export function dummyHit(game, m, dmg) {
  const s = m.dummy, D = C(game), now = game.time;
  if (!s.on) { s.on = true; s.t0 = now; s.sum = 0; s.show = null; }
  if (now - s.t0 >= D.test_s) return;   // đòn rơi đúng lúc vừa đủ giờ: lượt mới bắt đầu ở đòn sau
  s.sum += dmg; s.last = now;
}

// mobs.js → updateMobs: đứng yên; hết giờ thì chốt kết quả, ngừng đánh lâu thì dừng
export function tickDummy(game, m) {
  const s = m.dummy, D = C(game), now = game.time;
  m.kx = m.ky = 0; m.x = m.hx; m.y = m.hy; m.hp = m.maxHp; m.state = 'idle';
  if (!s.on) return;
  if (now - s.t0 >= D.test_s) {
    s.on = false; m.aggro = false;
    finish(game, m, Math.round(s.sum / D.test_s));
  } else if (now - s.last >= D.idle_s) {
    s.on = false; m.aggro = false;
    s.show = 'stop'; s.showT = now;
  }
}

function finish(game, m, dps) {
  const s = m.dummy, D = C(game), sv = game.save, best = dps > (sv.dpsBest || 0);
  s.show = 'done'; s.showT = game.time; s.result = dps;
  if (best) sv.dpsBest = dps;
  game.toast((best ? D.toast_best : D.toast).replace('{dps}', fmt(dps)).replace('{best}', fmt(sv.dpsBest || 0)), 2.6);
  game.persist();
  if (game.online && (sv.dpsBest || 0) > (sv.dpsSent || 0)) send(game, sv.dpsBest);
}

// Gửi kết quả cao nhất chưa gửi (máy chủ kiểm tra: 55 giây một lần, không vượt mức so với lực chiến)
async function send(game, dps) {
  const D = C(game);
  try {
    const { submitDps } = await import('../net/rank.js');
    await submitDps(dps);
    game.save.dpsSent = Math.max(game.save.dpsSent || 0, dps);
    game.persist();
    (await import('./rank.js')).dropRank('dps');
    game.toast(D.sent, 2);
  } catch (e) {
    game.toast(D.err[e?.message] || D.err.net, 2.4);
  }
}

const fmt = n => Number(n || 0).toLocaleString('vi-VN');

// Chữ trên đầu Mộc Nhân (render/draw-dummy.js): đang đếm, vừa dừng, kết quả, hoặc nghỉ
export function dummyLabel(game, m) {
  const s = m.dummy, D = C(game), now = game.time;
  if (s.on) {
    const el = Math.max(1, now - s.t0);
    return { text: D.run.replace('{dps}', fmt(Math.round(s.sum / el))).replace('{s}', Math.max(0, Math.ceil(D.test_s - (now - s.t0)))), color: '#ffe27a' };
  }
  if (s.show && now - s.showT < D.show_s) {
    if (s.show === 'done') return { text: D.done.replace('{dps}', fmt(s.result)), color: '#7cf0a0' };
    return { text: D.stop.replace('{idle}', D.idle_s), color: '#ff9a7a' };
  }
  const b = game.save.dpsBest;
  return { text: b ? D.best.replace('{best}', fmt(b)) : D.idle, color: '#e6ebf7' };
}
