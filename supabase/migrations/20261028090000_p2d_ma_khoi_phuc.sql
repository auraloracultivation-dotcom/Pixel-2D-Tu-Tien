-- Lấy lại tài khoản khi quên mật khẩu (việc 39). Tài khoản dùng email ẩn nên không gửi thư được; thay vào đó là mã khôi phục:
-- - p2d_tao_ma_khoi_phuc(): người đã đăng nhập tạo mã 16 ký tự (XXXX-XXXX-XXXX-XXXX), máy chủ chỉ giữ mã băm; tạo mã mới thì mã cũ hết.
-- - p2d_co_ma_khoi_phuc(): đã có mã chưa (để màn đầu nhắc tạo).
-- - p2d_dung_ma_khoi_phuc(email, mã): chỉ Edge Function khoi-phuc gọi được (quyền service_role); đúng mã thì trả mã tài khoản và
--   xoá mã (dùng một lần), hàm đó đặt mật khẩu mới. Thử sai bị giới hạn theo địa chỉ mạng (bảng p2d_khoi_phuc_thu, chỉ lưu mã băm).

create table if not exists public.p2d_khoi_phuc (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ma_bam  text        not null,
  tao_luc timestamptz not null default now()
);
comment on table public.p2d_khoi_phuc is 'Mã băm của mã khôi phục tài khoản (mỗi người một mã, dùng một lần).';
alter table public.p2d_khoi_phuc enable row level security;
revoke all on table public.p2d_khoi_phuc from anon, authenticated;

create table if not exists public.p2d_khoi_phuc_thu (
  id  bigint generated always as identity primary key,
  ip  text        not null,
  luc timestamptz not null default now()
);
create index if not exists p2d_khoi_phuc_thu_ip on public.p2d_khoi_phuc_thu (ip, luc desc);
comment on table public.p2d_khoi_phuc_thu is 'Lần thử mã khôi phục theo mã băm địa chỉ mạng, giữ 1 ngày.';
alter table public.p2d_khoi_phuc_thu enable row level security;
revoke all on table public.p2d_khoi_phuc_thu from anon, authenticated;

create or replace function public.p2d_bam_ma_khoi_phuc(p_uid uuid, p_ma text)
returns text language sql immutable set search_path = ''
as $$ select encode(extensions.digest('p2d-kp:' || p_uid::text || ':' || upper(regexp_replace(coalesce(p_ma, ''), '[^A-Za-z0-9]', '', 'g')), 'sha256'), 'hex'); $$;
revoke all on function public.p2d_bam_ma_khoi_phuc(uuid, text) from public, anon, authenticated;

create or replace function public.p2d_tao_ma_khoi_phuc()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_abc  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   -- bỏ I, O, 0, 1 cho khỏi nhầm
  v_b    bytea := extensions.gen_random_bytes(16);
  v_ma   text := '';
  i      integer;
begin
  for i in 0 .. 15 loop
    v_ma := v_ma || substr(v_abc, get_byte(v_b, i) % 32 + 1, 1) || case when i in (3, 7, 11) then '-' else '' end;
  end loop;
  insert into public.p2d_khoi_phuc (user_id, ma_bam) values (v_uid, public.p2d_bam_ma_khoi_phuc(v_uid, v_ma))
  on conflict (user_id) do update set ma_bam = excluded.ma_bam, tao_luc = now();
  return v_ma;
end;
$$;

create or replace function public.p2d_co_ma_khoi_phuc()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select exists (select 1 from public.p2d_khoi_phuc where user_id = public.p2d_uid()); $$;

revoke all on function public.p2d_tao_ma_khoi_phuc(), public.p2d_co_ma_khoi_phuc() from public, anon;
grant execute on function public.p2d_tao_ma_khoi_phuc(), public.p2d_co_ma_khoi_phuc() to authenticated;

