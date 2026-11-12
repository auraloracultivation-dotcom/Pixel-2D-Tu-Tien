-- Khai Hoang Tinh Cầu đợt 2–4 (chủ dự án 12/11/2026 13:32: "làm toàn bộ, làm liên tục tới khi hoàn thành"). Chỉ thêm mới:
-- công trình (mua bằng kho tông môn, bày trên tinh cầu, thợ được giao), bố cục từng tinh cầu và lịch sử, gửi ảnh công trình (kho ảnh
-- riêng tư kh-anh, hàng chờ duyệt), khiêu chiến tinh cầu bỏ trống. Số ở data/khai-hoang.json (tools/check.mjs so với p2d_kh_cfg).

insert into public.p2d_kh_cfg (k, v) values ('cfg', '{"mat":"manh-vo-tinh-cau","ring":10,"per_ring":8,"ten_max":16,"lose_wait":120,"fight_min":15,"fight_max":1800,"idle_days":30,"empty_days":30,"levels":[{"cap":1,"manh":30,"lt":50000,"realm":1,"boss_cp":24000,"d":44,"ct_max":3,"do_max":20},{"cap":2,"manh":80,"lt":150000,"realm":1,"boss_cp":48000,"d":54,"ct_max":5,"do_max":40},{"cap":3,"manh":200,"lt":400000,"realm":2,"boss_cp":96000,"d":64,"ct_max":7,"do_max":60},{"cap":4,"manh":450,"lt":1000000,"realm":3,"boss_cp":180000,"d":74,"ct_max":9,"do_max":80},{"cap":5,"manh":900,"lt":2500000,"realm":4,"boss_cp":320000,"d":84,"ct_max":12,"do_max":100}],"dat":["rung","co","tuyet","tro","cat","da-den","hau-tho"],"ct":{"tk.lau-van-bao-m":{"lt":80000,"loai":"cn"},"tk.nha-ren-m":{"lt":60000,"loai":"cn"},"xd.nha-hac-m":{"lt":60000,"loai":"cn"},"tk.dien-phu-m":{"lt":80000,"loai":"cn"},"tk.dien-nho-m":{"lt":40000,"loai":"cn"},"tk.lau-cho-m":{"lt":60000,"loai":"cn"},"tk.nha-dan-m":{"lt":40000,"loai":"cn"},"xd.nha-dan-m":{"lt":40000,"loai":"cn"},"xd.lo-ren-m":{"lt":40000,"loai":"cn"},"tk.dien-chinh-m":{"lt":30000,"loai":"nha"},"tk.tien-dai-m":{"lt":30000,"loai":"nha"},"tk.lau-sach-m":{"lt":40000,"loai":"nha"},"tk.thap-canh-m":{"lt":30000,"loai":"nha"},"hb.nha-tuyet-m":{"lt":25000,"loai":"nha"},"hb.dien-tuyet-m":{"lt":40000,"loai":"nha"},"hb.thap-tuyet-m":{"lt":30000,"loai":"nha"},"xd.dien-nho-m":{"lt":30000,"loai":"nha"},"hb.nha-ca-m":{"lt":25000,"loai":"nha"}},"do":["tk.cay-anh-dao-m","tk.cay-thong-m","tk.cay-phong-m","tk.cay-ngan-hanh-m","hb.cay-tung-tuyet-m","hb.cay-mai-m","xd.cay-hoa-lua-m","xd.cay-phong-m","tk.bui-hong-m","tk.bui-xanh-m","hb.bui-tuyet-m","xd.bui-chay-m","tk.den-da-m","tk.den-sen-m","tk.den-treo-m","hb.den-bang-m","xd.den-long-m","xd.den-phuong-m","tk.da-reu-m","tk.da-tim-m","hb.da-tuyet-m","xd.da-bazan-m","tk.su-tu-m","tk.tuong-hac-m","tk.tuong-rong-m","xd.tuong-phuong-m","tk.lan-can-go-m","tk.lan-can-da-m","hb.lan-can-tuyet-m","xd.rao-sat-m","tk.gieng-m","tk.lu-huong-m","tk.thac-m","tk.voi-nuoc-m","tk.chuong-m","tk.quan-tra-m","hb.nguoi-tuyet-m","tk.cong-go-m","tk.cong-kiem-m","xd.cong-phuong-m","hb.cong-bang-m"],"do_lt":3000,"loai_anh":["chi-ganh-da","chu-cho","ngu-thu-su","quan-binh-kho","thuong-nhan","tieu-phu","to-doi","van-bao","van-hac","nha"],"anh":{"ngay":3,"mb":3,"px":2048,"min_trong":0.2},"kc_wait":600}'::jsonb)
  on conflict (k) do update set v = excluded.v;

