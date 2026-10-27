-- Xoá tài khoản (Google Play bắt buộc). Chủ dự án chốt 28/10/2026: chờ 7 ngày rồi mới xoá, đăng nhập lại là huỷ.
-- - p2d_xin_xoa_tk(): ghi yêu cầu, hạn = 7 ngày sau (bấm lại không kéo dài). p2d_huy_xoa_tk(): huỷ (máy khách gọi mỗi lần đăng nhập).
--   p2d_tinh_trang_xoa(): hạn xoá đang chờ, hoặc null.
-- - Mỗi đêm pg_cron gọi p2d_xoa_het_han(): với từng yêu cầu quá hạn, p2d_xoa_mot() nhường chức Tông chủ cho thành viên
--   vào lâu nhất (tông môn chỉ còn mình thì giải tán), xoá bản sao mỗi đêm, nhật ký lỗi, khoá chat, báo cáo về người đó,
--   bỏ tên người đó khỏi báo cáo họ đã gửi, rồi xoá auth.users (các bảng khác tự xoá theo khoá ngoại ON DELETE CASCADE).
--   Cùng job, bỏ mã băm địa chỉ mạng lúc đăng ký cũ hơn 2 ngày (lời hứa ở trang chính sách quyền riêng tư).

create table if not exists public.p2d_xin_xoa (
  user_id uuid primary key references auth.users (id) on delete cascade,
  luc     timestamptz not null default now(),
  het_han timestamptz not null
);
comment on table public.p2d_xin_xoa is 'Yêu cầu xoá tài khoản đang chờ; quá het_han thì job p2d-xoa-tai-khoan xoá hẳn.';
alter table public.p2d_xin_xoa enable row level security;
revoke all on table public.p2d_xin_xoa from anon, authenticated;

create or replace function public.p2d_xin_xoa_tk()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_han timestamptz;
begin
  insert into public.p2d_xin_xoa (user_id, het_han) values (v_uid, now() + interval '7 days')
  on conflict (user_id) do nothing;
  select het_han into v_han from public.p2d_xin_xoa where user_id = v_uid;
  return jsonb_build_object('het_han', v_han);
end;
$$;

create or replace function public.p2d_huy_xoa_tk()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_n integer;
begin
  with x as (delete from public.p2d_xin_xoa where user_id = v_uid returning 1) select count(*) into v_n from x;
  return v_n > 0;
end;
$$;

create or replace function public.p2d_tinh_trang_xoa()
returns timestamptz
language sql
stable
security definer
set search_path = ''
as $$ select het_han from public.p2d_xin_xoa where user_id = public.p2d_uid(); $$;

revoke all on function public.p2d_xin_xoa_tk(), public.p2d_huy_xoa_tk(), public.p2d_tinh_trang_xoa() from public, anon;
grant execute on function public.p2d_xin_xoa_tk(), public.p2d_huy_xoa_tk(), public.p2d_tinh_trang_xoa() to authenticated;

