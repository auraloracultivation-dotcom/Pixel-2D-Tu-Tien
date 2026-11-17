// In câu SQL tạo một mã quà dùng chung (bảng p2d_ma_chung, migration 20261118030000_p2d_so_cai_ma_chung.sql).
// Mã không ghi vào repo (kho công khai): chạy lệnh này trên máy làm việc rồi dán câu SQL vào máy chủ (Supabase).
// Dùng: node tools/ma-chung-sql.mjs <MÃ> <gói trong data/ma-chung.json> [hạn YYYY-MM-DD, hết ngày đó giờ Đài Loan] [trần lượt]
import { readFileSync } from 'node:fs';

const [ma, goi, han, tran] = process.argv.slice(2);
const D = JSON.parse(readFileSync(new URL('../data/ma-chung.json', import.meta.url), 'utf8'));
if (!ma || !/^[A-Z0-9]{4,32}$/.test(ma.toUpperCase()) || !D.goi[goi]) {
  console.error('Dùng: node tools/ma-chung-sql.mjs <MÃ chữ hoa/số 4–32> <' + Object.keys(D.goi).join('|') + '> [YYYY-MM-DD] [trần lượt]');
  process.exit(1);
}
if (han && !/^\d{4}-\d{2}-\d{2}$/.test(han)) { console.error('Hạn dạng YYYY-MM-DD'); process.exit(1); }
if (tran && !/^\d+$/.test(tran)) { console.error('Trần lượt là số nguyên'); process.exit(1); }
const q = s => `'${String(s).replace(/'/g, "''")}'`;
const het = han ? `(${q(han)}::date + 1)::timestamp at time zone 'Asia/Taipei'` : 'null';
console.log(`insert into public.p2d_ma_chung (ma, thu, het_luc, tran, ghi_chu) values (${q(ma.toUpperCase())}, ${q(JSON.stringify(D.goi[goi].thu))}::jsonb, ${het}, ${tran || 'null'}, ${q(D.goi[goi].ten)});`);
