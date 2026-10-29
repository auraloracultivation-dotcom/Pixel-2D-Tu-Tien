-- Chống một người dùng nhiều tài khoản ăn thưởng Dẫn đạo hữu nhập môn (chủ dự án 29/10/2026 10:14–10:17). Đã thấy hai tài khoản
-- mới cùng dải mạng, tạo cách nhau 97 giây, nhập cùng một mã rồi cùng treo đếm. Chủ dự án: kệ hai người đó, nhưng tránh để sau
-- không ai lặp lại; xác định rõ thì gắn cờ trên bảng xếp hạng (nghi_van >= 10: p2d_bxh tô đỏ, cắm cờ).
-- 1. Mã thiết bị: mỗi trình duyệt giữ một mã ngẫu nhiên (máy khách, localStorage 'p2d.may', giữ nguyên khi đổi tài khoản), báo
--    qua p2d_thiet_bi_bao lúc vào game. Máy đã có tài khoản người mời, hoặc đã có tài khoản khác nhập mã mời, thì không nhập mã
--    được nữa ('trung_may', ghi p2d_nghi_van 'gt_trung_may'): mỗi máy một suất.
-- 2. Cùng người mời, cùng mạng (IPv4 chung /22, IPv6 chung /56) hoặc cùng máy: mỗi lúc chỉ một người được đếm phút, người kia tạm
--    dừng (giữ số phút, không bị đếm lại), người đang đếm xong hoặc thoát thì tới lượt. Mạng di động nhiều người chung địa chỉ nên
--    chỉ tạm dừng, không phạt (ghi p2d_nghi_van 'gt_cung_mang' một lần để chủ dự án xem).
-- 3. Xác định rõ: người được mời dùng chung máy với người mời, hoặc với người khác cùng người mời (lọt bước 1 vì nhập mã ở máy
--    khác), thì thôi đếm hẳn (khoa_luc); cả hai tài khoản bị gắn cờ (nghi_van >= 10) và ghi p2d_nghi_van 'gt_nhieu_tk'.
-- Người đã nhập mã trước luật này (trước 29/10/2026 10:20 giờ Đài Bắc) không bị bước 2 (chủ dự án: kệ họ).

create table if not exists public.p2d_thiet_bi (
  user_id  uuid not null references auth.users (id) on delete cascade,
  may      text not null check (may ~ '^[a-z0-9]{16,40}$'),
  lan_dau  timestamptz not null default now(),
  lan_cuoi timestamptz not null default now(),
  primary key (user_id, may)
);
create index if not exists p2d_thiet_bi_may on public.p2d_thiet_bi (may);
alter table public.p2d_thiet_bi enable row level security;
revoke all on public.p2d_thiet_bi from anon, authenticated;

alter table public.p2d_gioi_thieu
  add column if not exists mang text,                                   -- dải mạng lần đếm gần nhất
  add column if not exists tam_dung boolean not null default false,     -- đang chờ lượt (bước 2)
  add column if not exists khoa_luc timestamptz;                        -- thôi đếm vì dùng chung máy (bước 3)

-- Dải mạng của lần gọi hiện tại: cf-connecting-ip (Cloudflare đặt, máy khách không giả được), rồi địa chỉ lúc đăng nhập
-- (auth.sessions), sau cùng x-forwarded-for
create or replace function public.p2d_mang()
returns text language plpgsql stable security definer set search_path = ''
as $$
declare v_h json; v_ip inet;
begin
  begin v_h := nullif(current_setting('request.headers', true), '')::json; exception when others then v_h := null; end;
  begin v_ip := nullif(btrim(v_h ->> 'cf-connecting-ip'), '')::inet; exception when others then v_ip := null; end;
  if v_ip is null then
    begin
      select s.ip into v_ip from auth.sessions s
       where s.id = nullif(nullif(current_setting('request.jwt.claims', true), '')::json ->> 'session_id', '')::uuid;
    exception when others then v_ip := null; end;
  end if;
  if v_ip is null then
    begin v_ip := nullif(btrim(split_part(v_h ->> 'x-forwarded-for', ',', 1)), '')::inet; exception when others then v_ip := null; end;
  end if;
  if v_ip is null then return null; end if;
  return network(set_masklen(v_ip, case when family(v_ip) = 4 then 22 else 56 end))::text;
end;
$$;
revoke all on function public.p2d_mang() from public, anon, authenticated;

-- Máy khách báo mã thiết bị lúc vào game (tối đa 20 máy mỗi tài khoản)
create or replace function public.p2d_thiet_bi_bao(p_may text)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_may is null or p_may !~ '^[a-z0-9]{16,40}$' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  update public.p2d_thiet_bi set lan_cuoi = now() where user_id = v_uid and may = p_may;
  if not found and (select count(*) from public.p2d_thiet_bi where user_id = v_uid) < 20 then
    insert into public.p2d_thiet_bi (user_id, may) values (v_uid, p_may) on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.p2d_thiet_bi_bao(text) from public, anon;
