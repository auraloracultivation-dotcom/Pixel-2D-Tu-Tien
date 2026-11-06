-- Linh Thạch chém Thôn Thiên Mãng ×3 (chủ dự án 06/11/2026 11:39): trần một lô 5 phút / người 20.000 → 60.000
-- (vết nứt: 3,76 × 30 × 1,5 × 300 giây ≈ 50.760). Cloudflare cloud/src/mang.js PAY_MAX đổi cùng lúc.
do $$
declare d text := pg_get_functiondef('public.p2d_mang_thuong(bigint, text, text)'::regprocedure);
  a text := 'least(coalesce((v_e ->> ''lt'')::numeric, 0), 20000)';
begin
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'anchor'; end if;
  execute replace(d, a, 'least(coalesce((v_e ->> ''lt'')::numeric, 0), 60000)');
end $$;
