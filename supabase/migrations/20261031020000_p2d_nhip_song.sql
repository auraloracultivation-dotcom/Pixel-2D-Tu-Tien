-- Game online (chủ dự án 31/10/2026, chọn 10 giây): máy khách gửi nhịp sống mỗi 5 giây; mất liên lạc quá 10 giây thì game
-- đứng lại (src/game/net-watch.js). Máy chủ chỉ cộng hạn mức Linh Thạch, nguyên liệu, độ hiếm, tháp cho thời gian còn liên lạc:
-- trước đây p2d_luu cho dồn tới 12 giờ kể từ lần lưu trước, nên chơi lén ngoài mạng (kể cả dùng công cụ tăng tốc) rồi lưu một cục
-- vẫn được nhận. Bế quan khi vắng mặt (linh khí, data/config.json → offline) giữ nguyên: trigger p2d_kiem_linh_khi không đổi.
-- Kiểm tra tăng tốc (v_that, đồng hồ máy khách) không đổi.

create table if not exists public.p2d_nhip (
  user_id uuid primary key references auth.users (id) on delete cascade,
  luc     timestamptz not null default now(),   -- lần liên lạc gần nhất (nhịp sống hoặc lần lưu)
  giay    numeric not null default 0             -- số giây còn liên lạc dồn từ lần lưu trước
);
alter table public.p2d_nhip enable row level security;
revoke all on public.p2d_nhip from anon, authenticated;

-- Nhịp sống: cộng khoảng cách tới lần liên lạc trước nếu không quá 15 giây. Gọi dồn dập cũng chỉ cộng đúng giờ thật.
-- p2d_uid() chặn tài khoản bị cấm (máy khách mất nhịp, về màn đăng nhập).
create or replace function public.p2d_nhip_song()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
begin
  insert into public.p2d_nhip as n (user_id, luc, giay) values (v_uid, now(), 0)
  on conflict (user_id) do update
    set giay = least(n.giay + case when now() - n.luc <= interval '15 seconds' then extract(epoch from (now() - n.luc)) else 0 end, 43200),
        luc = now();
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.p2d_nhip_song() from public, anon;
grant execute on function public.p2d_nhip_song() to authenticated;

-- Lần lưu lấy số giây còn liên lạc từ lần lưu trước (p_tu) rồi đặt lại. Chưa có dòng nhịp: coi lần lưu trước là lần liên lạc cuối.
-- Chỉ p2d_luu gọi (không cấp cho máy khách).
create or replace function public.p2d_nhip_dung(p_uid uuid, p_tu timestamptz)
returns numeric
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_n  public.p2d_nhip%rowtype;
  v_gap numeric;
  v_on numeric;
begin
  select * into v_n from public.p2d_nhip where user_id = p_uid for update;
  v_gap := extract(epoch from (now() - greatest(coalesce(v_n.luc, p_tu), coalesce(p_tu, v_n.luc, now()))));
  v_on := coalesce(v_n.giay, 0) + case when v_gap between 0 and 15 then v_gap else 0 end;
  insert into public.p2d_nhip (user_id, luc, giay) values (p_uid, now(), 0)
  on conflict (user_id) do update set luc = now(), giay = 0;
  return greatest(v_on, 0);
end;
$$;
revoke all on function public.p2d_nhip_dung(uuid, timestamptz) from public, anon, authenticated;

