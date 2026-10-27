-- Chống gian lận (chủ dự án duyệt "sửa toàn bộ" 27/10/2026 20:27).
-- Trước đây máy chủ nhận nguyên bản lưu do máy người chơi gửi, nên sửa vài dòng trong trình duyệt là có tiền tỉ,
-- lực chiến trăm triệu, đứng đầu bảng xếp hạng; chợ còn cho rao món giả, nhân bản đồ, mua không mất tiền.
-- Bản này:
--   1. p2d_luu: Linh Thạch và nguyên liệu tăng theo "thùng hạn mức" (đầy dần theo thời gian thật, theo cảnh giới);
--      vượt thì cắt về mức cho phép và ghi nghi vấn. Lực chiến có trần theo cảnh giới, tầng tháp tăng theo thời gian.
--      Món đã đem rao không được quay lại túi. Tiên Ngọc, quà ra mắt, thẻ tháng do máy chủ giữ.
--   2. Chợ: máy chủ tự lấy món từ bản lưu trên máy chủ (không tin món máy khách gửi), kiểm tra chỉ số món,
--      trừ đồ, trừ tiền NGAY khi rao, khi mua; khoá dòng nhân vật để bấm dồn không lách được.
--      Hòm thư: máy chủ tự cộng tiền, đồ, nguyên liệu vào bản lưu. Mỗi lần máy chủ sửa bản lưu thì tăng phien_ban
--      và trả về để máy khách theo kịp.
--   3. Bảng xếp hạng đọc cột máy chủ đã kiểm tra, nhớ tạm 60 giây; tài khoản nghi vấn nhiều (>= 10) không lên bảng, không vào chợ.
--   4. Chat khoá theo người gửi (bấm dồn không lách nhịp), bỏ ký tự vô hình. Tên hiển thị tách khỏi tên đăng nhập.
--   5. Realtime: chỉ người đã đăng nhập vào được kênh p2d:* và p2d-to:* (kênh riêng tư).
-- Mọi lỗi dùng mã thường (22023, 42501, 54000, P0001), không dùng 40001 (PostgREST tự chạy lại → treo máy chủ).

-- ===================== 1. Cột và bảng mới =====================
alter table public.p2d_nhan_vat
  add column if not exists luu_luc     timestamptz not null default now(),   -- lần máy khách lưu gần nhất (đo thời gian thật)
  add column if not exists lt_xo       numeric     not null default 0,       -- thùng hạn mức Linh Thạch còn lại
  add column if not exists nl_xo       numeric     not null default 0,       -- thùng hạn mức nguyên liệu còn lại
  add column if not exists tien_ngoc   integer     not null default 0 check (tien_ngoc >= 0),
  add column if not exists tn_qua      boolean     not null default false,   -- đã nhận quà ra mắt Tiên Ngọc
  add column if not exists the_den     timestamptz,                          -- thẻ tháng còn tới
  add column if not exists the_nhan    text,                                 -- ngày nhận quà thẻ gần nhất (dạng như máy khách: 2026-10-7)
  add column if not exists nghi_van    integer     not null default 0,
  add column if not exists ten_doi_luc timestamptz;

-- Điền cho các nhân vật có sẵn (chỉ điền cột mới, không đổi dữ liệu cũ)
update public.p2d_nhan_vat set
  luu_luc   = updated_at,
  lt_xo     = 20000 + 40 * power(2.2, canh_gioi) * 1800,
  nl_xo     = 500 + (2 + canh_gioi) * 1800,
  tien_ngoc = least(greatest(coalesce(case when jsonb_typeof(data -> 'tn') = 'number' then (data ->> 'tn')::numeric end, 0), 0), 100000)::integer,
  tn_qua    = coalesce(case when jsonb_typeof(data -> 'tnStarter') = 'boolean' then (data ->> 'tnStarter')::boolean end, false)
where luu_luc = created_at or lt_xo = 0;

-- Nhật ký nghi vấn (chủ dự án xem trong Supabase; máy khách không đọc)
create table if not exists public.p2d_nghi_van (
  id       bigint generated always as identity primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  ly_do    text not null,
  chi_tiet jsonb not null default '{}'::jsonb,
  luc      timestamptz not null default now()
);
create index if not exists p2d_nghi_van_user_idx on public.p2d_nghi_van (user_id, luc desc);
alter table public.p2d_nghi_van enable row level security;
revoke all on table public.p2d_nghi_van from anon, authenticated;

-- Ngưỡng chỉ số trang bị: khớp data/items.json (tools/check.mjs so sánh). chinh = chỉ số chính lớn nhất của mọi món gốc,
-- dong = max của dòng phụ; pct = chỉ số phần trăm (không lớn theo cấp).
create table if not exists public.p2d_chi_so (
  stat  text primary key,
  chinh numeric not null,
  dong  numeric not null,
  pct   boolean not null
);
insert into public.p2d_chi_so (stat, chinh, dong, pct) values
  ('atk', 7, 6, false), ('atk_pct', 6, 8, true), ('hp', 100, 30, false), ('hp_pct', 6, 10, true), ('def', 8, 4, false),
  ('crit', 6, 5, true), ('crit_dmg', 12, 20, true), ('cdr', 5, 6, true), ('speed', 7, 5, true), ('qi_gain', 6, 10, true)
