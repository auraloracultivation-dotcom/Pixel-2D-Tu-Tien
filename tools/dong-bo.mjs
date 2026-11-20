// Bảng "người khác thấy gì" (data/dong-bo.json) → bản sao cho máy chủ phòng Cloudflare (cloud/src/ho-so-truong.js).
// Máy chủ phòng được Cloudflare đóng gói riêng từ thư mục cloud/, không đọc data/, nên giữ một bản sao SINH TỰ ĐỘNG từ bảng
// (như cloud/src/mang-cfg.js là bản sao của data/thien-mang.json). Không ai sửa tay tệp sinh ra; tools/check.mjs so khớp mỗi lần kiểm.
//   node tools/dong-bo.mjs          xem bản sao có khớp bảng không (lệch: mã thoát 1)
//   node tools/dong-bo.mjs --ghi    sinh lại bản sao (chạy sau mỗi lần sửa data/dong-bo.json → ho_so)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEP = 'cloud/src/ho-so-truong.js';
export const docBang = () => JSON.parse(readFileSync(resolve(ROOT, 'data/dong-bo.json'), 'utf8'));

// Dài tối đa máy chủ phòng nhận cho một trường mã (chữ, số, gạch): theo kiểu trong bảng
const GIU = new Set(['id', 'joined', 'x', 'y', 'fx', 'fy', 't', 'u', 'l', 'me', 'at']);   // phòng gửi { id, joined, ...hồ sơ, x, y, fx, fy }: hồ sơ không được đè
export const daiCua = d => (d.kieu === 'so' ? d.dai : d.kieu === 'chon' ? Math.max(...d.gia_tri.map(v => v.length)) : d.dai || 48);

export function sinh(bang = docBang()) {
  const H = bang.ho_so, ten = [], chu = [];
  for (const [k, d] of Object.entries(H)) {
    if (!/^[a-z][a-z0-9]{0,11}$/.test(k)) throw new Error(`data/dong-bo.json: tên trường "${k}" phải là chữ thường / số, tối đa 12 ký tự`);
    if (GIU.has(k)) throw new Error(`data/dong-bo.json: "${k}" là khoá máy chủ phòng tự gắn cạnh hồ sơ (cloud/src/phong.js), đặt tên khác`);
    if (d.ai === 'may-chu') continue;   // máy chủ phòng tự gắn (pk): không nhận từ máy khách
    if (d.kieu === 'ten') ten.push(`${k}: [${d.dai}, ${JSON.stringify(d.trong || '')}]`);
    else chu.push(`${k}: ${daiCua(d)}`);
  }
  return `// TỆP SINH RA, KHÔNG SỬA TAY. Nguồn: data/dong-bo.json → ho_so. Sinh lại: node tools/dong-bo.mjs --ghi (tools/check.mjs so khớp).
// Máy chủ phòng chỉ giữ đúng các trường này trong hồ sơ người chơi gửi lên (proto.js cleanProf); máy người xem lọc lại theo data/.
export const TEN = { ${ten.join(', ')} };   // chữ tự do: [dài tối đa, giá trị khi trống]
export const CHU = { ${chu.join(', ')} };   // mã chữ, số, gạch: dài tối đa
`;
}

