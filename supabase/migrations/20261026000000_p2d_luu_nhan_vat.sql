-- Máy chủ 2 (Pixel 2D Tu Tiên): bản lưu nhân vật theo tài khoản.
-- Áp dụng cho dự án Supabase Pixel2DTuTien (idiiyxcfzugrehifhhjx). Bảng mang tiền tố p2d_.
-- Máy khách chỉ đọc dòng của mình; ghi duy nhất qua hàm p2d_luu (kiểm tra trước khi ghi).

create table if not exists public.p2d_nhan_vat (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  canh_gioi  smallint not null default 0 check (canh_gioi between 0 and 8),
  tang       smallint not null default 1 check (tang between 1 and 9),
  phien_ban  integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.p2d_nhan_vat is 'Máy chủ 2: bản lưu nhân vật (cốt truyện, cảnh giới, túi đồ, ngọc). Ghi qua p2d_luu.';

-- Bảng xếp hạng cảnh giới sau này đọc theo cột này
create index if not exists p2d_nhan_vat_canh_gioi_idx on public.p2d_nhan_vat (canh_gioi desc, tang desc);

alter table public.p2d_nhan_vat enable row level security;

revoke all on table public.p2d_nhan_vat from anon, authenticated;
grant select on table public.p2d_nhan_vat to authenticated;

drop policy if exists p2d_nhan_vat_doc_cua_minh on public.p2d_nhan_vat;
create policy p2d_nhan_vat_doc_cua_minh on public.p2d_nhan_vat
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- Đọc bản lưu của chính mình. Trả về null nếu chưa có.
create or replace function public.p2d_tai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('data', n.data, 'phien_ban', n.phien_ban, 'updated_at', n.updated_at)
  from public.p2d_nhan_vat n
  where n.user_id = (select auth.uid());
$$;

-- Ghi bản lưu. Kiểm tra: đã đăng nhập, kích thước, khung dữ liệu, giới hạn cảnh giới,
-- cảnh giới không nhảy vọt quá xa so với lần lưu trước, túi không vượt sức chứa, độ hiếm hợp lệ,
-- và phien_ban khớp để hai máy cùng tài khoản không ghi đè nhau.
create or replace function public.p2d_luu(p_data jsonb, p_phien_ban integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_cu        public.p2d_nhan_vat%rowtype;
  v_canh_gioi integer;
  v_tang      integer;
  v_tong_moi  integer;
  v_tong_cu   integer;
  v_tui       integer;
begin
  if v_uid is null then
    raise exception 'chua_dang_nhap' using errcode = '28000';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  if octet_length(p_data::text) > 200000 then
    raise exception 'du_lieu_qua_lon' using errcode = '22023';
  end if;
  if jsonb_typeof(p_data -> 'realm') <> 'number' or jsonb_typeof(p_data -> 'layer') <> 'number'
     or jsonb_typeof(p_data -> 'qi') <> 'number' or jsonb_typeof(p_data -> 'step') <> 'number' then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;

  v_canh_gioi := (p_data ->> 'realm')::integer;
  v_tang := (p_data ->> 'layer')::integer;
  if v_canh_gioi not between 0 and 8 or v_tang not between 1 and 9 or (p_data ->> 'qi')::numeric < 0 then
    raise exception 'canh_gioi_sai' using errcode = '22023';
  end if;

  -- Túi đồ: tối đa 40 món (data/items.json bag_size), độ hiếm thuộc 5 bậc
  v_tui := coalesce(jsonb_array_length(case when jsonb_typeof(p_data -> 'bag') = 'array' then p_data -> 'bag' end), 0);
  if v_tui > 40 then
    raise exception 'tui_qua_day' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(case when jsonb_typeof(p_data -> 'bag') = 'array' then p_data -> 'bag' end, '[]'::jsonb)) it
    where coalesce(it ->> 'rarity', '') not in ('pham', 'linh', 'huyen', 'dia', 'thien')
  ) then
    raise exception 'do_sai' using errcode = '22023';
  end if;

  select * into v_cu from public.p2d_nhan_vat where user_id = v_uid for update;

  if not found then
    -- Lần lưu đầu: chỉ nhận nhân vật mới bắt đầu (Luyện Khí, tầng thấp)
    if v_canh_gioi > 0 or v_tang > 3 then
      raise exception 'canh_gioi_sai' using errcode = '22023';
    end if;
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban)
    values (v_uid, p_data, v_canh_gioi, v_tang, 1);
    return 1;
  end if;

  if p_phien_ban is distinct from v_cu.phien_ban then
    raise exception 'phien_ban_cu' using errcode = '40001';
  end if;

  -- Mỗi lần lưu chỉ lên tối đa 3 tầng (9 tầng một cảnh giới)
  v_tong_moi := v_canh_gioi * 9 + v_tang - 1;
  v_tong_cu := v_cu.canh_gioi * 9 + v_cu.tang - 1;
  if v_tong_moi > v_tong_cu + 3 then
    raise exception 'canh_gioi_sai' using errcode = '22023';
  end if;

  update public.p2d_nhan_vat
     set data = p_data, canh_gioi = v_canh_gioi, tang = v_tang,
         phien_ban = v_cu.phien_ban + 1, updated_at = now()
   where user_id = v_uid;
  return v_cu.phien_ban + 1;
end;
$$;

revoke all on function public.p2d_tai() from public, anon;
revoke all on function public.p2d_luu(jsonb, integer) from public, anon;
grant execute on function public.p2d_tai() to authenticated;
grant execute on function public.p2d_luu(jsonb, integer) to authenticated;
