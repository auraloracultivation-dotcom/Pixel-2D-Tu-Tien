-- Lý do "do_hiem" (nhiều món Thiên / Địa mới trong một lần lưu) không cộng điểm nghi vấn nữa (chủ dự án 04/11/2026 21:15).
-- Càn quét bí cảnh ra đủ đồ rơi (PR #568) và huỷ rao chợ (đồ quay về túi) đều làm túi có nhiều món hiếm mới cùng lúc,
-- nên Thần Nguyên bị cắm cờ oan. Vẫn ghi vào p2d_nghi_van để xem lại, chỉ không cộng nghi_van. Vá bằng thay chuỗi trên hàm
-- đang chạy (chạy lại không sao).
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  a text := 'array_length(array_remove(v_ly_do, ''do_da_rao''), 1)';
  b text := 'array_length(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), 1)';
begin
  if position(b in d) > 0 then return; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'khong tim thay cho va'; end if;
  execute replace(d, a, b);
end;
$$;
