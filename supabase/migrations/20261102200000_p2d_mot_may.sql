-- Một tài khoản một máy (góp ý #72, chủ dự án đồng ý 02/11/2026 22:58): đăng nhập ở máy mới thì máy cũ tự thoát.
-- Mỗi lần vào game, máy gửi mã phiên ngẫu nhiên (p2d_phien_dat); máy chủ nhớ mã mới nhất. Nhịp sống bản 2
-- (p2d_nhip_song2) làm như p2d_nhip_song rồi so mã: khác thì trả khac = true, máy đó thôi lưu và thoát.
create table if not exists public.p2d_phien (
  user_id uuid primary key references auth.users (id) on delete cascade,
  phien text not null,
  luc timestamptz not null default now()
);
alter table public.p2d_phien enable row level security;   -- không có policy: chỉ đọc ghi qua hàm dưới

create or replace function public.p2d_phien_dat(p_phien text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  if p_phien is null or p_phien !~ '^[A-Za-z0-9]{8,40}$' then raise exception 'phien_sai' using errcode = '22023'; end if;
  insert into public.p2d_phien (user_id, phien, luc) values (v_uid, p_phien, now())
  on conflict (user_id) do update set phien = excluded.phien, luc = now();
end;
$$;

create or replace function public.p2d_nhip_song2(p_phien text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_cur text;
begin
  perform public.p2d_nhip_song();
  select phien into v_cur from public.p2d_phien where user_id = v_uid;
  return jsonb_build_object('khac', v_cur is not null and p_phien is not null and v_cur <> p_phien);
end;
$$;

revoke all on function public.p2d_phien_dat(text) from public, anon;
revoke all on function public.p2d_nhip_song2(text) from public, anon;
grant execute on function public.p2d_phien_dat(text) to authenticated;
grant execute on function public.p2d_nhip_song2(text) to authenticated;
