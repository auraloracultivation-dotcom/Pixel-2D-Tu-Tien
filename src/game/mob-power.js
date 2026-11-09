// Lực chiến của quái và độ khó theo đảo (chủ dự án 09/11/2026 10:07: "mỗi loại quái đều có lực chiến như gamer, để mọi người biết
// đang đánh quái level nào; quái 40k lực chiến với người 40k thì xêm xêm, không có chuyện onehit; tôi 16k đi Ngoại Vực farm mà
// chả sao"). Số ở data/config.json → mob_cp.
// - Lực chiến quái tính đúng công thức người chơi (data/status.json → power): máu × 1 + công × 9 (quái không có phòng, chí mạng).
// - Mỗi đảo một mức lực chiến cho quái thường (maps): quái mọc từ bãi nhân máu, công theo hệ số s = mức đảo / lực chiến gốc trung
//   bình của các loài quái thường trên đảo, nên loài nào vốn trâu hơn vẫn trâu hơn, trùm của đảo cũng mạnh theo cùng hệ số.
//   Vòng ngoài tinh cầu (mul trong planets.json), vùng ma khí nhân tiếp sau đó.
// - Giãn đội hình (space): quái cận chiến đứng cách người chơi thêm reach_add đơn vị để vồ, không chồng lên nhau (đẩy nhau ra khi
//   gần hơn sep × tổng bán kính) cho người chơi còn nhìn thấy mình.

export function mobPower(game, m) {
  const W = game.data.status.power;
  return Math.round((m.maxHp ?? m.def.hp) * (W.maxHp || 1) + (m.def.atk || 0) * (W.atk || 9));
}

const base = (game, id) => { const d = game.data.mobs[id]; return d ? d.hp * (game.data.status.power.maxHp || 1) + d.atk * (game.data.status.power.atk || 9) : 0; };

// Hệ số của đảo đang đứng (nhớ theo bản đồ)
function zoneMul(game) {
  const C = game.data.config.mob_cp, id = game.map?.id, T = C?.maps?.[id];
  if (!C?.on || !T) return 1;
  game.mobCpCache ??= {};
  if (game.mobCpCache[id] == null) {
    const ids = [...new Set((game.map.def.spawners || []).filter(s => !s.mul || s.mul === 1).map(s => s.mob))]
      .filter(x => { const d = game.data.mobs[x]; return d && d.ai !== 'boss' && d.ai !== 'dummy'; });
    const avg = ids.length ? ids.reduce((a, x) => a + base(game, x), 0) / ids.length : 0;
    game.mobCpCache[id] = avg > 0 ? Math.max(1, T / avg) : 1;
  }
  return game.mobCpCache[id];
}

// Gọi khi quái mọc từ bãi (game.js updateSpawners), trước nhân vòng ngoài / ma khí
export function zonePower(game, m) {
  const s = zoneMul(game);
  if (s === 1 || m.remote || m.duel || m.def.ai === 'dummy') return;
  m.def = { ...m.def, hp: Math.round(m.def.hp * s), atk: Math.round(m.def.atk * s * 10) / 10 };
  m.hp = m.maxHp = m.def.hp;
}

// Quái cận chiến: tầm vồ dài thêm; mọi quái đang đuổi đẩy nhau ra cho khỏi chồng một đống
export const reachOf = (game, m) => m.def.reach + (game.data.config.mob_cp?.space?.reach_add || 0);

export function spreadMobs(game, dt) {
  const S = game.data.config.mob_cp?.space;
  if (!S?.sep) return;
  const ms = game.mobs.filter(m => !m.dead && !m.remote && m.aggro && m.def.ai !== 'boss' && !m.wboss && !m.dummy);
  for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
    const a = ms[i], b = ms[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01, want = (a.r + b.r) * S.sep;
    if (d >= want) continue;
    const push = Math.min(want - d, S.push * dt) / 2, ux = dx / d, uy = dy / d;
    game.map.move(a, -ux * push, -uy * push); game.map.move(b, ux * push, uy * push);
  }
}

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
