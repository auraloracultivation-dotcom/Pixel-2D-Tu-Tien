// Chép cloud/src vào một thư mục tạm để chạy ĐÚNG mã máy chủ phòng trong Node (không cần wrangler): lệnh nhập 'cloudflare:workers'
// thay bằng lớp DurableObject giả. Dùng chung cho phong.test.mjs, tai-thu.mjs và phòng giả của bài thử hai máy (phong-gia.mjs),
// nên thêm tệp mới vào cloud/src không phải sửa danh sách ở từng bài thử.
import { readFileSync, writeFileSync, readdirSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

export const GOC_CLOUD = resolve(import.meta.dirname, '../../cloud/src');
const DO_GIA = 'class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }';

export function chepCloud(tien = 'phong-') {
  const dir = mkdtempSync(join(tmpdir(), tien));
  for (const f of readdirSync(GOC_CLOUD).filter(f => f.endsWith('.js'))) writeFileSync(join(dir, f), readFileSync(join(GOC_CLOUD, f), 'utf8').replace("import { DurableObject } from 'cloudflare:workers';", DO_GIA));
  return dir;
}
