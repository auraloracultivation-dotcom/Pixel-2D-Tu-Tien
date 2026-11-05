-- Cờ đỏ tự động (chủ dự án 05/11/2026 17:07: "có tín hiệu phát là bật cờ đỏ ngay, k giao dịch được!").
-- Cờ đỏ trong game đã có sẵn: p2d_nhan_vat.nghi_van >= 10 → bị chặn rao bán, mua chợ, tặng đạo lữ, lập / xin vào tông môn,
-- bảng xếp hạng hiện cờ. Trước đây chỉ gian lận giới thiệu mới đẩy lên 10; hack đồ / Linh Thạch chỉ cộng 1–3 điểm.
-- Migration này:
-- 1) Bảng p2d_co_do (một dòng mỗi tài khoản bị cờ đỏ, có lý do). Máy khách không đọc, không ghi.
-- 2) Trigger sau khi ghi p2d_nghi_van: tín hiệu hack rõ thì bật cờ đỏ ngay:
--    - do_sai_chi_so hoặc roi_sai (đồ sai chỉ số / đồ rơi giả): một lần là đủ;
--    - linh_thach, linh_khi, sua_do, ngoc_sai, thu_sua: từ 5 lần trong 24 giờ, chỉ đếm lần KHÔNG kèm cờ bản game cũ (*_cu).
--    Thử lại trên toàn bộ p2d_nghi_van: từ 30/10 tới nay chỉ trúng Thiên đế, Võ thần, Vô thượng thiên (đều đã khoá);
--    người chơi thường (TuTran, Tieu van, Little Boy, Đạo hữu D258 bản game cũ...) không trúng. Bỏ qua Đại Ma Thần (p2d_thien_ma).
--    Lỗi trong trigger không bao giờ làm hỏng lần lưu game.
-- 3) Trigger trước khi ghi p2d_nhan_vat: ai có trong p2d_co_do thì nghi_van luôn >= 10 (cờ không bị tụt).
-- 4) Chợ: người mua không thấy và không mua được đồ của người bị cờ đỏ (chặn đường chuyển Linh Thạch qua chợ);
--    người bán vẫn thấy đơn của mình để huỷ.
-- 5) Gắn sẵn cờ cho các dòng 'co_do' chủ dự án đã ra lệnh trong p2d_xu_ly (trong1, meobeo, Đạo hữu 2DDC 05/11 17:00).
-- Bỏ cờ: chỉ chủ dự án quyết (xoá dòng p2d_co_do rồi hạ nghi_van). Chạy lại không đổi gì.

create table if not exists public.p2d_co_do (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ly_do text not null,
  tu_dong boolean not null default false,
  luc timestamptz not null default now()
);
alter table public.p2d_co_do enable row level security;
revoke all on table public.p2d_co_do from public, anon, authenticated;

-- 2. Xét tín hiệu khi có dòng nghi vấn mới
create or replace function public.p2d_co_do_xet()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_r text[]; v_ly text; v_x text; v_n integer;
begin
  begin
    if new.user_id is null or new.ly_do is null then return null; end if;
    if exists (select 1 from public.p2d_co_do c where c.user_id = new.user_id) then return null; end if;
    if exists (select 1 from public.p2d_thien_ma t where t.user_id = new.user_id) then return null; end if;
    v_r := string_to_array(new.ly_do, ',');
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
    if v_ly is null then return null; end if;
    insert into public.p2d_co_do (user_id, ly_do, tu_dong) values (new.user_id, v_ly, true) on conflict (user_id) do nothing;
    if not found then return null; end if;
    insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
    values (new.user_id, 'co_do', jsonb_build_object('ly_do', 'Tự động (20261105140000): ' || v_ly, 'nghi_van_id', new.id, 'tu_dong', true));
    -- bật ngay; nếu dòng nhân vật đang được chính lần lưu này giữ thì trigger p2d_zz_co_do bật ở lần ghi đó
    begin
      update public.p2d_nhan_vat set nghi_van = greatest(nghi_van, 10) where user_id = new.user_id and nghi_van < 10;
    exception when others then null;
    end;
  exception when others then
    null;   -- không bao giờ làm hỏng lần lưu
  end;
  return null;
