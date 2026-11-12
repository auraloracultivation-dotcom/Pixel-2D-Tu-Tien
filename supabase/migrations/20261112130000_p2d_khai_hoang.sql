-- Khai Hoang Tinh Cầu (chủ dự án duyệt 12/11/2026 13:10; tài liệu "Kế hoạch Khai Hoang Tinh Cầu", data/khai-hoang.json).
-- Chỉ thêm mới, không đụng bảng cũ. Mỗi tông môn một tinh cầu ở Vành Khai Hoang; thành viên góp Mảnh Vỡ Tinh Cầu và Linh Thạch vào kho
-- tông môn (không trả lại khi rời); tông chủ mở trận Khai Tinh, tự hạ trùm thì máy chủ trừ kho và khai / nâng cấp tinh cầu.
-- Thua không mất gì, chờ lose_wait giây. Bỏ hoang idle_days ngày (không thành viên ghé) thì ma khí chiếm lại; tông môn giải tán thì
-- tinh cầu bỏ trống, empty_days ngày sau ẩn đi (khiêu chiến chiếm tinh cầu bỏ trống: đợt sau).

-- ===================== Bảng =====================
create table if not exists public.p2d_kh_cfg (k text primary key, v jsonb not null);
alter table public.p2d_kh_cfg enable row level security;
revoke all on public.p2d_kh_cfg from anon, authenticated;
insert into public.p2d_kh_cfg (k, v) values ('cfg', '{"mat":"manh-vo-tinh-cau","ring":10,"per_ring":8,"ten_max":16,"lose_wait":120,"fight_min":15,"fight_max":1800,"idle_days":30,"empty_days":30,"levels":[{"cap":1,"manh":30,"lt":50000,"realm":1,"boss_cp":24000,"d":44},{"cap":2,"manh":80,"lt":150000,"realm":1,"boss_cp":48000,"d":54},{"cap":3,"manh":200,"lt":400000,"realm":2,"boss_cp":96000,"d":64},{"cap":4,"manh":450,"lt":1000000,"realm":3,"boss_cp":180000,"d":74},{"cap":5,"manh":900,"lt":2500000,"realm":4,"boss_cp":320000,"d":84}],"dat":["rung","co","tuyet","tro","cat","da-den","hau-tho"]}'::jsonb)
  on conflict (k) do update set v = excluded.v;

create table if not exists public.p2d_tinh_cau (
  id uuid primary key default gen_random_uuid(),
  bang_id uuid references public.p2d_bang(id) on delete set null,
  chu uuid not null,
  ten text not null,
  mat_dat text not null,
  hat integer not null,
  cap smallint not null default 1,
  vong smallint not null,
  goc real not null,
  trang_thai text not null default 'song' check (trang_thai in ('song', 'trong', 'an', 'ma_khi')),
  tao_luc timestamptz not null default now(),
  ghe_luc timestamptz not null default now(),
  bo_luc timestamptz
);
create unique index if not exists p2d_tinh_cau_mot_bang on public.p2d_tinh_cau (bang_id) where trang_thai = 'song';
create unique index if not exists p2d_tinh_cau_ten on public.p2d_tinh_cau (lower(ten)) where trang_thai in ('song', 'trong');
alter table public.p2d_tinh_cau enable row level security;
revoke all on public.p2d_tinh_cau from anon, authenticated;

create table if not exists public.p2d_bang_kho (
  bang_id uuid primary key references public.p2d_bang(id) on delete cascade,
  manh integer not null default 0 check (manh >= 0),
  lt numeric not null default 0 check (lt >= 0)
);
alter table public.p2d_bang_kho enable row level security;
revoke all on public.p2d_bang_kho from anon, authenticated;

create table if not exists public.p2d_bang_kho_log (
  id bigserial primary key,
  bang_id uuid not null,
  user_id uuid not null,
  manh integer not null default 0,
  lt numeric not null default 0,
  ly_do text not null default 'gop',
  luc timestamptz not null default now()
);
create index if not exists p2d_bang_kho_log_bang on public.p2d_bang_kho_log (bang_id, user_id);
alter table public.p2d_bang_kho_log enable row level security;
revoke all on public.p2d_bang_kho_log from anon, authenticated;

