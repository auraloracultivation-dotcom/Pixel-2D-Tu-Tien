// Nghi lễ kết đan: độ kiếp Trúc Cơ → Kim Đan (chủ dự án 20/11/2026 01:35). Trình tự đúng lời chủ dự án:
//   tu    linh khí khắp vùng tụ lại quanh người (ngồi xếp bằng);
//   vong  thêm vài vòng linh khí dạng khói bay quanh người, khí vẫn tụ; màn rung nhẹ, mọi người cùng hành tinh cũng rung nhẹ;
//   hut   khí và các vòng bị hút hết vào đan điền, người bắt đầu bay lên không trung;
//   set   10–15 tia thiên lôi nhiều màu giáng thẳng vào người, càng về sau càng dồn (không né được: mỗi tia trừ máu, hết máu là thất bại;
//         uống đan được); mỗi tia trúng để lại dòng điện cuốn quanh thân một lúc; linh khí vẫn ùn ùn đổ vào người đang lơ lửng (gấp bốn);
//   lặng  sét xong: ngưng đọng khoảng 1 giây, không hiệu ứng gì (chủ dự án 20/11/2026 03:06; cũng lặng 1 giây sau tu2 và sau song);
//   tu2   chịu đủ: một đợt tụ khí cuối, dày gấp tám, tiếng hút vút lên như lúc hút vào đan điền, hút sạch vào người (chủ dự án 20/11/2026 02:38, 02:41);
//   song  rồi sóng linh lực phát ra liên tục, nhanh, trong vài giây (quái quanh đó bị hất, khựng);
//   cot   cột sáng từ trời chiếu xuống;  ha: hạ xuống đất → lên cảnh giới, mở bảng chúc mừng (tribulation.js ascend).
// Mọi nhịp tính theo một đồng hồ st.t nên máy người xem diễn lại y hệt từ một tin bắt đầu: tin đi đường tin chiêu sẵn có
// (k: 'kd-bd' bắt đầu, fx = số tia / 20; 'kd-ok' chịu xong; 'kd-hong' thất bại), không thêm gì ở máy chủ phòng.
// Số ở data/config.json → ket_dan. Hình: src/render/draw-ket-dan.js.
import { addFx, hitPlayer } from './combat.js';
import { tribBolt, tribSkyEnd } from './trib-sky.js';
import { land } from './fly.js';

const cfgOf = game => game.data.config.ket_dan;
const smooth = x => { const k = Math.max(0, Math.min(1, x)); return k * k * (3 - 2 * k); };

// Mốc giờ các nhịp (giây từ lúc bắt đầu) cho n tia sét
export function kdTimes(K, n) {
  const t = K.t, a = t.tu, b = a + t.vong, c = b + t.hut, bt = [];
  for (let i = 0, x = c + t.set_dau; i < n; i++) { bt.push(x); x += t.set_gap0 + (t.set_gap1 - t.set_gap0) * (n > 1 ? i / (n - 1) : 0); }   // tia sau dồn hơn tia trước
  const z = bt[n - 1], q = z + t.set_cuoi, x = q + t.lang1, y = x + t.tu2, d = y + t.lang2, w = d + t.song, e = w + t.lang3, f = e + t.cot;
  // z: tia cuối giáng; q → x: lặng; x → y: đợt tụ khí cuối; y → d: lặng; d → w: phóng sóng; w → e: lặng; e: cột sáng
  return { a, b, c, z, q, x, y, d, w, e, f, g: f + t.ha, in: b + t.hut_in, bolt: i => bt[i] };
}

// Đang cao bao nhiêu so với mặt đất ở giây t
export function kdLiftAt(K, T, t) {
  const up = T.b + K.t.hut_bay;
  if (t < up) return 0;
  if (t < T.c) return K.lift * smooth((t - up) / (T.c - up));
  if (t < T.f) return K.lift + Math.sin((t - T.c) * 2.2) * 1.2 * Math.min(1, (T.f - t) / 0.6);
  return K.lift * (1 - smooth((t - T.f) / K.t.ha));
}

const make = (game, who, n, mine) => { const K = cfgOf(game); return { t: 0, n, who, mine, K, T: kdTimes(K, n), hit: 0, lead: 0, hitT: -9, hitPal: null, bolts: [], sparks: [], parts: [], acc: 0, sky: 0, ok: false, wait: 0, seed: Math.random() * 1000 }; };

