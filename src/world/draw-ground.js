// Nền đảo bằng hình pixel (tools/art/world.py → data/art.json). Cỏ, đường đất, nền đá, mép cỏ, vách đảo vẽ một lần
// vào tấm đệm riêng của từng bản đồ; nhà, cây, đá, hoa vẽ theo từng ô. Hình chưa tải xong thì trả false để vẽ hình khối như cũ.
import { spriteImage } from '../render/sprites.js';
import { roundRim } from './draw-rim.js';

const GRASSY = '.FTRH';   // ô đứng trên nền cỏ
const EDGES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // thứ tự khung tile.edge: cỏ ở trên, phải, dưới, trái
const WALL = { L: 12, M: 13, R: 14, door: 15, win: 16 };   // khung tường trong tile.house, sau 12 khung mái
const DIAG = [[-1, -1], [1, -1], [1, 1], [-1, 1]];   // thứ tự khung góc của tile.*-rim: trên trái, trên phải, dưới phải, dưới trái
// Mặt lớn lặp liền (tools/art/terrain.py): khung theo vị trí ô nên cả hồ liền mạch; ROW: ghép liền theo hàng (khung = tx % 4)
const BIG = { L: 'tile.lava', O: 'tile.icelake', f: 'tile.void', '=': 'tile.water' };
const ROW = { y: 'tile.terrace' };
// Nhà ghép theo khối ô cùng loại, cùng bố cục khung với tile.house
const HOUSE = { H: 'tile.house', B: 'tile.house-burnt', N: 'tile.house-forge', z: 'tile.house-adobe', W: 'tile.house-tree' };
// Vật đứng một ô: hình, chân đặt ở điểm (x, y) trong ô, true nếu khung chạy theo thời gian (không thì chọn theo hash ô)
const PROP = {
  T: ['prop.tree', 8, 14], R: ['prop.rock', 8, 13], J: ['prop.sword-grave', 8, 15], I: ['prop.pillar', 8, 15], h: ['prop.broken-sword', 8, 8],
  Z: ['prop.oldtree', 8, 15], n: ['prop.mushroom', 8, 13], Q: ['prop.lantern', 8, 15, true], V: ['prop.deadtree', 8, 15],
  U: ['prop.blackpillar', 8, 15], '*': ['prop.crystal', 8, 15], Y: ['prop.pine', 8, 15], k: ['prop.icepillar', 8, 15],
  P: ['prop.portal', 8, 9, true], M: ['prop.cushion', 8, 9], K: ['prop.furnace', 8, 15, true], A: ['prop.anvil', 8, 14, true],
};
const NATURAL = 'nRY*kTZV';   // cây, đá, nấm, tinh thể: lệch nhẹ cho tự nhiên
// Vách hang theo hệ: mặt vách khi ô dưới đi được, không thì đỉnh vách
const WALLS = { X: 'tile.wall-root', C: 'tile.wall-copper', E: 'tile.wall-earth' };
export const PROP_TILES = Object.keys(HOUSE).join('') + Object.keys(PROP).join('') + Object.keys(WALLS).join('') + 'F^S';
// Mép bờ phủ lên ô: hình, và ô bên cạnh nào thì có bờ
const RIM = {
  L: ['tile.lava-rim', n => n !== 'L'],
  O: ['tile.snow-rim', n => n !== 'O'],
  i: ['tile.snow-rim', n => n === 'w' || n === 'Y'],
  f: ['tile.void-rim', n => n !== 'f'],
  '=': ['tile.water-rim', n => n !== '='],
};
let cache = { map: null, cv: null, painted: new Set() };

// Ô loại ch của bản đồ đang vẽ đã có hình pixel trong tấm đệm (draw-map.js khỏi vẽ hình khối đè lên)
export const groundPainted = ch => cache.painted.has(ch);

function sheet(game, id) {
  const s = game.data.art.sprites[id], im = s && spriteImage(s);
  return im ? { s, im } : null;
}

function put(ctx, sp, f, x, y) {
  ctx.drawImage(sp.im, f * sp.s.w, 0, sp.s.w, sp.s.h, x, y, sp.s.w, sp.s.h);
}

