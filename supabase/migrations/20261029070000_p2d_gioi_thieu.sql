-- Sự kiện "Dẫn đạo hữu nhập môn" (chủ dự án chốt 29/10/2026 07:19–07:26): mời người mới, người mới online liên tục 4 tiếng
-- thì người giới thiệu nhận 1 viên ngọc cấp 8 (không giới hạn số viên), người mới nhập mã nhận 1 viên ngọc cấp 5.
-- Chạy 2 tuần: 29/10 tới hết 12/11/2026 (giờ Đài Bắc). Bản đang chơi thử, sau này đặt lại hết nên luật nới.
-- Mã giới thiệu: 8 ký tự đầu của p2d_chat_key (mã công khai, không lộ id). Chỉ tài khoản tạo từ lúc sự kiện mở, trong 3 ngày đầu,
-- mới nhập được mã; mỗi người một lần; không mời chéo nhau. Phút online do máy chủ đếm (p2d_gt_nhip, mỗi phút một lần, ngắt quá
-- 5 phút thì đếm lại), máy khách không tự báo số giờ. Thưởng gửi qua Hòm thư (p2d_hom_thu, nội dung 'gem'): p2d_nhan_thu_moi
-- giờ nhận thêm ngọc vào data.gems. Loại ngọc mỗi người tự chọn (p2d_gt_chon), mặc định Hồng Ngọc.

create table if not exists public.p2d_gioi_thieu (
  user_id  uuid primary key references auth.users (id) on delete cascade,   -- người mới
  nguoi_gt uuid not null references auth.users (id) on delete cascade,      -- người giới thiệu
  nhap_luc timestamptz not null default now(),
  chuoi    integer not null default 0,                                       -- phút online liên tục hiện tại
  nhip_luc timestamptz,                                                       -- lần đếm phút gần nhất
  dat_luc  timestamptz                                                        -- lúc đủ 4 tiếng (đã gửi thưởng cho người giới thiệu)
);
create index if not exists p2d_gioi_thieu_nguoi_gt on public.p2d_gioi_thieu (nguoi_gt);
alter table public.p2d_gioi_thieu enable row level security;
revoke all on public.p2d_gioi_thieu from anon, authenticated;

create table if not exists public.p2d_gt_ngoc (
  user_id uuid primary key references auth.users (id) on delete cascade,
  loai    text not null check (loai in ('hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc'))
);
alter table public.p2d_gt_ngoc enable row level security;
revoke all on public.p2d_gt_ngoc from anon, authenticated;

-- Luật sự kiện (đổi ngày, số phút ở đây; chữ hiện cho người chơi ở data/referral.json)
create or replace function public.p2d_gt_luat()
returns jsonb language sql stable set search_path = ''
as $$
  select jsonb_build_object('bat_dau', '2026-10-29T00:00:00+08:00'::timestamptz, 'ket_thuc', '2026-11-13T00:00:00+08:00'::timestamptz,
                            'phut', 240, 'ngat_phut', 5, 'cap_gt', 8, 'cap_moi', 5, 'nhap_ngay', 3)
$$;
revoke all on function public.p2d_gt_luat() from public, anon, authenticated;

create or replace function public.p2d_gt_ma(p_uid uuid)
returns text language sql stable set search_path = ''
as $$ select upper(left(public.p2d_chat_key(p_uid), 8)) $$;
revoke all on function public.p2d_gt_ma(uuid) from public, anon, authenticated;

