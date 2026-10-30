-- Điểm danh: ngọc mốc tuần / tháng / quý lên cấp 6 / 7 / 8 (chủ dự án 30/10/2026 13:48: "rẻ quá ai cũng farm ra được").
create or replace function public.p2d_dd_luat()
returns jsonb language sql immutable set search_path = ''
as $$
  select '{"ngay": {"coins": 500}, "tuan": {"can": 5, "coins": 3000, "khoa": 1, "ngoc": 6}, "thang": {"can": 20, "coins": 10000, "khoa": 3, "ngoc": 7}, "quy": {"can": 60, "coins": 30000, "khoa": 6, "ngoc": 8}}'::jsonb
$$;
revoke all on function public.p2d_dd_luat() from public, anon, authenticated;
