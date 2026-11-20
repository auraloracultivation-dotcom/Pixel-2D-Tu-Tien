-- Lò luyện đan do máy chủ quyết (chủ dự án 20/11/2026 13:3x–13:4x; "số lượng và loại sẽ do máy chủ tính, tỷ lệ thành công cũng vậy").
-- Túi đồ → Luyện đan: 1 ô lò + 9 ô nguyên liệu. Người chơi gửi {mã nguyên liệu: số} (1–9 loại); máy chủ kiểm có đủ trong bản lưu,
-- ghép đan phương: một mẻ ra được NHIỀU loại đan (14:3x). Nguyên liệu chồng nhiều đan phương thì "ngẫu nhiên chia trung bình số lượng ra"
-- (14:4x): các đan ghép được chia đều theo vòng, vòng lẻ cuối theo thứ tự ngẫu nhiên. Không báo trước đan gì, tỉ lệ bao nhiêu
-- (14:1x; đan phương xem ở Tàng Thư). Tỉ lệ chung = base + pham[phẩm lò] + per_cap × cấp lò − per_set × (tổng số bộ − 1), kẹp [floor, max];
-- mỗi loại đan tung riêng. Mọi nguyên liệu bỏ vào đều mất (phần không ghép được mất dù thành hay hỏng); loại nào thành thì cộng make × bộ viên.
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

