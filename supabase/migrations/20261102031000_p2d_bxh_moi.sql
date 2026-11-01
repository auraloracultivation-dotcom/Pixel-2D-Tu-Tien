-- Bảng xếp hạng mới (chủ dự án chốt 02/11/2026, nhóm L): số góp ý được nhận (báo lỗi + đề xuất đặt da_sua / se_lam),
-- số lần khiêu chiến Đại Ma Thần (p2d_thien_ma_tran), bậc cao nhất đã qua của từng bí cảnh (bản lưu dunLv2.<mã bí cảnh>).
-- Chỉ đọc. Bỏ người đang bị cấm và tài khoản Thiên Ma như p2d_xep_ca. Trả top 50 kèm mã công khai k (như p2d_bxh) và hạng của mình.

create or replace function public.p2d_bxh2(p_loai text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_bc  text;
  v_top jsonb;
  v_toi jsonb;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('dmt', 'gop_y') and p_loai !~ '^bc:[a-z][a-z-]{1,30}$' then raise exception 'loai_sai' using errcode = '22023'; end if;
  v_bc := case when p_loai like 'bc:%' then substr(p_loai, 4) end;
  with diem as (
    select n.user_id, n.ten, n.canh_gioi, n.tang, n.nghi_van >= 10 as co, n.updated_at,
           case p_loai
             when 'dmt' then (select count(*) from public.p2d_thien_ma_tran t where t.user_id = n.user_id)
             when 'gop_y' then (select count(*) from public.p2d_gop_y g where g.user_id = n.user_id and g.trang_thai in ('da_sua', 'se_lam'))
             else coalesce(case when jsonb_typeof(n.data -> 'dunLv2' -> v_bc) = 'number'
                                then least(greatest((n.data -> 'dunLv2' ->> v_bc)::numeric, 0), 100000)::bigint end, 0)
           end as gia_tri
      from public.p2d_nhan_vat n
     where not exists (select 1 from auth.users u where u.id = n.user_id and u.banned_until > now())
       and not exists (select 1 from public.p2d_thien_ma tm where tm.user_id = n.user_id)
  ), xep as (
    select row_number() over (order by d.gia_tri desc, d.updated_at asc) as hang, d.*
      from diem d where d.gia_tri > 0
  )
  select coalesce((select jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'canh_gioi', x.canh_gioi,
                                                       'tang', x.tang, 'co', x.co, 'la_toi', x.user_id = v_uid,
                                                       'k', public.p2d_chat_key(x.user_id)) order by x.hang)
                     from xep x where x.hang <= 50), '[]'::jsonb),
         (select jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'co', x.co, 'k', public.p2d_chat_key(x.user_id))
            from xep x where x.user_id = v_uid)
    into v_top, v_toi;
  return jsonb_build_object('top', v_top, 'toi', v_toi);
end;
$$;
revoke all on function public.p2d_bxh2(text) from public, anon;
grant execute on function public.p2d_bxh2(text) to authenticated;
