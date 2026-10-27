-- Cường hoá tới +20 (trọng điểm bồi dưỡng, chủ dự án chốt 28/10/2026): máy chủ nhận món có cấp cường hoá 0–20 (trước: 0–10).
-- Hàm giữ nguyên như 20261027140000_p2d_chong_gian_lan.sql, chỉ đổi trần cấp cường hoá. Mở dần theo cảnh giới ở máy khách
-- (data/gear.json → enhance.open). Lực chiến người mạnh nhất vẫn xa trần lực chiến của p2d_luu.

create or replace function public.p2d_mon_hop_le(p_mon jsonb, p_cap integer default 81)
returns boolean
language plpgsql
stable
set search_path = ''
as $$
declare
  v_r   public.p2d_pham%rowtype;
  v_lvl numeric;
  v_e   record;
  v_c   public.p2d_chi_so%rowtype;
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
     or jsonb_array_length(coalesce(p_mon -> 'lines', '[]'::jsonb)) > v_r.dong then
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
    if not found or jsonb_typeof(v_e.value -> 'v') is distinct from 'number' or (v_e.value ->> 'v')::numeric < 0
       or (v_e.value ->> 'v')::numeric > ceil(v_c.dong * (case when v_c.pct then 1 else 1 + v_lvl * 0.08 end) * v_r.mult) + 1 then
      return false;
    end if;
  end loop;
  return true;
end;
$$;
revoke all on function public.p2d_mon_hop_le(jsonb, integer) from public, anon, authenticated;

-- Tự kiểm tra
do $kt$
declare v_hong text := ''; m jsonb := '{"uid": 1, "base": "thiet-kiem", "rarity": "pham", "lvl": 10, "main": {}, "lines": [], "plus": 20}';
begin
  if not public.p2d_mon_hop_le(m) then v_hong := v_hong || ' | +20 bị từ chối'; end if;
  if public.p2d_mon_hop_le(jsonb_set(m, '{plus}', '21')) then v_hong := v_hong || ' | +21 lọt'; end if;
  if public.p2d_mon_hop_le(jsonb_set(m, '{plus}', '-1')) then v_hong := v_hong || ' | âm lọt'; end if;
  if v_hong <> '' then raise exception 'Tự kiểm tra cường hoá +20 TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra cường hoá +20: đạt hết';
end
$kt$;
