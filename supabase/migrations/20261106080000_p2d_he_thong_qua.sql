-- Hệ Thống Tu Tiên: điểm nhiệm vụ và triệu hồi quà (chủ dự án 06/11/2026 16:49–17:05: hệ thống thay cốt truyện và nhiệm vụ hằng
-- ngày; mỗi nhiệm vụ điểm như nhau, đủ điểm triệu hồi quà ngẫu nhiên như nhau cho mọi người: Linh Thạch, ngọc cấp 1–8, Tẩy Luyện Thạch,
-- trang bị mọi ô phẩm Lục → Thượng Cổ). Sinh bằng tools/he-thong-sql.py từ data/he-thong.json, data/items.json, data/elements.json.
-- p2d_ht_nhan: máy chủ kiểm điều kiện nhiệm vụ trên bản lưu trên máy chủ rồi cộng điểm (mỗi nhiệm vụ một lần).
-- p2d_ht_trieu: trừ điểm, quay bảng quà trên máy chủ, quà vào Hòm thư (ly_do he_thong_qua).

create table if not exists public.p2d_ht_diem (
  user_id uuid primary key,
  diem integer not null default 0,
  xong text[] not null default '{}',
  so_lan integer not null default 0,
  luc timestamptz not null default now()
);
alter table public.p2d_ht_diem enable row level security;
revoke all on table public.p2d_ht_diem from public, anon, authenticated;

create table if not exists public.p2d_ht_nv (id text primary key, ord integer not null, dk jsonb not null);
alter table public.p2d_ht_nv enable row level security;
revoke all on table public.p2d_ht_nv from public, anon, authenticated;

create table if not exists public.p2d_ht_cfg (k text primary key, v jsonb not null);
alter table public.p2d_ht_cfg enable row level security;
revoke all on table public.p2d_ht_cfg from public, anon, authenticated;

create table if not exists public.p2d_ht_lich_su (
  id bigint generated always as identity primary key,
  user_id uuid not null, qua text not null, noi_dung jsonb not null, luc timestamptz not null default now()
);
create index if not exists p2d_ht_lich_su_user_idx on public.p2d_ht_lich_su (user_id, luc desc);
alter table public.p2d_ht_lich_su enable row level security;
revoke all on table public.p2d_ht_lich_su from public, anon, authenticated;

