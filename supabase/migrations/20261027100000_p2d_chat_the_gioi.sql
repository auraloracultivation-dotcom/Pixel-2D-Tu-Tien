-- Chat chung cả máy chủ (kênh "the-gioi"). Sau này kênh bang dùng chung bảng với tên kênh "bang:<mã bang>".
-- Máy khách không đọc, không ghi thẳng bảng: gửi qua p2d_gui_chat (lọc chữ, giới hạn độ dài và nhịp gửi), đọc qua p2d_doc_chat.
-- Tin cũ hơn 7 ngày được dọn dần mỗi lần gửi.

create table if not exists public.p2d_chat (
  id       bigint generated always as identity primary key,
  kenh     text not null check (kenh ~ '^(the-gioi|bang:[0-9a-f-]{36})$'),
  user_id  uuid not null references auth.users (id) on delete cascade,
  ten      text not null,
  noi_dung text not null check (char_length(noi_dung) between 1 and 120),
  tao_luc  timestamptz not null default now()
);
create index if not exists p2d_chat_kenh_idx on public.p2d_chat (kenh, id desc);
create index if not exists p2d_chat_user_idx on public.p2d_chat (user_id, tao_luc desc);
create index if not exists p2d_chat_tao_luc_idx on public.p2d_chat (tao_luc);

alter table public.p2d_chat enable row level security;
revoke all on table public.p2d_chat from anon, authenticated;

-- Ai được vào kênh nào. Kênh bang sẽ được thay khi có bảng bang.
create or replace function public.p2d_vao_kenh(p_kenh text, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select p_kenh = 'the-gioi'; $$;
revoke all on function public.p2d_vao_kenh(text, uuid) from public, anon, authenticated;

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
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if not public.p2d_vao_kenh(p_kenh, v_uid) then raise exception 'kenh_sai' using errcode = '42501'; end if;
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
  if v_id % 50 = 0 then delete from public.p2d_chat where tao_luc < now() - interval '7 days'; end if;
  return v_id;
end;
$$;
revoke all on function public.p2d_gui_chat(text, text) from public, anon;
grant execute on function public.p2d_gui_chat(text, text) to authenticated;

-- 50 tin mới nhất có id lớn hơn p_sau, xếp cũ trước mới sau; kèm cảnh giới người gửi
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
             'canh_gioi', x.canh_gioi, 'la_toi', x.user_id = v_uid) order by x.id), '[]'::jsonb)
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
