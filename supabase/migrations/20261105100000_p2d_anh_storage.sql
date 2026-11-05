-- Ảnh góp ý sang Supabase Storage (chủ dự án duyệt 05/11/2026). Trước đây ảnh nằm trong p2d_gop_y_anh dạng chữ base64
-- (~15 / 39 MB cơ sở dữ liệu). Giờ ảnh nằm trong kho riêng tư `gop-y-anh`, bảng chỉ giữ đường dẫn (duong_dan, duong_dan_nho).
--
-- Luồng mới (Edge Function supabase/functions/gop-y-anh, khoá quản trị chỉ nằm trong biến môi trường của hàm):
--   gui     người chơi đã đăng nhập gửi tên + mô tả + ảnh. Hàm kiểm tra ảnh (giải được, đúng kiểu JPEG/PNG/WebP theo byte đầu,
--           ≤ 300 KB / 40 KB), gọi p2d_gui_gop_y_kho (cùng luật độ dài, chặn gửi dồn như p2d_gui_gop_y) rồi tải ảnh lên kho.
--   xem     trả link ký tên 5 phút: quản trị viên (bảng p2d_thien_ma) xem mọi ảnh, người chơi chỉ ảnh của mình;
--           Claude duyệt bằng vé tạo qua SQL (p2d_gop_y_ve, chỉ chủ cơ sở dữ liệu gọi được), vé hết hạn sau 15 phút.
--   chuyen  chuyển ảnh base64 cũ sang kho (chạy một lần, lặp lại vô hại), cần vé 'chuyen'.
--   don     xoá tệp trong hàng chờ p2d_gop_y_anh_xoa bằng Storage API, cần vé 'don'.
-- Không xoá tệp kho bằng SQL (delete from storage.objects chỉ xoá dòng mô tả, tệp thật còn nằm lại, tài liệu Supabase cấm):
-- mọi lần xoá dòng ảnh (dọn đêm, xoá tài khoản kéo theo) đưa đường dẫn vào hàng chờ, p2d_don_gop_y gọi hàm `don` qua pg_net.
-- Không có chính sách storage.objects nào cho anon / authenticated: máy khách không đọc / ghi kho trực tiếp.
-- Cột anh / anh_nho cũ giữ (đã cho phép trống) tới khi chuyển xong và mọi máy khách dùng bản mới; bỏ bằng migration sau.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gop-y-anh', 'gop-y-anh', false, 1048576, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

alter table public.p2d_gop_y_anh add column if not exists duong_dan text, add column if not exists duong_dan_nho text;

-- Hàng chờ xoá tệp kho
create table if not exists public.p2d_gop_y_anh_xoa (
  duong_dan text primary key,
  them_luc timestamptz not null default now()
);
alter table public.p2d_gop_y_anh_xoa enable row level security;
revoke all on public.p2d_gop_y_anh_xoa from anon, authenticated;

create or replace function public.p2d_gop_y_anh_cho_xoa() returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    insert into public.p2d_gop_y_anh_xoa (duong_dan)
    select d from unnest(array[old.duong_dan, old.duong_dan_nho]) d where d is not null on conflict do nothing;
    return old;
  end if;
  insert into public.p2d_gop_y_anh_xoa (duong_dan)
  select d from unnest(array[case when old.duong_dan is distinct from new.duong_dan then old.duong_dan end,
                             case when old.duong_dan_nho is distinct from new.duong_dan_nho then old.duong_dan_nho end]) d
   where d is not null on conflict do nothing;
  return new;
end;
$$;
revoke all on function public.p2d_gop_y_anh_cho_xoa() from public, anon, authenticated;
drop trigger if exists p2d_gop_y_anh_cho_xoa on public.p2d_gop_y_anh;
create trigger p2d_gop_y_anh_cho_xoa after delete or update of duong_dan, duong_dan_nho on public.p2d_gop_y_anh
  for each row execute function public.p2d_gop_y_anh_cho_xoa();

-- Vé quản trị dùng trong 15 phút (chỉ giữ mã băm). Tạo vé: select public.p2d_gop_y_ve('xem' | 'chuyen' | 'don');
create table if not exists public.p2d_ve_quan_tri (
  ma_bam text primary key,
  viec text not null,
  het_luc timestamptz not null
);
alter table public.p2d_ve_quan_tri enable row level security;
revoke all on public.p2d_ve_quan_tri from anon, authenticated;

