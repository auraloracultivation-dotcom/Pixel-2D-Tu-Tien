-- Quà linh khí của Mốc quà và việc ngày không còn bị bộ hãm linh khí chặn nhầm (chủ dự án 20/11/2026 chọn "Máy chủ cộng quà").
-- Gốc lỗi: máy khách tặng linh khí theo phần trăm linh khí cần của tầng đang tu (đã nhân need_mul, Nguyên Anh × 78), còn bộ hãm
-- p2d_kiem_linh_khi đo theo công thức gốc và hạn mức có trần → người Nguyên Anh nhận Mốc quà (10% tầng) bị trả linh khí về, cắm cờ linh_khi.
-- Cách sửa: lúc máy chủ duyệt nhận mốc / việc ngày, ghi thêm hạn mức qi_thuong đúng bằng phần quà (tính như máy khách, dư 10%),
-- hạn 6 giờ. Bộ hãm cộng hạn mức này ngoài trần, dùng phần nào trừ phần đó. Hack vẫn bị chặn như cũ.
-- Kèm: (1) bị trả về mà vẫn ở tầng cũ thì không cắt linh khí đã tích; (2) Hòm thư nhận quà linh khí {"qi": n} (thư đền bù,
-- máy chủ cộng vào bản lưu kèm hạn mức; máy khách src/game/market.js). Chỉ gửi thư qi SAU khi bản máy khách mới đã lên.
-- Số: data/he-thong.json (moc qua qi_pct, ngay.qi_pct, qi_all), data/realms.json (need_mul, need_layer["0"]).

alter table public.p2d_nhan_vat add column if not exists qi_thuong numeric not null default 0;
alter table public.p2d_nhan_vat add column if not exists qi_thuong_luc timestamptz;

update public.p2d_ht_cfg set v = v || jsonb_build_object('qi', '{"moc":{"moc-c-1":0.1,"moc-c-2":0.1,"moc-c-3":0.1,"moc-c-4":0.1,"moc-c-5":0.1,"moc-c-6":0.1,"moc-c-7":0.1,"moc-c-8":0.1},"ngay":0.0025,"all":0.05,"need_mul":[1,17.4,26.6,78.3,220.5,338.1,518.1,794.1,1245],"need_layer":[40,80,160,320,640,1280,2560,5120,10240]}'::jsonb) where k = 'cfg';

-- Linh khí cần của tầng đang tu, đúng như máy khách (src/game/stats.js qiNeed)
create or replace function public.p2d_lk_can_khach(p_r integer, p_l integer)
returns numeric language sql stable set search_path to '' as $$
  with q as (select v -> 'qi' as c from public.p2d_ht_cfg where k = 'cfg')
  select round(case when greatest(coalesce(p_r, 0), 0) = 0
      then coalesce((c -> 'need_layer' ->> (least(greatest(coalesce(p_l, 1), 1), jsonb_array_length(c -> 'need_layer')) - 1))::numeric, 40)
      else public.p2d_lk_can(greatest(p_r, 0) * 9 + greatest(coalesce(p_l, 1), 1) - 1) end
    * coalesce((c -> 'need_mul' ->> greatest(coalesce(p_r, 0), 0))::numeric, 1))
  from q
$$;

-- Ghi thêm hạn mức quà linh khí (phần trăm của tầng đang tu), dư 10% cho làm tròn và buff
create or replace function public.p2d_qi_thuong(p_uid uuid, p_pct numeric)
returns void language plpgsql security definer set search_path to '' as $$
declare v_d jsonb; v_n numeric;
begin
  if coalesce(p_pct, 0) <= 0 then return; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = p_uid;
  if v_d is null then return; end if;
  v_n := ceil(public.p2d_lk_can_khach((v_d ->> 'realm')::integer, (v_d ->> 'layer')::integer) * p_pct * 1.1);
  update public.p2d_nhan_vat
     set qi_thuong = case when qi_thuong_luc > now() - interval '6 hours' then qi_thuong else 0 end + v_n, qi_thuong_luc = now()
   where user_id = p_uid;
end;
$$;
revoke all on function public.p2d_qi_thuong(uuid, numeric) from public, anon, authenticated;
revoke all on function public.p2d_lk_can_khach(integer, integer) from public, anon;

