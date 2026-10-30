-- Bảng xếp hạng bỏ người đang bị cấm (chủ dự án 31/10/2026 00:19: tieuviem bị cấm vẫn hiện trên bảng).
-- p2d_xep_ca (top bảng và danh hiệu tuần) lọc auth.users.banned_until > now(); bảng nhớ đệm p2d_bxh_nho tự làm mới sau 60 giây.
create or replace function public.p2d_xep_ca(p_loai text, p_gioi_han integer)
returns table(hang bigint, user_id uuid, ten text, gia_tri bigint, canh_gioi smallint, tang smallint, co boolean)
language sql stable security definer set search_path = ''
as $$
  select row_number() over (order by
           case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                       else n.canh_gioi::bigint * 10 + n.tang end desc,
           n.updated_at asc) as hang,
         n.user_id, n.ten,
         case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                     else n.canh_gioi::bigint * 10 + n.tang end as gia_tri,
         n.canh_gioi, n.tang, n.nghi_van >= 10 as co
  from public.p2d_nhan_vat n
  where (p_loai <> 'thap' or n.thap > 0)
    and not exists (select 1 from auth.users u where u.id = n.user_id and u.banned_until > now())
  order by 1
  limit p_gioi_han;
$$;
