-- Bỏ trần lực chiến khi lưu (chủ dự án 11/11/2026 23:51, cho phép chạy 23:57: "Bỏ toàn bộ trần lực chiến, vì như vậy bug và hack mới dễ dàng lộ diện.
-- Tui cố tình làm game để cấp thấp vẫn ăn được cấp cao, cho nên trần lực chiến vô nghĩa").
-- Trước: p2d_luu cắt lực chiến ở 6000 × 1.6^cảnh giới (Nguyên Anh 24.576) và ghi nghi vấn 'luc_chien' mỗi lần lưu vượt trần,
-- nên bảng xếp hạng hiện số đã cắt, người chơi mạnh thật bị ghi nghi vấn liên tục. Nay ghi đúng số máy khách gửi
-- (vẫn giữ giới hạn kiểu số 0..100.000.000 sẵn có cho cột integer), không ghi nghi vấn lực chiến nữa.
-- Sửa đúng một dòng trong thân hàm đang chạy (hàm dài, nhiều bản vá chồng nhau): không thấy dòng đó thì dừng, không đổi gì.
do $$
declare
  d text := pg_get_functiondef('public.p2d_luu'::regproc);
  cu text := '  if v_luc > v_tran_luc then v_luc := v_tran_luc; v_ly_do := array_append(v_ly_do, ''luc_chien''); end if;';
begin
  if position(cu in d) = 0 then raise exception 'p2d_bo_tran_luc_chien: khong thay dong tran luc chien'; end if;
  d := replace(d, cu, '  -- trần lực chiến đã bỏ (20261111160000_p2d_bo_tran_luc_chien.sql)');
  execute d;
end $$;
