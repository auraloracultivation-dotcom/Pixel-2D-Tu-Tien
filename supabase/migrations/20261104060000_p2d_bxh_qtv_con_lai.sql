-- Bảng Quản trị viên hiện điểm CÒN LẠI sau khi đổi Tiên Ngọc (chủ dự án 04/11/2026 12:03: "có người đổi mà không mất điểm").
-- Sổ cái p2d_qtv_so vẫn trừ đúng khi đổi (p2d_qtv_doi kiểm số dư trên toàn bộ sổ), chỉ có hai hàm bảng xếp hạng bỏ qua dòng
-- 'doi_tien_ngoc' nên điểm trên bảng không giảm. Bỏ bộ lọc đó. Vá bằng thay chuỗi trên hàm đang chạy (chạy lại không sao).
do $$
declare f text; d text; a text := ' where nguon <> ''doi_tien_ngoc'' group by user_id';
begin
  foreach f in array array['public.p2d_bxh_qtv3()', 'public.p2d_bxh_qtv_het()'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position(a in d) = 0 then continue; end if;
    execute replace(d, a, ' group by user_id');
  end loop;
end;
$$;
