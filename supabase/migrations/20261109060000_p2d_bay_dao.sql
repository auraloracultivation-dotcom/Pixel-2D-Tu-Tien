-- Bày cảnh (chủ dự án 09/11/2026 13:44-13:51: "cho tôi tự sắp xếp đồ hoạ trong game: chạm vào món nào cũng di chuyển, phóng to thu nhỏ;
-- kho vô hạn trong túi cái gì cũng có; tôi đặt ở đâu toàn bộ game đổi theo"). Mỗi bản đồ một bố cục đồ (cùng dạng khoá hoi.do của
-- data/maps/<id>.json: [mã hình, x, y, nhãn|null, {s: cỡ, f: lật}]). Ai cũng đọc được (game tải lúc vào), chỉ người có quyền bày
-- (p2d_bay_quyen, chủ dự án) mới ghi, và chỉ qua hàm p2d_bay_luu. Mỗi lần lưu chép bản trước vào p2d_bay_ls để quay lại được.

create table if not exists public.p2d_bay_dao (
  map_id text primary key check (map_id ~ '^[a-z0-9-]{1,40}$'),
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 1500),
  ver integer not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
alter table public.p2d_bay_dao enable row level security;
revoke all on table public.p2d_bay_dao from public, anon, authenticated;
grant select on table public.p2d_bay_dao to anon, authenticated;
drop policy if exists p2d_bay_dao_doc on public.p2d_bay_dao;
create policy p2d_bay_dao_doc on public.p2d_bay_dao for select to anon, authenticated using (true);

create table if not exists public.p2d_bay_quyen (user_id uuid primary key);
alter table public.p2d_bay_quyen enable row level security;
revoke all on table public.p2d_bay_quyen from public, anon, authenticated;

create table if not exists public.p2d_bay_ls (
  id bigint generated always as identity primary key,
  map_id text not null, items jsonb not null, ver integer not null,
  luc timestamptz not null default now(), user_id uuid
);
alter table public.p2d_bay_ls enable row level security;
revoke all on table public.p2d_bay_ls from public, anon, authenticated;
create index if not exists p2d_bay_ls_map on public.p2d_bay_ls (map_id, id desc);

create or replace function public.p2d_bay_co_quyen() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.p2d_bay_quyen q where q.user_id = auth.uid())
$$;

-- Lưu bố cục một bản đồ. p_ver: bản người bày đang sửa (lệch thì báo, tránh hai máy ghi đè nhau).
create or replace function public.p2d_bay_luu(p_map text, p_items jsonb, p_ver integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare cur public.p2d_bay_dao; e jsonb;
begin
  if not public.p2d_bay_co_quyen() then raise exception 'khong co quyen bay canh' using errcode = '42501'; end if;
  if p_map !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 1500 then
    raise exception 'du lieu khong hop le' using errcode = '22023'; end if;
  for e in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(e) <> 'array' or jsonb_typeof(e->0) <> 'string' or length(e->>0) > 60 or jsonb_typeof(e->1) <> 'number' or jsonb_typeof(e->2) <> 'number'
       or (e->>3 is not null and length(e->>3) > 60) then
      raise exception 'mon khong hop le: %', left(e::text, 80) using errcode = '22023'; end if;
  end loop;
  select * into cur from public.p2d_bay_dao where map_id = p_map for update;
  if found then
    if cur.ver <> coalesce(p_ver, cur.ver) then raise exception 'ban da doi (ver %), tai lai roi bay tiep', cur.ver using errcode = '40001'; end if;
    insert into public.p2d_bay_ls (map_id, items, ver, user_id) values (p_map, cur.items, cur.ver, cur.updated_by);
    update public.p2d_bay_dao set items = p_items, ver = cur.ver + 1, updated_at = now(), updated_by = auth.uid() where map_id = p_map;
    return cur.ver + 1;
  end if;
  insert into public.p2d_bay_dao (map_id, items, ver, updated_by) values (p_map, p_items, 1, auth.uid());
  return 1;
end $$;

-- Danh sách bản cũ của một bản đồ (mới trước) và lấy lại một bản (ghi thành bản mới, bản đang có vào lịch sử)
create or replace function public.p2d_bay_lich_su(p_map text) returns table (id bigint, ver integer, luc timestamptz, n integer)
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.p2d_bay_co_quyen() then raise exception 'khong co quyen bay canh' using errcode = '42501'; end if;
  return query select l.id, l.ver, l.luc, jsonb_array_length(l.items) from public.p2d_bay_ls l where l.map_id = p_map order by l.id desc limit 30;
end $$;

create or replace function public.p2d_bay_lay_lai(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r public.p2d_bay_ls;
begin
  if not public.p2d_bay_co_quyen() then raise exception 'khong co quyen bay canh' using errcode = '42501'; end if;
  select * into r from public.p2d_bay_ls where id = p_id;
  if not found then raise exception 'khong co ban nay' using errcode = 'P0002'; end if;
  return r.items;
end $$;

revoke all on function public.p2d_bay_co_quyen(), public.p2d_bay_luu(text, jsonb, integer), public.p2d_bay_lich_su(text), public.p2d_bay_lay_lai(bigint) from public, anon;
grant execute on function public.p2d_bay_co_quyen(), public.p2d_bay_luu(text, jsonb, integer), public.p2d_bay_lich_su(text), public.p2d_bay_lay_lai(bigint) to authenticated;
