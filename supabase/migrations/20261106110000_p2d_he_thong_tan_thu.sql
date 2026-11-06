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

-- Quà từng nhiệm vụ, nhiệm vụ ngày (chủ dự án 06/11/2026 18:03)
alter table public.p2d_ht_nv add column if not exists qua jsonb not null default '[]'::jsonb;
alter table public.p2d_ht_diem add column if not exists ngay date;
alter table public.p2d_ht_diem add column if not exists ngay_xong text[] not null default '{}';

insert into public.p2d_ht_cfg (k, v) values ('cfg', '{"bases": {"thiet-kiem": {"slot": "vu-khi", "main": {"atk": 4}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "speed"]}, "thanh-van-kiem": {"slot": "vu-khi", "main": {"atk": 5}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "qi_gain"]}, "bo-y": {"slot": "giap", "main": {"hp": 20}, "pool": ["hp", "hp_pct", "def", "speed", "cdr", "qi_gain"]}, "huyen-giap": {"slot": "giap", "main": {"def": 2}, "pool": ["hp", "hp_pct", "def", "crit", "atk"]}, "ngoc-boi-tho": {"slot": "ngoc-boi", "main": {"crit": 2}, "pool": ["atk_pct", "hp_pct", "crit", "crit_dmg", "qi_gain", "cdr"]}, "linh-phu": {"slot": "ngoc-boi", "main": {"qi_gain": 5}, "pool": ["qi_gain", "cdr", "speed", "hp", "atk"]}, "thiet-thuong": {"slot": "vu-khi", "main": {"atk": 5}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "speed", "hp"]}, "ba-tieu-phien": {"slot": "vu-khi", "main": {"atk": 3}, "pool": ["atk", "atk_pct", "cdr", "qi_gain", "crit", "hp_pct"]}, "moc-cam": {"slot": "vu-khi", "main": {"atk": 3}, "pool": ["atk_pct", "cdr", "qi_gain", "crit", "hp", "def"]}, "tu-nguyet-liem": {"slot": "vu-khi", "main": {"atk": 5}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "speed"]}, "truc-cung": {"slot": "vu-khi", "main": {"atk": 4}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "speed", "cdr"]}, "thien-mach-kiem": {"slot": "vu-khi", "main": {"atk": 7}, "pool": ["atk", "atk_pct", "crit", "crit_dmg", "cdr", "qi_gain"]}, "bo-hai": {"slot": "giay", "main": {"speed": 3}, "pool": ["speed", "hp", "def", "cdr", "qi_gain"]}, "van-van-ngoa": {"slot": "giay", "main": {"speed": 4}, "pool": ["speed", "crit", "atk", "hp_pct", "cdr"]}, "bo-can": {"slot": "mu", "main": {"hp": 15}, "pool": ["hp", "def", "cdr", "qi_gain", "crit"]}, "thiet-khoi": {"slot": "mu", "main": {"def": 2}, "pool": ["def", "hp", "hp_pct", "crit", "atk"]}, "thiet-gioi": {"slot": "nhan", "main": {"crit": 2}, "pool": ["crit", "crit_dmg", "atk", "atk_pct", "def"]}, "linh-ngoc-gioi": {"slot": "nhan", "main": {"crit_dmg": 10}, "pool": ["crit", "crit_dmg", "qi_gain", "hp_pct", "cdr"]}, "kim-luan": {"slot": "phap-bao", "main": {"atk": 3}, "pool": ["atk", "atk_pct", "cdr", "crit"]}, "tran-yeu-thap": {"slot": "phap-bao", "main": {"hp": 30}, "pool": ["hp", "hp_pct", "def", "cdr"]}, "hoa-hon-linh": {"slot": "phap-bao", "main": {"atk_pct": 4}, "pool": ["atk_pct", "crit_dmg", "cdr", "qi_gain"]}}, "stats": {"atk": {"min": 2, "max": 6, "pct": false}, "atk_pct": {"min": 3, "max": 8, "pct": true}, "hp": {"min": 10, "max": 30, "pct": false}, "hp_pct": {"min": 4, "max": 10, "pct": true}, "def": {"min": 1, "max": 4, "pct": false}, "crit": {"min": 2, "max": 5, "pct": true}, "crit_dmg": {"min": 8, "max": 20, "pct": true}, "cdr": {"min": 2, "max": 6, "pct": true}, "speed": {"min": 2, "max": 5, "pct": true}, "qi_gain": {"min": 4, "max": 10, "pct": true}}, "rar": {"pham": {"mult": 1.0, "sockets": 0}, "linh": {"mult": 1.2, "sockets": 1}, "huyen": {"mult": 1.45, "sockets": 1}, "dia": {"mult": 1.75, "sockets": 2}, "thien": {"mult": 2.1, "sockets": 3}}, "tiers": [1.0, 1.3, 1.7, 2.2, 2.8, 3.6, 4.6], "tier_rar": ["pham", "linh", "huyen", "dia", "thien", "thien", "thien"], "cap_w": [8, 12, 14, 15, 14, 12, 10, 7, 5, 3], "main_per_lvl": 0.12, "line_per_lvl": 0.08, "els": ["moc", "hoa", "thuy", "kim", "tho"], "gems": ["hong-ngoc", "lam-ngoc", "hoang-ngoc", "luc-ngoc"], "pool": [{"id": "lt-5k", "w": 30, "coins": 5000}, {"id": "lt-20k", "w": 18, "coins": 20000}, {"id": "lt-100k", "w": 6, "coins": 100000}, {"id": "lt-500k", "w": 1, "coins": 500000}, {"id": "ngoc-1-2", "w": 14, "gem": [1, 2], "n": 1}, {"id": "ngoc-3-4", "w": 6, "gem": [3, 4], "n": 1}, {"id": "ngoc-5-6", "w": 1.5, "gem": [5, 6], "n": 1}, {"id": "ngoc-7-8", "w": 0.3, "gem": [7, 8], "n": 1}, {"id": "tay-2", "w": 10, "mat": "tay-luyen-thach", "n": 2}, {"id": "tay-5", "w": 3, "mat": "tay-luyen-thach", "n": 5}, {"id": "do-luc-lam", "w": 6, "gear": [0, 1]}, {"id": "do-tim-cam", "w": 3, "gear": [2, 3]}, {"id": "do-vang", "w": 0.8, "gear": [4]}, {"id": "do-tien", "w": 0.3, "gear": [5]}, {"id": "do-thuong-co", "w": 0.1, "gear": [6]}], "cost": 100, "points": 25, "mail": "Quà triệu hồi hệ thống", "quest_mail": "Thưởng nhiệm vụ hệ thống", "daily": {"giet-quai": 30, "giet-moc-linh": 10, "giet-hoa-lang": 12, "giet-ma-binh": 5, "cau-ca": 5, "di-chung": 1, "da-toa": 60, "luyen-dan": 2, "ren-do": 1, "linh-dien": 1, "tran-giu": 10, "phan-giai": 3, "bi-canh": 1, "giet-tuyet-lang": 12, "bang-quat": 1, "giet-phong-yeu": 12, "hac-phong-dong": 1, "giet-moc-yeu": 12, "re-mau-thu": 1, "co-thu-tam": 1, "giet-kim-giap": 12, "kiem-trung": 1, "giet-tho-khoi": 12, "dia-cung": 1, "giet-hu-khong": 12, "hu-khong-lao": 1, "vet-nut": 1}, "per_day": 5}'::jsonb) on conflict (k) do update set v = excluded.v;