-- ===================== Bảng =====================
alter table public.p2d_tinh_cau add column if not exists bay jsonb not null default '[]'::jsonb;
alter table public.p2d_tinh_cau add column if not exists bay_ver integer not null default 0;
alter table public.p2d_tinh_cau add column if not exists chu_ten text;   -- tên tông chủ lúc bỏ trống (khiêu chiến)

-- Công trình, đồ trang trí tông môn sở hữu. loai/ten/npc: công trình riêng từ ảnh đã duyệt (ma 'u.…')
create table if not exists public.p2d_kh_ct (
  bang_id uuid not null references public.p2d_bang(id) on delete cascade,
  ma text not null,
  so integer not null default 0 check (so >= 0),
  loai text, ten text, npc text,
  primary key (bang_id, ma)
);
alter table public.p2d_kh_ct enable row level security;
revoke all on public.p2d_kh_ct from anon, authenticated;

-- Trưởng lão được tông chủ giao bày (thợ)
create table if not exists public.p2d_kh_tho (
  bang_id uuid not null references public.p2d_bang(id) on delete cascade,
  user_id uuid not null,
  primary key (bang_id, user_id)
);
alter table public.p2d_kh_tho enable row level security;
revoke all on public.p2d_kh_tho from anon, authenticated;

create table if not exists public.p2d_kh_bay_ls (
  id bigserial primary key,
  tinh_id uuid not null,
  ver integer not null,
  items jsonb not null,
  user_id uuid,
  luc timestamptz not null default now()
);
create index if not exists p2d_kh_bay_ls_tinh on public.p2d_kh_bay_ls (tinh_id, ver desc);
alter table public.p2d_kh_bay_ls enable row level security;
revoke all on public.p2d_kh_bay_ls from anon, authenticated;

create table if not exists public.p2d_kh_anh (
  id uuid primary key default gen_random_uuid(),
  bang_id uuid not null,
  user_id uuid not null,
  duong text not null,
  ten_ct text not null,
  loai text not null,
  ten_npc text not null,
  trang_thai text not null default 'cho' check (trang_thai in ('cho', 'duyet', 'bo', 'xong')),
  ghi_chu text,
  tao_luc timestamptz not null default now(),
  xu_ly_luc timestamptz
);
create index if not exists p2d_kh_anh_bang on public.p2d_kh_anh (bang_id, tao_luc desc);
alter table public.p2d_kh_anh enable row level security;
revoke all on public.p2d_kh_anh from anon, authenticated;

create table if not exists public.p2d_kh_kc (
  id bigserial primary key,
  tinh_id uuid not null,
  user_id uuid not null,
  thang boolean not null,
  ta numeric, cu numeric,
  luc timestamptz not null default now()
);
create index if not exists p2d_kh_kc_nguoi on public.p2d_kh_kc (user_id, luc desc);
alter table public.p2d_kh_kc enable row level security;
revoke all on public.p2d_kh_kc from anon, authenticated;

