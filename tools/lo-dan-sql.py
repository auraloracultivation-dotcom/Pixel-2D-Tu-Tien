# Sinh migration lò luyện đan (python3 tools/lo-dan-sql.py > supabase/migrations/20261120140000_p2d_lo_dan.sql) từ data/cave.json → lo
# và pills.*.recipe / make. Chủ dự án 20/11/2026 13:3x–14:5x: lò là món đồ, mua ở NPC bán lò (đều phẩm Phàm), mỗi lò phẩm riêng, chỉ nâng
# phẩm; phải có lò mới luyện; một mẻ ra nhiều loại đan, nguyên liệu chồng nhiều đan phương thì chia đều theo vòng (vòng lẻ ngẫu nhiên);
# một tỉ lệ chung theo tổng số bộ, mỗi loại đan tung riêng; không báo trước đan gì, tỉ lệ bao nhiêu.
# Đổi số ở data/ sau khi đã áp thì chạy lại thành migration MỚI (không sửa file đã áp).
import json, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
C = json.loads((ROOT / 'data/cave.json').read_text(encoding='utf-8'))
L = C['lo']
cfg = {k: L[k] for k in ('base', 'per_set', 'phat_dan', 'floor', 'max', 'pham', 'gia_mua', 'max_lo', 'nang')}
cfg['so_kieu'] = len(L['kieu'])
cfg['dan'] = {k: {'r': p['recipe'], 'm': p.get('make', 1), 'p': p.get('pham', 0)} for k, p in C['pills'].items() if p.get('recipe')}
CFG = json.dumps(cfg, ensure_ascii=False, separators=(',', ':'))

