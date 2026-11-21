-- Hóa ma (chủ dự án 22/11/2026 01:54; bảng câu hỏi 02:0x: "Điểm = số lần phải chết"; "Người diệt ma thì ma mất 1% linh thạch và 1% tu vi, ma diệt người
-- thì người mất 2% linh thạch nhưng k mất tu vi, nếu tu vi k đủ thì sẽ tụt rank nhưng lần sau tăng lại sẽ k đc thêm điểm tiềm năng nữa vì đã từng cộng
-- ở rank đó"; "Che dưới Luyện Khí tầng 5"; "Ma nhân 1 ngày giới hạn số lượt đồ sát người, khoảng 10 người"; 02:04 "người số 11 thì sẽ không còn nhận được
-- linh thạch nữa"). Luật đầy đủ ở data/pvp.json → _ma. Máy chủ phòng Cloudflare làm trọng tài (cloud/src/ma.js), Supabase giữ điểm và tính mất mát:
-- 1) p2d_ky_cfg dòng 'ma' (node tools/ky-cfg.mjs ma; tools/check.mjs so với data/). can: linh khí cần 81 tầng đúng như máy khách (src/game/stats.js qiNeed).
-- 2) p2d_ma_hoa: điểm ma hiện tại (= số lần còn phải chết; bảng xếp hạng Ma hóa), công đức (bảng xếp hạng Công đức), các số đếm. p2d_ma_tran: nhật ký
--    sự kiện (chống gửi trùng; một cặp quá nghi_cap lần mỗi ngày thì ghi p2d_nghi_van 'ma_cap' để soát, không chặn, không cộng điểm nghi vấn).
-- 3) p2d_ma_ghi: lõi Mang ký bằng khoá cf_mang như p2d_pvp_ghi. 'hoa': người đủ tầng, chưa là ma → điểm diem.hoa. 'giet': ma hạ người không phải ma, đủ
--    tầng → + diem.giet; lt_ngay lượt đầu mỗi ngày (giờ Việt Nam) ghi nợ 'ma_giet', từ lượt sau không ai mất gì. 'diet': người không phải ma, đủ tầng, hạ ma
--    → ma − diem.chet, người diệt + 1 công đức, ghi nợ 'ma_diet'. Máy chủ phòng lệch (tưởng là ma mà ở đây không) thì không đổi gì, trả điểm thật để phòng sửa.
-- 4) p2d_pvp_tra: 'ma_giet' mất mat.nguoi_lt Linh Thạch (Hòm thư của ma, lý do ma_ha), không mất tu vi; 'ma_diet' mất mat.ma_lt Linh Thạch (Hòm thư người
--    diệt, lý do ma_diet) và mat.ma_tu_vi tu vi = phần đó của thanh linh khí tầng đang ở; linh khí không đủ thì tụt một tầng (có thể tụt cảnh giới), linh khí
--    = thanh tầng dưới trừ phần còn thiếu. Lần trừ này do máy chủ làm nên bộ hãm linh khí bỏ qua (p2d.lk_tru): thanh của máy khách lớn hơn công thức gốc
--    p2d_lk_can nhiều, tụt tầng sẽ bị bộ hãm đọc nhầm thành tăng linh khí, cắt và cắm cờ oan.
-- 5) p2d_nhan_vat.canh_max: cảnh giới cao nhất từng đạt (trigger p2d_kiem_tiem_kn giữ). Điểm tiềm năng tính theo canh_max: tụt cảnh giới không mất điểm đã
--    có, lên lại không được thêm; data.tiem.max báo về máy khách (src/game/tiem-nang.js diemCo).
-- 6) p2d_bxh2_het thêm 'ma' (điểm ma hiện tại > 0), 'cong_duc'.
-- Áp TRƯỚC khi gộp: máy chủ phòng mới (tự lên khi gộp main) gọi p2d_ma_ghi; máy khách mới đọc nợ 'ma_*' và data.tiem.max.

insert into public.p2d_ky_cfg (k, v) values ('ma', '{"diem":{"hoa":1,"giet":3,"chet":1},"mat":{"ma_lt":0.01,"ma_tu_vi":0.01,"nguoi_lt":0.02},"lt_ngay":10,"nghi_cap":5,"min_tl":4,"tang":9,"can":[40,80,160,320,640,1280,2560,5120,10240,7381,9595,12473,16215,21080,27404,35625,46313,60207,119653,155548,202213,262877,341740,444262,577540,750802,976043,3735014,3847065,3962477,4081351,4203791,4329905,4459802,4593596,4731404,13723792,14135506,14559571,14996358,15446249,15909636,16386925,16878533,17384889,27456534,28280230,29128637,30002496,30902571,31829648,32784538,33768074,34781116,54897070,56543982,58240301,59987510,61787136,63640750,65549972,67516471,69541965,109785703,113079275,116471653,119965802,123564776,127271720,131089871,135022567,139073245,224582011,231319472,238259056,245406827,252769032,260352103,268162666,276207546,284493773]}'::jsonb)
on conflict (k) do update set v = excluded.v;

alter table public.p2d_nhan_vat add column if not exists canh_max smallint;