-- Kho ảnh riêng tư: chỉ tông chủ tải lên thư mục mang mã của mình; không ai đọc qua API (Claude đọc bằng quyền máy chủ khi xử lý)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values ('kh-anh', 'kh-anh', false, 3145728, array['image/png', 'image/webp'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.p2d_kh_la_chu(p_uid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.p2d_bang_tv where user_id = p_uid and chuc = 'chu'); $$;
revoke all on function public.p2d_kh_la_chu(uuid) from public, anon;
grant execute on function public.p2d_kh_la_chu(uuid) to authenticated;

drop policy if exists p2d_kh_anh_tai_len on storage.objects;
create policy p2d_kh_anh_tai_len on storage.objects for insert to authenticated
  with check (bucket_id = 'kh-anh' and (storage.foldername(name))[1] = (select auth.uid())::text and public.p2d_kh_la_chu((select auth.uid())));

-- ===================== Hàm phụ =====================
-- Quyền bày tinh cầu: tông chủ, hoặc trưởng lão được giao, của tông môn đang giữ tinh cầu
create or replace function public.p2d_kh_quyen(p_uid uuid, p_tinh uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.p2d_tinh_cau t join public.p2d_bang_tv v on v.bang_id = t.bang_id and v.user_id = p_uid
    where t.id = p_tinh and t.trang_thai = 'song'
      and (v.chuc = 'chu' or (v.chuc = 'lao' and exists (select 1 from public.p2d_kh_tho h where h.bang_id = t.bang_id and h.user_id = p_uid))));
$$;
revoke all on function public.p2d_kh_quyen(uuid, uuid) from public, anon, authenticated;

-- Công trình riêng (ảnh đã duyệt) của một tông môn: { ma: {loai, ten, npc} }
create or replace function public.p2d_kh_rieng(p_bang uuid)
returns jsonb language sql stable security definer set search_path = ''
as $$ select coalesce(jsonb_object_agg(ma, jsonb_build_object('loai', loai, 'ten', ten, 'npc', npc)), '{}'::jsonb) from public.p2d_kh_ct where bang_id = p_bang and loai is not null; $$;
revoke all on function public.p2d_kh_rieng(uuid) from public, anon, authenticated;

-- Dọn lười: thêm ghi tên tông chủ cũ khi tinh cầu thành bỏ trống
create or replace function public.p2d_kh_quet()
returns void language plpgsql security definer set search_path = ''
as $$
declare v_c jsonb := public.p2d_kh_c();
begin
  update public.p2d_tinh_cau t set trang_thai = 'trong', bo_luc = now(), chu_ten = public.p2d_bang_ten_nguoi(t.chu) where t.trang_thai = 'song' and t.bang_id is null;
  update public.p2d_tinh_cau set trang_thai = 'an' where trang_thai = 'trong' and bo_luc < now() - make_interval(days => (v_c ->> 'empty_days')::integer);
  update public.p2d_tinh_cau set trang_thai = 'ma_khi', bo_luc = now() where trang_thai = 'song' and ghe_luc < now() - make_interval(days => (v_c ->> 'idle_days')::integer);
  update public.p2d_kh_tran set xong = 'het', xong_luc = now() where xong is null and bat_dau < now() - make_interval(secs => (v_c ->> 'fight_max')::integer);
end;
$$;
revoke all on function public.p2d_kh_quet() from public, anon, authenticated;

-- ===================== Đọc =====================
create or replace function public.p2d_kh_ds()
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  perform public.p2d_kh_quet();
  return coalesce((select jsonb_agg(jsonb_build_object('id', t.id, 'ten', t.ten, 'mat_dat', t.mat_dat, 'hat', t.hat, 'cap', t.cap, 'vong', t.vong, 'goc', t.goc,
      'trong', t.trang_thai = 'trong', 'bang', b.ten, 'chu_ten', case when t.trang_thai = 'trong' then t.chu_ten end,
      'bay', t.bay, 'rieng', case when t.bang_id is null then '{}'::jsonb else public.p2d_kh_rieng(t.bang_id) end) order by t.tao_luc)
    from public.p2d_tinh_cau t left join public.p2d_bang b on b.id = t.bang_id where t.trang_thai in ('song', 'trong')), '[]'::jsonb);
end;
$$;

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
    'tinh', case when v_t.id is null then null else jsonb_build_object('id', v_t.id, 'ten', v_t.ten, 'mat_dat', v_t.mat_dat, 'hat', v_t.hat, 'cap', v_t.cap, 'bay_ver', v_t.bay_ver) end,
    'tran', case when v_tr.id is null then null else jsonb_build_object('ve', v_tr.id, 'cap', v_tr.cap, 'ten', v_tr.ten, 'mat_dat', v_tr.mat_dat, 'hat', v_tr.hat, 'cua_toi', v_tr.chu = v_uid) end,
    'cho', case when v_cho > now() then extract(epoch from v_cho - now())::integer else 0 end,
    'ct', coalesce((select jsonb_object_agg(ma, so) from public.p2d_kh_ct where bang_id = v_tv.bang_id and so > 0), '{}'::jsonb),
    'rieng', public.p2d_kh_rieng(v_tv.bang_id),
    'tho', coalesce((select jsonb_agg(public.p2d_bang_key(h.user_id, h.bang_id)) from public.p2d_kh_tho h where h.bang_id = v_tv.bang_id), '[]'::jsonb),
    'bay_quyen', v_t.id is not null and public.p2d_kh_quyen(v_uid, v_t.id),
    'anh', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'ten_ct', a.ten_ct, 'loai', a.loai, 'ten_npc', a.ten_npc, 'trang_thai', a.trang_thai, 'ghi_chu', a.ghi_chu, 'luc', a.tao_luc) order by a.tao_luc desc)
      from (select * from public.p2d_kh_anh where bang_id = v_tv.bang_id order by tao_luc desc limit 10) a), '[]'::jsonb));
