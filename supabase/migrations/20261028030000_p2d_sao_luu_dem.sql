-- Sao lưu hằng đêm bản lưu nhân vật, ngay trong cơ sở dữ liệu, giữ 7 ngày gần nhất.
-- Mỗi đêm 2 giờ 17 sáng giờ Việt Nam (19:17 UTC), pg_cron gọi p2d_sao_luu_dem(): chép nguyên dòng p2d_nhan_vat
-- (to_jsonb, đủ mọi cột) vào p2d_sao_luu theo ngày, rồi bỏ bản cũ hơn 7 ngày. Không ai gọi được từ máy khách.
-- Khôi phục là việc tay của chủ dự án (đọc p2d_sao_luu.ban của ngày cần), không có hàm khôi phục tự động.

create extension if not exists pg_cron with schema pg_catalog;

create table if not exists public.p2d_sao_luu (
  ngay    date        not null,
  user_id uuid        not null,
  ban     jsonb       not null,
  luc     timestamptz not null default now(),
  primary key (ngay, user_id)
);
comment on table public.p2d_sao_luu is 'Bản sao p2d_nhan_vat mỗi đêm (cột ban = to_jsonb cả dòng), giữ 7 ngày. Chỉ hàm p2d_sao_luu_dem ghi.';
alter table public.p2d_sao_luu enable row level security;
revoke all on table public.p2d_sao_luu from anon, authenticated;

create or replace function public.p2d_sao_luu_dem(p_giu integer default 7)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_sao  integer;
  v_bo   integer;
begin
  insert into public.p2d_sao_luu (ngay, user_id, ban)
  select v_ngay, n.user_id, to_jsonb(n) from public.p2d_nhan_vat n
  on conflict (ngay, user_id) do update set ban = excluded.ban, luc = now();
  get diagnostics v_sao = row_count;
  -- giữ p_giu bản gần nhất (hôm nay và p_giu - 1 ngày trước)
  with x as (delete from public.p2d_sao_luu where ngay <= v_ngay - greatest(p_giu, 1) returning 1)
  select count(*) into v_bo from x;
  return jsonb_build_object('ngay', v_ngay, 'sao', v_sao, 'bo', v_bo);
end;
$$;
revoke all on function public.p2d_sao_luu_dem(integer) from public, anon, authenticated;

select cron.schedule('p2d-sao-luu-dem', '17 19 * * *', $c$select public.p2d_sao_luu_dem()$c$);

-- Tự kiểm tra: bản 7 ngày trước bị bỏ, bản 6 ngày trước còn, hôm nay đủ mọi nhân vật, máy khách không gọi được. Hoàn tác dữ liệu thử.
do $kt$
declare
  v_hong text := ''; x jsonb; u uuid := '00000000-0000-4000-8000-0000000000d1';
  v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
  begin
    insert into public.p2d_sao_luu (ngay, user_id, ban) values (v_ngay - 7, u, '{}'::jsonb), (v_ngay - 6, u, '{}'::jsonb);
    x := public.p2d_sao_luu_dem();
    if exists (select 1 from public.p2d_sao_luu where user_id = u and ngay = v_ngay - 7) then v_hong := v_hong || ' | không bỏ bản 7 ngày trước'; end if;
    if not exists (select 1 from public.p2d_sao_luu where user_id = u and ngay = v_ngay - 6) then v_hong := v_hong || ' | bỏ nhầm bản 6 ngày trước'; end if;
    if (select count(*) from public.p2d_sao_luu where ngay = v_ngay) <> (select count(*) from public.p2d_nhan_vat) then v_hong := v_hong || ' | thiếu nhân vật'; end if;
    if (x ->> 'bo')::integer < 1 or (x ->> 'sao')::integer <> (select count(*) from public.p2d_nhan_vat) then v_hong := v_hong || ' | số báo về: ' || x::text; end if;
    x := public.p2d_sao_luu_dem();   -- chạy lại cùng ngày: ghi đè, không nhân đôi
    if (select count(*) from public.p2d_sao_luu where ngay = v_ngay) <> (select count(*) from public.p2d_nhan_vat) then v_hong := v_hong || ' | chạy lại bị nhân đôi'; end if;
    if has_function_privilege('authenticated', 'public.p2d_sao_luu_dem(integer)', 'execute') or has_function_privilege('anon', 'public.p2d_sao_luu_dem(integer)', 'execute')
       or has_table_privilege('authenticated', 'public.p2d_sao_luu', 'select') or has_table_privilege('anon', 'public.p2d_sao_luu', 'select') then v_hong := v_hong || ' | quyền'; end if;
    if not exists (select 1 from cron.job where jobname = 'p2d-sao-luu-dem' and schedule = '17 19 * * *') then v_hong := v_hong || ' | chưa đặt lịch'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra sao lưu TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra sao lưu: đạt hết';
end
$kt$;

-- Bản sao đầu tiên ngay lúc áp migration
select public.p2d_sao_luu_dem();
