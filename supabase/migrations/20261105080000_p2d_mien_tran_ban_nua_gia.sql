-- Bán lại đúng nửa giá mua (chủ dự án 05/11/2026 09:41: "Hoả kỳ lân phải bán 12500"). p2d_mien_tran cho bán thú cưỡi vượt trần
-- ngày tới 8500 mỗi con: nay 12500 (Hỏa Kỳ Lân 25.000 / 2). Tiến hoá linh thú cộng giá bán 5000 → 450 (data/pets.json home.sell.evo).
do $$
declare d text := pg_get_functiondef('public.p2d_mien_tran(jsonb,jsonb,uuid)'::regprocedure);
  a text := 'count(*) * 8500'; b text := 'count(*) * 12500';
  c text := 'then 5000 else 0 end'; e text := 'then 450 else 0 end';
begin
  if position(b in d) > 0 then return; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 or (length(d) - length(replace(d, c, ''))) / length(c) <> 1 then
    raise exception 'p2d_mien_tran da doi, khong tim thay cho va'; end if;
  execute replace(replace(d, a, b), c, e);
end;
$$;
