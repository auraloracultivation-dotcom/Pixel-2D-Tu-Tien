-- Chống gian lận đợt 2 (chủ dự án xin 28/10/2026 tối: "sửa cho đỡ lỗi, làm vài quy tắc"; "có người dùng GameGuardian,
-- nâng cấp hệ thống chống gian lận"). Ba phần:
--
-- 1. Bớt bắt nhầm người chơi thật
--    - Tháp: cho leo 2 tầng + 1 tầng mỗi 2,5 giây giữa hai lần lưu (cũ: 1 tầng + 1 tầng mỗi 5 giây, người leo nhanh
--      bị ghi cờ liên tục). Vượt thì chỉ cắt về mức cho phép; ghi cờ khi vượt quá 10 tầng.
--    - Linh khí: thùng hạn mức tính theo tầng đang tu: đầy ít nhất 1 tầng mỗi phút, chứa tối đa 10 tầng (hoặc 500.000).
--      Vượt thùng thì nhận phần trong thùng (không quay về số cũ). Cờ chỉ ghi khi lố hơn một tầng.
--    - Bỏ chặn "cảnh giới nhảy quá 1 bậc" trong p2d_luu: máy khách lệch với máy chủ vẫn lưu được, thùng linh khí lo phần còn lại.
--    - Số nghi_van (đủ 10 thì ẩn khỏi bảng xếp hạng) chỉ cộng tối đa 1 lần mỗi 10 phút; từng lần vẫn ghi đủ vào p2d_nghi_van.
--      'do_da_rao' (đồ vừa rao bán còn trong túi do lưu chậm) không còn tính là cờ.
--
-- 2. Trả số đúng về máy khách (chặn sửa bộ nhớ kiểu GameGuardian)
--    p2d_luu2 = p2d_luu + trả về {pb, sua}. "sua" có khi số gửi lên lố quá xa (linh khí vượt hơn 2 thùng, Linh Thạch hoặc
--    nguyên liệu vượt hơn 2 thùng, tháp vượt hơn 10 tầng): máy khách nhận lại số của máy chủ (src/game/server-fix.js).
--    p2d_luu giữ nguyên kiểu trả về cho bản game cũ còn trong máy người chơi.
--
-- 3. Dấu hiệu công cụ gian lận
--    - Tăng tốc (speed hack): bản lưu gửi kèm ss (mã phiên) và clk (đồng hồ máy, mili giây). Cùng phiên, sau từ 30 giây,
--      đồng hồ máy chạy nhanh hơn 1,5 lần giờ máy chủ (+5 giây) thì ghi cờ 'tang_toc'.
--    - Sửa bộ nhớ: máy khách có bẫy số (src/core/guard.js), bắt được thì tăng data.ac; máy chủ thấy ac tăng thì ghi cờ
--      'sua_bo_nho', và không cho ac giảm.

alter table public.p2d_nhan_vat
  add column if not exists dh_ss  text,          -- mã phiên lúc đặt mốc đồng hồ
  add column if not exists dh_clk numeric,       -- đồng hồ máy khách lúc đặt mốc (ms)
  add column if not exists dh_luc timestamptz;   -- giờ máy chủ lúc đặt mốc

-- Còn được cộng nghi_van không: chưa có cờ nào trong 10 phút qua ('do_da_rao' chỉ là đồ vừa rao còn trong túi, không tính)
create or replace function public.p2d_co_moi(p_uid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select not exists (select 1 from public.p2d_nghi_van where user_id = p_uid and luc > now() - interval '10 minutes' and ly_do <> 'do_da_rao') $$;
revoke all on function public.p2d_co_moi(uuid) from public, anon, authenticated;

-- Linh khí cần cho tầng thứ n (0 = cảnh giới 0 tầng 1); dùng p2d_tong_lk nên luôn khớp data/realms.json
create or replace function public.p2d_lk_can(p_n integer)
returns numeric language sql immutable set search_path = ''
as $$ select public.p2d_tong_lk(0, p_n + 2, 0) - public.p2d_tong_lk(0, p_n + 1, 0) $$;
revoke all on function public.p2d_lk_can(integer) from public, anon, authenticated;

-- Từ (r, l, q) tu thêm p_them linh khí, không vượt tầng (r2, l2): trả về {realm, layer, qi}
create or replace function public.p2d_lk_tien(p_r integer, p_l integer, p_q numeric, p_them numeric, p_r2 integer, p_l2 integer)
returns jsonb language plpgsql immutable set search_path = ''
as $$
declare
  n  integer := greatest(0, p_r) * 9 + greatest(1, p_l) - 1;
  n2 integer := greatest(0, p_r2) * 9 + greatest(1, p_l2) - 1;
  q  numeric := greatest(coalesce(p_q, 0), 0) + greatest(coalesce(p_them, 0), 0);
  c  numeric;
begin
  loop
    c := public.p2d_lk_can(n);
    exit when n >= n2 or q < c;
    q := q - c; n := n + 1;
  end loop;
  return jsonb_build_object('realm', n / 9, 'layer', n % 9 + 1, 'qi', floor(least(q, c)));
end;
$$;
revoke all on function public.p2d_lk_tien(integer, integer, numeric, numeric, integer, integer) from public, anon, authenticated;

-- ===================== Hạn mức linh khí (trigger) =====================
create or replace function public.p2d_kiem_linh_khi()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_r     integer := coalesce((old.data ->> 'realm')::integer, old.canh_gioi);
  v_l     integer := coalesce((old.data ->> 'layer')::integer, old.tang);
  v_can   numeric := public.p2d_lk_can(greatest(v_r, 0) * 9 + greatest(v_l, 1) - 1);   -- linh khí của tầng đang tu
  v_toc   numeric := greatest(60 * power(1.6, greatest(v_r, 0)), v_can / 60);              -- mỗi giây: ít nhất 1 tầng mỗi phút
  v_tran  numeric := greatest(500000, v_can * 10);                                         -- dồn tối đa 10 tầng
  v_dt    numeric := least(greatest(extract(epoch from (now() - coalesce(old.qi_luc, old.luu_luc))), 0), 43200);
  v_xo    numeric := least(v_tran, coalesce(old.qi_xo, v_tran) + v_toc * v_dt);
  v_tang  numeric;
  v_den   jsonb;
begin
  if (new.data -> 'realm') is not distinct from (old.data -> 'realm') and (new.data -> 'layer') is not distinct from (old.data -> 'layer')
     and (new.data -> 'qi') is not distinct from (old.data -> 'qi') then
    return new;
  end if;
  v_tang := public.p2d_tong_lk((new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer, (new.data ->> 'qi')::numeric)
          - public.p2d_tong_lk(v_r, v_l, (old.data ->> 'qi')::numeric);
  new.qi_luc := now();
  if v_tang <= v_xo then
    new.qi_xo := v_xo - greatest(v_tang, 0);
    return new;
  end if;
  -- vượt thùng: nhận phần trong thùng
  v_den := public.p2d_lk_tien(v_r, v_l, (old.data ->> 'qi')::numeric, v_xo, (new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer);
  new.data := jsonb_set(jsonb_set(jsonb_set(new.data, '{realm}', v_den -> 'realm'), '{layer}', v_den -> 'layer'), '{qi}', v_den -> 'qi');
  new.canh_gioi := (v_den ->> 'realm')::integer; new.tang := (v_den ->> 'layer')::integer;
  new.qi_xo := 0;
  if v_tang > v_xo + v_tran then perform set_config('p2d.sua_lk', '1', true); end if;   -- lố quá xa: trả số về máy khách
  if v_tang - v_xo > v_can then
    if public.p2d_co_moi(new.user_id) then new.nghi_van := new.nghi_van + 1; end if;
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
    values (new.user_id, 'linh_khi', jsonb_build_object('tang', round(v_tang), 'xo', round(v_xo), 'giay', round(v_dt), 'canh_gioi', v_r, 'den', v_den));
  end if;
  return new;
end;
$$;
revoke all on function public.p2d_kiem_linh_khi() from public, anon, authenticated;

-- ===================== Lưu nhân vật =====================
create or replace function public.p2d_luu(p_data jsonb, p_phien_ban integer)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid()); v_cu public.p2d_nhan_vat%rowtype; v_moi boolean; v_data jsonb := p_data;
  v_canh_gioi integer; v_tang integer; v_tui integer; v_dt numeric; v_toc numeric; v_xo numeric; v_xo_nl numeric; v_tran numeric;
  v_lt_cu numeric; v_lt_moi numeric; v_tang_nl numeric; v_tile numeric; v_luc numeric; v_tran_luc numeric; v_thap numeric; v_thap_tran numeric;
  v_bo jsonb; v_bag jsonb; v_thien integer; v_dia integer; v_sai integer; v_ly_do text[] := '{}'; v_pb integer;
  v_sua jsonb := '{}'; v_ss text; v_clk numeric; v_that numeric; v_dh boolean := true; v_ac numeric; v_ac_cu numeric; v_tinh boolean;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if octet_length(p_data::text) > 200000 then raise exception 'du_lieu_qua_lon' using errcode = '22023'; end if;
  if jsonb_typeof(p_data -> 'realm') is distinct from 'number' or jsonb_typeof(p_data -> 'layer') is distinct from 'number'
     or jsonb_typeof(p_data -> 'qi') is distinct from 'number' or jsonb_typeof(p_data -> 'step') is distinct from 'number' then
    raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  v_canh_gioi := (p_data ->> 'realm')::integer; v_tang := (p_data ->> 'layer')::integer;
  if v_canh_gioi not between 0 and 8 or v_tang not between 1 and 9 or (p_data ->> 'qi')::numeric < 0 then raise exception 'canh_gioi_sai' using errcode = '22023'; end if;
  if p_data ? 'lingshi' and p_data -> 'lingshi' <> 'null'::jsonb and jsonb_typeof(p_data -> 'lingshi') <> 'number' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  v_lt_moi := coalesce(case when jsonb_typeof(p_data -> 'lingshi') = 'number' then (p_data ->> 'lingshi')::numeric end, 0);
  if v_lt_moi < 0 or v_lt_moi > 2000000000 then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if p_data ? 'mats' and jsonb_typeof(p_data -> 'mats') <> 'object' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_each(coalesce(p_data -> 'mats', '{}'::jsonb)) e where jsonb_typeof(e.value) <> 'number' or e.value::numeric < 0 or e.value::numeric > 10000000) then
    raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  if p_data ? 'bag' and jsonb_typeof(p_data -> 'bag') <> 'array' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  v_tui := coalesce(jsonb_array_length(p_data -> 'bag'), 0);
  if v_tui > 40 then raise exception 'tui_qua_day' using errcode = '22023'; end if;
  if exists (select 1 from jsonb_array_elements(coalesce(p_data -> 'bag', '[]'::jsonb)) it
             where jsonb_typeof(it) <> 'object' or jsonb_typeof(it -> 'uid') is distinct from 'number' or coalesce(it ->> 'rarity', '') not in ('pham', 'linh', 'huyen', 'dia', 'thien')) then
    raise exception 'do_sai' using errcode = '22023'; end if;
  v_ss := case when jsonb_typeof(p_data -> 'ss') = 'string' then left(p_data ->> 'ss', 40) end;
  v_clk := case when jsonb_typeof(p_data -> 'clk') = 'number' then (p_data ->> 'clk')::numeric end;
  select * into v_cu from public.p2d_nhan_vat where user_id = v_uid for update;
  v_moi := not found;
  if v_moi then
    if v_canh_gioi > 0 or v_tang > 3 then raise exception 'canh_gioi_sai' using errcode = '22023'; end if;
    v_cu.data := '{}'::jsonb; v_cu.canh_gioi := 0; v_cu.tang := 1; v_cu.thap := 0; v_cu.phien_ban := 0; v_cu.nghi_van := 0;
    v_cu.lt_xo := 2000; v_cu.nl_xo := 300; v_cu.luu_luc := now(); v_cu.tien_ngoc := 0; v_cu.tn_qua := false; v_cu.the_den := null; v_cu.the_nhan := null;
  else
    if p_phien_ban is distinct from v_cu.phien_ban then raise exception 'phien_ban_cu' using errcode = 'P0001'; end if;
    -- cảnh giới lệch nhiều bậc: không chặn nữa, trigger p2d_kiem_linh_khi cho tiến theo thùng hạn mức
  end if;
  v_dt := least(greatest(extract(epoch from (now() - v_cu.luu_luc)), 0), 43200);
  -- Linh Thạch
  v_toc := 40 * power(2.2, v_cu.canh_gioi);
  v_tran := 20000 + v_toc * 1800;
  v_xo := least(v_tran, v_cu.lt_xo + v_toc * v_dt);
  v_lt_cu := coalesce(case when jsonb_typeof(v_cu.data -> 'lingshi') = 'number' then (v_cu.data ->> 'lingshi')::numeric end, 0);
  if v_lt_moi - v_lt_cu > v_xo then
    if v_lt_moi - v_lt_cu > v_xo + v_tran then v_sua := v_sua || jsonb_build_object('lingshi', v_lt_cu + floor(v_xo)); end if;
    v_lt_moi := v_lt_cu + floor(v_xo); v_data := jsonb_set(v_data, '{lingshi}', to_jsonb(v_lt_moi)); v_ly_do := array_append(v_ly_do, 'linh_thach'); v_xo := 0;
  elsif v_lt_moi > v_lt_cu then v_xo := v_xo - (v_lt_moi - v_lt_cu); end if;
  -- Nguyên liệu
  v_toc := 2 + v_cu.canh_gioi;
  v_tran := 500 + v_toc * 1800;
  v_xo_nl := least(v_tran, v_cu.nl_xo + v_toc * v_dt);
  select coalesce(sum(greatest(n.value::numeric - coalesce(o.value::numeric, 0), 0)), 0) into v_tang_nl
    from jsonb_each(coalesce(v_data -> 'mats', '{}'::jsonb)) n left join jsonb_each(coalesce(v_cu.data -> 'mats', '{}'::jsonb)) o on o.key = n.key and jsonb_typeof(o.value) = 'number';
  if v_tang_nl > v_xo_nl then
    v_tile := v_xo_nl / v_tang_nl;
    v_data := jsonb_set(v_data, '{mats}', coalesce((
      select jsonb_object_agg(n.key, case when n.value::numeric > coalesce(o.value::numeric, 0)
             then to_jsonb(coalesce(o.value::numeric, 0) + floor((n.value::numeric - coalesce(o.value::numeric, 0)) * v_tile)) else n.value end)
        from jsonb_each(v_data -> 'mats') n left join jsonb_each(coalesce(v_cu.data -> 'mats', '{}'::jsonb)) o on o.key = n.key and jsonb_typeof(o.value) = 'number'), '{}'::jsonb));
    if v_tang_nl > v_xo_nl + v_tran then v_sua := v_sua || jsonb_build_object('mats', v_data -> 'mats'); end if;
    v_ly_do := array_append(v_ly_do, 'nguyen_lieu'); v_xo_nl := 0;
  else v_xo_nl := v_xo_nl - v_tang_nl; end if;
  -- Đồ đang rao trên chợ không được còn trong túi
  select coalesce(jsonb_agg(c.mon -> 'uid'), '[]'::jsonb) into v_bo from public.p2d_cho c where c.nguoi_ban = v_uid and c.loai = 'mon';
  if jsonb_array_length(v_bo) > 0 then
    select coalesce(jsonb_agg(it), '[]'::jsonb) into v_bag from jsonb_array_elements(coalesce(v_data -> 'bag', '[]'::jsonb)) it where not (v_bo @> jsonb_build_array(it -> 'uid'));
    if jsonb_array_length(v_bag) < v_tui then v_data := jsonb_set(v_data, '{bag}', v_bag); v_ly_do := array_append(v_ly_do, 'do_da_rao'); end if;
  end if;
  if coalesce(case when jsonb_typeof(v_data -> 'nextUid') = 'number' then (v_data ->> 'nextUid')::numeric end, 0)
     < coalesce(case when jsonb_typeof(v_cu.data -> 'nextUid') = 'number' then (v_cu.data ->> 'nextUid')::numeric end, 0) then
    v_data := jsonb_set(v_data, '{nextUid}', v_cu.data -> 'nextUid'); end if;
  select count(*) filter (where n ->> 'rarity' = 'thien'), count(*) filter (where n ->> 'rarity' = 'dia'), count(*) filter (where not public.p2d_mon_hop_le(n))
    into v_thien, v_dia, v_sai from jsonb_array_elements(coalesce(v_data -> 'bag', '[]'::jsonb)) n
   where not exists (select 1 from jsonb_array_elements(coalesce(v_cu.data -> 'bag', '[]'::jsonb)) o where o -> 'uid' = n -> 'uid');
  if v_thien > 2 + v_dt / 600 or v_dia > 4 + v_dt / 120 then v_ly_do := array_append(v_ly_do, 'do_hiem'); end if;
  if v_sai > 0 then v_ly_do := array_append(v_ly_do, 'do_sai_chi_so'); end if;
  -- Lực chiến
  v_tran_luc := 6000 * power(1.6, v_canh_gioi);
  v_luc := least(greatest(coalesce(case when jsonb_typeof(p_data -> 'power') = 'number' then (p_data ->> 'power')::numeric end, 0), 0), 100000000);
  if v_luc > v_tran_luc then v_luc := v_tran_luc; v_ly_do := array_append(v_ly_do, 'luc_chien'); end if;
  -- Tháp: 2 tầng + 1 tầng mỗi 2,5 giây; vượt hơn 10 tầng mới là cờ và trả số về
  v_thap := least(greatest(coalesce(case when jsonb_typeof(p_data -> 'tower' -> 'best') = 'number' then (p_data -> 'tower' ->> 'best')::numeric end, 0), 0), 100000);
  v_thap_tran := v_cu.thap + 2 + floor(v_dt / 2.5);
  if v_thap > v_thap_tran then
    if v_thap > v_thap_tran + 10 then v_ly_do := array_append(v_ly_do, 'thap'); v_sua := v_sua || jsonb_build_object('best', v_thap_tran); end if;
    v_thap := v_thap_tran;
  end if;
  -- Đồng hồ máy khách (tăng tốc)
  if v_ss is not null and v_clk is not null and v_ss = v_cu.dh_ss and v_clk >= v_cu.dh_clk and v_cu.dh_luc is not null then
    v_that := extract(epoch from (now() - v_cu.dh_luc));
    if v_that < 30 then v_dh := false;
    elsif (v_clk - v_cu.dh_clk) / 1000 > v_that * 1.5 + 5 then v_ly_do := array_append(v_ly_do, 'tang_toc'); end if;
  end if;
  -- Bẫy sửa bộ nhớ ở máy khách
  v_ac := coalesce(case when jsonb_typeof(p_data -> 'ac') = 'number' then (p_data ->> 'ac')::numeric end, 0);
  v_ac_cu := coalesce(case when jsonb_typeof(v_cu.data -> 'ac') = 'number' then (v_cu.data ->> 'ac')::numeric end, 0);
  if v_ac > v_ac_cu then v_ly_do := array_append(v_ly_do, 'sua_bo_nho'); end if;
  v_data := jsonb_set(v_data, '{ac}', to_jsonb(greatest(v_ac, v_ac_cu)));
  -- Tiên Ngọc, thẻ tháng: máy chủ giữ
  v_data := (v_data - 'tn' - 'tnStarter' - 'card') || jsonb_build_object('tn', v_cu.tien_ngoc, 'tnStarter', v_cu.tn_qua)
            || case when v_cu.the_den is not null then jsonb_build_object('card', jsonb_build_object('until', floor(extract(epoch from v_cu.the_den) * 1000), 'last', coalesce(v_cu.the_nhan, ''))) else '{}'::jsonb end;
  v_tinh := coalesce(array_length(array_remove(v_ly_do, 'do_da_rao'), 1), 0) > 0 and public.p2d_co_moi(v_uid);   -- đồ vừa rao còn trong túi: ghi lại, không tính cờ
  if array_length(v_ly_do, 1) > 0 then
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (v_uid, array_to_string(v_ly_do, ','), jsonb_build_object('giay', round(v_dt), 'lingshi', p_data -> 'lingshi', 'power', p_data -> 'power', 'thap', p_data -> 'tower' -> 'best', 'canh_gioi', v_canh_gioi,
      'dong_ho', case when v_that is not null then jsonb_build_object('may', round((v_clk - v_cu.dh_clk) / 1000), 'chu', round(v_that)) end, 'ac', v_ac));
  end if;
  if v_sua <> '{}'::jsonb then perform set_config('p2d.sua', v_sua::text, true); end if;
  if v_moi then
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luc_chien, thap, lt_xo, nl_xo, luu_luc, nghi_van, dh_ss, dh_clk, dh_luc)
    values (v_uid, v_data, v_canh_gioi, v_tang, 1, v_luc::integer, v_thap::integer, v_xo, v_xo_nl, now(), case when v_tinh then 1 else 0 end, v_ss, v_clk, now());
    return 1;
  end if;
  update public.p2d_nhan_vat set data = v_data, canh_gioi = v_canh_gioi, tang = v_tang, luc_chien = v_luc::integer, thap = v_thap::integer,
         lt_xo = v_xo, nl_xo = v_xo_nl, luu_luc = now(), nghi_van = nghi_van + case when v_tinh then 1 else 0 end,
         dh_ss = case when v_dh then v_ss else dh_ss end, dh_clk = case when v_dh then v_clk else dh_clk end, dh_luc = case when v_dh then now() else dh_luc end,
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  return v_pb;
end;
$$;

-- Lưu và trả về số máy chủ sửa lại (nếu có) để máy khách nhận lại
create or replace function public.p2d_luu2(p_data jsonb, p_phien_ban integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_pb integer; v_sua jsonb; v_nv public.p2d_nhan_vat%rowtype;
begin
  perform set_config('p2d.sua', '', true);
  perform set_config('p2d.sua_lk', '', true);
  v_pb := public.p2d_luu(p_data, p_phien_ban);
  v_sua := coalesce(nullif(current_setting('p2d.sua', true), '')::jsonb, '{}'::jsonb);
  if coalesce(current_setting('p2d.sua_lk', true), '') = '1' then
    select * into v_nv from public.p2d_nhan_vat where user_id = (select auth.uid());
    v_sua := v_sua || jsonb_build_object('realm', v_nv.data -> 'realm', 'layer', v_nv.data -> 'layer', 'qi', v_nv.data -> 'qi');
  end if;
  return jsonb_build_object('pb', v_pb) || case when v_sua <> '{}'::jsonb then jsonb_build_object('sua', v_sua) else '{}'::jsonb end;
end;
$$;
revoke all on function public.p2d_luu2(jsonb, integer) from public, anon;
grant execute on function public.p2d_luu2(jsonb, integer) to authenticated;
