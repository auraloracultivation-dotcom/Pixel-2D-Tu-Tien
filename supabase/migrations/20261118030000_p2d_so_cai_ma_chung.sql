-- Sổ cái Tiên Ngọc, sổ đồ mất, chống trùng lệnh, Hòm thư gửi được Tiên Ngọc, mã quà dùng chung
-- (chủ dự án 17/11/2026 12:56–13:05 "hoàn 560 Tiên Ngọc qua hòm thư", chọn cách 2: hòm thư nhận Tiên Ngọc;
--  18/11/2026 00:07–00:13 mã quà tân thủ phát trên TikTok; 01:09–01:16 sổ cái, chống trùng theo bản kiến trúc).
-- CHỈ ÁP KHI CHỦ DỰ ÁN NÓI "áp lên" CHO ĐỢT NÀY. Áp xong: thử đăng ký một tài khoản mới và đăng nhập.
-- 1) p2d_so_cai: mỗi lần cột tien_ngoc của p2d_nhan_vat đổi thì ghi một dòng (ai, cũ, mới, lý do, lúc). Lý do lấy từ
--    biến phiên p2d.ly_do do hàm máy chủ đặt (đổi Tiên Ngọc, nhận thư, ...); không đặt thì ghi 'khac'. Ghi bằng trigger nên
--    đường nào làm đổi Tiên Ngọc cũng có dấu vết (17/11 không tra được ai đã mua áo bằng Tiên Ngọc).
-- 2) p2d_so_do: lần lưu nào làm mất món (uid có trong túi cũ, không còn trong túi mới) từ phẩm Huyền trở lên, hoặc đã cường
--    hoá, hoặc đã khoá thì ghi gọn món đó (base, phẩm, cấp, cường hoá, phiên bản). Đồ phẩm Phàm / Linh bán, phân giải hằng
--    ngày không ghi cho đỡ nặng. (17/11 không tra được người chơi mất quạt.)
-- 3) p2d_lenh: khoá chống trùng (user_id, khoa) cho lệnh có tiền; p2d_doi_tn2(p_ma, p_khoa): bấm hai lần / mạng gửi lại
--    cùng khoá thì trả lại kết quả lần đầu, không trừ lần hai. p2d_doi_tn cũ giữ cho máy chưa tải bản mới.
-- 4) p2d_nhan_thu_moi: thư có khoá tn (số nguyên 1–1000) cộng Tiên Ngọc (cột tien_ngoc và data.tn), ghi sổ cái lý do nhan_thu.
-- 5) Mã quà dùng chung: p2d_ma_chung (mã, các lá thư quà, hạn, trần lượt), p2d_ma_chung_dung (mỗi tài khoản một lần mỗi mã).
--    p2d_nhap_ma xem mã chung trước, có thì gửi các lá thư quà vào Hòm thư; không thì làm như cũ (mã một lần).
--    Mã KHÔNG ghi trong repo (kho công khai): tạo bằng `node tools/ma-chung-sql.mjs <MÃ> <gói> [hạn]` rồi chạy câu SQL in ra.

create table if not exists public.p2d_so_cai (
  id bigserial primary key,
  user_id uuid not null,
  loai text not null default 'tn',
  cu numeric not null,
  moi numeric not null,
  ly_do text not null default 'khac',
  luc timestamptz not null default now()
);
create index if not exists p2d_so_cai_user_idx on public.p2d_so_cai (user_id, luc desc);
alter table public.p2d_so_cai enable row level security;
revoke all on public.p2d_so_cai from anon, authenticated;

create table if not exists public.p2d_so_do (
  id bigserial primary key,
  user_id uuid not null,
  uid bigint,
  mon jsonb not null,
  phien_ban integer,
  ly_do text not null default 'khac',
  luc timestamptz not null default now()
);
create index if not exists p2d_so_do_user_idx on public.p2d_so_do (user_id, luc desc);
alter table public.p2d_so_do enable row level security;
revoke all on public.p2d_so_do from anon, authenticated;

create table if not exists public.p2d_lenh (
  user_id uuid not null,
  khoa text not null,
  kq jsonb,
  luc timestamptz not null default now(),
  primary key (user_id, khoa)
);
alter table public.p2d_lenh enable row level security;
revoke all on public.p2d_lenh from anon, authenticated;

