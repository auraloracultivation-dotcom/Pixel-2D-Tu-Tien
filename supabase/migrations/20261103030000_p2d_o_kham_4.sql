-- Ô khảm thứ 4 cho phẩm Tiên / Thượng Cổ (chủ dự án 03/11/2026 11:09; máy khách: src/game/socket4.js).
-- p2d_mon_hop_le như 20261102010000_p2d_tay_luyen_moi.sql, chỉ đổi phần đếm lỗ khảm: thêm 1 lỗ khi món có ít nhất một dòng màu
-- Đỏ (t = 5) hoặc Đen (t = 6) (máy khách chỉ mở lỗ khi phẩm trung bình tới Tiên; máy chủ cho rộng hơn một chút cho khỏi lệch).

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
  v_lo   integer;
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
  -- Ô khảm thứ 4 (chủ dự án 03/11/2026 11:09): món phẩm Tiên / Thượng Cổ (màu trung bình các dòng làm tròn >= 5) thêm 1 lỗ.
  -- Đã mở thì giữ (máy khách không lấy lại lỗ khi tẩy thêm dòng thấp làm tụt phẩm): có lỗ thứ lo + 1 là được nếu từng có dòng t >= 5.
  v_lo := v_r.lo + case when exists (select 1 from jsonb_array_elements(coalesce(p_mon -> 'lines', '[]'::jsonb)) l
                                     where jsonb_typeof(l -> 't') = 'number' and (l ->> 't')::numeric >= 5) then 1 else 0 end;
  if p_mon ? 'sockets' and (jsonb_typeof(p_mon -> 'sockets') <> 'array' or jsonb_array_length(p_mon -> 'sockets') > v_lo) then
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