insert into public.p2d_ht_nv (id, ord, dk, qua) values
('hoi-xuyen-khong', 0, '{"dap": 0}'::jsonb, '[{"coins": 3000}, {"pill": "hoi-xuan-dan", "n": 10}]'::jsonb),
('truyen-1', 1, '{"step": 1}'::jsonb, '[{"coins": 2000}, {"gem": "hong-ngoc:1", "n": 2}]'::jsonb),
('hoi-linh-can', 2, '{"step": 1, "dap": 0}'::jsonb, '[{"mat": "tinh-thiet", "n": 6}]'::jsonb),
('truyen-2', 3, '{"step": 2}'::jsonb, '[{"gear": 0, "slot": "thieu"}, {"gear": 0, "slot": "thieu"}]'::jsonb),
('mac-4', 4, '{"equip": 4}'::jsonb, '[{"coins": 2000}, {"mat": "tinh-thiet", "n": 4}]'::jsonb),
('hoi-cuong-hoa', 5, '{"step": 2, "dap": 0}'::jsonb, '[{"coins": 2000}]'::jsonb),
('truyen-3', 6, '{"step": 3}'::jsonb, '[{"pill": "hoi-linh-dan", "n": 5}, {"coins": 2000}]'::jsonb),
('hoi-tu-danh', 7, '{"step": 2, "dap": 0}'::jsonb, '[{"coins": 2000}, {"pill": "hoi-xuan-dan", "n": 5}]'::jsonb),
('cuong-hoa-3', 8, '{"plus": 3}'::jsonb, '[{"gem": "lam-ngoc:1", "n": 1}, {"gear": 1, "slot": "thieu"}]'::jsonb),
('hoi-kham', 9, '{"step": 2, "dap": 0}'::jsonb, '[{"gem": "hong-ngoc:1", "n": 1}]'::jsonb),
('kham-1', 10, '{"socket": 1}'::jsonb, '[{"pill": "tu-khi-dan", "n": 5}, {"coins": 2000}]'::jsonb),
('truyen-4', 11, '{"step": 4}'::jsonb, '[{"coins": 3000}, {"mat": "tinh-thiet", "n": 6}]'::jsonb),
('hoi-mau', 12, '{"step": 3, "dap": 0}'::jsonb, '[{"pill": "hoi-xuan-dan", "n": 10}]'::jsonb),
('truyen-5', 13, '{"step": 5}'::jsonb, '[{"coins": 3000}, {"gear": 0, "slot": "thieu"}]'::jsonb),
('hoi-len-tang', 14, '{"step": 4, "dap": 0}'::jsonb, '[{"pill": "tu-khi-dan", "n": 5}, {"pill": "thang-linh-dan", "n": 1}]'::jsonb),
('truyen-6', 15, '{"step": 6}'::jsonb, '[{"coins": 3000}, {"pill": "tu-khi-dan", "n": 5}]'::jsonb),
('luyen-khi-5', 16, '{"realm": 0, "layer": 5}'::jsonb, '[{"mat": "tinh-thiet", "n": 8}, {"coins": 3000}]'::jsonb),
('hoi-bi-canh', 17, '{"step": 5, "dap": 0}'::jsonb, '[{"gear": 1, "slot": "thieu"}]'::jsonb),
('truyen-7', 18, '{"step": 7}'::jsonb, '[{"pill": "hoi-xuan-dan", "n": 5}, {"coins": 3000}]'::jsonb),
('truyen-8', 19, '{"step": 8}'::jsonb, '[{"gear": 1, "slot": "thieu"}, {"mat": "tinh-thiet", "n": 8}]'::jsonb),
('truyen-9', 20, '{"step": 9}'::jsonb, '[{"coins": 5000}]'::jsonb),
('truyen-10', 21, '{"step": 10}'::jsonb, '[{"gear": 2, "slot": "thieu"}, {"coins": 10000}, {"gem": "hong-ngoc:2", "n": 1}]'::jsonb),
('hoi-pham', 22, '{"step": 10, "dap": 0}'::jsonb, '[{"mat": "tay-luyen-thach", "n": 3}]'::jsonb),
('hoi-tay-luyen', 23, '{"step": 10, "dap": 0}'::jsonb, '[{"mat": "tay-luyen-thach", "n": 3}]'::jsonb),
('cong-phap-2', 24, '{"techs": 2}'::jsonb, '[{"coins": 5000}, {"pill": "tu-khi-dan", "n": 5}]'::jsonb),
('hoi-linh-thu', 25, '{"step": 10, "dap": 0}'::jsonb, '[{"coins": 3000}]'::jsonb),
('hoi-khien', 26, '{"step": 10, "dap": 0}'::jsonb, '[{"coins": 5000}]'::jsonb),
('linh-thu-1', 27, '{"pets": 1}'::jsonb, '[{"coins": 5000}, {"pill": "tu-khi-dan", "n": 3}]'::jsonb),
('thu-cuoi-1', 28, '{"mounts": 1}'::jsonb, '[{"coins": 5000}, {"gear": 1, "slot": "thieu"}]'::jsonb),
('mac-7', 29, '{"equip": 7}'::jsonb, '[{"mat": "tinh-thiet", "n": 15}, {"mat": "tay-luyen-thach", "n": 2}]'::jsonb),
('cuong-hoa-6', 30, '{"plus": 6}'::jsonb, '[{"gear": 3, "slot": "thieu"}, {"gem": "lam-ngoc:2", "n": 2}, {"gem": "hong-ngoc:2", "n": 1}]'::jsonb),
('kham-4', 31, '{"socket": 4}'::jsonb, '[{"pill": "tu-khi-dan", "n": 10}, {"coins": 8000}]'::jsonb),
('hoi-boss', 32, '{"realm": 1, "dap": 0}'::jsonb, '[{"mat": "tinh-thiet", "n": 10}]'::jsonb),
('hoi-dot-pha', 33, '{"realm": 0, "layer": 5, "dap": 0}'::jsonb, '[{"pill": "tu-khi-dan", "n": 10}, {"pill": "thang-linh-dan", "n": 2}]'::jsonb),
('truc-co', 34, '{"realm": 1}'::jsonb, '[{"gear": 2, "slot": "thieu"}, {"coins": 10000}, {"mat": "tinh-thiet", "n": 15}]'::jsonb),
('cong-phap-5', 35, '{"techs": 5}'::jsonb, '[{"coins": 10000}, {"mat": "tay-luyen-thach", "n": 3}]'::jsonb),
('kim-dan', 36, '{"realm": 2}'::jsonb, '[{"gear": 3, "slot": "thieu"}, {"gear": 3, "slot": "thieu"}, {"pill": "tu-van-dan", "n": 5}, {"mat": "tinh-thiet", "n": 30}]'::jsonb),
('cuong-hoa-10', 37, '{"plus": 10}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"mat": "tay-luyen-thach", "n": 5}]'::jsonb),
('canh-gioi-3', 38, '{"realm": 3}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"pill": "tu-van-dan", "n": 5}, {"coins": 20000}]'::jsonb),
('canh-gioi-4', 39, '{"realm": 4}'::jsonb, '[{"gear": 4, "slot": "thieu"}, {"pill": "tu-van-dan", "n": 8}, {"coins": 30000}]'::jsonb),
('canh-gioi-5', 40, '{"realm": 5}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"coins": 50000}]'::jsonb),
('canh-gioi-6', 41, '{"realm": 6}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"coins": 80000}]'::jsonb),
('canh-gioi-7', 42, '{"realm": 7}'::jsonb, '[{"gear": 5, "slot": "thieu"}, {"gear": 5, "slot": "thieu"}, {"coins": 100000}]'::jsonb),
('canh-gioi-8', 43, '{"realm": 8}'::jsonb, '[{"gear": 6, "slot": "thieu"}, {"coins": 200000}]'::jsonb)
on conflict (id) do update set ord = excluded.ord, dk = excluded.dk, qua = excluded.qua;

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
as $$ select coalesce((select jsonb_build_object('diem', diem, 'xong', to_jsonb(xong), 'so_lan', so_lan,
    'ngay_xong', case when ngay = (now() at time zone 'Asia/Ho_Chi_Minh')::date then to_jsonb(ngay_xong) else '[]'::jsonb end)
  from public.p2d_ht_diem where user_id = public.p2d_uid()),
  jsonb_build_object('diem', 0, 'xong', '[]'::jsonb, 'so_lan', 0, 'ngay_xong', '[]'::jsonb)) $$;
