-- Chữ ký món, giai đoạn 1 (chủ dự án duyệt 05/11/2026, sau vụ "Thiên đế" sửa món đang có trong túi thành 5 dòng "+20% máu").
-- Trước đây p2d_luu chỉ kiểm món có mã số (uid) mới, còn món đã có thì máy khách sửa dòng, cấp cường hoá, độ hiếm tuỳ ý
-- mà máy chủ không biết, vì tẩy luyện, cường hoá cũng sửa món tại chỗ ở máy khách. Từ nay:
-- 1) Khoá bí mật p2d_bi_mat (tạo ngẫu nhiên ngay trong cơ sở dữ liệu, không nằm trong repo, không ai đọc được từ máy khách).
-- 2) p2d_ky_mon(món): chữ ký hmac-sha256 trên các trường được ký (p2d_ky_phan): uid, base, rarity, lvl, main, lines, plus, cap,
--    el, wt, dv, set. Không ký: sockets (khảm ngọc vẫn ở máy khách, máy chủ chỉ kiểm loại / cấp ngọc), lock, pb (luyện pháp bảo,
--    giai đoạn sau), free / rr / rrDay (máy chủ giữ, không cho máy khách đổi), new / seen ... Chữ ký lưu ở món: sig.
-- 3) Tẩy luyện (p2d_tay_luyen), cường hoá (p2d_cuong_hoa), đổi hệ Đạo Vận (p2d_doi_he) do máy chủ tung, trừ tiền trên bản lưu
--    máy chủ, ký lại món, tăng phien_ban (máy khách gọi qua cloud.run như chợ, Tiên Ngọc). Luật y như máy khách
--    (src/game/items.js reroll, src/game/tiers.js, src/game/enhance.js, src/game/daovan.js rerollEl); số ở bảng p2d_ky_cfg
--    (tools/ky-cfg.mjs dựng từ data/, tools/check.mjs so).
-- 4) p2d_luu gọi p2d_kiem_ky(túi cũ, túi mới) (vá bằng thay chuỗi, không chép lại cả hàm): món đã có mà trường được ký khác bản
--    máy chủ thì trả bản máy chủ (giữ ngọc khảm nếu hợp lệ), trả về máy khách ở sua.mon, ghi lý do 'sua_do' (cộng điểm nghi vấn)
--    hoặc 'sua_do_cu' (giống tẩy / cường hoá của bản game cũ chưa tải lại: chỉ ghi, không cộng điểm). Không nhận cả bản cũ có chữ
--    ký đúng (chặn lùi về bản trước khi tẩy / cường hoá hỏng). Món mới qua p2d_mon_hop_le thì được ký; không qua thì như cũ
--    (do_sai_chi_so). Chỉ xét món có thay đổi so với bản máy chủ.
-- 5) Nhận thư (p2d_nhan_thu_moi) đổi uid món nên ký lại. Ký một lần mọi món trong mọi bản lưu, món đang rao chợ, món trong thư chưa nhận.
-- Chạy lại cả file không sao (khoá giữ nguyên, hàm thay bằng bản mới, phần vá thấy đã vá thì bỏ qua, chỉ ký món chưa có chữ ký).

create table if not exists public.p2d_bi_mat (k text primary key, v text not null);
alter table public.p2d_bi_mat enable row level security;
revoke all on table public.p2d_bi_mat from public, anon, authenticated;
insert into public.p2d_bi_mat (k, v) values ('ky_mon', encode(extensions.gen_random_bytes(32), 'hex')) on conflict (k) do nothing;

