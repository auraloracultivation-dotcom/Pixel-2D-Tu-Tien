-- Báo lỗi và đề xuất của người chơi (chủ dự án xin 29/10/2026): nút cạnh nút Zalo và tiếng, gửi tên + ảnh chứng minh (+ mô tả,
-- bối cảnh máy tự gắn). Claude đọc mỗi giờ (việc định kỳ), sửa lỗi rõ ràng, ghi trạng thái và lời đáp cho người chơi thấy.
-- Máy khách chỉ gửi qua p2d_gui_gop_y (kiểm tra độ dài, kiểu ảnh, chặn gửi dồn) và đọc báo cáo của chính mình qua p2d_gop_y_cua_toi.
-- Ảnh để bảng riêng: anh (ảnh JPEG đã thu nhỏ ≤ 960 điểm, cho chủ dự án xem), anh_nho (≤ 240 điểm, Claude xem nhanh khi duyệt).
-- Ảnh của báo cáo đã xử lý quá 30 ngày (hoặc mọi báo cáo quá 90 ngày) tự xoá hằng đêm cho cơ sở dữ liệu khỏi phình.

create table if not exists public.p2d_gop_y (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  loai text not null check (loai in ('loi', 'de_xuat')),
  tieu_de text not null,
  mo_ta text,
  ngu_canh jsonb not null default '{}'::jsonb,
  trang_thai text not null default 'moi' check (trang_thai in ('moi', 'dang_xem', 'da_sua', 'se_lam', 'chua_sua_duoc', 'khong_lam', 'trung')),
  tra_loi text,            -- lời đáp hiện cho người chơi
  ghi_chu text,            -- ghi chú nội bộ (nguyên nhân, cách sửa)
  pr integer,              -- Pull Request sửa
  tao_luc timestamptz not null default now(),
  xu_ly_luc timestamptz
);
create index if not exists p2d_gop_y_trang_thai on public.p2d_gop_y (trang_thai, tao_luc);
create index if not exists p2d_gop_y_nguoi on public.p2d_gop_y (user_id, tao_luc desc);

create table if not exists public.p2d_gop_y_anh (
  gop_y_id bigint primary key references public.p2d_gop_y(id) on delete cascade,
  anh text,
  anh_nho text
);

alter table public.p2d_gop_y enable row level security;
alter table public.p2d_gop_y_anh enable row level security;
revoke all on public.p2d_gop_y, public.p2d_gop_y_anh from anon, authenticated;

-- Gửi báo lỗi / đề xuất. Trả về mã báo cáo.
create or replace function public.p2d_gui_gop_y(p_loai text, p_tieu_de text, p_mo_ta text, p_anh text, p_anh_nho text, p_ngu_canh jsonb)
returns bigint language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid()); v_tieu_de text := btrim(coalesce(p_tieu_de, '')); v_mo_ta text := nullif(btrim(coalesce(p_mo_ta, '')), '');
  v_id bigint; v_kieu text := '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$';
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('loi', 'de_xuat') then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if char_length(v_tieu_de) < 4 or char_length(v_tieu_de) > 80 then raise exception 'tieu_de_sai' using errcode = '22023'; end if;
  if char_length(coalesce(v_mo_ta, '')) > 500 then raise exception 'mo_ta_dai' using errcode = '22023'; end if;
  if p_anh is null or length(p_anh) > 350000 or p_anh !~ v_kieu then raise exception 'anh_sai' using errcode = '22023'; end if;
  if p_anh_nho is not null and (length(p_anh_nho) > 40000 or p_anh_nho !~ v_kieu) then raise exception 'anh_sai' using errcode = '22023'; end if;
  if p_ngu_canh is not null and (jsonb_typeof(p_ngu_canh) <> 'object' or octet_length(p_ngu_canh::text) > 6000) then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_gop_y where user_id = v_uid and tao_luc > now() - interval '10 minutes') >= 3 then
    raise exception 'gui_nhanh_qua' using errcode = 'P0001'; end if;
  if (select count(*) from public.p2d_gop_y where user_id = v_uid and tao_luc > now() - interval '1 day') >= 15 then
    raise exception 'het_luot_hom_nay' using errcode = 'P0001'; end if;
  insert into public.p2d_gop_y (user_id, loai, tieu_de, mo_ta, ngu_canh) values (v_uid, p_loai, v_tieu_de, v_mo_ta, coalesce(p_ngu_canh, '{}'::jsonb))
  returning id into v_id;
  insert into public.p2d_gop_y_anh (gop_y_id, anh, anh_nho) values (v_id, p_anh, p_anh_nho);
  return v_id;
end;
$$;
revoke all on function public.p2d_gui_gop_y(text, text, text, text, text, jsonb) from public, anon;
grant execute on function public.p2d_gui_gop_y(text, text, text, text, text, jsonb) to authenticated;

-- 10 báo cáo gần nhất của chính mình kèm trạng thái và lời đáp
create or replace function public.p2d_gop_y_cua_toi()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'loai', g.loai, 'tieu_de', g.tieu_de, 'trang_thai', g.trang_thai, 'tra_loi', g.tra_loi, 'tao_luc', g.tao_luc) order by g.tao_luc desc), '[]'::jsonb)
  from (select * from public.p2d_gop_y where user_id = (select auth.uid()) order by tao_luc desc limit 10) g
$$;
revoke all on function public.p2d_gop_y_cua_toi() from public, anon;
grant execute on function public.p2d_gop_y_cua_toi() to authenticated;

-- Dọn ảnh cũ hằng đêm
create or replace function public.p2d_don_gop_y()
returns integer language sql security definer set search_path = ''
as $$
  with x as (
    delete from public.p2d_gop_y_anh a using public.p2d_gop_y g
     where g.id = a.gop_y_id and ((g.trang_thai not in ('moi', 'dang_xem') and coalesce(g.xu_ly_luc, g.tao_luc) < now() - interval '30 days') or g.tao_luc < now() - interval '90 days')
    returning 1)
  select count(*)::integer from x
$$;
revoke all on function public.p2d_don_gop_y() from public, anon, authenticated;
select cron.schedule('p2d-don-gop-y', '57 19 * * *', 'select public.p2d_don_gop_y()');