on conflict (stat) do update set chinh = excluded.chinh, dong = excluded.dong, pct = excluded.pct;
alter table public.p2d_chi_so enable row level security;
revoke all on table public.p2d_chi_so from anon, authenticated;

-- Độ hiếm: hệ số, số dòng phụ, số lỗ khảm (data/items.json rarities)
create table if not exists public.p2d_pham (
  id   text primary key,
  mult numeric not null,
  dong integer not null,
  lo   integer not null
);
insert into public.p2d_pham (id, mult, dong, lo) values
  ('pham', 1.0, 1, 0), ('linh', 1.2, 2, 1), ('huyen', 1.45, 3, 1), ('dia', 1.75, 4, 2), ('thien', 2.1, 5, 3)
on conflict (id) do update set mult = excluded.mult, dong = excluded.dong, lo = excluded.lo;
alter table public.p2d_pham enable row level security;
revoke all on table public.p2d_pham from anon, authenticated;

-- Giá quầy Tiên Ngọc (data/topup.json shop) và quà (starter, thẻ tháng); tools/check.mjs so sánh
create table if not exists public.p2d_tn_gia (
  ma text primary key,
  tn integer not null check (tn >= 0)
);
insert into public.p2d_tn_gia (ma, tn) values
  ('da-tay', 60), ('ngoc-3', 90), ('ruong-dia', 180), ('ao-tien-nhan', 300), ('ao-hoang-kim', 600),
  ('_qua_ra_mat', 100), ('_the_ngay', 100), ('_the_ngay_lt', 300)
on conflict (ma) do update set tn = excluded.tn;
alter table public.p2d_tn_gia enable row level security;
revoke all on table public.p2d_tn_gia from anon, authenticated;

-- Bảng xếp hạng nhớ tạm (60 giây)
create table if not exists public.p2d_bxh_nho (
  loai text primary key,
  top  jsonb not null,
  luc  timestamptz not null default now()
);
alter table public.p2d_bxh_nho enable row level security;
revoke all on table public.p2d_bxh_nho from anon, authenticated;

-- Giới hạn đăng ký theo địa chỉ mạng (hàm dang-ky dùng quyền máy chủ ghi; lưu mã băm, không lưu IP thật)
create table if not exists public.p2d_dang_ky_ip (
  id  bigint generated always as identity primary key,
  ip  text not null,
  luc timestamptz not null default now()
);
create index if not exists p2d_dang_ky_ip_idx on public.p2d_dang_ky_ip (ip, luc desc);
alter table public.p2d_dang_ky_ip enable row level security;
revoke all on table public.p2d_dang_ky_ip from anon, authenticated;

-- ===================== 2. Hàm phụ =====================
-- Tên mặc định khi chưa đặt: "Đạo hữu" + 4 ký tự (không lộ tên đăng nhập)
create or replace function public.p2d_ten_mac_dinh(p_uid uuid)
returns text
language sql
immutable
set search_path = ''
as $$ select 'Đạo hữu ' || upper(left(md5(p_uid::text), 4)); $$;
revoke all on function public.p2d_ten_mac_dinh(uuid) from public, anon, authenticated;

-- Món có hợp lệ không: độ hiếm, cấp, cường hóa, chỉ số chính và dòng phụ không vượt mức tối đa có thể tung ra
create or replace function public.p2d_mon_hop_le(p_mon jsonb, p_cap integer default 81)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_r   public.p2d_pham%rowtype;
  v_lvl numeric;
  v_e   record;
  v_c   public.p2d_chi_so%rowtype;
begin
  if p_mon is null or jsonb_typeof(p_mon) <> 'object' or octet_length(p_mon::text) > 3000 then return false; end if;
  select * into v_r from public.p2d_pham where id = p_mon ->> 'rarity';
  if not found then return false; end if;
  if coalesce(p_mon ->> 'base', '') !~ '^[a-z0-9-]{1,40}$' then return false; end if;
  if jsonb_typeof(p_mon -> 'uid') is distinct from 'number' then return false; end if;
  if jsonb_typeof(p_mon -> 'lvl') is distinct from 'number' then return false; end if;
  v_lvl := (p_mon ->> 'lvl')::numeric;
  if v_lvl < 0 or v_lvl > least(p_cap, 81) or v_lvl <> floor(v_lvl) then return false; end if;
  if p_mon ? 'plus' and p_mon -> 'plus' <> 'null'::jsonb
     and (jsonb_typeof(p_mon -> 'plus') <> 'number' or (p_mon ->> 'plus')::numeric not between 0 and 10) then
    return false;
  end if;
  if jsonb_typeof(coalesce(p_mon -> 'main', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_mon -> 'lines', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_mon -> 'lines', '[]'::jsonb)) > v_r.dong then
    return false;
  end if;
  if p_mon ? 'sockets' and (jsonb_typeof(p_mon -> 'sockets') <> 'array' or jsonb_array_length(p_mon -> 'sockets') > v_r.lo) then
    return false;
  end if;
  for v_e in select key, value from jsonb_each(coalesce(p_mon -> 'main', '{}'::jsonb)) loop
    select * into v_c from public.p2d_chi_so where stat = v_e.key;
    if not found or jsonb_typeof(v_e.value) <> 'number' or v_e.value::numeric < 0
       or v_e.value::numeric > ceil(v_c.chinh * (case when v_c.pct then 1 else 1 + v_lvl * 0.12 end) * v_r.mult) + 1 then
      return false;
    end if;
  end loop;
  for v_e in select value from jsonb_array_elements(coalesce(p_mon -> 'lines', '[]'::jsonb)) loop
    select * into v_c from public.p2d_chi_so where stat = v_e.value ->> 's';
    if not found or jsonb_typeof(v_e.value -> 'v') is distinct from 'number' or (v_e.value ->> 'v')::numeric < 0
       or (v_e.value ->> 'v')::numeric > ceil(v_c.dong * (case when v_c.pct then 1 else 1 + v_lvl * 0.08 end) * v_r.mult) + 1 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.p2d_mon_hop_le(jsonb, integer) from public, anon, authenticated;

