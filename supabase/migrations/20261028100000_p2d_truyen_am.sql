-- Truyền âm: nhắn riêng giữa hai người chơi (lớp "điện thoại" theo chủ dự án 28/10/2026).
-- Người nhận gọi bằng mã chat 12 ký tự (p2d_chat_key, thấy ở dòng chat), không lộ mã tài khoản.
-- Mỗi người gửi tối đa 30 tin mỗi giờ; người đang bị khoá chat không gửi được; tin giữ 14 ngày (job p2d-don-truyen-am).

create table if not exists public.p2d_truyen_am (
  id       bigint generated always as identity primary key,
  tu       uuid        not null references auth.users (id) on delete cascade,
  den      uuid        not null references auth.users (id) on delete cascade,
  noi_dung text        not null check (char_length(noi_dung) between 1 and 200),
  luc      timestamptz not null default now(),
  doc      boolean     not null default false
);
create index if not exists p2d_truyen_am_den_idx on public.p2d_truyen_am (den, id);
create index if not exists p2d_truyen_am_tu_idx on public.p2d_truyen_am (tu, id);
alter table public.p2d_truyen_am enable row level security;
revoke all on table public.p2d_truyen_am from public, anon, authenticated;

-- Tìm người theo mã chat nhanh
create index if not exists p2d_nhan_vat_chat_key_idx on public.p2d_nhan_vat ((left(md5('chat:' || user_id::text), 12)));

create or replace function public.p2d_ten_nguoi(p_uid uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce(
    (select nullif(n.ten, '') from public.p2d_nhan_vat n where n.user_id = p_uid),
    (select nullif(left(split_part(coalesce(u.email, ''), '@', 1), 24), '') from auth.users u where u.id = p_uid),
    'Đạo hữu');
$$;
revoke all on function public.p2d_ten_nguoi(uuid) from public, anon, authenticated;

create or replace function public.p2d_gui_truyen_am(p_k text, p_noi_dung text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_den uuid;
  v_chu text := btrim(coalesce(p_noi_dung, ''));
  v_id  bigint;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if exists (select 1 from public.p2d_cam_chat where user_id = v_uid and den > now()) then raise exception 'bi_cam' using errcode = '42501'; end if;
  if v_chu = '' then raise exception 'rong' using errcode = '22023'; end if;
  v_chu := left(v_chu, 200);
  select n.user_id into v_den from public.p2d_nhan_vat n
  where left(md5('chat:' || n.user_id::text), 12) = coalesce(p_k, '') limit 1;
  if v_den is null then raise exception 'khong_thay' using errcode = '22023'; end if;
  if v_den = v_uid then raise exception 'tu_gui' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_truyen_am where tu = v_uid and luc > now() - interval '1 hour') >= 30 then
    raise exception 'nhanh_qua' using errcode = '54000';
  end if;
  insert into public.p2d_truyen_am (tu, den, noi_dung) values (v_uid, v_den, v_chu) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.p2d_gui_truyen_am(text, text) from public, anon;
grant execute on function public.p2d_gui_truyen_am(text, text) to authenticated;

-- Đọc tin của mình (gửi đi và nhận) sau id p_sau, trong 14 ngày: k và tên là của người bên kia
create or replace function public.p2d_doc_truyen_am(p_sau bigint default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'k', public.p2d_chat_key(x.ai), 'ten', public.p2d_ten_nguoi(x.ai),
             'chu', x.noi_dung, 'luc', x.luc, 'la_toi', x.tu = v_uid, 'doc', x.doc) order by x.id), '[]'::jsonb)
    from (
      select t.*, case when t.tu = v_uid then t.den else t.tu end as ai
      from public.p2d_truyen_am t
      where (t.tu = v_uid or t.den = v_uid) and t.id > coalesce(p_sau, 0) and t.luc > now() - interval '14 days'
      order by t.id desc
      limit 200
    ) x
  );
end;
$$;
revoke all on function public.p2d_doc_truyen_am(bigint) from public, anon;
grant execute on function public.p2d_doc_truyen_am(bigint) to authenticated;