create table if not exists public.p2d_kh_tran (
  id uuid primary key default gen_random_uuid(),
  bang_id uuid not null,
  chu uuid not null,
  cap smallint not null,
  tinh_id uuid,
  ten text not null,
  mat_dat text not null,
  hat integer not null,
  bat_dau timestamptz not null default now(),
  xong text check (xong in ('thang', 'thua', 'het')),
  xong_luc timestamptz
);
create index if not exists p2d_kh_tran_bang on public.p2d_kh_tran (bang_id, bat_dau desc);
alter table public.p2d_kh_tran enable row level security;
revoke all on public.p2d_kh_tran from anon, authenticated;

-- ===================== Hàm phụ =====================
create or replace function public.p2d_kh_c()
returns jsonb language sql stable security definer set search_path = ''
as $$ select v from public.p2d_kh_cfg where k = 'cfg'; $$;

create or replace function public.p2d_kh_cap(p_cap integer)
returns jsonb language sql stable security definer set search_path = ''
as $$ select l from jsonb_array_elements(public.p2d_kh_c() -> 'levels') l where (l ->> 'cap')::integer = p_cap; $$;

-- Dọn lười (gọi khi đọc danh sách): tông môn giải tán → bỏ trống; bỏ trống quá empty_days → ẩn; quá idle_days không ai ghé → ma khí;
-- trận mở quá fight_max → hết
create or replace function public.p2d_kh_quet()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_c jsonb := public.p2d_kh_c();
begin
  update public.p2d_tinh_cau set trang_thai = 'trong', bo_luc = now() where trang_thai = 'song' and bang_id is null;
  update public.p2d_tinh_cau set trang_thai = 'an' where trang_thai = 'trong' and bo_luc < now() - make_interval(days => (v_c ->> 'empty_days')::integer);
  update public.p2d_tinh_cau set trang_thai = 'ma_khi', bo_luc = now() where trang_thai = 'song' and ghe_luc < now() - make_interval(days => (v_c ->> 'idle_days')::integer);
  update public.p2d_kh_tran set xong = 'het', xong_luc = now() where xong is null and bat_dau < now() - make_interval(secs => (v_c ->> 'fight_max')::integer);
end;
$$;

revoke all on function public.p2d_kh_c(), public.p2d_kh_cap(integer), public.p2d_kh_quet() from public, anon, authenticated;

-- ===================== Đọc =====================
-- Tinh cầu đang hiện trên Vành Khai Hoang (khách cũng xem được: tinh đồ công khai)
create or replace function public.p2d_kh_ds()
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.p2d_kh_quet();
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'ten', t.ten, 'mat_dat', t.mat_dat, 'hat', t.hat, 'cap', t.cap, 'vong', t.vong, 'goc', t.goc,
      'trong', t.trang_thai = 'trong', 'bang', b.ten) order by t.tao_luc)
    from public.p2d_tinh_cau t left join public.p2d_bang b on b.id = t.bang_id where t.trang_thai in ('song', 'trong')), '[]'::jsonb);
end;
$$;

-- Tông môn mình: chức, kho, người góp nhiều, tinh cầu, trận đang mở, chờ sau thua tới lúc nào
create or replace function public.p2d_kh_toi()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_tv public.p2d_bang_tv%rowtype; v_k public.p2d_bang_kho%rowtype;
  v_t public.p2d_tinh_cau%rowtype; v_tr public.p2d_kh_tran%rowtype; v_cho timestamptz;
