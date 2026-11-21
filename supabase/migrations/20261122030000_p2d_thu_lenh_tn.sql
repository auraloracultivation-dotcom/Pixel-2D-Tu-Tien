-- Thú Lệnh bán ở quầy Tiên Ngọc (chủ dự án 22/11/2026 03:10–03:1x): 9 Tiên Ngọc một lệnh (7 lệnh = 63 Tiên Ngọc ≈ một thú cưỡi
-- tầm 20 000đ, gói nạp nhỏ nhất 20 000đ = 60 Tiên Ngọc), tối đa 7 lệnh mỗi ngày (giờ Việt Nam). Số khớp data/topup.json → shop "thu-lenh".
-- Thú Lệnh máy chủ giữ (p2d_ht_diem.thu_lenh); lượt trong ngày đếm theo sổ cái Tiên Ngọc (p2d_so_cai ly_do 'doi_tn:thu-lenh').

-- Bảng giá đủ (tools/check.mjs so với data/topup.json theo migration mới nhất có câu này); chỉ thêm dòng thu-lenh, các dòng khác giữ số đang chạy
insert into public.p2d_tn_gia (ma, tn) values ('thu-lenh', 9), ('dao-van-thach', 50), ('ruong-dia', 180), ('da-tay', 60), ('ngoc-3', 90),
  ('ao-tien-nhan', 300), ('ao-hoang-kim', 600), ('ao-tu-liem', 10), ('ao-huyet-nguyet', 60), ('_qua_ra_mat', 100), ('_the_ngay', 100), ('_the_ngay_lt', 300)
on conflict (ma) do update set tn = excluded.tn;

CREATE OR REPLACE FUNCTION public.p2d_doi_tn(p_ma text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_gia integer; v_tl integer;
begin
  select tn into v_gia from public.p2d_tn_gia where ma = p_ma and left(ma, 1) <> '_';
  if not found then raise exception 'ma_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.tien_ngoc < v_gia then raise exception 'thieu_tn' using errcode = '22023'; end if;
  if p_ma = 'thu-lenh' and (select count(*) from public.p2d_so_cai where user_id = v_uid and loai = 'tn' and ly_do = 'doi_tn:thu-lenh'
       and luc >= ((now() at time zone 'Asia/Ho_Chi_Minh')::date::timestamp at time zone 'Asia/Ho_Chi_Minh')) >= 7 then
    raise exception 'het_luot' using errcode = '22023';
  end if;
  perform set_config('p2d.ly_do', left('doi_tn:' || p_ma, 60), true);
  update public.p2d_nhan_vat set tien_ngoc = tien_ngoc - v_gia, data = public.p2d_thu_tn(data, p_ma) || jsonb_build_object('tn', tien_ngoc - v_gia),
         phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning * into v_nv;
  if p_ma = 'thu-lenh' then
    insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
    update public.p2d_ht_diem set thu_lenh = thu_lenh + 1, luc = now() where user_id = v_uid returning thu_lenh into v_tl;
    return jsonb_build_object('tn', v_nv.tien_ngoc, 'phien_ban', v_nv.phien_ban, 'thu_lenh', v_tl);
  end if;
  return jsonb_build_object('tn', v_nv.tien_ngoc, 'phien_ban', v_nv.phien_ban);
end;
$function$;
