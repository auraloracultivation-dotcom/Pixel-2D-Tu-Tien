// Lực chiến của quái và độ khó theo đảo (chủ dự án 09/11/2026 10:07: "mỗi loại quái đều có lực chiến như gamer, để mọi người biết
// đang đánh quái level nào; quái 40k lực chiến với người 40k thì xêm xêm, không có chuyện onehit; tôi 16k đi Ngoại Vực farm mà
// chả sao"). Số ở data/config.json → mob_cp.
// - Lực chiến quái tính đúng công thức người chơi (data/status.json → power): máu × 1 + công × 9 (quái không có phòng, chí mạng).
// - Mỗi đảo một mức lực chiến cho quái thường (maps): quái mọc từ bãi nhân máu, công theo hệ số s = mức đảo / lực chiến gốc trung
//   bình của các loài quái thường trên đảo, nên loài nào vốn trâu hơn vẫn trâu hơn, trùm của đảo cũng mạnh theo cùng hệ số.
//   Vòng ngoài tinh cầu (mul trong planets.json), vùng ma khí nhân tiếp sau đó.
// - Luật chiến đấu mới (data/he-chien.json on, 16/11/2026): quái đã theo cảnh giới × vai trò nên hệ số đảo tắt (mob_cp.on), lực chiến
//   quái tính bằng powerOf như người chơi.
// - Giãn đội hình (space): quái cận chiến đứng cách người chơi thêm reach_add đơn vị để vồ, không chồng lên nhau (đẩy nhau ra khi
//   gần hơn sep × tổng bán kính) cho người chơi còn nhìn thấy mình.
import { powerOf, powerRef } from './he-chien.js';
import { heSoQuai, levelOf } from './kh-bai.js';

// Chỉ số của con quái theo dạng he-chien.js (máu, công mỗi giây, thủ, số đòn mỗi giây); máu, công đã nhân hệ số bí cảnh, ma khí, dị chủng
function hcOf(m) {
  const h = m.def.hc, k = m.def.atk / (h.hit || m.def.atk || 1);
  return { hp: m.maxHp ?? m.def.hp, atk: h.atk * k, def: h.def, spd: h.hit / Math.max(0.1, h.atk) / Math.max(0.5, (m.def.windup || 0) + (m.def.cd || 1)) };
}

// Lực chiến hiện trên đầu quái: cùng công thức với người chơi (he-chien.js powerOf: tính thẳng từ chỉ số, không so với ai), nên con quái nào
// cũng một số cho mọi người xem (trước 20/11/2026 mỗi người thấy một số khác nhau theo cảnh giới của mình)
export function mobPower(game, m) {
  const W = game.data.status.power;
  if (m.def.hc) return powerOf(game.data['he-chien'], hcOf(m));
  return Math.round((m.maxHp ?? m.def.hp) * (W.maxHp || 1) + (m.def.atk || 0) * (W.atk || 9));
}
// Mức lực chiến đặt sẵn của Khai Hoang (boss_cp, mức quái tinh cầu) vẫn đo bằng cách tính cũ, theo cảnh giới người đang đứng trên tinh cầu
// (he-chien.js powerRef), để trùm Khai Tinh và quái tinh cầu giữ đúng máu, công như trước khi đổi cách hiện lực chiến
const cpRef = (game, m) => (m.def.hc ? powerRef(game.data['he-chien'], hcOf(m), game.save?.realm || 0) : mobPower(game, m));

// Lực chiến gốc (đo kiểu cũ) của một loài khi đứng ở cảnh giới realm. Thuần: tools/quai-chung.mjs tính sẵn cho máy chủ phòng (bảng quái
// chung tinh cầu tông môn, kh-bai.js khBangQuai), nên hai bên ra cùng máu
export function gocMob(data, id, realm) {
  const d = data.mobs[id];
  if (!d) return 0;
  return d.hc ? powerRef(data['he-chien'], hcOf({ def: d, maxHp: d.hp }), realm) : d.hp * (data.status.power.maxHp || 1) + d.atk * (data.status.power.atk || 9);
}

