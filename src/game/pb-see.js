// Đòn pháp bảo của người chơi khác (chủ dự án 20/11/2026 11:09: "hiển thị combo pháp bảo nữa"): lúc mình tung (phap-bao-run.js pbCast)
// thì báo cả tinh cầu qua đường tin chiêu sẵn có (máy chủ phòng cloud/src/proto.js cleanCast: k chỉ chữ, số, _ -, tối đa 48 ký tự):
//   k = pb_<thứ tự loại>_<thứ tự phẩm>_<cấp>_<các chiêu khảm, mỗi chiêu một ký tự base36 theo thứ tự trong data/phap-bao.json → mods>
// Máy người xem dựng lại đúng đòn đó (cùng loại, phẩm, cấp, chiêu khảm nên cùng hình, cùng số đạn, cùng vùng) với cast.see = true:
// thực thể vẫn bay, nổ, vẽ như của mình nhưng pbHit bỏ qua (phap-bao-hit.js) nên không trúng quái nào, không ai mất máu.
import { buildCast } from './phap-bao-build.js';
import { pbMods } from './phap-bao.js';
import { pbSfx } from './skill-sfx.js';
import { pbPx, pbRamp } from './pb-px.js';
import { pxAdd } from './pfx.js';
import { addFx } from './combat.js';
import { phat } from './phat.js';

const D = game => game.data['phap-bao'];

export function pbSend(game, cast, ang) {
  const P = D(game), it = cast.it, ti = Object.keys(P.types).indexOf(it.type), gi = Math.max(0, P.grades.findIndex(g => g.id === it.grade));
  if (ti < 0) return;
  const keys = Object.keys(P.mods), mods = pbMods(game, it).map(id => keys.indexOf(id)).filter(i => i >= 0 && i < 36).map(i => i.toString(36)).join('');
  phat(game, `pb_${ti}_${gi}_${Math.min(999, it.lv || 0)}_${mods}`, Math.cos(ang), Math.sin(ang));
}

// true: tin này là đòn pháp bảo (đã xử lý hoặc bỏ); false: tin khác, để others-cast.js lo
export function pbSee(game, o, raw) {
  const m = typeof raw?.k === 'string' && /^pb_(\d{1,2})_(\d{1,2})_(\d{1,3})_([0-9a-z]{0,8})$/.exec(raw.k);
  if (!m) return false;
  const P = D(game), type = Object.keys(P.types)[+m[1]], grade = P.grades[+m[2]]?.id, keys = Object.keys(P.mods);
  if (!o || o.x === null || !type || !grade || !game.pbFire) return true;
  const x = +raw.x, y = +raw.y;
  if (!Number.isFinite(x) || !Number.isFinite(y) || Math.hypot(x - o.x, y - o.y) > 200) return true;   // lệch xa chỗ đang thấy người đó: bỏ
  const mods = [...m[4]].map(c => keys[parseInt(c, 36)]).filter(Boolean);
  const cast = buildCast(game, { type, grade, lv: +m[3], slots: mods.length, mods });
  const fx = Math.max(-1, Math.min(1, +raw.fx || 0)), fy = Math.max(-1, Math.min(1, +raw.fy || 0)), ang = Math.atan2(fy, fx || (o.face?.x ?? 1));
  if (Math.abs(fx) + Math.abs(fy) > 0.1) o.face = { x: fx, y: fy };
  cast.see = true; cast.atk = 0; cast.ang = ang;
  pbSfx(game, type, 'c', 'shoot');
  if (pbPx(game)) pxAdd(game, { s: 'pb-tran-mo', x: o.x, y: o.y, on: o, g: true, pal: pbRamp(game, { cast, node: cast.root }) });   // pháp trận nhỏ dưới chân họ
  const at = { x: o.x, y: o.y - 4, ang, src: 'point' };
  if (cast.T.pre?.kind === 'shield') { addFx(game, { type: 'ring', x: o.x, y: o.y - 6, r: 12, color: cast.T.color, life: cast.T.pre.dur || 1 }); return true; }   // khiên: chỉ vòng sáng quanh họ
  if (cast.T.pre?.kind === 'suck') return true;
  game.pbFire(cast, cast.root, at);
  return true;
}