function build(game, map, tiles, hash, baseTile) {
  const sp = {};
  for (const id of ['tile.grass', 'tile.path', 'tile.stone', 'tile.edge', 'tile.cliff', 'decal.dirt', 'prop.bush']) if (!(sp[id] = sheet(game, id))) return null;
  const lit = game.data.light.maps.includes(map.def.id);
  // Nền pixel theo kiểu "tex" của ô (tools/art/ground.py); ô cây, đá, nhà đứng trên nền màu đất của đảo thì lấy nền ô cùng màu
  // Ô không có tex thì lấy nền của ô có tex cùng màu (kiếm gãy, mộ kiếm trên nền bãi mộ; nhà đất trên đất hậu thổ), không có nữa thì ô đặc đứng trên nền đảo
  const byColor = col => col && Object.keys(tiles.types).find(t => tiles.types[t].tex && tiles.types[t].color === col);
  const tex = {}, under = byColor(map.def.ground);
  const keyOf = (ch, k) => (k.tex ? ch : byColor(k.color)) || (k.solid ? under : null);
  const texOf = (ch, k) => lit ? null : tex[ch] ??= sheet(game, 'ground.' + keyOf(ch, k)) || false;
  // Hình nền riêng của bản đồ này chưa tải xong thì chờ (trả null, khung sau dựng lại), kẻo nền phẳng mãi
  const need = lit ? ['tile.dfloor'] : [...new Set(map.def.grid.join(''))].map(ch => 'ground.' + keyOf(ch, tiles.types[ch] || {}));
  for (const id of need) if (game.data.art.sprites[id] && !sheet(game, id)) return null;
  const big = {}, row = {}, rim = {};
  for (const ch in BIG) if (game.data.art.sprites[BIG[ch]] && !(big[ch] = sheet(game, BIG[ch]))) return null;
  for (const ch in ROW) if (game.data.art.sprites[ROW[ch]] && !(row[ch] = sheet(game, ROW[ch]))) return null;
  for (const ch in RIM) if (game.data.art.sprites[RIM[ch][0]] && !(rim[ch] = sheet(game, RIM[ch][0]))) return null;
  const painted = new Set();
  const T = map.T, cv = document.createElement('canvas');
  cv.width = map.w * T; cv.height = map.h * T + (map.def.planet ? T : 0);   // tinh cầu: chừa chỗ vách dưới đáy đĩa
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const ch = map.at(tx, ty), k = tiles.types[ch] || {}, px = tx * T, py = ty * T, h = hash(tx, ty);
    if (k.void) {   // vách đảo: hai hàng dưới đất liền (tinh cầu tròn thì vách uốn theo mép đĩa, vẽ ở roundRim)
      if (map.def.planet) continue;
      if (!map.type(tx, ty - 1).void) put(c, sp['tile.cliff'], Math.floor(h * 3), px, py);
      else if (!map.type(tx, ty - 2).void) put(c, sp['tile.cliff'], 3 + Math.floor(h * 3), px, py);
      continue;
    }
    if (big[ch]) { put(c, big[ch], (tx % 4) + (ty % 4) * 4, px, py); painted.add(ch); }
    else if (row[ch] && !lit) { put(c, row[ch], tx % 4, px, py); painted.add(ch); }
    else if (ch === ',') put(c, sp['tile.path'], Math.floor(h * 4), px, py);
    else if (ch === '_') put(c, sp['tile.stone'], Math.floor(h * 4), px, py);
    else if ((GRASSY.includes(ch) || ch === '^') && !(k.solid && map.def.ground)) put(c, sp['tile.grass'], Math.floor(h * 4), px, py);
    else if ('PMS'.includes(ch)) {   // cổng, bồ đoàn, đá linh căn: lấy nền của ô đi được bên cạnh (nền đá, cỏ, nền bí cảnh...)
      const n = EDGES.map(([dx, dy]) => map.at(tx + dx, ty + dy)).find(x => !'PMS'.includes(x) && !tiles.types[x]?.solid) || '.';
      const own = !lit && texOf(n, tiles.types[n] || {});
      if (n === '_' || GRASSY.includes(n)) put(c, sp[n === '_' ? 'tile.stone' : 'tile.grass'], Math.floor(h * 4), px, py);
      else if (own) put(c, own, Math.floor(h * 4), px, py);
      else baseTile(c, map, tiles, tx, ty, tiles.types[n]?.color);
    }
    else if (texOf(ch, k)) { put(c, tex[ch], Math.floor(h * 4), px, py); painted.add(ch); }
    else if (lit && PROP[ch] && !k.solid && map.def.ground) baseTile(c, map, tiles, tx, ty, map.def.ground);   // nấm, kiếm gãy trong hầm: nền hầm, không lấy màu ô
    else baseTile(c, map, tiles, tx, ty);
    if (ch === ',' || ch === '_') EDGES.forEach(([dx, dy], i) => { if ('.F'.includes(map.at(tx + dx, ty + dy))) put(c, sp['tile.edge'], i, px, py); });
    if (rim[ch]) rimTile(c, map, rim[ch], RIM[ch][1], tx, ty, px, py);
  }
  const floor = lit && sheet(game, 'tile.dfloor');   // hầm ngục về đêm: phủ phiến đá lên nền
  if (floor) for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const k = map.type(tx, ty);
    if (!k.solid && !k.void) put(c, floor, Math.floor(hash(tx + 11, ty) * 4), tx * T, ty * T);
  }
  if (!lit) meadow(c, map, hash);
  scatter(c, map, hash, sp['decal.dirt'], sp['prop.bush']);
  roundRim(c, map, sp['tile.cliff'], hash);
  cache.painted = painted;
  return cv;
}

