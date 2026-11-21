// Quái chung: sinh bản sao bảng bãi quái cho máy chủ phòng Cloudflare (cloud/src/quai-cfg.js) từ data/.
// Máy chủ phòng được Cloudflare đóng gói riêng từ thư mục cloud/, không đọc data/, nên giữ một bản sao SINH TỰ ĐỘNG (như
// cloud/src/ho-so-truong.js, tools/dong-bo.mjs). Không ai sửa tay tệp sinh ra; tools/check.mjs so khớp mỗi lần kiểm.
//   node tools/quai-chung.mjs          xem bản sao có khớp data/ không (lệch: mã thoát 1), in bảng bãi
//   node tools/quai-chung.mjs --ghi    sinh lại bản sao (chạy sau khi sửa data/config.json → quai_chung, bãi quái của bản đồ,
//                                      máu quái, bãi treo máy ở data/planets.json, dị chủng ở data/pets.json)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hcData } from '../src/game/he-chien.js';
import { cauHinhMayChu, QC } from '../src/game/quai-chung-bang.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const TEP = 'cloud/src/quai-cfg.js';
// Mã dựng bãi tinh cầu tông môn: máy chủ phòng chạy đúng đoạn mã của máy khách (bản chép nguyên văn, có dòng đầu báo nguồn)
export const CHEP = [['src/game/kh-bai.js', 'cloud/src/kh-bai.js'], ['src/game/kh-road.js', 'cloud/src/kh-road.js'], ['src/game/quai-ky.js', 'cloud/src/quai-ky.js']];
const banChep = goc => `// TỆP CHÉP TỰ ĐỘNG từ ${goc}, KHÔNG SỬA TAY. Chép lại: node tools/quai-chung.mjs --ghi (tools/check.mjs so khớp).\n` + readFileSync(resolve(ROOT, goc), 'utf8');
const doc = f => JSON.parse(readFileSync(resolve(ROOT, 'data', f + '.json'), 'utf8'));

// data/ như game nạp, đủ phần bảng quái chung cần; máu quái đã qua luật chiến đấu mới (hcData) như trong game (src/main.js)
export function napData() {
  const data = { maps: {} };
  for (const f of ['config', 'mobs', 'pets', 'planets', 'he-chien', 'demon', 'dungeon', 'khai-hoang', 'status']) data[f] = doc(f);
  for (const id of QC(data)?.maps || []) if (existsSync(resolve(ROOT, 'data/maps', id + '.json'))) data.maps[id] = doc('maps/' + id);
  return hcData(data);
}

export function sinh(data = napData()) {
  return `// TỆP SINH RA, KHÔNG SỬA TAY. Nguồn: data/config.json → quai_chung, bãi quái trong data/maps/, máu quái, data/planets.json → farm,
// data/pets.json (dị chủng). Sinh lại: node tools/quai-chung.mjs --ghi (tools/check.mjs so khớp).
// maps.<bản đồ>.s: [[bãi, số con, giờ hồi (ms), máu, x, y, có thể dị chủng]]; v: chữ ký bảng, máy khách so với bảng nó tự tính.
// kh: số để dựng bảng tinh cầu tông môn (kh-bai.js khBangQuai; data/khai-hoang.json, máu và lực chiến gốc của loài).
export const QUAI = ${JSON.stringify(cauHinhMayChu(data))};
`;
}

// Soát (tools/check.mjs gọi): bản sao khớp data/, bản đồ khai trong quai_chung.maps có thật và có bãi chung, số luật hợp lệ
export function soat() {
  const loi = [];
  let data, moi;
  try { data = napData(); moi = sinh(data); } catch (e) { return [`tools/quai-chung.mjs: ${e.message}`]; }
  const C = QC(data), p = resolve(ROOT, TEP);
  if (!C) return ['data/config.json thiếu quai_chung'];
  if (!existsSync(p) || readFileSync(p, 'utf8') !== moi) loi.push(`${TEP} lệch data/: chạy node tools/quai-chung.mjs --ghi`);
  for (const [goc, den] of CHEP) { const q = resolve(ROOT, den); if (!existsSync(q) || readFileSync(q, 'utf8') !== banChep(goc)) loi.push(`${den} lệch ${goc}: chạy node tools/quai-chung.mjs --ghi`); }
  const co = cauHinhMayChu(data).maps;
  for (const id of C.maps || []) {
    if (!data.maps[id]) loi.push(`data/config.json quai_chung.maps: không có bản đồ "${id}"`);
    else if (!co[id]) loi.push(`data/config.json quai_chung.maps: bản đồ "${id}" không có bãi nào thành quái chung (Khai Hoang, bí cảnh, hoặc mọi bãi đều theo cờ truyện)`);
  }
  for (const k of ['gui_ms', 'own_ms', 'tam', 'dps_k', 'bud_s']) if (!(C[k] > 0)) loi.push(`data/config.json quai_chung.${k} phải là số dương`);
  if (!(C.min_cong >= 0 && C.min_cong <= 1)) loi.push('data/config.json quai_chung.min_cong phải trong 0…1');
  if (!(C.dong?.ref >= 1 && C.dong?.max >= 1)) loi.push('data/config.json quai_chung.dong cần ref ≥ 1 và max ≥ 1');
  if (C.own_ms <= Math.max(C.gui_ms, 500) * 2) loi.push('data/config.json quai_chung: own_ms phải lớn hơn hai nhịp báo vị trí (gui_ms, và nhịp nhắc 500 ms khi quái đứng yên ở src/game/quai-chung.js NHAC), kẻo rớt một tin là con quái đổi chủ');
  return loi;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--ghi')) { writeFileSync(resolve(ROOT, TEP), sinh()); for (const [goc, den] of CHEP) writeFileSync(resolve(ROOT, den), banChep(goc)); console.log(`Đã ghi ${TEP}, ${CHEP.map(c => c[1]).join(', ')}`); }
  const data = napData(), loi = soat();
  for (const [id, b] of Object.entries(cauHinhMayChu(data).maps)) {
    console.log(`${id} (chữ ký ${b.v}): ${b.s.length} bãi, ${b.s.reduce((a, r) => a + r[1], 0)} con`);
    for (const r of b.s) console.log(`  bãi ${r[0]}: ${data.maps[id].spawners[r[0]].mob} × ${r[1]}, hồi ${r[2] / 1000} giây, máu ${r[3]}${r[6] ? ', có dị chủng' : ''}`);
  }
  for (const l of loi) console.error('❌ ' + l);
  process.exit(loi.length ? 1 : 0);
}