grant execute on function public.p2d_thiet_bi_bao(text) to authenticated;

-- Tài khoản khác dùng chung máy với p_uid: là người mời p_gt, hoặc đã nhập mã (p_bat_ky: mã của bất kỳ ai; không thì mã của p_gt)
create or replace function public.p2d_gt_cung_may(p_uid uuid, p_gt uuid, p_bat_ky boolean)
returns uuid language sql stable security definer set search_path = ''
as $$
  select b.user_id from public.p2d_thiet_bi a
    join public.p2d_thiet_bi b on b.may = a.may and b.user_id <> a.user_id
   where a.user_id = p_uid
     and (b.user_id = p_gt or exists (select 1 from public.p2d_gioi_thieu g where g.user_id = b.user_id and (p_bat_ky or g.nguoi_gt = p_gt)))
   limit 1
$$;
revoke all on function public.p2d_gt_cung_may(uuid, uuid, boolean) from public, anon, authenticated;

-- Trạng thái sự kiện của mình (giữ như cũ, thêm tam_dung, khoa cho mình và cho từng người mình mời)
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
                 'chuoi', case when r.dat_luc is null and (r.nhip_luc is null or now() - r.nhip_luc > v_ngat) then 0 else r.chuoi end,
                 'tam_dung', r.tam_dung and r.nhip_luc > now() - interval '3 minutes', 'khoa', r.khoa_luc is not null) end,
    'da_moi', (select coalesce(jsonb_agg(jsonb_build_object('ten', public.p2d_ten_nguoi(g.user_id), 'dat', g.dat_luc is not null,
                 'chuoi', case when g.dat_luc is null and (g.nhip_luc is null or now() - g.nhip_luc > v_ngat) then 0 else g.chuoi end,
                 'tam_dung', g.tam_dung and g.nhip_luc > now() - interval '3 minutes', 'khoa', g.khoa_luc is not null) order by g.nhap_luc desc), '[]'::jsonb)
               from (select * from public.p2d_gioi_thieu where nguoi_gt = v_uid order by nhap_luc desc limit 50) g),
    'so_moi', (select count(*) from public.p2d_gioi_thieu where nguoi_gt = v_uid),
    'so_ngoc', (select count(*) from public.p2d_gioi_thieu where nguoi_gt = v_uid and dat_luc is not null));
end;
$$;

-- Nhập mã (giữ như cũ, thêm bước 1). Bị chặn vì trùng máy thì trả {loi: 'trung_may'} thay vì báo lỗi, để còn ghi p2d_nghi_van.
-- Bản game cũ chưa báo mã máy thì bỏ qua bước 1 (mã máy do máy khách tự báo, bắt buộc cũng không chặn được người gọi thẳng API).
create or replace function public.p2d_gt_nhap(p_ma text, p_loai text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); c jsonb := public.p2d_gt_luat(); v_tao timestamptz; v_gt uuid; v_ma text := upper(btrim(coalesce(p_ma, '')));
  v_bd timestamptz := (c ->> 'bat_dau')::timestamptz; v_kt timestamptz := (c ->> 'ket_thuc')::timestamptz; v_khac uuid;
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
  v_khac := public.p2d_gt_cung_may(v_uid, v_gt, true);
  if v_khac is not null then
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
    values (v_uid, 'gt_trung_may', jsonb_build_object('nguoi_gt', public.p2d_ten_nguoi(v_gt), 'cung_may', public.p2d_ten_nguoi(v_khac)));
    return jsonb_build_object('loi', 'trung_may');
  end if;
  insert into public.p2d_gioi_thieu (user_id, nguoi_gt) values (v_uid, v_gt);
  insert into public.p2d_gt_ngoc (user_id, loai) values (v_uid, p_loai) on conflict (user_id) do update set loai = excluded.loai;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
  values (v_uid, jsonb_build_object('gem', jsonb_build_object('key', p_loai || ':' || (c ->> 'cap_moi'), 'n', 1)), 'gioi_thieu_moi');
  return jsonb_build_object('ten', public.p2d_ten_nguoi(v_gt));
end;
$$;