create table if not exists public.p2d_ma_hoa (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  ma        integer not null default 0 check (ma >= 0),
  cong_duc  integer not null default 0 check (cong_duc >= 0),
  giet      integer not null default 0,
  chet      integer not null default 0,
  lan       integer not null default 0,
  ngay      date,
  giet_ngay integer not null default 0,
  cap_nhat  timestamptz not null default now()
);
alter table public.p2d_ma_hoa enable row level security;
revoke all on table public.p2d_ma_hoa from anon, authenticated;
grant select on table public.p2d_ma_hoa to authenticated;
drop policy if exists p2d_ma_hoa_doc on public.p2d_ma_hoa;
create policy p2d_ma_hoa_doc on public.p2d_ma_hoa for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.p2d_ma_tran (
  id   bigint generated always as identity primary key,
  ts   bigint not null,
  e    text not null check (e in ('hoa', 'giet', 'diet')),
  ke   uuid not null references auth.users (id) on delete cascade,
  nan  uuid references auth.users (id) on delete cascade,
  luc  timestamptz not null default now(),
  unique (ts, e, ke)
);
create index if not exists p2d_ma_tran_cap on public.p2d_ma_tran (ke, nan, e, luc);
alter table public.p2d_ma_tran enable row level security;
revoke all on table public.p2d_ma_tran from anon, authenticated;

alter table public.p2d_pvp_no drop constraint if exists p2d_pvp_no_noi_chk;
alter table public.p2d_pvp_no add constraint p2d_pvp_no_noi_chk check (noi in ('ngoai', 'thuong', 'ma_giet', 'ma_diet'));

-- Người đủ tầng (không phải người mới được che): tổng tầng tu ≥ min_tl (4 = Luyện Khí tầng 5). Không có nhân vật: coi như người mới
create or replace function public.p2d_ma_du_tang(p_uid uuid, p_c jsonb)
returns boolean language sql stable set search_path = ''
as $$
  select coalesce((select greatest(coalesce(n.canh_gioi, 0), 0) * (p_c ->> 'tang')::integer + greatest(coalesce(n.tang, 1), 1) - 1
                     from public.p2d_nhan_vat n where n.user_id = p_uid), -1) >= (p_c ->> 'min_tl')::integer
$$;
revoke all on function public.p2d_ma_du_tang(uuid, jsonb) from public, anon, authenticated;

