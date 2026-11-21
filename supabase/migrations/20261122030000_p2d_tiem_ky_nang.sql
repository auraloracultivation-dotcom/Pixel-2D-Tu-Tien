-- Tiềm năng và Kỹ năng phía máy chủ (chủ dự án 21/11/2026 17:23 làm hai tính năng; 22/11/2026 rạng sáng chọn "Viết, chạy thử, chờ anh duyệt";
-- thiết kế ở docs/15-TIEM-NANG-KY-NANG.md). CHƯA ÁP lên máy chủ thật: chờ chủ dự án nói lời đưa lên.
-- 1) Bảng p2d_ky_cfg dòng 'tn' (node tools/ky-cfg.mjs tn, dựng từ data/tiem-nang.json, data/ky-nang.json, data/story.json; tools/check.mjs so).
-- 2) Huyết mạch quay ở máy chủ: bảng p2d_tiem_nang (một dòng mỗi người, không ai sửa được từ máy khách), hàm p2d_quay_toc() cho máy khách gọi lúc làm lễ
--    (src/net/tiem-nang.js). Một đời một lượt: đã có dòng thì trả lại đúng dòng đó.
-- 3) Trigger p2d_kiem_tiem_kn khi lưu:
--    - data.tiem: tộc và chỉ số gốc luôn lấy theo p2d_tiem_nang (chưa có thì máy chủ quay luôn); điểm tiềm năng kẹp theo cảnh giới (5 điểm mỗi đại cảnh giới,
--      trần từng chỉ số). Khác thì đè và trả về máy khách (p2d.sua → tiem). Tộc / gốc sửa tay khi máy chủ đã có dòng: nghi vấn 'tiem'.
--    - data.knSach, knTrong, knMoc: tổng sách quy ra cấp 1 (cuốn cấp n = 2^(n-1) cuốn cấp 1) cộng sách trống không vượt số khoá học đã mở (cờ kn-*) cộng số
--      mốc nhiệm vụ chính đã qua theo bước truyện (mỗi 5 nhiệm vụ một sách); sai thì giữ bản cũ, trả về máy khách (p2d.sua → kn), nghi vấn 'kn_sach'.
--    Nghi vấn tối đa một dòng mỗi 10 phút cho mỗi lý do. Không sửa dữ liệu đang có, chỉ xét lần lưu mới.

insert into public.p2d_ky_cfg (k, v) values ('tn', '{"toc":{"nhan":{"w":34,"huong":{"atk_pct":0.34,"hp_pct":0.33,"def_pct":0.33}},"linh":{"w":22,"huong":{"cdr":0.5,"atk_pct":0.3,"crit":0.2}},"yeu":{"w":20,"huong":{"lifesteal":0.4,"crit":0.3,"atk_pct":0.3}},"co":{"w":12,"huong":{"hp_pct":0.45,"def_pct":0.35,"thorns":0.2}},"hu":{"w":8,"huong":{"crit_dmg":0.45,"crit":0.35,"cdr":0.2}},"than":{"w":3,"huong":{"atk_pct":0.5,"crit_dmg":0.25,"hp_pct":0.25}},"tien":{"w":1,"huong":{"cdr":0.4,"hp_pct":0.3,"atk_pct":0.3}}},"tong":[6,10],"lech":0.25,"diem":{"moi":5,"tran":20,"tran_rieng":{"cdr":10},"chi_so":["atk_pct","hp_pct","def_pct","crit","crit_dmg","cdr"]},"kn":{"nv":[3,4,5,6,8,10,11,13,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,27],"moc":5,"sach_moc":1,"co":["kn-pha-van","kn-linh-nhan","kn-liep-phong"],"ids":["pha-van-thuc","viem-nhan","han-nhan","dang-nhan","kim-nhan","thach-nhan","liep-phong-bo"],"ghep":2,"max":10}}'::jsonb)
on conflict (k) do update set v = excluded.v;