create or replace function public.p2d_gop_y_ve(p_viec text default 'xem') returns text language plpgsql security definer set search_path = ''
as $$
declare v_ve text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
begin
  if p_viec not in ('xem', 'chuyen', 'don') then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  delete from public.p2d_ve_quan_tri where het_luc < now();
  insert into public.p2d_ve_quan_tri (ma_bam, viec, het_luc) values (encode(sha256(convert_to(v_ve, 'UTF8')), 'hex'), p_viec, now() + interval '15 minutes');
  return v_ve;
end;
$$;
revoke all on function public.p2d_gop_y_ve(text) from public, anon, authenticated, service_role;

create or replace function public.p2d_gop_y_ve_dung(p_ve text, p_viec text) returns boolean language sql stable security definer set search_path = ''
as $$
  select p_ve is not null and length(p_ve) = 64 and exists (
    select 1 from public.p2d_ve_quan_tri where ma_bam = encode(sha256(convert_to(p_ve, 'UTF8')), 'hex') and viec = p_viec and het_luc > now())
$$;
revoke all on function public.p2d_gop_y_ve_dung(text, text) from public, anon, authenticated;
grant execute on function public.p2d_gop_y_ve_dung(text, text) to service_role;

-- Gửi góp ý (hàm gop-y-anh gọi thay người chơi sau khi đã xác thực mã đăng nhập). Cùng luật với p2d_gui_gop_y
-- (20261031070000_p2d_gop_y_10_lien.sql). Trả { id, duong_dan, duong_dan_nho } để hàm tải ảnh lên đúng chỗ.
create or replace function public.p2d_gui_gop_y_kho(p_uid uuid, p_loai text, p_tieu_de text, p_mo_ta text, p_ngu_canh jsonb, p_duoi text, p_duoi_nho text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_tieu_de text := btrim(coalesce(p_tieu_de, '')); v_mo_ta text := nullif(btrim(coalesce(p_mo_ta, '')), '');
  v_id bigint; v_lon text; v_nho text;
begin
  if p_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('loi', 'de_xuat') then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if char_length(v_tieu_de) < 4 or char_length(v_tieu_de) > 80 then raise exception 'tieu_de_sai' using errcode = '22023'; end if;
  if char_length(coalesce(v_mo_ta, '')) > 500 then raise exception 'mo_ta_dai' using errcode = '22023'; end if;
  if p_duoi is null or p_duoi not in ('jpg', 'png', 'webp') or (p_duoi_nho is not null and p_duoi_nho not in ('jpg', 'png', 'webp')) then
    raise exception 'anh_sai' using errcode = '22023'; end if;
  if p_ngu_canh is not null and (jsonb_typeof(p_ngu_canh) <> 'object' or octet_length(p_ngu_canh::text) > 6000) then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_gop_y where user_id = p_uid and tao_luc > now() - interval '10 minutes') >= 10 then
    raise exception 'gui_nhanh_qua' using errcode = 'P0001'; end if;
  if (select count(*) from public.p2d_gop_y where user_id = p_uid and tao_luc > now() - interval '1 day') >= 15 then
    raise exception 'het_luot_hom_nay' using errcode = 'P0001'; end if;
  insert into public.p2d_gop_y (user_id, loai, tieu_de, mo_ta, ngu_canh) values (p_uid, p_loai, v_tieu_de, v_mo_ta, coalesce(p_ngu_canh, '{}'::jsonb))
  returning id into v_id;
  v_lon := v_id || '/lon.' || p_duoi;
  v_nho := case when p_duoi_nho is not null then v_id || '/nho.' || p_duoi_nho end;
  insert into public.p2d_gop_y_anh (gop_y_id, duong_dan, duong_dan_nho) values (v_id, v_lon, v_nho);
  return jsonb_build_object('id', v_id, 'duong_dan', v_lon, 'duong_dan_nho', v_nho);