create table if not exists public.p2d_ma_chung (
  ma text primary key,
  thu jsonb not null,            -- mảng các nội dung thư quà, mỗi phần tử như noi_dung của p2d_hom_thu
  het_luc timestamptz,           -- null: không hạn
  tran integer,                  -- null: không giới hạn lượt
  da_dung integer not null default 0,
  ghi_chu text,
  tao_luc timestamptz not null default now()
);
alter table public.p2d_ma_chung enable row level security;
revoke all on public.p2d_ma_chung from anon, authenticated;

create table if not exists public.p2d_ma_chung_dung (
  ma text not null references public.p2d_ma_chung (ma),
  user_id uuid not null,
  luc timestamptz not null default now(),
  primary key (ma, user_id)
);
alter table public.p2d_ma_chung_dung enable row level security;
revoke all on public.p2d_ma_chung_dung from anon, authenticated;

-- 1) + 2) Trigger ghi sổ sau mỗi lần lưu nhân vật
create or replace function public.p2d_ghi_so() returns trigger
language plpgsql security definer set search_path to '' as $$
declare v_ly text := coalesce(nullif(current_setting('p2d.ly_do', true), ''), 'khac');
begin
  if new.tien_ngoc is distinct from old.tien_ngoc then
    insert into public.p2d_so_cai (user_id, loai, cu, moi, ly_do) values (new.user_id, 'tn', coalesce(old.tien_ngoc, 0), coalesce(new.tien_ngoc, 0), v_ly);
  end if;
  if jsonb_typeof(old.data -> 'bag') = 'array' and (old.data -> 'bag') is distinct from (new.data -> 'bag') then
    insert into public.p2d_so_do (user_id, uid, mon, phien_ban, ly_do)
    select new.user_id, (o ->> 'uid')::bigint,
           jsonb_strip_nulls(jsonb_build_object('base', o -> 'base', 'rarity', o -> 'rarity', 'lvl', o -> 'lvl', 'plus', o -> 'plus', 'lock', o -> 'lock', 'el', o -> 'el')),
           new.phien_ban, v_ly
    from jsonb_array_elements(old.data -> 'bag') o
    where jsonb_typeof(o -> 'uid') = 'number'
      and (coalesce(o ->> 'rarity', '') not in ('pham', 'linh') or coalesce((o ->> 'plus')::numeric, 0) > 0 or coalesce(o ->> 'lock', '') = 'true')
      and not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(new.data -> 'bag') = 'array' then new.data -> 'bag' else '[]'::jsonb end) n
                      where n -> 'uid' = o -> 'uid');
  end if;
  return null;
end; $$;
revoke all on function public.p2d_ghi_so() from public, anon, authenticated;

drop trigger if exists p2d_zz_ghi_so on public.p2d_nhan_vat;
create trigger p2d_zz_ghi_so after update on public.p2d_nhan_vat
  for each row execute function public.p2d_ghi_so();

-- Đổi Tiên Ngọc (giữ chữ ký cũ) ghi lý do vào sổ cái
create or replace function public.p2d_doi_tn(p_ma text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_gia integer;
begin
  select tn into v_gia from public.p2d_tn_gia where ma = p_ma and left(ma, 1) <> '_';
  if not found then raise exception 'ma_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.tien_ngoc < v_gia then raise exception 'thieu_tn' using errcode = '22023'; end if;
  perform set_config('p2d.ly_do', left('doi_tn:' || p_ma, 60), true);
  update public.p2d_nhan_vat set tien_ngoc = tien_ngoc - v_gia, data = public.p2d_thu_tn(data, p_ma) || jsonb_build_object('tn', tien_ngoc - v_gia),
         phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning * into v_nv;
  return jsonb_build_object('tn', v_nv.tien_ngoc, 'phien_ban', v_nv.phien_ban);
end;
$function$;

-- 3) Đổi Tiên Ngọc có khoá chống trùng
create or replace function public.p2d_doi_tn2(p_ma text, p_khoa text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := public.p2d_uid(); v_k text := left(coalesce(p_khoa, ''), 64); v_kq jsonb;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if v_k !~ '^[A-Za-z0-9_-]{8,64}$' then raise exception 'khoa_sai' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext('lenh:' || v_uid::text));
  select kq into v_kq from public.p2d_lenh where user_id = v_uid and khoa = 'doi_tn:' || v_k;
  if found then return v_kq || jsonb_build_object('lap', true); end if;
  v_kq := public.p2d_doi_tn(p_ma);
  insert into public.p2d_lenh (user_id, khoa, kq) values (v_uid, 'doi_tn:' || v_k, v_kq);
  return v_kq;
