-- Chợ trao đổi giữa người chơi: rao bán trang bị hoặc nguyên liệu lấy Linh Thạch, thuế 10% trừ vào người bán
-- (data/market.json "tax" phải khớp số ở đây). Đồ và tiền chuyển qua hòm thư p2d_hom_thu: máy khách xem thư,
-- nhận những thư còn chỗ trong túi, cộng vào bản lưu rồi lưu lại. Máy khách không đọc ghi thẳng hai bảng.
-- Kiểm tra dựa trên bản lưu gần nhất trên máy chủ (p2d_nhan_vat), cộng các lần rao bán, mua sau lần lưu đó.

create table if not exists public.p2d_cho (
  id         bigint generated always as identity primary key,
  nguoi_ban  uuid not null references auth.users (id) on delete cascade,
  ten_ban    text not null,
  loai       text not null check (loai in ('mon', 'nl')),
  mon        jsonb not null,
  gia        integer not null check (gia between 1 and 10000000),
  trang_thai text not null default 'mo' check (trang_thai in ('mo', 'da_ban', 'huy', 'het_han')),
  nguoi_mua  uuid references auth.users (id) on delete set null,
  tao_luc    timestamptz not null default now(),
  het_han    timestamptz not null default now() + interval '48 hours',
  xong_luc   timestamptz
);
create index if not exists p2d_cho_mo_idx on public.p2d_cho (tao_luc desc) where trang_thai = 'mo';
create index if not exists p2d_cho_ban_idx on public.p2d_cho (nguoi_ban, trang_thai);
create index if not exists p2d_cho_mua_idx on public.p2d_cho (nguoi_mua, xong_luc);

create table if not exists public.p2d_hom_thu (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  noi_dung jsonb not null,
  ly_do    text not null,
  tao_luc  timestamptz not null default now(),
  nhan_luc timestamptz
);
create index if not exists p2d_hom_thu_user_idx on public.p2d_hom_thu (user_id) where nhan_luc is null;

alter table public.p2d_cho enable row level security;
alter table public.p2d_hom_thu enable row level security;
revoke all on table public.p2d_cho, public.p2d_hom_thu from anon, authenticated;

create or replace function public.p2d_uid()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare v uuid := (select auth.uid());
begin
  if v is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  return v;
end;
$$;

-- Món quá hạn: đóng và gửi trả người bán
create or replace function public.p2d_don_cho()
returns void
language sql
security definer
set search_path = ''
as $$
  with h as (
    update public.p2d_cho set trang_thai = 'het_han', xong_luc = now()
     where trang_thai = 'mo' and het_han < now()
    returning nguoi_ban, loai, mon
  )
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
  select nguoi_ban, case loai when 'mon' then jsonb_build_object('item', mon) else jsonb_build_object('mat', mon) end, 'het_han' from h;
$$;
revoke all on function public.p2d_don_cho() from public, anon, authenticated;

create or replace function public.p2d_dang_ban(p_loai text, p_mon jsonb, p_gia integer)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_nv  public.p2d_nhan_vat%rowtype;
  v_id  bigint;
  v_n   integer;
