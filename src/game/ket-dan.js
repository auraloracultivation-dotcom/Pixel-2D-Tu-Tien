// Nghi lễ kết đan: độ kiếp Trúc Cơ → Kim Đan (chủ dự án 20/11/2026 01:35). Trình tự đúng lời chủ dự án:
//   tu    linh khí khắp vùng tụ lại quanh người (ngồi xếp bằng);
//   vong  thêm vài vòng linh khí dạng khói bay quanh người, khí vẫn tụ; màn rung nhẹ, mọi người cùng hành tinh cũng rung nhẹ;
//   hut   khí và các vòng bị hút hết vào đan điền, người bắt đầu bay lên không trung;
//   set   vài tia thiên lôi giáng thẳng vào người (không né được: mỗi tia trừ máu, hết máu là thất bại; uống đan được);
//   song  chịu được: sóng linh lực phát ra liên tục, nhanh, trong vài giây (quái quanh đó bị hất, khựng);
//   cot   cột sáng từ trời chiếu xuống;  ha: hạ xuống đất → lên cảnh giới, mở bảng chúc mừng (tribulation.js ascend).
// Mọi nhịp tính theo một đồng hồ st.t nên máy người xem diễn lại y hệt từ một tin bắt đầu: tin đi đường tin chiêu sẵn có
// (k: 'kd-bd' bắt đầu, fx = số tia / 10; 'kd-ok' chịu xong; 'kd-hong' thất bại), không thêm gì ở máy chủ phòng.
// Số ở data/config.json → ket_dan. Hình: src/render/draw-ket-dan.js.
import { addFx, hitPlayer } from './combat.js';
import { tribSkyTick, tribPal } from './trib-sky.js';
import { land } from './fly.js';

const cfgOf = game => game.data.config.ket_dan;
const smooth = x => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

// Mốc giờ các nhịp (giây từ lúc bắt đầu) cho n tia sét
export function kdTimes(K, n) {
  const t = K.t, a = t.tu, b = a + t.vong, c = b + t.hut, d = c + t.set_dau + (n - 1) * t.set_gap + t.set_cuoi, e = d + t.song, f = e + t.cot;
  return { a, b, c, d, e, f, g: f + t.ha, in: b + t.hut_in, bolt: i => c + t.set_dau + i * t.set_gap };
}

// Đang cao bao nhiêu so với mặt đất ở giây t
export function kdLiftAt(K, T, t) {
  const up = T.b + K.t.hut_bay;
  if (t < up) return 0;
  if (t < T.c) return K.lift * smooth((t - up) / (T.c - up));
  if (t < T.f) return K.lift + Math.sin((t - T.c) * 2.2) * 1.2 * Math.min(1, (T.f - t) / 0.6);
  return K.lift * (1 - smooth((t - T.f) / K.t.ha));
}

const make = (game, who, n, mine) => { const K = cfgOf(game); return { t: 0, n, who, mine, K, T: kdTimes(K, n), hit: 0, hitT: -9, parts: [], acc: 0, ok: false, wait: 0, seed: Math.random() * 1000 }; };

export function startKetDan(game, cfg, done) {
  const p = game.player, st = make(game, p, cfg.waves, true);
  st.done = done;
  p.kd = game.kd = st; p.kdLift = 0;
  p.meditating = false; p.riding = false; p.moving = false; p.kx = p.ky = 0;
  if (p.flying) land(game);
  game.strikes = [];
  game.darkTarget = Math.max(game.darkTarget || 0, st.K.dark);
  game.screen?.zoomTo?.(st.K.zoom.tu);   // máy quay tiến lại gần người đang kết đan
  game.online?.cast?.({ k: 'kd-bd', x: Math.round(p.x), y: Math.round(p.y), fx: st.n / 10, fy: 0 });
  game.sfxWarm?.(['kd-tu', 'kd-vong', 'kd-hut', 'kd-song', 'kd-cot']);   // dựng sẵn tiếng của nghi lễ ngay lúc bắt đầu, khỏi khựng giữa chừng
  game.sfx?.('roar', 0.5); game.sfx?.('kd-tu', 0.7);
}

// Trong nghi lễ người chơi không đi, không đánh, không tung chiêu; nút Đan vẫn dùng được (src/game/player.js gọi mỗi khung)
export function kdHold(game, inp) {
  for (const k of ['ride', 'fly', 'dash', 's0', 's1', 's2', 'art', 'act']) inp.consume(k);
  game.player.atkCd = Math.max(game.player.atkCd, 0.3);
}

