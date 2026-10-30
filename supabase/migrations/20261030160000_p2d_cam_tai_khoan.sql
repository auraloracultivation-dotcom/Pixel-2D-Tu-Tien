-- Cấm tài khoản (chủ dự án chốt 30/10/2026 23:10, xử lý tieuviem dùng công cụ tăng tốc):
-- - Cấm dùng auth.users.banned_until của Supabase (không đăng nhập, không làm mới phiên được).
-- - p2d_uid() kiểm tra thêm banned_until, nên mọi hàm máy chủ của game từ chối ngay ('bi_cam'), không đợi phiên cũ hết hạn.
-   p2d_luu / p2d_tai dùng auth.uid() thẳng, nên thêm trigger p2d_chan_bi_cam chặn mọi lần ghi bản lưu của người đang bị cấm.
-- - p2d_xu_ly: chép dữ liệu tài khoản trước mỗi lần xử lý vi phạm (cấm, trừ Linh Thạch) để khôi phục khi cần.

create table if not exists public.p2d_xu_ly (
  id bigserial primary key,
  user_id uuid not null,
  hanh_dong text not null,
  du_lieu jsonb,
  luc timestamptz not null default now()
);
alter table public.p2d_xu_ly enable row level security;
revoke all on public.p2d_xu_ly from anon, authenticated;

-- Hạn cấm của chính mình (p2d_uid gọi; người chơi chỉ xem được của mình)
create or replace function public.p2d_cam_den(p_uid uuid)
returns timestamptz language sql stable security definer set search_path = ''
as $$ select banned_until from auth.users where id = p_uid and (p_uid = (select auth.uid()) or (select auth.uid()) is null) $$;
revoke all on function public.p2d_cam_den(uuid) from public, anon;
grant execute on function public.p2d_cam_den(uuid) to authenticated;

create or replace function public.p2d_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare v uuid := (select auth.uid());
begin
  if v is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if coalesce(public.p2d_cam_den(v) > now(), false) then raise exception 'bi_cam' using errcode = '28000'; end if;
  return v;
end;
$$;

-- Chặn ghi bản lưu của người đang bị cấm (p2d_luu dùng auth.uid() thẳng, không qua p2d_uid). Chủ dự án / máy chủ (không có auth.uid) vẫn ghi được.
create or replace function public.p2d_chan_bi_cam()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if (select auth.uid()) is not null and coalesce((select banned_until from auth.users where id = new.user_id) > now(), false) then
    raise exception 'bi_cam' using errcode = '28000';
  end if;
  return new;
end;
$$;
revoke all on function public.p2d_chan_bi_cam() from public, anon, authenticated;
create or replace trigger p2d_chan_bi_cam before insert or update on public.p2d_nhan_vat
  for each row execute function public.p2d_chan_bi_cam();