-- Một cặp (ke, nan) cùng kiểu quá nghi_cap lần trong ngày (giờ Việt Nam): ghi nghi vấn để soát (tối đa một dòng mỗi 10 phút), không chặn
create or replace function public.p2d_ma_soi(p_ke uuid, p_nan uuid, p_e text, p_c jsonb)
returns void language plpgsql set search_path = ''
as $$
declare v_n integer; v_tu timestamptz := date_trunc('day', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  select count(*) into v_n from public.p2d_ma_tran t where t.ke = p_ke and t.nan = p_nan and t.e = p_e and t.luc >= v_tu;
  if v_n > (p_c ->> 'nghi_cap')::integer
     and not exists (select 1 from public.p2d_nghi_van x where x.user_id = p_ke and x.ly_do = 'ma_cap' and x.luc > now() - interval '10 minutes') then
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (p_ke, 'ma_cap', jsonb_build_object('e', p_e, 'nan', p_nan, 'lan', v_n));
  end if;
end;
$$;
revoke all on function public.p2d_ma_soi(uuid, uuid, text, jsonb) from public, anon, authenticated;

create or replace function public.p2d_ma_ghi(p_ts bigint, p_ds text, p_ky text)
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_khoa text := (select v from public.p2d_bi_mat where k = 'cf_mang'); v_c jsonb := (select v from public.p2d_ky_cfg where k = 'ma');
  v_d jsonb; v_e text; v_k uuid; v_v uuid; v_mk public.p2d_ma_hoa%rowtype; v_mv public.p2d_ma_hoa%rowtype;
  v_hom date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_no boolean := false;
begin
  if v_khoa is null or v_c is null or p_ts is null or p_ds is null or p_ky is null or length(p_ds) > 500 then raise exception 'sai' using errcode = '42501'; end if;
  if abs(extract(epoch from now()) * 1000 - p_ts) > 120000 then raise exception 'het_gio' using errcode = '42501'; end if;
  if encode(extensions.hmac(p_ts::text || '.' || p_ds, v_khoa, 'sha256'), 'hex') <> lower(p_ky) then raise exception 'sai_ky' using errcode = '42501'; end if;
  v_d := p_ds::jsonb; v_e := v_d ->> 'e';
  if v_e = 'hoa' then
    v_k := (v_d ->> 'u')::uuid;
    if not public.p2d_ma_du_tang(v_k, v_c) then return jsonb_build_object('ma', 0, 'loi', 'moi'); end if;
    insert into public.p2d_ma_hoa (user_id) values (v_k) on conflict (user_id) do nothing;
    select * into v_mk from public.p2d_ma_hoa where user_id = v_k for update;
    if v_mk.ma > 0 then return jsonb_build_object('ma', v_mk.ma); end if;   -- đã là ma (máy chủ phòng quên): trả điểm thật
    insert into public.p2d_ma_tran (ts, e, ke) values (p_ts, 'hoa', v_k) on conflict do nothing;
    if not found then return jsonb_build_object('ma', v_mk.ma); end if;   -- tin gửi trùng
    update public.p2d_ma_hoa set ma = (v_c -> 'diem' ->> 'hoa')::integer, lan = lan + 1, cap_nhat = now() where user_id = v_k returning * into v_mk;
    return jsonb_build_object('ma', v_mk.ma);
  end if;
  if v_e is distinct from 'giet' and v_e is distinct from 'diet' then raise exception 'sai' using errcode = '22023'; end if;
  v_k := (v_d ->> 'k')::uuid; v_v := (v_d ->> 'v')::uuid;
  if v_k is null or v_v is null or v_k = v_v then raise exception 'sai' using errcode = '22023'; end if;
  insert into public.p2d_ma_hoa (user_id) values (v_k), (v_v) on conflict (user_id) do nothing;
  perform 1 from public.p2d_ma_hoa where user_id in (v_k, v_v) order by user_id for update;   -- khoá cả hai theo một thứ tự (khỏi khoá chéo)
  select * into v_mk from public.p2d_ma_hoa where user_id = v_k;
  select * into v_mv from public.p2d_ma_hoa where user_id = v_v;
  if v_e = 'giet' then   -- ma v_k đồ sát người v_v
    if v_mk.ma <= 0 then return jsonb_build_object('ma', 0); end if;
    if v_mv.ma > 0 or not public.p2d_ma_du_tang(v_v, v_c) then return jsonb_build_object('ma', v_mk.ma); end if;
    insert into public.p2d_ma_tran (ts, e, ke, nan) values (p_ts, 'giet', v_k, v_v) on conflict do nothing;
    if not found then return jsonb_build_object('ma', v_mk.ma); end if;
    update public.p2d_ma_hoa
       set ma = ma + (v_c -> 'diem' ->> 'giet')::integer, giet = giet + 1, ngay = v_hom,
           giet_ngay = case when ngay is distinct from v_hom then 1 else giet_ngay + 1 end, cap_nhat = now()
     where user_id = v_k returning * into v_mk;
    if v_mk.giet_ngay <= (v_c ->> 'lt_ngay')::integer then
      insert into public.p2d_pvp_no (ts, ke, nan, noi) values (p_ts, v_k, v_v, 'ma_giet') on conflict do nothing;
      v_no := found;
    end if;
    perform public.p2d_ma_soi(v_k, v_v, 'giet', v_c);
    return jsonb_build_object('ma', v_mk.ma, 'no', v_no);
  end if;
  -- người v_k diệt ma v_v
  if v_mv.ma <= 0 then return jsonb_build_object('ma', 0); end if;
  if v_mk.ma > 0 or not public.p2d_ma_du_tang(v_k, v_c) then return jsonb_build_object('ma', v_mv.ma); end if;
  insert into public.p2d_ma_tran (ts, e, ke, nan) values (p_ts, 'diet', v_k, v_v) on conflict do nothing;
  if not found then return jsonb_build_object('ma', v_mv.ma); end if;
  update public.p2d_ma_hoa set ma = greatest(ma - (v_c -> 'diem' ->> 'chet')::integer, 0), chet = chet + 1, cap_nhat = now() where user_id = v_v returning * into v_mv;
  update public.p2d_ma_hoa set cong_duc = cong_duc + 1, cap_nhat = now() where user_id = v_k returning * into v_mk;
  insert into public.p2d_pvp_no (ts, ke, nan, noi) values (p_ts, v_k, v_v, 'ma_diet') on conflict do nothing;
  v_no := found;
  perform public.p2d_ma_soi(v_k, v_v, 'diet', v_c);
  return jsonb_build_object('ma', v_mv.ma, 'cd', v_mk.cong_duc, 'no', v_no);
end;
$function$;
revoke all on function public.p2d_ma_ghi(bigint, text, text) from public;
grant execute on function public.p2d_ma_ghi(bigint, text, text) to anon, authenticated, service_role;

-- Trả nợ PvP: nguyên bản 19/11/2026 (20261119170000_p2d_pvp_moi_noi.sql) + hai kiểu nợ hóa ma
create or replace function public.p2d_pvp_tra()
 returns jsonb
 language plpgsql
 security definer
 set search_path to ''
as $function$
declare
  v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_n record; v_ra jsonb := '[]'::jsonb;
  v_lt numeric; v_mat bigint; v_bag jsonb; v_eq jsonb; v_cands jsonb; v_c jsonb; v_kq jsonb; v_thu jsonb; v_huy boolean; v_ten_ke text; v_ten text;
  v_ngoai boolean; v_noi text; v_ma jsonb := (select v from public.p2d_ky_cfg where k = 'ma'); v_tv boolean := false;
  v_r integer; v_l integer; v_tl integer; v_q numeric; v_mtv numeric; v_tut boolean; v_ntang integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then return jsonb_build_object('mat', v_ra); end if;
  v_ten := coalesce(v_nv.ten, 'Đạo hữu');
  for v_n in select * from public.p2d_pvp_no n where n.nan = v_uid and n.tra_luc is null order by n.id for update loop
    select coalesce(k.ten, 'Đạo hữu') into v_ten_ke from public.p2d_nhan_vat k where k.user_id = v_n.ke;
    v_huy := public.p2d_la_co_do(v_n.ke) or public.p2d_la_co_do(v_uid);   -- cờ đỏ thật (p2d_co_do), không phải nghi_van
    v_noi := coalesce(v_n.noi, 'ngoai'); v_ngoai := v_noi = 'ngoai';
    v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
    v_mat := greatest(0, floor(v_lt * case v_noi when 'ngoai' then 0.1 when 'ma_giet' then coalesce((v_ma -> 'mat' ->> 'nguoi_lt')::numeric, 0.02)
                                                 when 'ma_diet' then coalesce((v_ma -> 'mat' ->> 'ma_lt')::numeric, 0.01) else 0.05 end))::bigint;
    if v_mat > 0 then v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_mat)); end if;
    v_kq := jsonb_build_object('lt', v_mat, 'ke_ten', v_ten_ke, 'noi', v_noi);
    v_thu := jsonb_build_object('coins', v_mat, 'tu', v_ten);
    if v_ngoai then
      v_bag := case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' else '[]'::jsonb end;
      v_eq := case when jsonb_typeof(v_nv.data -> 'equip') = 'object' then v_nv.data -> 'equip' else '{}'::jsonb end;
      select coalesce(jsonb_agg(c), '[]'::jsonb) into v_cands from (
        select jsonb_build_object('i', b) c from jsonb_array_elements(v_bag) b
          where jsonb_typeof(b -> 'uid') = 'number' and not exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')
        union all
        select jsonb_build_object('m', e.key, 'n', greatest(1, floor((e.value #>> '{}')::numeric * 0.1))::bigint) from jsonb_each(
            case when jsonb_typeof(v_nv.data -> 'mats') = 'object' then v_nv.data -> 'mats' else '{}'::jsonb end) e
          where jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::numeric >= 1 and e.key ~ '^[a-z0-9-]{1,40}$'
      ) s;
      if jsonb_array_length(v_cands) > 0 then
        v_c := v_cands -> floor(random() * jsonb_array_length(v_cands))::int;
        if v_c ? 'i' then
          v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce((select jsonb_agg(b) from jsonb_array_elements(v_bag) b where b -> 'uid' is distinct from v_c -> 'i' -> 'uid'), '[]'::jsonb));
          v_kq := v_kq || jsonb_build_object('item_uid', v_c -> 'i' -> 'uid', 'item', (v_c -> 'i') - 'sig');
          v_thu := v_thu || jsonb_build_object('item', (v_c -> 'i') - 'sig');
        else
          v_nv.data := jsonb_set(v_nv.data, array['mats', v_c ->> 'm'], to_jsonb((v_nv.data -> 'mats' ->> (v_c ->> 'm'))::numeric - (v_c ->> 'n')::numeric));
          v_kq := v_kq || jsonb_build_object('mat_id', v_c ->> 'm', 'n', (v_c ->> 'n')::bigint);
          v_thu := v_thu || jsonb_build_object('mat', jsonb_build_object('id', v_c ->> 'm', 'n', (v_c ->> 'n')::bigint));
        end if;
      end if;
    end if;
    -- Hóa ma: ma bị diệt mất ma_tu_vi thanh linh khí tầng đang ở (bảng can như máy khách); thiếu thì tụt một tầng, linh khí = thanh tầng dưới trừ phần thiếu
    if v_noi = 'ma_diet' and v_ma is not null then
      v_ntang := (v_ma ->> 'tang')::integer;
      v_r := least(greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'realm') = 'number' then floor((v_nv.data ->> 'realm')::numeric)::integer end, v_nv.canh_gioi, 0), 0),
                   jsonb_array_length(v_ma -> 'can') / v_ntang - 1);
      v_l := least(greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'layer') = 'number' then floor((v_nv.data ->> 'layer')::numeric)::integer end, v_nv.tang, 1), 1), v_ntang);
      v_tl := v_r * v_ntang + v_l - 1;
      v_q := greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'qi') = 'number' then (v_nv.data ->> 'qi')::numeric end, 0), 0);
      v_mtv := ceil((v_ma -> 'can' ->> v_tl)::numeric * (v_ma -> 'mat' ->> 'ma_tu_vi')::numeric);
      v_tut := v_q < v_mtv and v_tl > 0;
      if v_q >= v_mtv then v_q := v_q - v_mtv;
      elsif v_tl > 0 then v_tl := v_tl - 1; v_q := greatest(0, (v_ma -> 'can' ->> v_tl)::numeric - (v_mtv - v_q));
      else v_q := 0;
      end if;
      v_r := v_tl / v_ntang; v_l := v_tl % v_ntang + 1; v_q := floor(v_q);
      v_nv.data := jsonb_set(jsonb_set(jsonb_set(v_nv.data, '{realm}', to_jsonb(v_r)), '{layer}', to_jsonb(v_l)), '{qi}', to_jsonb(v_q));
      v_nv.canh_gioi := v_r; v_nv.tang := v_l; v_tv := true;
      v_kq := v_kq || jsonb_build_object('tv', jsonb_build_object('mat', v_mtv, 'realm', v_r, 'layer', v_l, 'qi', v_q, 'tut', v_tut));
    end if;
    if not v_huy and (v_mat > 0 or v_thu ? 'item' or v_thu ? 'mat') then
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
      values (v_n.ke, v_thu, case v_noi when 'ma_giet' then 'ma_ha' when 'ma_diet' then 'ma_diet' else 'pvp_ha' end);
    end if;
    v_kq := v_kq || jsonb_build_object('huy', v_huy);
    update public.p2d_pvp_no set tra_luc = now(), ket_qua = v_kq where id = v_n.id;
    v_ra := v_ra || jsonb_build_array(v_kq);
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    if v_tv then perform set_config('p2d.lk_tru', '1', true); end if;   -- tu vi do máy chủ trừ: bộ hãm linh khí bỏ qua lần ghi này
    update public.p2d_nhan_vat set data = v_nv.data, canh_gioi = v_nv.canh_gioi, tang = v_nv.tang, phien_ban = phien_ban + 1, updated_at = now()
     where user_id = v_uid returning phien_ban into v_nv.phien_ban;
    if v_tv then perform set_config('p2d.lk_tru', '', true); end if;
  end if;
  return jsonb_build_object('mat', v_ra, 'phien_ban', v_nv.phien_ban);