function bolt(game, st, i) {
  const w = st.who, K = st.K, B = game.data.config.bolt || {}, y = w.y - (w.kdLift || 0) - K.dan_y - 2, pal = tribPal(game);
  addFx(game, { type: 'bolt', x: w.x, y, h: 240, seed: Math.floor(Math.random() * 1e6), life: (B.strike || 0.1) + (B.fade || 0.3), pal, w: 1.9 });   // giáng vào người đang lơ lửng: không để vết cháy trên đất
  addFx(game, { type: 'ring', x: w.x, y, r: 18, color: pal?.[1] || '#9ad8ff', life: 0.35, fill: true });
  addFx(game, { type: 'ring', x: w.x, y, r: 34, color: '#ffffff', life: 0.3 });
  st.hitT = st.t; w.flash = 0.14;
  game.sfx?.('thunder');
  game.screen?.shake?.(st.mine ? K.shake.set : K.shake.xem * 2, 0.25);
  if (!st.mine) return;
  const p = game.player;
  p.invT = 0;   // chỉ thiên lôi của nghi lễ trúng được; đòn của quái bị chặn suốt nghi lễ
  const lift = p.kdLift || 0; p.y -= lift;   // số máu, vết đau hiện ở thân người đang lơ lửng chứ không phải dưới đất
  hitPlayer(game, p.maxHp * K.hit_pct * (1 + i * K.hit_grow) * (1 - (game.save.flags.thanhTam || 0)), { x: p.x, y: p.y - 80, soft: true });
  p.y += lift;
  p.invT = 2;
}

function step(game, st, dt) {
  const K = st.K, T = st.T, w = st.who, S = K.shake, t0 = st.t;
  if (!st.mine && !st.ok && t0 + dt >= T.d) { st.wait += dt; dt = Math.max(0, T.d - 0.001 - t0); }   // máy người xem: chờ tin 'kd-ok' mới diễn phần thành công
  const t = (st.t += dt), at = x => t0 < x && t >= x;
  w.kdLift = kdLiftAt(K, T, t);
  const cx = w.x, cy = w.y - K.dan_y - w.kdLift, suck = t > T.b ? Math.min(1, (t - T.b) / K.t.hut_in) : 0;
  if (t < T.b + K.t.hut_in * 0.35) {   // hạt linh khí: dồn dập dần
    st.acc += K.rate * (0.35 + 0.65 * Math.min(1, t / T.b)) * dt;
    while (st.acc >= 1) {
      st.acc -= 1;
      const a = Math.random() * Math.PI * 2, d = K.from * (0.55 + Math.random() * 0.6);
      st.parts.push({ a, d, spin: (Math.random() < 0.82 ? 1 : -1) * (0.7 + Math.random() * 0.8), s: Math.random(), x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.78, life: 0 });
    }
  }
  const pull = K.pull * (1 + 9 * suck * suck);
  for (const q of st.parts) {   // xoáy vào đan điền
    q.life += dt; q.ox = q.x; q.oy = q.y;
    q.d *= Math.exp(-dt * pull); q.a += q.spin * dt * (1.5 + 46 / (q.d + 9));
    q.x = cx + Math.cos(q.a) * q.d; q.y = cy + Math.sin(q.a) * q.d * 0.78;
  }
  st.parts = t >= T.in ? [] : st.parts.filter(q => q.d > 4);
  if (t >= T.a && t < T.b) game.screen?.shake?.(st.mine ? S.vong * (0.4 + 0.6 * (t - T.a) / K.t.vong) : S.xem, 0.12);
  else if (t >= T.b && t < T.c) game.screen?.shake?.(st.mine ? S.hut : S.xem, 0.12);
  else if (t >= T.d && t < T.e) game.screen?.shake?.(st.mine ? S.song : S.xem, 0.12);
  else if (t >= T.e && t < T.f - 0.5) game.screen?.shake?.(st.mine ? S.cot : S.xem * 0.6, 0.12);
  for (const x of [2.7, 5.4]) if (at(x) && x < T.b - 1) game.sfx?.('kd-tu', 0.8 + 0.1 * x / 2.7);   // gió hút dâng dần suốt lúc tụ
  for (const r of K.rings) if (at(T.a + r[5] + 0.01)) game.sfx?.('kd-vong');
  if (at(T.b)) game.sfx?.('kd-hut');
  if (t >= T.d && t < T.e - 0.3 && Math.floor((t - T.d) / 0.3) !== Math.floor((t0 - T.d) / 0.3)) game.sfx?.('kd-song');
  if (at(T.in)) {   // hút xong: loé ở đan điền
    addFx(game, { type: 'ring', x: cx, y: cy, r: 22, color: K.pal_khi[1], life: 0.4, fill: true });
    game.sfx?.('buff'); if (st.mine) game.flashT = Math.max(game.flashT || 0, 0.12);
  }
  while (st.hit < st.n && t >= T.bolt(st.hit)) bolt(game, st, st.hit++);
  if (st.mine && at(T.d)) { st.ok = true; game.online?.cast?.({ k: 'kd-ok', x: Math.round(w.x), y: Math.round(w.y), fx: 0, fy: 0 }); }
  if (at(T.d)) {
    game.sfx?.('impact', 1); game.sfx?.('roar', 0.5);
    if (st.mine) { game.flashT = Math.max(game.flashT || 0, 0.3); pushMobs(game, K, w); game.screen?.zoomTo?.(K.zoom.song); }   // lùi máy quay cho thấy sóng lan xa
  }
  if (at(T.e)) { game.sfx?.('kd-cot'); if (st.mine) { game.flashT = Math.max(game.flashT || 0, 0.2); game.screen?.zoomTo?.(K.zoom.cot); } }
  if (t < T.g) return true;
  w.kd = null; w.kdLift = 0;   // chạm đất
  if (st.mine) game.screen?.zoomTo?.(1);
  addFx(game, { type: 'ring', x: w.x, y: w.y, r: 30, color: K.pal_dan[1], life: 0.5 });
  game.sfx?.('layer_up', 0.8);
  return false;
}