revoke all on function public.p2d_ht_trang_thai() from public, anon;
grant execute on function public.p2d_ht_trang_thai() to authenticated;

-- Quà một nhiệm vụ vào Hòm thư: coins | mat+n | gem+n | pill+n | gear bậc màu (slot 'thieu': ô ký chủ chưa mặc)
create or replace function public.p2d_ht_thuong(p_uid uuid, p_qua jsonb, p_d jsonb)
returns void
language plpgsql
volatile
set search_path = ''
as $$
declare c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); e jsonb; v_nd jsonb; v_it jsonb; v_lvl int; v_eq text[];
begin
  select greatest(0, coalesce(canh_gioi, 0) * 9 + coalesce(tang, 1) - 1) into v_lvl from public.p2d_nhan_vat where user_id = p_uid;
  select coalesce(array_agg(k), '{}') into v_eq from jsonb_object_keys(case when jsonb_typeof(p_d -> 'equip') = 'object' then p_d -> 'equip' else '{}'::jsonb end) k;
  for e in select * from jsonb_array_elements(coalesce(p_qua, '[]'::jsonb)) loop
    v_nd := case
      when e ? 'coins' then jsonb_build_object('coins', (e ->> 'coins')::int)
      when e ? 'mat' then jsonb_build_object('mat', jsonb_build_object('id', e ->> 'mat', 'n', (e ->> 'n')::int))
      when e ? 'gem' then jsonb_build_object('gem', jsonb_build_object('key', e ->> 'gem', 'n', (e ->> 'n')::int))
      when e ? 'pill' then jsonb_build_object('pill', jsonb_build_object('id', e ->> 'pill', 'n', (e ->> 'n')::int))
      else null end;
    if e ? 'gear' then
      v_it := public.p2d_ht_do_o((e ->> 'gear')::int, coalesce(v_lvl, 0), case when e ->> 'slot' = 'thieu' then v_eq else '{}' end);
      v_eq := v_eq || (v_it ->> 'slot');   -- hai món cùng lần: món sau chọn ô khác
      v_nd := jsonb_build_object('item', v_it - 'slot');
    end if;
    if v_nd is not null then
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (p_uid, v_nd || jsonb_build_object('tieu_de', c ->> 'quest_mail'), 'he_thong_nv');
    end if;
  end loop;