end;
$function$;

-- Bộ hãm linh khí: nguyên bản 20/11/2026 (20261120030000_p2d_qua_linh_khi.sql) + dòng bỏ qua lần máy chủ tự trừ tu vi
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
  -- Máy chủ tự trừ tu vi (p2d_pvp_tra: ma bị diệt, hóa ma 22/11/2026) đặt p2d.lk_tru trong cùng giao dịch: không phải người chơi tăng linh khí, bỏ qua
  if current_setting('p2d.lk_tru', true) = '1' then return new; end if;
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

-- Trigger Tiềm năng / Kỹ năng: nguyên bản 22/11/2026 (20261122030000_p2d_tiem_ky_nang.sql) + cảnh giới cao nhất canh_max
create or replace function public.p2d_kiem_tiem_kn()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_c jsonb := (select v from public.p2d_ky_cfg where k = 'tn');
  v_t jsonb := new.data -> 'tiem';
  v_realm integer := case when jsonb_typeof(new.data -> 'realm') = 'number' then least(greatest(floor((new.data ->> 'realm')::numeric), 0), 8)::integer else coalesce(new.canh_gioi, 0) end;
  v_toc text; v_goc jsonb; v_moi_sv boolean := false; v_dung jsonb; v_okn jsonb; v_k text;
  v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '{}'; v_max integer;
