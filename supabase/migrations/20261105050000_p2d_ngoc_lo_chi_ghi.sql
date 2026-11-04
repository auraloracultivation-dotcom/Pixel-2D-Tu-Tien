-- 'ngoc_lo' chỉ ghi, không cộng điểm nghi vấn (05/11/2026). Máy chủ luôn cắt phần ngọc lố (p2d_kiem_ngoc) nên điểm không chặn
-- thêm gì; còn bản game cũ chưa tải lại (trước 20261105020000) không biết nhận sua.gems, gửi lại phần lố mỗi lần lưu và bị
-- cộng điểm liên tục (LỵHoaTúBà 76 lần trong 2 giờ, đêm 04/11). Vá chuỗi array_remove trong p2d_luu, chạy lại không sao.
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  a text := '''roi_nhieu''), ''roi_trung''), ''roi_dau''), 1)';
  b text := '''roi_nhieu''), ''roi_trung''), ''roi_dau''), ''ngoc_lo''), 1)';
begin
  if position(b in d) > 0 then return; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va'; end if;
  execute replace(replace(d, a, b), 'array_length(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(v_ly_do',
    'array_length(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(v_ly_do');
end;
$$;