export function startKetDan(game, cfg, done) {
  const p = game.player, st = make(game, p, cfg.waves, true);
  st.done = done; st.dmg = cfg.dmg_mul ?? 1;   // hệ số sát thương kiếp từng cảnh giới (data/realms.json → tribulation.by_realm[i].dmg_mul, tab Đại Quản Sự 20/11): chưa có thì 1
  p.kd = game.kd = st; p.kdLift = 0;
  p.meditating = false; p.riding = false; p.moving = false; p.kx = p.ky = 0;
  if (p.flying) land(game);
  game.strikes = [];
  game.darkTarget = Math.max(game.darkTarget || 0, st.K.dark);
  game.screen?.zoomTo?.(st.K.zoom.tu);   // máy quay tiến lại gần người đang kết đan
  game.online?.cast?.({ k: 'kd-bd', x: Math.round(p.x), y: Math.round(p.y), fx: st.n / 20, fy: 0 });
  game.sfxWarm?.(['kd-tu', 'kd-vong', 'kd-hut', 'kd-roet', 'kd-set', 'kd-set-cuoi', 'kd-dien', 'kd-bung', 'kd-song', 'kd-cot']);   // dựng sẵn tiếng của nghi lễ ngay lúc bắt đầu, khỏi khựng giữa chừng
  game.sfx?.('roar', 0.5); game.sfx?.('kd-tu', 0.7);
}

// Trong nghi lễ người chơi không đi, không đánh, không tung chiêu; nút Đan vẫn dùng được (src/game/player.js gọi mỗi khung)
export function kdHold(game, inp) {
  for (const k of ['ride', 'fly', 'dash', 's0', 's1', 's2', 'art', 'act']) inp.consume(k);
  game.player.atkCd = Math.max(game.player.atkCd, 0.3);
}

const pick = L => L[Math.floor(Math.random() * L.length)];

// Tia thứ i ló ra (tia tiên dẫn rơi xuống trong set_lead giây rồi mới giáng). Cứ tia thứ tư và tia cuối là một chùm 2–3 tia khác màu
function spawnBolts(st, i) {
  const K = st.K, last = i === st.n - 1, big = last || i % 4 === 3, n = last ? 3 : big ? 2 : 1, first = Math.floor(Math.random() * K.set_pals.length);
  for (let c = 0; c < n; c++) {
    const side = n > 1 ? (c - (n - 1) / 2) * 2 / (n - 1) : Math.random() * 2 - 1;
    st.bolts.push({ i, t0: st.T.bolt(i), seed: Math.floor(Math.random() * 1e6), pal: K.set_pals[(first + c * 2) % K.set_pals.length], sx: side * (38 + Math.random() * 46), big, lead: c === 0,
      gx: (Math.random() - 0.5) * 44, gy: (Math.random() - 0.5) * 12 });
  }
}