-- Trigger cũ tính lực chiến, tháp thẳng từ bản lưu (máy khách tự khai). Giờ p2d_luu tính sau khi kiểm tra;
-- trigger chỉ còn điền tên mặc định.
create or replace function public.p2d_dien_bxh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.ten = '' then new.ten := public.p2d_ten_mac_dinh(new.user_id); end if;
  return new;
end;
$$;
revoke all on function public.p2d_dien_bxh() from public, anon, authenticated;

-- ===================== 3. Lưu nhân vật =====================
create or replace function public.p2d_luu(p_data jsonb, p_phien_ban integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_cu        public.p2d_nhan_vat%rowtype;
  v_moi       boolean;
  v_data      jsonb := p_data;
  v_canh_gioi integer;
  v_tang      integer;
  v_tui       integer;
  v_dt        numeric;
  v_toc       numeric;
  v_xo        numeric;
  v_xo_nl     numeric;
  v_lt_cu     numeric;
  v_lt_moi    numeric;
  v_tang_nl   numeric;
  v_tile      numeric;
  v_luc       numeric;
  v_tran_luc  numeric;
  v_thap      numeric;
  v_bo        jsonb;
  v_bag       jsonb;
  v_thien     integer;
  v_dia       integer;
  v_sai       integer;
  v_ly_do     text[] := '{}';
  v_pb        integer;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if octet_length(p_data::text) > 200000 then raise exception 'du_lieu_qua_lon' using errcode = '22023'; end if;
  if jsonb_typeof(p_data -> 'realm') is distinct from 'number' or jsonb_typeof(p_data -> 'layer') is distinct from 'number'
     or jsonb_typeof(p_data -> 'qi') is distinct from 'number' or jsonb_typeof(p_data -> 'step') is distinct from 'number' then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  v_canh_gioi := (p_data ->> 'realm')::integer;
  v_tang := (p_data ->> 'layer')::integer;
  if v_canh_gioi not between 0 and 8 or v_tang not between 1 and 9 or (p_data ->> 'qi')::numeric < 0 then
    raise exception 'canh_gioi_sai' using errcode = '22023';
  end if;
  -- Linh Thạch, nguyên liệu: đúng kiểu, không âm, không vượt trần tuyệt đối
  if p_data ? 'lingshi' and p_data -> 'lingshi' <> 'null'::jsonb and jsonb_typeof(p_data -> 'lingshi') <> 'number' then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  v_lt_moi := coalesce(case when jsonb_typeof(p_data -> 'lingshi') = 'number' then (p_data ->> 'lingshi')::numeric end, 0);
  if v_lt_moi < 0 or v_lt_moi > 2000000000 then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if p_data ? 'mats' and jsonb_typeof(p_data -> 'mats') <> 'object' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_each(coalesce(p_data -> 'mats', '{}'::jsonb)) e
             where jsonb_typeof(e.value) <> 'number' or e.value::numeric < 0 or e.value::numeric > 10000000) then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  -- Túi đồ: tối đa 40 món, mỗi món có mã số, độ hiếm thuộc 5 bậc
  if p_data ? 'bag' and jsonb_typeof(p_data -> 'bag') <> 'array' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  v_tui := coalesce(jsonb_array_length(p_data -> 'bag'), 0);
  if v_tui > 40 then raise exception 'tui_qua_day' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_data -> 'bag', '[]'::jsonb)) it
             where jsonb_typeof(it) <> 'object' or jsonb_typeof(it -> 'uid') is distinct from 'number'
                or coalesce(it ->> 'rarity', '') not in ('pham', 'linh', 'huyen', 'dia', 'thien')) then
    raise exception 'do_sai' using errcode = '22023';
  end if;

  select * into v_cu from public.p2d_nhan_vat where user_id = v_uid for update;
  v_moi := not found;
  if v_moi then
    -- Lần lưu đầu: chỉ nhận nhân vật mới bắt đầu; hạn mức ban đầu nhỏ
    if v_canh_gioi > 0 or v_tang > 3 then raise exception 'canh_gioi_sai' using errcode = '22023'; end if;
    v_cu.data := '{}'::jsonb; v_cu.canh_gioi := 0; v_cu.tang := 1; v_cu.thap := 0; v_cu.phien_ban := 0; v_cu.nghi_van := 0;
    v_cu.lt_xo := 2000; v_cu.nl_xo := 300; v_cu.luu_luc := now();
    v_cu.tien_ngoc := 0; v_cu.tn_qua := false; v_cu.the_den := null; v_cu.the_nhan := null;
  else
    if p_phien_ban is distinct from v_cu.phien_ban then
      raise exception 'phien_ban_cu' using errcode = 'P0001';
    end if;
    -- Mỗi lần lưu lên tối đa một cảnh giới (lên cảnh giới phải qua thiên kiếp, từng bậc một)
    if v_canh_gioi > v_cu.canh_gioi + 1 then raise exception 'canh_gioi_sai' using errcode = '22023'; end if;
  end if;

  -- Thời gian thật từ lần lưu trước (tối đa 12 giờ)
  v_dt := least(greatest(extract(epoch from (now() - v_cu.luu_luc)), 0), 43200);

  -- (a) Linh Thạch: thùng hạn mức đầy dần theo cảnh giới (rộng tay: gấp nhiều lần tốc độ đánh quái nhanh nhất)
  v_toc := 40 * power(2.2, v_cu.canh_gioi);
  v_xo := least(20000 + v_toc * 1800, v_cu.lt_xo + v_toc * v_dt);
  v_lt_cu := coalesce(case when jsonb_typeof(v_cu.data -> 'lingshi') = 'number' then (v_cu.data ->> 'lingshi')::numeric end, 0);
  if v_lt_moi - v_lt_cu > v_xo then
    v_lt_moi := v_lt_cu + floor(v_xo);
    v_data := jsonb_set(v_data, '{lingshi}', to_jsonb(v_lt_moi));
    v_ly_do := v_ly_do || 'linh_thach';
    v_xo := 0;
  elsif v_lt_moi > v_lt_cu then
    v_xo := v_xo - (v_lt_moi - v_lt_cu);
  end if;

  -- (b) Nguyên liệu: cùng cách, tính tổng phần tăng của mọi loại
  v_toc := 2 + v_cu.canh_gioi;
  v_xo_nl := least(500 + v_toc * 1800, v_cu.nl_xo + v_toc * v_dt);
  select coalesce(sum(greatest(n.value::numeric - coalesce(o.value::numeric, 0), 0)), 0) into v_tang_nl
    from jsonb_each(coalesce(v_data -> 'mats', '{}'::jsonb)) n
    left join jsonb_each(coalesce(v_cu.data -> 'mats', '{}'::jsonb)) o on o.key = n.key and jsonb_typeof(o.value) = 'number';
  if v_tang_nl > v_xo_nl then
    v_tile := v_xo_nl / v_tang_nl;
    v_data := jsonb_set(v_data, '{mats}', coalesce((
      select jsonb_object_agg(n.key, case when n.value::numeric > coalesce(o.value::numeric, 0)
                                          then to_jsonb(coalesce(o.value::numeric, 0) + floor((n.value::numeric - coalesce(o.value::numeric, 0)) * v_tile))
                                          else n.value end)
        from jsonb_each(v_data -> 'mats') n
        left join jsonb_each(coalesce(v_cu.data -> 'mats', '{}'::jsonb)) o on o.key = n.key and jsonb_typeof(o.value) = 'number'), '{}'::jsonb));
    v_ly_do := v_ly_do || 'nguyen_lieu';
    v_xo_nl := 0;
  else
    v_xo_nl := v_xo_nl - v_tang_nl;
  end if;

  -- (c) Món đã đem rao (đang bán, đã bán, đã thu về qua hòm thư) không được quay lại túi
  select coalesce(jsonb_agg(c.mon -> 'uid'), '[]'::jsonb) into v_bo
    from public.p2d_cho c where c.nguoi_ban = v_uid and c.loai = 'mon';
  if jsonb_array_length(v_bo) > 0 then
    select coalesce(jsonb_agg(it), '[]'::jsonb) into v_bag
      from jsonb_array_elements(coalesce(v_data -> 'bag', '[]'::jsonb)) it where not (v_bo @> jsonb_build_array(it -> 'uid'));
    if jsonb_array_length(v_bag) < v_tui then
      v_data := jsonb_set(v_data, '{bag}', v_bag);
      v_ly_do := v_ly_do || 'do_da_rao';
    end if;
  end if;
  -- mã số món chỉ tăng (không dùng lại mã cũ)
  if coalesce(case when jsonb_typeof(v_data -> 'nextUid') = 'number' then (v_data ->> 'nextUid')::numeric end, 0)
     < coalesce(case when jsonb_typeof(v_cu.data -> 'nextUid') = 'number' then (v_cu.data ->> 'nextUid')::numeric end, 0) then
    v_data := jsonb_set(v_data, '{nextUid}', v_cu.data -> 'nextUid');
  end if;

  -- (d) Món mới: quá nhiều món Thiên/Địa trong thời gian ngắn, hoặc chỉ số vượt mức tung được → ghi nghi vấn
  select count(*) filter (where n ->> 'rarity' = 'thien'), count(*) filter (where n ->> 'rarity' = 'dia'),
         count(*) filter (where not public.p2d_mon_hop_le(n))
    into v_thien, v_dia, v_sai
    from jsonb_array_elements(coalesce(v_data -> 'bag', '[]'::jsonb)) n
   where not exists (select 1 from jsonb_array_elements(coalesce(v_cu.data -> 'bag', '[]'::jsonb)) o where o -> 'uid' = n -> 'uid');
  if v_thien > 2 + v_dt / 600 or v_dia > 4 + v_dt / 120 then v_ly_do := v_ly_do || 'do_hiem'; end if;
  if v_sai > 0 then v_ly_do := v_ly_do || 'do_sai_chi_so'; end if;

  -- (e) Lực chiến: trần theo cảnh giới. Tầng tháp: mỗi tầng ít nhất 5 giây.
  v_tran_luc := 6000 * power(1.6, v_canh_gioi);
  v_luc := least(greatest(coalesce(case when jsonb_typeof(p_data -> 'power') = 'number' then (p_data ->> 'power')::numeric end, 0), 0), 100000000);
  if v_luc > v_tran_luc then v_luc := v_tran_luc; v_ly_do := v_ly_do || 'luc_chien'; end if;
  v_thap := least(greatest(coalesce(case when jsonb_typeof(p_data -> 'tower' -> 'best') = 'number' then (p_data -> 'tower' ->> 'best')::numeric end, 0), 0), 100000);
  if v_thap > v_cu.thap + 1 + floor(v_dt / 5) then v_thap := v_cu.thap + 1 + floor(v_dt / 5); v_ly_do := v_ly_do || 'thap'; end if;

  -- (f) Tiên Ngọc, quà ra mắt, thẻ tháng: máy chủ giữ, máy khách gửi gì cũng thay bằng số trên máy chủ
  v_data := (v_data - 'tn' - 'tnStarter' - 'card')
            || jsonb_build_object('tn', v_cu.tien_ngoc, 'tnStarter', v_cu.tn_qua)
            || case when v_cu.the_den is not null
                    then jsonb_build_object('card', jsonb_build_object('until', floor(extract(epoch from v_cu.the_den) * 1000), 'last', coalesce(v_cu.the_nhan, '')))
                    else '{}'::jsonb end;

  if array_length(v_ly_do, 1) > 0 then
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
    values (v_uid, array_to_string(v_ly_do, ','), jsonb_build_object('giay', round(v_dt), 'lingshi', p_data -> 'lingshi',
            'power', p_data -> 'power', 'thap', p_data -> 'tower' -> 'best', 'canh_gioi', v_canh_gioi));
  end if;

  if v_moi then
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luc_chien, thap, lt_xo, nl_xo, luu_luc, nghi_van)
    values (v_uid, v_data, v_canh_gioi, v_tang, 1, v_luc::integer, v_thap::integer, v_xo, v_xo_nl, now(),
            case when array_length(v_ly_do, 1) > 0 then 1 else 0 end);
    return 1;
  end if;
  update public.p2d_nhan_vat
     set data = v_data, canh_gioi = v_canh_gioi, tang = v_tang, luc_chien = v_luc::integer, thap = v_thap::integer,
         lt_xo = v_xo, nl_xo = v_xo_nl, luu_luc = now(),
         nghi_van = nghi_van + case when array_length(v_ly_do, 1) > 0 then 1 else 0 end,
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid
  returning phien_ban into v_pb;
  return v_pb;
