-- Bảng xếp hạng hiện tất cả người chơi, không chỉ top 50 (chủ dự án 03/11/2026 11:47). Hàm mới, không sửa hàm cũ:
-- p2d_bxh_het (lực chiến, cảnh giới, tháp: phần "của tôi" và danh hiệu tuần lấy từ p2d_bxh), p2d_bxh2_het (góp ý, Ma Thần,
-- bí cảnh), p2d_bxh_qtv_het (quản trị viên). Hai hàm sau chép nguyên p2d_bxh2 / p2d_bxh_qtv3, chỉ đổi giới hạn 50 → 2000.
create or replace function public.p2d_bxh_het(p_loai text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := (select auth.uid()); v_r jsonb; v_top jsonb;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  v_r := public.p2d_bxh(p_loai);
  select coalesce(jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'canh_gioi', x.canh_gioi, 'tang', x.tang, 'co', x.co,
           'la_toi', x.user_id = v_uid, 'k', public.p2d_chat_key(x.user_id)) order by x.hang), '[]'::jsonb)
    into v_top from public.p2d_xep_ca(p_loai, 2000) x;
  return v_r || jsonb_build_object('top', v_top);
end; $$;

do $$
declare d text;
begin
  d := pg_get_functiondef('public.p2d_bxh2(text)'::regprocedure);
  d := replace(replace(d, 'public.p2d_bxh2(', 'public.p2d_bxh2_het('), 'x.hang <= 50', 'x.hang <= 2000');
  execute d;
  d := pg_get_functiondef('public.p2d_bxh_qtv3()'::regprocedure);
  d := replace(replace(d, 'public.p2d_bxh_qtv3(', 'public.p2d_bxh_qtv_het('), 'hang <= 50', 'hang <= 2000');
  execute d;
end $$;

revoke all on function public.p2d_bxh_het(text) from public, anon;
revoke all on function public.p2d_bxh2_het(text) from public, anon;
revoke all on function public.p2d_bxh_qtv_het() from public, anon;
grant execute on function public.p2d_bxh_het(text) to authenticated;
grant execute on function public.p2d_bxh2_het(text) to authenticated;
grant execute on function public.p2d_bxh_qtv_het() to authenticated;
