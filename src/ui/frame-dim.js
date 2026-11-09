// Khung chơi (chủ dự án 09/11/2026 17:38): dải trên (thanh máu, bản đồ nhỏ, nút) và dải dưới (nút đánh, chiêu, chat) tối đi một
// chút cho phần giữa nổi lên; nút quay video cũng chỉ quay phần giữa này (src/core/recorder.js cắt theo cùng số).
// Lớp tối là một div đặt ngay sau khung vẽ: nằm trên bản đồ, dưới mọi nút (HTML vẽ sau). Không lên clip vì clip chép từ khung vẽ.
// Số ở data/config.json → frame (top, bottom: phần màn hình, dim: độ tối, fade: dải chuyển mờ).
export function createFrameDim(game) {
  const F = game.data.config.frame, cv = document.getElementById('game'), hud = document.getElementById('hud');
  if (!F?.on || !cv) return;
  const d = document.createElement('div');
  d.id = 'khung-toi';
  const a = `rgba(10,6,20,${F.dim})`, t = F.top * 100, b = F.bottom * 100, f = F.fade * 100;
  d.style.cssText = `position:fixed;inset:0;pointer-events:none;transition:opacity .4s;background:linear-gradient(to bottom,${a} 0%,${a} ${t - f}%,transparent ${t}%,transparent ${b}%,${a} ${b + f}%,${a} 100%)`;
  cv.after(d);
  const sync = () => { d.style.opacity = hud && !hud.hidden && !document.body.classList.contains('ngam-canh') && !document.body.classList.contains('trip') ? '1' : '0'; };
  sync(); setInterval(sync, 500);
}