begin
  if p_gia is null or p_gia not between 1 and 10000000 then raise exception 'gia_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_cho where nguoi_ban = v_uid and trang_thai = 'mo') >= 10 then
    raise exception 'qua_nhieu' using errcode = '54000';
  end if;
  if jsonb_typeof(p_mon) <> 'object' or octet_length(p_mon::text) > 3000 then raise exception 'mon_sai' using errcode = '22023'; end if;

  if p_loai = 'mon' then
    if coalesce(p_mon ->> 'rarity', '') not in ('pham', 'linh', 'huyen', 'dia', 'thien')
       or coalesce(p_mon ->> 'base', '') !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(p_mon -> 'uid') <> 'number' then
      raise exception 'mon_sai' using errcode = '22023';
    end if;
    -- Món phải có trong túi ở bản lưu gần nhất, chưa đem rao từ sau lần lưu đó, và không đang mặc
    if not exists (select 1 from jsonb_array_elements(coalesce(v_nv.data -> 'bag', '[]'::jsonb)) it where it -> 'uid' = p_mon -> 'uid')
       or exists (select 1 from jsonb_each(coalesce(v_nv.data -> 'equip', '{}'::jsonb)) e where e.value = p_mon -> 'uid')
       or exists (select 1 from public.p2d_cho c where c.nguoi_ban = v_uid and c.loai = 'mon' and c.mon -> 'uid' = p_mon -> 'uid'
                  and c.tao_luc > v_nv.updated_at) then
      raise exception 'khong_co' using errcode = '22023';
    end if;
  elsif p_loai = 'nl' then
    if coalesce(p_mon ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(p_mon -> 'n') <> 'number'
       or (p_mon ->> 'n')::numeric not between 1 and 999 or (p_mon ->> 'n')::numeric <> floor((p_mon ->> 'n')::numeric) then
      raise exception 'mon_sai' using errcode = '22023';
    end if;
    p_mon := jsonb_build_object('id', p_mon ->> 'id', 'n', (p_mon ->> 'n')::integer);
    select coalesce(sum((c.mon ->> 'n')::integer), 0) into v_n from public.p2d_cho c
     where c.nguoi_ban = v_uid and c.loai = 'nl' and c.mon ->> 'id' = p_mon ->> 'id' and c.tao_luc > v_nv.updated_at;
    if coalesce((v_nv.data -> 'mats' ->> (p_mon ->> 'id'))::numeric, 0) < v_n + (p_mon ->> 'n')::integer then
      raise exception 'khong_co' using errcode = '22023';
    end if;
  else
    raise exception 'loai_sai' using errcode = '22023';
  end if;

  insert into public.p2d_cho (nguoi_ban, ten_ban, loai, mon, gia)
  values (v_uid, coalesce(nullif(v_nv.ten, ''), 'Đạo hữu'), p_loai, p_mon, p_gia)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.p2d_huy_ban(p_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_c   public.p2d_cho%rowtype;
begin
  update public.p2d_cho set trang_thai = 'huy', xong_luc = now()
   where id = p_id and nguoi_ban = v_uid and trang_thai = 'mo'
  returning * into v_c;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
  values (v_uid, case v_c.loai when 'mon' then jsonb_build_object('item', v_c.mon) else jsonb_build_object('mat', v_c.mon) end, 'huy');
end;
$$;

create or replace function public.p2d_mua(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_c    public.p2d_cho%rowtype;
  v_tieu bigint;
  v_thue integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  select * into v_c from public.p2d_cho where id = p_id for update;
  if not found or v_c.trang_thai <> 'mo' or v_c.het_han < now() then raise exception 'da_ban' using errcode = '22023'; end if;
  if v_c.nguoi_ban = v_uid then raise exception 'cua_minh' using errcode = '22023'; end if;
  -- Linh Thạch trong bản lưu gần nhất trừ đi các món đã mua sau lần lưu đó
  select coalesce(sum(gia), 0) into v_tieu from public.p2d_cho where nguoi_mua = v_uid and xong_luc > v_nv.updated_at;
  if coalesce((v_nv.data ->> 'lingshi')::numeric, 0) < v_tieu + v_c.gia then raise exception 'thieu_tien' using errcode = '22023'; end if;

  v_thue := ceil(v_c.gia * 0.1);
  update public.p2d_cho set trang_thai = 'da_ban', nguoi_mua = v_uid, xong_luc = now() where id = p_id;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values
    (v_uid, case v_c.loai when 'mon' then jsonb_build_object('item', v_c.mon) else jsonb_build_object('mat', v_c.mon) end, 'mua'),
    (v_c.nguoi_ban, jsonb_build_object('coins', v_c.gia - v_thue, 'sold', v_c.mon), 'ban');
  return jsonb_build_object('gia', v_c.gia);
end;
$$;

-- Danh sách đang bán (mới trước), lọc theo loại
create or replace function public.p2d_xem_cho(p_loai text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  perform public.p2d_don_cho();
  return (
    select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ten', x.ten_ban, 'loai', x.loai, 'mon', x.mon, 'gia', x.gia,
             'het_han', x.het_han, 'la_toi', x.nguoi_ban = v_uid) order by x.tao_luc desc), '[]'::jsonb)
    from (select * from public.p2d_cho c where c.trang_thai = 'mo' and (p_loai is null or c.loai = p_loai)
          order by c.tao_luc desc limit 60) x
  );
end;
$$;

-- Thư chưa nhận (để máy khách chọn những thư còn chỗ trong túi)
create or replace function public.p2d_xem_thu()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  perform public.p2d_don_cho();
  return (select coalesce(jsonb_agg(jsonb_build_object('id', t.id, 'noi_dung', t.noi_dung, 'ly_do', t.ly_do) order by t.id), '[]'::jsonb)
            from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null);
end;
$$;

-- Nhận các thư đã chọn; trả về đúng những thư vừa nhận (thư đã nhận rồi không trả lại lần hai)
create or replace function public.p2d_nhan_thu(p_ids bigint[])
returns jsonb
language sql
security definer
set search_path = ''
as $$
  with n as (
    update public.p2d_hom_thu set nhan_luc = now()
     where user_id = public.p2d_uid() and nhan_luc is null and id = any (p_ids)
    returning id, noi_dung, ly_do
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'noi_dung', noi_dung, 'ly_do', ly_do) order by id), '[]'::jsonb) from n;
$$;

revoke all on function public.p2d_uid() from public, anon;
revoke all on function public.p2d_dang_ban(text, jsonb, integer), public.p2d_huy_ban(bigint), public.p2d_mua(bigint),
  public.p2d_xem_cho(text), public.p2d_xem_thu(), public.p2d_nhan_thu(bigint[]) from public, anon;
grant execute on function public.p2d_dang_ban(text, jsonb, integer), public.p2d_huy_ban(bigint), public.p2d_mua(bigint),
  public.p2d_xem_cho(text), public.p2d_xem_thu(), public.p2d_nhan_thu(bigint[]) to authenticated;