create or replace function public.p2d_luyen_dan(p_o jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid();
  v_cfg jsonb := '{"base":0.4,"per_set":0.05,"floor":0.1,"max":0.95,"pham":[0,0.05,0.1,0.15,0.2,0.25,0.3],"per_cap":0.03,"cap_max":10,"cost":[{"lt":50000,"tt":50},{"lt":200000,"tt":100},{"lt":450000,"tt":150},{"lt":800000,"tt":200},{"lt":1250000,"tt":250},{"lt":1800000,"tt":300},{"lt":2450000,"tt":350},{"lt":3200000,"tt":400},{"lt":4050000,"tt":450},{"lt":5000000,"tt":500}],"dan":{"hoi-xuan-dan":{"r":{"linh-thao":2},"m":2},"hoi-linh-dan":{"r":{"linh-thao":3},"m":2},"thang-linh-dan":{"r":{"linh-thao":6,"hoa-linh-chi":2,"yeu-huyet":2},"m":1},"tu-khi-dan":{"r":{"linh-thao":3,"yeu-huyet":1},"m":1},"boi-nguyen-dan":{"r":{"linh-thao":4,"yeu-huyet":2,"hoa-linh-chi":1},"m":1},"thanh-tam-dan":{"r":{"linh-thao":3,"hoa-linh-chi":2},"m":1},"linh-ngu-thang":{"r":{"linh-ngu":2,"linh-thao":1},"m":2},"van-ngu-thang":{"r":{"van-ngu":2,"hoa-ly":1,"bang-ngu":1},"m":2},"tay-tuy-dan":{"r":{"yeu-vuong-dan":1,"linh-thao":6,"hoa-linh-chi":3},"m":1},"tu-van-dan":{"r":{"tu-van-sam":2,"linh-thao":2},"m":1},"tinh-lien-dan":{"r":{"thai-hu-lien":2,"ngoc-lo-hoa":1},"m":1},"nguyet-ngu-thang":{"r":{"nguyet-ngu":2,"linh-thao":2},"m":2}}}'::jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_k text; v_n jsonb; v_p record; v_r record; v_con jsonb := p_o;
  v_b integer; v_tong integer := 0; v_ds jsonb := '[]'::jsonb; v_d jsonb; v_rate numeric := 0; v_ok boolean; v_vien integer;
  v_thanh boolean := false; v_tvien integer := 0; v_out jsonb := '[]'::jsonb; v_pb integer;
  v_i integer; v_f jsonb; v_need jsonb; v_sets jsonb := '{}'::jsonb;
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
  -- ghép đan phương, "ngẫu nhiên chia trung bình số lượng ra" (14:4x): mọi đan đang ghép được chia đều theo vòng, mỗi vòng mỗi đan một bộ
  -- (gộp k vòng trọn một lần); không đủ một vòng trọn thì đi một vòng lẻ theo thứ tự ngẫu nhiên, đan nào còn ghép được lấy một bộ
  for v_i in 1..500 loop
    v_f := '[]'::jsonb; v_need := '{}'::jsonb;
    for v_p in select key, value from jsonb_each(v_cfg -> 'dan') loop
      if not exists (select 1 from jsonb_each(v_p.value -> 'r') r where coalesce((v_con ->> r.key)::numeric, 0) < (r.value #>> '{}')::numeric) then
        v_f := v_f || jsonb_build_array(v_p.key);
        for v_r in select key, value from jsonb_each(v_p.value -> 'r') loop
          v_need := jsonb_set(v_need, array[v_r.key], to_jsonb(coalesce((v_need ->> v_r.key)::numeric, 0) + (v_r.value #>> '{}')::numeric));
        end loop;
      end if;
    end loop;
    exit when jsonb_array_length(v_f) = 0;
    select min(floor((v_con ->> key)::numeric / (value #>> '{}')::numeric))::integer into v_b from jsonb_each(v_need);
    if v_b >= 1 then
      for v_r in select key, value from jsonb_each(v_need) loop
        v_con := jsonb_set(v_con, array[v_r.key], to_jsonb((v_con ->> v_r.key)::numeric - v_b * (v_r.value #>> '{}')::numeric));
      end loop;
      for v_k in select jsonb_array_elements_text(v_f) loop
        v_sets := jsonb_set(v_sets, array[v_k], to_jsonb(coalesce((v_sets ->> v_k)::integer, 0) + v_b));
      end loop;
    else
      for v_k in select x from jsonb_array_elements_text(v_f) x order by random() loop
        if not exists (select 1 from jsonb_each(v_cfg -> 'dan' -> v_k -> 'r') r where coalesce((v_con ->> r.key)::numeric, 0) < (r.value #>> '{}')::numeric) then
          for v_r in select key, value from jsonb_each(v_cfg -> 'dan' -> v_k -> 'r') loop
            v_con := jsonb_set(v_con, array[v_r.key], to_jsonb((v_con ->> v_r.key)::numeric - (v_r.value #>> '{}')::numeric));
          end loop;
          v_sets := jsonb_set(v_sets, array[v_k], to_jsonb(coalesce((v_sets ->> v_k)::integer, 0) + 1));
        end if;
      end loop;
    end if;
  end loop;
  for v_k, v_n in select key, value from jsonb_each(v_sets) loop
    v_ds := v_ds || jsonb_build_array(jsonb_build_object('dan', v_k, 'bo', (v_n #>> '{}')::integer, 'm', (v_cfg -> 'dan' -> v_k ->> 'm')::integer));
    v_tong := v_tong + (v_n #>> '{}')::integer;
  end loop;
  -- một tỉ lệ chung theo tổng số bộ; mỗi loại đan tung riêng (14:3x "Mỗi loại đan tung riêng")
  if v_tong > 0 then
    v_rate := greatest((v_cfg ->> 'floor')::numeric, least((v_cfg ->> 'max')::numeric,
      (v_cfg ->> 'base')::numeric + coalesce((v_cfg -> 'pham' ->> v_nv.lo_pham::integer)::numeric, 0) + (v_cfg ->> 'per_cap')::numeric * v_nv.lo_cap
      - (v_cfg ->> 'per_set')::numeric * (v_tong - 1)));
  end if;
  for v_k, v_n in select key, value from jsonb_each(p_o) loop   -- mọi nguyên liệu bỏ vào đều mất
    v_nv.data := jsonb_set(v_nv.data, array['mats', v_k], to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k) - (v_n #>> '{}')::numeric));
  end loop;
  for v_d in select value from jsonb_array_elements(v_ds) loop
    v_ok := random() < v_rate; v_vien := case when v_ok then (v_d ->> 'm')::integer * (v_d ->> 'bo')::integer else 0 end;
    if v_ok then
      if jsonb_typeof(v_nv.data -> 'pills') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{pills}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['pills', v_d ->> 'dan'], to_jsonb(coalesce(public.p2d_ky_so(v_nv.data -> 'pills' -> (v_d ->> 'dan')), 0) + v_vien));
      v_thanh := true; v_tvien := v_tvien + v_vien;
    end if;
    v_out := v_out || jsonb_build_array(jsonb_build_object('dan', v_d ->> 'dan', 'bo', (v_d ->> 'bo')::integer, 'vien', v_vien, 'thanh', v_ok));
  end loop;
  perform set_config('p2d.ly_do', 'luyen_dan', true);
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('ds', v_out, 'thanh', v_thanh, 'vien', v_tvien, 'bo', v_tong, 'ti_le', round(v_rate, 4), 'tru', p_o, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_luyen_dan(jsonb) from public, anon;
grant execute on function public.p2d_luyen_dan(jsonb) to authenticated;

-- Nâng lò lên một cấp: trừ Linh Thạch + Tinh Thiết theo bảng cost (cấp hiện tại c → giá cost[c])
create or replace function public.p2d_nang_lo()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid();
  v_cfg jsonb := '{"base":0.4,"per_set":0.05,"floor":0.1,"max":0.95,"pham":[0,0.05,0.1,0.15,0.2,0.25,0.3],"per_cap":0.03,"cap_max":10,"cost":[{"lt":50000,"tt":50},{"lt":200000,"tt":100},{"lt":450000,"tt":150},{"lt":800000,"tt":200},{"lt":1250000,"tt":250},{"lt":1800000,"tt":300},{"lt":2450000,"tt":350},{"lt":3200000,"tt":400},{"lt":4050000,"tt":450},{"lt":5000000,"tt":500}],"dan":{"hoi-xuan-dan":{"r":{"linh-thao":2},"m":2},"hoi-linh-dan":{"r":{"linh-thao":3},"m":2},"thang-linh-dan":{"r":{"linh-thao":6,"hoa-linh-chi":2,"yeu-huyet":2},"m":1},"tu-khi-dan":{"r":{"linh-thao":3,"yeu-huyet":1},"m":1},"boi-nguyen-dan":{"r":{"linh-thao":4,"yeu-huyet":2,"hoa-linh-chi":1},"m":1},"thanh-tam-dan":{"r":{"linh-thao":3,"hoa-linh-chi":2},"m":1},"linh-ngu-thang":{"r":{"linh-ngu":2,"linh-thao":1},"m":2},"van-ngu-thang":{"r":{"van-ngu":2,"hoa-ly":1,"bang-ngu":1},"m":2},"tay-tuy-dan":{"r":{"yeu-vuong-dan":1,"linh-thao":6,"hoa-linh-chi":3},"m":1},"tu-van-dan":{"r":{"tu-van-sam":2,"linh-thao":2},"m":1},"tinh-lien-dan":{"r":{"thai-hu-lien":2,"ngoc-lo-hoa":1},"m":1},"nguyet-ngu-thang":{"r":{"nguyet-ngu":2,"linh-thao":2},"m":2}}}'::jsonb;
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
  v_nv.data := jsonb_set(v_nv.data, '{lo}', (case when jsonb_typeof(v_nv.data -> 'lo') = 'object' then v_nv.data -> 'lo' else '{}'::jsonb end) || jsonb_build_object('ph', v_nv.lo_pham, 'cap', v_nv.lo_cap + 1));   -- giữ hình lò người chơi chọn (lo.hinh)
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
