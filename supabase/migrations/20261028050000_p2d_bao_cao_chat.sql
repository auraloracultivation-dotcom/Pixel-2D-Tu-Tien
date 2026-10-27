-- Báo cáo và chặn trong chat (yêu cầu của CH Play với nội dung người dùng tạo ra).
-- - Mỗi tin chat có mã người gửi k (băm 12 ký tự, không lộ mã tài khoản) để máy khách chặn người đó (danh sách chặn lưu ở bản lưu).
-- - p2d_bao_cao_chat(tin, lý do): ghi vào p2d_bao_cao kèm nội dung tin lúc báo; mỗi người tối đa 10 báo cáo mỗi ngày,
--   mỗi tin chỉ báo một lần. Một người bị từ 3 người khác nhau báo trong 24 giờ thì bị khoá chat 24 giờ (p2d_cam_chat).
-- - p2d_gui_chat từ chối người đang bị khoá (mã lỗi bi_cam). Chủ dự án xem p2d_bao_cao, gỡ khoá ở p2d_cam_chat.

create or replace function public.p2d_chat_key(p_uid uuid)
returns text language sql immutable set search_path = ''
as $$ select left(md5('chat:' || p_uid::text), 12); $$;
revoke all on function public.p2d_chat_key(uuid) from public, anon, authenticated;

create table if not exists public.p2d_bao_cao (
  id        bigint generated always as identity primary key,
  nguoi_bao uuid        not null,
  bi_bao    uuid        not null,
  tin_id    bigint      not null,
  kenh      text        not null,
  noi_dung  text        not null,
  ly_do     text        not null default '',
  luc       timestamptz not null default now(),
  unique (nguoi_bao, tin_id)
);
comment on table public.p2d_bao_cao is 'Báo cáo tin chat xấu (nội dung chép lại lúc báo). Chỉ hàm p2d_bao_cao_chat ghi.';
create index if not exists p2d_bao_cao_bi on public.p2d_bao_cao (bi_bao, luc desc);
alter table public.p2d_bao_cao enable row level security;
revoke all on table public.p2d_bao_cao from anon, authenticated;

create table if not exists public.p2d_cam_chat (
  user_id uuid primary key,
  den     timestamptz not null,
  ly_do   text        not null default ''
);
comment on table public.p2d_cam_chat is 'Người đang bị khoá chat tới thời điểm den. Gỡ khoá: sửa den về quá khứ.';
alter table public.p2d_cam_chat enable row level security;
revoke all on table public.p2d_cam_chat from anon, authenticated;

create or replace function public.p2d_bao_cao_chat(p_tin bigint, p_ly_do text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_c   public.p2d_chat%rowtype;
  v_so  integer;
  v_cam boolean := false;
begin
  select * into v_c from public.p2d_chat where id = p_tin;
  if not found or not public.p2d_vao_kenh(v_c.kenh, v_uid) then raise exception 'tin_sai' using errcode = '22023'; end if;
  if v_c.user_id = v_uid then raise exception 'tu_bao' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_bao_cao where nguoi_bao = v_uid and luc > now() - interval '1 day') >= 10 then
    raise exception 'bao_nhieu' using errcode = '54000';
  end if;
  insert into public.p2d_bao_cao (nguoi_bao, bi_bao, tin_id, kenh, noi_dung, ly_do)
  values (v_uid, v_c.user_id, v_c.id, v_c.kenh, v_c.noi_dung, left(btrim(coalesce(p_ly_do, '')), 60))
  on conflict (nguoi_bao, tin_id) do nothing;
  select count(distinct nguoi_bao) into v_so from public.p2d_bao_cao where bi_bao = v_c.user_id and luc > now() - interval '1 day';
  if v_so >= 3 then
    insert into public.p2d_cam_chat (user_id, den, ly_do) values (v_c.user_id, now() + interval '1 day', v_so || ' người báo cáo trong 24 giờ')
    on conflict (user_id) do update set den = greatest(public.p2d_cam_chat.den, excluded.den), ly_do = excluded.ly_do;
    v_cam := true;
  end if;
  return jsonb_build_object('ok', true, 'cam', v_cam);
end;
$$;
revoke all on function public.p2d_bao_cao_chat(bigint, text) from public, anon;
grant execute on function public.p2d_bao_cao_chat(bigint, text) to authenticated;

-- Gửi chat: thêm kiểm tra khoá chat (phần còn lại như 20261027100000_p2d_chat_the_gioi.sql)
create or replace function public.p2d_gui_chat(p_kenh text, p_noi_dung text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_chu text;
  v_ten text;
  v_id  bigint;
  v_bo  integer;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if not public.p2d_vao_kenh(p_kenh, v_uid) then raise exception 'kenh_sai' using errcode = '42501'; end if;
  if exists (select 1 from public.p2d_cam_chat where user_id = v_uid and den > now()) then raise exception 'bi_cam' using errcode = '42501'; end if;
  v_chu := left(btrim(regexp_replace(regexp_replace(coalesce(p_noi_dung, ''), '[[:cntrl:]<>]', '', 'g'), '\s+', ' ', 'g')), 120);
  if v_chu = '' then raise exception 'rong' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_chat where user_id = v_uid and tao_luc > now() - interval '4 seconds')
     or (select count(*) from public.p2d_chat where user_id = v_uid and tao_luc > now() - interval '5 minutes') >= 30 then
    raise exception 'nhanh_qua' using errcode = '54000';
  end if;
  select nullif(n.ten, '') into v_ten from public.p2d_nhan_vat n where n.user_id = v_uid;
  if v_ten is null then
    select left(split_part(coalesce(u.email, ''), '@', 1), 24) into v_ten from auth.users u where u.id = v_uid;
  end if;
  insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
  values (p_kenh, v_uid, coalesce(nullif(v_ten, ''), 'Đạo hữu'), v_chu)
  returning id into v_id;
  if v_id % 50 = 0 then
    with x as (delete from public.p2d_chat where tao_luc < now() - interval '7 days' returning 1) select count(*) into v_bo from x;
  end if;
  return v_id;
