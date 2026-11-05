-- Lưu phần thay đổi (chủ dự án duyệt 05/11/2026 10:21: "tối ưu nhất trước"). p2d_luu2 chiếm ≈85% thời gian cơ sở dữ liệu
-- (≈294 nghìn lần gọi từ 29/10, trung bình 6,5 ms): máy khách gửi CẢ bản lưu (10–30 KB) mỗi 4 giây.
-- 1) p2d_luu_vi(p_vi, p_xoa, p_phien_ban): máy khách chỉ gửi các khoá cấp đầu đã đổi (p_vi) và các khoá đã xoá (p_xoa).
--    Máy chủ khoá dòng, dựng bản đầy đủ = bản đang lưu − p_xoa || p_vi, rồi gọi đúng p2d_luu2 như bản gửi cả: mọi kiểm tra
--    (hạn mức Linh Thạch / nguyên liệu, trần ngày, p2d_kiem_ky, p2d_kiem_roi, p2d_kiem_ngoc, tháp, đồng hồ, cờ nghi vấn) vẫn
--    một chỗ. Trả y hình dạng p2d_luu2: { pb, sua? }. Chưa có bản lưu: lỗi 'chua_co_ban_luu' (máy khách gửi cả bản).
--    Bản game cũ vẫn gọi p2d_luu2, không đổi gì.
-- 2) Đường nhanh khi túi không đổi (lần lưu phần thay đổi không gửi túi thì túi = đúng túi máy chủ, kể cả chữ ký):
--    p2d_kiem_ky và vòng món của p2d_kiem_roi trả túi y nguyên thay vì duyệt từng món (đo ≈1,3 ms mỗi hàm với túi 40 món).
--    Chỉ đi đường nhanh khi túi gửi = túi cũ từng byte, mọi món là object có uid số, không trùng uid: khi đó vòng cũ cũng trả
--    túi y nguyên, không lý do, không sửa (thử so từng trường hợp trong PR). Thùng rơi đồ (kyRoi) vẫn tính như cũ.
-- Chạy sau 20261105030000_p2d_ky_roi.sql. Chạy lại không đổi gì.

create or replace function public.p2d_luu_vi(p_vi jsonb, p_xoa text[], p_phien_ban integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_cu jsonb; v_pb integer; v_k text;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_vi is null or jsonb_typeof(p_vi) <> 'object' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if octet_length(p_vi::text) > 200000 or coalesce(cardinality(p_xoa), 0) > 200 then raise exception 'du_lieu_qua_lon' using errcode = '22023'; end if;
  -- tên khoá như bản lưu thật (130 tên đang dùng, dài nhất 12 ký tự)
  for v_k in select jsonb_object_keys(p_vi) union all select unnest(coalesce(p_xoa, '{}')) loop
    if v_k is null or v_k !~ '^[A-Za-z][A-Za-z0-9_]{0,39}$' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  end loop;
  select n.data, n.phien_ban into v_cu, v_pb from public.p2d_nhan_vat n where n.user_id = v_uid for update;
  if not found then raise exception 'chua_co_ban_luu' using errcode = 'P0002'; end if;
  if p_phien_ban is distinct from v_pb then raise exception 'phien_ban_cu' using errcode = 'P0001'; end if;
  return public.p2d_luu2((v_cu - coalesce(p_xoa, '{}')) || p_vi, p_phien_ban);
end;
$$;
revoke all on function public.p2d_luu_vi(jsonb, text[], integer) from public, anon;
grant execute on function public.p2d_luu_vi(jsonb, text[], integer) to authenticated, service_role;

-- Đường nhanh p2d_kiem_ky: túi gửi y hệt túi máy chủ
do $$
declare d text := pg_get_functiondef('public.p2d_kiem_ky(jsonb,jsonb)'::regprocedure);
  neo text := E'\nbegin\n  if jsonb_typeof(p_moi) is distinct from ''array'' then\n';
begin
  if position('p2d_luu_vi' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_kiem_ky da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, E'\nbegin\n' ||
    E'  -- đường nhanh (20261105090000_p2d_luu_vi): túi y hệt túi máy chủ, món nào cũng có uid số, không trùng: vòng dưới cũng trả y nguyên\n' ||
    E'  if jsonb_typeof(p_moi) = ''array'' and jsonb_typeof(p_cu) = ''array'' and p_moi = p_cu\n' ||
    E'     and (select bool_and(jsonb_typeof(o) = ''object'' and jsonb_typeof(o -> ''uid'') = ''number'') and count(distinct o ->> ''uid'') = count(*) from jsonb_array_elements(p_moi) o) is not false then\n' ||
    E'    return jsonb_build_object(''bag'', p_moi, ''ly_do'', ''[]''::jsonb, ''sua'', ''[]''::jsonb, ''chi_tiet'', ''[]''::jsonb);\n' ||
    E'  end if;\n' ||
    E'  if jsonb_typeof(p_moi) is distinct from ''array'' then\n');
end;
$$;

-- Đường nhanh vòng món p2d_kiem_roi: túi y hệt túi cũ thì không có món mới, giữ nguyên túi; thùng vẫn hồi như cũ
do $$
declare d text := pg_get_functiondef('public.p2d_kiem_roi(jsonb,jsonb,numeric,numeric,boolean)'::regprocedure);
  neo text := E'\n  if jsonb_typeof(p_moi -> ''bag'') = ''array'' then\n    for v_g in ';
begin
  if position('p2d_luu_vi' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_kiem_roi da doi, khong tim thay cho va'; end if;
  execute replace(d, neo,
    E'\n  -- đường nhanh (20261105090000_p2d_luu_vi): túi y hệt túi cũ, món nào cũng có uid số, không trùng: không món mới, túi giữ nguyên\n' ||
    E'  if jsonb_typeof(p_moi -> ''bag'') = ''array'' and p_moi -> ''bag'' = p_cu -> ''bag''\n' ||
    E'     and (select bool_and(jsonb_typeof(o) = ''object'' and jsonb_typeof(o -> ''uid'') = ''number'') and count(distinct o ->> ''uid'') = count(*) from jsonb_array_elements(p_moi -> ''bag'') o) is not false then\n' ||
    E'    v_ra := p_moi -> ''bag'';\n' ||
    E'  elsif jsonb_typeof(p_moi -> ''bag'') = ''array'' then\n    for v_g in ');
end;
$$;
