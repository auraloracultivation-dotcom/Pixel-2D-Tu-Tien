-- Phẩm trang bị = chỉ số cơ bản (chủ dự án 19/11/2026 13:18–13:33): "chỉ số trang bị theo phẩm là chỉ số cơ bản, không phải dòng đầu tiên"
-- (trước đây phẩm = trung bình màu các dòng tẩy luyện, một dòng Thượng Cổ là cả món thành Thượng Cổ, bão hoà, mất ý nghĩa).
-- 1) Phẩm món theo rarity, 7 bậc cùng tên với màu dòng: thêm tien (Tiên), thuong-co (Thượng Cổ) vào p2d_pham. Không rơi ngoài
--    (thùng đồ rơi tien chỉ đủ rương Tiên phẩm, thuong-co 0), ra từ triệu hồi, rương Tiên phẩm, quà máy chủ.
-- 2) "Ai đang cầm món phẩm Tiên nhưng phiên bản mới là Địa thì thay thành Địa, chỉ số giữ nguyên": mọi món đang có (túi, chợ, Hòm thư)
--    ghi sp = phẩm cũ (trung bình màu dòng, chưa có dòng thì theo rarity) để chỉ số / lực chiến không đổi (src/game/he-chien.js itemPham),
--    sp nằm trong phần được ký (p2d_ky_phan) nên không sửa tay được; phẩm hiển thị theo rarity. Bản lưu đổi thì tăng phien_ban.
-- 3) "Phẩm cao có tỉ lệ tẩy luyện ra dòng ngon hơn một xíu": p2d_tay_luyen nhân trọng số màu i với (1 + pham_k × phẩm × i), pham_k 0,015.
-- 4) Triệu hồi bậc t ra món phẩm thật (t 5 Tiên, 6 Thượng Cổ), dòng đầu bốc màu ngẫu nhiên (trước: món Thiên + dòng màu t).
-- Bảng p2d_ky_cfg sinh bằng node tools/ky-cfg.mjs (thêm thùng tien / thuong-co, tay.pham_k).

insert into public.p2d_pham (id, mult, dong, lo) values
  ('pham', 1.0, 1, 0), ('linh', 1.2, 2, 1), ('huyen', 1.45, 3, 1), ('dia', 1.75, 4, 2), ('thien', 2.1, 5, 3), ('tien', 2.5, 6, 3), ('thuong-co', 3.0, 7, 4)
on conflict (id) do update set mult = excluded.mult, dong = excluded.dong, lo = excluded.lo;

