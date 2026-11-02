-- Bảng quản trị viên bản 2 (chủ dự án 02/11/2026 16:59: "lôi kéo người chơi cũng là đang xây game, cộng điểm vào bxh qtv").
-- Như p2d_bxh_qtv, thêm: mời bạn thành công (người được mời online đủ giờ, không bị khoá, không cùng mạng) +15 điểm, cột moi.
-- Hàm mới thay vì sửa hàm cũ; máy khách gọi p2d_bxh_qtv2.
create or replace function public.p2d_bxh_qtv2()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  return (with g as (
    select g.user_id,
      sum(case when g.loai = 'loi' and g.trang_thai = 'da_sua' then 10 when g.loai = 'de_xuat' and g.trang_thai = 'da_sua' then 20
               when g.trang_thai = 'se_lam' then 5 when g.trang_thai = 'spam' then -15 else 0 end) as diem,
      count(*) filter (where g.loai = 'loi' and g.trang_thai = 'da_sua') as loi,
      count(*) filter (where g.loai = 'de_xuat' and g.trang_thai = 'da_sua') as dx,
      count(*) filter (where g.trang_thai = 'se_lam') as ghi,
      count(*) filter (where g.trang_thai in ('khong_lam', 'trung', 'chua_sua_duoc', 'spam')) as khong,
      count(*) filter (where g.trang_thai = 'moi') as cho
    from public.p2d_gop_y g group by g.user_id),
  m as (
    select t.nguoi_gt as user_id, count(*) as moi from public.p2d_gioi_thieu t
     where t.dat_luc is not null and t.khoa_luc is null and not coalesce(t.cung_mang, false) group by t.nguoi_gt),
  d as (
    select coalesce(g.user_id, m.user_id) as user_id, greatest(0, coalesce(g.diem, 0) + coalesce(m.moi, 0) * 15) as diem,
      coalesce(g.loi, 0) as loi, coalesce(g.dx, 0) as dx, coalesce(g.ghi, 0) as ghi, coalesce(g.khong, 0) as khong, coalesce(g.cho, 0) as cho, coalesce(m.moi, 0) as moi
    from g full join m on m.user_id = g.user_id),
  r as (
    select row_number() over (order by d.diem desc, d.loi + d.dx + d.moi desc, n.ten) as hang, d.*, n.ten,
      case when d.diem >= 600 then 5 when d.diem >= 300 then 4 when d.diem >= 150 then 3 when d.diem >= 60 then 2 when d.diem >= 20 then 1 else 0 end as cap
    from d join public.p2d_nhan_vat n on n.user_id = d.user_id)
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('hang', hang, 'k', public.p2d_chat_key(user_id), 'ten', coalesce(nullif(ten, ''), public.p2d_ten_mac_dinh(user_id)),
                       'diem', diem, 'cap', cap, 'loi', loi, 'dx', dx, 'ghi', ghi, 'moi', moi, 'khong', khong, 'cho', cho, 'la_toi', user_id = v_uid) order by hang)
                     from r where hang <= 50), '[]'::jsonb),
    'toi', (select jsonb_build_object('hang', hang, 'diem', diem, 'cap', cap) from r where user_id = v_uid)));
end;
$$;
revoke all on function public.p2d_bxh_qtv2() from public, anon;
grant execute on function public.p2d_bxh_qtv2() to authenticated;