end;
$function$;
revoke all on function public.p2d_doi_tn2(text, text) from public, anon;
grant execute on function public.p2d_doi_tn2(text, text) to authenticated;

-- 4) Nhận thư: thêm Tiên Ngọc (khoá tn), ghi lý do nhan_thu
create or replace function public.p2d_nhan_thu_moi(p_ids bigint[], p_uid_tu bigint default null::bigint)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_t record; v_next bigint; v_cho integer; v_item jsonb; v_lt numeric; v_ra jsonb := '[]'::jsonb; v_nd jsonb; v_gk text; v_id text; v_tn integer := 0;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_next := greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'nextUid') = 'number' then (v_nv.data ->> 'nextUid')::bigint end, 1), coalesce(p_uid_tu, 0));
  v_cho := 40 - coalesce(jsonb_array_length(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end), 0);
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
    perform set_config('p2d.ly_do', 'nhan_thu', true);
    update public.p2d_nhan_vat set data = v_nv.data, tien_ngoc = coalesce(tien_ngoc, 0) + v_tn, phien_ban = phien_ban + 1, updated_at = now()
      where user_id = v_uid returning phien_ban, tien_ngoc into v_nv.phien_ban, v_nv.tien_ngoc;
  end if;
  return jsonb_build_object('thu', v_ra, 'phien_ban', v_nv.phien_ban, 'next_uid', v_next, 'tn', v_nv.tien_ngoc);
end;
$function$;

-- 5) Nhập mã: mã chung trước, rồi mã một lần như cũ
create or replace function public.p2d_nhap_ma(p_ma text)
 returns jsonb language plpgsql security definer set search_path to '' as $function$
declare v_uid uuid := public.p2d_uid(); v_m public.p2d_ma_qua%rowtype; v_c public.p2d_ma_chung%rowtype; v_ma text := upper(btrim(coalesce(p_ma, ''))); v_l jsonb; v_n integer := 0;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ma_qua:' || v_uid::text));
  select * into v_c from public.p2d_ma_chung where ma = v_ma for update;
  if found then
    if v_c.het_luc is not null and v_c.het_luc < now() then return jsonb_build_object('ok', false, 'ly_do', 'het_han'); end if;
    if exists (select 1 from public.p2d_ma_chung_dung where ma = v_ma and user_id = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'da_nhap'); end if;
    if v_c.tran is not null and v_c.da_dung >= v_c.tran then return jsonb_build_object('ok', false, 'ly_do', 'het_luot'); end if;
    if not exists (select 1 from public.p2d_nhan_vat where user_id = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'chua_luu'); end if;
    insert into public.p2d_ma_chung_dung (ma, user_id) values (v_ma, v_uid);
    update public.p2d_ma_chung set da_dung = da_dung + 1 where ma = v_ma;
    for v_l in select * from jsonb_array_elements(case when jsonb_typeof(v_c.thu) = 'array' then v_c.thu else '[]'::jsonb end) loop
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, v_l || jsonb_build_object('tieu_de', coalesce(v_l ->> 'tieu_de', 'Quà mã ' || v_ma)), 'ma_qua');
      v_n := v_n + 1;
    end loop;
    return jsonb_build_object('ok', true, 'loai', 'chung', 'thu', v_n);
  end if;
  select * into v_m from public.p2d_ma_qua where ma = v_ma for update;
  if not found then return jsonb_build_object('ok', false, 'ly_do', 'sai_ma'); end if;
  if v_m.dung_boi is not null then return jsonb_build_object('ok', false, 'ly_do', case when v_m.dung_boi = v_uid then 'da_nhap' else 'het_luot' end); end if;
  if exists (select 1 from public.p2d_ma_qua where dot = v_m.dot and dung_boi = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'da_nhap_dot'); end if;
  update public.p2d_ma_qua set dung_boi = v_uid, dung_luc = now() where ma = v_ma;
  if v_m.loai = 'ht' then
    insert into public.p2d_ht_diem (user_id, diem) values (v_uid, v_m.diem)
    on conflict (user_id) do update set diem = public.p2d_ht_diem.diem + excluded.diem, luc = now();
  else
    insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu) values (v_uid, v_m.diem, 'ma_qua', v_ma, left('Mã quà ' || coalesce(v_m.ghi_chu, v_m.dot), 200));
  end if;
  return jsonb_build_object('ok', true, 'diem', v_m.diem, 'loai', v_m.loai);
end; $function$;
