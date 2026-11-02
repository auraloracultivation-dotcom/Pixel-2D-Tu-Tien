-- Bảng xếp hạng quản trị viên (chủ dự án chốt 02/11/2026 16:33: bỏ bảng Góp ý cũ, thay bằng bảng điểm quản trị viên chi tiết).
-- Điểm tính từ góp ý đã duyệt (p2d_gop_y): lỗi được sửa +10, đề xuất được làm +20, đề xuất ghi nhận chưa làm (se_lam) +5,
-- trùng / không thông qua 0, spam −15 (trạng thái 'spam', thêm sau). Cấp: 1 từ 20 điểm, 2 từ 60, 3 từ 150, 4 từ 300, 5 từ 600.
-- Chỉ đọc; trả top 50 kèm số lỗi được sửa, đề xuất được làm, không thông qua, đang chờ duyệt; dòng của mình (toi).
create or replace function public.p2d_bxh_qtv()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  return (with d as (
    select g.user_id,
      greatest(0, sum(case when g.loai = 'loi' and g.trang_thai = 'da_sua' then 10 when g.loai = 'de_xuat' and g.trang_thai = 'da_sua' then 20
                           when g.trang_thai = 'se_lam' then 5 when g.trang_thai = 'spam' then -15 else 0 end)) as diem,
      count(*) filter (where g.loai = 'loi' and g.trang_thai = 'da_sua') as loi,
      count(*) filter (where g.loai = 'de_xuat' and g.trang_thai = 'da_sua') as dx,
      count(*) filter (where g.trang_thai = 'se_lam') as ghi,
      count(*) filter (where g.trang_thai in ('khong_lam', 'trung', 'chua_sua_duoc', 'spam')) as khong,
      count(*) filter (where g.trang_thai = 'moi') as cho
    from public.p2d_gop_y g group by g.user_id),
  r as (
    select row_number() over (order by d.diem desc, d.loi + d.dx desc, n.ten) as hang, d.*, n.ten,
      case when d.diem >= 600 then 5 when d.diem >= 300 then 4 when d.diem >= 150 then 3 when d.diem >= 60 then 2 when d.diem >= 20 then 1 else 0 end as cap
    from d join public.p2d_nhan_vat n on n.user_id = d.user_id)
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('hang', hang, 'k', public.p2d_chat_key(user_id), 'ten', coalesce(nullif(ten, ''), public.p2d_ten_mac_dinh(user_id)),
                       'diem', diem, 'cap', cap, 'loi', loi, 'dx', dx, 'ghi', ghi, 'khong', khong, 'cho', cho, 'la_toi', user_id = v_uid) order by hang)
                     from r where hang <= 50), '[]'::jsonb),
    'toi', (select jsonb_build_object('hang', hang, 'diem', diem, 'cap', cap) from r where user_id = v_uid)));
end;
$$;
revoke all on function public.p2d_bxh_qtv() from public, anon;
grant execute on function public.p2d_bxh_qtv() to authenticated;
