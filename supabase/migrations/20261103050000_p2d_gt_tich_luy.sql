-- Mời bạn: bạn mới online đủ 4 tiếng CỘNG DỒN, không còn "liên tục, ra ngoài quá 5 phút thì đếm lại" (chủ dự án 03/11/2026 16:24).
-- Chỉ đổi một dòng trong p2d_gt_nhip (bản 20261031040000_p2d_ngoc20_gt_cung_mang.sql); mỗi nhịp vẫn cách nhau ít nhất 50 giây.
-- Đã chạy trên máy chủ ngày 03/11 bằng cách thay chuỗi trong định nghĩa hàm đang chạy.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.p2d_gt_nhip()'::regprocedure);
  d := replace(d, 'v_chuoi := case when r.nhip_luc is null or now() - r.nhip_luc > v_ngat then 1 else r.chuoi + 1 end;',
                  'v_chuoi := coalesce(r.chuoi, 0) + 1;   -- tích luỹ 4 tiếng, ra ngoài không đếm lại (chủ dự án 03/11/2026 16:24)');
  execute d;
end $$;
