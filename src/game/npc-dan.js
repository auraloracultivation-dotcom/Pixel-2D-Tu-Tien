// Ba NPC chợ Thiên Kiếm Tinh (chủ dự án 20/11/2026 14:5x: "mấy NPC cũ bán trùng đồ thì thay bằng 3 NPC mới chuyên lò đan và nguyên liệu"):
//   Lò Đan Sư (data/cave.json → lo.npc): bán 4 kiểu lò luyện đan, đều phẩm Phàm, mua xong vào Túi đồ → Luyện đan → Lò đan (máy chủ p2d_mua_lo).
//   Đan Dược Sư (data/shop.json → dan_npc): bán đan (dan_ban) và luyện đan đặc biệt (tẩy linh căn, đổi giới tính; trước ở lò Động phủ).
//   Dược Thảo Thương (nl_npc): bán nguyên liệu luyện đan (nl_ban, máy chủ p2d_nl_mua cùng giá data/market.json → quick.price).
//   Luyện Khí Sư (lks_npc, 16:1x): bán đồ nâng cấp trang bị (lks_ban: Tẩy Luyện Thạch, Mảnh Pháp Bảo, ngọc, Đạo Vận Thạch 1/ngày; Bí Kíp Chiêu thôi bán 21/11/2026 vì là đồ của hệ chiêu cũ).
// Đặt bằng tools/the-gioi/tk_moi.py; lưới ô có hình + tên, giá dưới ô như mọi quầy (src/ui/dialog.js). Gọi từ src/game/interact.js.
import { coins, talkShop } from './shop.js';
import { loOf, muaLo } from './lo-dan.js';
import { specialPills } from './special-pills.js';

const vn = n => Math.round(n).toLocaleString('vi-VN');

// npc là một trong ba NPC này: mở quầy, trả true; không phải thì trả false
export function talkAlchemyNpc(game, npc) {
  const d = game.data, S = d.shop;
  if (npc.id === d.cave.lo.npc) { talkLoShop(game, npc); return true; }
  if (npc.id === S.dan_npc) {
    const extra = specialPills(game).map((p, i) => ({ id: 'dd' + i, label: p.name, desc: p.lock || p.desc, color: p.color, run: async () => { if (p.lock) game.toast(p.lock, 2); else p.run(); } }));
    talkShop(game, npc, { items: S.dan_ban, msg: 'Đan ta luyện mỗi viên đều đủ hoả hầu. Đạo hữu cần gì?', topup: false, extra });
    return true;
  }
  if (npc.id === S.nl_npc) { talkShop(game, npc, { items: S.nl_ban, msg: 'Nguyên liệu luyện đan đủ cả, hàng hiếm thì giá cao.', topup: false }); return true; }
  if (npc.id === S.lks_npc) { talkShop(game, npc, { items: S.lks_ban, msg: 'Đồ nâng cấp trang bị đủ cả. Đạo Vận Thạch mỗi ngày chỉ một viên.', topup: false }); return true; }   // Luyện Khí Sư (16:1x)
  return false;
}

async function talkLoShop(game, npc) {
  const d = game.data, C = d.cave.lo, T = C.text, s = game.save, sp = d.art.sprites;
  for (;;) {
    const o = loOf(s), list = C.kieu.map((k, i) => {
      const n = o.ds.filter(x => x.k === i).length;
      return { id: String(i), label: T.ten_lo.replace('{name}', C.kieu_ten[i]), spr: sp['lo.' + k] ? 'lo.' + k : undefined, price: vn(C.gia_mua), cur: 'ui.ic-linh-thach',
        tag: n ? `Có ${n}` : '', desc: '', dim: coins(s) < C.gia_mua, color: '#e8b04a' };
    });
    list.push({ id: 'talk', label: 'Trò chuyện', desc: '' }, { id: 'thoi', label: 'Thôi', desc: `Đang có ${vn(coins(s))} Linh Thạch · ${o.ds.length}/${C.max_lo} lò` });
    const pick = await game.dialog.choose(`${npc.def.name}: Lò mới đều là phẩm Phàm, muốn phẩm cao thì về tự nâng.`, list);
    if (!pick || pick === 'thoi') return;
    if (pick === 'talk') { await game.dialog.say([[npc.def.name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]); return; }
    const k = +pick, name = C.kieu_ten[k];
    if (coins(s) < C.gia_mua) { game.toast(T.ngheo, 2); continue; }
    const ok = await game.dialog.choose(T.mua_hoi.replace('{name}', name).replace('{lt}', vn(C.gia_mua)), [{ id: 'ok', label: 'Mua', desc: '', color: '#f2c94c' }, { id: 'thoi', label: 'Thôi', desc: '' }]);
    if (ok !== 'ok') continue;
    const r = await muaLo(game, k);
    if (r.err) { game.toast(r.err === 'poor' ? T.ngheo : r.err === 'full' ? T.mua_day.replace('{n}', C.max_lo) : T.net, 2.2); continue; }
    game.sfx('pickup');
    game.toast(T.mua_ok.replace('{name}', name), 2.6);
  }
}
