// Bảng hỏi khi gục (chủ dự án 09/11/2026 16:19): "Hồi sinh tại đây" hay "Về động phủ", đếm ngược; không chọn thì về động phủ.
// Chỉ hiện khi src/game/ghost.js bật hỏi (game.ghost.ask). Không chặn vòng game (bong bóng linh hồn vẫn chờ phía sau).
import { ghostChoose } from '../game/ghost.js';

export function startDeathAsk(game) {
  const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = new URL('./death-ask.css', import.meta.url).href; document.head.append(css);
  let box = null, home = null;
  const close = () => { box?.remove(); box = null; };
  const choose = c => { ghostChoose(game, c); close(); };
  setInterval(() => {
    const g = game.ghost, A = game.data?.config?.ghost?.ask;
    if (!g?.ask || g.choice || !A) { close(); return; }
    if (!box) {
      box = document.createElement('div'); box.className = 'death-ask';
      const t = document.createElement('b'); t.textContent = A.title;
      const d = document.createElement('p'); d.textContent = A.desc;
      const row = document.createElement('div'); row.className = 'da-row';
      const here = document.createElement('button'); here.type = 'button'; here.textContent = A.here; here.onclick = () => choose('here');
      home = document.createElement('button'); home.type = 'button'; home.className = 'da-home'; home.onclick = () => choose('home');
      row.append(here, home); box.append(t, d, row); document.body.append(box);
    }
    home.textContent = A.home.replace('{n}', Math.max(0, Math.ceil(g.sec - g.t)));
  }, 200);
}