NOTE = sys.argv[1] if len(sys.argv) > 1 else ""   # dòng ghi chú thêm cho migration mới (vd lý do chạy lại)
print(f"""-- Lò luyện đan (chủ dự án 20/11/2026 13:3x–16:1x). SINH BẰNG tools/lo-dan-sql.py từ data/cave.json, không sửa tay.{NOTE}
-- Lò là món đồ: cột lo_ds = mảng {{id, k (kiểu 0–{cfg['so_kieu'] - 1}), ph (phẩm 0 Phàm … 6 Thượng Cổ)}}, lo_dung = mã lò đang đặt. Bản lưu có
-- data.lo = {{ds, dung}} chỉ để máy khách hiện; mọi hàm chỉ đọc cột nên máy khách sửa data.lo không có tác dụng.
--   p2d_mua_lo(kiểu): trừ gia_mua Linh Thạch, thêm một lò phẩm Phàm (tối đa max_lo lò); chưa đặt lò nào thì đặt luôn lò này.
--   p2d_dat_lo(mã): đặt lò đang có.   p2d_nang_lo(mã): nâng lên phẩm kế, giá nang[phẩm hiện tại] (Linh Thạch + Tinh Thiết).
--   p2d_lo_cua_toi(): {{ds, dung}}.
--   p2d_luyen_dan({{mã: số}}): cần lò đang đặt. Kiểm nguyên liệu trong bản lưu máy chủ, ghép đan phương: các đan ghép được chia đều theo vòng,
--     mỗi vòng mỗi đan một bộ (gộp k vòng trọn một lần), vòng lẻ cuối theo thứ tự ngẫu nhiên; phần không ghép được mất. Tỉ lệ chung
--     = base + pham[phẩm lò] − per_set × (tổng số bộ − 1); mỗi loại đan tung riêng với tỉ lệ chung − phat_dan × phẩm đan (16:1x: phẩm đan
--     càng cao tỉ lệ càng thấp), kẹp [floor, max]; thành thì cộng make × bộ viên.

alter table public.p2d_nhan_vat add column if not exists lo_ds jsonb not null default '[]'::jsonb;
alter table public.p2d_nhan_vat add column if not exists lo_dung text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'p2d_nhan_vat_lo_ds_chk') then
    alter table public.p2d_nhan_vat add constraint p2d_nhan_vat_lo_ds_chk check (jsonb_typeof(lo_ds) = 'array' and jsonb_array_length(lo_ds) <= {cfg['max_lo']});
  end if;
end $$;

-- cấu hình chung (một chỗ, các hàm dưới đọc)
create or replace function public.p2d_lo_cfg() returns jsonb language sql immutable set search_path = '' as $$
  select '{CFG}'::jsonb;
$$;
revoke all on function public.p2d_lo_cfg() from public, anon, authenticated;

-- ghi lò vào bản lưu cho máy khách hiện (cột mới là gốc)
create or replace function public.p2d_lo_vao_ban_luu(p_data jsonb, p_ds jsonb, p_dung text) returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_set(coalesce(p_data, '{{}}'::jsonb), '{{lo}}', jsonb_build_object('ds', p_ds, 'dung', p_dung));
$$;
revoke all on function public.p2d_lo_vao_ban_luu(jsonb, jsonb, text) from public, anon, authenticated;

create or replace function public.p2d_lo_cua_toi()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ds', n.lo_ds, 'dung', n.lo_dung) from public.p2d_nhan_vat n where n.user_id = public.p2d_uid();
$$;
revoke all on function public.p2d_lo_cua_toi() from public, anon;
grant execute on function public.p2d_lo_cua_toi() to authenticated;

create or replace function public.p2d_mua_lo(p_k integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := public.p2d_lo_cfg();
  v_nv public.p2d_nhan_vat%rowtype; v_lt numeric; v_gia numeric := (v_cfg ->> 'gia_mua')::numeric; v_lo jsonb; v_pb integer;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_k is null or p_k < 0 or p_k >= (v_cfg ->> 'so_kieu')::integer then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if jsonb_array_length(v_nv.lo_ds) >= (v_cfg ->> 'max_lo')::integer then raise exception 'lo_day' using errcode = '22023'; end if;
  v_lt := coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0);
  if v_lt < v_gia then raise exception 'thieu' using errcode = '22023'; end if;
  v_lo := jsonb_build_object('id', 'l' || substr(md5(gen_random_uuid()::text), 1, 8), 'k', p_k, 'ph', 0);
  v_nv.lo_ds := v_nv.lo_ds || jsonb_build_array(v_lo);
  v_nv.lo_dung := coalesce(v_nv.lo_dung, v_lo ->> 'id');
  v_nv.data := public.p2d_lo_vao_ban_luu(jsonb_set(v_nv.data, '{{lingshi}}', to_jsonb(v_lt - v_gia)), v_nv.lo_ds, v_nv.lo_dung);
  perform set_config('p2d.ly_do', 'mua_lo', true);
  update public.p2d_nhan_vat set data = v_nv.data, lo_ds = v_nv.lo_ds, lo_dung = v_nv.lo_dung, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('lo', v_lo, 'ds', v_nv.lo_ds, 'dung', v_nv.lo_dung, 'lt', v_gia, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_mua_lo(integer) from public, anon;
grant execute on function public.p2d_mua_lo(integer) to authenticated;

create or replace function public.p2d_dat_lo(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_me uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_pb integer;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if not exists (select 1 from jsonb_array_elements(v_nv.lo_ds) x where x ->> 'id' = p_id) then raise exception 'khong_co_lo' using errcode = '22023'; end if;
  v_nv.data := public.p2d_lo_vao_ban_luu(v_nv.data, v_nv.lo_ds, p_id);
  update public.p2d_nhan_vat set data = v_nv.data, lo_dung = p_id, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('ds', v_nv.lo_ds, 'dung', p_id, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_dat_lo(text) from public, anon;
grant execute on function public.p2d_dat_lo(text) to authenticated;

create or replace function public.p2d_nang_lo(p_id text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := public.p2d_lo_cfg();
  v_nv public.p2d_nhan_vat%rowtype; v_i integer; v_ph integer; v_gia jsonb; v_lt numeric; v_tt numeric; v_pb integer;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  select o - 1 into v_i from jsonb_array_elements(v_nv.lo_ds) with ordinality as t(x, o) where x ->> 'id' = p_id;
  if v_i is null then raise exception 'khong_co_lo' using errcode = '22023'; end if;
  v_ph := (v_nv.lo_ds -> v_i ->> 'ph')::integer;
  if v_ph >= jsonb_array_length(v_cfg -> 'nang') then raise exception 'lo_toi_da' using errcode = '22023'; end if;
  v_gia := v_cfg -> 'nang' -> v_ph;
  v_lt := coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0);
  v_tt := coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tinh-thiet'), 0);
  if v_lt < (v_gia ->> 'lt')::numeric or v_tt < (v_gia ->> 'tt')::numeric then raise exception 'thieu' using errcode = '22023'; end if;
  v_nv.lo_ds := jsonb_set(v_nv.lo_ds, array[v_i::text, 'ph'], to_jsonb(v_ph + 1));
  v_nv.data := jsonb_set(v_nv.data, '{{lingshi}}', to_jsonb(v_lt - (v_gia ->> 'lt')::numeric));
  v_nv.data := jsonb_set(v_nv.data, '{{mats,tinh-thiet}}', to_jsonb(v_tt - (v_gia ->> 'tt')::numeric));
  v_nv.data := public.p2d_lo_vao_ban_luu(v_nv.data, v_nv.lo_ds, v_nv.lo_dung);
  perform set_config('p2d.ly_do', 'nang_lo', true);
  update public.p2d_nhan_vat set data = v_nv.data, lo_ds = v_nv.lo_ds, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('lo', v_nv.lo_ds -> v_i, 'ds', v_nv.lo_ds, 'dung', v_nv.lo_dung, 'lt', (v_gia ->> 'lt')::numeric, 'tt', (v_gia ->> 'tt')::numeric, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_nang_lo(text) from public, anon;
grant execute on function public.p2d_nang_lo(text) to authenticated;

create or replace function public.p2d_luyen_dan(p_o jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := public.p2d_lo_cfg();
  v_nv public.p2d_nhan_vat%rowtype; v_k text; v_n jsonb; v_p record; v_r record; v_con jsonb := p_o; v_ph integer;
  v_b integer; v_tong integer := 0; v_ds jsonb := '[]'::jsonb; v_d jsonb; v_rate numeric := 0; v_ok boolean; v_vien integer;
  v_thanh boolean := false; v_tvien integer := 0; v_out jsonb := '[]'::jsonb; v_pb integer;
  v_i integer; v_f jsonb; v_need jsonb; v_sets jsonb := '{{}}'::jsonb;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_o is null or jsonb_typeof(p_o) <> 'object' or (select count(*) from jsonb_object_keys(p_o)) not between 1 and 9 then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  for v_k, v_n in select key, value from jsonb_each(p_o) loop
    if v_k !~ '^[a-z0-9-]{{1,40}}$' or jsonb_typeof(v_n) <> 'number' or (v_n #>> '{{}}')::numeric <> floor((v_n #>> '{{}}')::numeric)
       or (v_n #>> '{{}}')::numeric not between 1 and 99999 then
      raise exception 'du_lieu_sai' using errcode = '22023';
    end if;
  end loop;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  select (x ->> 'ph')::integer into v_ph from jsonb_array_elements(v_nv.lo_ds) x where x ->> 'id' = v_nv.lo_dung;
  if v_ph is null then raise exception 'chua_co_lo' using errcode = '22023'; end if;
  for v_k, v_n in select key, value from jsonb_each(p_o) loop
    if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k), 0) < (v_n #>> '{{}}')::numeric then raise exception 'thieu_nl' using errcode = '22023'; end if;
  end loop;
  -- ghép đan phương: chia đều theo vòng, gộp k vòng trọn một lần; không đủ một vòng trọn thì một vòng lẻ theo thứ tự ngẫu nhiên
  for v_i in 1..500 loop
    v_f := '[]'::jsonb; v_need := '{{}}'::jsonb;
    for v_p in select key, value from jsonb_each(v_cfg -> 'dan') loop
      if not exists (select 1 from jsonb_each(v_p.value -> 'r') r where coalesce((v_con ->> r.key)::numeric, 0) < (r.value #>> '{{}}')::numeric) then
        v_f := v_f || jsonb_build_array(v_p.key);
        for v_r in select key, value from jsonb_each(v_p.value -> 'r') loop
          v_need := jsonb_set(v_need, array[v_r.key], to_jsonb(coalesce((v_need ->> v_r.key)::numeric, 0) + (v_r.value #>> '{{}}')::numeric));
        end loop;
      end if;
    end loop;
    exit when jsonb_array_length(v_f) = 0;
    select min(floor((v_con ->> key)::numeric / (value #>> '{{}}')::numeric))::integer into v_b from jsonb_each(v_need);
    if v_b >= 1 then
      for v_r in select key, value from jsonb_each(v_need) loop
        v_con := jsonb_set(v_con, array[v_r.key], to_jsonb((v_con ->> v_r.key)::numeric - v_b * (v_r.value #>> '{{}}')::numeric));
      end loop;
      for v_k in select jsonb_array_elements_text(v_f) loop
        v_sets := jsonb_set(v_sets, array[v_k], to_jsonb(coalesce((v_sets ->> v_k)::integer, 0) + v_b));
      end loop;
    else
      for v_k in select x from jsonb_array_elements_text(v_f) x order by random() loop
        if not exists (select 1 from jsonb_each(v_cfg -> 'dan' -> v_k -> 'r') r where coalesce((v_con ->> r.key)::numeric, 0) < (r.value #>> '{{}}')::numeric) then
          for v_r in select key, value from jsonb_each(v_cfg -> 'dan' -> v_k -> 'r') loop
            v_con := jsonb_set(v_con, array[v_r.key], to_jsonb((v_con ->> v_r.key)::numeric - (v_r.value #>> '{{}}')::numeric));
          end loop;
          v_sets := jsonb_set(v_sets, array[v_k], to_jsonb(coalesce((v_sets ->> v_k)::integer, 0) + 1));
        end if;
      end loop;
    end if;
  end loop;
  for v_k, v_n in select key, value from jsonb_each(v_sets) loop
    v_ds := v_ds || jsonb_build_array(jsonb_build_object('dan', v_k, 'bo', (v_n #>> '{{}}')::integer, 'm', (v_cfg -> 'dan' -> v_k ->> 'm')::integer));
    v_tong := v_tong + (v_n #>> '{{}}')::integer;
  end loop;
  if v_tong > 0 then   -- một tỉ lệ chung theo tổng số bộ (chưa kẹp); mỗi loại đan trừ thêm theo phẩm đan rồi mới kẹp, tung riêng
    v_rate := (v_cfg ->> 'base')::numeric + coalesce((v_cfg -> 'pham' ->> v_ph)::numeric, 0) - (v_cfg ->> 'per_set')::numeric * (v_tong - 1);
  end if;
  for v_k, v_n in select key, value from jsonb_each(p_o) loop   -- mọi nguyên liệu bỏ vào đều mất
    v_nv.data := jsonb_set(v_nv.data, array['mats', v_k], to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k) - (v_n #>> '{{}}')::numeric));
  end loop;
  for v_d in select value from jsonb_array_elements(v_ds) loop
    v_ok := random() < greatest((v_cfg ->> 'floor')::numeric, least((v_cfg ->> 'max')::numeric,
      v_rate - (v_cfg ->> 'phat_dan')::numeric * coalesce((v_cfg -> 'dan' -> (v_d ->> 'dan') ->> 'p')::numeric, 0)));
    v_vien := case when v_ok then (v_d ->> 'm')::integer * (v_d ->> 'bo')::integer else 0 end;
    if v_ok then
      if jsonb_typeof(v_nv.data -> 'pills') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{{pills}}', '{{}}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['pills', v_d ->> 'dan'], to_jsonb(coalesce(public.p2d_ky_so(v_nv.data -> 'pills' -> (v_d ->> 'dan')), 0) + v_vien));
      v_thanh := true; v_tvien := v_tvien + v_vien;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('dan', v_d ->> 'dan', 'bo', (v_d ->> 'bo')::integer, 'vien', v_vien, 'thanh', v_ok));
  end loop;
  perform set_config('p2d.ly_do', 'luyen_dan', true);
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('ds', v_out, 'thanh', v_thanh, 'vien', v_tvien, 'bo', v_tong, 'tru', p_o, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_luyen_dan(jsonb) from public, anon;
grant execute on function public.p2d_luyen_dan(jsonb) to authenticated;""")