// Tia thứ i giáng trúng người: loé, tia lửa điện văng ra, điện rẽ xuống đất để lại vết cháy, dòng điện bắt đầu cuốn quanh thân; máy mình thì trừ máu
function hitBolt(game, st, i) {
  const w = st.who, K = st.K, x = w.x, y = w.y - (w.kdLift || 0) - K.dan_y - 3, mine = st.bolts.filter(b => b.i === i), b0 = mine[0], big = !!b0?.big;
  const pal = b0?.pal || K.set_pals[0];
  addFx(game, { type: 'ring', x, y, r: big ? 26 : 17, color: pal[1], life: 0.3, fill: true });
  addFx(game, { type: 'ring', x, y, r: big ? 48 : 32, color: '#ffffff', life: 0.28 });
  for (const b of mine) {
    for (let k = 0; k < (big ? 12 : 8); k++) {   // tia lửa điện văng ra rồi rơi
      const a = Math.random() * Math.PI * 2, sp = 55 + Math.random() * 110;
      st.sparks.push({ x, y, ox: x, oy: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 40, life: 0, max: 0.35 + Math.random() * 0.4, c: Math.random() < 0.4 ? b.pal[0] : Math.random() < 0.6 ? b.pal[1] : b.pal[3] });
    }
    const sc = (game.scorch ||= []);   // điện rẽ từ người xuống đất: vết cháy và gợn sét còn lại tới hết kiếp (vẽ ở draw-trib.js)
    if (sc.length >= 60) sc.shift();
    sc.push({ x: x + b.gx, y: w.y + 3 + b.gy, r: 6 + Math.random() * 4, pal: b.pal, t: 0, seed: Math.random() * 1000 });
  }
  const R = K.tan, last = i === st.n - 1, rnd = (a, b) => a + Math.random() * (b - a);
  for (const q of st.parts) {   // linh khí đang tụ bị đánh tán loạn: hất ra, quay loạn, rồi mới bị hút về lại
    const k = Math.max(0, 1 - q.d / R.r) * (big ? 1.35 : 1);
    if (k <= 0) continue;
    q.vr = (q.vr || 0) + rnd(R.v[0], R.v[1]) * k; q.va = (Math.random() - 0.5) * R.quay * k;
    if (Math.random() < 0.4) q.spin = -q.spin;
  }
  for (let m = 0, n = R.ra[big ? 1 : 0]; m < n; m++) {   // linh khí vừa nạp bị đánh bật khỏi người
    const a = Math.random() * Math.PI * 2, d = rnd(13, 17);
    st.parts.push({ a, d, tan: true, max: rnd(0.5, 0.95), vr: rnd(R.ra_v[0], R.ra_v[1]), va: (Math.random() - 0.5) * R.quay, spin: (Math.random() < 0.5 ? 1 : -1) * rnd(0.7, 1.5), s: Math.random(), x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.78, life: 0 });
  }
  st.hitT = st.t; st.hitPal = pal; st.hitBig = big; w.flash = 0.14;
  st.lit = { t: st.t, c: pal[1], a: K.loe[big ? 1 : 0] * (st.mine ? 1 : 0.5) };   // cả vùng loé sáng theo màu tia (draw-ket-dan.js)
  game.sfx?.(last ? 'kd-set-cuoi' : 'kd-set', big ? 1 : 0.85);   // "đoàng đoàng"; chùm tia cuối: nổ dày, đuôi ngắn cho kịp quãng lặng
  if (big && !last) game.sfx?.('thunder', 0.8);
  if (!last) game.sfx?.('kd-dien', 0.6);
  game.screen?.shake?.((st.mine ? K.shake.set : K.shake.xem * 2) * (big ? 1.3 : 0.8), 0.22);
  if (st.mine) game.screen?.kick?.(0, K.kick[big ? 1 : 0], 0.12);
  if (!st.mine) return hitNear(game, st, i, big, pal);
  const p = game.player;
  p.invT = 0;   // chỉ thiên lôi của nghi lễ trúng được; đòn của quái bị chặn suốt nghi lễ
  const lift = p.kdLift || 0; p.y -= lift;   // số máu, vết đau hiện ở thân người đang lơ lửng chứ không phải dưới đất
  hitPlayer(game, p.maxHp * K.hit_pct * (1 + i * K.hit_grow) * (st.dmg || 1) * (1 - (game.save.flags.thanhTam || 0)), { x: p.x, y: p.y - 80, soft: true });
  p.y += lift;
  p.invT = 2;
}

