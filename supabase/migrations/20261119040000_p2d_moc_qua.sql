-- Mốc quà (chủ dự án 19/11/2026 03:26): hạ bao nhiêu quái, chơi bao nhiêu giờ, triệu hồi bao nhiêu lần, lên cảnh giới nào thì nhận quà.
-- Sinh bằng tools/moc-sql.py từ data/he-thong.json → moc. Mỗi mốc là một nhiệm vụ hệ thống (id moc-*): nhận một lần, cộng điểm như mọi
-- nhiệm vụ, quà vào Hòm thư (p2d_ht_thuong). Không đổi bảng, không xoá gì.

insert into public.p2d_ht_nv (id, ord, dk, qua) values
('moc-q-100', 9000, '{"kills": 100}'::jsonb, '[{"coins": 2000}, {"pill": "hoi-xuan-dan", "n": 5}]'::jsonb),
('moc-q-500', 9001, '{"kills": 500}'::jsonb, '[{"coins": 5000}, {"pill": "tu-khi-dan", "n": 5}]'::jsonb),
('moc-q-1000', 9002, '{"kills": 1000}'::jsonb, '[{"coins": 10000}, {"gem": "hong-ngoc:2", "n": 1}]'::jsonb),
('moc-q-3000', 9003, '{"kills": 3000}'::jsonb, '[{"gear": 2, "slot": "thieu"}, {"pill": "hoi-linh-dan", "n": 10}]'::jsonb),
('moc-q-10000', 9004, '{"kills": 10000}'::jsonb, '[{"coins": 30000}, {"pill": "tu-van-dan", "n": 3}]'::jsonb),
('moc-q-30000', 9005, '{"kills": 30000}'::jsonb, '[{"gear": 3, "slot": "thieu"}, {"gem": "hong-ngoc:3", "n": 1}]'::jsonb),
('moc-q-60000', 9006, '{"kills": 60000}'::jsonb, '[{"coins": 80000}, {"gem": "hong-ngoc:4", "n": 1}]'::jsonb),
('moc-q-100000', 9007, '{"kills": 100000}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"pill": "tu-van-dan", "n": 5}]'::jsonb),
('moc-q-200000', 9008, '{"kills": 200000}'::jsonb, '[{"coins": 150000}, {"pill": "tu-van-dan", "n": 10}]'::jsonb),
('moc-q-350000', 9009, '{"kills": 350000}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"gem": "hong-ngoc:5", "n": 1}]'::jsonb),
('moc-q-500000', 9010, '{"kills": 500000}'::jsonb, '[{"coins": 300000}, {"gem": "hong-ngoc:6", "n": 1}]'::jsonb),
('moc-q-750000', 9011, '{"kills": 750000}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"gear": 5, "slot": "thieu"}]'::jsonb),
('moc-q-1000000', 9012, '{"kills": 1000000}'::jsonb, '[{"gear": 6, "slot": "thieu"}, {"coins": 500000}]'::jsonb),
('moc-g-1', 9013, '{"choi": 3600}'::jsonb, '[{"coins": 3000}, {"pill": "hoi-linh-dan", "n": 5}]'::jsonb),
('moc-g-3', 9014, '{"choi": 10800}'::jsonb, '[{"pill": "thang-linh-dan", "n": 1}, {"coins": 5000}]'::jsonb),
('moc-g-6', 9015, '{"choi": 21600}'::jsonb, '[{"coins": 10000}, {"gem": "lam-ngoc:2", "n": 1}]'::jsonb),
('moc-g-12', 9016, '{"choi": 43200}'::jsonb, '[{"gear": 2, "slot": "thieu"}, {"pill": "tu-khi-dan", "n": 5}]'::jsonb),
('moc-g-24', 9017, '{"choi": 86400}'::jsonb, '[{"pill": "thang-linh-dan", "n": 2}, {"coins": 20000}]'::jsonb),
('moc-g-48', 9018, '{"choi": 172800}'::jsonb, '[{"gear": 3, "slot": "thieu"}, {"gem": "lam-ngoc:3", "n": 1}]'::jsonb),
('moc-g-100', 9019, '{"choi": 360000}'::jsonb, '[{"coins": 60000}, {"pill": "tu-van-dan", "n": 5}]'::jsonb),
('moc-g-200', 9020, '{"choi": 720000}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"gem": "lam-ngoc:4", "n": 1}]'::jsonb),
('moc-g-300', 9021, '{"choi": 1080000}'::jsonb, '[{"coins": 100000}, {"gem": "lam-ngoc:5", "n": 1}]'::jsonb),
('moc-g-500', 9022, '{"choi": 1800000}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"pill": "tu-van-dan", "n": 10}]'::jsonb),
('moc-g-750', 9023, '{"choi": 2700000}'::jsonb, '[{"coins": 300000}, {"pill": "tu-van-dan", "n": 15}]'::jsonb),
('moc-g-1000', 9024, '{"choi": 3600000}'::jsonb, '[{"gear": 6, "slot": "thieu"}, {"gem": "lam-ngoc:6", "n": 1}]'::jsonb),
('moc-t-1', 9025, '{"trieu": 1}'::jsonb, '[{"coins": 2000}, {"pill": "hoi-xuan-dan", "n": 5}]'::jsonb),
('moc-t-5', 9026, '{"trieu": 5}'::jsonb, '[{"gem": "hoang-ngoc:2", "n": 1}, {"coins": 5000}]'::jsonb),
('moc-t-10', 9027, '{"trieu": 10}'::jsonb, '[{"gear": 2, "slot": "thieu"}, {"coins": 10000}]'::jsonb),
('moc-t-20', 9028, '{"trieu": 20}'::jsonb, '[{"coins": 30000}, {"gem": "hoang-ngoc:3", "n": 1}]'::jsonb),
('moc-t-50', 9029, '{"trieu": 50}'::jsonb, '[{"gear": 3, "slot": "thieu"}, {"gem": "hoang-ngoc:4", "n": 1}]'::jsonb),
('moc-t-100', 9030, '{"trieu": 100}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"coins": 80000}]'::jsonb),
('moc-t-200', 9031, '{"trieu": 200}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"gem": "hoang-ngoc:5", "n": 1}]'::jsonb),
('moc-t-365', 9032, '{"trieu": 365}'::jsonb, '[{"gear": 6, "slot": "thieu"}, {"coins": 300000}]'::jsonb),
('moc-c-1', 9033, '{"realm": 1}'::jsonb, '[{"coins": 5000}, {"pill": "thang-linh-dan", "n": 1}]'::jsonb),
('moc-c-2', 9034, '{"realm": 2}'::jsonb, '[{"gear": 2, "slot": "thieu"}, {"coins": 10000}, {"pill": "thang-linh-dan", "n": 1}]'::jsonb),
('moc-c-3', 9035, '{"realm": 3}'::jsonb, '[{"gem": "luc-ngoc:4", "n": 1}, {"coins": 20000}, {"pill": "thang-linh-dan", "n": 2}]'::jsonb),
('moc-c-4', 9036, '{"realm": 4}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"coins": 50000}, {"pill": "thang-linh-dan", "n": 2}]'::jsonb),
('moc-c-5', 9037, '{"realm": 5}'::jsonb, '[{"gem": "luc-ngoc:5", "n": 1}, {"coins": 80000}, {"pill": "thang-linh-dan", "n": 2}]'::jsonb),
('moc-c-6', 9038, '{"realm": 6}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"coins": 120000}]'::jsonb),
('moc-c-7', 9039, '{"realm": 7}'::jsonb, '[{"gem": "luc-ngoc:6", "n": 1}, {"coins": 200000}]'::jsonb),
('moc-c-8', 9040, '{"realm": 8}'::jsonb, '[{"gear": 6, "slot": "thieu"}, {"coins": 300000}]'::jsonb)
on conflict (id) do update set ord = excluded.ord, dk = excluded.dk, qua = excluded.qua;

