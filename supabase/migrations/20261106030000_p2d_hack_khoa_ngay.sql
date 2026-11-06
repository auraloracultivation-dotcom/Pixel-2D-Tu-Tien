-- Hack rõ thì khoá ngay, không cần đủ cờ (chủ dự án 06/11/2026: "hack thì band ngay k cần đủ cờ.
-- Cờ chỉ là để đánh dấu nghi vấn khi chưa xác định rõ nguyên nhân").
-- Trước (20261105160000): đồ giả phải từ 3 lần/24h; Linh Thạch lố phải 10 lần kèm 10 lần linh khí lố,
-- nên acc phụ chuỗi thiende (thiende003, vothan009: 4 lần Linh Thạch lố trong 1 giờ đầu) lọt qua.
-- Giờ trigger p2d_co_do_xet khoá ngay lần đầu khi có: do_sai_chi_so, roi_sai, ngoc_sai, sua_do (cường hoá nhảy cấp, không phải *_cu),
-- day_cuc (Linh Thạch vượt cả trần lẫn hạn mức); và khoá tài khoản dưới 3 ngày tuổi có từ 3 lần Linh Thạch lố/24h.
-- Giữ: linh khí lố 10 + Linh Thạch lố 10; miễn khoá p2d_mien_khoa; Đại Ma Thần bỏ qua; cờ *_cu (bản game cũ) không tính.
-- Thử lại toàn bộ p2d_nghi_van: chỉ trúng tài khoản đã khoá (chuỗi thiende, vothan009) và Đạo hữu 2DDC (được miễn).
-- Cờ đỏ (phần 1) giữ nguyên. Lỗi trong trigger không bao giờ làm hỏng lần lưu. Chạy lại không đổi gì.

create or replace function public.p2d_co_do_xet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_r text[]; v_ly text; v_x text; v_n integer; v_lk integer; v_lt integer; v_khoa text;
begin
  begin
    if new.user_id is null or new.ly_do is null then return null; end if;
    if exists (select 1 from public.p2d_thien_ma t where t.user_id = new.user_id) then return null; end if;
    v_r := string_to_array(new.ly_do, ',');

    -- 1. Cờ đỏ (20261105140000)
    if not exists (select 1 from public.p2d_co_do c where c.user_id = new.user_id) then
      if v_r && array['do_sai_chi_so', 'roi_sai'] then
        v_ly := array_to_string(array(select x from unnest(v_r) x where x in ('do_sai_chi_so', 'roi_sai')), ',');
      elsif new.ly_do not like '%\_cu%' then
        foreach v_x in array array['linh_thach', 'linh_khi', 'sua_do', 'ngoc_sai', 'thu_sua'] loop
          continue when not (v_x = any (v_r));
          select count(*) into v_n from public.p2d_nghi_van v
           where v.user_id = new.user_id and v.luc > now() - interval '24 hours'
             and v_x = any (string_to_array(v.ly_do, ',')) and v.ly_do not like '%\_cu%';
          if v_n >= 5 then v_ly := v_x || ' x' || v_n || '/24h'; exit; end if;
        end loop;
      end if;
      if v_ly is not null then
        insert into public.p2d_co_do (user_id, ly_do, tu_dong) values (new.user_id, v_ly, true) on conflict (user_id) do nothing;
        if found then
          insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
          values (new.user_id, 'co_do', jsonb_build_object('ly_do', 'Tự động (20261105140000): ' || v_ly, 'nghi_van_id', new.id, 'tu_dong', true));
          begin
            update public.p2d_nhan_vat set nghi_van = greatest(nghi_van, 10) where user_id = new.user_id and nghi_van < 10;
          exception when others then null;
          end;
        end if;
      end if;
    end if;

    -- 2. Tự khoá (20261105160000; siết 20261106030000, chủ dự án 06/11: "hack thì band ngay k cần đủ cờ,
    --    cờ chỉ để đánh dấu nghi vấn khi chưa xác định rõ nguyên nhân")
    if not (v_r && array['do_sai_chi_so', 'roi_sai', 'ngoc_sai', 'sua_do', 'day_cuc', 'linh_khi', 'linh_thach']) then return null; end if;
    if exists (select 1 from public.p2d_mien_khoa m where m.user_id = new.user_id) then return null; end if;
    if exists (select 1 from auth.users u where u.id = new.user_id and u.banned_until > now()) then return null; end if;
    if v_r && array['do_sai_chi_so', 'roi_sai', 'ngoc_sai', 'sua_do', 'day_cuc'] then
      -- hack rõ, khoá ngay lần đầu: đồ / đồ rơi giả, ngọc không hợp lệ, cường hoá nhảy cấp, Linh Thạch vượt cả trần lẫn hạn mức
      v_khoa := 'hack rõ: ' || array_to_string(array(select x from unnest(v_r) x
                  where x in ('do_sai_chi_so', 'roi_sai', 'ngoc_sai', 'sua_do', 'day_cuc')), ',');
    else
      select count(*) filter (where 'linh_khi' = any (string_to_array(v.ly_do, ','))),
             count(*) filter (where 'linh_thach' = any (string_to_array(v.ly_do, ',')))
        into v_lk, v_lt
        from public.p2d_nghi_van v
       where v.user_id = new.user_id and v.luc > now() - interval '24 hours' and v.ly_do not like '%\_cu%';
      if v_lk >= 10 and v_lt >= 10 then
        v_khoa := 'linh khí lố x' || v_lk || ' + Linh Thạch lố x' || v_lt || '/24h';
      elsif v_lt >= 3 and exists (select 1 from auth.users u where u.id = new.user_id and u.created_at > now() - interval '72 hours') then
        -- tài khoản mới (dưới 3 ngày) cày Linh Thạch lố liên tục: kiểu acc phụ chuỗi thiende (người chơi thật tối đa 2 lần)
        v_khoa := 'tài khoản mới, Linh Thạch lố x' || v_lt || '/24h';
      end if;
    end if;
    if v_khoa is null then return null; end if;
    insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
    select n.user_id, 'khoa_hack', jsonb_build_object('data', n.data, 'canh_gioi', n.canh_gioi, 'luc_chien', n.luc_chien, 'tang', n.tang,
             'banned_until_cu', (select u.banned_until from auth.users u where u.id = n.user_id), 'tu_dong', true, 'nghi_van_id', new.id,
             'ly_do', 'Tự khoá (20261106030000, chủ dự án 06/11 "hack thì band ngay"): ' || v_khoa)
    from public.p2d_nhan_vat n where n.user_id = new.user_id;
    update auth.users set banned_until = '2126-01-01 00:00:00+00' where id = new.user_id;
    begin
      update auth.refresh_tokens set revoked = true where user_id = new.user_id::text and revoked is not true;
    exception when others then null;
    end;
  exception when others then
    null;   -- không bao giờ làm hỏng lần lưu
  end;
  return null;
end;
$$;
revoke all on function public.p2d_co_do_xet() from public, anon, authenticated;


-- Tự kiểm tra (không ghi gì)
do $kt$
begin
  if position('day_cuc' in pg_get_functiondef('public.p2d_co_do_xet()'::regprocedure)) = 0 then raise exception 'kt: ham chua doi'; end if;
  if position('p2d_mien_khoa' in pg_get_functiondef('public.p2d_co_do_xet()'::regprocedure)) = 0 then raise exception 'kt: mat mien khoa'; end if;
end;
$kt$;