// Bờ quanh hồ: cạnh nào giáp bờ thì phủ mép; góc có hai cạnh kề đều là bờ thì bo tròn,
// hai cạnh kề đều là hồ mà ô chéo là bờ thì phủ góc trong.
function rimTile(c, map, sp, isBank, tx, ty, px, py) {
  const bank = (dx, dy) => !map.type(tx + dx, ty + dy).void && isBank(map.at(tx + dx, ty + dy));
  EDGES.forEach(([dx, dy], i) => { if (bank(dx, dy)) put(c, sp, i, px, py); });
  DIAG.forEach(([dx, dy], i) => {
    const a = bank(dx, 0), b = bank(0, dy);
    if ((a && b) || (!a && !b && bank(dx, dy))) put(c, sp, 4 + i, px, py);
  });
}

// Bãi cỏ loang (chơi thử 28/10: cỏ một màu phẳng lì, nhìn lâu mỏi mắt): nhiễu thô mỗi 5 ô, nội suy ra từng khối 4×4 điểm ảnh,
// chia 3 bậc (sẫm, thường, sáng ấm) như mảng cỏ dày, cỏ thưa có nắng. Vẽ một lần vào tấm đệm nền.
function meadow(c, map, hash) {
  const T = map.T, S = 5, B = 4, n = (gx, gy) => hash(gx * 13 + 101, gy * 17 + 7);
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    if (!GRASSY.includes(map.at(tx, ty))) continue;
    for (let by = 0; by < T; by += B) for (let bx = 0; bx < T; bx += B) {
      const fx = (tx * T + bx) / (S * T), fy = (ty * T + by) / (S * T), gx = Math.floor(fx), gy = Math.floor(fy), u = fx - gx, v = fy - gy;
      const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
      const val = (n(gx, gy) * (1 - su) + n(gx + 1, gy) * su) * (1 - sv) + (n(gx, gy + 1) * (1 - su) + n(gx + 1, gy + 1) * su) * sv;
      const d = ((bx + by * 3 + tx * 5 + ty * 7) % 4) / 4 * 0.08;   // lệch ngưỡng theo khối: mép mảng răng cưa kiểu pixel, không thành dải
      if (val + d < 0.36) { c.fillStyle = 'rgba(10,40,30,0.13)'; c.fillRect(tx * T + bx, ty * T + by, B, B); }
      else if (val - d > 0.7) { c.fillStyle = 'rgba(255,230,150,0.07)'; c.fillRect(tx * T + bx, ty * T + by, B, B); }
    }
  }
}

