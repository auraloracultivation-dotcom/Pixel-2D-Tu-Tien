-- Tắt tin "【Thiên Đạo】... xuất thế!" ở kênh Thế giới (chủ dự án 04/11/2026 08:02: "nhiều quá, người ta không chat với nhau
-- mà toàn chỉ thấy tui online"). p2d_nhip_song vẫn ghi nhịp online như cũ, chỉ bỏ phần chèn tin. Vá bằng thay chuỗi trên hàm đang chạy.
do $$
declare d text := pg_get_functiondef('public.p2d_nhip_song()'::regprocedure);
  a text := 'if v_cu is null or v_cu < now() - interval ''5 minutes'' then';
begin
  if position(a in d) = 0 then return; end if;   -- đã tắt
  execute replace(d, a, 'if false then   -- tắt tin "xuất thế" ở kênh Thế giới (chủ dự án 04/11/2026 08:02)');
end;
$$;
