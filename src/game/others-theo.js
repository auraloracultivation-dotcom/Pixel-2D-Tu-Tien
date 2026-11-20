// Linh thú, khôi lỗi của người chơi khác (chủ dự án 20/11/2026 11:09: "còn thú cưỡi và linh thú, khôi lỗi nữa"): người đó báo mã qua
// hồ sơ phòng (others.js onlineLook → pet, comp, comp2), máy mình dựng một bản chỉ để nhìn đi theo sau họ như kẻ đi theo của mình
// (pets.js updateFollower) nhưng không đánh quái; họ vung đòn thì linh thú, khôi lỗi cùng chạy động tác đánh. Vẽ bằng drawPet / drawComp.

const SLOTS = [['pet', 'pet', 0], ['comp', 'comp', 10], ['comp2', 'comp', -10]];

function make(game, kind, id) {
  if (kind === 'pet') { const def = game.data.pets.pets[id]; return def && { kind, id, def, cd: null, hop: 0, face: 1 }; }
  const C = game.data.companions, def = C.list[id];
  return def && { kind, id, def, npc: game.data.npcs[id] || { color: '#bff4ff' }, px: C.px || 0, cd: 0, skillCd: 0, hop: 0, face: 1 };
}

// Mỗi khung cho từng người đang thấy: dựng / bỏ theo mã họ báo, đi theo sau lưng họ
export function stepTheo(game, o, dt) {
  o.theo ??= {};
  const P = game.data.pets, follow = P.follow || 14, side = P.side || 0;
  for (const [key, kind, dx] of SLOTS) {
    const id = o[key];
    let f = o.theo[key];
    if (!id) { delete o.theo[key]; continue; }
    if (!f || f.id !== id) { f = make(game, kind, id); if (!f) { delete o.theo[key]; continue; } f.x = o.x - dx; f.y = o.y + 4; o.theo[key] = f; }
    const fx = o.face?.x || 0, fy = o.face?.y || 0, lift = kind === 'comp' ? 8 : 0, sd = kind === 'pet' ? side : -side + dx * 0.4;
    const gx = o.x - fx * follow - fy * sd, gy = o.y - fy * follow + fx * sd + 2 - lift;
    const ex = gx - f.x, ey = gy - f.y, d = Math.hypot(ex, ey);
    if (d > 160) { f.x = gx; f.y = gy; }
    else if (d > 2) { const s = Math.min(d, (60 + d * 1.5) * dt); f.x += ex / d * s; f.y += ey / d * s; if (Math.abs(ex) > 1) f.face = Math.sign(ex); }
    f.moving = d > 3; f.hop += dt * 8; f.walkT = (f.walkT || 0) + dt;
    if (f.cd != null) f.cd -= dt;
    if (o.swingT > 0.16 && f.def.cd && !(f.cd > f.def.cd - 0.2)) { f.cd = f.def.cd; if (Math.abs(fx) > 0.1) f.face = Math.sign(fx); }   // chủ vung đòn: cùng ra đòn
  }
}

// Thêm vào danh sách vẽ (render/draw.js, xếp theo y cùng mọi thứ khác)
export function theoEnts(game) {
  const out = [];
  for (const o of game.others.visible()) for (const f of Object.values(o.theo || {})) if (f.x != null) out.push([f.kind, f]);
  return out;
}