end;
$$;
revoke all on function public.p2d_ht_thuong(uuid, jsonb, jsonb) from public, anon, authenticated;

-- Trang bị bậc p_t, tránh các ô p_bo (đủ hết ô thì chọn bất kỳ). Trả về món kèm khoá slot (bỏ đi trước khi vào thư)
create or replace function public.p2d_ht_do_o(p_t int, p_lvl int, p_bo text[])
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_slot text; v jsonb; i int := 0;
begin
  select s into v_slot from (select distinct b.value ->> 'slot' s from jsonb_each(c -> 'bases') b) x where s <> all (coalesce(p_bo, '{}')) order by random() limit 1;
  loop
    v := public.p2d_ht_do(p_t, p_lvl); i := i + 1;
    exit when v_slot is null or c -> 'bases' -> (v ->> 'base') ->> 'slot' = v_slot or i > 60;
  end loop;
  return v || jsonb_build_object('slot', c -> 'bases' -> (v ->> 'base') ->> 'slot');
end;
$$;
revoke all on function public.p2d_ht_do_o(int, int, text[]) from public, anon, authenticated;

-- Phần chung của nhận nhiệm vụ và trả lời câu hỏi: kiểm, cộng điểm, gửi quà
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
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  if v_d is null or not public.p2d_ht_dk(v_d, v_nv.dk) then raise exception 'chua_xong' using errcode = '22023'; end if;
  if v_nv.dk ? 'dap' and p_chon is distinct from (v_nv.dk ->> 'dap')::int then raise exception 'sai' using errcode = '22023'; end if;
  v_pt := ((select v from public.p2d_ht_cfg where k = 'cfg') ->> 'points')::int;
  update public.p2d_ht_diem set diem = diem + v_pt, xong = array_append(xong, p_id), luc = now() where user_id = v_uid returning * into v_row;
  perform public.p2d_ht_thuong(v_uid, v_nv.qua, v_d);
  return jsonb_build_object('diem', v_row.diem, 'xong', to_jsonb(v_row.xong), 'them', v_pt, 'qua', v_nv.qua);