insert into public.p2d_ky_cfg (k, v) values ('cfg', '{"tay":{"base":120,"realm_mul":1.45,"r":1.3,"decay":0,"line_mul":2,"cost":2,"free":1,"pham_k":0.015},"mau":[[1,40],[1.3,28],[1.7,17],[2.2,9],[2.8,4],[3.6,1.6],[4.6,0.4]],"tu_pham":{"pham":0,"linh":0,"huyen":1,"dia":2,"thien":3},"cap_w":[8,12,14,15,14,12,10,7,5,3],"lpl":0.08,"cs":{"atk":[2,6,false],"atk_pct":[3,8,true],"hp":[10,30,false],"hp_pct":[4,10,true],"def":[1,4,false],"crit":[2,5,true],"crit_dmg":[8,20,true],"cdr":[2,6,true],"speed":[2,5,true],"qi_gain":[4,10,true]},"pool":{"thiet-kiem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"thanh-van-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-y":["hp","hp_pct","def","speed","cdr","qi_gain"],"huyen-giap":["hp","hp_pct","def","crit","atk"],"pt-thuong-lang":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"],"pt-tu-nguyet":["cdr","atk_pct","crit","qi_gain","hp_pct"],"pt-phan-lien":["hp_pct","def","qi_gain","cdr"],"pt-tu-tinh":["crit_dmg","crit","atk_pct","cdr"],"pt-bang-lien":["qi_gain","cdr","speed","hp","atk"],"pt-thuy-long":["hp_pct","atk_pct","qi_gain","cdr"],"pt-phuong-hoang":["atk_pct","crit_dmg","crit","qi_gain"],"pt-tinh-lien":["qi_gain","hp_pct","cdr","def"],"thiet-thuong":["atk","atk_pct","crit","crit_dmg","speed","hp"],"ba-tieu-phien":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"],"moc-cam":["atk_pct","cdr","qi_gain","crit","hp","def"],"tu-nguyet-liem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"truc-cung":["atk","atk_pct","crit","crit_dmg","speed","cdr"],"thien-mach-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-hai":["speed","hp","def","cdr","qi_gain"],"van-van-ngoa":["speed","crit","atk","hp_pct","cdr"],"bo-can":["hp","def","cdr","qi_gain","crit"],"thiet-khoi":["def","hp","hp_pct","crit","atk"],"thiet-gioi":["crit","crit_dmg","atk","atk_pct","def"],"linh-ngoc-gioi":["crit","crit_dmg","qi_gain","hp_pct","cdr"],"kim-luan":["atk","atk_pct","cdr","crit"],"tran-yeu-thap":["hp","hp_pct","def","cdr"],"hoa-hon-linh":["atk_pct","crit_dmg","cdr","qi_gain"],"xich-diem-giap":["hp","hp_pct","def","atk_pct"],"xich-diem-hai":["speed","atk","crit"],"xich-diem-quan":["crit","atk","atk_pct"],"xich-diem-gioi":["crit","crit_dmg","atk_pct"],"pt-hoa-long":["atk_pct","crit_dmg","qi_gain"],"han-bang-giap":["hp","hp_pct","def","cdr"],"han-bang-hai":["speed","def","hp"],"han-bang-quan":["def","hp","hp_pct"],"han-bang-gioi":["crit","cdr","hp_pct"],"pt-bang-tinh-hoan":["hp_pct","def","qi_gain"],"hac-phong-giap":["hp","speed","cdr","atk_pct"],"hac-phong-hai":["speed","cdr","crit"],"hac-phong-quan":["crit","cdr","speed"],"hac-phong-gioi":["crit","crit_dmg","cdr"],"pt-tu-diem-duc":["cdr","atk_pct","qi_gain"],"thanh-moc-bao":["hp","hp_pct","def","qi_gain"],"thanh-moc-hai":["speed","hp_pct","def"],"thanh-moc-quan":["hp","hp_pct","qi_gain"],"thanh-moc-gioi":["crit","crit_dmg","hp_pct"],"pt-thanh-dang":["qi_gain","hp_pct","def"],"kim-cang-giap":["def","hp_pct","atk_pct"],"kim-cang-hai":["speed","atk_pct","crit"],"kim-cang-quan":["crit","crit_dmg","atk_pct"],"kim-cang-gioi":["crit","crit_dmg","atk_pct"],"pt-kim-kiem-tran":["atk_pct","crit_dmg","cdr"],"hau-tho-giap":["hp","def","hp_pct"],"hau-tho-hai":["def","speed","hp_pct"],"hau-tho-quan":["def","hp","hp_pct"],"hau-tho-gioi":["hp_pct","def","crit"],"pt-kim-duong":["def","hp_pct","qi_gain"],"dao-van-binh":["atk","atk_pct","crit","crit_dmg","cdr"],"dao-van-quan":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-bao":["hp","hp_pct","def","atk_pct"],"pt-kim-diem-quan":["atk_pct","crit_dmg","cdr","qi_gain"],"dao-van-hai":["speed","crit","cdr","atk_pct"],"dao-van-gioi":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-an":["atk","atk_pct","cdr","crit"],"thai-hu-giap":["hp","hp_pct","cdr","atk_pct"],"thai-hu-hai":["speed","cdr","crit"],"thai-hu-quan":["crit","cdr","atk_pct"],"thai-hu-gioi":["crit","crit_dmg","atk_pct"],"pt-tinh-van":["cdr","atk_pct","qi_gain"]},"cuong":{"max":20,"iron":[1,2,3,4,5,6,8,10,12,15,18,21,25,30,36,43,51,61,73,87],"stones":[0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,11,13,15,17,20],"coins":[0,0,0,0,0,0,0,0,0,0,2000,2700,3600,4900,6600,8900,12000,16200,21900,29500],"rate":[1,1,0.95,0.85,0.75,0.65,0.55,0.45,0.35,0.25,0.22,0.2,0.18,0.16,0.14,0.12,0.11,0.1,0.09,0.08],"drop_from":7,"drop_chance":0.5,"open":{"base":10,"from_realm":2,"per_realm":2}},"he":["moc","hoa","thuy","kim","tho"],"doi_he":{"mat":"dao-van-thach","n":1},"ngoc":{"types":["hong-ngoc","lam-ngoc","hoang-ngoc","luc-ngoc"],"max":20,"merge":3,"phi":[30,2.5],"lo":{"max_lv":4,"toc_phut":20,"tran":600},"truyen":[[3,"hong-ngoc:5"],[4,"lam-ngoc:5"],[6,"hoang-ngoc:5"],[10,"luc-ngoc:5"]],"zalo":5},"pb_max":20,"luyen":{"base":3,"r":1.35,"mat":"manh-phap-bao","bases":["kim-luan","tran-yeu-thap","hoa-hon-linh","dao-van-an"]},"roi":{"thu_tu":["pham","linh","huyen","dia","thien","tien","thuong-co"],"phut":{"pham":20,"linh":10,"huyen":6,"dia":3,"thien":1,"tien":0,"thuong-co":0},"gio":{"pham":30,"linh":15,"huyen":12,"dia":6,"thien":3,"tien":0.25,"thuong-co":0},"tran":{"pham":400,"linh":300,"huyen":250,"dia":150,"thien":80,"tien":5,"thuong-co":0},"mau":{"t":5,"phut":0.2,"gio":1,"tran":20},"dong":1,"tang":9,"nang":2,"nho":60},"thu":{"pet":{"ids":["moc-linh","ma-tieu","hoa-lang","viem-linh","ma-cung","tuyet-lang","moc-yeu","kiem-hon","tho-khoi","hu-anh","phong-yeu","bang-tinh"],"max":20,"evo_max":40,"evo_lv":20,"evo_lt":600,"evo_mats":{"yeu-huyet":12,"tinh-thiet":8},"exp":[40,1.35],"starter":"moc-linh"},"comp":{"ids":["tieu-hoa","ho-linh","thanh-diep","mac-anh","thach-sinh","thiet-lan","kl-dong-phuc","kl-thanh-sam","kl-hac-y","kl-hong-y","kl-bach-kiem-bao","kl-tu-liem-y","kl-huyet-giap","kl-bi-ngo","kl-tuyet-lanh","kl-tien-nhan","kl-hoang-kim","kl-tet-do","kl-thien-mach-bao","kl-bang-y-han-bang","kl-luc-bao-thanh-moc","kl-tho-bao-hau-tho","kl-than-nguyen-y","kl-huyet-nguyet","kl-tu-linh-ma-yeu","kl-ly-hoa"],"max":30,"exp":[60,1.4],"gia":{"tieu-hoa":8000,"ho-linh":8000,"thanh-diep":10000,"mac-anh":12000,"thach-sinh":15000,"thiet-lan":18000,"kl-dong-phuc":40000,"kl-thanh-sam":40000,"kl-hac-y":40000,"kl-hong-y":40000,"kl-bach-kiem-bao":40000,"kl-tu-liem-y":40000,"kl-huyet-giap":40000,"kl-bi-ngo":40000,"kl-tuyet-lanh":40000,"kl-tien-nhan":40000,"kl-hoang-kim":40000,"kl-tet-do":40000,"kl-thien-mach-bao":40000,"kl-bang-y-han-bang":40000,"kl-luc-bao-thanh-moc":40000,"kl-tho-bao-hau-tho":40000,"kl-than-nguyen-y":40000,"kl-huyet-nguyet":40000,"kl-tu-linh-ma-yeu":40000,"kl-ly-hoa":40000}},"tech":{"ids":["kiem-tong-tam-phap","truong-sinh-quyet","kim-chung-trao","huyet-ma-kinh","loi-am-quyet","phong-hanh-thuat","ngu-hanh-quy-nguyen","thai-thuong-vong-tinh","huyen-bang-quyet","han-phong-bo","hac-phong-quyet","thanh-moc-truong-xuan","canh-kim-kiem-quyet","hau-tho-quyet","thai-hu-quyet","canh-kim-tu-linh","thanh-moc-duong-linh","bich-hai-hoi-linh","xich-viem-luyen-linh","hau-tho-tang-linh","van-linh-quy-nguyen"],"max":10,"exp":[40,1.6],"slots":3,"starter":"kiem-tong-tam-phap"},"cuoi":{"ids":["cuu-vi-ho","rua-non-bo","su-thuu","huou-sao","hoa-long","rua-nam","meo-co-quan","ca-voi-may","coc-sen","ho-pha-le","phuong-hoang","sua-den-long","su-tu-da","bach-tuoc","huou-may","nhen-pha-le"],"gia":{},"roi":[],"starter":null,"lenh":7,"lenh_ngay":10},"dong":{"pool":["atk","hp","def","crit","crit_dmg","atk_pct","hp_pct"],"phi":[500,2],"mats":{"linh-thao":3},"mpool":["atk_pct","hp_pct","crit","crit_dmg","cdr","speed","qi_gain"],"mphi":3000,"mmats":{"linh-thao":5}},"thoi":{"pool":["atk_pct","hp_pct","crit","crit_dmg","cdr","speed","qi_gain"],"bo":{"tp-02":[0,null,null,false,null],"tp-10":[0,null,null,false,null],"tp-05":[0,null,null,false,null],"tp-07":[0,null,null,false,null],"tp-08":[0,null,null,false,null],"tp-16":[0,null,null,false,null],"tp-01":[5,null,50000,false,null],"tp-09":[5,null,50000,false,null],"tp-11":[5,null,50000,false,null],"tp-04":[5,null,50000,false,null],"tp-06":[5,null,50000,false,null],"tp-13":[5,null,50000,false,null],"tp-14":[5,null,50000,false,null],"tp-03":[5,null,50000,false,null],"tp-12":[5,null,50000,false,null],"tp-15":[5,null,50000,false,null]},"look":["nam","nu"],"def":"nam","tn":{}},"chieu":{"ids":["kiem-khi","dang-phuoc","hoi-xuan","hoa-cau","liet-diem","bang-truy","thuy-thuan","kim-quang-tram","kim-cuong-the","dia-chan","thach-giap","van-moc-cham","thanh-moc-vuc","luc-dang-long","truong-xuan","hoa-long","phan-thien","liet-hoa-tran","phuong-hoang","bang-phong","thuy-long","han-bang-vuc","bang-phach","van-kiem","kim-luan","loi-dinh","kim-than","luu-sa","thach-chuy","son-nhac","dai-dia","long-thuong","cuong-phong","that-huyen","tu-nguyet-liem","song-nguyet-tram","tu-nguyet-luan","lien-chau","phap-kim-luan","phap-thanh-moc","phap-huyen-thuy","phap-tran-yeu","phap-hoa-hon","thiem-anh","vo-anh","van-kiem-thien","pha-thien","thien-phat"],"max":30,"mat":"bi-kip-chieu","book":[1,1.25],"coins":[150,1.3]},"dong_phu":[[1,300,{"tinh-thiet":10,"linh-thao":10}],[2,1000,{"tinh-thiet":20,"hoa-linh-chi":8}],[3,3000,{"tinh-thiet":35,"yeu-huyet":20}],[4,8000,{"tinh-thiet":60,"yeu-vuong-dan":1}]],"sv":{"exp_k":{"pet":1,"comp":1.6,"tech":6},"sao":{"phut":4,"tran":240},"moi":{"phut":0.05,"tran":3},"cuoi":{"phut":0.0042,"tran":2},"cp_moi":{"phut":1.5,"tran":30},"ban":{"giay":20,"tran":60000,"toc_giay":7200},"dau":0.34}}}'::jsonb)
on conflict (k) do update set v = excluded.v;

