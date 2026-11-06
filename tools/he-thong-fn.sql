-- Hàm của Hệ Thống Tu Tiên (ghép vào migration bởi tools/he-thong-sql.py)

-- Bản lưu d có đạt điều kiện nhiệm vụ dk không (cùng cách tính với src/game/he-thong.js missionDone)
create or replace function public.p2d_ht_dk(d jsonb, dk jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare v_eq jsonb := case when jsonb_typeof(d -> 'equip') = 'object' then d -> 'equip' else '{}'::jsonb end;
  v_bag jsonb := case when jsonb_typeof(d -> 'bag') = 'array' then d -> 'bag' else '[]'::jsonb end;
  v_realm int := coalesce((d ->> 'realm')::int, 0); v_n int;
  cnt jsonb;
begin
  if dk ? 'step' and coalesce((d ->> 'step')::int, 0) < (dk ->> 'step')::int then return false; end if;
  if dk ? 'realm' then
    if v_realm < (dk ->> 'realm')::int then return false; end if;
    if dk ? 'layer' and v_realm = (dk ->> 'realm')::int and coalesce((d ->> 'layer')::int, 1) < (dk ->> 'layer')::int then return false; end if;
  end if;
  if dk ? 'equip' and (select count(*) from jsonb_object_keys(v_eq)) < (dk ->> 'equip')::int then return false; end if;
  foreach cnt in array array[to_jsonb('techs'::text), to_jsonb('pets'::text), to_jsonb('mounts'::text)] loop
    if dk ? (cnt #>> '{}') then
      v_n := case when jsonb_typeof(d -> (cnt #>> '{}')) = 'object' then (select count(*) from jsonb_object_keys(d -> (cnt #>> '{}'))) else 0 end;
      if v_n < (dk ->> (cnt #>> '{}'))::int then return false; end if;
    end if;
  end loop;
  if dk ? 'plus' and coalesce((select max(coalesce((b ->> 'plus')::int, 0)) from jsonb_array_elements(v_bag) b
      where exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')), 0) < (dk ->> 'plus')::int then return false; end if;
  if dk ? 'socket' and coalesce((select count(*) from jsonb_array_elements(v_bag) b, jsonb_array_elements(case when jsonb_typeof(b -> 'sockets') = 'array' then b -> 'sockets' else '[]'::jsonb end) s
      where jsonb_typeof(s) = 'string' and exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')), 0) < (dk ->> 'socket')::int then return false; end if;
  return true;
end;
$$;
revoke all on function public.p2d_ht_dk(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.p2d_ht_trang_thai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((select jsonb_build_object('diem', diem, 'xong', to_jsonb(xong), 'so_lan', so_lan) from public.p2d_ht_diem where user_id = public.p2d_uid()),
  jsonb_build_object('diem', 0, 'xong', '[]'::jsonb, 'so_lan', 0)) $$;
revoke all on function public.p2d_ht_trang_thai() from public, anon;
grant execute on function public.p2d_ht_trang_thai() to authenticated;

-- Nhận điểm một nhiệm vụ: máy chủ kiểm trên bản lưu trên máy chủ
create or replace function public.p2d_ht_nhan(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_ht_nv%rowtype; v_d jsonb; v_row public.p2d_ht_diem%rowtype; v_pt int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  select * into v_nv from public.p2d_ht_nv where id = p_id;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if p_id = any (v_row.xong) then raise exception 'da_nhan' using errcode = '22023'; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  if v_d is null or not public.p2d_ht_dk(v_d, v_nv.dk) then raise exception 'chua_xong' using errcode = '22023'; end if;
  v_pt := ((select v from public.p2d_ht_cfg where k = 'cfg') ->> 'points')::int;
  update public.p2d_ht_diem set diem = diem + v_pt, xong = array_append(xong, p_id), luc = now() where user_id = v_uid returning * into v_row;
  return jsonb_build_object('diem', v_row.diem, 'xong', to_jsonb(v_row.xong), 'them', v_pt);
end;
$$;
revoke all on function public.p2d_ht_nhan(text) from public, anon;
grant execute on function public.p2d_ht_nhan(text) to authenticated;

-- Một món trang bị ngẫu nhiên mọi ô, 1 dòng màu bậc p_t, cấp món p_lvl (cùng công thức src/game/items.js rollItem, tiers.js lineValue)
create or replace function public.p2d_ht_do(p_t int, p_lvl int)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_base text; b jsonb; r jsonb; v_rid text; v_main jsonb := '{}'::jsonb;
  kv record; v_s text; st jsonb; v_cap int := 1; v_tot numeric; v_x numeric; i int; v_val int; v_pool jsonb;
begin
  select k into v_base from jsonb_object_keys(c -> 'bases') k order by random() limit 1;
  b := c -> 'bases' -> v_base;
  v_rid := c -> 'tier_rar' ->> p_t; r := c -> 'rar' -> v_rid;
  for kv in select * from jsonb_each(b -> 'main') loop
    st := c -> 'stats' -> kv.key;
    v_main := v_main || jsonb_build_object(kv.key, greatest(1, round((kv.value #>> '{}')::numeric
      * (case when coalesce((st ->> 'pct')::boolean, false) then 1 else 1 + p_lvl * (c ->> 'main_per_lvl')::numeric end) * (r ->> 'mult')::numeric)));
  end loop;
  v_pool := b -> 'pool';
  v_s := v_pool ->> floor(random() * jsonb_array_length(v_pool))::int;
  st := c -> 'stats' -> v_s;
  v_val := greatest(1, round(((st ->> 'min')::numeric + random() * ((st ->> 'max')::numeric - (st ->> 'min')::numeric))
    * (case when coalesce((st ->> 'pct')::boolean, false) then 1 else 1 + p_lvl * (c ->> 'line_per_lvl')::numeric end) * (c -> 'tiers' ->> p_t)::numeric));
  select sum(x::numeric) into v_tot from jsonb_array_elements_text(c -> 'cap_w') x;
  v_x := random() * v_tot;
  for i in 0 .. jsonb_array_length(c -> 'cap_w') - 1 loop
    v_x := v_x - (c -> 'cap_w' ->> i)::numeric;
    if v_x <= 0 then v_cap := i + 1; exit; end if;
  end loop;
  return jsonb_build_object('uid', 0, 'base', v_base, 'rarity', v_rid, 'lvl', p_lvl, 'main', v_main,
    'lines', jsonb_build_array(jsonb_build_object('s', v_s, 'v', v_val, 't', p_t)), 'cap', v_cap,
    'sockets', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, coalesce((r ->> 'sockets')::int, 0))),
    'el', c -> 'els' ->> floor(random() * jsonb_array_length(c -> 'els'))::int);
end;
$$;
revoke all on function public.p2d_ht_do(int, int) from public, anon, authenticated;

-- Triệu hồi: trừ điểm, quay bảng quà (trọng số w), quà vào Hòm thư
create or replace function public.p2d_ht_trieu()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype;
  v_cost int := (c ->> 'cost')::int; v_tot numeric; v_x numeric; e jsonb; v_pick jsonb; v_nd jsonb; v_lvl int; v_lv int; v_t int;
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
  if v_pick ? 'coins' then v_nd := jsonb_build_object('coins', (v_pick ->> 'coins')::int);
  elsif v_pick ? 'gem' then
    v_lv := (v_pick -> 'gem' ->> 0)::int + floor(random() * ((v_pick -> 'gem' ->> 1)::int - (v_pick -> 'gem' ->> 0)::int + 1))::int;
    v_nd := jsonb_build_object('gem', jsonb_build_object('key', (c -> 'gems' ->> floor(random() * jsonb_array_length(c -> 'gems'))::int) || ':' || v_lv, 'n', coalesce((v_pick ->> 'n')::int, 1)));
  elsif v_pick ? 'mat' then v_nd := jsonb_build_object('mat', jsonb_build_object('id', v_pick ->> 'mat', 'n', (v_pick ->> 'n')::int));
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