-- Trạng thái sự kiện của mình: mã, loại ngọc chọn, có nhập mã được không, tiến độ của mình (nếu được mời), danh sách người mình mời
create or replace function public.p2d_gt_cua_toi()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); c jsonb := public.p2d_gt_luat(); v_tao timestamptz; r public.p2d_gioi_thieu%rowtype; v_loai text;
  v_bd timestamptz := (c ->> 'bat_dau')::timestamptz; v_kt timestamptz := (c ->> 'ket_thuc')::timestamptz;
  v_ngat interval := make_interval(mins => (c ->> 'ngat_phut')::int);
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select created_at into v_tao from auth.users where id = v_uid;
  select * into r from public.p2d_gioi_thieu where user_id = v_uid;
  select loai into v_loai from public.p2d_gt_ngoc where user_id = v_uid;
  return c || jsonb_build_object(
    'ma', public.p2d_gt_ma(v_uid), 'loai', coalesce(v_loai, 'hong-ngoc'), 'dang_chay', now() >= v_bd and now() < v_kt,
    'nhap_duoc', r.user_id is null and now() >= v_bd and now() < v_kt and v_tao >= v_bd and now() - v_tao <= make_interval(days => (c ->> 'nhap_ngay')::int),
    'cua_toi', case when r.user_id is not null then jsonb_build_object('ten', public.p2d_ten_nguoi(r.nguoi_gt), 'dat', r.dat_luc is not null,
                 'chuoi', case when r.dat_luc is null and (r.nhip_luc is null or now() - r.nhip_luc > v_ngat) then 0 else r.chuoi end) end,
    'da_moi', (select coalesce(jsonb_agg(jsonb_build_object('ten', public.p2d_ten_nguoi(g.user_id), 'dat', g.dat_luc is not null,
                 'chuoi', case when g.dat_luc is null and (g.nhip_luc is null or now() - g.nhip_luc > v_ngat) then 0 else g.chuoi end) order by g.nhap_luc desc), '[]'::jsonb)
               from (select * from public.p2d_gioi_thieu where nguoi_gt = v_uid order by nhap_luc desc limit 50) g),
    'so_moi', (select count(*) from public.p2d_gioi_thieu where nguoi_gt = v_uid),
    'so_ngoc', (select count(*) from public.p2d_gioi_thieu where nguoi_gt = v_uid and dat_luc is not null));
end;
$$;

-- Người mới nhập mã: ghi người giới thiệu, gửi người mới 1 viên ngọc cấp cap_moi theo loại tự chọn
create or replace function public.p2d_gt_nhap(p_ma text, p_loai text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); c jsonb := public.p2d_gt_luat(); v_tao timestamptz; v_gt uuid; v_ma text := upper(btrim(coalesce(p_ma, '')));
  v_bd timestamptz := (c ->> 'bat_dau')::timestamptz; v_kt timestamptz := (c ->> 'ket_thuc')::timestamptz;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai is null or p_loai not in ('hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc') then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if v_ma !~ '^[0-9A-F]{8}$' then raise exception 'ma_sai' using errcode = '22023'; end if;
  if now() < v_bd or now() >= v_kt then raise exception 'het_su_kien' using errcode = '22023'; end if;
  select created_at into v_tao from auth.users where id = v_uid;
  if v_tao < v_bd or now() - v_tao > make_interval(days => (c ->> 'nhap_ngay')::int) then raise exception 'khong_phai_nguoi_moi' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_gioi_thieu where user_id = v_uid) then raise exception 'da_nhap' using errcode = '22023'; end if;
  select n.user_id into v_gt from public.p2d_nhan_vat n where public.p2d_gt_ma(n.user_id) = v_ma and n.user_id <> v_uid limit 1;
  if v_gt is null or exists (select 1 from public.p2d_gioi_thieu where user_id = v_gt and nguoi_gt = v_uid) then
    raise exception 'ma_sai' using errcode = '22023'; end if;
  insert into public.p2d_gioi_thieu (user_id, nguoi_gt) values (v_uid, v_gt);
  insert into public.p2d_gt_ngoc (user_id, loai) values (v_uid, p_loai) on conflict (user_id) do update set loai = excluded.loai;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
  values (v_uid, jsonb_build_object('gem', jsonb_build_object('key', p_loai || ':' || (c ->> 'cap_moi'), 'n', 1)), 'gioi_thieu_moi');
  return jsonb_build_object('ten', public.p2d_ten_nguoi(v_gt));
end;
$$;

