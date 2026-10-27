-- Bang (tông môn người chơi): lập bang, chức vụ, chat bang (kênh "bang:<mã>" trong p2d_chat), việc bang hằng tuần.
-- Mỗi người một bang. Chức: chu (bang chủ), pho (phó bang chủ), truong_lao (trưởng lão), de_tu (đệ tử).
-- Việc tuần: thành viên góp tiến độ (giết quái, luyện đan, câu cá, thu hoạch), đủ mục tiêu thì mọi người đã góp nhận thưởng.
-- Mục tiêu và trần góp mỗi người ở p2d_bang_muc phải khớp data/guild.json. Máy khách không đọc ghi thẳng bảng nào.

create table if not exists public.p2d_bang (
  id        uuid primary key default gen_random_uuid(),
  ten       text not null check (char_length(ten) between 2 and 16),
  thong_bao text not null default '' check (char_length(thong_bao) <= 120),
  tao_luc   timestamptz not null default now()
);
create unique index if not exists p2d_bang_ten_idx on public.p2d_bang (lower(ten));

create table if not exists public.p2d_bang_tv (
  user_id uuid primary key references auth.users (id) on delete cascade,
  bang_id uuid not null references public.p2d_bang (id) on delete cascade,
  chuc    text not null default 'de_tu' check (chuc in ('chu', 'pho', 'truong_lao', 'de_tu')),
  vao_luc timestamptz not null default now()
);
create index if not exists p2d_bang_tv_bang_idx on public.p2d_bang_tv (bang_id);

create table if not exists public.p2d_bang_gop (
  tuan    date not null,
  viec    text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  bang_id uuid not null references public.p2d_bang (id) on delete cascade,
  n       integer not null default 0 check (n >= 0),
  primary key (tuan, viec, user_id)
);
create index if not exists p2d_bang_gop_bang_idx on public.p2d_bang_gop (bang_id, tuan);

create table if not exists public.p2d_bang_nhan (
  tuan    date not null,
  viec    text not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  primary key (tuan, viec, user_id)
);

alter table public.p2d_bang enable row level security;
alter table public.p2d_bang_tv enable row level security;
alter table public.p2d_bang_gop enable row level security;
alter table public.p2d_bang_nhan enable row level security;
revoke all on table public.p2d_bang, public.p2d_bang_tv, public.p2d_bang_gop, public.p2d_bang_nhan from anon, authenticated;

-- Mục tiêu tuần của cả bang và trần góp mỗi người (khớp data/guild.json)
create or replace function public.p2d_bang_muc(p_viec text, out muc integer, out tran integer)
language sql
immutable
set search_path = ''
as $$
  select x.muc, x.tran from (values
    ('diet-quai', 3000, 800), ('luyen-dan', 150, 40), ('cau-ca', 120, 40), ('thu-hoach', 200, 60)
  ) as x (viec, muc, tran) where x.viec = p_viec;
$$;

create or replace function public.p2d_bang_si_so()
returns integer language sql immutable set search_path = '' as $$ select 30; $$;