create or replace function public.p2d_ky_phan(p_mon jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(p_mon) = 'object' then p_mon else '{}'::jsonb end) e
   where e.key = any (array['uid', 'base', 'rarity', 'lvl', 'main', 'lines', 'plus', 'cap', 'el', 'wt', 'dv', 'set', 'sockets', 'pb', 'sp'])
$$;

-- phẩm cũ của một món (trước 19/11/2026): trung bình màu dòng, chưa có dòng màu thì bậc theo rarity
create or replace function public.p2d_pham_cu(p_mon jsonb)
returns integer
language sql
immutable
set search_path = ''
as $$
  select greatest(0, least(6, coalesce(
    (select round(avg((l ->> 't')::numeric))::int from jsonb_array_elements(case when jsonb_typeof(p_mon -> 'lines') = 'array' then p_mon -> 'lines' else '[]'::jsonb end) l
      where jsonb_typeof(l -> 't') = 'number'),
    array_position(array['pham', 'linh', 'huyen', 'dia', 'thien', 'tien', 'thuong-co'], p_mon ->> 'rarity') - 1, 0)))
$$;

-- ghi sp cho một món (đã có sp hoặc không phải món thì để nguyên), ký lại nếu món đã ký
create or replace function public.p2d_gan_sp(p_mon jsonb)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select case when jsonb_typeof(p_mon) <> 'object' or not (p_mon ? 'base') or p_mon ? 'sp' then p_mon
    when p_mon ? 'sig' then public.p2d_ky_dong((p_mon - 'sig') || jsonb_build_object('sp', public.p2d_pham_cu(p_mon)))
    else p_mon || jsonb_build_object('sp', public.p2d_pham_cu(p_mon)) end