// Rải vùng đất trống và bụi cây thấp lên bãi cỏ rộng, cố định theo vị trí ô (vẽ luôn vào tấm đệm, không chắn đường).
function scatter(c, map, hash, dirt, bush) {
  const T = map.T;
  const open = (x0, y0, w, h) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (map.at(x, y) !== '.') return false; return true; };
  for (let ty = 1; ty < map.h - 2; ty++) for (let tx = 1; tx < map.w - 3; tx++) {
    const h = hash(tx * 7 + 3, ty * 5 + 1);
    if (h < 0.025 && open(tx - 1, ty - 1, 5, 4)) put(c, dirt, Math.floor(hash(ty, tx) * 3), tx * T + 24 - dirt.s.anchor[0], ty * T + 16 - dirt.s.anchor[1]);
    else if (h > 0.95 && open(tx - 1, ty - 1, 3, 3)) put(c, bush, h > 0.99 ? 1 : 0, tx * T + 8 - bush.s.anchor[0], ty * T + 13 - bush.s.anchor[1]);
  }
}

// Lớp nền từ tấm đệm, chỉ phần đang thấy. baseTile: cách vẽ hình khối một ô (draw-map.js) cho ô chưa có hình.
export function drawGround(ctx, game, map, tiles, view, hash, baseTile) {
  if (cache.map !== map) { const cv = build(game, map, tiles, hash, baseTile); if (!cv) { cache.painted = new Set(); return false; } cache = { map, cv, painted: cache.painted }; }
  const T = map.T, x0 = Math.max(0, Math.floor(view.x0)), y0 = Math.max(0, Math.floor(view.y0));
  const w = Math.min(cache.cv.width, Math.ceil(view.x1)) - x0, h = Math.min(cache.cv.height, Math.ceil(view.y1)) - y0;
  if (w <= 0 || h <= 0) return true;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cache.cv, x0, y0, w, h, x0, y0, w, h);
  ctx.restore();
  return true;
}

// Một khối nhà chữ nhật gồm các ô cùng loại (bảng HOUSE): hàng dưới là tường (cửa ở giữa, cửa sổ xen kẽ), các hàng trên là mái.
function housePiece(map, tx, ty, ch) {
  let x0 = tx, y0 = ty;
  while (map.at(x0 - 1, ty) === ch) x0--;
  while (map.at(tx, y0 - 1) === ch) y0--;
  let w = 1, h = 1;
  while (map.at(x0 + w, y0) === ch) w++;
  while (map.at(x0, y0 + h) === ch) h++;
  const c = tx - x0, r = ty - y0, pos = c === 0 ? 0 : c === w - 1 ? 2 : 1;
  if (r === h - 1) return h === 1 ? WALL.M : pos !== 1 ? WALL[pos ? 'R' : 'L'] : c === Math.floor((w - 1) / 2) ? WALL.door : c % 2 ? WALL.win : WALL.M;
  const kind = h === 2 ? 3 : r === 0 ? 0 : r === h - 2 ? 2 : 1;   // nóc, giữa, mép, nhà thấp (nóc + mép)
  return kind * 3 + pos;
}

// Vật trên nền bằng hình: trả true nếu đã vẽ ô này.
export function drawProp(ctx, game, map, ch, tx, ty, h, t = 0) {
  if (ch === '^') return drawPeak(ctx, game, map, tx, ty, h);
  if (WALLS[ch]) return drawWallTile(ctx, game, map, ch, tx, ty, h);
  if (ch === 'S') return drawSpiritStone(ctx, game, map, tx, ty, t);
  const id = HOUSE[ch] || PROP[ch]?.[0] || (ch === 'F' && 'decal.flowers'), sp = id && sheet(game, id);
  if (!sp) return false;
  const T = map.T, a = sp.s.anchor;
  // Vật tự nhiên lệch vài điểm ảnh theo ô, nấm dày thì bỏ bớt: trước đây xếp thẳng hàng như ô cờ (chơi thử 28/10 ở Thanh Mộc)
  if (ch === 'n' && (h * 31) % 1 < 0.35) return true;
  const nat = NATURAL.includes(ch), px = tx * T + (nat ? Math.round(((h * 97) % 1 - 0.5) * 6) : 0), py = ty * T + (nat ? Math.round(((h * 53) % 1 - 0.5) * 4) : 0);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (ch === 'T') put(ctx, sp, h < 0.1 ? 2 : h < 0.55 ? 1 : 0, px + 8 - a[0], py + 14 - a[1]);
  else if (PROP[ch]) put(ctx, sp, PROP[ch][3] ? Math.floor(t * 3 + h * 5) % sp.s.frames : Math.floor(h * sp.s.frames), px + PROP[ch][1] - a[0], py + PROP[ch][2] - a[1]);
  else if (HOUSE[ch]) put(ctx, sp, housePiece(map, tx, ty, ch), px, py);
  else for (let i = 0; i < 2; i++) put(ctx, sp, Math.floor((h * 7 + i * 0.4) * 3) % 3, px + 2 + Math.floor(((h * 13 + i * 0.5) % 1) * 7), py + 2 + Math.floor(((h * 29 + i * 0.37) % 1) * 7));
  ctx.restore();
  return true;
}