end;
$$;

-- Đọc bản lưu: kèm tên hiển thị
create or replace function public.p2d_tai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object('data', n.data, 'phien_ban', n.phien_ban, 'updated_at', n.updated_at, 'ten', n.ten)
  from public.p2d_nhan_vat n
  where n.user_id = (select auth.uid());
$$;

-- Đặt tên hiển thị (2–16 ký tự, không trùng, mỗi ngày đổi một lần). Không đụng bản lưu nên không tăng phien_ban.
create or replace function public.p2d_dat_ten(p_ten text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_nv  public.p2d_nhan_vat%rowtype;
  v_ten text;
begin
  v_ten := btrim(regexp_replace(regexp_replace(coalesce(p_ten, ''),
             '[[:cntrl:]<>"''`\\​-‏‪-‮⁠-⁩﻿]', '', 'g'), '\s+', ' ', 'g'));
  if char_length(v_ten) not between 2 and 16 or lower(v_ten) like 'đạo hữu%' then
    raise exception 'ten_sai' using errcode = '22023';
  end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.ten = v_ten then return v_ten; end if;
  if v_nv.ten_doi_luc > now() - interval '1 day' then raise exception 'doi_ten_nhanh' using errcode = '54000'; end if;
  if exists (select 1 from public.p2d_nhan_vat where lower(ten) = lower(v_ten) and user_id <> v_uid) then
    raise exception 'ten_trung' using errcode = '22023';
  end if;
  update public.p2d_nhan_vat set ten = v_ten, ten_doi_luc = now() where user_id = v_uid;
  return v_ten;
end;
$$;

-- ===================== 4. Tiên Ngọc (máy chủ giữ) =====================
-- Quà ra mắt quầy: nhận một lần
create or replace function public.p2d_qua_tn()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_nv  public.p2d_nhan_vat%rowtype;
  v_n   integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.tn_qua then return jsonb_build_object('tn', v_nv.tien_ngoc, 'them', 0, 'phien_ban', v_nv.phien_ban); end if;
  select tn into v_n from public.p2d_tn_gia where ma = '_qua_ra_mat';
  update public.p2d_nhan_vat
     set tien_ngoc = tien_ngoc + v_n, tn_qua = true,
         data = data || jsonb_build_object('tn', tien_ngoc + v_n, 'tnStarter', true),
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid
  returning * into v_nv;
  return jsonb_build_object('tn', v_nv.tien_ngoc, 'them', v_n, 'phien_ban', v_nv.phien_ban);
end;
$$;

-- Đổi Tiên Ngọc lấy hàng ở quầy (giá theo p2d_tn_gia; hàng do máy khách trao như cũ)
create or replace function public.p2d_doi_tn(p_ma text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_nv  public.p2d_nhan_vat%rowtype;
  v_gia integer;
begin
  select tn into v_gia from public.p2d_tn_gia where ma = p_ma and left(ma, 1) <> '_';
  if not found then raise exception 'ma_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.tien_ngoc < v_gia then raise exception 'thieu_tn' using errcode = '22023'; end if;
  update public.p2d_nhan_vat
     set tien_ngoc = tien_ngoc - v_gia, data = data || jsonb_build_object('tn', tien_ngoc - v_gia),
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid
  returning * into v_nv;
  return jsonb_build_object('tn', v_nv.tien_ngoc, 'phien_ban', v_nv.phien_ban);
end;
$$;

-- Quà thẻ tháng mỗi ngày (thẻ chỉ có khi đã mở thanh toán thật và máy chủ ghi the_den)
create or replace function public.p2d_nhan_the()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_ngay text := to_char(now() at time zone 'Asia/Ho_Chi_Minh', 'YYYY-FMMM-FMDD');
  v_tn   integer;
  v_lt   integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.the_den is null or v_nv.the_den < now() then raise exception 'khong_co_the' using errcode = '22023'; end if;
  if v_nv.the_nhan = v_ngay then raise exception 'da_nhan' using errcode = '22023'; end if;
  select tn into v_tn from public.p2d_tn_gia where ma = '_the_ngay';
  select tn into v_lt from public.p2d_tn_gia where ma = '_the_ngay_lt';
  update public.p2d_nhan_vat
     set tien_ngoc = tien_ngoc + v_tn, the_nhan = v_ngay,
         data = data || jsonb_build_object('tn', tien_ngoc + v_tn,
                                           'lingshi', coalesce(case when jsonb_typeof(data -> 'lingshi') = 'number' then (data ->> 'lingshi')::numeric end, 0) + v_lt,
                                           'card', jsonb_build_object('until', floor(extract(epoch from the_den) * 1000), 'last', v_ngay)),
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid
  returning * into v_nv;
  return jsonb_build_object('tn', v_nv.tien_ngoc, 'lingshi', v_lt, 'last', v_ngay, 'phien_ban', v_nv.phien_ban);
end;
$$;

-- ===================== 5. Chợ =====================
-- Rao bán: lấy món từ bản lưu trên máy chủ theo mã số (bỏ qua mọi chỉ số máy khách gửi), trừ đồ ngay.
drop function if exists public.p2d_dang_ban(text, jsonb, integer);
create function public.p2d_dang_ban(p_loai text, p_mon jsonb, p_gia integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_mon  jsonb;
  v_co   numeric;
  v_n    integer;
  v_id   bigint;
  v_pb   integer;
begin
  if p_gia is null or p_gia not between 1 and 10000000 then raise exception 'gia_sai' using errcode = '22023'; end if;
  if p_mon is null or jsonb_typeof(p_mon) <> 'object' then raise exception 'mon_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  if (select count(*) from public.p2d_cho where nguoi_ban = v_uid and trang_thai = 'mo') >= 10 then
    raise exception 'qua_nhieu' using errcode = '54000';
  end if;

  if p_loai = 'mon' then
    if jsonb_typeof(p_mon -> 'uid') is distinct from 'number' then raise exception 'mon_sai' using errcode = '22023'; end if;
    select it into v_mon from jsonb_array_elements(coalesce(v_nv.data -> 'bag', '[]'::jsonb)) it where it -> 'uid' = p_mon -> 'uid' limit 1;
    if v_mon is null or exists (select 1 from jsonb_each(coalesce(v_nv.data -> 'equip', '{}'::jsonb)) e where e.value = p_mon -> 'uid') then
      raise exception 'khong_co' using errcode = '22023';
    end if;
    if not public.p2d_mon_hop_le(v_mon) then raise exception 'mon_sai' using errcode = '22023'; end if;
    v_nv.data := jsonb_set(v_nv.data, '{bag}', (
      select coalesce(jsonb_agg(it), '[]'::jsonb) from jsonb_array_elements(v_nv.data -> 'bag') it where it -> 'uid' <> p_mon -> 'uid'));
  elsif p_loai = 'nl' then
    if coalesce(p_mon ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(p_mon -> 'n') is distinct from 'number'
       or (p_mon ->> 'n')::numeric not between 1 and 999 or (p_mon ->> 'n')::numeric <> floor((p_mon ->> 'n')::numeric) then
      raise exception 'mon_sai' using errcode = '22023';
    end if;
    v_n := (p_mon ->> 'n')::integer;
    v_co := coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (p_mon ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (p_mon ->> 'id'))::numeric end, 0);
    if v_co < v_n then raise exception 'khong_co' using errcode = '22023'; end if;
    v_mon := jsonb_build_object('id', p_mon ->> 'id', 'n', v_n);
    v_nv.data := jsonb_set(v_nv.data, array['mats', p_mon ->> 'id'], to_jsonb(v_co - v_n));
  else
    raise exception 'loai_sai' using errcode = '22023';
  end if;

  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  insert into public.p2d_cho (nguoi_ban, ten_ban, loai, mon, gia)
  values (v_uid, coalesce(nullif(v_nv.ten, ''), public.p2d_ten_mac_dinh(v_uid)), p_loai, v_mon, p_gia)
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'phien_ban', v_pb);
end;
$$;

-- Mua: trừ Linh Thạch trong bản lưu máy chủ ngay; hàng và tiền chuyển qua hòm thư
drop function if exists public.p2d_mua(bigint);
create function public.p2d_mua(p_id bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_c    public.p2d_cho%rowtype;
  v_lt   numeric;
  v_thue integer;
  v_pb   integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  select * into v_c from public.p2d_cho where id = p_id for update;
  if not found or v_c.trang_thai <> 'mo' or v_c.het_han < now() then raise exception 'da_ban' using errcode = '22023'; end if;
  if v_c.nguoi_ban = v_uid then raise exception 'cua_minh' using errcode = '22023'; end if;
  v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
  if v_lt < v_c.gia then raise exception 'thieu_tien' using errcode = '22023'; end if;
  v_thue := ceil(v_c.gia * 0.1);   -- data/market.json tax (tools/check.mjs so sánh)
  update public.p2d_nhan_vat set data = jsonb_set(data, '{lingshi}', to_jsonb(v_lt - v_c.gia)), phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  update public.p2d_cho set trang_thai = 'da_ban', nguoi_mua = v_uid, xong_luc = now() where id = p_id;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values
    (v_uid, case v_c.loai when 'mon' then jsonb_build_object('item', v_c.mon) else jsonb_build_object('mat', v_c.mon) end, 'mua'),
    (v_c.nguoi_ban, jsonb_build_object('coins', v_c.gia - v_thue, 'sold', v_c.mon), 'ban');
  return jsonb_build_object('gia', v_c.gia, 'phien_ban', v_pb);
end;
$$;

-- Nhận thư: máy chủ tự cộng tiền, đồ (mã số mới bắt đầu từ p_uid_tu do máy khách giữ chỗ), nguyên liệu vào bản lưu.
-- Đồ chỉ nhận khi túi còn chỗ. Trả về thư đã nhận (đồ kèm mã số mới), phien_ban mới, mã số món kế tiếp.
drop function if exists public.p2d_nhan_thu(bigint[]);
create function public.p2d_nhan_thu(p_ids bigint[], p_uid_tu bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_nv   public.p2d_nhan_vat%rowtype;
  v_t    record;
  v_next bigint;
  v_cho  integer;
  v_item jsonb;
  v_lt   numeric;
  v_ra   jsonb := '[]'::jsonb;
  v_nd   jsonb;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_next := greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'nextUid') = 'number' then (v_nv.data ->> 'nextUid')::bigint end, 1), coalesce(p_uid_tu, 0));
  v_cho := 40 - coalesce(jsonb_array_length(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end), 0);
  for v_t in select * from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.id = any (p_ids) order by t.id loop
    v_nd := v_t.noi_dung;
    if v_nd ? 'item' then
      if v_cho <= 0 then continue; end if;
      v_item := (v_nd -> 'item') || jsonb_build_object('uid', v_next);
      v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end, '[]'::jsonb) || jsonb_build_array(v_item));
      v_nd := jsonb_set(v_nd, '{item}', v_item);
      v_next := v_next + 1; v_cho := v_cho - 1;
    end if;
    if v_nd ? 'coins' and jsonb_typeof(v_nd -> 'coins') = 'number' then
      v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt + (v_nd ->> 'coins')::numeric));
    end if;
    if v_nd ? 'mat' and jsonb_typeof(v_nd -> 'mat' -> 'n') = 'number' and coalesce(v_nd -> 'mat' ->> 'id', '') ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'mats') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mats}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['mats', v_nd -> 'mat' ->> 'id'], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (v_nd -> 'mat' ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (v_nd -> 'mat' ->> 'id'))::numeric end, 0)
        + (v_nd -> 'mat' ->> 'n')::numeric));
    end if;
    update public.p2d_hom_thu set nhan_luc = now() where id = v_t.id;
    v_ra := v_ra || jsonb_build_array(jsonb_build_object('id', v_t.id, 'noi_dung', v_nd, 'ly_do', v_t.ly_do));
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    v_nv.data := jsonb_set(v_nv.data, '{nextUid}', to_jsonb(v_next));
    update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now()
     where user_id = v_uid returning phien_ban into v_nv.phien_ban;
  end if;
  return jsonb_build_object('thu', v_ra, 'phien_ban', v_nv.phien_ban, 'next_uid', v_next);