-- Nhịp online (giữ như cũ, thêm bước 2 và 3). Khoá theo người mời để hai người cùng nhóm không cùng lúc giành lượt.
create or replace function public.p2d_gt_nhip()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); c jsonb := public.p2d_gt_luat(); r public.p2d_gioi_thieu%rowtype; v_chuoi integer; v_loai text;
  v_phut integer := (c ->> 'phut')::int; v_ngat interval := make_interval(mins => (c ->> 'ngat_phut')::int);
  v_mang text; v_khac uuid; v_tu timestamptz := '2026-10-29T10:20:00+08:00';
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select * into r from public.p2d_gioi_thieu where user_id = v_uid;
  if not found then return jsonb_build_object('chuoi', 0, 'phut', v_phut, 'dat', false, 'khong', true); end if;
  perform pg_advisory_xact_lock(hashtext('p2d_gt:' || r.nguoi_gt::text));
  select * into r from public.p2d_gioi_thieu where user_id = v_uid for update;
  if r.dat_luc is not null then return jsonb_build_object('chuoi', r.chuoi, 'phut', v_phut, 'dat', true); end if;
  if r.khoa_luc is not null then return jsonb_build_object('chuoi', r.chuoi, 'phut', v_phut, 'dat', false, 'khoa', true); end if;
  if now() >= (c ->> 'ket_thuc')::timestamptz then return jsonb_build_object('chuoi', 0, 'phut', v_phut, 'dat', false, 'het', true); end if;
  if r.nhip_luc is not null and now() - r.nhip_luc < interval '50 seconds' then
    return jsonb_build_object('chuoi', r.chuoi, 'phut', v_phut, 'dat', false, 'tam_dung', r.tam_dung); end if;
  -- Bước 3: chung máy với người mời hoặc người cùng người mời
  v_khac := public.p2d_gt_cung_may(v_uid, r.nguoi_gt, false);
  if v_khac is not null then
    update public.p2d_gioi_thieu set khoa_luc = now(), tam_dung = false where user_id = v_uid;
    update public.p2d_nhan_vat set nghi_van = greatest(nghi_van, 10) where user_id in (v_uid, v_khac);
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values
      (v_uid, 'gt_nhieu_tk', jsonb_build_object('nguoi_gt', public.p2d_ten_nguoi(r.nguoi_gt), 'cung_may', public.p2d_ten_nguoi(v_khac))),
      (v_khac, 'gt_nhieu_tk', jsonb_build_object('nguoi_gt', public.p2d_ten_nguoi(r.nguoi_gt), 'cung_may', public.p2d_ten_nguoi(v_uid)));
    return jsonb_build_object('chuoi', r.chuoi, 'phut', v_phut, 'dat', false, 'khoa', true);
  end if;
  v_mang := public.p2d_mang();
  v_chuoi := case when r.nhip_luc is null or now() - r.nhip_luc > v_ngat then 1 else r.chuoi + 1 end;
  -- Bước 2: người khác cùng người mời, cùng mạng hoặc cùng máy, đang được đếm thì chờ lượt
  if r.nhap_luc >= v_tu and exists (
       select 1 from public.p2d_gioi_thieu g
        where g.nguoi_gt = r.nguoi_gt and g.user_id <> v_uid and g.dat_luc is null and g.khoa_luc is null and not g.tam_dung
          and g.nhip_luc > now() - interval '90 seconds'
          and ((v_mang is not null and g.mang = v_mang)
               or exists (select 1 from public.p2d_thiet_bi a join public.p2d_thiet_bi b on b.may = a.may where a.user_id = v_uid and b.user_id = g.user_id))) then
    if not exists (select 1 from public.p2d_nghi_van where user_id = v_uid and ly_do = 'gt_cung_mang') then
      insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
      values (v_uid, 'gt_cung_mang', jsonb_build_object('nguoi_gt', public.p2d_ten_nguoi(r.nguoi_gt), 'mang', v_mang));
    end if;
    v_chuoi := v_chuoi - 1;
    update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now(), tam_dung = true, mang = v_mang where user_id = v_uid;
    return jsonb_build_object('chuoi', v_chuoi, 'phut', v_phut, 'dat', false, 'tam_dung', true);
  end if;
  if v_chuoi >= v_phut then
    update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now(), dat_luc = now(), tam_dung = false, mang = v_mang where user_id = v_uid;
    select loai into v_loai from public.p2d_gt_ngoc where user_id = r.nguoi_gt;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
    values (r.nguoi_gt, jsonb_build_object('gem', jsonb_build_object('key', coalesce(v_loai, 'hong-ngoc') || ':' || (c ->> 'cap_gt'), 'n', 1),
                                           'tu', public.p2d_ten_nguoi(v_uid)), 'gioi_thieu');
    return jsonb_build_object('chuoi', v_chuoi, 'phut', v_phut, 'dat', true, 'vua_dat', true);
  end if;
  update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now(), tam_dung = false, mang = v_mang where user_id = v_uid;
  return jsonb_build_object('chuoi', v_chuoi, 'phut', v_phut, 'dat', false);
end;
$$;
