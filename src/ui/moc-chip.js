// Thẻ nhỏ khi linh khí qua mốc 10% của tầng (src/game/moc-tang.js): "Linh khí 30%" + hình quà và số lượng, trượt xuống ở trên giữa
// màn rồi mờ đi sau 2,6 giây; không chặn chạm. Kiểu ở he-thong.css (.moc-chip).
import { quaRow } from './qua-icons.js';

export function setupMocChip(game) {
  let node = null, timer = 0;
  game.mocTangShow = (p, qua) => {
    const T = game.data['he-thong']?.moc?.tang || {};
    if (!node) { node = document.createElement('div'); node.className = 'moc-chip'; document.body.append(node); }
    node.textContent = '';
    const b = document.createElement('b'); b.textContent = String(T.say || 'Linh khí {p}%').replace('{p}', p);
    node.append(b, quaRow(game, qua, 22));
    node.classList.remove('on'); void node.offsetWidth; node.classList.add('on');
    game.sfx?.('coin');
    clearTimeout(timer); timer = setTimeout(() => node.classList.remove('on'), 2600);
  };
}