end;
$$;

-- ===================== 6. Bảng xếp hạng =====================
create or replace function public.p2d_xep(p_loai text, p_gioi_han integer)
returns table (hang bigint, user_id uuid, ten text, gia_tri bigint, canh_gioi smallint, tang smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select row_number() over (order by
           case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                       else n.canh_gioi::bigint * 10 + n.tang end desc,
           n.updated_at asc) as hang,
         n.user_id, n.ten,
         case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                     else n.canh_gioi::bigint * 10 + n.tang end as gia_tri,
         n.canh_gioi, n.tang
  from public.p2d_nhan_vat n
  where n.nghi_van < 10 and (p_loai <> 'thap' or n.thap > 0)
  order by 1
  limit p_gioi_han;
$$;
revoke all on function public.p2d_xep(text, integer) from public, anon, authenticated;

create or replace function public.p2d_bxh(p_loai text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_nho  public.p2d_bxh_nho%rowtype;
  v_top  jsonb;
  v_toi  jsonb;
  v_dh   jsonb;
  v_me   public.p2d_nhan_vat%rowtype;
  v_gt   bigint;
  v_hang bigint;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('luc_chien', 'canh_gioi', 'thap') then raise exception 'loai_sai' using errcode = '22023'; end if;
  perform public.p2d_chot_tuan();
  select * into v_nho from public.p2d_bxh_nho where loai = p_loai;
  if (not found or v_nho.luc < now() - interval '60 seconds') and pg_try_advisory_xact_lock(hashtext('p2d_bxh:' || p_loai)) then
    select coalesce(jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri,
             'canh_gioi', x.canh_gioi, 'tang', x.tang, 'u', x.user_id) order by x.hang), '[]'::jsonb)
      into v_top from public.p2d_xep(p_loai, 50) x;
    insert into public.p2d_bxh_nho (loai, top, luc) values (p_loai, v_top, now())
    on conflict (loai) do update set top = excluded.top, luc = excluded.luc;
  else
    v_top := coalesce(v_nho.top, '[]'::jsonb);
  end if;
  -- Gắn "là tôi", bỏ mã người chơi trước khi trả về
  select coalesce(jsonb_agg((e - 'u') || jsonb_build_object('la_toi', e ->> 'u' = v_uid::text) order by (e ->> 'hang')::bigint), '[]'::jsonb)
    into v_top from jsonb_array_elements(v_top) e;
  -- Hạng của mình: đếm người hơn mình (không xếp cả bảng)
  select * into v_me from public.p2d_nhan_vat where user_id = v_uid;
  if found and v_me.nghi_van < 10 and (p_loai <> 'thap' or v_me.thap > 0) then
    v_gt := case p_loai when 'luc_chien' then v_me.luc_chien::bigint when 'thap' then v_me.thap::bigint
                        else v_me.canh_gioi::bigint * 10 + v_me.tang end;
    select count(*) + 1 into v_hang from public.p2d_nhan_vat n
     where n.nghi_van < 10 and n.user_id <> v_uid
       and (case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                        else n.canh_gioi::bigint * 10 + n.tang end) > v_gt;
    v_toi := jsonb_build_object('hang', v_hang, 'ten', v_me.ten, 'gia_tri', v_gt, 'canh_gioi', v_me.canh_gioi, 'tang', v_me.tang);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('loai', t.loai, 'hang', t.hang)), '[]'::jsonb)
    into v_dh from public.p2d_bxh_tuan t
   where t.user_id = v_uid and t.tuan = public.p2d_tuan_nay() - 7;
  return jsonb_build_object('top', v_top, 'toi', v_toi, 'danh_hieu', v_dh, 'tuan', public.p2d_tuan_nay());