function step(game, st, dt) {
  const K = st.K, T = st.T, w = st.who, S = K.shake, t0 = st.t;
  if (!st.mine && !st.ok && t0 + dt >= T.x) { st.wait += dt; dt = Math.max(0, T.x - 0.001 - t0); }   // máy người xem: chờ tin 'kd-ok' mới diễn phần thành công
  const t = (st.t += dt), at = x => t0 < x && t >= x;
  const hd = t - st.hitT, k2 = t >= T.x && t < T.y ? (t - T.x) / K.t.tu2 : 0;
  const dui = hd >= 0 && hd < 0.8 && t < T.q ? K.dui[st.hitBig ? 1 : 0] * Math.exp(-hd * 6) * Math.cos(hd * 10) : 0;   // trúng sét: bị dúi xuống rồi bật lại như lò xo
  w.kdLift = Math.max(0, kdLiftAt(K, T, t) - dui);
  w.kdDx = hd >= 0 && hd < 0.28 && t < T.q ? Math.sin(t * 95) * 1.5 * (1 - hd / 0.28) : k2 ? Math.sin(t * 80) * 0.6 * k2 * k2 : 0;   // giật vì điện; đợt tụ khí cuối: run lên dần
  const cx = w.x, cy = w.y - K.dan_y - w.kdLift, suck = t > T.b ? Math.min(1, (t - T.b) / K.t.hut_in) : 0;
  const fly = t >= T.in && t < T.z, tu2 = t >= T.x && t < T.y - 0.3;   // đã bay lên: linh khí cả vùng tiếp tục ùn ùn đổ vào người tới tia sét cuối; tu2: đợt tụ khí cuối
  if (t < T.b + K.t.hut_in * 0.35 || fly || tu2) {   // hạt linh khí: dồn dập dần
    st.acc += (tu2 ? K.rate_tu2 * Math.min(1, (t - T.x) / 0.5) : fly ? K.rate_bay * Math.min(1, (t - T.in) / 1.2) : K.rate * (0.35 + 0.65 * Math.min(1, t / T.b))) * dt;
    while (st.acc >= 1) {
      st.acc -= 1;
      const a = Math.random() * Math.PI * 2, d = K.from * (0.55 + Math.random() * 0.6);
      st.parts.push({ a, d, spin: (Math.random() < 0.82 ? 1 : -1) * (0.7 + Math.random() * 0.8), s: Math.random(), x: cx + Math.cos(a) * d, y: cy + Math.sin(a) * d * 0.78, life: 0 });
    }
  }
  const pull = K.pull * (1 + 9 * suck * suck);
  // đã bay lên: hạt lao vào theo TỐC (càng sát người càng nhanh) thay cho kéo theo tỉ lệ khoảng cách, kẻo hạt chậm dần rồi ùn thành một vành trắng quanh người;
  // đợt tụ cuối nhanh dần; sau tia sét cuối hút nốt cho kịp quãng lặng
  const vin = t >= T.x ? K.vin_tu2 * (1 + 1.3 * k2 * k2) : t >= T.z ? K.vin_bay * 2.6 : t >= T.in ? K.vin_bay : 0;
  for (const q of st.parts) {   // xoáy vào đan điền
    q.life += dt; q.ox = q.x; q.oy = q.y;
    q.d = q.tan ? q.d + q.vr * dt : vin ? q.d + ((q.vr || 0) - vin * (0.6 + 60 / (q.d + 50))) * dt : q.d * Math.exp(-dt * pull) + (q.vr || 0) * dt;   // tan: hạt bị đánh bật khỏi người, bay ra rồi tan, không quay về
    q.a += q.spin * dt * (1.5 + 46 / (Math.max(0, q.d) + 9)) + (q.va || 0) * dt;
    if (q.vr) { const f = Math.exp(-dt * K.tan.hoi); q.vr *= f; q.va *= f; if (q.vr < 4 && !q.tan) q.vr = q.va = 0; }   // bị sét đánh tán loạn (hitBolt): văng ra, quay loạn, tắt dần rồi bị hút về
    q.x = cx + Math.cos(q.a) * q.d; q.y = cy + Math.sin(q.a) * q.d * 0.78;
  }
  st.parts = at(T.in) || (t >= T.q && t < T.x) || t >= T.y ? [] : st.parts.filter(q => q.d > 4 && !(q.max && q.life >= q.max));   // quãng lặng: không còn hạt nào
  for (const q of st.sparks) { q.life += dt; q.ox = q.x; q.oy = q.y; q.vy += 260 * dt; q.x += q.vx * dt; q.y += q.vy * dt; }
  if (st.sparks.length) st.sparks = st.sparks.filter(q => q.life < q.max);
  if (t >= T.a && t < T.b) game.screen?.shake?.(st.mine ? S.vong * (0.4 + 0.6 * (t - T.a) / K.t.vong) : S.xem, 0.12);
  else if (t >= T.b && t < T.c) game.screen?.shake?.(st.mine ? S.hut : S.xem, 0.12);
  else if (t >= T.x && t < T.y) game.screen?.shake?.((st.mine ? S.hut : S.xem) * (0.5 + (t - T.x) / K.t.tu2), 0.12);   // đợt tụ cuối: rung dồn dần
  else if (t >= T.d && t < T.w) game.screen?.shake?.(st.mine ? S.song : S.xem, 0.12);
  else if (t >= T.e && t < T.f - 0.5) game.screen?.shake?.(st.mine ? S.cot : S.xem * 0.6, 0.12);
  for (const x of [2.7, 5.4]) if (at(x) && x < T.b - 1) game.sfx?.('kd-tu', 0.8 + 0.1 * x / 2.7);   // gió hút dâng dần suốt lúc tụ
  for (const r of K.rings) if (at(T.a + r[5] + 0.01)) game.sfx?.('kd-vong');
  if (at(T.b)) game.sfx?.('kd-hut');
  if (t >= T.d + K.wave_gap * 0.5 && t < T.w - 0.25 && Math.floor((t - T.d) / K.wave_gap) !== Math.floor((t0 - T.d) / K.wave_gap)) game.sfx?.('kd-song', 0.75 - 0.35 * (t - T.d) / K.t.song);   // mỗi vành sóng một tiếng, nhỏ dần
  if (at(T.in)) {   // hút xong: loé ở đan điền
    addFx(game, { type: 'ring', x: cx, y: cy, r: 22, color: K.pal_khi[1], life: 0.4, fill: true });
    game.sfx?.('buff'); if (st.mine) game.flashT = Math.max(game.flashT || 0, 0.12);
  }
  while (st.lead < st.n && t >= T.bolt(st.lead) - K.set_lead) { spawnBolts(st, st.lead++); game.sfx?.('kd-roet', 0.9); }   // "roẹt": tia xé trời lao xuống, dứt đúng lúc trúng
  while (st.hit < st.n && t >= T.bolt(st.hit)) hitBolt(game, st, st.hit++);
  if (st.bolts.length && t - st.bolts[0].t0 > K.set_strike + K.set_fade) st.bolts = st.bolts.filter(b => t - b.t0 <= K.set_strike + K.set_fade);
  if (st.mine && at(T.in)) game.screen?.zoomTo?.(K.zoom.set);   // bay lên: lùi máy quay cho thấy trời
  if (st.mine && at(T.q)) tribSkyEnd(game);   // sét xong, vào quãng lặng: vết cháy trên đất thôi lách tách, nhạt dần
  if (at(T.x)) { game.sfx?.('kd-hut', 1); if (st.mine) game.screen?.zoomTo?.(K.zoom.tu2); }   // chỉ tiếng hút vút lên (dứt bằng một tiếng nện đúng lúc hấp thu xong); tiếng gió dài 3 giây bỏ vì ngân lấn sang quãng lặng
  if (st.mine && at(T.q)) { st.ok = true; game.online?.cast?.({ k: 'kd-ok', x: Math.round(w.x), y: Math.round(w.y), fx: 0, fy: 0 }); }   // chịu đủ sét: báo ngay đầu quãng lặng, máy người xem có cả giây để nhận trước đợt tụ khí cuối
  if (at(T.d)) {
    game.sfx?.('kd-bung', 1);   // bung: nổ ngay từ khung đầu, khớp vành sóng thứ nhất
    if (st.mine) { game.flashT = Math.max(game.flashT || 0, 0.3); pushMobs(game, K, w); game.screen?.zoomTo?.(K.zoom.song); }   // lùi máy quay cho thấy sóng lan xa
  }
  if (at(T.e)) { game.sfx?.('kd-cot'); if (st.mine) { game.flashT = Math.max(game.flashT || 0, 0.2); game.screen?.zoomTo?.(K.zoom.cot); } }
  if (t < T.g) return true;
  w.kd = null; w.kdLift = 0; w.kdDx = 0;   // chạm đất
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

function skyRain(game, st, dt) {
  const K = st.K, p = st.who;
  st.sky += K.sky_rate * dt;
  while (st.sky >= 1) {
    st.sky -= 1;
    const a = Math.random() * Math.PI * 2, d = 46 + Math.random() * 170, x = p.x + Math.cos(a) * d, y = p.y + Math.sin(a) * d * 0.75;
    if (game.map?.edge?.(Math.floor(x / game.map.T), Math.floor(y / game.map.T))) continue;
    tribBolt(game, x, y, { pal: pick(K.set_pals), boom: Math.random() < 0.5 });
    if (Math.random() < 0.3 && st.t < st.T.z - 1.6) game.sfx?.('thunder', 0.4);   // gần tia cuối thì thôi tiếng rền xa (đuôi dài, lấn quãng lặng)
  }
}

// Máy người đứng gần người đang kết đan (chủ dự án 20/11/2026 04:4x): ai trong tầm sét, trừ đồng đội và người cùng tông môn, (ket_dan.gan.r tính từ chân người độ kiếp) cũng bị đánh
// cùng, đau gấp gan.k lần người độ kiếp (theo máu tối đa của chính mình, không có Tĩnh Liên / Thanh Tâm vì đan đó chỉ cho kiếp của mình)
// Cùng tổ đội hoặc cùng tông môn thì sét không đánh (chủ dự án 20/11/2026 04:5x: "muốn cùng bạn bè cùng đột phá"). Tổ đội so theo mã người
// chơi; tông môn so theo tên trong danh sách thành viên (người lạ trùng tên được tha: chỉ là đỡ một đòn của chính máy mình, không lợi gì)
function ban(game, w) {
  if (game.party?.roster?.some(r => r.id === w.id)) return true;
  const ten = String(w.def?.name || '').trim().toLowerCase();
  return !!ten && !!game.guild?.mine?.tv?.some(x => String(x.ten || '').trim().toLowerCase() === ten);
}

function hitNear(game, st, i, big, pal) {
  const G = st.K.gan, p = game.player, w = st.who;
  if (!G || game.ghost || game.duel || game.kd || !(p.hp > 0) || ban(game, w) || Math.hypot(p.x - w.x, p.y - w.y) > G.r) return;
  const kd = game.data.realms?.tribulation?.by_realm?.find(r => r?.kind === 'ket-dan');   // mọi kiếp kiểu ket-dan cùng dmg_mul (data/realms.json)
  addFx(game, { type: 'ring', x: p.x, y: p.y - 12, r: big ? 22 : 15, color: pal[1], life: 0.3, fill: true });
  for (let k = 0; k < 8; k++) {   // tia lửa điện trên người mình
    const a = Math.random() * Math.PI * 2, sp = 50 + Math.random() * 90;
    st.sparks.push({ x: p.x, y: p.y - 12, ox: p.x, oy: p.y - 12, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp * 0.7 - 40, life: 0, max: 0.3 + Math.random() * 0.35, c: pal[k % 2 ? 0 : 3] });
  }
  game.screen?.kick?.(0, st.K.kick[big ? 1 : 0], 0.12);
  hitPlayer(game, p.maxHp * st.K.hit_pct * (1 + i * st.K.hit_grow) * (kd?.dmg_mul || 1) * G.k, { x: w.x, y: w.y - 80, soft: true });
}

// Mỗi khung (tribulation.js update): nghi lễ của mình và các nghi lễ đang xem của người cùng hành tinh
export function kdTick(game, dt) {
  const st = game.kd, p = game.player;
  if (st) {
    if (p.hp <= 0 || game.ghost) game.trib.fail();   // không chịu nổi thiên lôi
    else {
      if (st.t >= st.T.c && st.t < st.T.z) skyRain(game, st, dt);   // mưa sét nhiều màu quanh vùng lúc thiên lôi giáng (chỉ hình)
      const done = !step(game, st, dt);
      p.invT = Math.max(p.invT, 0.4);
      if (done) { game.kd = null; st.done?.(); }
    }
  }
  if (game.kdSee?.length) game.kdSee = game.kdSee.filter(s => {
    const live = game.others.list.get(s.who.id) === s.who && s.wait < 2.5 && step(game, s, dt);
    if (!live) { s.who.kd = null; s.who.kdLift = 0; s.who.kdDx = 0; }
    return live;
  });
}

// Thất bại / huỷ giữa chừng (tribulation.js fail)
export function kdStop(game) {
  const st = game.kd, p = game.player;
  if (!st) return;
  game.kd = null; p.kd = null; p.kdLift = 0; p.kdDx = 0; game.screen?.zoomTo?.(1);
  game.online?.cast?.({ k: 'kd-hong', x: Math.round(p.x), y: Math.round(p.y), fx: 0, fy: 0 });
}

// Tin nghi lễ của người khác (others.js cast). Trả true nếu là tin kết đan (kể cả khi bỏ qua). Tin là dữ liệu lạ: số tia kẹp 1–20,
// mỗi người cách ít nhất 60 giây mới được diễn lại (kẻo gửi dồn làm rung màn người khác mãi)
export function kdSeen(game, o, raw) {
  const k = raw?.k;
  if (typeof k !== 'string' || !k.startsWith('kd-')) return false;
  if (!o || o.x === null || !cfgOf(game)) return true;
  const L = (game.kdSee ||= []), i = L.findIndex(s => s.who === o);
  if (k === 'kd-bd' && i < 0 && game.time - (o.kdAt ?? -999) > 60) {
    const n = Math.max(1, Math.min(20, Math.round((typeof raw.fx === 'number' ? raw.fx : 0.6) * 20) || 12));
    o.kdAt = game.time; o.kd = make(game, o, n, false); L.push(o.kd);
  } else if (k === 'kd-ok' && i >= 0) L[i].ok = true;
  else if (k === 'kd-hong' && i >= 0) { o.kd = null; o.kdLift = 0; L.splice(i, 1); }
  return true;
}
