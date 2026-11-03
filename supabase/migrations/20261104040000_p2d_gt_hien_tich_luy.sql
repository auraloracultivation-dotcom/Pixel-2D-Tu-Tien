-- Hiện đúng số phút tích luỹ của người được mời (chủ dự án 04/11/2026 07:21: "hôm qua bảo sửa rồi mà họ lại bị reset về 0").
-- p2d_gt_nhip đã cộng dồn từ 03/11 (20261103050000_p2d_gt_tich_luy.sql) và số trong p2d_gioi_thieu.chuoi vẫn giữ, nhưng
-- p2d_gt_cua_toi còn luật cũ: rời game quá ngat_phut phút thì trả chuoi = 0, nên bảng sự kiện hiện 0 dù số thật vẫn còn.
-- Bỏ luật đó: luôn trả số phút đã tích luỹ. Vá bằng thay chuỗi trên hàm đang chạy.
do $$
declare d text := pg_get_functiondef('public.p2d_gt_cua_toi()'::regprocedure);
  a text := 'case when r.dat_luc is null and (r.nhip_luc is null or now() - r.nhip_luc > v_ngat) then 0 else r.chuoi end';
  b text := 'case when g.dat_luc is null and (g.nhip_luc is null or now() - g.nhip_luc > v_ngat) then 0 else g.chuoi end';
begin
  if position(a in d) = 0 and position(b in d) = 0 then return; end if;   -- đã vá
  execute replace(replace(d, a, 'coalesce(r.chuoi, 0)'), b, 'coalesce(g.chuoi, 0)');
end;
$$;