end;
$$;

-- ===================== 7. Chat =====================
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
  v_chu := left(btrim(regexp_replace(regexp_replace(coalesce(p_noi_dung, ''),
             '[[:cntrl:]<>​-‏‪-‮⁠-⁩﻿]', '', 'g'), '\s+', ' ', 'g')), 120);
  if v_chu = '' then raise exception 'rong' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('p2d_chat:' || v_uid::text));   -- bấm dồn nhiều lệnh cùng lúc cũng phải xếp hàng
  if exists (select 1 from public.p2d_chat where user_id = v_uid and tao_luc > now() - interval '4 seconds')
     or (select count(*) from public.p2d_chat where user_id = v_uid and tao_luc > now() - interval '5 minutes') >= 30 then
    raise exception 'nhanh_qua' using errcode = '54000';
  end if;
  select nullif(n.ten, '') into v_ten from public.p2d_nhan_vat n where n.user_id = v_uid;
  insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
  values (p_kenh, v_uid, coalesce(v_ten, public.p2d_ten_mac_dinh(v_uid)), v_chu)
  returning id into v_id;
  if v_id % 50 = 0 then delete from public.p2d_chat where tao_luc < now() - interval '7 days'; end if;
  return v_id;
end;
$$;

-- ===================== 8. Realtime: kênh riêng tư cho người đã đăng nhập =====================
drop policy if exists p2d_rt_nhan on realtime.messages;
create policy p2d_rt_nhan on realtime.messages
  for select to authenticated
  using ((select realtime.topic()) like 'p2d:%' or (select realtime.topic()) like 'p2d-to:%');
drop policy if exists p2d_rt_gui on realtime.messages;
create policy p2d_rt_gui on realtime.messages
  for insert to authenticated
  with check ((select realtime.topic()) like 'p2d:%' or (select realtime.topic()) like 'p2d-to:%');

-- ===================== 9. Quyền gọi hàm =====================
revoke all on function public.p2d_luu(jsonb, integer), public.p2d_tai(), public.p2d_dat_ten(text),
  public.p2d_qua_tn(), public.p2d_doi_tn(text), public.p2d_nhan_the(),
  public.p2d_dang_ban(text, jsonb, integer), public.p2d_mua(bigint), public.p2d_nhan_thu(bigint[], bigint),
  public.p2d_bxh(text), public.p2d_gui_chat(text, text) from public, anon;
grant execute on function public.p2d_luu(jsonb, integer), public.p2d_tai(), public.p2d_dat_ten(text),
  public.p2d_qua_tn(), public.p2d_doi_tn(text), public.p2d_nhan_the(),
  public.p2d_dang_ban(text, jsonb, integer), public.p2d_mua(bigint), public.p2d_nhan_thu(bigint[], bigint),
  public.p2d_bxh(text), public.p2d_gui_chat(text, text) to authenticated;