-- Số máy chủ dùng (tools/ky-cfg.mjs; tools/check.mjs so với data/items.json, gear.json, elements.json, daovan.json)
create table if not exists public.p2d_ky_cfg (k text primary key, v jsonb not null);
alter table public.p2d_ky_cfg enable row level security;
revoke all on table public.p2d_ky_cfg from public, anon, authenticated;
insert into public.p2d_ky_cfg (k, v) values ('cfg', '{"tay":{"base":120,"realm_mul":1.45,"r":1.3,"decay":0,"line_mul":2,"cost":2,"free":1},"mau":[[1,40],[1.3,28],[1.7,17],[2.2,9],[2.8,4],[3.6,1.6],[4.6,0.4]],"tu_pham":{"pham":0,"linh":0,"huyen":1,"dia":2,"thien":3},"cap_w":[8,12,14,15,14,12,10,7,5,3],"lpl":0.08,"cs":{"atk":[2,6,false],"atk_pct":[3,8,true],"hp":[10,30,false],"hp_pct":[4,10,true],"def":[1,4,false],"crit":[2,5,true],"crit_dmg":[8,20,true],"cdr":[2,6,true],"speed":[2,5,true],"qi_gain":[4,10,true]},"pool":{"thiet-kiem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"thanh-van-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-y":["hp","hp_pct","def","speed","cdr","qi_gain"],"huyen-giap":["hp","hp_pct","def","crit","atk"],"ngoc-boi-tho":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"],"linh-phu":["qi_gain","cdr","speed","hp","atk"],"thiet-thuong":["atk","atk_pct","crit","crit_dmg","speed","hp"],"ba-tieu-phien":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"],"moc-cam":["atk_pct","cdr","qi_gain","crit","hp","def"],"tu-nguyet-liem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"truc-cung":["atk","atk_pct","crit","crit_dmg","speed","cdr"],"thien-mach-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-hai":["speed","hp","def","cdr","qi_gain"],"van-van-ngoa":["speed","crit","atk","hp_pct","cdr"],"bo-can":["hp","def","cdr","qi_gain","crit"],"thiet-khoi":["def","hp","hp_pct","crit","atk"],"thiet-gioi":["crit","crit_dmg","atk","atk_pct","def"],"linh-ngoc-gioi":["crit","crit_dmg","qi_gain","hp_pct","cdr"],"kim-luan":["atk","atk_pct","cdr","crit"],"tran-yeu-thap":["hp","hp_pct","def","cdr"],"hoa-hon-linh":["atk_pct","crit_dmg","cdr","qi_gain"],"xich-diem-giap":["hp","hp_pct","def","atk_pct"],"xich-diem-hai":["speed","atk","crit"],"xich-diem-quan":["crit","atk","atk_pct"],"xich-diem-gioi":["crit","crit_dmg","atk_pct"],"xich-diem-boi":["atk_pct","crit_dmg","qi_gain"],"han-bang-giap":["hp","hp_pct","def","cdr"],"han-bang-hai":["speed","def","hp"],"han-bang-quan":["def","hp","hp_pct"],"han-bang-gioi":["crit","cdr","hp_pct"],"han-bang-boi":["hp_pct","def","qi_gain"],"hac-phong-giap":["hp","speed","cdr","atk_pct"],"hac-phong-hai":["speed","cdr","crit"],"hac-phong-quan":["crit","cdr","speed"],"hac-phong-gioi":["crit","crit_dmg","cdr"],"hac-phong-boi":["cdr","atk_pct","qi_gain"],"thanh-moc-bao":["hp","hp_pct","def","qi_gain"],"thanh-moc-hai":["speed","hp_pct","def"],"thanh-moc-quan":["hp","hp_pct","qi_gain"],"thanh-moc-gioi":["crit","crit_dmg","hp_pct"],"thanh-moc-boi":["qi_gain","hp_pct","def"],"kim-cang-giap":["def","hp_pct","atk_pct"],"kim-cang-hai":["speed","atk_pct","crit"],"kim-cang-quan":["crit","crit_dmg","atk_pct"],"kim-cang-gioi":["crit","crit_dmg","atk_pct"],"kim-cang-boi":["atk_pct","crit_dmg","cdr"],"hau-tho-giap":["hp","def","hp_pct"],"hau-tho-hai":["def","speed","hp_pct"],"hau-tho-quan":["def","hp","hp_pct"],"hau-tho-gioi":["hp_pct","def","crit"],"hau-tho-boi":["def","hp_pct","qi_gain"],"dao-van-binh":["atk","atk_pct","crit","crit_dmg","cdr"],"dao-van-quan":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-bao":["hp","hp_pct","def","atk_pct"],"dao-van-boi":["atk_pct","crit_dmg","cdr","qi_gain"],"dao-van-hai":["speed","crit","cdr","atk_pct"],"dao-van-gioi":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-an":["atk","atk_pct","cdr","crit"],"thai-hu-giap":["hp","hp_pct","cdr","atk_pct"],"thai-hu-hai":["speed","cdr","crit"],"thai-hu-quan":["crit","cdr","atk_pct"],"thai-hu-gioi":["crit","crit_dmg","atk_pct"],"thai-hu-boi":["cdr","atk_pct","qi_gain"]},"cuong":{"max":20,"iron":[1,2,3,4,5,6,8,10,12,15,18,21,25,30,36,43,51,61,73,87],"stones":[0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,11,13,15,17,20],"coins":[0,0,0,0,0,0,0,0,0,0,2000,2700,3600,4900,6600,8900,12000,16200,21900,29500],"rate":[1,1,0.95,0.85,0.75,0.65,0.55,0.45,0.35,0.25,0.22,0.2,0.18,0.16,0.14,0.12,0.11,0.1,0.09,0.08],"drop_from":7,"drop_chance":0.5,"open":{"base":10,"from_realm":2,"per_realm":2}},"he":["moc","hoa","thuy","kim","tho"],"doi_he":{"mat":"dao-van-thach","n":1},"ngoc":{"types":["hong-ngoc","lam-ngoc","hoang-ngoc","luc-ngoc"],"max":20},"pb_max":20}'::jsonb) on conflict (k) do update set v = excluded.v;

-- Số trong jsonb (không phải số thì null)
create or replace function public.p2d_ky_so(p jsonb) returns numeric language sql immutable set search_path = ''
as $$ select case when jsonb_typeof(p) = 'number' then (p #>> '{}')::numeric end $$;

-- Phần được ký của món: chỉ những trường máy khách không tự đổi được (thứ tự khoá jsonb cố định nên chuỗi luôn như nhau)
create or replace function public.p2d_ky_phan(p_mon jsonb) returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(p_mon) = 'object' then p_mon else '{}'::jsonb end) e
   where e.key = any (array['uid', 'base', 'rarity', 'lvl', 'main', 'lines', 'plus', 'cap', 'el', 'wt', 'dv', 'set'])
$$;

create or replace function public.p2d_ky_mon(p_mon jsonb) returns text language sql stable security definer set search_path = ''
as $$
  select left(encode(extensions.hmac(public.p2d_ky_phan(p_mon)::text, (select v from public.p2d_bi_mat where k = 'ky_mon'), 'sha256'), 'hex'), 24)
$$;

-- Món kèm chữ ký mới
create or replace function public.p2d_ky_dong(p_mon jsonb) returns jsonb language sql stable set search_path = ''
as $$ select p_mon || jsonb_build_object('sig', public.p2d_ky_mon(p_mon)) $$;

