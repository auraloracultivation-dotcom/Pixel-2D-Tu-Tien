-- Chủ dự án 31/10/2026: người chơi gửi được 10 báo lỗi / đề xuất liên tiếp rồi mới bị chặn (trước là 3 lần mỗi 10 phút).
-- Giữ nguyên 15 lần mỗi ngày.
create or replace function public.p2d_gui_gop_y(p_loai text, p_tieu_de text, p_mo_ta text, p_anh text, p_anh_nho text, p_ngu_canh jsonb)
returns bigint language plpgsql security definer set search_path to '' as $function$
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
  if (select count(*) from public.p2d_gop_y where user_id = v_uid and tao_luc > now() - interval '10 minutes') >= 10 then
    raise exception 'gui_nhanh_qua' using errcode = 'P0001'; end if;
  if (select count(*) from public.p2d_gop_y where user_id = v_uid and tao_luc > now() - interval '1 day') >= 15 then
    raise exception 'het_luot_hom_nay' using errcode = 'P0001'; end if;
  insert into public.p2d_gop_y (user_id, loai, tieu_de, mo_ta, ngu_canh) values (v_uid, p_loai, v_tieu_de, v_mo_ta, coalesce(p_ngu_canh, '{}'::jsonb))
  returning id into v_id;
  insert into public.p2d_gop_y_anh (gop_y_id, anh, anh_nho) values (v_id, p_anh, p_anh_nho);
  return v_id;
end;
$function$;
