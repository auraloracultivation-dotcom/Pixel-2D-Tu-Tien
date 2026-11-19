-- Canh gác máy chủ (chủ dự án 20/11/2026 00:12 "Làm đi"), sau vụ 19/11: hàm lưu từ chối món phẩm mới 8 tiếng mà không ai hay.
-- Máy chủ tự canh mỗi 5 phút bằng pg_cron, không dùng Claude: chỉ khi vượt ngưỡng mới ghi một dòng vào p2d_bao_dong.
-- Một việc theo lịch (phiên Claude riêng, mỗi 30 phút) đọc p2d_bao_dong chưa xem: có thì báo chủ dự án và tìm nguyên nhân.
-- Ba luật (ngưỡng ở p2d_canh_gac):
--   luu_hong      ≥ 2 người gặp lỗi "luu: ..." (máy chủ chê bản lưu; máy khách gửi p2d_loi một lần mỗi phiên) trong 3 giờ
--   js_loi        cùng một lỗi JavaScript ở ≥ 5 người trong 30 phút
--   khong_ai_luu  ≥ 5 người đang online (p2d_nhip trong 5 phút) mà không ai lưu được trong 15 phút
-- Cùng một loại chưa xem thì 60 phút mới ghi lại một lần (khỏi dồn).

create table if not exists public.p2d_bao_dong (
  id       bigserial primary key,
  luc      timestamptz not null default now(),
  loai     text not null,
  so       integer not null default 0,
  chi_tiet jsonb,
  xem_luc  timestamptz
);
alter table public.p2d_bao_dong enable row level security;
revoke all on public.p2d_bao_dong from anon, authenticated;
create index if not exists p2d_bao_dong_chua_xem on public.p2d_bao_dong (luc) where xem_luc is null;

create or replace function public.p2d_canh_gac()
returns integer
language plpgsql
security definer
set search_path to ''
as $function$
declare v_n integer; v_ra integer := 0; v_ct jsonb; v_on integer;
begin
  -- luu_hong
  select count(distinct user_id), jsonb_agg(distinct left(tin, 80)) into v_n, v_ct
    from public.p2d_loi where tin like 'luu:%' and luc > now() - interval '3 hours';
  if v_n >= 2 and not exists (select 1 from public.p2d_bao_dong where loai = 'luu_hong' and xem_luc is null and luc > now() - interval '60 minutes') then
    insert into public.p2d_bao_dong (loai, so, chi_tiet) values ('luu_hong', v_n, jsonb_build_object('tin', v_ct)); v_ra := v_ra + 1;
  end if;
  -- js_loi
  select n, jsonb_build_object('tin', t) into v_n, v_ct from (
    select left(tin, 120) t, count(distinct user_id) n from public.p2d_loi
     where tin not like 'luu:%' and cuoi > now() - interval '30 minutes' group by 1 order by 2 desc limit 1) s;
  if coalesce(v_n, 0) >= 5 and not exists (select 1 from public.p2d_bao_dong where loai = 'js_loi' and xem_luc is null and luc > now() - interval '60 minutes') then
    insert into public.p2d_bao_dong (loai, so, chi_tiet) values ('js_loi', v_n, v_ct); v_ra := v_ra + 1;
  end if;
  -- khong_ai_luu
  select count(*) into v_on from public.p2d_nhip where luc > now() - interval '5 minutes';
  select count(*) into v_n from public.p2d_nhan_vat where luu_luc > now() - interval '15 minutes';
  if v_on >= 5 and v_n = 0 and not exists (select 1 from public.p2d_bao_dong where loai = 'khong_ai_luu' and xem_luc is null and luc > now() - interval '60 minutes') then
    insert into public.p2d_bao_dong (loai, so, chi_tiet) values ('khong_ai_luu', v_on, jsonb_build_object('online', v_on)); v_ra := v_ra + 1;
  end if;
  return v_ra;
end;
$function$;
revoke all on function public.p2d_canh_gac() from public, anon, authenticated;

do $$ begin
  if exists (select 1 from cron.job where jobname = 'p2d-canh-gac') then perform cron.unschedule('p2d-canh-gac'); end if;
  perform cron.schedule('p2d-canh-gac', '*/5 * * * *', 'select public.p2d_canh_gac()');
end $$;