create or replace function public.p2d_gt_chon(p_loai text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai is null or p_loai not in ('hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc') then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  insert into public.p2d_gt_ngoc (user_id, loai) values (v_uid, p_loai) on conflict (user_id) do update set loai = excluded.loai;
end;
$$;

-- Nhịp online của người được mời (máy khách gọi mỗi phút khi đang mở game): mỗi lần cách lần trước từ 50 giây tới ngat_phut
-- phút thì cộng 1 phút liên tục, ngắt lâu hơn thì đếm lại từ 1; đủ phut phút thì gửi người giới thiệu 1 viên ngọc cấp cap_gt
create or replace function public.p2d_gt_nhip()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); c jsonb := public.p2d_gt_luat(); r public.p2d_gioi_thieu%rowtype; v_chuoi integer; v_loai text;
  v_phut integer := (c ->> 'phut')::int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select * into r from public.p2d_gioi_thieu where user_id = v_uid for update;
  if not found then return jsonb_build_object('chuoi', 0, 'phut', v_phut, 'dat', false, 'khong', true); end if;
  if r.dat_luc is not null then return jsonb_build_object('chuoi', r.chuoi, 'phut', v_phut, 'dat', true); end if;
  if now() >= (c ->> 'ket_thuc')::timestamptz then return jsonb_build_object('chuoi', 0, 'phut', v_phut, 'dat', false, 'het', true); end if;
  if r.nhip_luc is not null and now() - r.nhip_luc < interval '50 seconds' then
    return jsonb_build_object('chuoi', r.chuoi, 'phut', v_phut, 'dat', false); end if;
  v_chuoi := case when r.nhip_luc is null or now() - r.nhip_luc > make_interval(mins => (c ->> 'ngat_phut')::int) then 1 else r.chuoi + 1 end;
  if v_chuoi >= v_phut then
    update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now(), dat_luc = now() where user_id = v_uid;
    select loai into v_loai from public.p2d_gt_ngoc where user_id = r.nguoi_gt;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
    values (r.nguoi_gt, jsonb_build_object('gem', jsonb_build_object('key', coalesce(v_loai, 'hong-ngoc') || ':' || (c ->> 'cap_gt'), 'n', 1),
                                           'tu', public.p2d_ten_nguoi(v_uid)), 'gioi_thieu');
    return jsonb_build_object('chuoi', v_chuoi, 'phut', v_phut, 'dat', true, 'vua_dat', true);
  end if;
  update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now() where user_id = v_uid;
  return jsonb_build_object('chuoi', v_chuoi, 'phut', v_phut, 'dat', false);
end;
$$;

revoke all on function public.p2d_gt_cua_toi(), public.p2d_gt_nhap(text, text), public.p2d_gt_chon(text), public.p2d_gt_nhip() from public, anon;
grant execute on function public.p2d_gt_cua_toi(), public.p2d_gt_nhap(text, text), public.p2d_gt_chon(text), public.p2d_gt_nhip() to authenticated;

-- Nhận thư: thêm nội dung 'gem' {key 'loai:cap', n} cộng vào data.gems (phần còn lại giữ như cũ)
create or replace function public.p2d_nhan_thu_moi(p_ids bigint[], p_uid_tu bigint default null)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_t record; v_next bigint; v_cho integer; v_item jsonb; v_lt numeric; v_ra jsonb := '[]'::jsonb; v_nd jsonb; v_gk text;
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
      v_nd := jsonb_set(v_nd, '{item}', v_item); v_next := v_next + 1; v_cho := v_cho - 1;
    end if;
    if v_nd ? 'coins' and jsonb_typeof(v_nd -> 'coins') = 'number' then
      v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt + (v_nd ->> 'coins')::numeric));
    end if;
    if v_nd ? 'mat' and jsonb_typeof(v_nd -> 'mat' -> 'n') = 'number' and coalesce(v_nd -> 'mat' ->> 'id', '') ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'mats') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mats}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['mats', v_nd -> 'mat' ->> 'id'], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (v_nd -> 'mat' ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (v_nd -> 'mat' ->> 'id'))::numeric end, 0) + (v_nd -> 'mat' ->> 'n')::numeric));
    end if;
    v_gk := v_nd -> 'gem' ->> 'key';
    if v_nd ? 'gem' and jsonb_typeof(v_nd -> 'gem' -> 'n') = 'number' and coalesce(v_gk, '') ~ '^(hong|lam|hoang|luc)-ngoc:([1-9]|10)$' then
      if jsonb_typeof(v_nv.data -> 'gems') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{gems}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['gems', v_gk], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_gk) = 'number' then (v_nv.data -> 'gems' ->> v_gk)::numeric end, 0) + (v_nd -> 'gem' ->> 'n')::numeric));
    end if;
    update public.p2d_hom_thu set nhan_luc = now() where id = v_t.id;
    v_ra := v_ra || jsonb_build_array(jsonb_build_object('id', v_t.id, 'noi_dung', v_nd, 'ly_do', v_t.ly_do));
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    v_nv.data := jsonb_set(v_nv.data, '{nextUid}', to_jsonb(v_next));
    update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_nv.phien_ban;
  end if;
  return jsonb_build_object('thu', v_ra, 'phien_ban', v_nv.phien_ban, 'next_uid', v_next);
