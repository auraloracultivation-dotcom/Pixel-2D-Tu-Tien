-- Nhật ký lỗi máy khách: game bắt lỗi JavaScript (window.onerror, unhandledrejection) và gửi về khi đã đăng nhập,
-- để chủ dự án biết người chơi gặp lỗi gì trên máy họ. Chặn tràn: mỗi người tối đa 20 dòng mới mỗi giờ,
-- cả máy chủ tối đa 5000 dòng mới mỗi ngày; cùng một lỗi trong 1 ngày thì chỉ cộng số lần. Giữ 14 ngày (pg_cron dọn mỗi đêm).
-- Chủ dự án xem bảng p2d_loi trong Supabase. Máy khách chỉ gọi được p2d_ghi_loi, không đọc được bảng.

create table if not exists public.p2d_loi (
  id      bigint generated always as identity primary key,
  user_id uuid        not null,
  luc     timestamptz not null default now(),
  cuoi    timestamptz not null default now(),
  lan     integer     not null default 1,
  tin     text        not null,
  chong   text        not null default '',
  ban     text        not null default '',
  may     text        not null default ''
);
comment on table public.p2d_loi is 'Lỗi JavaScript từ máy người chơi (tin nhắn, ngăn xếp, phiên bản, trình duyệt). Chỉ hàm p2d_ghi_loi ghi; giữ 14 ngày.';
create index if not exists p2d_loi_nguoi on public.p2d_loi (user_id, cuoi desc);
create index if not exists p2d_loi_luc on public.p2d_loi (luc);
alter table public.p2d_loi enable row level security;
revoke all on table public.p2d_loi from anon, authenticated;

create or replace function public.p2d_ghi_loi(p_tin text, p_chong text default '', p_ban text default '', p_may text default '')
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_tin text := left(btrim(coalesce(p_tin, '')), 300);
begin
  if v_tin = '' then return false; end if;
  -- cùng lỗi trong 1 ngày: chỉ cộng số lần
  update public.p2d_loi set lan = lan + 1, cuoi = now()
   where user_id = v_uid and tin = v_tin and cuoi > now() - interval '1 day';
  if found then return true; end if;
  if (select count(*) from public.p2d_loi where user_id = v_uid and luc > now() - interval '1 hour') >= 20 then return false; end if;
  if (select count(*) from public.p2d_loi where luc > now() - interval '1 day') >= 5000 then return false; end if;
  insert into public.p2d_loi (user_id, tin, chong, ban, may)
  values (v_uid, v_tin, left(coalesce(p_chong, ''), 1500), left(coalesce(p_ban, ''), 120), left(coalesce(p_may, ''), 200));
  return true;
end;
$$;
revoke all on function public.p2d_ghi_loi(text, text, text, text) from public, anon;
grant execute on function public.p2d_ghi_loi(text, text, text, text) to authenticated;

create or replace function public.p2d_don_loi(p_giu integer default 14)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_bo integer;
begin
  with x as (delete from public.p2d_loi where cuoi < now() - make_interval(days => greatest(p_giu, 1)) returning 1)
  select count(*) into v_bo from x;
  return v_bo;
end;
$$;
revoke all on function public.p2d_don_loi(integer) from public, anon, authenticated;

select cron.schedule('p2d-don-loi', '27 19 * * *', $c$select public.p2d_don_loi()$c$);

-- Tự kiểm tra (hoàn tác dữ liệu thử)
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000e1'; i integer;
begin
  begin
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    if not public.p2d_ghi_loi('TypeError: x is undefined', 'at f (game.js:1)', 'v1', 'Thử') then v_hong := v_hong || ' | ghi lỗi đầu'; end if;
    perform public.p2d_ghi_loi('TypeError: x is undefined', '', 'v1', 'Thử');
    if (select lan from public.p2d_loi where user_id = a and tin = 'TypeError: x is undefined') <> 2 or (select count(*) from public.p2d_loi where user_id = a) <> 1 then v_hong := v_hong || ' | gộp lỗi trùng'; end if;
    if public.p2d_ghi_loi('   ') then v_hong := v_hong || ' | nhận lỗi rỗng'; end if;
    for i in 1..30 loop perform public.p2d_ghi_loi('Lỗi số ' || i); end loop;
    if (select count(*) from public.p2d_loi where user_id = a) <> 20 then v_hong := v_hong || ' | chặn tràn mỗi giờ: ' || (select count(*) from public.p2d_loi where user_id = a); end if;
    if length((select tin from public.p2d_loi where user_id = a order by id limit 1)) > 300 then v_hong := v_hong || ' | cắt độ dài'; end if;
    update public.p2d_loi set cuoi = now() - interval '15 days' where user_id = a;
    i := public.p2d_don_loi();   -- gọi riêng: trong một biểu thức OR, Postgres không hứa tính vế nào trước
    if i < 20 or exists (select 1 from public.p2d_loi where user_id = a) then v_hong := v_hong || ' | dọn lỗi cũ: ' || i; end if;
    if has_function_privilege('anon', 'public.p2d_ghi_loi(text,text,text,text)', 'execute') or not has_function_privilege('authenticated', 'public.p2d_ghi_loi(text,text,text,text)', 'execute')
       or has_function_privilege('authenticated', 'public.p2d_don_loi(integer)', 'execute') or has_table_privilege('authenticated', 'public.p2d_loi', 'select') then v_hong := v_hong || ' | quyền'; end if;
    if not exists (select 1 from cron.job where jobname = 'p2d-don-loi') then v_hong := v_hong || ' | chưa đặt lịch dọn'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra nhật ký lỗi TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra nhật ký lỗi: đạt hết';
end
$kt$;