-- Mốc quà: nguyên văn bản đang chạy + ghi hạn mức linh khí
CREATE OR REPLACE FUNCTION public.p2d_ht_xong(p_id text, p_chon integer)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_ht_nv%rowtype; v_d jsonb; v_row public.p2d_ht_diem%rowtype; v_pt int;
begin
  select * into v_nv from public.p2d_ht_nv where id = p_id;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if p_id = any (v_row.xong) then raise exception 'da_nhan' using errcode = '22023'; end if;
  select data || jsonb_build_object('_choi', public.p2d_choi_giay(user_id), '_trieu', v_row.so_lan) into v_d from public.p2d_nhan_vat where user_id = v_uid;
  if v_d is null or not public.p2d_ht_dk(v_d, v_nv.dk) then raise exception 'chua_xong' using errcode = '22023'; end if;
  if v_nv.dk ? 'dap' and p_chon is distinct from (v_nv.dk ->> 'dap')::int then raise exception 'sai' using errcode = '22023'; end if;
  v_pt := ((select v from public.p2d_ht_cfg where k = 'cfg') ->> 'points')::int;
  update public.p2d_ht_diem set diem = diem + v_pt, xong = array_append(xong, p_id), luc = now() where user_id = v_uid returning * into v_row;
  perform public.p2d_ht_thuong(v_uid, v_nv.qua, v_d);
  perform public.p2d_qi_thuong(v_uid, ((select v from public.p2d_ht_cfg where k = 'cfg') -> 'qi' -> 'moc' ->> p_id)::numeric);
  return jsonb_build_object('diem', v_row.diem, 'xong', to_jsonb(v_row.xong), 'them', v_pt, 'qua', v_nv.qua);
end;
$function$;