end;
$function$;
revoke all on function public.p2d_nhan_thu_moi(bigint[], bigint) from public, anon;
grant execute on function public.p2d_nhan_thu_moi(bigint[], bigint) to authenticated;

-- Tổng hợp mỗi giờ: thêm số người nhập mã mới và ngọc cấp 8 vừa phát (giữ nguyên các mục cũ)
create or replace function public.p2d_tong_hop(p_khoa text default 'email')
returns jsonb language sql stable security definer set search_path = ''
as $$
  with m as (select coalesce((select luc from public.p2d_theo_doi where khoa = p_khoa), now() - interval '1 hour') as tu, now() as den)
  select jsonb_build_object(
    'tu', m.tu, 'den', m.den,
    'gop_y', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'loai', g.loai, 'tieu_de', g.tieu_de, 'mo_ta', left(g.mo_ta, 160),
                'ten', public.p2d_ten_nguoi(g.user_id), 'trang_thai', g.trang_thai, 'luc', g.tao_luc) order by g.id), '[]'::jsonb)
              from public.p2d_gop_y g where g.tao_luc > m.tu and g.tao_luc <= m.den),
    'nghi_van', (select coalesce(jsonb_agg(x order by (x ->> 'lan')::int desc), '[]'::jsonb) from (
                 select jsonb_build_object('ten', public.p2d_ten_nguoi(v.user_id), 'ly_do', string_agg(distinct v.ly_do, ', '), 'lan', count(*),
                        'canh_gioi', max(n.canh_gioi), 'tong_co', max(n.nghi_van)) x
                   from public.p2d_nghi_van v left join public.p2d_nhan_vat n on n.user_id = v.user_id
                  where v.luc > m.tu and v.luc <= m.den and v.ly_do <> 'do_da_rao'
                  group by v.user_id) s),
    'loi_js', (select coalesce(jsonb_agg(jsonb_build_object('tin', left(l.tin, 160), 'lan', l.lan, 'ban', left(l.ban, 60), 'may', left(l.may, 80)) order by l.cuoi desc), '[]'::jsonb)
               from (select * from public.p2d_loi where cuoi > m.tu and cuoi <= m.den order by cuoi desc limit 15) l),
    'bao_cao_chat', (select coalesce(jsonb_agg(jsonb_build_object('ly_do', b.ly_do, 'kenh', b.kenh, 'noi_dung', left(b.noi_dung, 120), 'bi_bao', public.p2d_ten_nguoi(b.bi_bao)) order by b.id), '[]'::jsonb)
                     from public.p2d_bao_cao b where b.luc > m.tu and b.luc <= m.den),
    'nguoi_choi', (select count(*) from public.p2d_nhan_vat where luu_luc > m.tu),
    'tai_khoan_moi', (select count(*) from auth.users where created_at > m.tu and created_at <= m.den),
    'gop_y_cho', (select count(*) from public.p2d_gop_y where trang_thai in ('moi', 'dang_xem')),
    'gioi_thieu', jsonb_build_object(
      'nhap_ma', (select count(*) from public.p2d_gioi_thieu where nhap_luc > m.tu and nhap_luc <= m.den),
      'ngoc_8', (select coalesce(jsonb_agg(jsonb_build_object('nguoi_gt', public.p2d_ten_nguoi(g.nguoi_gt), 'nguoi_moi', public.p2d_ten_nguoi(g.user_id)) order by g.dat_luc), '[]'::jsonb)
                 from public.p2d_gioi_thieu g where g.dat_luc > m.tu and g.dat_luc <= m.den),
      'dang_dem', (select count(*) from public.p2d_gioi_thieu where dat_luc is null and nhip_luc > now() - interval '5 minutes'))
  ) from m
$$;
revoke all on function public.p2d_tong_hop(text) from public, anon, authenticated;