end;
$$;
revoke all on function public.p2d_gui_gop_y_kho(uuid, text, text, text, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.p2d_gui_gop_y_kho(uuid, text, text, text, jsonb, text, text) to service_role;

-- Tải ảnh lên hỏng: bỏ đường dẫn (cả hai, hoặc chỉ ảnh nhỏ). Tệp lỡ tải lên được đưa vào hàng chờ xoá nhờ trigger.
create or replace function public.p2d_gop_y_anh_bo(p_id bigint, p_uid uuid, p_chi_nho boolean) returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.p2d_gop_y where id = p_id and user_id = p_uid) then return; end if;
  if p_chi_nho then update public.p2d_gop_y_anh set duong_dan_nho = null where gop_y_id = p_id;
  else delete from public.p2d_gop_y_anh where gop_y_id = p_id; end if;
end;
$$;
revoke all on function public.p2d_gop_y_anh_bo(bigint, uuid, boolean) from public, anon, authenticated;
grant execute on function public.p2d_gop_y_anh_bo(bigint, uuid, boolean) to service_role;

-- Đường dẫn ảnh được phép xem. p_quan_tri = hàm đã kiểm vé 'xem'; không thì p_uid phải là quản trị viên (p2d_thien_ma)
-- hoặc chủ góp ý. `cu` = còn ảnh base64 chưa chuyển. Tối đa 50 mã mỗi lần.
create or replace function public.p2d_gop_y_anh_xem(p_uid uuid, p_quan_tri boolean, p_ids bigint[]) returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.gop_y_id, 'duong_dan', a.duong_dan, 'duong_dan_nho', a.duong_dan_nho,
           'cu', (a.anh is not null and a.duong_dan is null) or (a.anh_nho is not null and a.duong_dan_nho is null)) order by a.gop_y_id), '[]'::jsonb)
    from public.p2d_gop_y_anh a join public.p2d_gop_y g on g.id = a.gop_y_id
   where a.gop_y_id = any (p_ids[1:50])
     and (p_quan_tri or g.user_id = p_uid or exists (select 1 from public.p2d_thien_ma t where t.user_id = p_uid))
$$;
revoke all on function public.p2d_gop_y_anh_xem(uuid, boolean, bigint[]) from public, anon, authenticated;
grant execute on function public.p2d_gop_y_anh_xem(uuid, boolean, bigint[]) to service_role;

-- Chuyển ảnh cũ: lấy tối đa 10 dòng còn base64 chưa có đường dẫn, sau mã p_sau (con trỏ để dòng hỏng không chặn vòng lặp)
create or replace function public.p2d_gop_y_anh_can_chuyen(p_sau bigint, p_so integer) returns table (gop_y_id bigint, anh text, anh_nho text)
language sql stable security definer set search_path = ''
as $$
  select a.gop_y_id, case when a.duong_dan is null then a.anh end, case when a.duong_dan_nho is null then a.anh_nho end
    from public.p2d_gop_y_anh a
   where a.gop_y_id > coalesce(p_sau, 0)
     and ((a.anh is not null and a.duong_dan is null) or (a.anh_nho is not null and a.duong_dan_nho is null))
   order by a.gop_y_id limit least(greatest(coalesce(p_so, 10), 1), 10)
$$;
revoke all on function public.p2d_gop_y_anh_can_chuyen(bigint, integer) from public, anon, authenticated;
grant execute on function public.p2d_gop_y_anh_can_chuyen(bigint, integer) to service_role;

-- Đã tải lên: ghi đường dẫn, xoá base64 tương ứng. Phần nào không truyền (null) thì giữ nguyên.
create or replace function public.p2d_gop_y_anh_da_chuyen(p_id bigint, p_duong_dan text, p_duong_dan_nho text) returns void language sql security definer set search_path = ''
as $$
  update public.p2d_gop_y_anh
     set duong_dan = coalesce(p_duong_dan, duong_dan), anh = case when p_duong_dan is not null then null else anh end,
         duong_dan_nho = coalesce(p_duong_dan_nho, duong_dan_nho), anh_nho = case when p_duong_dan_nho is not null then null else anh_nho end
   where gop_y_id = p_id
$$;
revoke all on function public.p2d_gop_y_anh_da_chuyen(bigint, text, text) from public, anon, authenticated;
grant execute on function public.p2d_gop_y_anh_da_chuyen(bigint, text, text) to service_role;

