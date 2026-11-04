// In ra file assetlinks.json cho ứng dụng Android (TWA) từ dấu vân tay SHA-256 của khoá ký.
// Tên gói lấy từ android/twa-manifest.json (chỉ khai một chỗ).
// Dùng: node tools/assetlinks.mjs <SHA256 khoá tải lên> [<SHA256 khoá Play App Signing> ...]
//       node tools/assetlinks.mjs AA:BB:... CC:DD:... > assetlinks.json
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const read = (p) => readFileSync(fileURLToPath(new URL(p, root)), 'utf8');

const { packageId } = JSON.parse(read('android/twa-manifest.json'));
const prints = process.argv.slice(2).map((s) => s.trim().toUpperCase()).filter(Boolean);

if (!prints.length) {
  console.error('Thiếu dấu vân tay. Ví dụ: node tools/assetlinks.mjs AA:BB:...:FF [CC:DD:...:EE]');
  console.error('Lấy ở Play Console > Kiểm thử và phát hành > Toàn vẹn ứng dụng > Ký ứng dụng (SHA-256),');
  console.error('hoặc dòng "SHA-256" trong nhật ký chạy workflow "Đóng gói Android".');
  process.exit(1);
}
const bad = prints.filter((p) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(p));
if (bad.length) {
  console.error(`Dấu vân tay sai dạng (cần 32 cặp hex nối bằng dấu hai chấm): ${bad.join(', ')}`);
  process.exit(1);
}

const out = JSON.parse(read('android/assetlinks.template.json'));
out[0].target.package_name = packageId;
out[0].target.sha256_cert_fingerprints = [...new Set(prints)];
console.log(JSON.stringify(out, null, 2));
