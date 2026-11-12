-- Hồ sơ người chơi khác (p2d_xem_nguoi) trả thêm pháp bảo đang mặc của hệ Pháp Bảo Luyện Chế (chủ dự án 12/11/2026 11:01:
-- hồ sơ bảng xếp hạng ô pháp bảo trống). Chỉ món đang mặc (data.phapBao.wear) và danh sách wear; không trả đá, món cất.
-- Máy khách lọc lại (src/game/profile.js cleanSave). Chỉ thêm một khoá vào bản trả về, phần còn lại của hàm giữ nguyên.
do $$
declare d text;
  v_old text := '''look'', d -> ''look'',';
  v_new text := '''phapBao'', case when jsonb_typeof(d -> ''phapBao'' -> ''wear'') = ''array'' then jsonb_build_object(''wear'', d -> ''phapBao'' -> ''wear'', ''items'', (select coalesce(jsonb_agg(i), ''[]''::jsonb) from jsonb_array_elements(case when jsonb_typeof(d -> ''phapBao'' -> ''items'') = ''array'' then d -> ''phapBao'' -> ''items'' else ''[]''::jsonb end) i where (d -> ''phapBao'' -> ''wear'') @> jsonb_build_array(i -> ''uid''))) end,
      ''look'', d -> ''look'',';
begin
  d := pg_get_functiondef('public.p2d_xem_nguoi(text)'::regprocedure);
  if position('''phapBao''' in d) > 0 then return; end if;   -- đã thêm
  if position(v_old in d) = 0 then raise exception 'khong thay cho them trong p2d_xem_nguoi'; end if;
  execute replace(d, v_old, v_new);
end $$;