$$;

do $$
declare r record; v_bag jsonb;
begin
  for r in select user_id, data from public.p2d_nhan_vat
    where jsonb_typeof(data -> 'bag') = 'array' and exists (select 1 from jsonb_array_elements(data -> 'bag') e where jsonb_typeof(e) = 'object' and e ? 'base' and not e ? 'sp') loop
    select coalesce(jsonb_agg(public.p2d_gan_sp(e) order by n), '[]'::jsonb) into v_bag from jsonb_array_elements(r.data -> 'bag') with ordinality as t(e, n);
    update public.p2d_nhan_vat set data = jsonb_set(data, '{bag}', v_bag), phien_ban = phien_ban + 1, updated_at = now() where user_id = r.user_id;
  end loop;
  update public.p2d_cho set mon = public.p2d_gan_sp(mon) where jsonb_typeof(mon) = 'object' and mon ? 'base' and not mon ? 'sp';
  update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{item}', public.p2d_gan_sp(noi_dung -> 'item'))
   where nhan_luc is null and jsonb_typeof(noi_dung -> 'item') = 'object' and not (noi_dung -> 'item') ? 'sp';
  update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{sold}', public.p2d_gan_sp(noi_dung -> 'sold'))
   where nhan_luc is null and jsonb_typeof(noi_dung -> 'sold') = 'object' and not (noi_dung -> 'sold') ? 'sp';
