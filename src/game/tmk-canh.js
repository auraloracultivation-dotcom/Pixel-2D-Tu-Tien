// Dàn cảnh cho một trang Trấn Ma Kỷ (src/game/tran-ma-ky.js phatTrang; data/tran-ma-ky.json → canh có mục { dan: … }). Chủ dự án (docs/10-CAI-HON.md):
// "cốt truyện bằng chữ mà không có ảnh hay hiệu ứng hoặc âm thanh thì chả bao giờ động vào trái tim mọi người". Nên giữa các câu thoại, trang truyện được
// phép: tối màn, rung, chớp, phát một tiếng, thả một hiệu ứng quanh nhân vật, và LẶNG một nhịp (hộp thoại tắt, thế giới đứng yên, chỉ hiệu ứng chạy).
//   dan: { toi: 0…1 độ tối của màn (giữ tới khi đổi, hết cảnh tự về như cũ) · rung: độ rung · chop: 1 chớp sáng · tieng: 'tên' hoặc ['tên', độ to]
//          (data/sounds.json) · fx: tên hiệu ứng bên dưới · mau: màu hiệu ứng · cho: lặng bấy nhiêu giây }
// Hiệu ứng (vẽ điểm ảnh vuông, vị trí tính thẳng từ thời gian nên khung nào cũng ra đúng hình đó):
//   dom   đốm sáng quanh người bay lên rồi dạt về một phía và tan (hồn về cội, người được tiễn)
//   tia   những sợi sáng mảnh từ khắp màn bay thẳng lên trời (vạn kiếm về chỗ, nghìn sợi sáng vá Thiên Mạch)
//   khoi  khói ma khí tím đen cuộn quanh rồi tan (ma tộc, bóng Ma Tôn)
//   la    vài chiếc lá rơi lắc lư xuống vai (Cây mẹ)
//   vong  vòng sáng nở dưới chân (đá linh căn, đột phá)
// Chỉ là hình và tiếng ở máy đang đọc truyện, không đổi luật chơi. Lặng một nhịp dùng game.hitstop: quái đứng yên nên người đang đọc không bị đánh lén.
import { addFx } from './combat.js';

const TAU = Math.PI * 2;
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const px = (ctx, x, y, s) => ctx.fillRect(Math.round(x), Math.round(y), s, s);

const VE = {
  dom(ctx, f) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 28; i++) {
      const life = f.life * 0.5, a = f.t - rnd(f.seed + i) * f.life * 0.5;
      if (a < 0 || a > life) continue;
      const q = a / life, an = rnd(f.seed + i * 3.1) * TAU, d = 6 + 26 * rnd(f.seed + i * 5.7);
      const x = f.x + Math.cos(an) * d + 46 * q * q + Math.sin(a * 3 + i) * 2.5, y = f.y - 6 + Math.sin(an) * d * 0.45 - 78 * q;
      ctx.globalAlpha = Math.min(1, q * 6) * (1 - q) ** 0.7;
      ctx.fillStyle = f.color; px(ctx, x - 1, y - 1, 3); ctx.fillStyle = '#ffffff'; px(ctx, x, y, 1);
    }
    ctx.restore();
  },
  tia(ctx, f) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 44; i++) {
      const life = f.life * 0.42, a = f.t - rnd(f.seed + i) * f.life * 0.58;
      if (a < 0 || a > life) continue;
      const q = a / life, x = f.x + (rnd(f.seed + i * 2.3) - 0.5) * 300 * (1 - 0.75 * q), y = f.y + 90 - (rnd(f.seed + i * 7.9) * 60) - 330 * q * q, len = 5 + Math.round(16 * q);
      ctx.globalAlpha = Math.min(1, q * 5) * (1 - q);
      ctx.fillStyle = f.color; ctx.fillRect(Math.round(x), Math.round(y), 1, len); ctx.fillStyle = '#ffffff'; px(ctx, x, y, 1);
    }
    ctx.restore();
  },
  khoi(ctx, f) {
    ctx.save();
    for (let i = 0; i < 34; i++) {
      const life = f.life * 0.6, a = f.t - rnd(f.seed + i) * f.life * 0.4;
      if (a < 0 || a > life) continue;
      const q = a / life, an = rnd(f.seed + i * 3.3) * TAU + a * (i % 2 ? 1.1 : -1.1), d = 58 - 34 * q + 8 * Math.sin(a * 2 + i);
      ctx.globalAlpha = Math.min(1, q * 4) * (1 - q) * 0.8;
      ctx.fillStyle = i % 3 ? f.color : '#120818'; px(ctx, f.x + Math.cos(an) * d - 2, f.y - 8 + Math.sin(an) * d * 0.55 - 10 * q - 2, i % 4 ? 4 : 6);
    }
    ctx.restore();
  },
  la(ctx, f) {
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const life = f.life * 0.7, a = f.t - rnd(f.seed + i) * f.life * 0.3;
      if (a < 0 || a > life) continue;
      const q = a / life, x = f.x + (rnd(f.seed + i * 4.1) - 0.5) * 50 + Math.sin(a * 2.4 + i * 2) * 9, y = f.y - 70 + 62 * q + (i ? rnd(f.seed + i * 9.3) * 18 : 0);
      ctx.globalAlpha = Math.min(1, q * 6) * Math.min(1, (1 - q) * 5);
      const w = Math.sin(a * 2.4 + i * 2) > 0;   // lá lật mặt theo nhịp lắc
      ctx.fillStyle = f.color; ctx.fillRect(Math.round(x), Math.round(y), w ? 4 : 3, 2); ctx.fillStyle = '#e6ffd8'; px(ctx, x + (w ? 1 : 0), y, 1);
    }
    ctx.restore();
  },
};
const DOI = { dom: { life: 3.2, color: '#ffe9a8' }, tia: { life: 3.6, color: '#bfe4ff' }, khoi: { life: 2.8, color: '#4a2470' }, la: { life: 3.4, color: '#7fe08a' } };
export const CANH_FX = [...Object.keys(VE), 'vong'];

export async function dan(game, d) {
  const p = game.player;
  if (d.toi != null) game.darkTarget = d.toi;
  if (d.rung) game.screen?.shake?.(d.rung, 0.6);
  if (d.chop) game.flashT = Math.max(game.flashT || 0, 0.35);
  if (d.tieng) game.sfx?.(...[].concat(d.tieng));
  if (d.fx && p) {
    if (d.fx === 'vong') addFx(game, { type: 'ring', x: p.x, y: p.y, r: 44, color: d.mau || '#bff4ff', life: 0.9, fill: true });
    else if (VE[d.fx]) { const o = DOI[d.fx]; addFx(game, { type: 'tmk-' + d.fx, x: p.x, y: p.y, life: o.life, color: d.mau || o.color, seed: Math.random() * 1000, draw: VE[d.fx] }); game.fpsHi = Math.max(game.fpsHi || 0, performance.now() + o.life * 1000); }
  }
  if (d.cho > 0) { game.hitstop = Math.max(game.hitstop || 0, d.cho); await new Promise(r => setTimeout(r, d.cho * 1000)); }
}
// Hết cảnh: màn sáng lại như bản đồ đang đứng
export function hetCanh(game) { game.darkTarget = game.map?.def?.dark || 0; }
