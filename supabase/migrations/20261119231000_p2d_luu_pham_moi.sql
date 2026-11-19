-- Sửa lỗi 19/11/2026 23:2x: từ khi có phẩm Tiên / Thượng Cổ (migration 20261119150000_p2d_pham_moi), món phẩm mới trong túi bị
-- p2d_luu từ chối ('do_sai': danh sách phẩm hợp lệ còn 5 bậc cũ) nên người đang cầm món đó không lưu được tiến độ, thoát game là mất
-- (kéo theo "máy chủ chưa thấy viên ngọc này trong túi" vì bản lưu trên máy chủ cũ). Chỉ thêm hai phẩm mới vào danh sách, không đổi gì khác.
do $$
declare v_def text := pg_get_functiondef('public.p2d_luu'::regproc);
  v_cu text := 'not in (''pham'', ''linh'', ''huyen'', ''dia'', ''thien''))';
  v_moi text := 'not in (''pham'', ''linh'', ''huyen'', ''dia'', ''thien'', ''tien'', ''thuong-co''))';
begin
  if position(v_moi in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_cu, ''))) / length(v_cu) <> 1 then raise exception 'p2d_luu: không thấy đúng một chỗ kiểm phẩm'; end if;
  execute replace(v_def, v_cu, v_moi);
end $$;
