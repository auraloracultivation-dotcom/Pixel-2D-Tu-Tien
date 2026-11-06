-- Bảng khoe triệu hồi cả máy chủ (chủ dự án 07/11/2026 00:07): 10 lần quay gần nhất có bạo kích từ x5 hoặc trang bị phẩm Thiên trở lên
-- (dòng màu t >= 4), hiện cạnh rương ở mục Triệu hồi. Chỉ trả tên nhân vật và món, không lộ mã người chơi.
create index if not exists p2d_ht_lich_su_luc_idx on public.p2d_ht_lich_su (luc desc);

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
    where coalesce((l.noi_dung ->> 'bk')::int, 1) >= 5 or coalesce((l.noi_dung -> 'item' -> 'lines' -> 0 ->> 't')::int, -1) >= 4
    order by l.luc desc limit 10) s
$$;
revoke all on function public.p2d_ht_vinh_danh() from public, anon;
grant execute on function public.p2d_ht_vinh_danh() to authenticated;