begin
  -- 0. Cảnh giới cao nhất từng đạt (hóa ma 22/11/2026: ma bị diệt có thể tụt cảnh giới; điểm tiềm năng tính theo mốc này nên không mất, lên lại không thêm)
  v_max := greatest(case when tg_op = 'UPDATE' then coalesce(old.canh_max, old.canh_gioi, 0) else 0 end, v_realm);
  new.canh_max := v_max;
  if v_c is null then return new; end if;
  -- 1. Huyết mạch, điểm tiềm năng
  if v_t is not null and jsonb_typeof(v_t) = 'object' and coalesce(v_t ->> 'toc', '') <> ''
     and (tg_op = 'INSERT' or v_t is distinct from (old.data -> 'tiem')) then
    select n.toc, n.goc into v_toc, v_goc from public.p2d_tiem_nang n where n.user_id = new.user_id;
    if not found then   -- máy khách tự quay (chưa gọi được p2d_quay_toc): máy chủ quyết
      v_dung := public.p2d_tn_quay(v_c); v_moi_sv := true;
      insert into public.p2d_tiem_nang (user_id, toc, goc) values (new.user_id, v_dung ->> 'toc', v_dung -> 'goc') on conflict (user_id) do nothing;
      select n.toc, n.goc into v_toc, v_goc from public.p2d_tiem_nang n where n.user_id = new.user_id;
    end if;
    v_dung := jsonb_build_object('toc', v_toc, 'goc', v_goc, 'cong', public.p2d_tn_cong(v_t -> 'cong', v_c, v_max), 'max', v_max,
      'tay', case when jsonb_typeof(v_t -> 'tay') = 'number' then least(greatest(floor((v_t ->> 'tay')::numeric), 0), 1000000)::integer else 0 end);
    if v_dung is distinct from v_t then
      if not v_moi_sv and ((v_t ->> 'toc') is distinct from v_toc or (v_t -> 'goc') is distinct from v_goc) then
        v_ly := v_ly || 'tiem'::text; v_ct := v_ct || jsonb_build_object('tiem_gui', jsonb_build_object('toc', v_t -> 'toc', 'goc', v_t -> 'goc'), 'tiem_may_chu', v_toc);
      end if;
      new.data := jsonb_set(new.data, '{tiem}', v_dung); v_sua := v_sua || jsonb_build_object('tiem', v_dung);
    end if;
  end if;
  -- 2. Sách kỹ năng
  if tg_op = 'INSERT' or (new.data -> 'knSach') is distinct from (old.data -> 'knSach') or (new.data -> 'knTrong') is distinct from (old.data -> 'knTrong')
     or (new.data -> 'knMoc') is distinct from (old.data -> 'knMoc') then
    if not public.p2d_kn_hop_le(new.data, v_c) then
      v_okn := case when tg_op = 'UPDATE' and public.p2d_kn_hop_le(old.data, v_c) then old.data else '{}'::jsonb end;
      v_ct := v_ct || jsonb_build_object('kn_gui', jsonb_build_object('knSach', new.data -> 'knSach', 'knTrong', new.data -> 'knTrong', 'knMoc', new.data -> 'knMoc', 'step', new.data -> 'step'));
      foreach v_k in array array['knSach', 'knTrong', 'knMoc'] loop
        new.data := case when v_okn ? v_k then jsonb_set(new.data, array[v_k], v_okn -> v_k) else new.data - v_k end;
      end loop;
      v_sua := v_sua || jsonb_build_object('kn', jsonb_build_object('knSach', v_okn -> 'knSach', 'knTrong', v_okn -> 'knTrong', 'knMoc', v_okn -> 'knMoc'));
      v_ly := v_ly || 'kn_sach'::text;
    end if;
  end if;
  -- 3. Trả phần sửa về máy khách (p2d_luu2 đọc p2d.sua sau khi lưu), ghi nghi vấn
  if v_sua <> '{}'::jsonb then
    perform set_config('p2d.sua', (coalesce(nullif(current_setting('p2d.sua', true), '')::jsonb, '{}'::jsonb) || v_sua)::text, true);
  end if;
  if cardinality(v_ly) > 0 and not exists (select 1 from public.p2d_nghi_van x where x.user_id = new.user_id and x.ly_do = array_to_string(v_ly, ',') and x.luc > now() - interval '10 minutes') then
    new.nghi_van := coalesce(new.nghi_van, 0) + 1;
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (new.user_id, array_to_string(v_ly, ','), v_ct);
  end if;
  return new;