-- Số dòng còn phải chuyển (báo trong kết quả `chuyen`)
create or replace function public.p2d_gop_y_anh_con_chuyen() returns integer language sql stable security definer set search_path = ''
as $$
  select count(*)::integer from public.p2d_gop_y_anh where (anh is not null and duong_dan is null) or (anh_nho is not null and duong_dan_nho is null)
$$;
revoke all on function public.p2d_gop_y_anh_con_chuyen() from public, anon, authenticated;
grant execute on function public.p2d_gop_y_anh_con_chuyen() to service_role;

-- Hàng chờ xoá: lấy tối đa 500 đường dẫn / gạch các đường dẫn đã xoá xong
create or replace function public.p2d_gop_y_anh_xoa_lay(p_so integer) returns text[] language sql stable security definer set search_path = ''
as $$
  select coalesce(array_agg(duong_dan), '{}') from (
    select duong_dan from public.p2d_gop_y_anh_xoa order by them_luc limit least(greatest(coalesce(p_so, 500), 1), 500)) x
$$;
create or replace function public.p2d_gop_y_anh_xoa_xong(p_ds text[]) returns integer language sql security definer set search_path = ''
as $$
  with x as (delete from public.p2d_gop_y_anh_xoa where duong_dan = any (p_ds) returning 1) select count(*)::integer from x
$$;
revoke all on function public.p2d_gop_y_anh_xoa_lay(integer), public.p2d_gop_y_anh_xoa_xong(text[]) from public, anon, authenticated;
grant execute on function public.p2d_gop_y_anh_xoa_lay(integer), public.p2d_gop_y_anh_xoa_xong(text[]) to service_role;

-- pg_net: để việc dọn đêm gọi được hàm gop-y-anh (xoá tệp kho bằng Storage API)
create extension if not exists pg_net;

-- Dọn ảnh hằng đêm. Chủ dự án 05/11/2026 10:30: ảnh đã nằm trong kho thì góp ý đã giải quyết (da_sua, khong_lam, trung)
-- giữ ảnh 7 ngày sau lúc xử lý (trước là 1 ngày, 20261105070000_p2d_don_anh_gop_y_1_ngay.sql); se_lam (và trạng thái đã xử lý
-- khác) 30 ngày, mọi ảnh quá 90 ngày như cũ. Xoá dòng ảnh (base64 cũ đi luôn; đường dẫn kho vào hàng chờ nhờ trigger) rồi
-- nhờ hàm gop-y-anh xoá tệp. Vẫn trả số dòng ảnh đã xoá. Gọi hàm hỏng không làm hỏng việc dọn: hàng chờ còn nguyên, đêm sau gọi lại.
create or replace function public.p2d_don_gop_y() returns integer language plpgsql security definer set search_path = ''
as $$
declare v_n integer;
begin
  with x as (
    delete from public.p2d_gop_y_anh a using public.p2d_gop_y g
     where g.id = a.gop_y_id
       and ((g.trang_thai in ('da_sua', 'khong_lam', 'trung') and coalesce(g.xu_ly_luc, g.tao_luc) < now() - interval '7 days')
         or (g.trang_thai not in ('moi', 'dang_xem') and coalesce(g.xu_ly_luc, g.tao_luc) < now() - interval '30 days')
         or g.tao_luc < now() - interval '90 days')
    returning 1)
  select count(*)::integer into v_n from x;
  if exists (select 1 from public.p2d_gop_y_anh_xoa) then
    begin
      perform net.http_post(
        url := 'https://idiiyxcfzugrehifhhjx.supabase.co/functions/v1/gop-y-anh',
        body := jsonb_build_object('hanh_dong', 'don', 've', public.p2d_gop_y_ve('don')),
        headers := '{"Content-Type": "application/json"}'::jsonb,
        timeout_milliseconds := 30000);
    exception when others then
      raise warning 'p2d_don_gop_y: chua goi duoc gop-y-anh (%)', sqlerrm;
    end;
  end if;
  return v_n;
end;
$$;
revoke all on function public.p2d_don_gop_y() from public, anon, authenticated;
