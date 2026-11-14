// Thanh Sinh lực lúc bị đánh (bản bị đánh mới: src/game/hurt-feel.js, docs/10-CAI-HON.md việc 3): rung ngang, khúc máu vừa mất hiện trắng rồi rút dần;
// máu thấp thì thanh sáng lên theo nhịp tim. Tính theo giờ game (không dùng hiệu ứng CSS chạy theo giờ thật), nên lúc game khựng hình hay tạm dừng thanh
// vẫn khớp với hình, và phòng đo bước từng khung quay lại được đúng. src/ui/hud.js gọi 15 lần mỗi giây (nhịp vẽ chữ của HUD); trong lúc thanh đang rung,
// khúc trắng đang rút hay tim đang đập thì file này tự vẽ thêm từng khung hình cho chuyển động đủ mượt, xong thì thôi.
let bar = null, fill = null, lagEl = null, lag = 0, seen = null, lastT = null, sW = '', sX = '', sF = '', raf = 0, G = null;

const loop = () => { raf = 0; if (G && paint(G)) raf = requestAnimationFrame(loop); };
export function hudHurt(game) { G = game; if (!raf && paint(game)) raf = requestAnimationFrame(loop); }

// Vẽ một lượt; trả true khi còn chuyển động cần vẽ tiếp ở khung sau
function paint(game) {
  if (!game.hurt2 || !game.player) return false;
  bar ||= document.querySelector('#hud .bar.hp'); fill ||= document.getElementById('hp-fill');
  if (!bar || !fill) return false;
  if (!lagEl) { lagEl = document.createElement('i'); lagEl.id = 'hp-lag'; fill.before(lagEl); }
  const h = game.data.juice.hurt2, p = game.player, k = Math.max(0, p.hp / p.maxHp), now = game.time, st = game.h2bar;
  const dt = lastT == null ? 0 : Math.max(0, Math.min(0.1, now - lastT)); lastT = now;
  if (st && st.t !== seen) { seen = st.t; lag = Math.max(lag, st.from); }   // vừa trúng đòn: khúc trắng kéo từ mức máu trước đòn
  if (lag > k) { if (!st || now - st.t > h.bar_hold) lag = Math.max(k, lag - h.bar_drain * dt); } else lag = k;
  const w = lag > k + 0.001 ? (lag * 100).toFixed(1) + '%' : '0';
  if (w !== sW) lagEl.style.width = sW = w;
  const a = st ? now - st.t : 9, x = a < h.bar_t ? Math.round(h.bar_shake * Math.cos(a * 2 * Math.PI * 22) * (1 - a / h.bar_t)) : 0, tr = x ? `translateX(${x}px)` : '';
  if (tr !== sX) bar.style.transform = sX = tr;
  const lw = game.h2low, f = lw?.on ? `brightness(${(1 + 0.7 * Math.max(0, 1 - (now - lw.beat) / 0.35)).toFixed(2)})` : '';
  if (f !== sF) bar.style.filter = sF = f;
  return !!(x || f || lag > k + 0.001 || a < h.bar_t);
}