end;
$$;

-- ===================== Mua, giao thợ =====================
create or replace function public.p2d_kh_mua(p_ma text, p_so integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_tv public.p2d_bang_tv%rowtype; v_gia numeric; v_so integer := coalesce(p_so, 1); v_k public.p2d_bang_kho%rowtype; v_n integer;
begin
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_tv.chuc <> 'chu' then raise exception 'khong_phai_chu' using errcode = '42501'; end if;
  if v_so not between 1 and 50 then raise exception 'thieu_cua' using errcode = '22023'; end if;
  v_gia := case when v_c -> 'ct' ? p_ma then (v_c -> 'ct' -> p_ma ->> 'lt')::numeric when v_c -> 'do' ? p_ma then (v_c ->> 'do_lt')::numeric end;
  if v_gia is null then raise exception 'ma_sai' using errcode = '22023'; end if;
  select * into v_k from public.p2d_bang_kho where bang_id = v_tv.bang_id for update;
  if coalesce(v_k.lt, 0) < v_gia * v_so then raise exception 'thieu_tien' using errcode = '22023'; end if;
  update public.p2d_bang_kho set lt = lt - v_gia * v_so where bang_id = v_tv.bang_id;
  insert into public.p2d_bang_kho_log (bang_id, user_id, lt, ly_do) values (v_tv.bang_id, v_uid, -v_gia * v_so, 'mua:' || p_ma);
  insert into public.p2d_kh_ct (bang_id, ma, so) values (v_tv.bang_id, p_ma, v_so)
    on conflict (bang_id, ma) do update set so = public.p2d_kh_ct.so + v_so returning so into v_n;
  return jsonb_build_object('ma', p_ma, 'so', v_n, 'lt', v_gia * v_so);
end;
$$;

create or replace function public.p2d_kh_giao(p_k text, p_on boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_tv public.p2d_bang_tv%rowtype; v_ai uuid;
begin
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found or v_tv.chuc <> 'chu' then raise exception 'khong_phai_chu' using errcode = '42501'; end if;
  select user_id into v_ai from public.p2d_bang_tv where bang_id = v_tv.bang_id and chuc = 'lao' and public.p2d_bang_key(user_id, bang_id) = p_k;
  if v_ai is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if p_on then insert into public.p2d_kh_tho (bang_id, user_id) values (v_tv.bang_id, v_ai) on conflict do nothing;
  else delete from public.p2d_kh_tho where bang_id = v_tv.bang_id and user_id = v_ai; end if;
  return p_on;
end;
$$;

-- ===================== Bày =====================
-- Lưu bố cục: kiểm quyền, phiên bản, từng món (mã trong danh mục hoặc công trình riêng, toạ độ trong đĩa, cỡ, lật, tên NPC),
-- số món mỗi mã không quá số tông môn sở hữu, tổng công trình / đồ nhỏ không quá mức của cấp. Ghi bản cũ vào lịch sử.
create or replace function public.p2d_kh_bay_luu(p_tinh uuid, p_items jsonb, p_ver integer)
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_t public.p2d_tinh_cau%rowtype; v_l jsonb; v_r jsonb;
  e jsonb; v_out jsonb := '[]'::jsonb; v_ma text; v_x numeric; v_y numeric; v_o jsonb; v_oo jsonb; v_s numeric; v_n text; v_d numeric; v_ct integer := 0; v_do integer := 0;
begin
  if not public.p2d_kh_quyen(v_uid, p_tinh) then raise exception 'khong_quyen' using errcode = '42501'; end if;
  select * into v_t from public.p2d_tinh_cau where id = p_tinh for update;
  if p_ver is not null and p_ver <> v_t.bay_ver then raise exception 'ver_cu' using errcode = '40001'; end if;
  if jsonb_typeof(p_items) <> 'array' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  v_l := public.p2d_kh_cap(v_t.cap); v_r := public.p2d_kh_rieng(v_t.bang_id); v_d := (v_l ->> 'd')::numeric;
  if jsonb_array_length(p_items) > (v_l ->> 'ct_max')::integer + (v_l ->> 'do_max')::integer then raise exception 'qua_nhieu' using errcode = '22023'; end if;
  for e in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(e) <> 'array' or jsonb_typeof(e -> 1) <> 'number' or jsonb_typeof(e -> 2) <> 'number' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
    v_ma := e ->> 0; v_x := round((e ->> 1)::numeric, 1); v_y := round((e ->> 2)::numeric, 1);
    if (v_x - v_d / 2) ^ 2 + (v_y - v_d / 2) ^ 2 > (v_d / 2 - 1) ^ 2 then raise exception 'ngoai_dia' using errcode = '22023'; end if;
    if v_c -> 'ct' ? v_ma or v_r ? v_ma then v_ct := v_ct + 1;
    elsif v_c -> 'do' ? v_ma then v_do := v_do + 1;
    else raise exception 'ma_sai' using errcode = '22023'; end if;
    v_o := case when jsonb_typeof(e -> 4) = 'object' then e -> 4 else '{}'::jsonb end; v_oo := '{}'::jsonb;
    if jsonb_typeof(v_o -> 's') = 'number' then v_s := least(4, greatest(0.2, round((v_o ->> 's')::numeric, 2))); if v_s <> 1 then v_oo := v_oo || jsonb_build_object('s', v_s); end if; end if;
    if coalesce((v_o ->> 'f')::text, '') in ('1', 'true') then v_oo := v_oo || jsonb_build_object('f', 1); end if;
    v_n := left(public.p2d_bang_sach(v_o ->> 'n'), 16);
    if char_length(v_n) >= 2 then v_oo := v_oo || jsonb_build_object('n', v_n); end if;
    v_out := v_out || jsonb_build_array(case when v_oo = '{}'::jsonb then jsonb_build_array(v_ma, v_x, v_y) else jsonb_build_array(v_ma, v_x, v_y, null, v_oo) end);
  end loop;
  if v_ct > (v_l ->> 'ct_max')::integer or v_do > (v_l ->> 'do_max')::integer then raise exception 'qua_nhieu' using errcode = '22023'; end if;
  if exists (select 1 from (select x ->> 0 ma, count(*) n from jsonb_array_elements(v_out) x group by 1) q
      left join public.p2d_kh_ct k on k.bang_id = v_t.bang_id and k.ma = q.ma where q.n > coalesce(k.so, 0)) then raise exception 'thieu_ct' using errcode = '22023'; end if;
  insert into public.p2d_kh_bay_ls (tinh_id, ver, items, user_id) values (p_tinh, v_t.bay_ver, v_t.bay, v_uid);
  update public.p2d_tinh_cau set bay = v_out, bay_ver = bay_ver + 1, ghe_luc = now() where id = p_tinh;
  return v_t.bay_ver + 1;
end;
$$;

create or replace function public.p2d_kh_bay_ls(p_tinh uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
begin
  if not public.p2d_kh_quyen(public.p2d_uid(), p_tinh) then raise exception 'khong_quyen' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'ver', l.ver, 'luc', l.luc, 'n', jsonb_array_length(l.items)) order by l.ver desc)
    from (select * from public.p2d_kh_bay_ls where tinh_id = p_tinh order by ver desc limit 30) l), '[]'::jsonb);