end;
$$;
revoke all on function public.p2d_ht_xong(text, int) from public, anon, authenticated;

-- Nhận điểm một nhiệm vụ: máy chủ kiểm trên bản lưu trên máy chủ
create or replace function public.p2d_ht_nhan(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.p2d_uid() is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  return public.p2d_ht_xong(p_id, null);
end;
$$;
revoke all on function public.p2d_ht_nhan(text) from public, anon;
grant execute on function public.p2d_ht_nhan(text) to authenticated;

-- Trả lời nhiệm vụ câu hỏi lựa chọn
create or replace function public.p2d_ht_tra_loi(p_id text, p_chon int)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.p2d_uid() is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  return public.p2d_ht_xong(p_id, p_chon);
end;
$$;
revoke all on function public.p2d_ht_tra_loi(text, int) from public, anon;
grant execute on function public.p2d_ht_tra_loi(text, int) to authenticated;

-- Nhiệm vụ ngày: làm hết nhiệm vụ hệ thống rồi, việc ngày p_task trong bản lưu (daily) đã đủ số → cộng điểm.
-- Đếm theo ngày giờ Việt Nam, mỗi việc một lần, mỗi ngày tối đa per_day việc; ngày trong bản lưu lệch quá 1 ngày thì không nhận.
create or replace function public.p2d_ht_ngay(p_task text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype; v_d jsonb;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_day date; v_t jsonb; v_pt int := (c ->> 'points')::int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if not c -> 'daily' ? p_task then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if exists (select 1 from public.p2d_ht_nv n where not (n.id = any (v_row.xong))) then raise exception 'chua_het' using errcode = '22023'; end if;
  if v_row.ngay is distinct from v_today then v_row.ngay_xong := '{}'; end if;
  if p_task = any (v_row.ngay_xong) then raise exception 'da_nhan' using errcode = '22023'; end if;
  if coalesce(array_length(v_row.ngay_xong, 1), 0) >= (c ->> 'per_day')::int then raise exception 'het_luot' using errcode = '22023'; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  begin v_day := to_date(v_d -> 'daily' ->> 'day', 'YYYY-MM-DD'); exception when others then v_day := null; end;
  if v_day is null or abs(v_day - v_today) > 1 then raise exception 'chua_xong' using errcode = '22023'; end if;
  select t into v_t from jsonb_array_elements(case when jsonb_typeof(v_d -> 'daily' -> 'tasks') = 'array' then v_d -> 'daily' -> 'tasks' else '[]'::jsonb end) t where t ->> 'id' = p_task limit 1;
  if v_t is null or coalesce((v_t ->> 'n')::numeric, 0) < (c -> 'daily' ->> p_task)::numeric then raise exception 'chua_xong' using errcode = '22023'; end if;
  update public.p2d_ht_diem set diem = diem + v_pt, ngay = v_today, ngay_xong = array_append(v_row.ngay_xong, p_task), luc = now() where user_id = v_uid returning * into v_row;
  return jsonb_build_object('diem', v_row.diem, 'ngay_xong', to_jsonb(v_row.ngay_xong), 'them', v_pt);
end;
$$;
revoke all on function public.p2d_ht_ngay(text) from public, anon;
grant execute on function public.p2d_ht_ngay(text) to authenticated;

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