insert into public.p2d_ht_cfg (k, v) values ('cfg', '{"bases": {"thiet-kiem": {"slot": "vu-khi", "main": {"atk": 4}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "speed"]}, "thanh-van-kiem": {"slot": "vu-khi", "main": {"atk": 5}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "qi_gain"]}, "bo-y": {"slot": "giap", "main": {"hp": 20}, "pool": ["hp", "hp_pct", "def", "speed", "cdr", "qi_gain"]}, "huyen-giap": {"slot": "giap", "main": {"def": 2}, "pool": ["hp", "hp_pct", "def", "crit", "atk"]}, "ngoc-boi-tho": {"slot": "ngoc-boi", "main": {"crit": 2}, "pool": ["atk_pct", "hp_pct", "crit", "crit_dmg", "qi_gain", "cdr"]}, "linh-phu": {"slot": "ngoc-boi", "main": {"qi_gain": 5}, "pool": ["qi_gain", "cdr", "speed", "hp", "atk"]}, "thiet-thuong": {"slot": "vu-khi", "main": {"atk": 5}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "speed", "hp"]}, "ba-tieu-phien": {"slot": "vu-khi", "main": {"atk": 3}, "pool": ["atk", "atk_pct", "cdr", "qi_gain", "crit", "hp_pct"]}, "moc-cam": {"slot": "vu-khi", "main": {"atk": 3}, "pool": ["atk_pct", "cdr", "qi_gain", "crit", "hp", "def"]}, "tu-nguyet-liem": {"slot": "vu-khi", "main": {"atk": 5}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "speed"]}, "truc-cung": {"slot": "vu-khi", "main": {"atk": 4}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "speed", "cdr"]}, "thien-mach-kiem": {"slot": "vu-khi", "main": {"atk": 7}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "qi_gain"]}, "bo-hai": {"slot": "giay", "main": {"speed": 3}, "pool": ["speed", "hp", "def", "cdr", "qi_gain"]}, "van-van-ngoa": {"slot": "giay", "main": {"speed": 4}, "pool": ["speed", "crit", "atk", "hp_pct", "cdr"]}, "bo-can": {"slot": "mu", "main": {"hp": 15}, "pool": ["hp", "def", "cdr", "qi_gain", "crit"]}, "thiet-khoi": {"slot": "mu", "main": {"def": 2}, "pool": ["def", "hp", "hp_pct", "crit", "atk"]}, "thiet-gioi": {"slot": "nhan", "main": {"crit": 2}, "pool": ["crit", "crit_dmg", "atk", "atk_pct", "def"]}, "linh-ngoc-gioi": {"slot": "nhan", "main": {"crit_dmg": 10}, "pool": ["crit", "crit_dmg", "qi_gain", "hp_pct", "cdr"]}, "kim-luan": {"slot": "phap-bao", "main": {"atk": 3}, "pool": ["atk", "atk_pct", "cdr", "crit"]}, "tran-yeu-thap": {"slot": "phap-bao", "main": {"hp": 30}, "pool": ["hp", "hp_pct", "def", "cdr"]}, "hoa-hon-linh": {"slot": "phap-bao", "main": {"atk_pct": 4}, "pool": ["atk_pct", "crit_dmg", "cdr", "qi_gain"]}}, "stats": {"atk": {"min": 2, "max": 6, "pct": false}, "atk_pct": {"min": 3, "max": 8, "pct": true}, "hp": {"min": 10, "max": 30, "pct": false}, "hp_pct": {"min": 4, "max": 10, "pct": true}, "def": {"min": 1, "max": 4, "pct": false}, "crit": {"min": 2, "max": 5, "pct": true}, "crit_dmg": {"min": 8, "max": 20, "pct": true}, "cdr": {"min": 2, "max": 6, "pct": true}, "speed": {"min": 2, "max": 5, "pct": true}, "qi_gain": {"min": 4, "max": 10, "pct": true}}, "rar": {"pham": {"mult": 1.0, "sockets": 0}, "linh": {"mult": 1.2, "sockets": 1}, "huyen": {"mult": 1.45, "sockets": 1}, "dia": {"mult": 1.75, "sockets": 2}, "thien": {"mult": 2.1, "sockets": 3}}, "tiers": [1.0, 1.3, 1.7, 2.2, 2.8, 3.6, 4.6], "tier_rar": ["pham", "linh", "huyen", "dia", "thien", "thien", "thien"], "cap_w": [8, 12, 14, 15, 14, 12, 10, 7, 5, 3], "main_per_lvl": 0.12, "line_per_lvl": 0.08, "els": ["moc", "hoa", "thuy", "kim", "tho"], "gems": ["hong-ngoc", "lam-ngoc", "hoang-ngoc", "luc-ngoc"], "pool": [{"id": "lt-5k", "w": 30, "coins": 5000}, {"id": "lt-20k", "w": 18, "coins": 20000}, {"id": "lt-100k", "w": 6, "coins": 100000}, {"id": "lt-500k", "w": 1, "coins": 500000}, {"id": "ngoc-1-2", "w": 14, "gem": [1, 2], "n": 1}, {"id": "ngoc-3-4", "w": 6, "gem": [3, 4], "n": 1}, {"id": "ngoc-5-6", "w": 1.5, "gem": [5, 6], "n": 1}, {"id": "ngoc-7-8", "w": 0.3, "gem": [7, 8], "n": 1}, {"id": "tay-2", "w": 10, "mat": "tay-luyen-thach", "n": 2}, {"id": "tay-5", "w": 3, "mat": "tay-luyen-thach", "n": 5}, {"id": "do-luc-lam", "w": 6, "gear": [0, 1]}, {"id": "do-tim-cam", "w": 3, "gear": [2, 3]}, {"id": "do-vang", "w": 0.8, "gear": [4]}, {"id": "do-tien", "w": 0.3, "gear": [5]}, {"id": "do-thuong-co", "w": 0.1, "gear": [6]}], "cost": 100, "points": 25, "mail": "Quà triệu hồi hệ thống"}'::jsonb) on conflict (k) do update set v = excluded.v;

insert into public.p2d_ht_nv (id, ord, dk) values
('truyen-1', 0, '{"step": 1}'::jsonb),
('truyen-2', 1, '{"step": 2}'::jsonb),
('truyen-3', 2, '{"step": 3}'::jsonb),
('truyen-4', 3, '{"step": 4}'::jsonb),
('truyen-5', 4, '{"step": 5}'::jsonb),
('truyen-6', 5, '{"step": 6}'::jsonb),
('truyen-7', 6, '{"step": 7}'::jsonb),
('truyen-8', 7, '{"step": 8}'::jsonb),
('truyen-9', 8, '{"step": 9}'::jsonb),
('truyen-10', 9, '{"step": 10}'::jsonb),
('mac-4', 10, '{"equip": 4}'::jsonb),
('cong-phap-2', 11, '{"techs": 2}'::jsonb),
('luyen-khi-5', 12, '{"realm": 0, "layer": 5}'::jsonb),
('cuong-hoa-3', 13, '{"plus": 3}'::jsonb),
('kham-1', 14, '{"socket": 1}'::jsonb),
('linh-thu-1', 15, '{"pets": 1}'::jsonb),
('thu-cuoi-1', 16, '{"mounts": 1}'::jsonb),
('mac-7', 17, '{"equip": 7}'::jsonb),
('truc-co', 18, '{"realm": 1}'::jsonb),
('cuong-hoa-6', 19, '{"plus": 6}'::jsonb),
('kham-4', 20, '{"socket": 4}'::jsonb),
('cong-phap-5', 21, '{"techs": 5}'::jsonb),
('kim-dan', 22, '{"realm": 2}'::jsonb),
('cuong-hoa-10', 23, '{"plus": 10}'::jsonb),
('canh-gioi-3', 24, '{"realm": 3}'::jsonb),
('canh-gioi-4', 25, '{"realm": 4}'::jsonb),
('canh-gioi-5', 26, '{"realm": 5}'::jsonb),
('canh-gioi-6', 27, '{"realm": 6}'::jsonb),
('canh-gioi-7', 28, '{"realm": 7}'::jsonb),
('canh-gioi-8', 29, '{"realm": 8}'::jsonb)
on conflict (id) do update set ord = excluded.ord, dk = excluded.dk;

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