end $$;

-- triệu hồi: bậc t = phẩm món, dòng đầu màu ngẫu nhiên (bảng mau của p2d_ky_cfg, phẩm cao nghiêng nhẹ lên màu cao như tẩy luyện)
update public.p2d_ht_cfg set v = jsonb_set(jsonb_set(v, '{tier_rar}', '["pham", "linh", "huyen", "dia", "thien", "tien", "thuong-co"]'::jsonb),
  '{rar}', coalesce(v -> 'rar', '{}'::jsonb) || '{"tien": {"mult": 2.5, "sockets": 3}, "thuong-co": {"mult": 3.0, "sockets": 4}}'::jsonb)
 where k = 'cfg';

create or replace function public.p2d_ht_do(p_t integer, p_lvl integer)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); k jsonb := (select v from public.p2d_ky_cfg where k = 'cfg');
  v_base text; b jsonb; r jsonb; v_rid text; v_main jsonb := '{}'::jsonb;
  kv record; v_s text; st jsonb; v_cap int := 1; v_tot numeric; v_x numeric; i int; v_val int; v_pool jsonb; v_lt int;
begin
  select k2 into v_base from jsonb_object_keys(c -> 'bases') k2 where coalesce(c -> 'bases' -> k2 ->> 'slot', '') <> 'phap-bao' order by random() limit 1;
  b := c -> 'bases' -> v_base;
  v_rid := c -> 'tier_rar' ->> p_t; r := c -> 'rar' -> v_rid;
  for kv in select * from jsonb_each(b -> 'main') loop
    st := c -> 'stats' -> kv.key;
    v_main := v_main || jsonb_build_object(kv.key, greatest(1, round((kv.value #>> '{}')::numeric
      * (case when coalesce((st ->> 'pct')::boolean, false) then 1 else 1 + p_lvl * (c ->> 'main_per_lvl')::numeric end) * (r ->> 'mult')::numeric)));
  end loop;
  v_lt := public.p2d_ky_boc(array(select (x ->> 1)::numeric * (1 + coalesce((k -> 'tay' ->> 'pham_k')::numeric, 0) * p_t * (n - 1))
                                  from jsonb_array_elements(k -> 'mau') with ordinality a(x, n) order by n));
  v_pool := b -> 'pool';
  v_s := v_pool ->> floor(random() * jsonb_array_length(v_pool))::int;
  st := c -> 'stats' -> v_s;
  v_val := greatest(1, round(((st ->> 'min')::numeric + random() * ((st ->> 'max')::numeric - (st ->> 'min')::numeric))
    * (case when coalesce((st ->> 'pct')::boolean, false) then 1 else 1 + p_lvl * (c ->> 'line_per_lvl')::numeric end) * (c -> 'tiers' ->> v_lt)::numeric));
  select sum(x::numeric) into v_tot from jsonb_array_elements_text(c -> 'cap_w') x;
  v_x := random() * v_tot;
  for i in 0 .. jsonb_array_length(c -> 'cap_w') - 1 loop
    v_x := v_x - (c -> 'cap_w' ->> i)::numeric;
    if v_x <= 0 then v_cap := i + 1; exit; end if;
  end loop;
  return jsonb_build_object('uid', 0, 'base', v_base, 'rarity', v_rid, 'lvl', p_lvl, 'main', v_main,
    'lines', jsonb_build_array(jsonb_build_object('s', v_s, 'v', v_val, 't', v_lt)), 'cap', v_cap,
    'sockets', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, coalesce((r ->> 'sockets')::int, 0))),
    'el', c -> 'els' ->> floor(random() * jsonb_array_length(c -> 'els'))::int);