-- Bốc chỉ số theo trọng số (0, 1, 2 ...), như pickTier / rollCap ở src/game/tiers.js
create or replace function public.p2d_ky_boc(p_w numeric[]) returns integer language plpgsql volatile set search_path = ''
as $$
declare v_r numeric := random()::numeric * (select sum(x) from unnest(p_w) x); i integer;
begin
  for i in 1 .. coalesce(array_length(p_w, 1), 0) loop
    v_r := v_r - p_w[i];
    if v_r <= 0 then return i - 1; end if;
  end loop;
  return greatest(coalesce(array_length(p_w, 1), 1) - 1, 0);
end;
$$;

-- Ô khảm hợp lệ: số lỗ không quá lỗ của độ hiếm (+1 khi có dòng Đỏ / Đen, như p2d_mon_hop_le), mỗi ô trống hoặc đúng loại ngọc,
-- cấp 1..max (data/items.json gems)
create or replace function public.p2d_lo_hop_le(p_mon jsonb) returns boolean language sql stable set search_path = ''
as $$
  with c as (select v -> 'ngoc' as g from public.p2d_ky_cfg where k = 'cfg')
  select case
    when not (p_mon ? 'sockets') or p_mon -> 'sockets' = 'null'::jsonb then true
    when jsonb_typeof(p_mon -> 'sockets') <> 'array' then false
    else jsonb_array_length(p_mon -> 'sockets') <= coalesce((select lo from public.p2d_pham where id = p_mon ->> 'rarity'), 0)
           + case when exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_mon -> 'lines') = 'array' then p_mon -> 'lines' else '[]'::jsonb end) l
                               where coalesce(public.p2d_ky_so(l -> 't'), 0) >= 5) then 1 else 0 end
     and not exists (select 1 from jsonb_array_elements(p_mon -> 'sockets') s, c
                      where s <> 'null'::jsonb
                        and not (jsonb_typeof(s) = 'string' and s #>> '{}' ~ '^[a-z-]{1,30}:[0-9]{1,2}$'
                                 and (c.g -> 'types') ? split_part(s #>> '{}', ':', 1)
                                 and split_part(s #>> '{}', ':', 2)::int between 1 and (c.g ->> 'max')::int))
  end
$$;

-- Đổi do bản game tự sửa đồ cũ lúc vào game (src/game/items.js fixGearPct): gắn màu cho dòng chưa màu (convertLines, màu tối đa
-- from_rarity + 1), kéo chỉ số % về trần. Chỉ cho đổi từ "chưa có" sang "có" hoặc giảm. Trần dòng (cap), hệ (el) không xét ở đây:
-- p2d_kiem_ky đã đặt theo máy chủ trước khi gọi.
create or replace function public.p2d_ky_cu_hop_le(p_cu jsonb, p_moi jsonb) returns boolean language plpgsql stable set search_path = ''
as $$
declare
  v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg');
  v_kh text[] := array['cap', 'el', 'main', 'lines'];
  c_mau constant numeric[] := array[1.0, 1.3, 1.7, 2.2, 2.8, 3.6, 4.6];
  v_ol jsonb; v_nl jsonb; v_o jsonb; v_n jsonb; v_c public.p2d_chi_so%rowtype; v_t numeric; v_lvl numeric := coalesce(public.p2d_ky_so(p_moi -> 'lvl'), 0); i integer;
begin
  if (public.p2d_ky_phan(p_moi) - v_kh) <> (public.p2d_ky_phan(p_cu) - v_kh) then return false; end if;
  if (p_moi -> 'main') is distinct from (p_cu -> 'main') then
    if jsonb_typeof(p_moi -> 'main') is distinct from 'object' or jsonb_typeof(p_cu -> 'main') is distinct from 'object'
       or (select array_agg(x order by x) from jsonb_object_keys(p_moi -> 'main') x) is distinct from (select array_agg(x order by x) from jsonb_object_keys(p_cu -> 'main') x)
       or exists (select 1 from jsonb_each(p_moi -> 'main') e where public.p2d_ky_so(e.value) is null or public.p2d_ky_so(e.value) < 1
                    or public.p2d_ky_so(e.value) > coalesce(public.p2d_ky_so(p_cu -> 'main' -> e.key), 0)) then return false; end if;
  end if;
  if (p_moi -> 'lines') is distinct from (p_cu -> 'lines') then
    v_ol := p_cu -> 'lines'; v_nl := p_moi -> 'lines';
    if jsonb_typeof(v_ol) is distinct from 'array' or jsonb_typeof(v_nl) is distinct from 'array' or jsonb_array_length(v_ol) <> jsonb_array_length(v_nl) then return false; end if;
    for i in 0 .. jsonb_array_length(v_nl) - 1 loop
      v_o := v_ol -> i; v_n := v_nl -> i;
      continue when v_o = v_n;
      if (v_n -> 's') is distinct from (v_o -> 's') or public.p2d_ky_so(v_n -> 'v') is null or public.p2d_ky_so(v_n -> 'v') < 1 then return false; end if;
      v_t := public.p2d_ky_so(v_n -> 't');
      if public.p2d_ky_so(v_o -> 't') is not null then
        -- dòng đã có màu: chỉ được kéo giá trị xuống
        if v_t is distinct from public.p2d_ky_so(v_o -> 't') or public.p2d_ky_so(v_n -> 'v') > public.p2d_ky_so(v_o -> 'v') then return false; end if;
      else
        if v_t is null or v_t <> floor(v_t) or v_t < 0 or v_t > least(6, coalesce(public.p2d_ky_so(v_cfg -> 'tu_pham' -> (p_moi ->> 'rarity')), 0) + 1) then return false; end if;
        select * into v_c from public.p2d_chi_so where stat = v_n ->> 's';
        if not found or public.p2d_ky_so(v_n -> 'v') > ceil(v_c.dong * (case when v_c.pct then 1 else 1 + v_lvl * 0.08 end) * c_mau[v_t::int + 1]) + 1 then return false; end if;
      end if;
    end loop;
  end if;
  return true;
end;
$$;

-- Giống tẩy luyện / cường hoá / đổi hệ của bản game cũ (chưa tải lại): chỉ thêm dòng vào cuối, đổi cấp cường hoá, đổi hệ,
-- bốc trần dòng cho món chưa có. Món vẫn bị trả về bản máy chủ, chỉ không cộng điểm nghi vấn.
create or replace function public.p2d_ky_nhe(p_cu jsonb, p_moi jsonb) returns boolean language plpgsql stable set search_path = ''
as $$
declare
  v_kh text[] := array['lines', 'plus', 'el', 'cap'];
  v_ol jsonb := case when jsonb_typeof(p_cu -> 'lines') = 'array' then p_cu -> 'lines' else '[]'::jsonb end;
  v_nl jsonb := p_moi -> 'lines';
begin
  if (public.p2d_ky_phan(p_moi) - v_kh) <> (public.p2d_ky_phan(p_cu) - v_kh) then return false; end if;
  if (p_moi -> 'cap') is distinct from (p_cu -> 'cap') and public.p2d_ky_so(p_cu -> 'cap') is not null then return false; end if;
  if jsonb_typeof(v_nl) is distinct from 'array' or jsonb_array_length(v_nl) < jsonb_array_length(v_ol) then return false; end if;
  if exists (select 1 from generate_series(0, jsonb_array_length(v_ol) - 1) i where v_nl -> i <> v_ol -> i) then return false; end if;
  if (p_moi -> 'el') is distinct from (p_cu -> 'el') and not ((select v -> 'he' from public.p2d_ky_cfg where k = 'cfg') ? coalesce(p_moi ->> 'el', '')) then return false; end if;
  return public.p2d_mon_hop_le(p_moi);
end;
$$;

-- Kiểm túi mới so với túi trên máy chủ (p2d_luu gọi). Trả { bag, ly_do, sua (món máy khách phải lấy lại), chi_tiet }.
create or replace function public.p2d_kiem_ky(p_cu jsonb, p_moi jsonb) returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg');
  v_ky text[] := array['uid', 'base', 'rarity', 'lvl', 'main', 'lines', 'plus', 'cap', 'el', 'wt', 'dv', 'set'];
  v_map jsonb; v_ra jsonb := '[]'; v_sua jsonb := '[]'; v_ct jsonb := '[]'; v_ly text[] := '{}';
  v_g jsonb; v_n jsonb; v_o jsonb; v_pn jsonb; v_po jsonb; v_doi_mau boolean; v_kh text;
begin
  if jsonb_typeof(p_moi) is distinct from 'array' then
    return jsonb_build_object('bag', p_moi, 'ly_do', '[]'::jsonb, 'sua', '[]'::jsonb, 'chi_tiet', '[]'::jsonb);
  end if;
  select coalesce(jsonb_object_agg(o ->> 'uid', o), '{}'::jsonb) into v_map
    from jsonb_array_elements(case when jsonb_typeof(p_cu) = 'array' then p_cu else '[]'::jsonb end) o
   where jsonb_typeof(o) = 'object' and jsonb_typeof(o -> 'uid') = 'number';
  for v_g in select x.e from jsonb_array_elements(p_moi) with ordinality x(e, i) order by x.i loop
    v_n := v_g;
    v_o := case when jsonb_typeof(v_n) = 'object' then v_map -> (v_n ->> 'uid') end;
    if jsonb_typeof(v_n) is distinct from 'object' then
      null;   -- p2d_luu đã chặn món không phải object
    elsif v_o is null then
      -- Món mới (đồ rơi; giai đoạn 2 máy chủ sẽ tự tung): hợp lệ thì ký, không thì để p2d_luu ghi do_sai_chi_so như cũ
      v_n := v_n - 'sig' - 'free';
      if public.p2d_mon_hop_le(v_n) and public.p2d_lo_hop_le(v_n) then v_n := public.p2d_ky_dong(v_n); end if;
    elsif (v_n - 'sig') = (v_o - 'sig') then
      v_n := v_o;   -- không đổi gì (phần lớn các lần lưu): giữ y bản máy chủ, không tính chữ ký
    else
      -- trần dòng, hệ do máy chủ quyết: có rồi thì giữ; đồ cũ chưa có mà máy khách vừa bốc (ensureCap, fixGearPct) thì máy chủ tự
      -- bốc trần (không để máy khách chọn trần 10), hệ theo uid như máy khách. Không ghi cờ, máy khách nhận lại ở sua.mon.
      if v_o ? 'cap' then v_n := v_n || jsonb_build_object('cap', v_o -> 'cap');
      elsif v_n ? 'cap' then
        v_n := v_n || jsonb_build_object('cap', greatest(jsonb_array_length(case when jsonb_typeof(v_o -> 'lines') = 'array' then v_o -> 'lines' else '[]'::jsonb end),
          public.p2d_ky_boc(array(select x::numeric from jsonb_array_elements_text(v_cfg -> 'cap_w') with ordinality a(x, i) order by i)) + 1));
      end if;
      if coalesce(v_o ->> 'el', '') <> '' then v_n := v_n || jsonb_build_object('el', v_o -> 'el');
      elsif v_n ? 'el' then v_n := v_n || jsonb_build_object('el', v_cfg -> 'he' -> ((v_n ->> 'uid')::numeric % jsonb_array_length(v_cfg -> 'he'))::integer);
      end if;
      v_pn := public.p2d_ky_phan(v_n); v_po := public.p2d_ky_phan(v_o); v_doi_mau := false;
      if v_pn = v_po then
        null;
      elsif public.p2d_ky_cu_hop_le(v_o, v_n) then
        v_doi_mau := (v_pn -> 'lines') is distinct from (v_po -> 'lines')   -- dòng chưa màu vừa được gắn màu (không phải chỉ kéo % xuống)
          and exists (select 1 from jsonb_array_elements(v_po -> 'lines') l where public.p2d_ky_so(l -> 't') is null);
      else
        -- trường được ký bị sửa ở máy khách: trả bản máy chủ, giữ phần không ký (ngọc khảm, khoá ...) nếu hợp lệ
        v_ly := array_append(v_ly, case when public.p2d_ky_nhe(v_o, v_n) then 'sua_do_cu' else 'sua_do' end);
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('uid', v_n -> 'uid', 'gui', v_pn, 'may_chu', v_po)); end if;
        v_n := (v_n - v_ky) || v_po; v_pn := v_po;
      end if;
      -- máy chủ giữ: lượt tẩy miễn phí, bộ đếm phí tẩy (đồ cũ vừa gắn màu dòng được thêm lượt miễn phí như convertLines)
      foreach v_kh in array array['free', 'rr', 'rrDay'] loop
        v_n := case when v_o ? v_kh then v_n || jsonb_build_object(v_kh, v_o -> v_kh) else v_n - v_kh end;
      end loop;
      if v_doi_mau then v_n := v_n || jsonb_build_object('free', coalesce(public.p2d_ky_so(v_o -> 'free'), 0) + (v_cfg -> 'tay' ->> 'free')::numeric); end if;
      -- bậc luyện pháp bảo (chưa ký, giai đoạn sau): ít nhất giữ trong khoảng 0..max
      if v_n ? 'pb' and coalesce(public.p2d_ky_so(v_n -> 'pb') between 0 and (v_cfg ->> 'pb_max')::numeric, false) is false then
        v_n := case when v_o ? 'pb' then v_n || jsonb_build_object('pb', v_o -> 'pb') else v_n - 'pb' end;
      end if;
      if (v_n -> 'sockets') is distinct from (v_o -> 'sockets') and not public.p2d_lo_hop_le(v_n) then
        v_n := case when v_o ? 'sockets' then v_n || jsonb_build_object('sockets', v_o -> 'sockets') else v_n - 'sockets' end;
        v_ly := array_append(v_ly, 'ngoc_sai');
      end if;
      if v_pn = v_po then v_n := case when v_o ? 'sig' then v_n || jsonb_build_object('sig', v_o -> 'sig') else v_n - 'sig' end;
      else v_n := public.p2d_ky_dong(v_n); end if;   -- đồ cũ vừa được game sửa đúng luật: ký bản mới
      if (v_n - 'sig') <> (v_g - 'sig') then v_sua := v_sua || jsonb_build_array(v_n); end if;
    end if;
    v_ra := v_ra || jsonb_build_array(v_n);
  end loop;
  return jsonb_build_object('bag', v_ra, 'ly_do', to_jsonb(array(select distinct unnest(v_ly))), 'sua', v_sua, 'chi_tiet', v_ct);
end;
$$;

-- Lấy món trong túi trên máy chủ (khoá dòng nhân vật). Trả { i (vị trí), mon } hoặc báo lỗi.
create or replace function public.p2d_ky_lay(p_data jsonb, p_uid bigint) returns jsonb language plpgsql stable set search_path = ''
as $$
declare v jsonb;
begin
  select jsonb_build_object('i', x.i - 1, 'mon', x.e) into v
    from jsonb_array_elements(case when jsonb_typeof(p_data -> 'bag') = 'array' then p_data -> 'bag' else '[]'::jsonb end) with ordinality x(e, i)
   where x.e -> 'uid' = to_jsonb(p_uid) limit 1;
  if v is null or jsonb_typeof(v -> 'mon') <> 'object' then raise exception 'khong_co' using errcode = '22023'; end if;
  return v;
end;
$$;

-- Tẩy luyện một lần (src/game/items.js reroll): mở thêm 1 dòng tới trần dòng; có lượt miễn phí thì không tốn gì, không thì
-- tốn reroll_cost Tẩy Luyện Thạch + phí Linh Thạch base × realm_mul^cảnh giới × r^(số lần đã tẩy) × line_mul^(số dòng − 1).
create or replace function public.p2d_tay_luyen(p_uid bigint) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg'); v_t0 jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_lines jsonb; v_pool jsonb; v_cs jsonb; v_line jsonb;
  v_n integer; v_cap integer; v_free numeric; v_fee numeric := 0; v_cost numeric := 0; v_realm integer; v_day numeric; v_cnt numeric;
  v_t integer; v_s text; v_q numeric; v_lo integer; v_pb integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  v_pool := v_cfg -> 'pool' -> (v_it ->> 'base');
  if jsonb_typeof(v_pool) is distinct from 'array' or jsonb_array_length(v_pool) = 0 then raise exception 'mon_sai' using errcode = '22023'; end if;
  v_lines := case when jsonb_typeof(v_it -> 'lines') = 'array' then v_it -> 'lines' else '[]'::jsonb end;
  v_n := jsonb_array_length(v_lines);
  v_q := public.p2d_ky_so(v_it -> 'cap');   -- trần dòng; món chưa có thì bốc (ensureCap), không thấp hơn số dòng đang có
  if v_q is not null and v_q = floor(v_q) then v_cap := v_q::integer;
  else
    v_cap := greatest(v_n, public.p2d_ky_boc(array(select x::numeric from jsonb_array_elements_text(v_cfg -> 'cap_w') with ordinality a(x, i) order by i)) + 1);
    v_it := v_it || jsonb_build_object('cap', v_cap);
  end if;
  if v_n >= v_cap then
    if v_q is null or v_q <> floor(v_q) then   -- trần vừa bốc: lưu lại (không cho gọi lại để bốc trần khác)
      v_it := public.p2d_ky_dong(v_it);
      update public.p2d_nhan_vat set data = jsonb_set(v_nv.data, array['bag', v_x ->> 'i'], v_it), phien_ban = phien_ban + 1, updated_at = now()
       where user_id = v_me returning phien_ban into v_pb;
      return jsonb_build_object('du_dong', true, 'mon', v_it, 'phien_ban', v_pb, 'tru', jsonb_build_object('coins', 0, 'mats', '{}'::jsonb));
    end if;
    raise exception 'du_dong' using errcode = '22023';
  end if;
  v_free := coalesce(public.p2d_ky_so(v_it -> 'free'), 0);
  if v_free > 0 then
    v_it := v_it || jsonb_build_object('free', v_free - 1);
  else
    v_t0 := v_cfg -> 'tay';
    v_realm := coalesce(public.p2d_ky_so(v_nv.data -> 'realm')::integer, v_nv.canh_gioi, 0);
    v_day := floor((extract(epoch from now()) + 25200) / 86400);   -- ngày theo giờ Việt Nam (dayNo ở máy khách)
    v_cnt := greatest(0, least(greatest(coalesce(public.p2d_ky_so(v_it -> 'rr'), 0), 0), 500)
                         - (v_t0 ->> 'decay')::numeric * greatest(0, v_day - coalesce(public.p2d_ky_so(v_it -> 'rrDay'), v_day)));
    v_fee := round((v_t0 ->> 'base')::numeric * power((v_t0 ->> 'realm_mul')::numeric, v_realm) * power((v_t0 ->> 'r')::numeric, v_cnt)
                   * power((v_t0 ->> 'line_mul')::numeric, greatest(v_n, 1) - 1));
    v_cost := (v_t0 ->> 'cost')::numeric;
    if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tay-luyen-thach'), 0) < v_cost or coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0) < v_fee then
      raise exception 'thieu' using errcode = '22023';
    end if;
    v_nv.data := jsonb_set(jsonb_set(v_nv.data, '{mats,tay-luyen-thach}', to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tay-luyen-thach') - v_cost)),
                           '{lingshi}', to_jsonb(public.p2d_ky_so(v_nv.data -> 'lingshi') - v_fee));
    v_it := v_it || jsonb_build_object('rr', v_cnt + 1, 'rrDay', v_day);
  end if;
  -- dòng mới (newLine, lineValue): màu theo trọng số, chỉ số ngẫu nhiên trong pool của món, giá trị trong khoảng min–max
  v_t := public.p2d_ky_boc(array(select (x -> 1)::text::numeric from jsonb_array_elements(v_cfg -> 'mau') with ordinality a(x, i) order by i));
  v_s := v_pool ->> floor(random() * jsonb_array_length(v_pool))::integer;
  v_cs := v_cfg -> 'cs' -> v_s;
  v_line := jsonb_build_object('s', v_s, 't', v_t, 'v', greatest(1, round(
    ((v_cs ->> 0)::numeric + random()::numeric * ((v_cs ->> 1)::numeric - (v_cs ->> 0)::numeric))
    * case when (v_cs ->> 2)::boolean then 1 else 1 + coalesce(public.p2d_ky_so(v_it -> 'lvl'), 0) * (v_cfg ->> 'lpl')::numeric end
    * (v_cfg -> 'mau' -> v_t ->> 0)::numeric)));
  v_lines := v_lines || jsonb_build_array(v_line);
  v_it := v_it || jsonb_build_object('lines', v_lines);
  -- phẩm trung bình tới Tiên (Đỏ) thì mở ô khảm thứ 4 (src/game/socket4.js)
  select round(avg((l ->> 't')::numeric)) into v_q from jsonb_array_elements(v_lines) l where jsonb_typeof(l -> 't') = 'number';
  if coalesce(v_q, 0) >= 5 then
    v_lo := coalesce((select lo from public.p2d_pham where id = v_it ->> 'rarity'), 0) + 1;
    if jsonb_typeof(v_it -> 'sockets') is distinct from 'array' then v_it := v_it || jsonb_build_object('sockets', '[]'::jsonb); end if;
    while jsonb_array_length(v_it -> 'sockets') < v_lo loop v_it := jsonb_set(v_it, '{sockets}', (v_it -> 'sockets') || 'null'::jsonb); end loop;
  end if;
  v_it := public.p2d_ky_dong(v_it);
  update public.p2d_nhan_vat set data = jsonb_set(v_nv.data, array['bag', v_x ->> 'i'], v_it), phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('mon', v_it, 'dong', v_line, 'cuoi', v_n + 1 >= v_cap, 'phien_ban', v_pb,
    'tru', jsonb_build_object('coins', v_fee, 'mats', jsonb_build_object('tay-luyen-thach', v_cost)));
end;
$$;

-- Cường hoá một lần (src/game/enhance.js): tốn tinh thiết, Tẩy Luyện Thạch, Linh Thạch theo cấp; cấp tối đa mở theo cảnh giới;
-- trượt từ drop_from trở lên thì drop_chance tụt 1 cấp.
create or replace function public.p2d_cuong_hoa(p_uid bigint) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_c jsonb := (select v -> 'cuong' from public.p2d_ky_cfg where k = 'cfg');
  v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_n integer; v_realm integer; v_mo integer;
  v_iron numeric; v_st numeric; v_coins numeric; v_kq text; v_pb integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  v_n := greatest(coalesce(public.p2d_ky_so(v_it -> 'plus'), 0), 0)::integer;
  if v_n >= (v_c ->> 'max')::integer then raise exception 'toi_da' using errcode = '22023'; end if;
  v_realm := coalesce(public.p2d_ky_so(v_nv.data -> 'realm')::integer, v_nv.canh_gioi, 0);
  v_mo := least((v_c ->> 'max')::integer, (v_c -> 'open' ->> 'base')::integer + (v_c -> 'open' ->> 'per_realm')::integer * greatest(0, v_realm - (v_c -> 'open' ->> 'from_realm')::integer));
  if v_n >= v_mo then raise exception 'chua_mo' using errcode = '22023'; end if;
  v_iron := (v_c -> 'iron' ->> v_n)::numeric; v_st := coalesce((v_c -> 'stones' ->> v_n)::numeric, 0); v_coins := coalesce((v_c -> 'coins' ->> v_n)::numeric, 0);
  if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tinh-thiet'), 0) < v_iron or coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tay-luyen-thach'), 0) < v_st
     or coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0) < v_coins then
    raise exception 'thieu' using errcode = '22023';
  end if;
  v_nv.data := jsonb_set(v_nv.data, '{mats,tinh-thiet}', to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tinh-thiet') - v_iron));
  if v_st > 0 then v_nv.data := jsonb_set(v_nv.data, '{mats,tay-luyen-thach}', to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> 'tay-luyen-thach') - v_st)); end if;
  if v_coins > 0 then v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(public.p2d_ky_so(v_nv.data -> 'lingshi') - v_coins)); end if;
  if random() < (v_c -> 'rate' ->> v_n)::numeric then v_kq := 'up'; v_it := v_it || jsonb_build_object('plus', v_n + 1);
  elsif v_n >= (v_c ->> 'drop_from')::integer and random() < (v_c ->> 'drop_chance')::numeric then v_kq := 'drop'; v_it := v_it || jsonb_build_object('plus', v_n - 1);
  else v_kq := 'fail'; end if;
  if v_kq <> 'fail' then v_it := public.p2d_ky_dong(v_it); v_nv.data := jsonb_set(v_nv.data, array['bag', v_x ->> 'i'], v_it); end if;
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('kq', v_kq, 'mon', v_it, 'phien_ban', v_pb,
    'tru', jsonb_build_object('coins', v_coins, 'mats', jsonb_build_object('tinh-thiet', v_iron, 'tay-luyen-thach', v_st)));