end;
$$;

create or replace function public.p2d_kh_bay_lay(p_id bigint)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_l public.p2d_kh_bay_ls%rowtype;
begin
  select * into v_l from public.p2d_kh_bay_ls where id = p_id;
  if not found or not public.p2d_kh_quyen(public.p2d_uid(), v_l.tinh_id) then raise exception 'khong_quyen' using errcode = '42501'; end if;
  return v_l.items;
end;
$$;

-- ===================== Gửi ảnh công trình =====================
-- Tông chủ đã tải ảnh lên kho kh-anh (thư mục mã của mình); máy chủ kiểm ảnh có thật, loại file, cỡ, số ảnh trong ngày, rồi xếp hàng chờ duyệt
create or replace function public.p2d_kh_anh_gui(p_duong text, p_ten_ct text, p_loai text, p_ten_npc text)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_tv public.p2d_bang_tv%rowtype; v_o record; v_ct text; v_npc text; v_id uuid;
begin
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found or v_tv.chuc <> 'chu' then raise exception 'khong_phai_chu' using errcode = '42501'; end if;
  if p_duong is null or split_part(p_duong, '/', 1) <> v_uid::text or p_duong like '%..%' then raise exception 'anh_sai' using errcode = '22023'; end if;
  select o.metadata into v_o from storage.objects o where o.bucket_id = 'kh-anh' and o.name = p_duong;
  if not found then raise exception 'anh_sai' using errcode = '22023'; end if;
  if coalesce((v_o.metadata ->> 'size')::bigint, 0) > (v_c -> 'anh' ->> 'mb')::numeric * 1048576
     or coalesce(v_o.metadata ->> 'mimetype', '') not in ('image/png', 'image/webp') then raise exception 'anh_sai' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_kh_anh where bang_id = v_tv.bang_id and tao_luc > now() - interval '1 day') >= (v_c -> 'anh' ->> 'ngay')::integer then raise exception 'het_luot' using errcode = '22023'; end if;
  if not (v_c -> 'loai_anh') ? coalesce(p_loai, '') then raise exception 'loai_sai' using errcode = '22023'; end if;
  v_ct := public.p2d_bang_sach(p_ten_ct); v_npc := public.p2d_bang_sach(p_ten_npc);
  if char_length(v_ct) not between 2 and 24 or char_length(v_npc) not between 2 and 16 then raise exception 'ten_sai' using errcode = '22023'; end if;
  insert into public.p2d_kh_anh (bang_id, user_id, duong, ten_ct, loai, ten_npc) values (v_tv.bang_id, v_uid, p_duong, v_ct, p_loai, v_npc) returning id into v_id;
  return v_id;
