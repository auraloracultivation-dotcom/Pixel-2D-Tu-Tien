// Dàn cảnh cho một nhiệm vụ chính (data/story.json: lệnh { canh: … } trong "do" của một bước; src/game/story.js). Chủ dự án (docs/10-CAI-HON.md):
// "cốt truyện bằng chữ mà không có ảnh hay hiệu ứng hoặc âm thanh thì chả bao giờ động vào trái tim mọi người". Nên giữa các câu thoại, nhiệm vụ được phép:
// tối màn, rung, chớp, phát một tiếng, thả một hiệu ứng, và LẶNG một nhịp (hộp thoại tắt, thế giới đứng yên, chỉ hiệu ứng chạy)
//   canh: { toi: 0…1 độ tối của màn (giữ tới khi đổi; hết bước tự về như bản đồ) · rung: độ rung · chop: 1 chớp sáng · tieng: 'tên' hoặc ['tên', độ to]
//           (data/sounds.json) · fx: tên hiệu ứng bên dưới · mau: màu hiệu ứng · tai: [ô x, ô y] chỗ đặt hiệu ứng (bỏ trống: quanh nhân vật) · cho: lặng bấy nhiêu giây }
// Hiệu ứng (vẽ điểm ảnh vuông, vị trí tính thẳng từ thời gian nên khung nào cũng ra đúng hình đó):
//   dom   đốm sáng quanh người bay lên rồi dạt về một phía và tan (hồn về cội, người được tiễn)
//   tia   những sợi sáng mảnh từ khắp màn bay thẳng lên trời (vạn kiếm về chỗ, nghìn sợi sáng vá Thiên Mạch)
//   khoi  khói ma khí tím đen cuộn quanh rồi tan (ma tộc, bóng Ma Tôn)
//   la    vài chiếc lá rơi lắc lư xuống vai (Cây mẹ)
//   vong  vòng sáng nở dưới chân (đá linh căn, đột phá)
//   chuong ba vòng sóng lan xa dần từ một chỗ (gióng chuông, đánh trống)
// Chỉ là hình và tiếng ở máy đang làm nhiệm vụ, không đổi luật chơi. Lặng một nhịp dùng game.hitstop: quái đứng yên nên người đang đọc không bị đánh lén.
import { addFx } from './combat.js';

const TAU = Math.PI * 2;
const rnd = i => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const px = (ctx, x, y, s) => ctx.fillRect(Math.round(x), Math.round(y), s, s);

