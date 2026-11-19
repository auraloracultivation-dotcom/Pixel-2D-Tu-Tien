// Ngự Thú Sư đổi thú cưỡi lấy Thú Lệnh (chủ dự án 16/11/2026) và bán khôi lỗi (chủ dự án 02/11/2026 14:39; giá ở data/pets.json → shop). Bán lại: thú cưỡi ở
// src/game/home-pets.js (sellMount), khôi lỗi ở đây (sellPuppet), bấm ngay trong thẻ ở Túi đồ → Thú cưỡi / Khôi lỗi.
import { coins, addCoins } from './shop.js';
import { mountLine } from './beast.js';
import { hasMount } from './inst.js';

const S = game => game.data.pets.shop;
const vn = n => n.toLocaleString('vi-VN');
export const isPuppet = (game, id) => !!S(game)?.puppets?.[id];
export const puppetName = (game, id) => `Khôi lỗi ${game.data.npcs[id]?.name || id}`;
export const puppetPrice = (game, id) => {   // đúng resell_max × giá mua (chủ dự án 05/11/2026)
  const c = S(game), buy = c.puppets[id], v = Math.round(buy * c.puppet_sell + ((game.save.comps?.[id]?.lv || 1) - 1) * c.puppet_per_lv);
  return c.resell_max != null ? Math.floor(buy * c.resell_max) : v;
};

// Đổi thú cưỡi bằng Thú Lệnh (chủ dự án 16/11/2026 21:57: thú cưỡi nhận bằng nhiệm vụ ngày). Thú Lệnh máy chủ giữ (p2d_ht_diem.thu_lenh),
// máy chủ trừ và ghi thú vào bản lưu (hàm p2d_doi_thu_cuoi); máy khách chỉ ghi theo kết quả trả về.
export async function buyMount(game, id) {
  const s = game.save, m = game.data.pets.mounts[id], L = game.data.pets.thu_lenh;
  if (!m) return 'Không có con này.';
  if (!game.cloud) return 'Đăng nhập tài khoản để đổi thú cưỡi.';
  try {
    const M = await import('../net/he-thong.js');   // máy chủ sửa bản lưu, trả phien_ban: chạy qua game.cloud.run cho khỏi lệch phiên bản
    let key = id;   // đã có loại này: máy chủ đặt khoá bản thêm 'thú#xxxx' (chủ dự án 19/11/2026 13:02, src/game/inst.js)
    await game.cloud.run(() => M.htDoiThu(id), r => { key = r?.key || id; s.mounts[key] = true; if (!s.mount || !hasMount(s, s.mount)) { s.mount = id; s.mountKey = key; } game.thuLenh = r?.thu_lenh ?? game.thuLenh; });
    mountLine(game, key); game.persist(); game.sfx('levelup');
    return `Đổi được ${m.name}! Bấm nút Cưỡi để lên thú.`;
  } catch (e) {
    const c = String(e?.message || e);
    return c.includes('thieu') ? `Chưa đủ ${L.per_mount} ${L.name}.` : c.includes('da_co') ? `Đã có ${m.name}.` : 'Chưa đổi được, thử lại sau.';
  }
}

export function buyPuppet(game, id) {
  const s = game.save, price = S(game).puppets[id];
  if (price == null) return 'Không bán khôi lỗi này.';
  if (s.comps?.[id]) return `Đã có ${puppetName(game, id)}.`;
  if (coins(s) < price) return `Thiếu Linh Thạch (cần ${vn(price)}).`;
  addCoins(game, -price, 'mua-thu'); (s.comps ??= {})[id] = { lv: 1, exp: 0 };
  game.persist(); game.sfx('levelup');
  return `Mua ${puppetName(game, id)}. Mang theo ở Túi đồ → Khôi lỗi.`;
}

