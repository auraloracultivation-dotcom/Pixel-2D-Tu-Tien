-- Chủ dự án chọn 31/10/2026 08:0x:
-- 1) Mở ngọc lên 20 cấp, ghép 3 → 1 như cũ (data/items.json → gems). Máy chủ: các hàm còn chặn khoá ngọc tới cấp 10
--    (p2d_nhan_thu_moi nhận ngọc qua Hòm thư, p2d_rao_ban trả ngọc khảm về túi khi rao bán) đổi sang cho tới cấp 20.
-- 2) Sự kiện giới thiệu: người được mời cùng mạng với người mời, hoặc cùng mạng với người khác cùng người mời, chỉ được tính 1 lần
--    cho mỗi người mời; lần sau cùng mạng thì thôi đếm (khoa_luc, cờ gt_cung_mang_lan2). Mạng của người mời lấy từ nhịp sống
--    (p2d_nhip.mang, p2d_nhip_song ghi). Lượt đã tính trước đây (pmookaat / pmookaat1 đang đếm) giữ nguyên.

do $$
declare v_def text;
begin
  for v_def in select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace s on s.oid = p.pronamespace
                where s.nspname = 'public' and p.prokind = 'f' and p.prosrc like '%ngoc:([1-9]|10)$%' loop
    execute replace(v_def, 'ngoc:([1-9]|10)$', 'ngoc:([1-9]|1[0-9]|20)$');
  end loop;
end;
$$;

alter table public.p2d_nhip add column if not exists mang text;
alter table public.p2d_gioi_thieu add column if not exists cung_mang boolean not null default false;

create or replace function public.p2d_nhip_song()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
begin
  insert into public.p2d_nhip as n (user_id, luc, giay, mang) values (v_uid, now(), 0, public.p2d_mang())
  on conflict (user_id) do update
    set giay = least(n.giay + case when now() - n.luc <= interval '15 seconds' then extract(epoch from (now() - n.luc)) else 0 end, 43200),
        luc = now(), mang = coalesce(excluded.mang, n.mang);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.p2d_nhip_song() from public, anon;
grant execute on function public.p2d_nhip_song() to authenticated;

create or replace function public.p2d_gt_nhip()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); c jsonb := public.p2d_gt_luat(); r public.p2d_gioi_thieu%rowtype; v_chuoi integer; v_loai text;
  v_phut integer := (c ->> 'phut')::int; v_ngat interval := make_interval(mins => (c ->> 'ngat_phut')::int);
  v_mang text; v_khac uuid; v_cung boolean := false; v_tu timestamptz := '2026-10-29T10:20:00+08:00';
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
    -- Cùng mạng với người mời hoặc với người khác cùng người mời: chỉ được nhận 1 lần (chủ dự án 31/10/2026 08:0x).
    -- Đã có một người cùng mạng được tính rồi thì thôi đếm hẳn người này (khoa_luc), muốn thêm phải mời người thật.
    v_cung := v_mang is not null and (v_mang = (select h.mang from public.p2d_nhip h where h.user_id = r.nguoi_gt)
              or exists (select 1 from public.p2d_gioi_thieu g where g.nguoi_gt = r.nguoi_gt and g.user_id <> v_uid and g.mang = v_mang));
    if v_cung and exists (select 1 from public.p2d_gioi_thieu g where g.nguoi_gt = r.nguoi_gt and g.user_id <> v_uid and g.dat_luc is not null and g.cung_mang) then
      update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now(), khoa_luc = now(), tam_dung = false, mang = v_mang where user_id = v_uid;
      if not exists (select 1 from public.p2d_nghi_van where user_id = v_uid and ly_do = 'gt_cung_mang_lan2') then
        insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
        values (v_uid, 'gt_cung_mang_lan2', jsonb_build_object('nguoi_gt', public.p2d_ten_nguoi(r.nguoi_gt), 'mang', v_mang));
      end if;
      return jsonb_build_object('chuoi', v_chuoi, 'phut', v_phut, 'dat', false, 'khoa', true);
    end if;
    update public.p2d_gioi_thieu set chuoi = v_chuoi, nhip_luc = now(), dat_luc = now(), tam_dung = false, mang = v_mang, cung_mang = v_cung where user_id = v_uid;
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