// Một đốm: quầng mờ vuông quanh lõi màu, tâm trắng (cộng sáng nên nổi trên nền đêm)
function dom1(ctx, x, y, a, color, s = 3) {
  ctx.globalAlpha = a * 0.22; ctx.fillStyle = color; px(ctx, x - s, y - s, s * 2 + 1);
  ctx.globalAlpha = a; px(ctx, x - (s >> 1), y - (s >> 1), s); ctx.fillStyle = '#ffffff'; px(ctx, x, y, 1);
}
const VE = {
  dom(ctx, f) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const k = f.t / f.life, cot = Math.max(0, 1 - Math.abs(k - 0.25) / 0.25);   // cột sáng mảnh dâng lên rồi tan trong nửa đầu
    if (cot > 0) for (let i = 0; i < 6; i++) { ctx.globalAlpha = cot * (0.2 - i * 0.03); ctx.fillStyle = f.color; ctx.fillRect(Math.round(f.x) - 2 - i, Math.round(f.y) - 120, 5 + i * 2, 124); }
    for (let i = 0; i < 46; i++) {
      const life = f.life * 0.5, a = f.t - rnd(f.seed + i) * f.life * 0.5;
      if (a < 0 || a > life) continue;
      const q = a / life, an = rnd(f.seed + i * 3.1) * TAU, d = 5 + 30 * rnd(f.seed + i * 5.7);
      const x = f.x + Math.cos(an) * d * (1 - 0.4 * q) + 52 * q * q + Math.sin(a * 3 + i) * 3, y = f.y - 6 + Math.sin(an) * d * 0.45 - 112 * q;
      dom1(ctx, x, y, Math.min(1, q * 6) * (1 - q) ** 0.6, f.color, i % 5 ? 3 : 5);
    }
    ctx.restore();
  },
  tia(ctx, f) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const life = f.life * 0.4, a = f.t - rnd(f.seed + i) * f.life * 0.6;
      if (a < 0 || a > life) continue;
      const q = a / life, x = Math.round(f.x + (rnd(f.seed + i * 2.3) - 0.5) * 380 * (1 - 0.8 * q * q)), y = Math.round(f.y + 150 - rnd(f.seed + i * 7.9) * 110 - 460 * q * q), len = 8 + Math.round(34 * q), al = Math.min(1, q * 5) * (1 - q) ** 0.5;
      ctx.globalAlpha = al * 0.25; ctx.fillStyle = f.color; ctx.fillRect(x - 1, y, 4, len);
      ctx.globalAlpha = al; ctx.fillRect(x, y, 2, len); ctx.fillStyle = '#ffffff'; ctx.fillRect(x, y, 2, 3);
    }
    ctx.restore();
  },
  khoi(ctx, f) {
    ctx.save();
    const k = f.t / f.life, vong = Math.sin(Math.min(1, k * 1.25) * Math.PI), X = Math.round(f.x), Y = Math.round(f.y) + 4;   // vũng tối và quầng tím dưới chân phập phồng
    ctx.globalAlpha = 0.4 * vong; ctx.fillStyle = '#12071c'; ctx.beginPath(); ctx.ellipse(X, Y, 44 - 10 * k, 16 - 4 * k, 0, 0, TAU); ctx.fill();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55 * vong; ctx.strokeStyle = '#a060ff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(X, Y, 48 - 14 * k, 18 - 5 * k, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 84; i++) {
      const life = f.life * 0.5, a = f.t - rnd(f.seed + i) * f.life * 0.5;
      if (a < 0 || a > life) continue;
      const q = a / life, an = rnd(f.seed + i * 3.3) * TAU + a * (i % 2 ? 1.4 : -1.4), d = 66 - 48 * q + 8 * Math.sin(a * 2 + i);
      const x = f.x + Math.cos(an) * d, y = f.y - 10 + Math.sin(an) * d * 0.55 - 22 * q, al = Math.min(1, q * 4) * (1 - q) ** 0.7, s = i % 4 ? 5 : 8;
      if (i % 3) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * 0.85; ctx.fillStyle = i % 2 ? '#7a2fd0' : f.color; px(ctx, x - s / 2, y - s / 2, s); }
      else { ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al * 0.9; ctx.fillStyle = '#12071c'; px(ctx, x - s / 2 - 1, y - s / 2 - 1, s + 2); }
    }
    ctx.restore();
  },
  la(ctx, f) {
    ctx.save();
    for (let i = 0; i < 14; i++) {
      const life = f.life * 0.62, a = f.t - rnd(f.seed + i) * f.life * 0.38;
      if (a < 0 || a > life) continue;
      const q = a / life, lac = Math.sin(a * 2.2 + i * 2), x = Math.round(f.x + (rnd(f.seed + i * 4.1) - 0.5) * 110 + lac * 14), y = Math.round(f.y - 130 + (126 + rnd(f.seed + i * 9.3) * 14) * q);
      const al = Math.min(1, q * 6) * Math.min(1, (1 - q) * 4), w = lac > 0 ? 8 : 4;   // lá lật mặt theo nhịp lắc: lúc thấy mặt rộng, lúc thấy cạnh
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = al * 0.07; ctx.fillStyle = f.color; ctx.fillRect(x - 2, y - 2, w + 4, 8);   // quầng sáng mờ cho lá nổi trên nền cỏ đêm
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = al;   // phiến lá ba hàng điểm ảnh lệch nhau (hình thoi dẹt), gân sáng ở giữa, cuống sẫm
      ctx.fillStyle = '#2f7a44'; ctx.fillRect(x + 2, y, w - 3, 1); ctx.fillRect(x, y + 2, w - 3, 2); ctx.fillRect(x + w - 1, y - 1, 1, 1);
      ctx.fillStyle = f.color; ctx.fillRect(x + 1, y, w - 2, 2); ctx.fillRect(x, y + 1, w - 2, 2); ctx.fillStyle = '#f0ffe0'; ctx.fillRect(x + 1, y + 1, Math.max(1, w - 4), 1);
    }
    ctx.restore();
  },
};
const DOI = { dom: { life: 3.4, color: '#ffe9a8' }, tia: { life: 3.8, color: '#bfe4ff' }, khoi: { life: 3.2, color: '#c05af0' }, la: { life: 4.2, color: '#8cf09a' } };
export const CANH_FX = [...Object.keys(VE), 'vong', 'chuong'];

export async function dan(game, d) {
  const p0 = game.player, c = d.tai && game.map?.center(d.tai[0], d.tai[1]), p = c ? { x: c.x, y: c.y } : p0;   // tai: hiệu ứng đặt tại một ô của bản đồ (quả chuông, bàn lễ…)
  if (d.toi != null) game.darkTarget = d.toi;
  if (d.rung) game.screen?.shake?.(d.rung, 0.6);
  if (d.chop) game.flashT = Math.max(game.flashT || 0, 0.35);
  if (d.tieng) game.sfx?.(...[].concat(d.tieng));
  if (d.fx && p) {
    if (d.fx === 'vong') for (const [r, life] of [[44, 0.9], [70, 1.3]]) addFx(game, { type: 'ring', x: p.x, y: p.y, r, color: d.mau || '#bff4ff', life, fill: r < 50 });   // hai vòng: vòng trong đặc nở nhanh, vòng ngoài mảnh lan chậm
    else if (d.fx === 'chuong') [[36, 1.0, 0], [72, 1.5, 180], [118, 2.1, 420]].forEach(([r, life, ms]) => setTimeout(() => addFx(game, { type: 'ring', x: p.x, y: p.y, r, color: d.mau || '#ffd98a', life }), ms));   // tiếng chuông, tiếng trống: ba vòng sóng lan xa dần
    else if (VE[d.fx]) { const o = DOI[d.fx]; addFx(game, { type: 'canh-' + d.fx, x: p.x, y: p.y, life: o.life, color: d.mau || o.color, seed: Math.random() * 1000, draw: VE[d.fx] }); game.fpsHi = Math.max(game.fpsHi || 0, performance.now() + o.life * 1000); }
  }
  if (d.cho > 0) { game.hitstop = Math.max(game.hitstop || 0, d.cho); await new Promise(r => setTimeout(r, d.cho * 1000)); }
}
// Hết cảnh: màn sáng lại như bản đồ đang đứng
export function hetCanh(game) { game.darkTarget = game.map?.def?.dark || 0; }
