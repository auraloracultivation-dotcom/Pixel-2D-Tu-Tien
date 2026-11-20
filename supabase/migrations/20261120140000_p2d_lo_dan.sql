-- Lò luyện đan do máy chủ quyết (chủ dự án 20/11/2026 13:3x–13:4x; "số lượng và loại sẽ do máy chủ tính, tỷ lệ thành công cũng vậy").
-- Túi đồ → Luyện đan: 1 ô lò + 9 ô nguyên liệu. Người chơi gửi {mã nguyên liệu: số} (1–9 loại); máy chủ kiểm có đủ trong bản lưu,
-- dò đan phương khớp (đủ mọi nguyên liệu của đan phương). Nhiều đan phương cùng khớp (vd Hồi Xuân và Hồi Linh đều chỉ cần Linh Thảo):
-- người chơi chọn đan muốn luyện (p_dan) trong số đan khớp; không chọn thì lấy cái dùng nhiều loại nhất, rồi nhiều cái nhất. Chọn đan
-- mà nguyên liệu không đủ đan phương đó thì hỏng như bỏ thiếu.
-- số bộ = số lần đủ đan phương; tỉ lệ = base + pham[phẩm lò] + per_cap × cấp lò − per_set × (bộ − 1), kẹp [floor, max].
-- Mọi nguyên liệu bỏ vào đều mất (phần thừa mất dù thành hay hỏng); thành thì cộng make × bộ viên đan.
-- Số chép từ data/cave.json → lo, pills.*.recipe / make (sinh lúc viết migration); sửa số ở data/ thì thêm migration thay v_cfg.
-- Lò: cột lo_pham (0 Phàm … 6 Thượng Cổ), lo_cap (0–10) trên p2d_nhan_vat; bản lưu có data.lo = {ph, cap} chỉ để máy khách hiện,
-- hàm chỉ đọc cột nên máy khách sửa data.lo không có tác dụng. Phẩm lò cao hơn: chưa có cách kiếm (chờ chủ dự án), mọi người lò Phàm.

alter table public.p2d_nhan_vat add column if not exists lo_pham smallint not null default 0;
alter table public.p2d_nhan_vat add column if not exists lo_cap smallint not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'p2d_nhan_vat_lo_chk') then
    alter table public.p2d_nhan_vat add constraint p2d_nhan_vat_lo_chk check (lo_pham between 0 and 6 and lo_cap between 0 and 10);
  end if;
end $$;