-- Đánh dấu đã đọc mọi tin người có mã p_k gửi cho mình
create or replace function public.p2d_da_doc_truyen_am(p_k text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_n integer;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  with x as (
    update public.p2d_truyen_am t set doc = true
    where t.den = v_uid and not t.doc and left(md5('chat:' || t.tu::text), 12) = coalesce(p_k, '')
    returning 1
  ) select count(*) into v_n from x;
  return v_n;
end;
$$;
revoke all on function public.p2d_da_doc_truyen_am(text) from public, anon;
grant execute on function public.p2d_da_doc_truyen_am(text) to authenticated;

-- Dọn tin quá 14 ngày (pg_cron hằng đêm)
create or replace function public.p2d_don_truyen_am()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_n integer;
begin
  with x as (delete from public.p2d_truyen_am where luc < now() - interval '14 days' returning 1) select count(*) into v_n from x;
  return v_n;
end;
$$;
revoke all on function public.p2d_don_truyen_am() from public, anon, authenticated;

select cron.schedule('p2d-don-truyen-am', '47 19 * * *', $c$select public.p2d_don_truyen_am()$c$);

-- Tự kiểm tra (hoàn tác dữ liệu thử): gửi, đọc hai phía, đánh dấu đã đọc, không tự gửi, mã sai, bị khoá chat, quyền.
do $kt$
declare
  v_hong text := ''; x jsonb; t bigint;
  a uuid := '00000000-0000-4000-8000-0000000000e1'; b uuid := '00000000-0000-4000-8000-0000000000e2';
begin
  begin
    insert into auth.users (id, email, aud, role) values
      (a, 'kt_ta_a@nguoichoi.invalid', 'authenticated', 'authenticated'), (b, 'kt_ta_b@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data) values (a, '{}'::jsonb), (b, '{}'::jsonb);
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    t := public.p2d_gui_truyen_am(public.p2d_chat_key(b), '  Chào đạo hữu  ');
    x := public.p2d_doc_truyen_am(0);
    if jsonb_array_length(x) <> 1 or (x -> 0 ->> 'chu') <> 'Chào đạo hữu' or not (x -> 0 ->> 'la_toi')::boolean
       or (x -> 0 ->> 'k') <> public.p2d_chat_key(b) then v_hong := v_hong || ' | A đọc tin gửi'; end if;
    begin perform public.p2d_gui_truyen_am(public.p2d_chat_key(a), 'tự gửi'); v_hong := v_hong || ' | tự gửi lọt';
    exception when others then if sqlerrm <> 'tu_gui' then v_hong := v_hong || ' | tự gửi: ' || sqlerrm; end if; end;
    begin perform public.p2d_gui_truyen_am('khongcoaiday', 'x'); v_hong := v_hong || ' | mã sai lọt';
    exception when others then if sqlerrm <> 'khong_thay' then v_hong := v_hong || ' | mã sai: ' || sqlerrm; end if; end;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    x := public.p2d_doc_truyen_am(0);
    if jsonb_array_length(x) <> 1 or (x -> 0 ->> 'la_toi')::boolean or (x -> 0 ->> 'doc')::boolean or (x -> 0 ->> 'k') <> public.p2d_chat_key(a) then v_hong := v_hong || ' | B đọc tin nhận'; end if;
    t := public.p2d_da_doc_truyen_am(public.p2d_chat_key(a));   -- câu riêng: hàm stable trong cùng câu không thấy bản vừa sửa
    if t <> 1 or not (public.p2d_doc_truyen_am(0) -> 0 ->> 'doc')::boolean then v_hong := v_hong || ' | đánh dấu đọc'; end if;
    insert into public.p2d_cam_chat (user_id, den) values (b, now() + interval '1 hour');
    begin perform public.p2d_gui_truyen_am(public.p2d_chat_key(a), 'x'); v_hong := v_hong || ' | bị khoá vẫn gửi';
    exception when others then if sqlerrm <> 'bi_cam' then v_hong := v_hong || ' | bị khoá: ' || sqlerrm; end if; end;
    if has_function_privilege('anon', 'public.p2d_gui_truyen_am(text,text)', 'execute') or not has_function_privilege('authenticated', 'public.p2d_gui_truyen_am(text,text)', 'execute')
       or has_table_privilege('authenticated', 'public.p2d_truyen_am', 'select') or has_function_privilege('authenticated', 'public.p2d_don_truyen_am()', 'execute')
       or has_function_privilege('authenticated', 'public.p2d_ten_nguoi(uuid)', 'execute') then v_hong := v_hong || ' | quyền'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra truyền âm TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra truyền âm: đạt hết';
end
$kt$;