create or replace function public.p2d_ht_dk(d jsonb, dk jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_eq jsonb := case when jsonb_typeof(d -> 'equip') = 'object' then d -> 'equip' else '{}'::jsonb end;
  v_bag jsonb := case when jsonb_typeof(d -> 'bag') = 'array' then d -> 'bag' else '[]'::jsonb end;
  v_realm int := coalesce((d ->> 'realm')::int, 0); v_n int;
  v_pb jsonb := case when jsonb_typeof(d -> 'phapBao' -> 'items') = 'array' then d -> 'phapBao' -> 'items' else '[]'::jsonb end;
  v_wear jsonb := case when jsonb_typeof(d -> 'phapBao' -> 'wear') = 'array' then d -> 'phapBao' -> 'wear' else '[]'::jsonb end;
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
  -- Pháp Bảo Luyện Chế (như src/game/he-thong.js missionDone)
  if dk ? 'pb_wear' and (select count(*) from jsonb_array_elements(v_pb) i where exists (select 1 from jsonb_array_elements(v_wear) w where w = i -> 'uid')) < (dk ->> 'pb_wear')::int then return false; end if;
  if dk ? 'pb_mods' and coalesce((select sum((select count(*) from jsonb_array_elements(case when jsonb_typeof(i -> 'mods') = 'array' then i -> 'mods' else '[]'::jsonb end) with ordinality m(v, k)
        where jsonb_typeof(m.v) = 'string' and m.k <= coalesce((i ->> 'slots')::int, 0)))
      from jsonb_array_elements(v_pb) i where exists (select 1 from jsonb_array_elements(v_wear) w where w = i -> 'uid')), 0) < (dk ->> 'pb_mods')::int then return false; end if;
  if dk ? 'pb_lv' and coalesce((select max(coalesce((i ->> 'lv')::int, 0)) from jsonb_array_elements(v_pb) i), 0) < (dk ->> 'pb_lv')::int then return false; end if;
  if dk ? 'pb_slots' and coalesce((select max(coalesce((i ->> 'slots')::int, 0)) from jsonb_array_elements(v_pb) i), 0) < (dk ->> 'pb_slots')::int then return false; end if;
  -- Mốc quà (19/11/2026): số quái trong bản lưu, chặn trên 6 quái mỗi giây chơi (sửa bản lưu không ăn hết mốc); giờ chơi, số lần
  -- triệu hồi do p2d_ht_xong đưa vào từ bảng của máy chủ (_choi, _trieu)
  if dk ? 'kills' and least(case when jsonb_typeof(d -> 'stats' -> 'kills') = 'number' then (d -> 'stats' ->> 'kills')::numeric else 0 end,
      6 * coalesce((d ->> '_choi')::numeric, 0)) < (dk ->> 'kills')::numeric then return false; end if;
  if dk ? 'choi' and coalesce((d ->> '_choi')::numeric, 0) < (dk ->> 'choi')::numeric then return false; end if;
  if dk ? 'trieu' and coalesce((d ->> '_trieu')::numeric, 0) < (dk ->> 'trieu')::numeric then return false; end if;
  return true;
end;
$$;
revoke all on function public.p2d_ht_dk(jsonb, jsonb) from public, anon, authenticated;

create or replace function public.p2d_ht_xong(p_id text, p_chon int)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_ht_nv%rowtype; v_d jsonb; v_row public.p2d_ht_diem%rowtype; v_pt int;
begin
  select * into v_nv from public.p2d_ht_nv where id = p_id;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if p_id = any (v_row.xong) then raise exception 'da_nhan' using errcode = '22023'; end if;
  select data || jsonb_build_object('_choi', choi_giay, '_trieu', v_row.so_lan) into v_d from public.p2d_nhan_vat where user_id = v_uid;
  if v_d is null or not public.p2d_ht_dk(v_d, v_nv.dk) then raise exception 'chua_xong' using errcode = '22023'; end if;
  if v_nv.dk ? 'dap' and p_chon is distinct from (v_nv.dk ->> 'dap')::int then raise exception 'sai' using errcode = '22023'; end if;
  v_pt := ((select v from public.p2d_ht_cfg where k = 'cfg') ->> 'points')::int;
  update public.p2d_ht_diem set diem = diem + v_pt, xong = array_append(xong, p_id), luc = now() where user_id = v_uid returning * into v_row;
  perform public.p2d_ht_thuong(v_uid, v_nv.qua, v_d);
  return jsonb_build_object('diem', v_row.diem, 'xong', to_jsonb(v_row.xong), 'them', v_pt, 'qua', v_nv.qua);
end;
$$;
revoke all on function public.p2d_ht_xong(text, int) from public, anon, authenticated;