begin
  if v_uid is null then return null; end if;
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found then return null; end if;
  perform public.p2d_kh_quet();
  select * into v_k from public.p2d_bang_kho where bang_id = v_tv.bang_id;
  select * into v_t from public.p2d_tinh_cau where bang_id = v_tv.bang_id and trang_thai = 'song';
  select * into v_tr from public.p2d_kh_tran where bang_id = v_tv.bang_id and xong is null order by bat_dau desc limit 1;
  select max(xong_luc) + make_interval(secs => (v_c ->> 'lose_wait')::integer) into v_cho from public.p2d_kh_tran where bang_id = v_tv.bang_id and xong = 'thua';
  return jsonb_build_object(
    'chuc', v_tv.chuc,
    'kho', jsonb_build_object('manh', coalesce(v_k.manh, 0), 'lt', coalesce(v_k.lt, 0)),
    'top', coalesce((select jsonb_agg(jsonb_build_object('name', public.p2d_bang_ten_nguoi(x.user_id), 'manh', x.m, 'lt', x.l) order by x.m desc, x.l desc)
      from (select user_id, sum(manh)::integer m, sum(lt) l from public.p2d_bang_kho_log where bang_id = v_tv.bang_id and ly_do = 'gop' group by user_id order by 2 desc, 3 desc limit 5) x), '[]'::jsonb),
    'tinh', case when v_t.id is null then null else jsonb_build_object('id', v_t.id, 'ten', v_t.ten, 'mat_dat', v_t.mat_dat, 'hat', v_t.hat, 'cap', v_t.cap) end,
    'tran', case when v_tr.id is null then null else jsonb_build_object('ve', v_tr.id, 'cap', v_tr.cap, 'ten', v_tr.ten, 'mat_dat', v_tr.mat_dat, 'hat', v_tr.hat, 'cua_toi', v_tr.chu = v_uid) end,
    'cho', case when v_cho > now() then extract(epoch from v_cho - now())::integer else 0 end);
end;
$$;

-- ===================== Góp kho =====================
-- Trừ Mảnh Vỡ (data.mats[mat]) và Linh Thạch (data.lingshi) trong bản lưu trên máy chủ, cộng vào kho tông môn, ghi sổ
create or replace function public.p2d_kh_gop(p_manh integer, p_lt integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_mat text := v_c ->> 'mat'; v_nv public.p2d_nhan_vat%rowtype; v_bang uuid;
  v_co_m numeric; v_co_l numeric; v_m integer := greatest(coalesce(p_manh, 0), 0); v_l integer := greatest(coalesce(p_lt, 0), 0); v_pb integer; v_d jsonb;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_m = 0 and v_l = 0 then raise exception 'thieu_cua' using errcode = '22023'; end if;
  v_co_m := coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> v_mat) = 'number' then (v_nv.data -> 'mats' ->> v_mat)::numeric end, 0);
  v_co_l := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
  if v_m > v_co_m or v_l > v_co_l then raise exception 'thieu_cua' using errcode = '22023'; end if;
  v_d := v_nv.data;
  if v_m > 0 then v_d := jsonb_set(v_d, array['mats', v_mat], to_jsonb(v_co_m - v_m), true); end if;
  if v_l > 0 then v_d := jsonb_set(v_d, '{lingshi}', to_jsonb(v_co_l - v_l)); end if;
  update public.p2d_nhan_vat set data = v_d, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  insert into public.p2d_bang_kho (bang_id, manh, lt) values (v_bang, v_m, v_l)
    on conflict (bang_id) do update set manh = public.p2d_bang_kho.manh + v_m, lt = public.p2d_bang_kho.lt + v_l;
  insert into public.p2d_bang_kho_log (bang_id, user_id, manh, lt) values (v_bang, v_uid, v_m, v_l);
  return jsonb_build_object('manh', v_m, 'lt', v_l, 'phien_ban', v_pb);
end;
$$;