end;
$$;

-- Đổi hệ một món (src/game/daovan.js rerollEl): tốn Đạo Vận Thạch, ra hệ khác hệ cũ
create or replace function public.p2d_doi_he(p_uid bigint) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg');
  v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_mat text := v_cfg -> 'doi_he' ->> 'mat'; v_k numeric := (v_cfg -> 'doi_he' ->> 'n')::numeric;
  v_he text; v_pb integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  if coalesce(v_it ->> 'el', '') = '' then raise exception 'khong_he' using errcode = '22023'; end if;
  if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> v_mat), 0) < v_k then raise exception 'thieu' using errcode = '22023'; end if;
  select h into v_he from jsonb_array_elements_text(v_cfg -> 'he') h where h <> v_it ->> 'el' order by random() limit 1;
  v_it := public.p2d_ky_dong(v_it || jsonb_build_object('el', v_he));
  v_nv.data := jsonb_set(jsonb_set(v_nv.data, array['mats', v_mat], to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> v_mat) - v_k)), array['bag', v_x ->> 'i'], v_it);
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('he', v_he, 'mon', v_it, 'phien_ban', v_pb, 'tru', jsonb_build_object('coins', 0, 'mats', jsonb_build_object(v_mat, v_k)));
end;
$$;

revoke all on function public.p2d_ky_so(jsonb), public.p2d_ky_phan(jsonb), public.p2d_ky_mon(jsonb), public.p2d_ky_dong(jsonb), public.p2d_ky_boc(numeric[]),
  public.p2d_lo_hop_le(jsonb), public.p2d_ky_cu_hop_le(jsonb, jsonb), public.p2d_ky_nhe(jsonb, jsonb), public.p2d_kiem_ky(jsonb, jsonb),
  public.p2d_ky_lay(jsonb, bigint) from public, anon, authenticated;