function pushMobs(game, K, w) {   // sóng linh lực đầu tiên: quái cả vùng khựng, gần thì bị hất ra (như lễ ăn mừng trib-cele.js)
  for (const m of game.mobs) {
    if (m.dead || m.remote || m.def?.ai === 'boss') continue;
    const d = Math.hypot(m.x - w.x, m.y - w.y) || 1, push = K.push * Math.max(0, 1 - d / K.push_r);
    m.stunT = Math.max(m.stunT || 0, K.stun);
    if (push > 0) { m.kx = (m.x - w.x) / d * push; m.ky = (m.y - w.y) / d * push; }
  }
}

// Mỗi khung (tribulation.js update): nghi lễ của mình và các nghi lễ đang xem của người cùng hành tinh
export function kdTick(game, dt) {
  const st = game.kd, p = game.player;
  if (st) {
    if (p.hp <= 0 || game.ghost) game.trib.fail();   // không chịu nổi thiên lôi
    else {
      if (st.t >= st.T.c && st.t < st.T.d) tribSkyTick(game, dt);   // mưa sét quanh vùng lúc thiên lôi giáng (chỉ hình)
      const done = !step(game, st, dt);
      p.invT = Math.max(p.invT, 0.4);
      if (done) { game.kd = null; st.done?.(); }
    }
  }
  if (game.kdSee?.length) game.kdSee = game.kdSee.filter(s => {
    const live = game.others.list.get(s.who.id) === s.who && s.wait < 2.5 && step(game, s, dt);
    if (!live) { s.who.kd = null; s.who.kdLift = 0; }
    return live;
  });
}

// Thất bại / huỷ giữa chừng (tribulation.js fail)
export function kdStop(game) {
  const st = game.kd, p = game.player;
  if (!st) return;
  game.kd = null; p.kd = null; p.kdLift = 0; game.screen?.zoomTo?.(1);
  game.online?.cast?.({ k: 'kd-hong', x: Math.round(p.x), y: Math.round(p.y), fx: 0, fy: 0 });
}

// Tin nghi lễ của người khác (others.js cast). Trả true nếu là tin kết đan (kể cả khi bỏ qua). Tin là dữ liệu lạ: số tia kẹp 1–10,
// mỗi người cách ít nhất 60 giây mới được diễn lại (kẻo gửi dồn làm rung màn người khác mãi)
export function kdSeen(game, o, raw) {
  const k = raw?.k;
  if (typeof k !== 'string' || !k.startsWith('kd-')) return false;
  if (!o || o.x === null || !cfgOf(game)) return true;
  const L = (game.kdSee ||= []), i = L.findIndex(s => s.who === o);
  if (k === 'kd-bd' && i < 0 && game.time - (o.kdAt ?? -999) > 60) {
    const n = Math.max(1, Math.min(10, Math.round((typeof raw.fx === 'number' ? raw.fx : 0.5) * 10) || 5));
    o.kdAt = game.time; o.kd = make(game, o, n, false); L.push(o.kd);
  } else if (k === 'kd-ok' && i >= 0) L[i].ok = true;
  else if (k === 'kd-hong' && i >= 0) { o.kd = null; o.kdLift = 0; L.splice(i, 1); }
  return true;
}
