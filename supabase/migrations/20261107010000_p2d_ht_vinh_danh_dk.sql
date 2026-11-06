-- Bảng khoe triệu hồi: đổi điều kiện (chủ dự án 07/11/2026 00:44): bạo kích từ x5, trang bị phẩm Tiên trở lên (bỏ Thiên), Ngọc cấp 8,
-- Đạo Vận Thạch, từ 1.000.000 Linh Thạch (không tính tiền đổi thú/khôi lỗi trùng). Phần còn lại giữ như 20261107000000.
create or replace function public.p2d_ht_vinh_danh()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x ->> 'luc' desc), '[]'::jsonb) from (
    select jsonb_build_object('ten', coalesce(nullif(n.ten, ''), 'Đạo hữu'), 'qua', l.qua, 'luc', l.luc,
      'nd', (l.noi_dung - 'tieu_de') - 'item' || case when l.noi_dung ? 'item'
        then jsonb_build_object('item', jsonb_build_object('base', l.noi_dung -> 'item' ->> 'base', 'el', l.noi_dung -> 'item' ->> 'el', 'rarity', l.noi_dung -> 'item' ->> 'rarity',
          'lines', l.noi_dung -> 'item' -> 'lines', 'main', l.noi_dung -> 'item' -> 'main', 'lvl', l.noi_dung -> 'item' -> 'lvl')) else '{}'::jsonb end) x
    from public.p2d_ht_lich_su l left join public.p2d_nhan_vat n using (user_id)
    where coalesce((l.noi_dung ->> 'bk')::int, 1) >= 5
       or l.qua in ('do-5', 'do-6', 'ngoc-8', 'nl-dao-van-thach')
       or (not l.noi_dung ? 'doi' and coalesce((l.noi_dung ->> 'coins')::numeric, 0) >= 1000000)
    order by l.luc desc limit 10) s
$$;
revoke all on function public.p2d_ht_vinh_danh() from public, anon;
grant execute on function public.p2d_ht_vinh_danh() to authenticated;
