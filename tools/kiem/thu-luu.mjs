// Bài thử bắt buộc trước và sau khi áp migration (chủ dự án 20/11/2026, sau vụ 19/11 hàm lưu chê món phẩm mới 8 tiếng; docs/13-CANH-GAC.md).
// In ra một đoạn SQL chạy bằng execute_sql (Supabase MCP): trong MỘT giao dịch có ROLLBACK, đóng vai tài khoản thử claude_kiem,
// gọi p2d_luu2 với túi đồ đủ MỌI phẩm trong data/items.json → rarities. Đạt: trả về {"pb": ...}; trượt: lỗi (vd do_sai) → KHÔNG áp.
// Vì rollback nên không gì được ghi lại (kể cả cờ chống hack: món thử chưa ký, gửi thẳng qua mạng thì tài khoản bị khoá như hack thật).
// Chạy: node tools/kiem/thu-luu.mjs  → dán SQL in ra vào execute_sql.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const items = JSON.parse(readFileSync(resolve(import.meta.dirname, '../../data/items.json'), 'utf8'));
const rar = items.rarities.map(r => `'${r.id.replace(/'/g, "''")}'`).join(', ');
const base = Object.keys(items.bases)[0];
const who = "(select id from auth.users where email = 'claude_kiem@nguoichoi.invalid')";
console.log(`begin;
update auth.users set banned_until = null where id = ${who};
select set_config('request.jwt.claims', json_build_object('sub', ${who}, 'role', 'authenticated')::text, true);
set local role authenticated;
select public.p2d_luu2(
  (select data || jsonb_build_object('bag', (select jsonb_agg(jsonb_build_object('uid', 910000 + i, 'base', '${base}', 'rarity', r, 'lvl', 1, 'lines', '[]'::jsonb, 'sockets', '[]'::jsonb))
     from unnest(array[${rar}]) with ordinality as t(r, i))) from public.p2d_nhan_vat where user_id = auth.uid()),
  (select phien_ban from public.p2d_nhan_vat where user_id = auth.uid()))::text as kq;
rollback;`);