// Cảnh giới để đo mức quái của bản đồ: tinh cầu tông môn có quái chung (quai_chung.kh) đo ở cảnh giới của cấp tinh cầu, ai nhìn cũng một
// mức máu, công (chủ dự án 22/11/2026 00:1x "Máu theo cấp tinh cầu"); trận Khai Tinh và nơi khác theo cảnh giới người đang đứng như cũ
export function realmDo(game, def) {
  const kh = def?.kh, C = game.data.config.quai_chung;
  if (kh && !kh.fight && C?.on && C.kh) return levelOf(game.data['khai-hoang'], kh.cap).realm;
  return game.save?.realm || 0;
}

// Hệ số của đảo đang đứng (nhớ theo bản đồ)
function zoneMul(game) {
  const C = game.data.config.mob_cp, id = game.map?.id, T = C?.maps?.[id];
  if (!C?.on || !T || (C.kh_only && !game.map.def?.kh)) return 1;   // luật mới (he-chien.js): quái đảo thường đã theo cảnh giới, chỉ tinh cầu Khai Hoang còn kéo theo mức lực chiến của cấp
  game.mobCpCache ??= {};
  if (game.mobCpCache[id] == null) {
    const D = game.data, realm = realmDo(game, game.map.def);
    game.mobCpCache[id] = heSoQuai(game.map.def.spawners, x => { const d = D.mobs[x]; return !!d && d.ai !== 'boss' && d.ai !== 'dummy'; }, x => gocMob(D, x, realm), T);
  }
  return game.mobCpCache[id];
}

// Gọi khi quái mọc từ bãi (game.js updateSpawners), trước nhân vòng ngoài / ma khí
// sp.cp (bãi có lực chiến định sẵn, như trùm trận Khai Tinh src/game/kh-gen.js): kéo thẳng về số đó
export function zonePower(game, m, sp) {
  if (sp?.cp && !m.remote) {   // kéo về mức đặt sẵn, đo bằng cách tính cũ (cpRef) để trùm giữ đúng máu, công đang chạy
    const k = sp.cp / Math.max(1, cpRef(game, m));
    m.def = { ...m.def, hp: Math.round(m.def.hp * k), atk: Math.round(m.def.atk * k * 10) / 10 }; m.hp = m.maxHp = m.def.hp; return;
  }
  const s = zoneMul(game);
  if (s === 1 || m.remote || m.duel || m.def.ai === 'dummy') return;
  m.def = { ...m.def, hp: Math.round(m.def.hp * s), atk: Math.round(m.def.atk * s * 10) / 10 };
  m.hp = m.maxHp = m.def.hp;
}

// Quái cận chiến: tầm vồ dài thêm (đẩy nhau ra cho khỏi chồng: src/game/crowd.js)
export const reachOf = (game, m) => m.def.reach + (game.data.config.mob_cp?.space?.reach_add || 0);

// Chỉ chủ động đánh khi người chơi bước vào tầm đánh của nó (chủ dự án 09/11/2026 10:42: "quái trên bản đồ chỉ trong phạm vi công kích
// mới chủ động công kích"): cận chiến = bán kính + tầm vồ + pad; đánh xa = tầm bắn. Bị đánh thì đánh trả (combat.js đặt aggro). Người
// chơi chạy xa quá leash đơn vị và đã leash_sec giây không đánh nó thì nó thôi đuổi, về chỗ cũ. Trùm, đấu sĩ giữ tầm cũ (def.aggro).
export function aggroCheck(game, m, p, d) {
  const A = game.data.config.mob_cp?.aggro;
  if (!A?.on || m.def.ai === 'boss' || m.def.ai === 'duel' || m.tower || m.room || game.dungeon) return m.aggro || (m.def.aggro && d < m.def.aggro);
  if (!m.def.aggro) return m.aggro;   // quái hiền (passive) chỉ đánh trả
  const reach = m.def.ai === 'ranged' ? (m.def.range || m.def.aggro) : m.r + (p?.r || 4) + reachOf(game, m) + (A.pad || 0);
  if (!m.aggro) return d < reach;
  return !(d > A.leash && game.time - (m.hurtT ?? -1e9) > A.leash_sec);
}
