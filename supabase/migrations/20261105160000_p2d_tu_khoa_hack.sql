-- Tự khoá khi hack quá rõ (chủ dự án 05/11/2026 23:49: "Hack quá rõ thì phải khoá ngay nha").
-- Trước đây máy chủ chỉ tự bật cờ đỏ (20261105140000); khoá tài khoản do Claude làm tay trong lượt kiểm tra 2 giờ (đã tắt 23:35).
-- Giờ trigger p2d_co_do_xet (sau khi ghi p2d_nghi_van) tự khoá khi:
--   - đồ rơi giả / đồ sai chỉ số (roi_sai, do_sai_chi_so) từ 3 lần trong 24 giờ, hoặc
--   - linh khí lố VÀ Linh Thạch lố cùng từ 10 lần trong 24 giờ (không tính cờ bản game cũ *_cu).
-- Thử lại toàn bộ p2d_nghi_van: chỉ trúng Thiên đế, Vô thượng thiên, Chiến thần (đã khoá tay) và Đạo hữu 2DDC (được miễn).
-- Không trúng người chơi thường (kể cả baongoc22 / Đạo hữu 242A dính một loại cờ hồi 28–29/10).
-- Miễn khoá: bảng p2d_mien_khoa (chủ dự án quyết): Đạo hữu 2DDC (05/11 16:43, 17:31: chỉ thu đồ, vá lỗ, không khoá),
-- Đạo hữu 0AD2 (05/11: "K khoá"); Đại Ma Thần (p2d_thien_ma) luôn bỏ qua.
-- Khoá = sao lưu bản lưu vào p2d_xu_ly ('khoa_hack', tu_dong) + auth.users.banned_until = 2126-01-01 + thu hồi refresh token
-- (phiên đang mở hết hạn trong tối đa 1 giờ; trong lúc đó vẫn bị cờ đỏ, máy chủ vẫn chặn từng lần lưu).
-- Lỗi trong trigger không bao giờ làm hỏng lần lưu. Mở khoá: chỉ chủ dự án. Chạy lại không đổi gì.

create table if not exists public.p2d_mien_khoa (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ly_do text not null,
  luc timestamptz not null default now()
);
alter table public.p2d_mien_khoa enable row level security;
revoke all on table public.p2d_mien_khoa from public, anon, authenticated;

insert into public.p2d_mien_khoa (user_id, ly_do)
select u.id, x.ly_do
from (values ('a1ba5912-562b-4cbb-999e-0c33265a0289'::uuid, 'Đạo hữu 2DDC: chủ dự án 05/11 16:43 + 17:31 — hack thì thu đồ, vá lỗ, giữ cờ đỏ, không khoá')) x (id, ly_do)
join auth.users u on u.id = x.id
on conflict (user_id) do nothing;
insert into public.p2d_mien_khoa (user_id, ly_do)
select n.user_id, 'Đạo hữu 0AD2: chủ dự án 05/11 "K khoá"'
from public.p2d_nhan_vat n where n.ten = 'Đạo hữu 0AD2'
on conflict (user_id) do nothing;

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

    -- 2. Tự khoá khi hack quá rõ (20261105160000)
    if not (v_r && array['do_sai_chi_so', 'roi_sai', 'linh_khi', 'linh_thach']) then return null; end if;
    if exists (select 1 from public.p2d_mien_khoa m where m.user_id = new.user_id) then return null; end if;
    if exists (select 1 from auth.users u where u.id = new.user_id and u.banned_until > now()) then return null; end if;
    select count(*) into v_n from public.p2d_nghi_van v
     where v.user_id = new.user_id and v.luc > now() - interval '24 hours'
       and string_to_array(v.ly_do, ',') && array['do_sai_chi_so', 'roi_sai'];
    if v_n >= 3 then
      v_khoa := 'đồ giả / đồ sai chỉ số x' || v_n || '/24h';
    else
      select count(*) filter (where 'linh_khi' = any (string_to_array(v.ly_do, ','))),
             count(*) filter (where 'linh_thach' = any (string_to_array(v.ly_do, ',')))
        into v_lk, v_lt
        from public.p2d_nghi_van v
       where v.user_id = new.user_id and v.luc > now() - interval '24 hours' and v.ly_do not like '%\_cu%';
      if v_lk >= 10 and v_lt >= 10 then v_khoa := 'linh khí lố x' || v_lk || ' + Linh Thạch lố x' || v_lt || '/24h'; end if;
    end if;
    if v_khoa is null then return null; end if;
    insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
    select n.user_id, 'khoa_hack', jsonb_build_object('data', n.data, 'canh_gioi', n.canh_gioi, 'luc_chien', n.luc_chien, 'tang', n.tang,
             'banned_until_cu', (select u.banned_until from auth.users u where u.id = n.user_id), 'tu_dong', true, 'nghi_van_id', new.id,
             'ly_do', 'Tự khoá (20261105160000, chủ dự án 05/11 23:49 "hack quá rõ thì phải khoá ngay"): ' || v_khoa)
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

-- Tự kiểm tra (không ghi gì): người được miễn có trong bảng
do $kt$
begin
  if not exists (select 1 from public.p2d_mien_khoa where user_id = 'a1ba5912-562b-4cbb-999e-0c33265a0289')
     and exists (select 1 from auth.users where id = 'a1ba5912-562b-4cbb-999e-0c33265a0289') then raise exception 'kt: thieu mien khoa 2DDC'; end if;
  if position('p2d_mien_khoa' in pg_get_functiondef('public.p2d_co_do_xet()'::regprocedure)) = 0 then raise exception 'kt: ham chua doi'; end if;
end;
$kt$;