-- ===================== Trận Khai Tinh =====================
-- Tông chủ mở trận cấp kế tiếp (chưa có tinh cầu: cấp 1, cần tên và mặt đất). Kiểm trước cảnh giới và kho để khỏi đánh uổng;
-- chưa trừ gì, thắng mới trừ (p2d_kh_thang). Đang có trận thì trả lại vé đó.
create or replace function public.p2d_kh_mo_tran(p_ten text, p_dat text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_nv public.p2d_nhan_vat%rowtype; v_tv public.p2d_bang_tv%rowtype;
  v_t public.p2d_tinh_cau%rowtype; v_tr public.p2d_kh_tran%rowtype; v_k public.p2d_bang_kho%rowtype; v_l jsonb; v_cap integer;
  v_ten text; v_dat text; v_hat integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_tv.chuc <> 'chu' then raise exception 'khong_phai_chu' using errcode = '42501'; end if;
  perform 1 from public.p2d_bang where id = v_tv.bang_id for update;
  perform public.p2d_kh_quet();
  select * into v_tr from public.p2d_kh_tran where bang_id = v_tv.bang_id and xong is null order by bat_dau desc limit 1;
  if found then
    return jsonb_build_object('ve', v_tr.id, 'cap', v_tr.cap, 'ten', v_tr.ten, 'mat_dat', v_tr.mat_dat, 'hat', v_tr.hat, 'cu', true);
  end if;
  if exists (select 1 from public.p2d_kh_tran where bang_id = v_tv.bang_id and xong = 'thua'
      and xong_luc > now() - make_interval(secs => (v_c ->> 'lose_wait')::integer)) then raise exception 'dang_cho' using errcode = '22023'; end if;
  select * into v_t from public.p2d_tinh_cau where bang_id = v_tv.bang_id and trang_thai = 'song';
  v_cap := coalesce(v_t.cap, 0) + 1;
  v_l := public.p2d_kh_cap(v_cap);
  if v_l is null then raise exception 'cap_toi_da' using errcode = '22023'; end if;
  if v_nv.canh_gioi < (v_l ->> 'realm')::integer then raise exception 'chua_du_canh_gioi' using errcode = '22023'; end if;
  select * into v_k from public.p2d_bang_kho where bang_id = v_tv.bang_id;
  if coalesce(v_k.manh, 0) < (v_l ->> 'manh')::integer then raise exception 'thieu_manh' using errcode = '22023'; end if;
  if coalesce(v_k.lt, 0) < (v_l ->> 'lt')::numeric then raise exception 'thieu_tien' using errcode = '22023'; end if;
  if v_t.id is null then
    if exists (select 1 from public.p2d_tinh_cau where chu = v_uid and trang_thai = 'song') then raise exception 'co_tinh_cau' using errcode = '22023'; end if;
    v_ten := public.p2d_bang_sach(p_ten); v_dat := coalesce(p_dat, '');
    if char_length(v_ten) not between 2 and (v_c ->> 'ten_max')::integer then raise exception 'ten_sai' using errcode = '22023'; end if;
    if not (v_c -> 'dat') ? v_dat then raise exception 'dat_sai' using errcode = '22023'; end if;
    if exists (select 1 from public.p2d_tinh_cau where lower(ten) = lower(v_ten) and trang_thai in ('song', 'trong')) then raise exception 'ten_trung' using errcode = '22023'; end if;
    v_hat := floor(random() * 2147483646)::integer + 1;
  else
    v_ten := v_t.ten; v_dat := v_t.mat_dat; v_hat := v_t.hat;
  end if;
  insert into public.p2d_kh_tran (bang_id, chu, cap, tinh_id, ten, mat_dat, hat) values (v_tv.bang_id, v_uid, v_cap, v_t.id, v_ten, v_dat, v_hat) returning * into v_tr;
  return jsonb_build_object('ve', v_tr.id, 'cap', v_cap, 'ten', v_ten, 'mat_dat', v_dat, 'hat', v_hat, 'cu', false);
end;
$$;

-- Tông chủ hạ trùm: kiểm vé (của mình, còn mở, đánh đủ lâu, lực chiến không quá thấp so với trùm), kiểm lại kho, trừ kho, khai / nâng cấp
create or replace function public.p2d_kh_thang(p_ve uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_nv public.p2d_nhan_vat%rowtype; v_tr public.p2d_kh_tran%rowtype;
  v_tv public.p2d_bang_tv%rowtype; v_k public.p2d_bang_kho%rowtype; v_l jsonb; v_n integer; v_t public.p2d_tinh_cau%rowtype; v_s numeric;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  select * into v_tr from public.p2d_kh_tran where id = p_ve and chu = v_uid for update;
  if not found or v_tr.xong is not null then raise exception 'het_tran' using errcode = '22023'; end if;
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found or v_tv.bang_id <> v_tr.bang_id or v_tv.chuc <> 'chu' then raise exception 'khong_phai_chu' using errcode = '42501'; end if;
  perform 1 from public.p2d_bang where id = v_tr.bang_id for update;
  v_s := extract(epoch from now() - v_tr.bat_dau);
  if v_s > (v_c ->> 'fight_max')::numeric then
    update public.p2d_kh_tran set xong = 'het', xong_luc = now() where id = v_tr.id;
    raise exception 'het_tran' using errcode = '22023';
  end if;
  v_l := public.p2d_kh_cap(v_tr.cap);
  if v_s < (v_c ->> 'fight_min')::numeric or coalesce(v_nv.luc_chien, 0) < (v_l ->> 'boss_cp')::numeric * 0.1 then raise exception 'nhanh_qua' using errcode = '22023'; end if;
  if v_nv.canh_gioi < (v_l ->> 'realm')::integer then raise exception 'chua_du_canh_gioi' using errcode = '22023'; end if;
  select * into v_k from public.p2d_bang_kho where bang_id = v_tr.bang_id for update;
  if coalesce(v_k.manh, 0) < (v_l ->> 'manh')::integer then raise exception 'thieu_manh' using errcode = '22023'; end if;
  if coalesce(v_k.lt, 0) < (v_l ->> 'lt')::numeric then raise exception 'thieu_tien' using errcode = '22023'; end if;
  update public.p2d_bang_kho set manh = manh - (v_l ->> 'manh')::integer, lt = lt - (v_l ->> 'lt')::numeric where bang_id = v_tr.bang_id;
  insert into public.p2d_bang_kho_log (bang_id, user_id, manh, lt, ly_do) values (v_tr.bang_id, v_uid, -(v_l ->> 'manh')::integer, -(v_l ->> 'lt')::numeric, 'khai_cap_' || v_tr.cap);
  if v_tr.tinh_id is null then
    if exists (select 1 from public.p2d_tinh_cau where bang_id = v_tr.bang_id and trang_thai = 'song') then raise exception 'co_tinh_cau' using errcode = '22023'; end if;
    select count(*) into v_n from public.p2d_tinh_cau;
    insert into public.p2d_tinh_cau (bang_id, chu, ten, mat_dat, hat, cap, vong, goc)
      values (v_tr.bang_id, v_uid, v_tr.ten, v_tr.mat_dat, v_tr.hat, 1, (v_c ->> 'ring')::integer + v_n / (v_c ->> 'per_ring')::integer, mod(v_n * 137.508, 360))
      returning * into v_t;
  else
    update public.p2d_tinh_cau set cap = v_tr.cap, ghe_luc = now() where id = v_tr.tinh_id and bang_id = v_tr.bang_id and trang_thai = 'song' and cap = v_tr.cap - 1 returning * into v_t;
    if v_t.id is null then raise exception 'het_tran' using errcode = '22023'; end if;
  end if;
  update public.p2d_kh_tran set xong = 'thang', xong_luc = now(), tinh_id = v_t.id where id = v_tr.id;
  return jsonb_build_object('id', v_t.id, 'ten', v_t.ten, 'mat_dat', v_t.mat_dat, 'hat', v_t.hat, 'cap', v_t.cap, 'vong', v_t.vong, 'goc', v_t.goc);
end;
$$;

-- Thua (chết trong trận, rời trận): đóng vé, chờ lose_wait giây mới mở lại; không mất gì
create or replace function public.p2d_kh_thua(p_ve uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_n integer;
begin
  update public.p2d_kh_tran set xong = 'thua', xong_luc = now() where id = p_ve and chu = v_uid and xong is null;
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', v_n > 0, 'cho', (public.p2d_kh_c() ->> 'lose_wait')::integer);
end;
$$;

-- Thành viên ghé tinh cầu của tông môn mình: giữ khỏi ma khí (ghi tối đa mỗi giờ một lần)
create or replace function public.p2d_kh_ghe(p_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_n integer;
begin
  update public.p2d_tinh_cau t set ghe_luc = now()
   where t.id = p_id and t.trang_thai = 'song' and t.ghe_luc < now() - interval '1 hour'
     and exists (select 1 from public.p2d_bang_tv v where v.user_id = v_uid and v.bang_id = t.bang_id);
  get diagnostics v_n = row_count;
  return v_n > 0;
end;
$$;

revoke all on function public.p2d_kh_ds(), public.p2d_kh_toi(), public.p2d_kh_gop(integer, integer), public.p2d_kh_mo_tran(text, text),
  public.p2d_kh_thang(uuid), public.p2d_kh_thua(uuid), public.p2d_kh_ghe(uuid) from public, anon;
grant execute on function public.p2d_kh_ds() to anon, authenticated;
grant execute on function public.p2d_kh_toi(), public.p2d_kh_gop(integer, integer), public.p2d_kh_mo_tran(text, text),
  public.p2d_kh_thang(uuid), public.p2d_kh_thua(uuid), public.p2d_kh_ghe(uuid) to authenticated;