// Soát bảng: trả về danh sách lỗi (tools/check.mjs gọi). Bắt các kiểu quên đã gặp: bản sao máy chủ phòng lệch bảng, trường không có
// nơi lấy giá trị, hàm lấy giá trị thừa (trường đã bỏ khỏi bảng), bảng tra mã không có trong data/.
const KIEU = { ten: ['dai'], ma: ['bang'], chu: [], so: ['dai'], chon: ['gia_tri'], co: [] };
const doc = f => JSON.parse(readFileSync(resolve(ROOT, 'data', f + '.json'), 'utf8'));
export function soat() {
  const loi = [], bang = docBang(), H = bang.ho_so;
  let moi = '';
  try { moi = sinh(bang); } catch (e) { return [e.message]; }
  const p = resolve(ROOT, TEP);
  if (!existsSync(p) || readFileSync(p, 'utf8') !== moi) loi.push(`${TEP} lệch data/dong-bo.json: chạy node tools/dong-bo.mjs --ghi`);
  const src = readFileSync(resolve(ROOT, 'src/game/ho-so-phong.js'), 'utf8'), khoi = src.match(/export const LAY = \{([\s\S]*?)\n\};/)?.[1] || '';
  const lay = new Set([...khoi.matchAll(/^ {2}([a-z][a-z0-9]*):/gm)].map(m => m[1]));
  for (const [k, d] of Object.entries(H)) {
    const can = KIEU[d.kieu];
    if (!can) { loi.push(`data/dong-bo.json: trường "${k}" kiểu "${d.kieu}" không có (ten, ma, chu, so, chon, co)`); continue; }
    for (const c of can) if (d[c] == null) loi.push(`data/dong-bo.json: trường "${k}" kiểu ${d.kieu} thiếu "${c}"`);
    if (d.kieu === 'ma') {
      const [tep, ...duong] = d.bang.split('.');
      let b; try { b = duong.reduce((a, x) => a?.[x], doc(tep)); } catch { b = null; }
      if (!b || typeof b !== 'object') loi.push(`data/dong-bo.json: trường "${k}" tra bảng "${d.bang}" không có trong data/`);
    }
    if (d.ai && !['ket-noi', 'may-chu'].includes(d.ai)) loi.push(`data/dong-bo.json: trường "${k}" ai = "${d.ai}" không có (ket-noi, may-chu)`);
    if (d.ai) { if (d.lay || lay.has(k)) loi.push(`data/dong-bo.json: trường "${k}" do ${d.ai} lo, không được có nơi lấy ở máy gửi`); continue; }
    if (d.lay && lay.has(k)) loi.push(`trường "${k}" vừa có "lay" trong bảng vừa có hàm trong LAY (src/game/ho-so-phong.js): chỉ giữ một`);
    if (!d.lay && !lay.has(k)) loi.push(`trường "${k}" trong data/dong-bo.json chưa có nơi lấy giá trị: ghi "lay" trong bảng hoặc thêm hàm vào LAY (src/game/ho-so-phong.js)`);
    if (d.lay && !/^(save|player)\.[\w.]+$/.test(d.lay)) loi.push(`data/dong-bo.json: trường "${k}" lay = "${d.lay}" phải bắt đầu bằng save. hoặc player.`);
  }
  for (const k of lay) if (!H[k]) loi.push(`src/game/ho-so-phong.js: LAY có "${k}" nhưng data/dong-bo.json không còn trường này`);
  // Nhóm tin hiệu ứng: mỗi nhóm trong bảng một bộ xem cùng tên ở XEM (src/game/others-nhan.js) và ngược lại; mẫu mã phải là biểu thức hợp lệ
  const U = Object.entries(bang.hieu_ung || {}).filter(([k]) => k[0] !== '_');
  const xem = new Set([...(readFileSync(resolve(ROOT, 'src/game/others-nhan.js'), 'utf8').match(/export const XEM = \{([\s\S]*?)\n\};/)?.[1] || '').matchAll(/^ {2}([a-z][a-z0-9]*):/gm)].map(m => m[1]));
  for (const [k, d] of U) {
    if (!xem.has(k)) loi.push(`nhóm tin "${k}" trong data/dong-bo.json chưa có bộ xem ở XEM (src/game/others-nhan.js)`);
    if (d.mau) { try { new RegExp(d.mau); } catch { loi.push(`data/dong-bo.json: nhóm "${k}" mẫu "${d.mau}" không phải biểu thức hợp lệ`); } }
    else if (d.bang) { let b; try { const [tep, ...duong] = d.bang.split('.'); b = duong.reduce((a, x) => a?.[x], doc(tep)); } catch { b = null; } if (!b) loi.push(`data/dong-bo.json: nhóm "${k}" tra bảng "${d.bang}" không có trong data/`); }
    else loi.push(`data/dong-bo.json: nhóm "${k}" phải có mau hoặc bang`);
  }
  for (const k of xem) if (!U.some(([u]) => u === k)) loi.push(`src/game/others-nhan.js: XEM có "${k}" nhưng data/dong-bo.json → hieu_ung không có nhóm này`);
  if (!/'dong-bo'/.test(readFileSync(resolve(ROOT, 'src/core/data.js'), 'utf8'))) loi.push('src/core/data.js: FILES thiếu dong-bo');
  return loi;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const moi = sinh(), p = resolve(ROOT, TEP), cu = existsSync(p) ? readFileSync(p, 'utf8') : '';
  if (process.argv.includes('--ghi')) { writeFileSync(p, moi); console.log(cu === moi ? `${TEP}: không đổi` : `${TEP}: đã sinh lại`); }
  else if (cu !== moi) { console.error(`${TEP} lệch data/dong-bo.json: chạy node tools/dong-bo.mjs --ghi`); process.exit(1); }
  else console.log(`${TEP}: khớp bảng`);
}
