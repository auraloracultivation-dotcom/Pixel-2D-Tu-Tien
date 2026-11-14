-- Hàm thử: một người chơi thử quay v_n lượt liền, trả số lượt mỗi bậc, số giải lớn, chuỗi dài nhất không ra Hiếm / Cực hiếm, Linh Thạch mỗi lượt, số lần báo kênh thế giới.
-- Dùng bởi tools/may-chu-thu/trieu-hoi.sh (mỗi mẻ một giao dịch riêng: quay hết trong một giao dịch thì chậm dần vì dòng chết).
create or replace function public.thu(v_n int, v_uid uuid) returns jsonb language plpgsql as $f$
declare v_i int; v_r jsonb; v_t0 timestamptz := clock_timestamp(); v_run2 int := 0; v_max2 int := 0; v_run3 int := 0; v_max3 int := 0; v_cnt int[] := array[0,0,0,0,0]; v_b int;
  v_chat0 bigint; v_chat1 bigint; v_coins numeric := 0; v_goc numeric := 0; v_doi int := 0; v_bk int := 0; v_lon int := 0; v_id jsonb := '{}'::jsonb; v_q text; v_mb2 int := 0; v_mb3 int := 0;
begin
  perform set_config('request.jwt.claim.sub', v_uid::text, true);
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  update public.p2d_ht_diem set diem = 100 * v_n + 50 where user_id = v_uid;
  delete from public.p2d_hom_thu; delete from public.p2d_ht_lich_su where coalesce((noi_dung ->> 'bac')::int, 0) < 3;
  select count(*) into v_chat0 from public.p2d_chat where ten = 'Hệ Thống';
  for v_i in 1 .. v_n loop
    v_r := public.p2d_ht_trieu(); v_q := v_r ->> 'qua';
    v_b := coalesce((v_r ->> 'bac')::int, 0); v_cnt[v_b + 1] := v_cnt[v_b + 1] + 1; v_mb2 := greatest(v_mb2, coalesce((v_r ->> 'bh2')::int, 0)); v_mb3 := greatest(v_mb3, coalesce((v_r ->> 'bh3')::int, 0));
    if v_b >= 2 then v_run2 := 0; else v_run2 := v_run2 + 1; v_max2 := greatest(v_max2, v_run2); end if;
    if v_b >= 3 then v_run3 := 0; else v_run3 := v_run3 + 1; v_max3 := greatest(v_max3, v_run3); end if;
    v_coins := v_coins + coalesce((v_r -> 'noi_dung' ->> 'coins')::numeric, 0);
    if v_r -> 'noi_dung' ? 'coins' and not v_r -> 'noi_dung' ? 'doi' then v_goc := v_goc + (v_r -> 'noi_dung' ->> 'coins')::numeric / coalesce((v_r ->> 'bk')::int, 1); end if;
    if v_r -> 'noi_dung' ? 'doi' then v_doi := v_doi + 1; end if;
    if coalesce((v_r ->> 'bk')::int, 1) > 1 then v_bk := v_bk + 1; end if;
    if v_q in ('lt-1tr', 'lt-2tr', 'ngoc-7', 'ngoc-8', 'do-5', 'do-6') then v_lon := v_lon + 1; end if;
    v_id := jsonb_set(v_id, array[v_q], to_jsonb(coalesce((v_id ->> v_q)::int, 0) + 1));
  end loop;
  select count(*) into v_chat1 from public.p2d_chat where ten = 'Hệ Thống';
  return jsonb_build_object('n', v_n, 'bac', to_jsonb(v_cnt), 'sau_giai_lon', v_lon, 'max_lien_khong_hiem', v_max2, 'max_lien_khong_cuc', v_max3, 'coins_moi_luot', round(v_coins / v_n), 'coins_goc_moi_luot', round(v_goc / v_n),
    'doi', v_doi, 'so_bao_kich', v_bk, 'loa', v_chat1 - v_chat0, 'giay', round(extract(epoch from clock_timestamp() - v_t0)::numeric, 1), 'bh2_max', v_mb2, 'bh3_max', v_mb3, 'mon', v_id);
end $f$;