end;
$$;

-- Bảng xếp hạng: nguyên bản đang chạy + 'ma', 'cong_duc'
CREATE OR REPLACE FUNCTION public.p2d_bxh2_het(p_loai text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := (select auth.uid());
  v_bc  text;
  v_top jsonb;
  v_toi jsonb;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('dmt', 'gop_y', 'ma', 'cong_duc') and p_loai !~ '^bc:[a-z][a-z-]{1,30}$' then raise exception 'loai_sai' using errcode = '22023'; end if;
  v_bc := case when p_loai like 'bc:%' then substr(p_loai, 4) end;
  with diem as (
    select n.user_id, n.ten, n.canh_gioi, n.tang, n.nghi_van >= 10 as co, n.updated_at,
           case p_loai
             when 'dmt' then (select count(*) from public.p2d_thien_ma_tran t where t.user_id = n.user_id)
             when 'gop_y' then (select count(*) from public.p2d_gop_y g where g.user_id = n.user_id and g.trang_thai in ('da_sua', 'se_lam'))
             when 'ma' then coalesce((select m.ma from public.p2d_ma_hoa m where m.user_id = n.user_id), 0)   -- hóa ma: điểm ma hiện tại (số lần còn phải chết)
             when 'cong_duc' then coalesce((select m.cong_duc from public.p2d_ma_hoa m where m.user_id = n.user_id), 0)
             else coalesce(case when jsonb_typeof(n.data -> 'dunLv2' -> v_bc) = 'number'
                                then least(greatest((n.data -> 'dunLv2' ->> v_bc)::numeric, 0), 100000)::bigint end, 0)
           end as gia_tri
      from public.p2d_nhan_vat n
     where not exists (select 1 from auth.users u where u.id = n.user_id and u.banned_until > now())
       and not exists (select 1 from public.p2d_thien_ma tm where tm.user_id = n.user_id)
  ), xep as (
    select row_number() over (order by d.gia_tri desc, d.updated_at asc) as hang, d.*
      from diem d where d.gia_tri > 0
  )
  select coalesce((select jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'canh_gioi', x.canh_gioi,
                                                       'tang', x.tang, 'co', x.co, 'la_toi', x.user_id = v_uid,
                                                       'k', public.p2d_chat_key(x.user_id)) order by x.hang)
                     from xep x where x.hang <= 2000), '[]'::jsonb),
         (select jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'co', x.co, 'k', public.p2d_chat_key(x.user_id))
            from xep x where x.user_id = v_uid)
    into v_top, v_toi;
  return jsonb_build_object('top', v_top, 'toi', v_toi);
end;
$function$;

-- Tự kiểm tra (hoàn tác dữ liệu thử). pg_temp.p2d_thu_ma ký như lõi Mang rồi gọi p2d_ma_ghi
create or replace function pg_temp.p2d_thu_ma(p_ds jsonb, p_ts bigint)
returns jsonb language sql as $$
  select public.p2d_ma_ghi(p_ts, p_ds::text, encode(extensions.hmac(p_ts::text || '.' || p_ds::text, (select v from public.p2d_bi_mat where k = 'cf_mang'), 'sha256'), 'hex'))
$$;
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000e1'; b uuid := '00000000-0000-4000-8000-0000000000e2'; nm uuid := '00000000-0000-4000-8000-0000000000e3';
  v_c jsonb := (select v from public.p2d_ky_cfg where k = 'ma'); t0 bigint := floor(extract(epoch from now()) * 1000)::bigint;
  r jsonb; d jsonb; i integer; v_n integer; v_lt numeric;