end;
$$;
revoke all on function public.p2d_gui_chat(text, text) from public, anon;
grant execute on function public.p2d_gui_chat(text, text) to authenticated;

-- Đọc chat: thêm k (mã người gửi để chặn); phần còn lại như cũ
create or replace function public.p2d_doc_chat(p_kenh text, p_sau bigint default 0)
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
  if not public.p2d_vao_kenh(p_kenh, v_uid) then raise exception 'kenh_sai' using errcode = '42501'; end if;
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ten', x.ten, 'chu', x.noi_dung, 'luc', x.tao_luc,
             'canh_gioi', x.canh_gioi, 'la_toi', x.user_id = v_uid, 'k', public.p2d_chat_key(x.user_id)) order by x.id), '[]'::jsonb)
    from (
      select c.id, c.ten, c.noi_dung, c.tao_luc, c.user_id, n.canh_gioi
      from public.p2d_chat c left join public.p2d_nhan_vat n on n.user_id = c.user_id
      where c.kenh = p_kenh and c.id > coalesce(p_sau, 0)
      order by c.id desc
      limit 50
    ) x
  );
end;
$$;
revoke all on function public.p2d_doc_chat(text, bigint) from public, anon;
grant execute on function public.p2d_doc_chat(text, bigint) to authenticated;

-- Tự kiểm tra (hoàn tác dữ liệu thử): ba người báo một người thì người đó bị khoá chat; không tự báo; không báo trùng.
do $kt$
declare
  v_hong text := ''; x jsonb; t bigint;
  a uuid := '00000000-0000-4000-8000-0000000000f1'; b uuid := '00000000-0000-4000-8000-0000000000f2';
  c uuid := '00000000-0000-4000-8000-0000000000f3'; d uuid := '00000000-0000-4000-8000-0000000000f4';
begin
  begin
    insert into auth.users (id, email, aud, role) values
      (a, 'kt_chat_a@nguoichoi.invalid', 'authenticated', 'authenticated'), (b, 'kt_chat_b@nguoichoi.invalid', 'authenticated', 'authenticated'),
      (c, 'kt_chat_c@nguoichoi.invalid', 'authenticated', 'authenticated'), (d, 'kt_chat_d@nguoichoi.invalid', 'authenticated', 'authenticated');
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    t := public.p2d_gui_chat('the-gioi', 'Tin thử của A');
    x := public.p2d_doc_chat('the-gioi', t - 1);
    if (x -> 0 ->> 'k') is distinct from public.p2d_chat_key(a) or length(x -> 0 ->> 'k') <> 12 then v_hong := v_hong || ' | mã người gửi'; end if;
    begin perform public.p2d_bao_cao_chat(t, 'thử'); v_hong := v_hong || ' | tự báo mình lọt';
    exception when others then if sqlerrm <> 'tu_bao' then v_hong := v_hong || ' | tự báo: ' || sqlerrm; end if; end;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    x := public.p2d_bao_cao_chat(t, 'Chửi bậy');
    x := public.p2d_bao_cao_chat(t, 'Chửi bậy');   -- báo trùng: không tính thêm
    if (select count(*) from public.p2d_bao_cao where tin_id = t) <> 1 or (x ->> 'cam')::boolean then v_hong := v_hong || ' | báo trùng'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    x := public.p2d_bao_cao_chat(t, '');
    if (x ->> 'cam')::boolean then v_hong := v_hong || ' | 2 người đã khoá'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', d, 'role', 'authenticated')::text, true);
    x := public.p2d_bao_cao_chat(t, '');
    if not (x ->> 'cam')::boolean or not exists (select 1 from public.p2d_cam_chat where user_id = a and den > now()) then v_hong := v_hong || ' | 3 người chưa khoá'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    begin perform public.p2d_gui_chat('the-gioi', 'Tôi vẫn nói'); v_hong := v_hong || ' | bị khoá vẫn chat được';
    exception when others then if sqlerrm <> 'bi_cam' then v_hong := v_hong || ' | bị khoá: ' || sqlerrm; end if; end;
    begin perform public.p2d_bao_cao_chat(999999999, ''); v_hong := v_hong || ' | báo tin không có lọt';
    exception when others then if sqlerrm <> 'tin_sai' then v_hong := v_hong || ' | tin không có: ' || sqlerrm; end if; end;
    if has_function_privilege('anon', 'public.p2d_bao_cao_chat(bigint,text)', 'execute') or not has_function_privilege('authenticated', 'public.p2d_bao_cao_chat(bigint,text)', 'execute')
       or has_table_privilege('authenticated', 'public.p2d_bao_cao', 'select') or has_table_privilege('authenticated', 'public.p2d_cam_chat', 'select')
       or has_function_privilege('authenticated', 'public.p2d_chat_key(uuid)', 'execute') then v_hong := v_hong || ' | quyền'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra báo cáo chat TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra báo cáo chat: đạt hết';
end
$kt$;