end;
$$;

-- tẩy luyện: phẩm món (bậc rarity theo thứ tự roi.thu_tu) cao thì màu cao dễ ra hơn một chút; còn lại giữ nguyên bản 20261105...
create or replace function public.p2d_tay_luyen(p_uid bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg'); v_t0 jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_lines jsonb; v_pool jsonb; v_cs jsonb; v_line jsonb;
  v_n integer; v_cap integer; v_free numeric; v_fee numeric := 0; v_cost numeric := 0; v_realm integer; v_day numeric; v_cnt numeric;
  v_t integer; v_s text; v_q numeric; v_lo integer; v_pb integer; v_ph integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  v_pool := v_cfg -> 'pool' -> (v_it ->> 'base');
  if jsonb_typeof(v_pool) is distinct from 'array' or jsonb_array_length(v_pool) = 0 then raise exception 'mon_sai' using errcode = '22023'; end if;
  v_lines := case when jsonb_typeof(v_it -> 'lines') = 'array' then v_it -> 'lines' else '[]'::jsonb end;
  v_n := jsonb_array_length(v_lines);
  v_q := public.p2d_ky_so(v_it -> 'cap');
  if v_q is not null and v_q = floor(v_q) then v_cap := v_q::integer;
  else
    v_cap := greatest(v_n, public.p2d_ky_boc(array(select x::numeric from jsonb_array_elements_text(v_cfg -> 'cap_w') with ordinality a(x, i) order by i)) + 1);
    v_it := v_it || jsonb_build_object('cap', v_cap);
  end if;
  if v_n >= v_cap then
    if v_q is null or v_q <> floor(v_q) then
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
    v_day := floor((extract(epoch from now()) + 25200) / 86400);
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
  v_ph := greatest(0, coalesce((select (o - 1)::int from jsonb_array_elements_text(v_cfg -> 'roi' -> 'thu_tu') with ordinality a(x, o) where x = v_it ->> 'rarity'), 0));
  v_t := public.p2d_ky_boc(array(select (x -> 1)::text::numeric * (1 + coalesce((v_cfg -> 'tay' ->> 'pham_k')::numeric, 0) * v_ph * (i - 1))
                                  from jsonb_array_elements(v_cfg -> 'mau') with ordinality a(x, i) order by i));
  v_s := v_pool ->> floor(random() * jsonb_array_length(v_pool))::integer;
  v_cs := v_cfg -> 'cs' -> v_s;
  v_line := jsonb_build_object('s', v_s, 't', v_t, 'v', greatest(1, round(
    ((v_cs ->> 0)::numeric + random()::numeric * ((v_cs ->> 1)::numeric - (v_cs ->> 0)::numeric))
    * case when (v_cs ->> 2)::boolean then 1 else 1 + coalesce(public.p2d_ky_so(v_it -> 'lvl'), 0) * (v_cfg ->> 'lpl')::numeric end
    * (v_cfg -> 'mau' -> v_t ->> 0)::numeric)));
  v_lines := v_lines || jsonb_build_array(v_line);
  v_it := v_it || jsonb_build_object('lines', v_lines);
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

-- kiểm túi lúc lưu: sp là phần ký (như rarity); món mới máy khách gửi lên không được tự ghi sp (bỏ trước khi ký), món cũ đổi sp thì trả lại
create or replace function public.p2d_kiem_ky(p_cu jsonb, p_moi jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg');
  v_ky text[] := array['uid', 'base', 'rarity', 'lvl', 'main', 'lines', 'plus', 'cap', 'el', 'wt', 'dv', 'set', 'sockets', 'pb', 'sp'];
  v_map jsonb; v_ra jsonb := '[]'; v_sua jsonb := '[]'; v_ct jsonb := '[]'; v_ly text[] := '{}';
  v_g jsonb; v_n jsonb; v_o jsonb; v_o2 jsonb; v_pn jsonb; v_po jsonb; v_doi_mau boolean; v_kh text;
  v_sk jsonb; v_skn jsonb; v_pad jsonb; v_q numeric; v_qo numeric;
begin
  if jsonb_typeof(p_moi) = 'array' and jsonb_typeof(p_cu) = 'array' and p_moi = p_cu
     and (select bool_and(jsonb_typeof(o) = 'object' and jsonb_typeof(o -> 'uid') = 'number') and count(distinct o ->> 'uid') = count(*) from jsonb_array_elements(p_moi) o) is not false then
    return jsonb_build_object('bag', p_moi, 'ly_do', '[]'::jsonb, 'sua', '[]'::jsonb, 'chi_tiet', '[]'::jsonb);
  end if;
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
      null;
    elsif v_o is null then
      v_n := v_n - 'sig' - 'free' - 'sp';
      if jsonb_typeof(v_n -> 'sockets') = 'array' and exists (select 1 from jsonb_array_elements(v_n -> 'sockets') s where s <> 'null'::jsonb) then
        v_n := jsonb_set(v_n, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(v_n -> 'sockets')));
        v_sua := v_sua || jsonb_build_array(v_n);
      end if;
      if (v_g ? 'sp') and not (v_sua @> jsonb_build_array(v_n)) then v_sua := v_sua || jsonb_build_array(v_n); end if;
      if public.p2d_mon_hop_le(v_n) and public.p2d_lo_hop_le(v_n) then v_n := public.p2d_ky_dong(v_n); end if;
    elsif (v_n - 'sig') = (v_o - 'sig') then
      v_n := v_o;
    else
      v_sk := case when jsonb_typeof(v_o -> 'sockets') = 'array' then v_o -> 'sockets' end;
      v_skn := v_n -> 'sockets'; v_pad := v_sk;
      if v_skn is distinct from v_sk then
        if jsonb_typeof(v_skn) = 'array' and jsonb_array_length(v_skn) > coalesce(jsonb_array_length(v_sk), 0) and jsonb_array_length(v_skn) <= 6 then
          v_pad := coalesce(v_sk, '[]'::jsonb);
          while jsonb_array_length(v_pad) < jsonb_array_length(v_skn) loop v_pad := v_pad || 'null'::jsonb; end loop;
          if not public.p2d_lo_hop_le(v_o || jsonb_build_object('sockets', v_pad)) then v_pad := v_sk; end if;
        end if;
        if v_skn is distinct from v_pad then
          v_ly := array_append(v_ly, case when public.p2d_lo_hop_le(v_n) then 'ngoc_cu' else 'ngoc_sai' end);
        end if;
        v_n := case when v_pad is null then v_n - 'sockets' else v_n || jsonb_build_object('sockets', v_pad) end;
      end if;
      v_o2 := case when v_pad is distinct from v_sk then v_o || jsonb_build_object('sockets', v_pad) else v_o end;
      if (v_n -> 'pb') is distinct from (v_o -> 'pb') then
        v_q := public.p2d_ky_so(v_n -> 'pb'); v_qo := coalesce(public.p2d_ky_so(v_o -> 'pb'), 0);
        v_ly := array_append(v_ly, case when v_q > v_qo and v_q <= v_qo + 3 and v_q <= (v_cfg ->> 'pb_max')::numeric then 'sua_do_cu' else 'sua_do' end);
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('uid', v_n -> 'uid', 'gui', jsonb_build_object('pb', v_n -> 'pb'), 'may_chu', jsonb_build_object('pb', v_o -> 'pb'))); end if;
        v_n := case when v_o ? 'pb' then v_n || jsonb_build_object('pb', v_o -> 'pb') else v_n - 'pb' end;
      end if;
      -- sp (phẩm tính chỉ số của đồ cũ, 19/11/2026): luôn theo máy chủ, máy khách không đổi được, không tính là sửa đồ
      v_n := case when v_o ? 'sp' then v_n || jsonb_build_object('sp', v_o -> 'sp') else v_n - 'sp' end;
      if v_o ? 'cap' then v_n := v_n || jsonb_build_object('cap', v_o -> 'cap');
      elsif v_n ? 'cap' then
        v_n := v_n || jsonb_build_object('cap', greatest(jsonb_array_length(case when jsonb_typeof(v_o -> 'lines') = 'array' then v_o -> 'lines' else '[]'::jsonb end),
          public.p2d_ky_boc(array(select x::numeric from jsonb_array_elements_text(v_cfg -> 'cap_w') with ordinality a(x, i) order by i)) + 1));
      end if;
      if coalesce(v_o ->> 'el', '') <> '' then v_n := v_n || jsonb_build_object('el', v_o -> 'el');
      elsif v_n ? 'el' then v_n := v_n || jsonb_build_object('el', v_cfg -> 'he' -> ((v_n ->> 'uid')::numeric % jsonb_array_length(v_cfg -> 'he'))::integer);
      end if;
      v_pn := public.p2d_ky_phan(v_n); v_po := public.p2d_ky_phan(v_o2); v_doi_mau := false;
      if v_pn = v_po then
        null;
      elsif public.p2d_ky_cu_hop_le(v_o2, v_n) then
        v_doi_mau := (v_pn -> 'lines') is distinct from (v_po -> 'lines')
          and exists (select 1 from jsonb_array_elements(v_po -> 'lines') l where public.p2d_ky_so(l -> 't') is null);
      else
        v_ly := array_append(v_ly, case when public.p2d_ky_nhe(v_o2, v_n) then 'sua_do_cu' else 'sua_do' end);
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('uid', v_n -> 'uid', 'gui', v_pn, 'may_chu', v_po)); end if;
        v_n := (v_n - v_ky) || v_po; v_pn := v_po;
      end if;
      foreach v_kh in array array['free', 'rr', 'rrDay'] loop
        v_n := case when v_o ? v_kh then v_n || jsonb_build_object(v_kh, v_o -> v_kh) else v_n - v_kh end;
      end loop;
      if v_doi_mau then v_n := v_n || jsonb_build_object('free', coalesce(public.p2d_ky_so(v_o -> 'free'), 0) + (v_cfg -> 'tay' ->> 'free')::numeric); end if;
      if v_pn = public.p2d_ky_phan(v_o) then v_n := case when v_o ? 'sig' then v_n || jsonb_build_object('sig', v_o -> 'sig') else v_n - 'sig' end;
      else v_n := public.p2d_ky_dong(v_n); end if;
      if (v_n - 'sig') <> (v_g - 'sig') then v_sua := v_sua || jsonb_build_array(v_n); end if;
    end if;
    v_ra := v_ra || jsonb_build_array(v_n);
  end loop;
  return jsonb_build_object('bag', v_ra, 'ly_do', to_jsonb(array(select distinct unnest(v_ly))), 'sua', v_sua, 'chi_tiet', v_ct);
end;
$$;