begin
  begin
    insert into auth.users (id, email, aud, role) values (a, 'kt_ma_a@nguoichoi.invalid', 'authenticated', 'authenticated'),
      (b, 'kt_ma_b@nguoichoi.invalid', 'authenticated', 'authenticated'), (nm, 'kt_ma_n@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luu_luc) values
      (a, '{"realm": 2, "layer": 1, "qi": 100, "lingshi": 100000, "flags": {}}', 2, 1, 1, now()),
      (b, '{"realm": 1, "layer": 5, "qi": 0, "lingshi": 50000, "flags": {}}', 1, 5, 1, now()),
      (nm, '{"realm": 0, "layer": 4, "qi": 0, "lingshi": 1000, "flags": {}}', 0, 4, 1, now());
    -- 1. người mới (Luyện Khí tầng 4 = tổng tầng 3) không hóa ma được
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'hoa', 'u', nm), t0 + 1);
    if r is distinct from '{"ma": 0, "loi": "moi"}'::jsonb then v_hong := v_hong || ' | người mới hóa ma được: ' || r::text; end if;
    -- 2. hóa ma: 1 điểm; bấm lại không đổi
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'hoa', 'u', a), t0 + 2);
    if r is distinct from '{"ma": 1}'::jsonb then v_hong := v_hong || ' | hóa ma: ' || r::text; end if;
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'hoa', 'u', a), t0 + 3);
    if r is distinct from '{"ma": 1}'::jsonb or (select lan from public.p2d_ma_hoa where user_id = a) <> 1 then v_hong := v_hong || ' | hóa ma lần hai đổi điểm: ' || r::text; end if;
    -- 3. ma đánh người mới: không tính
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'giet', 'k', a, 'v', nm, 'n', 'thuong'), t0 + 4);
    if r is distinct from '{"ma": 1}'::jsonb or exists (select 1 from public.p2d_pvp_no where nan = nm) then v_hong := v_hong || ' | ma hạ được người mới: ' || r::text; end if;
    -- 4. ma đồ sát người: + 3, ghi nợ ma_giet
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'giet', 'k', a, 'v', b, 'n', 'thuong'), t0 + 5);
    if r is distinct from '{"ma": 4, "no": true}'::jsonb or not exists (select 1 from public.p2d_pvp_no where ke = a and nan = b and noi = 'ma_giet') then v_hong := v_hong || ' | đồ sát: ' || r::text; end if;
    -- 5. gửi trùng (cùng ts): không cộng lần nữa
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'giet', 'k', a, 'v', b, 'n', 'thuong'), t0 + 5);
    if r is distinct from '{"ma": 4}'::jsonb then v_hong := v_hong || ' | gửi trùng vẫn cộng: ' || r::text; end if;
    -- 6. người thường "đồ sát" (máy chủ phòng lệch): không đổi gì, trả điểm thật 0
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'giet', 'k', b, 'v', a, 'n', 'thuong'), t0 + 6);
    if r is distinct from '{"ma": 0}'::jsonb then v_hong := v_hong || ' | người thường đồ sát được: ' || r::text; end if;
    -- 7. người mới diệt ma: không tính; người đủ tầng diệt ma: ma − 1, công đức + 1, nợ ma_diet
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'diet', 'k', nm, 'v', a, 'n', 'thuong'), t0 + 7);
    if r is distinct from '{"ma": 4}'::jsonb then v_hong := v_hong || ' | người mới diệt được ma: ' || r::text; end if;
    r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'diet', 'k', b, 'v', a, 'n', 'thuong'), t0 + 8);
    if r is distinct from '{"ma": 3, "cd": 1, "no": true}'::jsonb then v_hong := v_hong || ' | diệt ma: ' || r::text; end if;
    -- 8. sai chữ ký, quá giờ: từ chối
    begin
      perform public.p2d_ma_ghi(t0 + 9, jsonb_build_object('e', 'hoa', 'u', b)::text, 'deadbeef');
      v_hong := v_hong || ' | sai chữ ký vẫn nhận';
    exception when others then if sqlerrm <> 'sai_ky' then v_hong := v_hong || ' | sai chữ ký báo lỗi lạ: ' || sqlerrm; end if;
    end;
    begin
      perform pg_temp.p2d_thu_ma(jsonb_build_object('e', 'hoa', 'u', b), t0 - 600000);
      v_hong := v_hong || ' | tin quá giờ vẫn nhận';
    exception when others then if sqlerrm <> 'het_gio' then v_hong := v_hong || ' | tin quá giờ báo lỗi lạ: ' || sqlerrm; end if;
    end;
    -- 9. thêm 11 lượt đồ sát b: điểm 3 + 33 = 36; chỉ 10 lượt đầu trong ngày có nợ; một cặp quá nghi_cap lượt: đúng một dòng nghi vấn, không cộng điểm nghi vấn
    for i in 1 .. 11 loop r := pg_temp.p2d_thu_ma(jsonb_build_object('e', 'giet', 'k', a, 'v', b, 'n', 'thuong'), t0 + 20 + i); end loop;
    select count(*) into v_n from public.p2d_pvp_no where ke = a and nan = b and noi = 'ma_giet';
    if (r ->> 'ma')::integer <> 36 or v_n <> (v_c ->> 'lt_ngay')::integer or (r ->> 'no')::boolean then v_hong := v_hong || ' | trần mỗi ngày: ' || r::text || ' nợ ' || v_n; end if;
    if (select count(*) from public.p2d_nghi_van where user_id = a and ly_do = 'ma_cap') <> 1 then v_hong := v_hong || ' | nghi vấn cặp không đúng một dòng'; end if;
    if exists (select 1 from public.p2d_nhan_vat where user_id = a and coalesce(nghi_van, 0) > 0) then v_hong := v_hong || ' | nghi vấn cặp cộng điểm nghi vấn'; end if;
    -- 10. b trả 10 món nợ đồ sát: mỗi lần 2% Linh Thạch, thư về ma lý do ma_ha, không mất tu vi
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    r := public.p2d_pvp_tra();
    select data into d from public.p2d_nhan_vat where user_id = b;
    v_lt := 50000; for i in 1 .. 10 loop v_lt := v_lt - floor(v_lt * 0.02); end loop;
    if jsonb_array_length(r -> 'mat') <> 10 or (d ->> 'lingshi')::numeric <> v_lt or (d ->> 'realm') <> '1' or (d ->> 'layer') <> '5' or (d ->> 'qi')::numeric <> 0
       or (select count(*) from public.p2d_hom_thu where user_id = a and ly_do = 'ma_ha') <> 10 then
      v_hong := v_hong || ' | trả nợ đồ sát: ' || coalesce(d ->> 'lingshi', '?') || ' / ' || v_lt;
    end if;
    -- 11. a (Kim Đan tầng 1, linh khí 100, thiếu 1% thanh) trả nợ diệt ma + một món nợ PvP thường: mất 1% rồi 5% Linh Thạch; tụt Trúc Cơ tầng 9, linh khí
    --     = thanh Trúc Cơ tầng 9 − phần thiếu; bộ hãm linh khí không cắt, không cắm cờ, tắt p2d.lk_tru sau khi ghi; cảnh giới cao nhất giữ 2
    insert into public.p2d_pvp_no (ts, ke, nan, noi) values (t0 + 50, b, a, 'thuong');
    update public.p2d_nhan_vat set qi_xo = 0, qi_luc = now() where user_id = a;   -- thùng hạn mức linh khí cạn: không có p2d.lk_tru thì bộ hãm đọc lần tụt tầng thành tăng vọt
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    r := public.p2d_pvp_tra();
    select data into d from public.p2d_nhan_vat where user_id = a;
    if (d ->> 'lingshi')::numeric <> 100000 - 1000 - floor(99000 * 0.05) or (d ->> 'realm') <> '1' or (d ->> 'layer') <> '9'
       or (d ->> 'qi')::numeric <> (v_c -> 'can' ->> 17)::numeric - (ceil((v_c -> 'can' ->> 18)::numeric * 0.01) - 100)
       or (select canh_gioi from public.p2d_nhan_vat where user_id = a) <> 1 or (select tang from public.p2d_nhan_vat where user_id = a) <> 9
       or (select canh_max from public.p2d_nhan_vat where user_id = a) <> 2 then
      v_hong := v_hong || ' | ma trả nợ: ' || d::text || ' / ' || r::text;
    end if;
    if not coalesce((r -> 'mat' -> 0 -> 'tv' ->> 'tut')::boolean, false) or (r -> 'mat' -> 1 ->> 'noi') <> 'thuong' then v_hong := v_hong || ' | kết quả trả nợ: ' || r::text; end if;
    if exists (select 1 from public.p2d_nghi_van where user_id = a and ly_do = 'linh_khi') then v_hong := v_hong || ' | bộ hãm linh khí cắm cờ oan'; end if;
    if coalesce(current_setting('p2d.lk_tru', true), '') <> '' then v_hong := v_hong || ' | p2d.lk_tru còn bật sau khi trả nợ'; end if;
    if (select count(*) from public.p2d_hom_thu where user_id = b and ly_do = 'ma_diet' and (noi_dung ->> 'coins')::numeric = 1000) <> 1 then v_hong := v_hong || ' | thư diệt ma'; end if;
    -- 12. linh khí đủ thì chỉ trừ, không tụt (b: Trúc Cơ tầng 5)
    update public.p2d_nhan_vat set data = jsonb_set(data, '{qi}', '5000') where user_id = b;
    insert into public.p2d_pvp_no (ts, ke, nan, noi) values (t0 + 60, nm, b, 'ma_diet');
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    r := public.p2d_pvp_tra();
    select data into d from public.p2d_nhan_vat where user_id = b;
    if (d ->> 'realm') <> '1' or (d ->> 'layer') <> '5' or (d ->> 'qi')::numeric <> 5000 - ceil((v_c -> 'can' ->> 13)::numeric * 0.01)
       or coalesce((r -> 'mat' -> 0 -> 'tv' ->> 'tut')::boolean, true) then
      v_hong := v_hong || ' | trừ linh khí khi đủ: ' || d::text || ' / ' || r::text;
    end if;
    -- 13. điểm tiềm năng sau khi tụt: tính theo cảnh giới cao nhất (2 × 5 = 10), báo max về máy khách
    update public.p2d_nhan_vat set data = data || '{"tiem": {"toc": "nhan", "goc": {}, "cong": {"atk_pct": 10}, "tay": 0}}' where user_id = a;
    select data -> 'tiem' into d from public.p2d_nhan_vat where user_id = a;
    if (d -> 'cong') is distinct from '{"atk_pct": 10}'::jsonb or (d ->> 'max') <> '2' then v_hong := v_hong || ' | điểm tiềm năng sau khi tụt: ' || d::text; end if;
    -- 14. bộ hãm linh khí vẫn chặn tăng vọt khi không phải máy chủ trừ
    update public.p2d_nhan_vat set data = jsonb_set(data, '{qi}', '999999999') where user_id = a;
    if (select (data ->> 'qi')::numeric from public.p2d_nhan_vat where user_id = a) >= 999999999 then v_hong := v_hong || ' | bộ hãm linh khí không chặn nữa'; end if;
    -- 15. bảng xếp hạng: Ma hóa (điểm hiện tại), Công đức
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    r := public.p2d_bxh2_het('ma');
    if not exists (select 1 from jsonb_array_elements(r -> 'top') x where x ->> 'k' = public.p2d_chat_key(a) and (x ->> 'gia_tri')::integer = 36) then v_hong := v_hong || ' | bảng Ma hóa thiếu'; end if;
    r := public.p2d_bxh2_het('cong_duc');
    if (r -> 'toi' ->> 'gia_tri')::integer is distinct from 1 then v_hong := v_hong || ' | bảng Công đức: ' || coalesce((r -> 'toi')::text, 'null'); end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra Hóa ma TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra Hóa ma: đạt hết';
end
$kt$;
drop function if exists pg_temp.p2d_thu_ma(jsonb, bigint);
