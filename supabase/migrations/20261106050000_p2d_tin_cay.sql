-- Tài khoản tin cậy (chủ dự án 06/11/2026 11:14: "Đại Ma Thần là tôi mà, xoá hết điểm và để nó hợp lệ đi").
-- Khác p2d_mien_khoa (chỉ miễn tự khoá: 2DDC, 0AD2 vẫn bị cờ đỏ để theo dõi): tài khoản tin cậy không tích điểm nghi vấn khi lưu
-- (p2d_luu) và không bao giờ bị coi là cờ đỏ ở boss / PvP (p2d_la_co_do). Danh sách thêm bằng tay (execute_sql), không có hàm ghi.

create table if not exists public.p2d_tin_cay (
  user_id uuid primary key,
  ly_do text not null,
  luc timestamptz not null default now()
);
alter table public.p2d_tin_cay enable row level security;
revoke all on table public.p2d_tin_cay from public, anon, authenticated;

-- Cờ đỏ boss / PvP: có cờ đỏ thật và không phải tài khoản tin cậy (trước đó lỡ miễn cả p2d_mien_khoa, làm 2DDC thoát cờ đỏ ở boss)
create or replace function public.p2d_la_co_do(p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.p2d_co_do c where c.user_id = p_uid) and not exists (select 1 from public.p2d_tin_cay t where t.user_id = p_uid) $$;
revoke all on function public.p2d_la_co_do(uuid) from public, anon, authenticated;

-- p2d_luu: tài khoản tin cậy không cộng nghi_van (vẫn ghi p2d_nghi_van để xem lại)
do $$
declare d text := pg_get_functiondef('public.p2d_luu'::regproc);
  a text := 'nghi_van = nghi_van + case when v_tinh then 1 else 0 end + case when v_nang then 3 else 0 end,';
  b text := 'nghi_van = nghi_van + case when exists (select 1 from public.p2d_tin_cay t where t.user_id = v_uid) then 0 else (case when v_tinh then 1 else 0 end + case when v_nang then 3 else 0 end) end,';
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'anchor'; end if;
  execute replace(d, a, b);
end $$;