// Đất linh điền (tile.plot): đã khai thì luống cày, còn hoang thì cỏ dại. Trả false nếu hình chưa tải để draw-cave.js vẽ hình khối.
export function drawPlotSoil(ctx, game, px, py, wild, h) {
  const sp = sheet(game, 'tile.plot');
  if (!sp) return false;
  put(ctx, sp, (wild ? 2 : 0) + (h < 0.5 ? 0 : 1), px, py);
  return true;
}

// Núi (tools/art/terrain2.py): ô không có núi phía trên là đỉnh phủ tuyết vượt lên trên ô, còn lại là sườn đá; đá theo màu đất bản đồ
function drawPeak(ctx, game, map, tx, ty, h) {
  const key = (map.def.ground || '#8a8070').slice(1), top = map.at(tx, ty - 1) !== '^';
  const sp = sheet(game, (top ? 'prop.peak-' : 'tile.slope-') + key);
  if (!sp) return false;
  const T = map.T, px = tx * T, py = ty * T, a = sp.s.anchor;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (top) put(ctx, sp, Math.floor(h * sp.s.frames), px + 8 - a[0], py + 15 - a[1]);
  else put(ctx, sp, Math.floor(h * sp.s.frames), px, py);
  if (map.at(tx, ty + 1) !== '^') { ctx.fillStyle = 'rgba(20,16,30,.25)'; ctx.fillRect(px, py + T - 1, T, 1); }
  ctx.restore();
  return true;
}

function drawWallTile(ctx, game, map, ch, tx, ty, h) {
  const sp = sheet(game, WALLS[ch]);
  if (!sp) return false;
  const face = !map.type(tx, ty + 1).solid;
  put(ctx, sp, (face ? 0 : 2) + (h < 0.5 ? 0 : 1), tx * map.T, ty * map.T);
  return true;
}

// Đá linh căn: trụ đá pixel, khe giữa sáng màu linh căn của người chơi (chưa có thì xanh nhạt), nhấp nháy
function drawSpiritStone(ctx, game, map, tx, ty, t) {
  const sp = sheet(game, 'prop.spiritstone');
  if (!sp) return false;
  const T = map.T, x = tx * T + 8 - sp.s.anchor[0], y = ty * T + 15 - sp.s.anchor[1];
  ctx.save(); ctx.imageSmoothingEnabled = false;
  put(ctx, sp, 0, x, y);
  ctx.fillStyle = game.save.element ? game.data.elements[game.save.element].color : '#bff4ff';
  ctx.globalAlpha = 0.6 + 0.3 * Math.sin(t * 3);
  ctx.fillRect(x + 6, y + 5, 2, 16);
  ctx.globalAlpha = 1; ctx.fillStyle = '#ffffff'; ctx.fillRect(x + 6, y + 6 + (Math.floor(t * 6) % 14), 1, 1);
  ctx.restore();
  return true;
}

// Cửa bí cảnh còn khoá (map.locked): màn phong ấn đỏ có bùa, vân chạy 2 khung
export function drawSeal(ctx, game, map, tx, ty, t) {
  const sp = sheet(game, 'tile.seal');
  if (!sp) return false;
  put(ctx, sp, Math.floor(t * 2 + tx) % 2, tx * map.T, ty * map.T);
  return true;
}