revoke all on function public.p2d_tay_luyen(bigint), public.p2d_cuong_hoa(bigint), public.p2d_doi_he(bigint) from public, anon;
grant execute on function public.p2d_tay_luyen(bigint), public.p2d_cuong_hoa(bigint), public.p2d_doi_he(bigint) to authenticated;

-- Vá p2d_luu (bản đang chạy = 20261031030000_p2d_bit_thung_xo + vá 20261104030000, 20261104100000): gọi p2d_kiem_ky ngay
-- trước khi đếm món mới hiếm / sai chỉ số. Dùng lại biến v_bo (jsonb, chỉ dùng cho danh sách món đang rao ở đoạn trên).
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  neo text := '  select count(*) filter (where n ->> ''rarity'' = ''thien''), count(*) filter (where n ->> ''rarity'' = ''dia''), count(*) filter (where not public.p2d_mon_hop_le(n))';
  neo2 text := '  if v_sua <> ''{}''::jsonb then perform set_config(''p2d.sua'', v_sua::text, true); end if;';
  a text := 'array_length(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), 1)';
  b text := 'array_length(array_remove(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), ''sua_do_cu''), 1)';
begin
  if position('p2d_kiem_ky' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va (kiem ky)'; end if;
  if (length(d) - length(replace(d, neo2, ''))) / length(neo2) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va (sua)'; end if;
  if (length(d) - length(replace(d, a, ''))) / length(a) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va (ly do)'; end if;
  d := replace(d, neo,
    '  -- Chữ ký món (20261105010000_p2d_ky_mon): món đã có bị sửa trường được ký thì trả bản máy chủ (sua.mon), món mới hợp lệ được ký' || chr(10) ||
    '  v_bo := public.p2d_kiem_ky(v_cu.data -> ''bag'', v_data -> ''bag'');' || chr(10) ||
    '  if jsonb_typeof(v_data -> ''bag'') = ''array'' then v_data := jsonb_set(v_data, ''{bag}'', v_bo -> ''bag''); end if;' || chr(10) ||
    '  v_ly_do := v_ly_do || array(select jsonb_array_elements_text(v_bo -> ''ly_do''));' || chr(10) ||
    '  if jsonb_array_length(v_bo -> ''sua'') > 0 then v_sua := v_sua || jsonb_build_object(''mon'', v_bo -> ''sua''); end if;' || chr(10) || neo);
  -- bằng chứng (món gửi lên và bản máy chủ), ghi sau khi đã tính điểm nghi vấn nên không làm mất điểm của lần này
  d := replace(d, neo2,
    '  if jsonb_array_length(coalesce(v_bo -> ''chi_tiet'', ''[]''::jsonb)) > 0 and not exists (select 1 from public.p2d_nghi_van x where x.user_id = v_uid and x.ly_do = ''sua_do_mon'' and x.luc > now() - interval ''10 minutes'') then' || chr(10) ||
    '    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (v_uid, ''sua_do_mon'', jsonb_build_object(''mon'', v_bo -> ''chi_tiet''));' || chr(10) ||
    '  end if;' || chr(10) || neo2);
  execute replace(d, a, b);   -- 'sua_do_cu' (bản game cũ chưa tải lại) chỉ ghi, không cộng điểm nghi vấn
end;
$$;

-- Vá p2d_nhan_thu_moi (bản 20261029070000_p2d_gioi_thieu): món nhận từ thư mang uid mới nên ký lại
do $$
declare d text := pg_get_functiondef('public.p2d_nhan_thu_moi(bigint[],bigint)'::regprocedure);
  neo text := 'v_item := (v_nd -> ''item'') || jsonb_build_object(''uid'', v_next);';
begin
  if position('p2d_ky_dong' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_nhan_thu_moi da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, 'v_item := public.p2d_ky_dong(((v_nd -> ''item'') - ''sig'') || jsonb_build_object(''uid'', v_next));   -- uid mới: ký lại (20261105010000_p2d_ky_mon)');
end;
$$;

-- Ký một lần mọi món chưa có chữ ký: túi mọi nhân vật (không tăng phien_ban để máy đang chơi khỏi bị coi là bản cũ;
-- máy khách không cần giữ chữ ký, p2d_kiem_ky lấy lại từ bản máy chủ), món đang rao chợ, món trong thư chưa nhận.
update public.p2d_nhan_vat n
   set data = jsonb_set(n.data, '{bag}', (select coalesce(jsonb_agg(case when jsonb_typeof(it) = 'object' and not (it ? 'sig') then public.p2d_ky_dong(it) else it end order by x.i), '[]'::jsonb)
                                            from jsonb_array_elements(n.data -> 'bag') with ordinality x(it, i)))
 where jsonb_typeof(n.data -> 'bag') = 'array'
   and exists (select 1 from jsonb_array_elements(n.data -> 'bag') it where jsonb_typeof(it) = 'object' and not (it ? 'sig'));
update public.p2d_cho set mon = public.p2d_ky_dong(mon) where loai = 'mon' and jsonb_typeof(mon) = 'object' and not (mon ? 'sig');
update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{item}', public.p2d_ky_dong(noi_dung -> 'item'))
 where nhan_luc is null and jsonb_typeof(noi_dung -> 'item') = 'object' and not (noi_dung -> 'item' ? 'sig');
update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{sold}', public.p2d_ky_dong(noi_dung -> 'sold'))
 where nhan_luc is null and jsonb_typeof(noi_dung -> 'sold') = 'object' and noi_dung -> 'sold' ? 'uid' and not (noi_dung -> 'sold' ? 'sig');
