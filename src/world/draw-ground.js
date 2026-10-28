// Nền đảo bằng hình pixel (tools/art/world.py → data/art.json). Cỏ, đường đất, nền đá, mép cỏ, vách đảo vẽ một lần
// vào tấm đệm riêng của từng bản đồ; nhà, cây, đá, hoa vẽ theo từng ô. Hình chưa tải xong thì trả false để vẽ hình khối như cũ.
import { spriteImage } from '../render/sprites.js';

const GRASSY = '.FTRH';   // ô đứng trên nền cỏ
const EDGES = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // thứ tự khung tile.edge: cỏ ở trên, phải, dưới, trái
const WALL = { L: 12, M: 13, R: 14, door: 15, win: 16 };   // khung tường trong tile.house, sau 12 khung mái
const DIAG = [[-1, -1], [1, -1], [1, 1], [-1, 1]];   // thứ tự khung góc của tile.*-rim: trên trái, trên phải, dưới phải, dưới trái
// Mặt lớn lặp liền (tools/art/terrain.py): khung theo vị trí ô nên cả hồ liền mạch
const BIG = { L: 'tile.lava', O: 'tile.icelake' };
// Mép bờ phủ lên ô: hình, và ô bên cạnh nào thì có bờ
const RIM = {
  L: ['tile.lava-rim', n => n !== 'L'],
  O: ['tile.snow-rim', n => n !== 'O'],
  i: ['tile.snow-rim', n => n === 'w' || n === 'Y'],
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
  const tex = {}, under = map.def.ground && Object.keys(tiles.types).find(k => tiles.types[k].tex && tiles.types[k].color === map.def.ground);
  const texOf = (ch, k) => lit ? null : tex[ch] ??= sheet(game, 'ground.' + (k.solid ? under : ch)) || false;
  // Hình nền riêng của bản đồ này chưa tải xong thì chờ (trả null, khung sau dựng lại), kẻo nền phẳng mãi
  const need = lit ? ['tile.dfloor'] : [...new Set((under || '') + map.def.grid.join(''))].map(ch => 'ground.' + ch);
  for (const id of need) if (game.data.art.sprites[id] && !sheet(game, id)) return null;
  const big = {}, rim = {};
  for (const ch in BIG) if (game.data.art.sprites[BIG[ch]] && !(big[ch] = sheet(game, BIG[ch]))) return null;
  for (const ch in RIM) if (game.data.art.sprites[RIM[ch][0]] && !(rim[ch] = sheet(game, RIM[ch][0]))) return null;
  const painted = new Set();
  const T = map.T, cv = document.createElement('canvas');
  cv.width = map.w * T; cv.height = map.h * T;
  const c = cv.getContext('2d');
  c.imageSmoothingEnabled = false;
  for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const ch = map.at(tx, ty), k = tiles.types[ch] || {}, px = tx * T, py = ty * T, h = hash(tx, ty);
    if (k.void) {   // vách đảo: hai hàng dưới đất liền
      if (!map.type(tx, ty - 1).void) put(c, sp['tile.cliff'], Math.floor(h * 3), px, py);
      else if (!map.type(tx, ty - 2).void) put(c, sp['tile.cliff'], 3 + Math.floor(h * 3), px, py);
      continue;
    }
    if (big[ch]) { put(c, big[ch], (tx % 4) + (ty % 4) * 4, px, py); painted.add(ch); }
    else if (ch === ',') put(c, sp['tile.path'], Math.floor(h * 4), px, py);
    else if (ch === '_') put(c, sp['tile.stone'], Math.floor(h * 4), px, py);
    else if (GRASSY.includes(ch) && !(k.solid && map.def.ground)) put(c, sp['tile.grass'], Math.floor(h * 4), px, py);
    else if ('PMS'.includes(ch)) {   // cổng, bồ đoàn, đá linh căn: nền đá nếu cạnh nền đá, không thì cỏ
      const onStone = EDGES.some(([dx, dy]) => map.at(tx + dx, ty + dy) === '_');
      put(c, sp[onStone ? 'tile.stone' : 'tile.grass'], Math.floor(h * 4), px, py);
    }
    else if (texOf(ch, k)) { put(c, tex[ch], Math.floor(h * 4), px, py); painted.add(ch); }
    else baseTile(c, map, tiles, tx, ty);
    if (ch === ',' || ch === '_') EDGES.forEach(([dx, dy], i) => { if ('.F'.includes(map.at(tx + dx, ty + dy))) put(c, sp['tile.edge'], i, px, py); });
    if (rim[ch]) rimTile(c, map, rim[ch], RIM[ch][1], tx, ty, px, py);
  }
  const floor = lit && sheet(game, 'tile.dfloor');   // hầm ngục về đêm: phủ phiến đá lên nền
  if (floor) for (let ty = 0; ty < map.h; ty++) for (let tx = 0; tx < map.w; tx++) {
    const k = map.type(tx, ty);
    if (!k.solid && !k.void && map.at(tx, ty) !== 'P') put(c, floor, Math.floor(hash(tx + 11, ty) * 4), tx * T, ty * T);
  }
  scatter(c, map, hash, sp['decal.dirt'], sp['prop.bush']);
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
  const w = Math.min(map.w * T, Math.ceil(view.x1)) - x0, h = Math.min(map.h * T, Math.ceil(view.y1)) - y0;
  if (w <= 0 || h <= 0) return true;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(cache.cv, x0, y0, w, h, x0, y0, w, h);
  ctx.restore();
  return true;
}

// Một khối nhà chữ nhật gồm các ô cùng loại (H nhà, B nhà cháy): hàng dưới là tường (cửa ở giữa, cửa sổ xen kẽ), các hàng trên là mái.
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
export function drawProp(ctx, game, map, ch, tx, ty, h) {
  const id = { T: 'prop.tree', R: 'prop.rock', F: 'decal.flowers', H: 'tile.house', B: 'tile.house-burnt' }[ch], sp = id && sheet(game, id);
  if (!sp) return false;
  const T = map.T, px = tx * T, py = ty * T, a = sp.s.anchor;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (ch === 'T') put(ctx, sp, h < 0.1 ? 2 : h < 0.55 ? 1 : 0, px + 8 - a[0], py + 14 - a[1]);
  else if (ch === 'R') put(ctx, sp, h < 0.5 ? 0 : 1, px + 8 - a[0], py + 13 - a[1]);
  else if (ch === 'H' || ch === 'B') put(ctx, sp, housePiece(map, tx, ty, ch), px, py);
  else for (let i = 0; i < 2; i++) put(ctx, sp, Math.floor((h * 7 + i * 0.4) * 3) % 3, px + 2 + Math.floor(((h * 13 + i * 0.5) % 1) * 7), py + 2 + Math.floor(((h * 29 + i * 0.37) % 1) * 7));
  ctx.restore();
  return true;
}