-- Chỉ service_role (Edge Function khoi-phuc). p_ip: mã băm địa chỉ mạng; quá 5 lần thử mỗi giờ hoặc 20 lần mỗi ngày thì báo thu_nhieu.
create or replace function public.p2d_dung_ma_khoi_phuc(p_email text, p_ma text, p_ip text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid; v_n integer;
begin
  with x as (delete from public.p2d_khoi_phuc_thu where luc < now() - interval '1 day' returning 1) select count(*) into v_n from x;
  if (select count(*) from public.p2d_khoi_phuc_thu where ip = p_ip and luc > now() - interval '1 hour') >= 5
     or (select count(*) from public.p2d_khoi_phuc_thu where ip = p_ip) >= 20 then
    raise exception 'thu_nhieu' using errcode = '54000';
  end if;
  insert into public.p2d_khoi_phuc_thu (ip) values (left(coalesce(p_ip, ''), 80));
  select u.id into v_uid from auth.users u where lower(u.email) = lower(p_email);
  if v_uid is null or not exists (select 1 from public.p2d_khoi_phuc k where k.user_id = v_uid and k.ma_bam = public.p2d_bam_ma_khoi_phuc(v_uid, p_ma)) then
    return null;
  end if;
  with x as (delete from public.p2d_khoi_phuc where user_id = v_uid returning 1) select count(*) into v_n from x;
  return v_uid;
end;
$$;
revoke all on function public.p2d_dung_ma_khoi_phuc(text, text, text) from public, anon, authenticated;
grant execute on function public.p2d_dung_ma_khoi_phuc(text, text, text) to service_role;

-- Tự kiểm tra (hoàn tác dữ liệu thử)
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000a9'; v_ma text; i integer;
begin
  begin
    insert into auth.users (id, email, aud, role) values (a, 'kt_kp_a@nguoichoi.invalid', 'authenticated', 'authenticated');
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    if public.p2d_co_ma_khoi_phuc() then v_hong := v_hong || ' | chưa tạo đã có'; end if;
    v_ma := public.p2d_tao_ma_khoi_phuc();
    if v_ma !~ '^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$' or not public.p2d_co_ma_khoi_phuc() then v_hong := v_hong || ' | dạng mã: ' || v_ma; end if;
    if exists (select 1 from public.p2d_khoi_phuc where ma_bam like '%' || replace(v_ma, '-', '') || '%') then v_hong := v_hong || ' | lưu mã gốc'; end if;
    if public.p2d_dung_ma_khoi_phuc('kt_kp_a@nguoichoi.invalid', 'SAI0-SAI0-SAI0-SAI0', 'ip-thu') is not null then v_hong := v_hong || ' | mã sai lọt'; end if;
    if public.p2d_dung_ma_khoi_phuc('KT_KP_A@nguoichoi.invalid', lower(replace(v_ma, '-', ' ')), 'ip-thu') is distinct from a then v_hong := v_hong || ' | mã đúng (chữ thường, cách) bị từ chối'; end if;
    if public.p2d_dung_ma_khoi_phuc('kt_kp_a@nguoichoi.invalid', v_ma, 'ip-thu') is not null then v_hong := v_hong || ' | mã dùng hai lần'; end if;
    begin
      for i in 1 .. 6 loop perform public.p2d_dung_ma_khoi_phuc('ai@nguoichoi.invalid', 'X', 'ip-thu-2'); end loop;
      v_hong := v_hong || ' | không chặn thử nhiều';
    exception when others then if sqlerrm <> 'thu_nhieu' then v_hong := v_hong || ' | thử nhiều: ' || sqlerrm; end if; end;
    if has_function_privilege('authenticated', 'public.p2d_dung_ma_khoi_phuc(text,text,text)', 'execute') or has_function_privilege('anon', 'public.p2d_dung_ma_khoi_phuc(text,text,text)', 'execute')
       or not has_function_privilege('service_role', 'public.p2d_dung_ma_khoi_phuc(text,text,text)', 'execute')
       or has_function_privilege('anon', 'public.p2d_tao_ma_khoi_phuc()', 'execute') or has_table_privilege('authenticated', 'public.p2d_khoi_phuc', 'select') then v_hong := v_hong || ' | quyền'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra mã khôi phục TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra mã khôi phục: đạt hết';
end
$kt$;
