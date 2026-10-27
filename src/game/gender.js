// Nam hay nữ (data/gender.json): chọn khi tạo nhân vật, bản lưu cũ hỏi một lần. Quyết định hình mặc định,
// cách NPC gọi người chơi (chữ {dạng nam|dạng nữ} trong data) và ai kết đạo lữ được (affinity.dao_lu.can theo giới tính).
const RE = /\{([^{}|]*)\|([^{}|]*)\}/g;
let slots = null;   // [đối tượng, khoá, chữ gốc] của mọi chuỗi có {nam|nữ}, gom một lần lúc chưa thay

function collect(o, out) {
  for (const k of Object.keys(o)) {
    const v = o[k];
    if (typeof v === 'string') { if (v.includes('|') && RE.test(v)) out.push([o, k, v]); RE.lastIndex = 0; }
    else if (v && typeof v === 'object') collect(v, out);
  }
  return out;
}

export const genderOf = game => game.save?.gioi || game.data.gender.default;
export const isFemale = game => genderOf(game) === 'nu';

// Thay chữ trong data theo giới tính người chơi đang chơi (gọi lại được khi đổi tài khoản)
export function applyWords(game) {
  if (!slots) { const { art, ...rest } = game.data; slots = collect(rest, []); }
  const f = isFemale(game);
  for (const [o, k, s] of slots) o[k] = s.replace(RE, (_, a, b) => (f ? b : a));
}

// Ai kết đạo lữ được với người chơi này
export function daoLuCan(game) {
  const can = game.data.affinity.dao_lu.can;
  return Array.isArray(can) ? can : can[genderOf(game)] || [];
}

// Chưa chọn thì hỏi (tạo nhân vật mới, hoặc bản lưu từ trước khi có lựa chọn này)
export async function askGender(game) {
  const s = game.save, G = game.data.gender;
  if (s.gioi) return;
  const id = await game.dialog.choose(G.ask, Object.entries(G.list).map(([k, g]) => ({ id: k, label: g.label, desc: g.desc, color: g.color })));
  const g = G.list[id] || G.list[G.default];
  s.gioi = G.list[id] ? id : G.default;
  if (g.look && game.data.heroes.list[g.look]) s.look = g.look;
  applyWords(game);
  game.refreshStats();
  game.persist();
  game.toast(G.toast.replace('{label}', g.label), 2);
}