-- Kênh chat: thế giới cho mọi người, kênh bang cho thành viên bang đó
create or replace function public.p2d_vao_kenh(p_kenh text, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_kenh = 'the-gioi'
      or exists (select 1 from public.p2d_bang_tv t where t.user_id = p_uid and p_kenh = 'bang:' || t.bang_id::text);
$$;
revoke all on function public.p2d_vao_kenh(text, uuid) from public, anon, authenticated;

create or replace function public.p2d_bang_cap(p_chuc text)
returns integer language sql immutable set search_path = '' as $$
  select case p_chuc when 'chu' then 3 when 'pho' then 2 when 'truong_lao' then 1 else 0 end;
$$;

create or replace function public.p2d_lap_bang(p_ten text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_ten text := btrim(regexp_replace(coalesce(p_ten, ''), '[[:cntrl:]<>]', '', 'g'));
  v_id  uuid;
begin
  if exists (select 1 from public.p2d_bang_tv where user_id = v_uid) then raise exception 'da_co_bang' using errcode = '22023'; end if;
  if char_length(v_ten) not between 2 and 16 then raise exception 'ten_sai' using errcode = '22023'; end if;
  -- Từ Kim Đan, đủ 5000 Linh Thạch trong bản lưu gần nhất (máy khách tự trừ sau khi lập)
  if not exists (select 1 from public.p2d_nhan_vat n where n.user_id = v_uid and n.canh_gioi >= 2
                 and coalesce((n.data ->> 'lingshi')::numeric, 0) >= 5000) then
    raise exception 'chua_du' using errcode = '22023';
  end if;
  if exists (select 1 from public.p2d_bang where lower(ten) = lower(v_ten)) then raise exception 'trung_ten' using errcode = '23505'; end if;
  insert into public.p2d_bang (ten) values (v_ten) returning id into v_id;
  insert into public.p2d_bang_tv (user_id, bang_id, chuc) values (v_uid, v_id, 'chu');
  return v_id;
end;
$$;

create or replace function public.p2d_tim_bang(p_tim text default '')
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ten', x.ten, 'thong_bao', x.thong_bao, 'si_so', x.si_so, 'chu', x.chu) order by x.si_so desc, x.ten), '[]'::jsonb)
    from (
      select b.id, b.ten, b.thong_bao, count(t.user_id)::integer as si_so,
             max(case when t.chuc = 'chu' then coalesce(nullif(n.ten, ''), 'Đạo hữu') end) as chu
      from public.p2d_bang b
      join public.p2d_bang_tv t on t.bang_id = b.id
      left join public.p2d_nhan_vat n on n.user_id = t.user_id
      where coalesce(p_tim, '') = '' or b.ten ilike '%' || replace(replace(p_tim, '%', ''), '_', '') || '%'
      group by b.id
      order by count(t.user_id) desc, b.ten
      limit 30
    ) x
  );
end;
$$;

create or replace function public.p2d_vao_bang(p_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  if exists (select 1 from public.p2d_bang_tv where user_id = v_uid) then raise exception 'da_co_bang' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = p_id for update;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_bang_tv where bang_id = p_id) >= public.p2d_bang_si_so() then raise exception 'day' using errcode = '22023'; end if;
  insert into public.p2d_bang_tv (user_id, bang_id) values (v_uid, p_id);
end;
$$;

-- Rời bang. Bang chủ rời thì người chức cao nhất, vào sớm nhất lên thay; bang hết người thì giải tán.
create or replace function public.p2d_roi_bang()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_tv  public.p2d_bang_tv%rowtype;
  v_moi uuid;
begin
  delete from public.p2d_bang_tv where user_id = v_uid returning * into v_tv;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_tv.chuc <> 'chu' then return; end if;
  select user_id into v_moi from public.p2d_bang_tv where bang_id = v_tv.bang_id
   order by public.p2d_bang_cap(chuc) desc, vao_luc limit 1;
  if v_moi is null then delete from public.p2d_bang where id = v_tv.bang_id;
  else update public.p2d_bang_tv set chuc = 'chu' where user_id = v_moi; end if;
end;
$$;

-- Đổi chức: chỉ người chức cao hơn cả chức cũ lẫn chức mới của người kia. Bang chủ trao chức chu thì tự xuống phó.
create or replace function public.p2d_doi_chuc(p_uid uuid, p_chuc text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_toi public.p2d_bang_tv%rowtype;
  v_ho  public.p2d_bang_tv%rowtype;
begin
  select * into v_toi from public.p2d_bang_tv where user_id = v_uid;
  select * into v_ho from public.p2d_bang_tv where user_id = p_uid;
  if v_toi.bang_id is null or v_ho.bang_id is distinct from v_toi.bang_id or p_uid = v_uid
     or p_chuc not in ('chu', 'pho', 'truong_lao', 'de_tu') then
    raise exception 'khong_duoc' using errcode = '42501';
  end if;
  if p_chuc = 'chu' and v_toi.chuc = 'chu' then
    update public.p2d_bang_tv set chuc = 'pho' where user_id = v_uid;
    update public.p2d_bang_tv set chuc = 'chu' where user_id = p_uid;
    return;
  end if;
  if public.p2d_bang_cap(v_toi.chuc) <= greatest(public.p2d_bang_cap(v_ho.chuc), public.p2d_bang_cap(p_chuc)) then
    raise exception 'khong_duoc' using errcode = '42501';
  end if;
  update public.p2d_bang_tv set chuc = p_chuc where user_id = p_uid;
end;
$$;

create or replace function public.p2d_duoi(p_uid uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_toi public.p2d_bang_tv%rowtype;
  v_ho  public.p2d_bang_tv%rowtype;
begin
  select * into v_toi from public.p2d_bang_tv where user_id = v_uid;
  select * into v_ho from public.p2d_bang_tv where user_id = p_uid;
  if v_toi.bang_id is null or v_ho.bang_id is distinct from v_toi.bang_id
     or public.p2d_bang_cap(v_toi.chuc) < 2 or public.p2d_bang_cap(v_toi.chuc) <= public.p2d_bang_cap(v_ho.chuc) then
    raise exception 'khong_duoc' using errcode = '42501';
  end if;
  delete from public.p2d_bang_tv where user_id = p_uid;
end;
$$;

create or replace function public.p2d_bang_thong_bao(p_chu text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_toi public.p2d_bang_tv%rowtype;
begin
  select * into v_toi from public.p2d_bang_tv where user_id = v_uid;
  if v_toi.bang_id is null or public.p2d_bang_cap(v_toi.chuc) < 2 then raise exception 'khong_duoc' using errcode = '42501'; end if;
  update public.p2d_bang set thong_bao = left(btrim(regexp_replace(coalesce(p_chu, ''), '[[:cntrl:]<>]', '', 'g')), 120)
   where id = v_toi.bang_id;
end;
$$;

-- Góp tiến độ việc tuần; vượt trần mỗi người thì phần dư bỏ qua
create or replace function public.p2d_bang_gop(p_viec text, p_n integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_bang uuid;
  v_m    record;
  v_n    integer;
begin
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  select * into v_m from public.p2d_bang_muc(p_viec);
  if v_m.muc is null or p_n is null or p_n < 1 then raise exception 'viec_sai' using errcode = '22023'; end if;
  insert into public.p2d_bang_gop as g (tuan, viec, user_id, bang_id, n)
  values (public.p2d_tuan_nay(), p_viec, v_uid, v_bang, least(p_n, v_m.tran))
  on conflict (tuan, viec, user_id) do update set n = least(g.n + excluded.n, v_m.tran), bang_id = excluded.bang_id
  returning n into v_n;
  return v_n;
end;
$$;

-- Nhận thưởng việc tuần: bang đủ mục tiêu, mình có góp, chưa nhận
create or replace function public.p2d_bang_nhan_thuong(p_viec text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_bang uuid;
  v_tuan date := public.p2d_tuan_nay();
begin
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if not exists (select 1 from public.p2d_bang_gop where tuan = v_tuan and viec = p_viec and user_id = v_uid and bang_id = v_bang and n > 0)
     or coalesce((select sum(n) from public.p2d_bang_gop where tuan = v_tuan and viec = p_viec and bang_id = v_bang), 0)
        < (select muc from public.p2d_bang_muc(p_viec)) then
    raise exception 'chua_du' using errcode = '22023';
  end if;
  insert into public.p2d_bang_nhan (tuan, viec, user_id) values (v_tuan, p_viec, v_uid);
exception when unique_violation then
  raise exception 'da_nhan' using errcode = '22023';
end;
$$;

-- Bang của mình: thông tin, thành viên (kèm cảnh giới, công góp tuần này), tiến độ việc tuần, việc mình đã nhận
create or replace function public.p2d_bang_cua_toi()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_tuan date := public.p2d_tuan_nay();
  v_id   uuid;
  v_ten  text;
  v_tb   text;
  v_chuc text;
begin
  select b.id, b.ten, b.thong_bao, t.chuc into v_id, v_ten, v_tb, v_chuc
    from public.p2d_bang_tv t join public.p2d_bang b on b.id = t.bang_id where t.user_id = v_uid;
  if v_id is null then return null; end if;
  return jsonb_build_object(
    'id', v_id, 'ten', v_ten, 'thong_bao', v_tb, 'chuc', v_chuc, 'si_so_toi_da', public.p2d_bang_si_so(),
    'thanh_vien', (
      select coalesce(jsonb_agg(jsonb_build_object('id', t.user_id, 'ten', coalesce(nullif(n.ten, ''), 'Đạo hữu'), 'chuc', t.chuc,
               'canh_gioi', n.canh_gioi, 'gop', coalesce(g.n, 0), 'la_toi', t.user_id = v_uid)
               order by public.p2d_bang_cap(t.chuc) desc, coalesce(g.n, 0) desc), '[]'::jsonb)
      from public.p2d_bang_tv t
      left join public.p2d_nhan_vat n on n.user_id = t.user_id
      left join (select user_id, sum(n)::integer as n from public.p2d_bang_gop where tuan = v_tuan and bang_id = v_id group by user_id) g on g.user_id = t.user_id
      where t.bang_id = v_id),
    'viec', (
      select coalesce(jsonb_object_agg(viec, n), '{}'::jsonb)
      from (select viec, sum(n)::integer as n from public.p2d_bang_gop where tuan = v_tuan and bang_id = v_id group by viec) x),
    'cua_toi', (
      select coalesce(jsonb_object_agg(viec, n), '{}'::jsonb)
      from public.p2d_bang_gop where tuan = v_tuan and user_id = v_uid and bang_id = v_id),
    'da_nhan', (
      select coalesce(jsonb_agg(viec), '[]'::jsonb) from public.p2d_bang_nhan where tuan = v_tuan and user_id = v_uid),
    'tuan', v_tuan);
end;
$$;

revoke all on function public.p2d_bang_muc(text), public.p2d_bang_si_so(), public.p2d_bang_cap(text) from public, anon, authenticated;
revoke all on function public.p2d_lap_bang(text), public.p2d_tim_bang(text), public.p2d_vao_bang(uuid), public.p2d_roi_bang(),
  public.p2d_doi_chuc(uuid, text), public.p2d_duoi(uuid), public.p2d_bang_thong_bao(text), public.p2d_bang_gop(text, integer),
  public.p2d_bang_nhan_thuong(text), public.p2d_bang_cua_toi() from public, anon;
grant execute on function public.p2d_lap_bang(text), public.p2d_tim_bang(text), public.p2d_vao_bang(uuid), public.p2d_roi_bang(),
  public.p2d_doi_chuc(uuid, text), public.p2d_duoi(uuid), public.p2d_bang_thong_bao(text), public.p2d_bang_gop(text, integer),
  public.p2d_bang_nhan_thuong(text), public.p2d_bang_cua_toi() to authenticated;
