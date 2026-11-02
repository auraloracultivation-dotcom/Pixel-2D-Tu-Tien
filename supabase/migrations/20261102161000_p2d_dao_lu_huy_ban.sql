-- Kèm đạo lữ (20261102160000_p2d_dao_lu.sql): huỷ bạn khi đang là đạo lữ thì báo lỗi, huỷ bạn thì bỏ luôn lời mời đạo lữ đang chờ.
-- Tách riêng vì sửa hàm đang có, cần chủ dự án bấm xác nhận khi áp lên máy chủ (02/11/2026 chưa áp; máy khách tự ẩn nút Huỷ bạn với đạo lữ).
-- Huỷ bạn: đang là đạo lữ thì phải huỷ đạo lữ trước
create or replace function public.p2d_huy_ban(p_k text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_b uuid := public.p2d_bb_tim(p_k);
begin
  if v_b is not null and public.p2d_dl_cua(v_uid) = v_b then raise exception 'dang_dao_lu' using errcode = '22023'; end if;
  delete from public.p2d_dao_lu where trang_thai = 'cho' and ((a = v_uid and b = v_b) or (a = v_b and b = v_uid));
  delete from public.p2d_ban_be where (a = v_uid and b = v_b) or (a = v_b and b = v_uid);
  return found;
end;
$$;
revoke all on function public.p2d_huy_ban(text) from public, anon;
grant execute on function public.p2d_huy_ban(text) to authenticated;