end;
$$;

-- ===================== Khiêu chiến tinh cầu bỏ trống =====================
-- Máy chủ quyết thắng thua: lực chiến hai bên nhân ngẫu nhiên 0,8–1,2 (như khiêu chiến Đại Ma Thần); trận so tài ở máy chỉ để xem.
-- Thắng: tinh cầu về tông môn mình, công trình đang đặt thành của tông môn mình. Thua: chờ kc_wait giây.
create or replace function public.p2d_kh_khieu_chien(p_tinh uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := public.p2d_kh_c(); v_nv public.p2d_nhan_vat%rowtype; v_tv public.p2d_bang_tv%rowtype; v_t public.p2d_tinh_cau%rowtype;
  v_ta numeric; v_cu numeric; v_thang boolean;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found or v_tv.chuc <> 'chu' then raise exception 'khong_phai_chu' using errcode = '42501'; end if;
  perform public.p2d_kh_quet();
  if exists (select 1 from public.p2d_tinh_cau where trang_thai = 'song' and (bang_id = v_tv.bang_id or chu = v_uid)) then raise exception 'co_tinh_cau' using errcode = '22023'; end if;
  select * into v_t from public.p2d_tinh_cau where id = p_tinh for update;
  if not found or v_t.trang_thai <> 'trong' then raise exception 'het_tran' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_kh_kc where user_id = v_uid and not thang and luc > now() - make_interval(secs => (v_c ->> 'kc_wait')::integer)) then raise exception 'dang_cho' using errcode = '22023'; end if;
  v_ta := greatest(coalesce(v_nv.luc_chien, 0), 0) * (0.8 + random() * 0.4);
  v_cu := greatest(coalesce((select luc_chien from public.p2d_nhan_vat where user_id = v_t.chu), 0), 0) * (0.8 + random() * 0.4);
  v_thang := v_ta >= v_cu;
  insert into public.p2d_kh_kc (tinh_id, user_id, thang, ta, cu) values (p_tinh, v_uid, v_thang, round(v_ta), round(v_cu));
  if v_thang then
    update public.p2d_tinh_cau set bang_id = v_tv.bang_id, chu = v_uid, trang_thai = 'song', ghe_luc = now(), bo_luc = null, chu_ten = null where id = p_tinh;
    insert into public.p2d_kh_ct (bang_id, ma, so)
      select v_tv.bang_id, x ->> 0, count(*) from jsonb_array_elements(v_t.bay) x where x ->> 0 not like 'u.%' group by x ->> 0
      on conflict (bang_id, ma) do update set so = greatest(public.p2d_kh_ct.so, excluded.so);
    update public.p2d_tinh_cau set bay = coalesce((select jsonb_agg(x) from jsonb_array_elements(v_t.bay) x where x ->> 0 not like 'u.%'), '[]'::jsonb) where id = p_tinh;
  end if;
  return jsonb_build_object('thang', v_thang, 'ta', round(v_ta), 'cu', round(v_cu), 'ten_cu', v_t.chu_ten, 'chu_cu', public.p2d_bang_ten_nguoi(v_t.chu), 'chu_k', public.p2d_chat_key(v_t.chu), 'cho', (v_c ->> 'kc_wait')::integer);
end;
$$;

revoke all on function public.p2d_kh_ds(), public.p2d_kh_toi(), public.p2d_kh_mua(text, integer), public.p2d_kh_giao(text, boolean), public.p2d_kh_bay_luu(uuid, jsonb, integer),
  public.p2d_kh_bay_ls(uuid), public.p2d_kh_bay_lay(bigint), public.p2d_kh_anh_gui(text, text, text, text), public.p2d_kh_khieu_chien(uuid) from public, anon;
grant execute on function public.p2d_kh_ds() to anon, authenticated;
grant execute on function public.p2d_kh_toi(), public.p2d_kh_mua(text, integer), public.p2d_kh_giao(text, boolean), public.p2d_kh_bay_luu(uuid, jsonb, integer),
  public.p2d_kh_bay_ls(uuid), public.p2d_kh_bay_lay(bigint), public.p2d_kh_anh_gui(text, text, text, text), public.p2d_kh_khieu_chien(uuid) to authenticated;