create or replace function public.p2d_luu(p_data jsonb, p_phien_ban integer)
returns integer language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid()); v_cu public.p2d_nhan_vat%rowtype; v_moi boolean; v_data jsonb := p_data;
  v_canh_gioi integer; v_tang integer; v_tui integer; v_dt numeric; v_toc numeric; v_xo numeric; v_xo_nl numeric; v_tran numeric;
  v_lt_cu numeric; v_lt_moi numeric; v_tang_nl numeric; v_tile numeric; v_luc numeric; v_tran_luc numeric; v_thap numeric; v_thap_tran numeric;
  v_bo jsonb; v_bag jsonb; v_thien integer; v_dia integer; v_sai integer; v_ly_do text[] := '{}'; v_pb integer;
  v_sua jsonb := '{}'; v_ss text; v_clk numeric; v_that numeric; v_dh boolean := true; v_ac numeric; v_ac_cu numeric; v_tinh boolean;
  v_tao timestamptz; v_nang boolean := false; v_on numeric;
  v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_dem jsonb; v_cat boolean := false; v_t record;
  v_cu_so numeric; v_moi_so numeric; v_g numeric; v_c numeric; v_a1 numeric; v_c2 numeric; v_nhan numeric; v_can_giay numeric;
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
    -- tài khoản mới: cảnh giới, tầng của lần lưu đầu phải với tới được trong thời gian từ lúc tạo tài khoản (tốc độ trần p2d_kiem_linh_khi)
    select created_at into v_tao from auth.users where id = v_uid;
    select coalesce(sum(public.p2d_lk_can(g) / greatest(90 * power(1.6, least(g / 9, 4)), public.p2d_lk_can(g) / 150)), 0) into v_can_giay
      from generate_series(0, v_canh_gioi * 9 + v_tang - 2) g;
    if v_can_giay > extract(epoch from (now() - coalesce(v_tao, now()))) + 300 then raise exception 'canh_gioi_sai' using errcode = '22023'; end if;
    v_cu.data := '{}'::jsonb; v_cu.canh_gioi := 0; v_cu.tang := 1; v_cu.thap := 0; v_cu.phien_ban := 0; v_cu.nghi_van := 0;
    v_cu.lt_xo := 2000; v_cu.nl_xo := 300; v_cu.luu_luc := greatest(coalesce(v_tao, now()), now() - interval '12 hours'); v_cu.tien_ngoc := 0; v_cu.tn_qua := false; v_cu.the_den := null; v_cu.the_nhan := null;
  else
    if p_phien_ban is distinct from v_cu.phien_ban then raise exception 'phien_ban_cu' using errcode = 'P0001'; end if;
    -- cảnh giới lệch nhiều bậc: không chặn nữa, trigger p2d_kiem_linh_khi cho tiến theo thùng hạn mức
  end if;
  v_dt := least(greatest(extract(epoch from (now() - v_cu.luu_luc)), 0), 43200);
  -- Chỉ tính thời gian còn liên lạc với máy chủ (chủ dự án 31/10/2026: game online): giây có nhịp sống
  -- (p2d_nhip_song mỗi 5 giây, hoặc lần lưu) cách nhau không quá 15 giây; thêm 5 giây cho độ trễ mạng.
  v_on := public.p2d_nhip_dung(v_uid, v_cu.luu_luc);
  if not v_moi then v_dt := least(v_dt, v_on + 5); end if;
  -- Linh Thạch
  v_toc := 6 * power(1.6, v_cu.canh_gioi);   -- cày thật đỉnh: 0,5/giây (Luyện Khí) tới ~36/giây (Độ Kiếp)
  v_tran := 20000 + v_toc * 3600;
  v_xo := least(v_tran, v_cu.lt_xo + v_toc * v_dt);
  v_lt_cu := coalesce(case when jsonb_typeof(v_cu.data -> 'lingshi') = 'number' then (v_cu.data ->> 'lingshi')::numeric end, 0);
  if v_lt_moi - v_lt_cu > v_xo then
    if v_lt_moi - v_lt_cu > v_xo + v_tran then v_nang := true; v_ly_do := array_append(v_ly_do, 'day_cuc'); end if;
    v_sua := v_sua || jsonb_build_object('lingshi', v_lt_cu + floor(v_xo));   -- luôn bắt máy khách trừ phần lố, không nhận dần
    v_lt_moi := v_lt_cu + floor(v_xo); v_data := jsonb_set(v_data, '{lingshi}', to_jsonb(v_lt_moi)); v_ly_do := array_append(v_ly_do, 'linh_thach'); v_xo := 0;
  elsif v_lt_moi > v_lt_cu then v_xo := v_xo - (v_lt_moi - v_lt_cu); end if;
  -- Nguyên liệu
  v_toc := 1.5 + v_cu.canh_gioi * 0.75;   -- cày thật đỉnh ~1,7/giây
  v_tran := 500 + v_toc * 3600;
  v_xo_nl := least(v_tran, v_cu.nl_xo + v_toc * v_dt);
  select coalesce(sum(greatest(n.value::numeric - coalesce(o.value::numeric, 0), 0)), 0) into v_tang_nl
    from jsonb_each(coalesce(v_data -> 'mats', '{}'::jsonb)) n left join jsonb_each(coalesce(v_cu.data -> 'mats', '{}'::jsonb)) o on o.key = n.key and jsonb_typeof(o.value) = 'number';
  if v_tang_nl > v_xo_nl then
    v_tile := v_xo_nl / v_tang_nl;
    v_data := jsonb_set(v_data, '{mats}', coalesce((
      select jsonb_object_agg(n.key, case when n.value::numeric > coalesce(o.value::numeric, 0)
             then to_jsonb(coalesce(o.value::numeric, 0) + floor((n.value::numeric - coalesce(o.value::numeric, 0)) * v_tile)) else n.value end)
        from jsonb_each(v_data -> 'mats') n left join jsonb_each(coalesce(v_cu.data -> 'mats', '{}'::jsonb)) o on o.key = n.key and jsonb_typeof(o.value) = 'number'), '{}'::jsonb));
    if v_tang_nl > v_xo_nl + v_tran then v_nang := true; v_ly_do := array_append(v_ly_do, 'day_cuc'); end if;
    v_sua := v_sua || jsonb_build_object('mats', v_data -> 'mats');   -- luôn bắt máy khách trừ phần lố, không nhận dần
    v_ly_do := array_append(v_ly_do, 'nguyen_lieu'); v_xo_nl := 0;
  else v_xo_nl := v_xo_nl - v_tang_nl; end if;
  -- Trần mỗi ngày từng loại (bảng p2d_tran_ngay; chủ dự án 30/10/2026 chọn "trần mềm rồi cứng"): phần nhận trong ngày dưới trần
  -- thì nhận đủ; quá trần thì chỉ nhận 20%; nhận tới 1,2 × trần (tức đã nhặt gấp đôi trần) thì dừng hẳn tới 0h giờ Việt Nam.
  -- Đếm phần tăng thực nhận (sau thùng hạn mức), số lẻ của 20% giữ trong sổ đếm p2d_nhan_vat.dem để không mất.
  v_dem := case when v_cu.dem_ngay = v_ngay then coalesce(v_cu.dem, '{}'::jsonb) else '{}'::jsonb end;
  for v_t in select t.loai, t.tran * case when t.nhan_canh_gioi then power(1.6, v_cu.canh_gioi) else 1 end as tran from public.p2d_tran_ngay t loop
    if v_t.loai = 'lingshi' then v_cu_so := v_lt_cu; v_moi_so := v_lt_moi;
    else
      v_cu_so := coalesce(case when jsonb_typeof(v_cu.data -> 'mats' -> v_t.loai) = 'number' then (v_cu.data -> 'mats' ->> v_t.loai)::numeric end, 0);
      v_moi_so := coalesce(case when jsonb_typeof(v_data -> 'mats' -> v_t.loai) = 'number' then (v_data -> 'mats' ->> v_t.loai)::numeric end, 0);
    end if;
    v_g := v_moi_so - v_cu_so;
    continue when v_g <= 0;
    v_c := coalesce(case when jsonb_typeof(v_dem -> v_t.loai) = 'number' then (v_dem ->> v_t.loai)::numeric end, 0);
    v_a1 := least(v_g, greatest(v_t.tran - v_c, 0));
    v_c2 := greatest(v_c, least(v_c + v_a1 + (v_g - v_a1) * 0.2, v_t.tran * 1.2));
    v_nhan := least(v_g, floor(v_c2) - floor(v_c));
    v_dem := v_dem || jsonb_build_object(v_t.loai, round(v_c2, 2));
    if v_nhan < v_g then
      v_cat := true;
      if v_t.loai = 'lingshi' then v_lt_moi := v_lt_cu + v_nhan; v_data := jsonb_set(v_data, '{lingshi}', to_jsonb(v_lt_moi));
      else v_data := jsonb_set(v_data, array['mats', v_t.loai], to_jsonb(v_cu_so + v_nhan)); end if;
    end if;
  end loop;
  if v_cat then v_sua := v_sua || jsonb_build_object('tran', true, 'mats', coalesce(v_data -> 'mats', '{}'::jsonb), 'lingshi', v_lt_moi); end if;
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
  if v_moi then v_nang := false; end if;   -- lần lưu đầu của tài khoản mới: không cộng điểm nặng
  -- cùng lý do trong 60 giây đã ghi rồi thì thôi ghi lại (đỡ phình bảng)
  if array_length(v_ly_do, 1) > 0 and not exists (select 1 from public.p2d_nghi_van x where x.user_id = v_uid and x.luc > now() - interval '60 seconds' and x.ly_do = array_to_string(v_ly_do, ',')) then
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (v_uid, array_to_string(v_ly_do, ','), jsonb_build_object('giay', round(v_dt), 'lingshi', p_data -> 'lingshi', 'power', p_data -> 'power', 'thap', p_data -> 'tower' -> 'best', 'canh_gioi', v_canh_gioi,
      'dong_ho', case when v_that is not null then jsonb_build_object('may', round((v_clk - v_cu.dh_clk) / 1000), 'chu', round(v_that)) end, 'ac', v_ac));
  end if;
  if v_sua <> '{}'::jsonb then perform set_config('p2d.sua', v_sua::text, true); end if;
  if v_moi then
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luc_chien, thap, lt_xo, nl_xo, luu_luc, nghi_van, dh_ss, dh_clk, dh_luc, dem_ngay, dem)
    values (v_uid, v_data, v_canh_gioi, v_tang, 1, v_luc::integer, v_thap::integer, v_xo, v_xo_nl, now(), case when v_tinh then 1 else 0 end + case when v_nang then 3 else 0 end, v_ss, v_clk, now(), v_ngay, v_dem);
    return 1;
  end if;
  update public.p2d_nhan_vat set data = v_data, canh_gioi = v_canh_gioi, tang = v_tang, luc_chien = v_luc::integer, thap = v_thap::integer,
         lt_xo = v_xo, nl_xo = v_xo_nl, luu_luc = now(), dem_ngay = v_ngay, dem = v_dem, nghi_van = nghi_van + case when v_tinh then 1 else 0 end + case when v_nang then 3 else 0 end,
         dh_ss = case when v_dh then v_ss else dh_ss end, dh_clk = case when v_dh then v_clk else dh_clk end, dh_luc = case when v_dh then now() else dh_luc end,
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  return v_pb;
end;
$$;

revoke all on function public.p2d_luu(jsonb, integer) from public, anon;
grant execute on function public.p2d_luu(jsonb, integer) to authenticated;
