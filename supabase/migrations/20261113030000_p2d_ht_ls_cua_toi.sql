-- Lịch sử triệu hồi của chính mình ở Hệ Thống (đề xuất #153, chủ dự án duyệt 13/11/2026 01:46): 50 lần gần nhất, cùng dạng
-- p2d_ht_vinh_danh (qua, luc, nd; trang bị chỉ trả phần cần vẽ). Chỉ đọc, chỉ của người đang đăng nhập.
create or replace function public.p2d_ht_ls_cua_toi()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x ->> 'luc' desc), '[]'::jsonb) from (
    select jsonb_build_object('qua', l.qua, 'luc', l.luc,
      'nd', (l.noi_dung - 'tieu_de') - 'item' || case when l.noi_dung ? 'item'
        then jsonb_build_object('item', jsonb_build_object('base', l.noi_dung -> 'item' ->> 'base', 'el', l.noi_dung -> 'item' ->> 'el', 'rarity', l.noi_dung -> 'item' ->> 'rarity',
          'lines', l.noi_dung -> 'item' -> 'lines', 'main', l.noi_dung -> 'item' -> 'main', 'lvl', l.noi_dung -> 'item' -> 'lvl')) else '{}'::jsonb end) x
    from public.p2d_ht_lich_su l
    where l.user_id = public.p2d_uid()
    order by l.luc desc
    limit 50
  ) s;
$$;
revoke all on function public.p2d_ht_ls_cua_toi() from public, anon;
grant execute on function public.p2d_ht_ls_cua_toi() to authenticated;