create table if not exists public.p2d_tiem_nang (
  user_id uuid primary key references auth.users (id) on delete cascade,
  toc     text not null,
  goc     jsonb not null,
  luc     timestamptz not null default now()
);
alter table public.p2d_tiem_nang enable row level security;
revoke all on table public.p2d_tiem_nang from anon, authenticated;
grant select on table public.p2d_tiem_nang to authenticated;
drop policy if exists p2d_tiem_nang_doc on public.p2d_tiem_nang;
create policy p2d_tiem_nang_doc on public.p2d_tiem_nang for select to authenticated using (user_id = (select auth.uid()));

-- Quay một lượt theo dòng cấu hình 'tn' (giống src/game/tiem-nang.js quay): tộc theo tỉ lệ w, tổng điểm trong khoảng tong, chia theo huong, mỗi phần lệch ± lech
create or replace function public.p2d_tn_quay(p_c jsonb)
returns jsonb language plpgsql volatile set search_path = ''
as $$
declare
  v_w numeric; v_r numeric; v_e record; v_toc text; v_tong numeric; v_p numeric; v_sum numeric := 0;
  v_lech numeric := coalesce((p_c ->> 'lech')::numeric, 0); v_ph jsonb := '{}'; v_goc jsonb := '{}';
begin
  select sum((value ->> 'w')::numeric) into v_w from jsonb_each(p_c -> 'toc');
  v_r := random()::numeric * v_w;
  for v_e in select key, value from jsonb_each(p_c -> 'toc') order by key loop
    v_toc := v_e.key; v_r := v_r - (v_e.value ->> 'w')::numeric;
    exit when v_r < 0;
  end loop;
  v_tong := (p_c -> 'tong' ->> 0)::numeric + ((p_c -> 'tong' ->> 1)::numeric - (p_c -> 'tong' ->> 0)::numeric) * random()::numeric;
  for v_e in select key, value from jsonb_each(p_c -> 'toc' -> v_toc -> 'huong') loop
    v_p := (v_e.value #>> '{}')::numeric * (1 + (random()::numeric * 2 - 1) * v_lech);
    v_ph := v_ph || jsonb_build_object(v_e.key, v_p); v_sum := v_sum + v_p;
  end loop;
  for v_e in select key, value from jsonb_each(v_ph) loop
    v_goc := v_goc || jsonb_build_object(v_e.key, round(v_tong * (v_e.value #>> '{}')::numeric / v_sum, 1));
  end loop;
  return jsonb_build_object('toc', v_toc, 'goc', v_goc);
end;
$$;
revoke all on function public.p2d_tn_quay(jsonb) from public, anon, authenticated;

-- Điểm tiềm năng đã cộng, kẹp đúng luật: theo thứ tự chi_so, mỗi chỉ số tối đa tran (tran_rieng), tổng tối đa moi × cảnh giới (như src/game/tiem-nang.js congCua)
create or replace function public.p2d_tn_cong(p_cong jsonb, p_c jsonb, p_realm integer)
returns jsonb language plpgsql immutable set search_path = ''
as $$
declare v_out jsonb := '{}'; v_con integer := (p_c -> 'diem' ->> 'moi')::integer * greatest(coalesce(p_realm, 0), 0); v_k text; v_n integer; v_tran integer;
begin
  if p_cong is null or jsonb_typeof(p_cong) <> 'object' then return v_out; end if;
  for v_k in select x from jsonb_array_elements_text(p_c -> 'diem' -> 'chi_so') with ordinality t(x, i) order by i loop
    v_n := case when jsonb_typeof(p_cong -> v_k) = 'number' then least(greatest(floor((p_cong ->> v_k)::numeric), 0), 1000000)::integer else 0 end;
    v_tran := coalesce((p_c -> 'diem' -> 'tran_rieng' ->> v_k)::integer, (p_c -> 'diem' ->> 'tran')::integer);
    v_n := least(v_n, v_tran, v_con);
    if v_n > 0 then v_out := v_out || jsonb_build_object(v_k, v_n); v_con := v_con - v_n; end if;
  end loop;
  return v_out;
end;
$$;
revoke all on function public.p2d_tn_cong(jsonb, jsonb, integer) from public, anon, authenticated;

-- Sách kỹ năng trong một bản lưu có đúng luật không (xem đầu tệp)
create or replace function public.p2d_kn_hop_le(p_d jsonb, p_c jsonb)
returns boolean language plpgsql immutable set search_path = ''
as $$
declare
  v_ks jsonb := p_d -> 'knSach'; v_nvs jsonb := p_c -> 'kn' -> 'nv'; v_e record; v_x record; v_v numeric;
  v_w numeric := 0; v_tr numeric; v_mc numeric; v_buoc integer; v_moc integer; v_hoc integer;
begin
  if v_ks is not null and v_ks <> 'null'::jsonb then
    if jsonb_typeof(v_ks) <> 'object' then return false; end if;
    for v_e in select key, value from jsonb_each(v_ks) loop
      if not ((p_c -> 'kn' -> 'ids') ? v_e.key) or jsonb_typeof(v_e.value) <> 'array' or jsonb_array_length(v_e.value) > (p_c -> 'kn' ->> 'max')::integer then return false; end if;
      for v_x in select x, i from jsonb_array_elements(v_e.value) with ordinality t(x, i) loop
        if jsonb_typeof(v_x.x) <> 'number' then return false; end if;
        v_v := (v_x.x #>> '{}')::numeric;
        if v_v < 0 or v_v <> floor(v_v) or v_v > 100000 then return false; end if;
        v_w := v_w + v_v * power(2::numeric, v_x.i - 1);
      end loop;
    end loop;
  end if;
  v_tr := case when p_d -> 'knTrong' is null or p_d -> 'knTrong' = 'null'::jsonb then 0 when jsonb_typeof(p_d -> 'knTrong') = 'number' then (p_d ->> 'knTrong')::numeric else -1 end;
  v_mc := case when p_d -> 'knMoc' is null or p_d -> 'knMoc' = 'null'::jsonb then 0 when jsonb_typeof(p_d -> 'knMoc') = 'number' then (p_d ->> 'knMoc')::numeric else -1 end;
  if v_tr < 0 or v_mc < 0 or v_tr <> floor(v_tr) or v_mc <> floor(v_mc) then return false; end if;
  v_buoc := case when jsonb_typeof(p_d -> 'step') = 'number' then least(greatest(floor((p_d ->> 'step')::numeric), 0), jsonb_array_length(v_nvs) - 1)::integer else 0 end;
  v_moc := floor(coalesce((v_nvs ->> v_buoc)::numeric, 0) / (p_c -> 'kn' ->> 'moc')::numeric)::integer;
  select count(*) into v_hoc from jsonb_array_elements_text(p_c -> 'kn' -> 'co') f where (p_d -> 'flags' ->> f) = 'true';
  return v_mc <= v_moc and v_w + v_tr <= v_hoc + v_moc * (p_c -> 'kn' ->> 'sach_moc')::numeric;
end;
$$;
revoke all on function public.p2d_kn_hop_le(jsonb, jsonb) from public, anon, authenticated;

-- Máy khách gọi lúc làm lễ gọi tên huyết mạch: đã có thì trả lại, chưa có thì quay một lượt và ghi
create or replace function public.p2d_quay_toc()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := (select auth.uid()); v_c jsonb := (select v from public.p2d_ky_cfg where k = 'tn'); v_r jsonb; v_toc text; v_goc jsonb;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if v_c is null then raise exception 'chua_mo' using errcode = 'P0001'; end if;
  select n.toc, n.goc into v_toc, v_goc from public.p2d_tiem_nang n where n.user_id = v_uid;
  if not found then
    v_r := public.p2d_tn_quay(v_c);
    insert into public.p2d_tiem_nang (user_id, toc, goc) values (v_uid, v_r ->> 'toc', v_r -> 'goc') on conflict (user_id) do nothing;
    select n.toc, n.goc into v_toc, v_goc from public.p2d_tiem_nang n where n.user_id = v_uid;
  end if;
  return jsonb_build_object('toc', v_toc, 'goc', v_goc);
end;
$$;
revoke all on function public.p2d_quay_toc() from public, anon;
grant execute on function public.p2d_quay_toc() to authenticated;

create or replace function public.p2d_kiem_tiem_kn()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_c jsonb := (select v from public.p2d_ky_cfg where k = 'tn');
  v_t jsonb := new.data -> 'tiem';
  v_realm integer := case when jsonb_typeof(new.data -> 'realm') = 'number' then least(greatest(floor((new.data ->> 'realm')::numeric), 0), 8)::integer else coalesce(new.canh_gioi, 0) end;
  v_toc text; v_goc jsonb; v_moi_sv boolean := false; v_dung jsonb; v_okn jsonb; v_k text;
  v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '{}';
begin
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
    v_dung := jsonb_build_object('toc', v_toc, 'goc', v_goc, 'cong', public.p2d_tn_cong(v_t -> 'cong', v_c, v_realm),
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
revoke all on function public.p2d_kiem_tiem_kn() from public, anon, authenticated;

create or replace trigger p2d_kiem_tiem_kn before insert or update of data on public.p2d_nhan_vat
for each row execute function public.p2d_kiem_tiem_kn();

-- Tự kiểm tra (hoàn tác dữ liệu thử)
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000d4'; v_c jsonb := (select v from public.p2d_ky_cfg where k = 'tn');
  r jsonb; i integer; d jsonb; v_dem jsonb := '{}'; v_tong numeric; v_toc text; v_khac text; v_buoc integer;
begin
  begin
    -- quay 3000 lượt: tộc có thật, tổng trong khoảng, chỉ số đúng hướng, đủ bảy tộc
    for i in 1 .. 3000 loop
      r := public.p2d_tn_quay(v_c);
      if not ((v_c -> 'toc') ? (r ->> 'toc')) then v_hong := v_hong || ' | tộc lạ ' || coalesce(r ->> 'toc', '?'); exit; end if;
      select sum(value::numeric) into v_tong from jsonb_each_text(r -> 'goc');
      if v_tong < 5.8 or v_tong > 10.2 then v_hong := v_hong || ' | tổng điểm ' || v_tong; exit; end if;
      if exists (select 1 from jsonb_object_keys(r -> 'goc') k where not (v_c -> 'toc' -> (r ->> 'toc') -> 'huong' ? k)) then v_hong := v_hong || ' | chỉ số ngoài hướng'; exit; end if;
      v_dem := jsonb_set(v_dem, array[r ->> 'toc'], to_jsonb(coalesce((v_dem ->> (r ->> 'toc'))::integer, 0) + 1));
    end loop;
    if (select count(*) from jsonb_object_keys(v_dem)) <> (select count(*) from jsonb_object_keys(v_c -> 'toc')) then v_hong := v_hong || ' | thiếu tộc: ' || v_dem::text; end if;
    if coalesce((v_dem ->> 'nhan')::integer, 0) not between 850 and 1200 then v_hong := v_hong || ' | Nhân tộc lệch tỉ lệ: ' || v_dem::text; end if;
    -- người chơi thử, đứng ở bước truyện đã qua nhiệm vụ 10 (2 mốc)
    select min(t.i - 1)::integer into v_buoc from jsonb_array_elements_text(v_c -> 'kn' -> 'nv') with ordinality t(x, i) where t.x::integer >= 10;
    insert into auth.users (id, email, aud, role) values (a, 'kt_tn_a@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luu_luc)
    values (a, jsonb_build_object('realm', 2, 'layer', 1, 'qi', 0, 'element', 'hoa', 'step', v_buoc, 'flags', '{}'::jsonb), 2, 1, 1, now());
    -- lần đầu gửi huyết mạch tự quay ở máy (gốc lố): máy chủ quay, ghi bảng, đè bản lưu, không nghi vấn
    update public.p2d_nhan_vat set data = data || '{"tiem": {"toc": "tien", "goc": {"cdr": 99}, "cong": {}, "tay": 0}}' where user_id = a;
    select data -> 'tiem' into d from public.p2d_nhan_vat where user_id = a;
    select n.toc into v_toc from public.p2d_tiem_nang n where n.user_id = a;
    if v_toc is null or d ->> 'toc' <> v_toc or (d -> 'goc') is distinct from (select n.goc from public.p2d_tiem_nang n where n.user_id = a) then v_hong := v_hong || ' | lần đầu không lấy bản máy chủ: ' || d::text; end if;
    if exists (select 1 from public.p2d_nghi_van where user_id = a and ly_do like '%tiem%') then v_hong := v_hong || ' | lần đầu ghi nghi vấn nhầm'; end if;
    -- sửa tay tộc khi máy chủ đã có: bị đè, có nghi vấn
    v_khac := case when v_toc = 'than' then 'nhan' else 'than' end;
    update public.p2d_nhan_vat set data = jsonb_set(data, '{tiem,toc}', to_jsonb(v_khac)) where user_id = a;
    select data -> 'tiem' into d from public.p2d_nhan_vat where user_id = a;
    if d ->> 'toc' <> v_toc or not exists (select 1 from public.p2d_nghi_van where user_id = a and ly_do = 'tiem') then v_hong := v_hong || ' | lọt sửa tộc: ' || d::text; end if;
    -- điểm: cảnh giới 2 có 10 điểm; xin 50 Công + 3 Hồi chiêu: còn 10 Công (trần tổng), Hồi chiêu hết điểm
    update public.p2d_nhan_vat set data = jsonb_set(data, '{tiem,cong}', '{"atk_pct": 50, "cdr": 3}') where user_id = a;
    select data -> 'tiem' -> 'cong' into d from public.p2d_nhan_vat where user_id = a;
    if d is distinct from '{"atk_pct": 10}'::jsonb then v_hong := v_hong || ' | điểm không kẹp đúng: ' || coalesce(d::text, 'null'); end if;
    -- sách: học Phá Vân Thức (1 cờ) + 2 mốc = 3 cuốn quy cấp 1: [1, 1] đúng, nhận
    update public.p2d_nhan_vat set data = jsonb_set(data, '{flags,kn-pha-van}', 'true') || '{"knSach": {"pha-van-thuc": [1, 1]}, "knTrong": 0, "knMoc": 2}' where user_id = a;
    select data into d from public.p2d_nhan_vat where user_id = a;
    if (d -> 'knSach') is distinct from '{"pha-van-thuc": [1, 1]}'::jsonb or (d ->> 'knMoc') <> '2' then v_hong := v_hong || ' | chặn nhầm sách đúng: ' || coalesce((d -> 'knSach')::text, 'null'); end if;
    -- một cuốn cấp 3 (= 4 cuốn cấp 1) vượt 3: giữ bản cũ, nghi vấn
    update public.p2d_nhan_vat set data = data || '{"knSach": {"pha-van-thuc": [0, 0, 1]}}' where user_id = a;
    select data into d from public.p2d_nhan_vat where user_id = a;
    if (d -> 'knSach') is distinct from '{"pha-van-thuc": [1, 1]}'::jsonb or not exists (select 1 from public.p2d_nghi_van where user_id = a and ly_do = 'kn_sach') then v_hong := v_hong || ' | lọt sách vượt: ' || coalesce((d -> 'knSach')::text, 'null'); end if;
    -- mã kỹ năng lạ, sách trống lố, mốc lố: giữ bản cũ
    update public.p2d_nhan_vat set data = data || '{"knSach": {"kiem-khi": [1]}}' where user_id = a;
    if (select data -> 'knSach' from public.p2d_nhan_vat where user_id = a) is distinct from '{"pha-van-thuc": [1, 1]}'::jsonb then v_hong := v_hong || ' | lọt mã lạ'; end if;
    update public.p2d_nhan_vat set data = data || '{"knTrong": 5}' where user_id = a;
    if (select data ->> 'knTrong' from public.p2d_nhan_vat where user_id = a) <> '0' then v_hong := v_hong || ' | lọt sách trống lố'; end if;
    update public.p2d_nhan_vat set data = data || '{"knMoc": 9}' where user_id = a;
    if (select data ->> 'knMoc' from public.p2d_nhan_vat where user_id = a) <> '2' then v_hong := v_hong || ' | lọt mốc lố'; end if;
    -- đổi chỗ khác trong data không đụng hai phần này
    update public.p2d_nhan_vat set data = data || '{"lingshi": 5}' where user_id = a;
    select data into d from public.p2d_nhan_vat where user_id = a;
    if (d ->> 'lingshi') <> '5' or d ->> 'toc' is not null or (d -> 'tiem' ->> 'toc') <> v_toc then v_hong := v_hong || ' | đụng việc khác'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra Tiềm năng, Kỹ năng TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra Tiềm năng, Kỹ năng: đạt hết (% lượt quay: %)', 3000, v_dem;
end
$kt$;