end;
$$;
revoke all on function public.p2d_co_do_xet() from public, anon, authenticated;

create or replace trigger p2d_co_do_xet after insert on public.p2d_nghi_van
  for each row execute function public.p2d_co_do_xet();

-- 3. Cờ không tụt (tên zz để chạy sau các trigger kiểm tra khác)
create or replace function public.p2d_co_do_giu()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.nghi_van, 0) < 10 and exists (select 1 from public.p2d_co_do c where c.user_id = new.user_id) then
    new.nghi_van := 10;
  end if;
  return new;
end;
$$;
revoke all on function public.p2d_co_do_giu() from public, anon, authenticated;

create or replace trigger p2d_zz_co_do before insert or update on public.p2d_nhan_vat
  for each row execute function public.p2d_co_do_giu();

-- 4a. Chợ: ẩn đơn của người bị cờ đỏ với người khác
do $$
declare d text := pg_get_functiondef('public.p2d_xem_cho(text)'::regprocedure);
  neo text := 'where c.trang_thai = ''mo'' and (p_loai is null or c.loai = p_loai)';
begin
  if position('p2d_co_do' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_xem_cho da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, neo || E'\n            and (c.nguoi_ban = v_uid or not exists (select 1 from public.p2d_nhan_vat s where s.user_id = c.nguoi_ban and s.nghi_van >= 10))   -- p2d_co_do: ẩn đơn người bị cờ đỏ');
end;
$$;

-- 4b. Chợ: không mua được đồ của người bị cờ đỏ (báo như đơn đã hết)
do $$
declare d text := pg_get_functiondef('public.p2d_mua_hang(bigint)'::regprocedure);
  neo text := E'  if v_c.nguoi_ban = v_uid then raise exception ''cua_minh''';
begin
  if position('p2d_co_do' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_mua_hang da doi, khong tim thay cho va'; end if;
  execute replace(d, neo,
    E'  -- p2d_co_do: người bán bị cờ đỏ thì đơn coi như đã hết\n' ||
    E'  if exists (select 1 from public.p2d_nhan_vat s where s.user_id = v_c.nguoi_ban and s.nghi_van >= 10) then raise exception ''da_ban'' using errcode = ''22023''; end if;\n' ||
    neo);
end;
$$;

-- 5. Cờ đỏ chủ dự án đã ra lệnh
insert into public.p2d_co_do (user_id, ly_do, tu_dong, luc)
select distinct on (x.user_id) x.user_id, coalesce(x.du_lieu ->> 'ly_do', 'co_do'), false, x.luc
from public.p2d_xu_ly x
where x.hanh_dong = 'co_do' and exists (select 1 from auth.users u where u.id = x.user_id)
order by x.user_id, x.id
on conflict (user_id) do nothing;
update public.p2d_nhan_vat n set nghi_van = 10
where n.nghi_van < 10 and exists (select 1 from public.p2d_co_do c where c.user_id = n.user_id);

-- Tự kiểm tra (không ghi gì)
do $kt$
begin
  if not exists (select 1 from pg_trigger where tgname = 'p2d_co_do_xet' and not tgisinternal) then raise exception 'kt: thieu trigger xet'; end if;
  if not exists (select 1 from pg_trigger where tgname = 'p2d_zz_co_do' and not tgisinternal) then raise exception 'kt: thieu trigger giu'; end if;
  if position('p2d_co_do' in pg_get_functiondef('public.p2d_xem_cho(text)'::regprocedure)) = 0 then raise exception 'kt: xem_cho'; end if;
  if position('p2d_co_do' in pg_get_functiondef('public.p2d_mua_hang(bigint)'::regprocedure)) = 0 then raise exception 'kt: mua_hang'; end if;
  if exists (select 1 from public.p2d_co_do c join public.p2d_nhan_vat n on n.user_id = c.user_id where n.nghi_van < 10) then raise exception 'kt: co chua bat'; end if;
end;
$kt$;