create or replace function public.p2d_xoa_mot(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_bang uuid; v_moi uuid; v_n integer;
begin
  -- Tông chủ: nhường cho người vào lâu nhất; không còn ai thì giải tán
  select id into v_bang from public.p2d_bang where chu = p_uid for update;
  if found then
    select user_id into v_moi from public.p2d_bang_tv where bang_id = v_bang and user_id <> p_uid order by vao_luc, user_id limit 1;
    if v_moi is not null then
      update public.p2d_bang set chu = v_moi where id = v_bang;
      update public.p2d_bang_tv set chuc = 'chu' where user_id = v_moi;
    else
      with x as (delete from public.p2d_bang where id = v_bang returning 1) select count(*) into v_n from x;
    end if;
  end if;
  with x as (delete from public.p2d_sao_luu where user_id = p_uid returning 1) select count(*) into v_n from x;
  with x as (delete from public.p2d_loi where user_id = p_uid returning 1) select count(*) into v_n from x;
  with x as (delete from public.p2d_cam_chat where user_id = p_uid returning 1) select count(*) into v_n from x;
  with x as (delete from public.p2d_bao_cao where bi_bao = p_uid returning 1) select count(*) into v_n from x;
  update public.p2d_bao_cao set nguoi_bao = '00000000-0000-0000-0000-000000000000' where nguoi_bao = p_uid;
  with x as (delete from auth.users where id = p_uid returning 1) select count(*) into v_n from x;
end;
$$;

create or replace function public.p2d_xoa_het_han()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare r record; v_xoa integer := 0; v_ip integer;
begin
  for r in select user_id from public.p2d_xin_xoa where het_han <= now() order by het_han loop
    perform public.p2d_xoa_mot(r.user_id);
    v_xoa := v_xoa + 1;
  end loop;
  with x as (delete from public.p2d_dang_ky_ip where luc < now() - interval '2 days' returning 1) select count(*) into v_ip from x;
  return jsonb_build_object('xoa', v_xoa, 'ip', v_ip);
end;
$$;
revoke all on function public.p2d_xoa_mot(uuid), public.p2d_xoa_het_han() from public, anon, authenticated;

select cron.schedule('p2d-xoa-tai-khoan', '37 19 * * *', $c$select public.p2d_xoa_het_han()$c$);

-- Tự kiểm tra (hoàn tác dữ liệu thử)
do $kt$
declare
  v_hong text := ''; x jsonb; v_b1 uuid; v_b2 uuid; ok boolean;
  a uuid := '00000000-0000-4000-8000-0000000000c1'; b uuid := '00000000-0000-4000-8000-0000000000c2';
  c uuid := '00000000-0000-4000-8000-0000000000c3'; d uuid := '00000000-0000-4000-8000-0000000000c4';
begin
  begin
    insert into auth.users (id, email, aud, role) values
      (a, 'kt_xoa_a@nguoichoi.invalid', 'authenticated', 'authenticated'), (b, 'kt_xoa_b@nguoichoi.invalid', 'authenticated', 'authenticated'),
      (c, 'kt_xoa_c@nguoichoi.invalid', 'authenticated', 'authenticated'), (d, 'kt_xoa_d@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban) values (a, '{}', 2, 1, 1), (c, '{}', 2, 1, 1);
    insert into public.p2d_bang (ten, chu) values ('Thử Xoá A', a) returning id into v_b1;
    insert into public.p2d_bang (ten, chu) values ('Thử Xoá C', c) returning id into v_b2;
    insert into public.p2d_bang_tv (user_id, bang_id, chuc, vao_luc) values (a, v_b1, 'chu', now() - interval '3 days'), (b, v_b1, 'de', now() - interval '2 days'), (c, v_b2, 'chu', now());
    insert into public.p2d_sao_luu (ngay, user_id, ban) values (current_date - 1, a, '{}');
    insert into public.p2d_loi (user_id, tin) values (a, 'lỗi thử');

    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    x := public.p2d_xin_xoa_tk();
    if (x ->> 'het_han')::timestamptz < now() + interval '6 days 23 hours' then v_hong := v_hong || ' | hạn 7 ngày'; end if;
    if public.p2d_tinh_trang_xoa() is null then v_hong := v_hong || ' | tình trạng'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    perform public.p2d_xin_xoa_tk();
    perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
    perform public.p2d_xin_xoa_tk();
    ok := public.p2d_huy_xoa_tk();
    if not ok or public.p2d_huy_xoa_tk() then v_hong := v_hong || ' | huỷ xoá'; end if;

    x := public.p2d_xoa_het_han();   -- chưa tới hạn: không xoá ai
    if (x ->> 'xoa')::integer <> 0 or not exists (select 1 from auth.users where id = a) then v_hong := v_hong || ' | xoá sớm'; end if;
    update public.p2d_xin_xoa set het_han = now() - interval '1 minute' where user_id in (a, c);
    x := public.p2d_xoa_het_han();
    if (x ->> 'xoa')::integer <> 2 then v_hong := v_hong || ' | số đã xoá: ' || x::text; end if;
    if exists (select 1 from auth.users where id in (a, c)) or not exists (select 1 from auth.users where id in (b)) or not exists (select 1 from auth.users where id = d) then v_hong := v_hong || ' | xoá sai người'; end if;
    if exists (select 1 from public.p2d_nhan_vat where user_id in (a, c)) or exists (select 1 from public.p2d_sao_luu where user_id = a) or exists (select 1 from public.p2d_loi where user_id = a) then v_hong := v_hong || ' | còn dữ liệu'; end if;
    if (select chu from public.p2d_bang where id = v_b1) is distinct from b or (select chuc from public.p2d_bang_tv where user_id = b) <> 'chu' then v_hong := v_hong || ' | nhường Tông chủ'; end if;
    if exists (select 1 from public.p2d_bang where id = v_b2) then v_hong := v_hong || ' | giải tán tông môn một người'; end if;
    if exists (select 1 from public.p2d_xin_xoa where user_id in (a, c)) then v_hong := v_hong || ' | còn yêu cầu'; end if;
    if has_function_privilege('anon', 'public.p2d_xin_xoa_tk()', 'execute') or not has_function_privilege('authenticated', 'public.p2d_huy_xoa_tk()', 'execute')
       or has_function_privilege('authenticated', 'public.p2d_xoa_mot(uuid)', 'execute') or has_function_privilege('authenticated', 'public.p2d_xoa_het_han()', 'execute')
       or has_table_privilege('authenticated', 'public.p2d_xin_xoa', 'select') then v_hong := v_hong || ' | quyền'; end if;
    if not exists (select 1 from cron.job where jobname = 'p2d-xoa-tai-khoan') then v_hong := v_hong || ' | chưa đặt lịch'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra xoá tài khoản TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra xoá tài khoản: đạt hết';
end
$kt$;