create or replace function public.p2d_luyen_dan(p_o jsonb, p_dan text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid();
  v_cfg jsonb := '{"base":0.4,"per_set":0.05,"floor":0.1,"max":0.95,"pham":[0,0.05,0.1,0.15,0.2,0.25,0.3],"per_cap":0.03,"cap_max":10,"cost":[{"lt":5000,"tt":5},{"lt":20000,"tt":10},{"lt":45000,"tt":15},{"lt":80000,"tt":20},{"lt":125000,"tt":25},{"lt":180000,"tt":30},{"lt":245000,"tt":35},{"lt":320000,"tt":40},{"lt":405000,"tt":45},{"lt":500000,"tt":50}],"dan":{"hoi-xuan-dan":{"r":{"linh-thao":2},"m":2},"hoi-linh-dan":{"r":{"linh-thao":3},"m":2},"thang-linh-dan":{"r":{"linh-thao":6,"hoa-linh-chi":2,"yeu-huyet":2},"m":1},"tu-khi-dan":{"r":{"linh-thao":3,"yeu-huyet":1},"m":1},"boi-nguyen-dan":{"r":{"linh-thao":4,"yeu-huyet":2,"hoa-linh-chi":1},"m":1},"thanh-tam-dan":{"r":{"linh-thao":3,"hoa-linh-chi":2},"m":1},"linh-ngu-thang":{"r":{"linh-ngu":2,"linh-thao":1},"m":2},"van-ngu-thang":{"r":{"van-ngu":2,"hoa-ly":1,"bang-ngu":1},"m":2},"tay-tuy-dan":{"r":{"yeu-vuong-dan":1,"linh-thao":6,"hoa-linh-chi":3},"m":1},"tu-van-dan":{"r":{"tu-van-sam":2,"linh-thao":2},"m":1},"tinh-lien-dan":{"r":{"thai-hu-lien":2,"ngoc-lo-hoa":1},"m":1},"nguyet-ngu-thang":{"r":{"nguyet-ngu":2,"linh-thao":2},"m":2}}}'::jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_k text; v_n jsonb; v_p record; v_r record;
  v_dan text; v_bo integer := 0; v_loai integer := -1; v_tong numeric := -1; v_make integer := 0;
  v_b integer; v_cnt integer; v_sum numeric; v_rate numeric := 0; v_ok boolean := false; v_vien integer := 0; v_pb integer;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_o is null or jsonb_typeof(p_o) <> 'object' or (select count(*) from jsonb_object_keys(p_o)) not between 1 and 9 then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  for v_k, v_n in select key, value from jsonb_each(p_o) loop
    if v_k !~ '^[a-z0-9-]{1,40}$' or jsonb_typeof(v_n) <> 'number' or (v_n #>> '{}')::numeric <> floor((v_n #>> '{}')::numeric)
       or (v_n #>> '{}')::numeric not between 1 and 99999 then
      raise exception 'du_lieu_sai' using errcode = '22023';
    end if;
  end loop;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  for v_k, v_n in select key, value from jsonb_each(p_o) loop
    if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k), 0) < (v_n #>> '{}')::numeric then raise exception 'thieu_nl' using errcode = '22023'; end if;
  end loop;
  -- dò đan phương
  for v_p in select key, value from jsonb_each(v_cfg -> 'dan') where p_dan is null or key = p_dan order by key loop
    v_b := null; v_cnt := 0; v_sum := 0;
    for v_r in select key, value from jsonb_each(v_p.value -> 'r') loop
      v_cnt := v_cnt + 1; v_sum := v_sum + (v_r.value #>> '{}')::numeric;
      if not p_o ? v_r.key then v_b := 0; exit; end if;
      v_b := least(coalesce(v_b, 2147483647), floor((p_o ->> v_r.key)::numeric / (v_r.value #>> '{}')::numeric)::integer);
    end loop;
    if coalesce(v_b, 0) >= 1 and (v_cnt > v_loai or (v_cnt = v_loai and v_sum > v_tong)) then
      v_dan := v_p.key; v_bo := v_b; v_loai := v_cnt; v_tong := v_sum; v_make := (v_p.value ->> 'm')::integer;
    end if;
  end loop;
  if v_dan is not null then
    v_rate := greatest((v_cfg ->> 'floor')::numeric, least((v_cfg ->> 'max')::numeric,
      (v_cfg ->> 'base')::numeric + coalesce((v_cfg -> 'pham' ->> v_nv.lo_pham::integer)::numeric, 0) + (v_cfg ->> 'per_cap')::numeric * v_nv.lo_cap
      - (v_cfg ->> 'per_set')::numeric * (v_bo - 1)));
    v_ok := random() < v_rate;
  end if;
  -- trừ hết nguyên liệu đã bỏ vào
  for v_k, v_n in select key, value from jsonb_each(p_o) loop
    v_nv.data := jsonb_set(v_nv.data, array['mats', v_k], to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k) - (v_n #>> '{}')::numeric));
  end loop;
  if v_ok then
    v_vien := v_make * v_bo;
    if jsonb_typeof(v_nv.data -> 'pills') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{pills}', '{}'::jsonb); end if;
    v_nv.data := jsonb_set(v_nv.data, array['pills', v_dan], to_jsonb(coalesce(public.p2d_ky_so(v_nv.data -> 'pills' -> v_dan), 0) + v_vien));
  end if;
  perform set_config('p2d.ly_do', 'luyen_dan', true);
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('thanh', v_ok, 'dan', v_dan, 'bo', v_bo, 'vien', v_vien, 'ti_le', round(v_rate, 4), 'tru', p_o, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_luyen_dan(jsonb, text) from public, anon;
grant execute on function public.p2d_luyen_dan(jsonb, text) to authenticated;

-- Nâng lò lên một cấp: trừ Linh Thạch + Tinh Thiết theo bảng cost (cấp hiện tại c → giá cost[c])
create or replace function public.p2d_nang_lo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid();
  v_cfg jsonb := '{"base":0.4,"per_set":0.05,"floor":0.1,"max":0.95,"pham":[0,0.05,0.1,0.15,0.2,0.25,0.3],"per_cap":0.03,"cap_max":10,"cost":[{"lt":5000,"tt":5},{"lt":20000,"tt":10},{"lt":45000,"tt":15},{"lt":80000,"tt":20},{"lt":125000,"tt":25},{"lt":180000,"tt":30},{"lt":245000,"tt":35},{"lt":320000,"tt":40},{"lt":405000,"tt":45},{"lt":500000,"tt":50}],"dan":{"hoi-xuan-dan":{"r":{"linh-thao":2},"m":2},"hoi-linh-dan":{"r":{"linh-thao":3},"m":2},"thang-linh-dan":{"r":{"linh-thao":6,"hoa-linh-chi":2,"yeu-huyet":2},"m":1},"tu-khi-dan":{"r":{"linh-thao":3,"yeu-huyet":1},"m":1},"boi-nguyen-dan":{"r":{"linh-thao":4,"yeu-huyet":2,"hoa-linh-chi":1},"m":1},"thanh-tam-dan":{"r":{"linh-thao":3,"hoa-linh-chi":2},"m":1},"linh-ngu-thang":{"r":{"linh-ngu":2,"linh-thao":1},"m":2},"van-ngu-thang":{"r":{"van-ngu":2,"hoa-ly":1,"bang-ngu":1},"m":2},"tay-tuy-dan":{"r":{"yeu-vuong-dan":1,"linh-thao":6,"hoa-linh-chi":3},"m":1},"tu-van-dan":{"r":{"tu-van-sam":2,"linh-thao":2},"m":1},"tinh-lien-dan":{"r":{"thai-hu-lien":2,"ngoc-lo-hoa":1},"m":1},"nguyet-ngu-thang":{"r":{"nguyet-ngu":2,"linh-thao":2},"m":2}}}'::jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_gia jsonb; v_lt numeric; v_tt numeric; v_pb integer;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.lo_cap >= (v_cfg ->> 'cap_max')::integer then raise exception 'lo_toi_da' using errcode = '22023'; end if;
  v_gia := v_cfg -> 'cost' -> v_nv.lo_cap::integer;
  v_lt := coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0);
  v_tt := coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tinh-thiet'), 0);
  if v_lt < (v_gia ->> 'lt')::numeric or v_tt < (v_gia ->> 'tt')::numeric then raise exception 'thieu' using errcode = '22023'; end if;
  v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - (v_gia ->> 'lt')::numeric));
  v_nv.data := jsonb_set(v_nv.data, '{mats,tinh-thiet}', to_jsonb(v_tt - (v_gia ->> 'tt')::numeric));
  v_nv.data := jsonb_set(v_nv.data, '{lo}', jsonb_build_object('ph', v_nv.lo_pham, 'cap', v_nv.lo_cap + 1));
  perform set_config('p2d.ly_do', 'nang_lo', true);
  update public.p2d_nhan_vat set data = v_nv.data, lo_cap = v_nv.lo_cap + 1, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('cap', v_nv.lo_cap + 1, 'ph', v_nv.lo_pham, 'lt', (v_gia ->> 'lt')::numeric, 'tt', (v_gia ->> 'tt')::numeric, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_nang_lo() from public, anon;
grant execute on function public.p2d_nang_lo() to authenticated;

-- Lò của mình (lúc mở bảng Luyện đan): đọc cột, không sửa gì
create or replace function public.p2d_lo_cua_toi()
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ph', n.lo_pham, 'cap', n.lo_cap) from public.p2d_nhan_vat n where n.user_id = public.p2d_uid();
$$;
revoke all on function public.p2d_lo_cua_toi() from public, anon;
grant execute on function public.p2d_lo_cua_toi() to authenticated;
