-- Triệu hồi Hệ Thống bản 2 (chủ dự án 06/11/2026 22:37): mọi thứ mua được trong game (trừ ngọc cấp 9+), Linh Thạch 20k → 2 triệu,
-- mọi loại tỉ lệ ngang nhau (data/he-thong.json → pool, w = 1). Thú cưỡi / khôi lỗi / thời trang đã có thì đổi Linh Thạch bằng giá mua.
-- Hòm thư nhận thêm đan dược, thú cưỡi, khôi lỗi, thời trang (cộng vào bản lưu trên máy chủ).

update public.p2d_ht_cfg set v = jsonb_set(v, '{pool}', '[{"id": "lt-20k", "w": 1, "coins": 20000}, {"id": "lt-50k", "w": 1, "coins": 50000}, {"id": "lt-100k", "w": 1, "coins": 100000}, {"id": "lt-200k", "w": 1, "coins": 200000}, {"id": "lt-500k", "w": 1, "coins": 500000}, {"id": "lt-1tr", "w": 1, "coins": 1000000}, {"id": "lt-2tr", "w": 1, "coins": 2000000}, {"id": "ngoc-1", "w": 1, "gem": [1, 1], "n": 1}, {"id": "ngoc-2", "w": 1, "gem": [2, 2], "n": 1}, {"id": "ngoc-3", "w": 1, "gem": [3, 3], "n": 1}, {"id": "ngoc-4", "w": 1, "gem": [4, 4], "n": 1}, {"id": "ngoc-5", "w": 1, "gem": [5, 5], "n": 1}, {"id": "ngoc-6", "w": 1, "gem": [6, 6], "n": 1}, {"id": "ngoc-7", "w": 1, "gem": [7, 7], "n": 1}, {"id": "ngoc-8", "w": 1, "gem": [8, 8], "n": 1}, {"id": "do-0", "w": 1, "gear": [0]}, {"id": "do-1", "w": 1, "gear": [1]}, {"id": "do-2", "w": 1, "gear": [2]}, {"id": "do-3", "w": 1, "gear": [3]}, {"id": "do-4", "w": 1, "gear": [4]}, {"id": "do-5", "w": 1, "gear": [5]}, {"id": "do-6", "w": 1, "gear": [6]}, {"id": "dan-hoi-xuan-dan", "w": 1, "pill": "hoi-xuan-dan", "n": 10}, {"id": "dan-hoi-linh-dan", "w": 1, "pill": "hoi-linh-dan", "n": 10}, {"id": "dan-tu-khi-dan", "w": 1, "pill": "tu-khi-dan", "n": 5}, {"id": "dan-boi-nguyen-dan", "w": 1, "pill": "boi-nguyen-dan", "n": 2}, {"id": "dan-thanh-tam-dan", "w": 1, "pill": "thanh-tam-dan", "n": 2}, {"id": "dan-tinh-lien-dan", "w": 1, "pill": "tinh-lien-dan", "n": 1}, {"id": "dan-tu-van-dan", "w": 1, "pill": "tu-van-dan", "n": 3}, {"id": "dan-tay-tuy-dan", "w": 1, "pill": "tay-tuy-dan", "n": 1}, {"id": "nl-linh-thao", "w": 1, "mat": "linh-thao", "n": 20}, {"id": "nl-yeu-huyet", "w": 1, "mat": "yeu-huyet", "n": 10}, {"id": "nl-tinh-thiet", "w": 1, "mat": "tinh-thiet", "n": 20}, {"id": "nl-hoa-linh-chi", "w": 1, "mat": "hoa-linh-chi", "n": 5}, {"id": "nl-tay-luyen-thach", "w": 1, "mat": "tay-luyen-thach", "n": 10}, {"id": "nl-khoa-linh-thach", "w": 1, "mat": "khoa-linh-thach", "n": 2}, {"id": "nl-dao-van-thach", "w": 1, "mat": "dao-van-thach", "n": 1}, {"id": "nl-manh-phap-bao", "w": 1, "mat": "manh-phap-bao", "n": 3}, {"id": "cuoi-bach-loc", "w": 1, "mount": "bach-loc", "gia": 5000}, {"id": "cuoi-phong-lang", "w": 1, "mount": "phong-lang", "gia": 12000}, {"id": "cuoi-tuyet-ly", "w": 1, "mount": "tuyet-ly", "gia": 15000}, {"id": "cuoi-hoa-ky-lan", "w": 1, "mount": "hoa-ky-lan", "gia": 25000}, {"id": "khoi-tieu-hoa", "w": 1, "comp": "tieu-hoa", "gia": 8000}, {"id": "khoi-ho-linh", "w": 1, "comp": "ho-linh", "gia": 8000}, {"id": "khoi-thanh-diep", "w": 1, "comp": "thanh-diep", "gia": 10000}, {"id": "khoi-mac-anh", "w": 1, "comp": "mac-anh", "gia": 12000}, {"id": "khoi-thach-sinh", "w": 1, "comp": "thach-sinh", "gia": 15000}, {"id": "khoi-thiet-lan", "w": 1, "comp": "thiet-lan", "gia": 18000}, {"id": "ao-thanh-sam", "w": 1, "outfit": "thanh-sam", "gia": 800}, {"id": "ao-hac-y", "w": 1, "outfit": "hac-y", "gia": 1500}, {"id": "ao-hong-y", "w": 1, "outfit": "hong-y", "gia": 1500}, {"id": "ao-tien-nhan", "w": 1, "outfit": "tien-nhan", "gia": 10000}, {"id": "ao-hoang-kim", "w": 1, "outfit": "hoang-kim", "gia": 10000}]'::jsonb) where k = 'cfg';