-- Việc ngày: nguyên văn bản đang chạy + ghi hạn mức linh khí (mỗi việc qi.ngay, việc cuối của ngày thêm qi.all)
CREATE OR REPLACE FUNCTION public.p2d_ht_ngay(p_task text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype; v_d jsonb;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_day date; v_t jsonb; v_pt int := (c ->> 'points')::int;
  v_can int := (select (v -> 'thu' -> 'cuoi' ->> 'lenh_ngay')::int from public.p2d_ky_cfg where k = 'cfg'); v_them int := 0; v_so int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if not c -> 'daily' ? p_task then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if v_row.ngay is distinct from v_today then v_row.ngay_xong := '{}'; end if;
  if p_task = any (v_row.ngay_xong) then raise exception 'da_nhan' using errcode = '22023'; end if;
  if coalesce(array_length(v_row.ngay_xong, 1), 0) >= (c ->> 'per_day')::int then raise exception 'het_luot' using errcode = '22023'; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  begin v_day := to_date(v_d -> 'daily' ->> 'day', 'YYYY-MM-DD'); exception when others then v_day := null; end;
  if v_day is null or abs(v_day - v_today) > 1 then raise exception 'chua_xong' using errcode = '22023'; end if;
  select t into v_t from jsonb_array_elements(case when jsonb_typeof(v_d -> 'daily' -> 'tasks') = 'array' then v_d -> 'daily' -> 'tasks' else '[]'::jsonb end) t where t ->> 'id' = p_task limit 1;
  if v_t is null or coalesce((v_t ->> 'n')::numeric, 0) < (c -> 'daily' ->> p_task)::numeric then raise exception 'chua_xong' using errcode = '22023'; end if;
  if v_can is not null and coalesce(array_length(v_row.ngay_xong, 1), 0) + 1 = v_can then v_them := 1; end if;
  update public.p2d_ht_diem set diem = diem + v_pt, ngay = v_today, ngay_xong = array_append(v_row.ngay_xong, p_task), thu_lenh = thu_lenh + v_them, luc = now()
   where user_id = v_uid returning * into v_row;
  v_so := jsonb_array_length(case when jsonb_typeof(v_d -> 'daily' -> 'tasks') = 'array' then v_d -> 'daily' -> 'tasks' else '[]'::jsonb end);
  perform public.p2d_qi_thuong(v_uid, coalesce((c -> 'qi' ->> 'ngay')::numeric, 0)
    + case when v_so > 0 and coalesce(array_length(v_row.ngay_xong, 1), 0) >= v_so then coalesce((c -> 'qi' ->> 'all')::numeric, 0) else 0 end);
  return jsonb_build_object('diem', v_row.diem, 'ngay_xong', to_jsonb(v_row.ngay_xong), 'them', v_pt, 'thu_lenh', v_row.thu_lenh, 'thu_lenh_them', v_them);
end;
$function$;

-- Bộ hãm linh khí: nguyên văn bản đang chạy, thêm hạn mức quà (qi_thuong, còn hạn 6 giờ) ngoài trần; dùng phần nào trừ phần đó
CREATE OR REPLACE FUNCTION public.p2d_kiem_linh_khi()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_r     integer := coalesce((old.data ->> 'realm')::integer, old.canh_gioi);
  v_l     integer := coalesce((old.data ->> 'layer')::integer, old.tang);
  v_can   numeric := public.p2d_lk_can(greatest(v_r, 0) * 9 + greatest(v_l, 1) - 1);
  v_toc   numeric := greatest(90 * power(1.6, least(greatest(v_r, 0), 4)), v_can / 150);
  v_tran  numeric := greatest(500000, v_can * 8);
  v_dt    numeric := least(greatest(extract(epoch from (now() - coalesce(old.qi_luc, old.luu_luc))), 0), 43200);
  v_on    numeric := nullif(current_setting('p2d.on', true), '')::numeric;
  v_x2    numeric := 0;
  v_xo    numeric;
  v_tang  numeric;
  v_den   jsonb;
  v_th    numeric := case when old.qi_thuong_luc > now() - interval '6 hours' then greatest(coalesce(old.qi_thuong, 0), 0) else 0 end;
  v_dung  numeric;
begin
  if (new.data -> 'realm') is not distinct from (old.data -> 'realm') and (new.data -> 'layer') is not distinct from (old.data -> 'layer')
     and (new.data -> 'qi') is not distinct from (old.data -> 'qi') then
    return new;
  end if;
  select greatest(0, extract(epoch from (least(now(), d.het_luc) - greatest(coalesce(old.qi_luc, old.luu_luc), d.bat_luc))))
    into v_x2 from public.p2d_dan_x2 d where d.user_id = old.user_id;
  v_x2 := least(coalesce(v_x2, 0), 1800);
  if v_on is not null then
    v_xo := least(v_tran + v_toc * v_x2, coalesce(old.qi_xo, v_tran) + v_toc * least(v_dt, v_on + 5) + 20 * least(greatest(v_dt - v_on - 5, 0), 28800) + v_toc * v_x2);
  else
    v_xo := least(v_tran + v_toc * v_x2, coalesce(old.qi_xo, v_tran) + v_toc * v_dt + v_toc * v_x2);
  end if;
  v_tang := public.p2d_tong_lk((new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer, (new.data ->> 'qi')::numeric)
          - public.p2d_tong_lk(v_r, v_l, (old.data ->> 'qi')::numeric);
  new.qi_luc := now();
  if v_tang <= v_xo + v_th then
    v_dung := least(v_th, greatest(v_tang - v_xo, 0));
    new.qi_thuong := v_th - v_dung;
    new.qi_xo := least(v_tran, v_xo - greatest(v_tang - v_dung, 0));
    return new;
  end if;
  v_xo := v_xo + v_th; new.qi_thuong := 0;
  v_den := public.p2d_lk_tien(v_r, v_l, (old.data ->> 'qi')::numeric, v_xo, (new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer);
  -- p2d_lk_tien cắt linh khí về mức cần theo công thức gốc; máy khách cần nhiều hơn (need_mul) nên người Nguyên Anh bị trả về là mất
  -- sạch linh khí đã tích (lỗi 18–19/11). Còn ở tầng cũ thì giữ linh khí cũ + hạn mức, không cắt.
  if (v_den ->> 'realm')::integer = v_r and (v_den ->> 'layer')::integer = v_l then
    v_den := jsonb_set(v_den, '{qi}', to_jsonb(floor(greatest((v_den ->> 'qi')::numeric, least(
      greatest(coalesce((old.data ->> 'qi')::numeric, 0), 0) + greatest(v_xo, 0),
      case when (new.data ->> 'realm')::integer = v_r and (new.data ->> 'layer')::integer = v_l then greatest(coalesce((new.data ->> 'qi')::numeric, 0), 0)
           else greatest(coalesce((old.data ->> 'qi')::numeric, 0), 0) + greatest(v_xo, 0) end)))));
  end if;
  new.data := jsonb_set(jsonb_set(jsonb_set(new.data, '{realm}', v_den -> 'realm'), '{layer}', v_den -> 'layer'), '{qi}', v_den -> 'qi');
  new.canh_gioi := (v_den ->> 'realm')::integer; new.tang := (v_den ->> 'layer')::integer;
  new.qi_xo := 0;
  if v_tang > v_xo + v_tran then perform set_config('p2d.sua_lk', '1', true); end if;
  if v_tang - v_xo > v_can then
    if public.p2d_co_moi(new.user_id) then new.nghi_van := new.nghi_van + 1; end if;
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
    values (new.user_id, 'linh_khi', jsonb_build_object('tang', round(v_tang), 'xo', round(v_xo), 'giay', round(v_dt), 'lien_lac', round(v_on), 'canh_gioi', v_r, 'den', v_den, 'x2', round(v_x2)));
  end if;
  return new;
end;
$function$;

-- Hòm thư: nguyên văn bản đang chạy + quà linh khí
CREATE OR REPLACE FUNCTION public.p2d_nhan_thu_moi(p_ids bigint[], p_uid_tu bigint DEFAULT NULL::bigint)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_t record; v_next bigint; v_cho integer; v_item jsonb; v_lt numeric; v_ra jsonb := '[]'::jsonb; v_nd jsonb; v_gk text; v_id text; v_tn integer := 0;
  v_qi numeric := 0;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_next := greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'nextUid') = 'number' then (v_nv.data ->> 'nextUid')::bigint end, 1), coalesce(p_uid_tu, 0));
  v_cho := 40 + coalesce(v_nv.tui_mo, 0) - coalesce(jsonb_array_length(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end), 0);
  for v_t in select * from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.id = any (p_ids) order by t.id loop
    v_nd := v_t.noi_dung;
    if v_nd ? 'item' then
      if v_cho <= 0 then continue; end if;
      v_item := public.p2d_ky_dong(((v_nd -> 'item') - 'sig') || jsonb_build_object('uid', v_next));
      v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end, '[]'::jsonb) || jsonb_build_array(v_item));
      v_nd := jsonb_set(v_nd, '{item}', v_item); v_next := v_next + 1; v_cho := v_cho - 1;
    end if;
    if v_nd ? 'coins' and jsonb_typeof(v_nd -> 'coins') = 'number' then
      v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt + (v_nd ->> 'coins')::numeric));
    end if;
    if v_nd ? 'tn' and jsonb_typeof(v_nd -> 'tn') = 'number' and (v_nd ->> 'tn')::numeric between 1 and 1000 and (v_nd ->> 'tn')::numeric = floor((v_nd ->> 'tn')::numeric) then
      v_tn := v_tn + (v_nd ->> 'tn')::integer;
    end if;
    -- linh khí (thư đền bù, chỉ máy chủ gửi được): cộng vào bản lưu, kèm hạn mức để bộ hãm không trả về
    if v_nd ? 'qi' and jsonb_typeof(v_nd -> 'qi') = 'number' and (v_nd ->> 'qi')::numeric > 0 then
      v_qi := v_qi + (v_nd ->> 'qi')::numeric;
      v_nv.data := jsonb_set(v_nv.data, '{qi}', to_jsonb(coalesce(case when jsonb_typeof(v_nv.data -> 'qi') = 'number' then (v_nv.data ->> 'qi')::numeric end, 0) + (v_nd ->> 'qi')::numeric));
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
    if v_tn > 0 then v_nv.data := v_nv.data || jsonb_build_object('tn', coalesce(v_nv.tien_ngoc, 0) + v_tn); end if;
    if v_qi > 0 then
      update public.p2d_nhan_vat set qi_thuong = case when qi_thuong_luc > now() - interval '6 hours' then qi_thuong else 0 end + v_qi, qi_thuong_luc = now() where user_id = v_uid;
    end if;
    perform set_config('p2d.ly_do', 'nhan_thu', true);
    update public.p2d_nhan_vat set data = v_nv.data, tien_ngoc = coalesce(tien_ngoc, 0) + v_tn, phien_ban = phien_ban + 1, updated_at = now()
      where user_id = v_uid returning phien_ban, tien_ngoc into v_nv.phien_ban, v_nv.tien_ngoc;
  end if;
  return jsonb_build_object('thu', v_ra, 'phien_ban', v_nv.phien_ban, 'next_uid', v_next, 'tn', v_nv.tien_ngoc);
end;
$function$;
