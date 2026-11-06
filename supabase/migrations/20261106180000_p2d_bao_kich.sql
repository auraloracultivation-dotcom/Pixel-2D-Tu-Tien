-- Bạo kích khi triệu hồi (chủ dự án 06/11/2026 23:52): tỉ lệ chỉ ở máy chủ. Thư quà có thêm bk (số lần nhân) để máy khách hiện chữ x2, x3...

-- Triệu hồi: trừ điểm, quay bảng quà (trọng số w; chủ dự án 06/11/2026 22:37: mọi loại ngang nhau), quà vào Hòm thư.
-- Thú cưỡi / khôi lỗi / thời trang đã có (hoặc đang chờ trong Hòm thư) thì đổi ra gia Linh Thạch.
create or replace function public.p2d_ht_trieu()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype;
  v_cost int := (c ->> 'cost')::int; v_tot numeric; v_x numeric; e jsonb; v_pick jsonb; v_nd jsonb; v_lvl int; v_lv int; v_t int; v_d jsonb; v_g text; v_k text; v_bk int; v_cf jsonb;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if not found or v_row.diem < v_cost then raise exception 'thieu_diem' using errcode = '22023'; end if;
  select sum((x ->> 'w')::numeric) into v_tot from jsonb_array_elements(c -> 'pool') x;
  v_x := random() * v_tot;
  for e in select * from jsonb_array_elements(c -> 'pool') loop
    v_x := v_x - (e ->> 'w')::numeric;
    if v_x <= 0 then v_pick := e; exit; end if;
  end loop;
  v_pick := coalesce(v_pick, c -> 'pool' -> 0);
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  if v_pick ? 'coins' then v_nd := jsonb_build_object('coins', (v_pick ->> 'coins')::int);
  elsif v_pick ? 'gem' then
    v_lv := (v_pick -> 'gem' ->> 0)::int + floor(random() * ((v_pick -> 'gem' ->> 1)::int - (v_pick -> 'gem' ->> 0)::int + 1))::int;
    v_nd := jsonb_build_object('gem', jsonb_build_object('key', (c -> 'gems' ->> floor(random() * jsonb_array_length(c -> 'gems'))::int) || ':' || v_lv, 'n', coalesce((v_pick ->> 'n')::int, 1)));
  elsif v_pick ? 'mat' then v_nd := jsonb_build_object('mat', jsonb_build_object('id', v_pick ->> 'mat', 'n', (v_pick ->> 'n')::int));
  elsif v_pick ? 'pill' then v_nd := jsonb_build_object('pill', jsonb_build_object('id', v_pick ->> 'pill', 'n', (v_pick ->> 'n')::int));
  elsif v_pick ? 'mount' or v_pick ? 'comp' or v_pick ? 'outfit' then
    v_g := case when v_d ->> 'gioi' = 'nu' then 'nu' else 'nam' end;
    v_k := coalesce(v_pick ->> 'mount', v_pick ->> 'comp', v_pick ->> 'outfit');
    if (v_pick ? 'mount' and (coalesce((v_d -> 'mounts') ? v_k, false) or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.noi_dung ->> 'mount' = v_k)))
       or (v_pick ? 'comp' and (coalesce((v_d -> 'comps') ? v_k, false) or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.noi_dung ->> 'comp' = v_k)))
       or (v_pick ? 'outfit' and (coalesce((v_d -> 'outfits') ? (v_k || ':' || v_g), false) or (v_d -> 'outfits' -> v_k) = 'true'::jsonb
           or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.noi_dung ->> 'outfit' = v_k))) then
      v_nd := jsonb_build_object('coins', (v_pick ->> 'gia')::int, 'doi', v_k);   -- đã có: đổi ra Linh Thạch
    elsif v_pick ? 'mount' then v_nd := jsonb_build_object('mount', v_k);
    elsif v_pick ? 'comp' then v_nd := jsonb_build_object('comp', v_k);
    else v_nd := jsonb_build_object('outfit', v_k, 'g', v_g);
    end if;
  else
    select greatest(0, coalesce(canh_gioi, 0) * 9 + coalesce(tang, 1) - 1) into v_lvl from public.p2d_nhan_vat where user_id = v_uid;
    v_t := (v_pick -> 'gear' ->> floor(random() * jsonb_array_length(v_pick -> 'gear'))::int)::int;
    v_nd := jsonb_build_object('item', public.p2d_ht_do(v_t, coalesce(v_lvl, 0)));
  end if;
  -- Bạo kích (chủ dự án 06/11/2026 23:52: tỉ lệ không ghi vào game): số liệu ở p2d_ht_cfg 'bk' trên máy chủ (p: tỉ lệ lên mỗi bậc,
  -- max: bậc cao nhất, cap: trần Linh Thạch một lần), không có trong repo. Chỉ nhân đồ đếm được: Linh Thạch, đan, nguyên liệu, ngọc.
  v_bk := 1; v_cf := coalesce((select v from public.p2d_ht_cfg where k = 'bk'), '{"p": 0, "max": 1, "cap": 0}'::jsonb);
  if v_nd ? 'coins' and not v_nd ? 'doi' or v_nd ? 'pill' or v_nd ? 'mat' or v_nd ? 'gem' then
    while v_bk < (v_cf ->> 'max')::int and random() < (v_cf ->> 'p')::numeric loop v_bk := v_bk + 1; end loop;
  end if;
  if v_bk > 1 then
    if v_nd ? 'coins' then v_nd := jsonb_set(v_nd, '{coins}', to_jsonb(least((v_nd ->> 'coins')::bigint * v_bk, greatest((v_cf ->> 'cap')::bigint, (v_nd ->> 'coins')::bigint))));
    else
      v_k := case when v_nd ? 'pill' then 'pill' when v_nd ? 'mat' then 'mat' else 'gem' end;
      v_nd := jsonb_set(v_nd, array[v_k, 'n'], to_jsonb((v_nd -> v_k ->> 'n')::int * v_bk));
    end if;
    v_nd := v_nd || jsonb_build_object('bk', v_bk);
  end if;
  v_nd := v_nd || jsonb_build_object('tieu_de', c ->> 'mail');
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, v_nd, 'he_thong_qua');
  insert into public.p2d_ht_lich_su (user_id, qua, noi_dung) values (v_uid, v_pick ->> 'id', v_nd);
  update public.p2d_ht_diem set diem = diem - v_cost, so_lan = so_lan + 1, luc = now() where user_id = v_uid returning * into v_row;
  return jsonb_build_object('qua', v_pick ->> 'id', 'noi_dung', v_nd, 'diem', v_row.diem, 'bk', v_bk);
end;
$$;
revoke all on function public.p2d_ht_trieu() from public, anon;
grant execute on function public.p2d_ht_trieu() to authenticated;