export function sellPuppet(game, id) {
  const s = game.save;
  if (!s.comps?.[id] || !isPuppet(game, id)) return 'Không có khôi lỗi này.';
  if (s.companion === id || s.companion2 === id) return 'Đang mang theo, cất đi rồi mới bán.';
  const price = puppetPrice(game, id);
  delete s.comps[id];
  addCoins(game, price, 'ban-thu'); game.persist(); game.sfx('pickup');
  return `Đã bán ${puppetName(game, id)}, nhận ${vn(price)} Linh Thạch.`;
}

// Hộp thoại ở Ngự Thú Sư (sau lần đầu tặng linh thú): đổi thú cưỡi. Khôi lỗi bán ở quầy Khôi Lỗi Sư bên cạnh (chủ dự án 18/11/2026
// 06:08: hai quầy riêng, data/pets.json → puppet_npc); bản đồ chưa có Khôi Lỗi Sư thì Ngự Thú Sư bán cả khôi lỗi như cũ.
export async function talkBeastShop(game, npc, only) {
  const name = npc.def.name, s = game.save, sep = !only && game.npcs?.some(n => n.id === game.data.pets.puppet_npc);
  const opts = [
    { id: 'mount', label: `Đổi thú cưỡi (${game.data.pets.thu_lenh.per_mount} ${game.data.pets.thu_lenh.name})`, desc: 'Tăng tốc chạy và 1 dòng chỉ số; cưỡi thì thú công kích' },
    { id: 'puppet', label: 'Mua khôi lỗi', desc: 'Đi theo đánh cùng, mang tối đa 2 con' },
    { id: 'talk', label: 'Trò chuyện', desc: '' },
  ].filter(o => o.id === 'talk' || (only ? o.id === only : !(sep && o.id === 'puppet')));
  const pick = await game.dialog.choose(`${name}: Muốn mua gì?`, opts);
  if (pick === 'talk') { await game.dialog.say([[name, npc.def.lines[Math.floor(Math.random() * npc.def.lines.length)]]]); return; }
  if (pick === 'mount') {   // số Thú Lệnh hỏi máy chủ (chơi không mạng thì không đổi được)
    try { const M = await import('../net/he-thong.js'); game.thuLenh = (await M.htStatus())?.thu_lenh ?? 0; } catch { game.thuLenh = null; }
  }
  const L = game.data.pets.thu_lenh;
  const list = pick === 'mount'
    ? Object.entries(game.data.pets.mounts).map(([id, m]) => ({ id, label: m.name, spr: 'mount.' + id, price: `${L.per_mount} ${L.name}`, tag: hasMount(s, id) ? 'Đã có' : '', desc: `Tốc chạy +${Math.round(m.speed * 100)}%`, color: m.color }))
    : pick === 'puppet' ? Object.entries(S(game).puppets).map(([id, p]) => ({ id, label: game.data.npcs[id]?.name || id, spr: game.data.art.sprites['comp.' + id] ? 'comp.' + id : 'npc.' + id, price: vn(p), cur: 'ui.ic-linh-thach', tag: s.comps?.[id] ? 'Đã có' : '', dim: !!s.comps?.[id], desc: game.data.companions.list[id]?.desc || '', color: game.data.companions.list[id]?.color })) : null;   // lưới có hình, giá dưới ô (chủ dự án 19/11/2026 10:24)
  if (!list) return;
  list.push({ id: 'thoi', label: 'Thôi', desc: pick === 'mount' ? (game.thuLenh == null ? 'Cần mạng để đổi thú' : `Đang có ${game.thuLenh} ${L.name}`) : `Đang có ${vn(coins(s))} Linh Thạch` });
  const id = await game.dialog.choose(`${name}: Chọn đi.`, list);
  if (id === 'thoi' || !id) return;
  game.toast(pick === 'mount' ? await buyMount(game, id) : buyPuppet(game, id), 2.6);
}

// Quầy Khôi Lỗi Sư: chỉ bán khôi lỗi
export const talkPuppetShop = (game, npc) => talkBeastShop(game, npc, 'puppet');
