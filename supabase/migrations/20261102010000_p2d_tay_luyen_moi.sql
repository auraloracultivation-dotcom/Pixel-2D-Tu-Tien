-- Tẩy luyện mới (chủ dự án chốt 02/11/2026; máy khách: src/game/tiers.js, data/items.json → line_tiers):
-- mỗi dòng phụ có màu t (0 lục, 1 lam, 2 tím, 3 cam, 4 vàng, 5 đỏ, 6 đen), tối đa 10 dòng một món, được trùng chỉ số.
-- p2d_mon_hop_le: nhận tới 10 dòng; trần giá trị dòng có t theo hệ số màu (khớp line_tiers.list[].mult), dòng chưa có t
-- vẫn theo hệ số độ hiếm như cũ. Các kiểm tra khác giữ nguyên như 20261028080000_p2d_cuong_hoa_20.sql.

create or replace function public.p2d_mon_hop_le(p_mon jsonb, p_cap integer default 81)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_r    public.p2d_pham%rowtype;
  v_lvl  numeric;
  v_e    record;
  v_c    public.p2d_chi_so%rowtype;
  v_t    numeric;
  v_mul  numeric;
  c_mau  constant numeric[] := array[1.0, 1.3, 1.7, 2.2, 2.8, 3.6, 4.6];
begin
  if p_mon is null or jsonb_typeof(p_mon) <> 'object' or octet_length(p_mon::text) > 3000 then return false; end if;
  select * into v_r from public.p2d_pham where id = p_mon ->> 'rarity';
  if not found then return false; end if;
  if coalesce(p_mon ->> 'base', '') !~ '^[a-z0-9-]{1,40}$' then return false; end if;
  if jsonb_typeof(p_mon -> 'uid') is distinct from 'number' then return false; end if;
  if jsonb_typeof(p_mon -> 'lvl') is distinct from 'number' then return false; end if;
  v_lvl := (p_mon ->> 'lvl')::numeric;
  if v_lvl < 0 or v_lvl > least(p_cap, 81) or v_lvl <> floor(v_lvl) then return false; end if;
  if p_mon ? 'plus' and p_mon -> 'plus' <> 'null'::jsonb
     and (jsonb_typeof(p_mon -> 'plus') <> 'number' or (p_mon ->> 'plus')::numeric not between 0 and 20) then
    return false;
  end if;
  if jsonb_typeof(coalesce(p_mon -> 'main', '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_mon -> 'lines', '[]'::jsonb)) <> 'array'
     or jsonb_array_length(coalesce(p_mon -> 'lines', '[]'::jsonb)) > 10 then
    return false;
  end if;
  if p_mon ? 'sockets' and (jsonb_typeof(p_mon -> 'sockets') <> 'array' or jsonb_array_length(p_mon -> 'sockets') > v_r.lo) then
    return false;
  end if;
  for v_e in select key, value from jsonb_each(coalesce(p_mon -> 'main', '{}'::jsonb)) loop
    select * into v_c from public.p2d_chi_so where stat = v_e.key;
    if not found or jsonb_typeof(v_e.value) <> 'number' or v_e.value::numeric < 0
       or v_e.value::numeric > ceil(v_c.chinh * (case when v_c.pct then 1 else 1 + v_lvl * 0.12 end) * v_r.mult) + 1 then
      return false;
    end if;
  end loop;
  for v_e in select value from jsonb_array_elements(coalesce(p_mon -> 'lines', '[]'::jsonb)) loop
    select * into v_c from public.p2d_chi_so where stat = v_e.value ->> 's';
    if not found or jsonb_typeof(v_e.value -> 'v') is distinct from 'number' or (v_e.value ->> 'v')::numeric < 0 then
      return false;
    end if;
    if v_e.value ? 't' then
      if jsonb_typeof(v_e.value -> 't') <> 'number' then return false; end if;
      v_t := (v_e.value ->> 't')::numeric;
      if v_t < 0 or v_t > 6 or v_t <> floor(v_t) then return false; end if;
      v_mul := c_mau[v_t::int + 1];
    else
      v_mul := v_r.mult;
    end if;
    if (v_e.value ->> 'v')::numeric > ceil(v_c.dong * (case when v_c.pct then 1 else 1 + v_lvl * 0.08 end) * v_mul) + 1 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.p2d_mon_hop_le(jsonb, integer) from public, anon, authenticated;

-- Tự kiểm tra
do $kt$
declare
  v_hong text := '';
  m jsonb := '{"uid": 1, "base": "thiet-kiem", "rarity": "pham", "lvl": 10, "main": {}, "lines": [{"s": "atk", "v": 5}]}';
  den jsonb := '{"s": "atk", "v": 49, "t": 6}';
begin
  if not public.p2d_mon_hop_le(m) then v_hong := v_hong || ' | đồ cũ bị từ chối'; end if;
  if not public.p2d_mon_hop_le(jsonb_set(m, '{lines}', jsonb_build_array(den, den, den, den, den, den, den, den, den, den))) then v_hong := v_hong || ' | 10 dòng đen bị từ chối'; end if;
  if public.p2d_mon_hop_le(jsonb_set(m, '{lines}', jsonb_build_array(den, den, den, den, den, den, den, den, den, den, den))) then v_hong := v_hong || ' | 11 dòng lọt'; end if;
  if public.p2d_mon_hop_le(jsonb_set(m, '{lines}', '[{"s": "atk", "v": 99, "t": 6}]')) then v_hong := v_hong || ' | dòng đen quá trần lọt'; end if;
  if public.p2d_mon_hop_le(jsonb_set(m, '{lines}', '[{"s": "atk", "v": 5, "t": 7}]')) then v_hong := v_hong || ' | màu 7 lọt'; end if;
  if public.p2d_mon_hop_le(jsonb_set(m, '{lines}', '[{"s": "atk", "v": 40}]')) then v_hong := v_hong || ' | dòng cũ quá trần lọt'; end if;
  if v_hong <> '' then raise exception 'Tự kiểm tra tẩy luyện mới TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra tẩy luyện mới: đạt hết';
end
$kt$;