-- Triệu hồi: trừ điểm, quay bảng quà (trọng số w; chủ dự án 06/11/2026 22:37: mọi loại ngang nhau), quà vào Hòm thư.
-- Thú cưỡi / khôi lỗi / thời trang đã có (hoặc đang chờ trong Hòm thư) thì đổi ra gia Linh Thạch.
create or replace function public.p2d_ht_trieu()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype;
  v_cost int := (c ->> 'cost')::int; v_tot numeric; v_x numeric; e jsonb; v_pick jsonb; v_nd jsonb; v_lvl int; v_lv int; v_t int; v_d jsonb; v_g text; v_k text;
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
  v_nd := v_nd || jsonb_build_object('tieu_de', c ->> 'mail');
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, v_nd, 'he_thong_qua');
  insert into public.p2d_ht_lich_su (user_id, qua, noi_dung) values (v_uid, v_pick ->> 'id', v_nd);
  update public.p2d_ht_diem set diem = diem - v_cost, so_lan = so_lan + 1, luc = now() where user_id = v_uid returning * into v_row;
  return jsonb_build_object('qua', v_pick ->> 'id', 'noi_dung', v_nd, 'diem', v_row.diem);
end;
$$;
revoke all on function public.p2d_ht_trieu() from public, anon;
grant execute on function public.p2d_ht_trieu() to authenticated;

create or replace function public.p2d_nhan_thu_moi(p_ids bigint[], p_uid_tu bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_t record; v_next bigint; v_cho integer; v_item jsonb; v_lt numeric; v_ra jsonb := '[]'::jsonb; v_nd jsonb; v_gk text; v_id text;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_next := greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'nextUid') = 'number' then (v_nv.data ->> 'nextUid')::bigint end, 1), coalesce(p_uid_tu, 0));
  v_cho := 40 - coalesce(jsonb_array_length(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end), 0);
  for v_t in select * from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.id = any (p_ids) order by t.id loop
    v_nd := v_t.noi_dung;
    if v_nd ? 'item' then
      if v_cho <= 0 then continue; end if;
      v_item := public.p2d_ky_dong(((v_nd -> 'item') - 'sig') || jsonb_build_object('uid', v_next));   -- uid mới: ký lại (20261105010000_p2d_ky_mon)
      v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end, '[]'::jsonb) || jsonb_build_array(v_item));
      v_nd := jsonb_set(v_nd, '{item}', v_item); v_next := v_next + 1; v_cho := v_cho - 1;
    end if;
    if v_nd ? 'coins' and jsonb_typeof(v_nd -> 'coins') = 'number' then
      v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt + (v_nd ->> 'coins')::numeric));
    end if;
    if v_nd ? 'mat' and jsonb_typeof(v_nd -> 'mat' -> 'n') = 'number' and coalesce(v_nd -> 'mat' ->> 'id', '') ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'mats') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mats}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['mats', v_nd -> 'mat' ->> 'id'], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (v_nd -> 'mat' ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (v_nd -> 'mat' ->> 'id'))::numeric end, 0) + (v_nd -> 'mat' ->> 'n')::numeric));
    end if;
    v_gk := v_nd -> 'gem' ->> 'key';
    if v_nd ? 'gem' and jsonb_typeof(v_nd -> 'gem' -> 'n') = 'number' and public.p2d_ngoc_dung(coalesce(v_gk, '')) then
      if jsonb_typeof(v_nv.data -> 'gems') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{gems}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['gems', v_gk], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_gk) = 'number' then (v_nv.data -> 'gems' ->> v_gk)::numeric end, 0) + (v_nd -> 'gem' ->> 'n')::numeric));
    end if;
    -- Đan dược, thú cưỡi, khôi lỗi, thời trang (quà Hệ Thống, 20261106150000): cộng thẳng vào bản lưu trên máy chủ để p2d_kiem_thu thấy là đồ hợp lệ
    if v_nd ? 'pill' and jsonb_typeof(v_nd -> 'pill' -> 'n') = 'number' and coalesce(v_nd -> 'pill' ->> 'id', '') ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'pills') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{pills}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['pills', v_nd -> 'pill' ->> 'id'], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'pills' -> (v_nd -> 'pill' ->> 'id')) = 'number' then (v_nv.data -> 'pills' ->> (v_nd -> 'pill' ->> 'id'))::numeric end, 0) + (v_nd -> 'pill' ->> 'n')::numeric));
    end if;
    v_id := v_nd ->> 'mount';
    if v_id ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'mounts') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mounts}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['mounts', v_id], 'true'::jsonb);
    end if;
    v_id := v_nd ->> 'comp';
    if v_id ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'comps') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{comps}', '{}'::jsonb); end if;
      if not (v_nv.data -> 'comps') ? v_id then v_nv.data := jsonb_set(v_nv.data, array['comps', v_id], '{"lv": 1, "exp": 0}'::jsonb); end if;
    end if;
    v_id := v_nd ->> 'outfit';
    if v_id ~ '^[a-z0-9-]{1,40}$' and v_nd ->> 'g' in ('nam', 'nu') then
      if jsonb_typeof(v_nv.data -> 'outfits') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{outfits}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['outfits', v_id || ':' || (v_nd ->> 'g')], 'true'::jsonb);
    end if;
    update public.p2d_hom_thu set nhan_luc = now() where id = v_t.id;
    v_ra := v_ra || jsonb_build_array(jsonb_build_object('id', v_t.id, 'noi_dung', v_nd, 'ly_do', v_t.ly_do));
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    v_nv.data := jsonb_set(v_nv.data, '{nextUid}', to_jsonb(v_next));
    update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_nv.phien_ban;
  end if;
  return jsonb_build_object('thu', v_ra, 'phien_ban', v_nv.phien_ban, 'next_uid', v_next);
end;
$function$;
