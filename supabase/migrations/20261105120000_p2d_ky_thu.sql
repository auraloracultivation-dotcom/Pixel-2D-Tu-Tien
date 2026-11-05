-- Chữ ký giai đoạn 4 (chủ dự án duyệt 05/11/2026 10:59 "vá lỗ hổng linh thú"): LINH THÚ, KHÔI LỖI, THÚ CƯỠI, CÔNG PHÁP,
-- THỜI TRANG, CẤP CHIÊU, ĐỘNG PHỦ do máy chủ kiểm. Trước đây p2d_luu nhận nguyên các khoá pets, comps, mounts, mountLine, techs,
-- outfits, outfitLine, skillLv, caveLv máy khách gửi: tài khoản "Đạo hữu 2DDC" (cảnh giới 1, 30 quái) có 12 linh thú cấp 40
-- 20 sao dòng Đen, 8 khôi lỗi cấp 30, thú cưỡi mua khi chỉ có 1.023 Linh Thạch, dòng thú cưỡi "tốc chạy Đen 50".
-- Từ nay p2d_luu gọi p2d_kiem_thu (vá bằng thay chuỗi, ngay sau p2d_kiem_ngoc), so bản gửi với bản máy chủ, chỉ xét phần đổi:
-- 1) Đồ mua (thú cưỡi, khôi lỗi, thời trang, tiến hoá linh thú, cấp chiêu, động phủ): chỉ nhận khi trong cùng lần lưu Linh Thạch /
--    nguyên liệu giảm ít nhất bằng giá; phần thu nhập cùng lần lưu được bù từ thùng hạn mức Linh Thạch / nguyên liệu của p2d_luu
--    (lt_xo, nl_xo: bù bao nhiêu thì thùng trừ bấy nhiêu, tương đương nhận Linh Thạch rồi mua). Không trả: bỏ, trả sua.thu.
-- 2) Linh thú: loài mới tối đa sv.moi (thùng theo phút còn liên lạc), Mộc Linh khởi đầu miễn phí một lần; bản sao + sao (tổng
--    copies + 2^sao − 1) chỉ tăng từ thùng sv.sao; tiến hoá cần đủ cấp và trả phí; cấp tối đa 20 / 40 (đã tiến hoá); kinh nghiệm
--    tăng tối đa sv.exp_k × tốc linh khí trần (như trigger p2d_kiem_linh_khi) mỗi giây còn liên lạc (+20 linh khí / giây vắng mặt,
--    tối đa 8 giờ), chỉ con đang mang; con không mang chỉ lớn bằng bản sao mới (mỗi bản sao một cấp, như petKill).
--    Khôi lỗi: như trên, không sao / tiến hoá; mới thì phải mua. Công pháp: cuốn mới / bí kíp trùng từ thùng sv.cp_moi.
-- 3) Dòng tẩy luyện linh thú / khôi lỗi, dòng thú cưỡi: máy chủ giữ. Tẩy luyện qua p2d_tay_thu (máy chủ tung, trừ phí trên bản
--    lưu máy chủ, như p2d_tay_luyen). Dòng thú cưỡi mới, dòng thời trang mới: máy chủ tự bốc (máy khách gửi chỗ trống {wait}),
--    thời trang đúng phẩm theo giá / nguồn (src/game/beast.js outfitLine); dòng đã có không đổi được (trừ bộ đổi phẩm vì đổi giá).
-- 4) Sai luật: trả bản máy chủ ở sua.thu, ghi 'thu_sua' (cộng điểm nghi vấn, bằng chứng 'thu_mon'); lố nhẹ hoặc bản game cũ tự
--    tẩy ở máy: 'thu_nhieu' / 'thu_cu' (chỉ ghi); lần lưu đầu: 'thu_dau' (chỉ ghi). Thùng lưu ở data.kyThu (máy chủ giữ).
-- 5) Thời trang mua bằng Tiên Ngọc: p2d_doi_tn ghi luôn bộ vào bản lưu máy chủ (vá thay chuỗi).
-- Bản lưu hiện có của mọi người là mốc (không sửa ai); chưa có kyThu thì thùng đầy. Số ở p2d_ky_cfg.thu (tools/ky-cfg.mjs dựng
-- từ data/pets.json server, techniques.json server, companions.json, fashion.json, config.json skill_lv, cave.json; check.mjs so).
-- Chạy sau 20261105090000_p2d_luu_vi.sql. Chạy lại cả file không sao (bảng số ghi đè, hàm thay mới, phần vá đã vá thì bỏ qua).

insert into public.p2d_ky_cfg (k, v) values ('cfg', '{"tay":{"base":120,"realm_mul":1.45,"r":1.3,"decay":0,"line_mul":2,"cost":2,"free":1},"mau":[[1,40],[1.3,28],[1.7,17],[2.2,9],[2.8,4],[3.6,1.6],[4.6,0.4]],"tu_pham":{"pham":0,"linh":0,"huyen":1,"dia":2,"thien":3},"cap_w":[8,12,14,15,14,12,10,7,5,3],"lpl":0.08,"cs":{"atk":[2,6,false],"atk_pct":[3,8,true],"hp":[10,30,false],"hp_pct":[4,10,true],"def":[1,4,false],"crit":[2,5,true],"crit_dmg":[8,20,true],"cdr":[2,6,true],"speed":[2,5,true],"qi_gain":[4,10,true]},"pool":{"thiet-kiem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"thanh-van-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-y":["hp","hp_pct","def","speed","cdr","qi_gain"],"huyen-giap":["hp","hp_pct","def","crit","atk"],"ngoc-boi-tho":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"],"linh-phu":["qi_gain","cdr","speed","hp","atk"],"thiet-thuong":["atk","atk_pct","crit","crit_dmg","speed","hp"],"ba-tieu-phien":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"],"moc-cam":["atk_pct","cdr","qi_gain","crit","hp","def"],"tu-nguyet-liem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"truc-cung":["atk","atk_pct","crit","crit_dmg","speed","cdr"],"thien-mach-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-hai":["speed","hp","def","cdr","qi_gain"],"van-van-ngoa":["speed","crit","atk","hp_pct","cdr"],"bo-can":["hp","def","cdr","qi_gain","crit"],"thiet-khoi":["def","hp","hp_pct","crit","atk"],"thiet-gioi":["crit","crit_dmg","atk","atk_pct","def"],"linh-ngoc-gioi":["crit","crit_dmg","qi_gain","hp_pct","cdr"],"kim-luan":["atk","atk_pct","cdr","crit"],"tran-yeu-thap":["hp","hp_pct","def","cdr"],"hoa-hon-linh":["atk_pct","crit_dmg","cdr","qi_gain"],"xich-diem-giap":["hp","hp_pct","def","atk_pct"],"xich-diem-hai":["speed","atk","crit"],"xich-diem-quan":["crit","atk","atk_pct"],"xich-diem-gioi":["crit","crit_dmg","atk_pct"],"xich-diem-boi":["atk_pct","crit_dmg","qi_gain"],"han-bang-giap":["hp","hp_pct","def","cdr"],"han-bang-hai":["speed","def","hp"],"han-bang-quan":["def","hp","hp_pct"],"han-bang-gioi":["crit","cdr","hp_pct"],"han-bang-boi":["hp_pct","def","qi_gain"],"hac-phong-giap":["hp","speed","cdr","atk_pct"],"hac-phong-hai":["speed","cdr","crit"],"hac-phong-quan":["crit","cdr","speed"],"hac-phong-gioi":["crit","crit_dmg","cdr"],"hac-phong-boi":["cdr","atk_pct","qi_gain"],"thanh-moc-bao":["hp","hp_pct","def","qi_gain"],"thanh-moc-hai":["speed","hp_pct","def"],"thanh-moc-quan":["hp","hp_pct","qi_gain"],"thanh-moc-gioi":["crit","crit_dmg","hp_pct"],"thanh-moc-boi":["qi_gain","hp_pct","def"],"kim-cang-giap":["def","hp_pct","atk_pct"],"kim-cang-hai":["speed","atk_pct","crit"],"kim-cang-quan":["crit","crit_dmg","atk_pct"],"kim-cang-gioi":["crit","crit_dmg","atk_pct"],"kim-cang-boi":["atk_pct","crit_dmg","cdr"],"hau-tho-giap":["hp","def","hp_pct"],"hau-tho-hai":["def","speed","hp_pct"],"hau-tho-quan":["def","hp","hp_pct"],"hau-tho-gioi":["hp_pct","def","crit"],"hau-tho-boi":["def","hp_pct","qi_gain"],"dao-van-binh":["atk","atk_pct","crit","crit_dmg","cdr"],"dao-van-quan":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-bao":["hp","hp_pct","def","atk_pct"],"dao-van-boi":["atk_pct","crit_dmg","cdr","qi_gain"],"dao-van-hai":["speed","crit","cdr","atk_pct"],"dao-van-gioi":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-an":["atk","atk_pct","cdr","crit"],"thai-hu-giap":["hp","hp_pct","cdr","atk_pct"],"thai-hu-hai":["speed","cdr","crit"],"thai-hu-quan":["crit","cdr","atk_pct"],"thai-hu-gioi":["crit","crit_dmg","atk_pct"],"thai-hu-boi":["cdr","atk_pct","qi_gain"]},"cuong":{"max":20,"iron":[1,2,3,4,5,6,8,10,12,15,18,21,25,30,36,43,51,61,73,87],"stones":[0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,11,13,15,17,20],"coins":[0,0,0,0,0,0,0,0,0,0,2000,2700,3600,4900,6600,8900,12000,16200,21900,29500],"rate":[1,1,0.95,0.85,0.75,0.65,0.55,0.45,0.35,0.25,0.22,0.2,0.18,0.16,0.14,0.12,0.11,0.1,0.09,0.08],"drop_from":7,"drop_chance":0.5,"open":{"base":10,"from_realm":2,"per_realm":2}},"he":["moc","hoa","thuy","kim","tho"],"doi_he":{"mat":"dao-van-thach","n":1},"ngoc":{"types":["hong-ngoc","lam-ngoc","hoang-ngoc","luc-ngoc"],"max":20,"merge":3,"phi":[30,2.5],"lo":{"max_lv":4,"toc_phut":20,"tran":600},"truyen":[[3,"hong-ngoc:5"],[4,"lam-ngoc:5"],[6,"hoang-ngoc:5"],[10,"luc-ngoc:5"]],"zalo":5},"pb_max":20,"luyen":{"base":3,"r":1.35,"mat":"manh-phap-bao","bases":["kim-luan","tran-yeu-thap","hoa-hon-linh","dao-van-an"]},"roi":{"thu_tu":["pham","linh","huyen","dia","thien"],"phut":{"pham":20,"linh":10,"huyen":6,"dia":3,"thien":1},"gio":{"pham":30,"linh":15,"huyen":12,"dia":6,"thien":3},"tran":{"pham":400,"linh":300,"huyen":250,"dia":150,"thien":80},"mau":{"t":5,"phut":0.2,"gio":1,"tran":20},"dong":1,"tang":9,"nang":2,"nho":60},"thu":{"pet":{"ids":["moc-linh","ma-tieu","hoa-lang","viem-linh","ma-cung","tuyet-lang","moc-yeu","kiem-hon","tho-khoi","hu-anh","phong-yeu","bang-tinh"],"max":20,"evo_max":40,"evo_lv":20,"evo_lt":600,"evo_mats":{"yeu-huyet":12,"tinh-thiet":8},"exp":[40,1.35],"starter":"moc-linh"},"comp":{"ids":["tieu-hoa","ho-linh","thanh-diep","mac-anh","thach-sinh","thiet-lan"],"max":30,"exp":[60,1.4],"gia":{"tieu-hoa":8000,"ho-linh":8000,"thanh-diep":10000,"mac-anh":12000,"thach-sinh":15000,"thiet-lan":18000}},"tech":{"ids":["kiem-tong-tam-phap","truong-sinh-quyet","kim-chung-trao","huyet-ma-kinh","loi-am-quyet","phong-hanh-thuat","ngu-hanh-quy-nguyen","thai-thuong-vong-tinh","huyen-bang-quyet","han-phong-bo","hac-phong-quyet","thanh-moc-truong-xuan","canh-kim-kiem-quyet","hau-tho-quyet","thai-hu-quyet","canh-kim-tu-linh","thanh-moc-duong-linh","bich-hai-hoi-linh","xich-viem-luyen-linh","hau-tho-tang-linh","van-linh-quy-nguyen"],"max":10,"exp":[40,1.6],"slots":3,"starter":"kiem-tong-tam-phap"},"cuoi":{"ids":["bach-loc","phong-lang","hoa-ky-lan","tuyet-ly"],"gia":{"bach-loc":5000,"phong-lang":12000,"tuyet-ly":15000,"hoa-ky-lan":25000},"roi":["hoa-ky-lan","phong-lang","tuyet-ly"],"starter":"bach-loc"},"dong":{"pool":["atk","hp","def","crit","crit_dmg","atk_pct","hp_pct"],"phi":[500,2],"mats":{"linh-thao":3},"mpool":["atk_pct","hp_pct","crit","crit_dmg","cdr","speed","qi_gain"],"mphi":3000,"mmats":{"linh-thao":5}},"thoi":{"pool":["atk_pct","hp_pct","crit","crit_dmg","cdr","speed","qi_gain"],"bo":{"dong-phuc":[0,null,null,false,null],"bach-kiem-bao":[3,null,10000,false,null],"tu-liem-y":[5,null,null,true,null],"thanh-sam":[1,null,800,false,null],"hac-y":[1,null,1500,false,null],"hong-y":[1,null,1500,false,null],"kim-bao":[2,null,null,false,null],"tu-bao":[2,null,null,false,null],"huyet-giap":[2,null,null,false,null],"bi-ngo":[2,null,null,false,null],"tuyet-lanh":[2,null,null,false,null],"tien-nhan":[3,null,10000,false,null],"hoang-kim":[3,null,10000,false,null],"tet-do":[2,null,null,false,null],"thien-mach-bao":[2,null,null,false,null],"thien-kiem-bao":[3,null,null,false,null],"hoa-bao-xich-diem":[3,null,null,false,null],"bang-y-han-bang":[3,null,null,false,null],"phong-bao-hac-phong":[3,null,null,false,null],"luc-bao-thanh-moc":[3,null,null,false,null],"kim-y-thien-kim":[3,null,null,false,null],"tho-bao-hau-tho":[3,null,null,false,null],"hu-khong-tu-y":[3,null,null,false,null],"than-nguyen-y":[4,"crit_dmg",25000,false,["625e027c-36b4-4bb7-bd0c-21572612bc50"]],"huyet-nguyet":[6,"atk_pct",null,true,null],"ly-hoa":[4,null,35000,false,["625e027c-36b4-4bb7-bd0c-21572612bc50"]]},"look":["nam","nu"],"def":"nam","tn":{"ao-tu-liem":"tu-liem-y","ao-huyet-nguyet":"huyet-nguyet"}},"chieu":{"ids":["kiem-khi","dang-phuoc","hoi-xuan","hoa-cau","liet-diem","bang-truy","thuy-thuan","kim-quang-tram","kim-cuong-the","dia-chan","thach-giap","van-moc-cham","thanh-moc-vuc","luc-dang-long","truong-xuan","hoa-long","phan-thien","liet-hoa-tran","phuong-hoang","bang-phong","thuy-long","han-bang-vuc","bang-phach","van-kiem","kim-luan","loi-dinh","kim-than","luu-sa","thach-chuy","son-nhac","dai-dia","long-thuong","cuong-phong","that-huyen","tu-nguyet-liem","song-nguyet-tram","tu-nguyet-luan","lien-chau","phap-kim-luan","phap-thanh-moc","phap-huyen-thuy","phap-tran-yeu","phap-hoa-hon"],"max":30,"mat":"bi-kip-chieu","book":[1,1.25],"coins":[150,1.3]},"dong_phu":[[1,300,{"tinh-thiet":10,"linh-thao":10}],[2,1000,{"tinh-thiet":20,"hoa-linh-chi":8}],[3,3000,{"tinh-thiet":35,"yeu-huyet":20}],[4,8000,{"tinh-thiet":60,"yeu-vuong-dan":1}]],"sv":{"exp_k":{"pet":1,"comp":1.6,"tech":6},"sao":{"phut":4,"tran":240},"moi":{"phut":0.05,"tran":3},"cuoi":{"phut":0.0042,"tran":2},"cp_moi":{"phut":0.2,"tran":6},"ban":{"giay":20,"tran":60000,"toc_giay":7200},"dau":0.34}}}'::jsonb) on conflict (k) do update set v = excluded.v;

-- Giá trị jsonb "đúng" (true, số khác 0, chuỗi khác rỗng) như máy khách
create or replace function public.p2d_thu_dung(p jsonb) returns boolean language sql immutable set search_path = ''
as $$ select coalesce(p is not null and p not in ('null'::jsonb, 'false'::jsonb, '0'::jsonb, '""'::jsonb), false) $$;

-- Bảng thú cưỡi: { mã: true }; bản lưu dạng mảng ["mã", ...] (máy khách sửa) đổi về bảng; khác thì rỗng
create or replace function public.p2d_thu_bang(p jsonb) returns jsonb language sql immutable set search_path = ''
as $$
  select case jsonb_typeof(p) when 'object' then p
    when 'array' then (select coalesce(jsonb_object_agg(e #>> '{}', true), '{}'::jsonb) from jsonb_array_elements(p) e where jsonb_typeof(e) = 'string')
    else '{}'::jsonb end
$$;

-- Kinh nghiệm cần cho cấp lv (round(base × lv^pow), p_k = [base, pow]) và kinh nghiệm giữa hai mốc (cấp, exp)
create or replace function public.p2d_thu_can(p_k jsonb, p_lv numeric) returns numeric language sql immutable set search_path = ''
as $$ select round((p_k ->> 0)::numeric * power(greatest(coalesce(p_lv, 1), 1), (p_k ->> 1)::numeric)) $$;
create or replace function public.p2d_thu_cach(p_k jsonb, p_lv0 numeric, p_exp0 numeric, p_lv1 numeric, p_exp1 numeric) returns numeric language plpgsql immutable set search_path = ''
as $$
-- kinh nghiệm từ (cấp lv0, exp0) tới (cấp lv1, exp1): chỉ cộng các cấp ở giữa (thường cùng cấp, khỏi lặp)
declare v_a integer := least(greatest(coalesce(p_lv0, 1), 1), 200)::integer; v_b integer := least(greatest(coalesce(p_lv1, 1), 1), 200)::integer; v_s numeric := 0; l integer;
begin
  for l in least(v_a, v_b) .. greatest(v_a, v_b) - 1 loop v_s := v_s + public.p2d_thu_can(p_k, l); end loop;
  return sign(v_b - v_a) * v_s + greatest(coalesce(p_exp1, 0), 0) - greatest(coalesce(p_exp0, 0), 0);
end;
$$;

-- Tổng bản sao đã có (copies + 2^sao − 1); kiểu sai thì null
create or replace function public.p2d_thu_sao(p_e jsonb) returns numeric language plpgsql immutable set search_path = ''
as $$
declare v_c numeric := 0; v_s numeric := 0;
begin
  if p_e ? 'copies' then
    v_c := public.p2d_ky_so(p_e -> 'copies');
    if v_c is null or v_c < 0 or v_c > 10000000 or v_c <> floor(v_c) then return null; end if;
  end if;
  if p_e ? 'star' then
    v_s := public.p2d_ky_so(p_e -> 'star');
    if v_s is null or v_s < 0 or v_s > 30 or v_s <> floor(v_s) then return null; end if;
  end if;
  return v_c + power(2::numeric, v_s) - 1;
end;
$$;

-- Lấy lại các trường của bản máy chủ (không có ở bản máy chủ thì bỏ)
create or replace function public.p2d_thu_giu(p_e jsonb, p_b jsonb, p_k text[]) returns jsonb language sql immutable set search_path = ''
as $$ select (p_e - p_k) || coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(p_b) e where e.key = any (p_k)), '{}'::jsonb) $$;

-- Lý do nặng hơn: thu_sua > thu_nhieu > thu_cu
create or replace function public.p2d_thu_ly(a text, b text) returns text language sql immutable set search_path = ''
as $$ select case when 'thu_sua' in (a, b) then 'thu_sua' when 'thu_nhieu' in (a, b) then 'thu_nhieu' else coalesce(b, a) end $$;

-- Bốc một dòng (src/game/tiers.js newLine / lineValue): màu theo trọng số (hoặc p_t cố định), chỉ số trong p_pool
create or replace function public.p2d_thu_dong(p_pool jsonb, p_lvl numeric, p_t integer) returns jsonb language plpgsql volatile set search_path = ''
as $$
declare v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg'); v_t integer := p_t; v_s text; v_cs jsonb;
begin
  if v_t is null then v_t := public.p2d_ky_boc(array(select (x -> 1)::text::numeric from jsonb_array_elements(v_cfg -> 'mau') with ordinality a(x, i) order by i)); end if;
  v_s := p_pool ->> floor(random() * jsonb_array_length(p_pool))::integer;
  v_cs := v_cfg -> 'cs' -> v_s;
  return jsonb_build_object('s', v_s, 't', v_t, 'v', greatest(1, round(
    ((v_cs ->> 0)::numeric + random()::numeric * ((v_cs ->> 1)::numeric - (v_cs ->> 0)::numeric))
    * case when (v_cs ->> 2)::boolean then 1 else 1 + coalesce(p_lvl, 0) * (v_cfg ->> 'lpl')::numeric end * (v_cfg -> 'mau' -> v_t ->> 0)::numeric)));
end;
$$;

-- Dòng có thể ra đúng luật (để phân biệt bản game cũ tự tẩy ở máy với sửa số): chỉ số trong pool, màu 0..6 (= p_t nếu có), giá trị ≤ trần
create or replace function public.p2d_thu_dong_dung(p_l jsonb, p_pool jsonb, p_lvl numeric, p_t integer) returns boolean language plpgsql stable set search_path = ''
as $$
declare v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg'); v_t numeric; v_v numeric; v_cs jsonb;
begin
  if jsonb_typeof(p_l) is distinct from 'object' or not (p_pool ? coalesce(p_l ->> 's', '')) then return false; end if;
  v_t := public.p2d_ky_so(p_l -> 't'); v_v := public.p2d_ky_so(p_l -> 'v'); v_cs := v_cfg -> 'cs' -> (p_l ->> 's');
  if v_t is null or v_v is null or v_cs is null or v_t <> floor(v_t) or v_t < 0 or v_t >= jsonb_array_length(v_cfg -> 'mau') or (p_t is not null and v_t <> p_t) or v_v < 1 then return false; end if;
  return v_v <= ceil((v_cs ->> 1)::numeric * case when (v_cs ->> 2)::boolean then 1 else 1 + coalesce(p_lvl, 0) * (v_cfg ->> 'lpl')::numeric end * (v_cfg -> 'mau' -> v_t::integer ->> 0)::numeric) + 1;
end;
$$;

-- Dòng mới chỉ nối thêm vào cuối, dòng nối thêm đúng luật (bản game cũ tẩy luyện linh thú ở máy)
create or replace function public.p2d_thu_noi(p_o jsonb, p_n jsonb, p_pool jsonb, p_lvl numeric) returns boolean language plpgsql stable set search_path = ''
as $$
declare v_o jsonb := case when jsonb_typeof(p_o) = 'array' then p_o else '[]'::jsonb end; i integer;
begin
  if jsonb_typeof(p_n) is distinct from 'array' or jsonb_array_length(p_n) <= jsonb_array_length(v_o) then return false; end if;
  for i in 0 .. jsonb_array_length(p_n) - 1 loop
    if i < jsonb_array_length(v_o) then
      if p_n -> i <> v_o -> i then return false; end if;
    elsif not public.p2d_thu_dong_dung(p_n -> i, p_pool, p_lvl, null) then return false; end if;
  end loop;
  return true;
end;
$$;

-- Trả phí trong lần lưu: p_tt = { d: Linh Thạch đã giảm còn chưa tính, x: thùng Linh Thạch còn, dm: nguyên liệu đã giảm còn
-- chưa tính, xn: thùng nguyên liệu còn, tl / tn: đã bù từ thùng }. Trả p_tt mới, không đủ thì null. p_chi_giam: chỉ tính phần đã giảm.
create or replace function public.p2d_thu_tra(p_tt jsonb, p_lt numeric, p_mats jsonb, p_chi_giam boolean) returns jsonb language plpgsql immutable set search_path = ''
as $$
declare
  v_d numeric := (p_tt ->> 'd')::numeric; v_x numeric := (p_tt ->> 'x')::numeric; v_dm jsonb := coalesce(p_tt -> 'dm', '{}'::jsonb);
  v_xn numeric := (p_tt ->> 'xn')::numeric; v_tl numeric := (p_tt ->> 'tl')::numeric; v_tn numeric := (p_tt ->> 'tn')::numeric;
  v_c numeric; v_k text; v_n numeric; v_h numeric;
begin
  if p_lt is null or p_lt < 0 then return null; end if;
  v_c := least(v_d, p_lt); v_d := v_d - v_c; v_c := p_lt - v_c;
  if v_c > 0 then
    if p_chi_giam or v_x < v_c then return null; end if;
    v_x := v_x - v_c; v_tl := v_tl + v_c;
  end if;
  for v_k, v_n in select e.key, (e.value #>> '{}')::numeric from jsonb_each(coalesce(p_mats, '{}'::jsonb)) e loop
    v_h := coalesce((v_dm ->> v_k)::numeric, 0);
    v_c := least(v_h, v_n); v_dm := v_dm || jsonb_build_object(v_k, v_h - v_c); v_c := v_n - v_c;
    if v_c > 0 then
      if p_chi_giam or v_xn < v_c then return null; end if;
      v_xn := v_xn - v_c; v_tn := v_tn + v_c;
    end if;
  end loop;
  return jsonb_build_object('d', v_d, 'x', v_x, 'dm', v_dm, 'xn', v_xn, 'tl', v_tl, 'tn', v_tn);
end;
$$;

-- Linh thú (p_loai 'pet', bản lưu pets) hoặc khôi lỗi ('comp', comps). p_act: mã con đang mang (bản cũ và bản gửi).
-- p_st: trạng thái chung (thùng, phí). Trả { m (bảng nhận), sua (mã → bản máy chủ / null), ly, ct, st }.
create or replace function public.p2d_thu_bay(p_loai text, p_o jsonb, p_n jsonb, p_act jsonb, p_st jsonb) returns jsonb
language plpgsql volatile set search_path = ''
as $$
declare
  v_c jsonb := (select v -> 'thu' from public.p2d_ky_cfg where k = 'cfg'); v_k jsonb; v_pet boolean := p_loai = 'pet';
  v_ra jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]'; v_tt jsonb := p_st -> 'tt'; v_t2 jsonb;
  v_x numeric := (p_st -> 'x' ->> p_loai)::numeric; v_xt numeric := (p_st -> 'xt' ->> p_loai)::numeric;
  v_s numeric := (p_st ->> 's')::numeric; v_p numeric := (p_st ->> 'p')::numeric; v_stran numeric;
  v_id text; v_g jsonb; v_e jsonb; v_b jsonb; v_lyc text; v_lv numeric; v_lvb numeric; v_max numeric; v_d numeric; v_cho numeric; v_can numeric;
  v_tn numeric; v_tb numeric;
begin
  v_k := v_c -> p_loai; v_stran := (v_c -> 'sv' -> 'sao' ->> 'tran')::numeric;
  if jsonb_typeof(p_o) is distinct from 'object' then p_o := '{}'; end if;
  if jsonb_typeof(p_n) is distinct from 'object' then p_n := '{}'; end if;   -- như p2d_mien_tran: không phải bảng thì coi như bán hết
  for v_id, v_g in select e.key, e.value from jsonb_each(p_n) e loop
    v_b := p_o -> v_id; v_lyc := null;
    if v_b is not null and v_g = v_b then v_ra := v_ra || jsonb_build_object(v_id, v_g); continue; end if;
    if v_b is null then
      -- con mới: linh thú từ dị chủng (thùng loài mới; Mộc Linh khởi đầu miễn phí một lần), khôi lỗi phải mua
      if not coalesce((v_k -> 'ids') ? v_id, false) or jsonb_typeof(v_g) is distinct from 'object' then v_lyc := 'thu_sua';
      elsif v_pet and v_id = v_k ->> 'starter' and not (p_st ->> 'stp')::boolean then p_st := p_st || '{"stp": true}';
      elsif v_pet and v_p >= 1 then v_p := v_p - 1;
      elsif v_pet then v_lyc := 'thu_nhieu';
      else
        v_t2 := public.p2d_thu_tra(v_tt, (v_k -> 'gia' ->> v_id)::numeric, '{}', false);
        if v_t2 is null then v_lyc := 'thu_sua'; else v_tt := v_t2; end if;
      end if;
      if v_lyc is not null then
        v_ly := v_ly || v_lyc; v_sua := v_sua || jsonb_build_object(v_id, null);
        if v_lyc = 'thu_sua' and jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', p_loai, 'id', v_id, 'gui', v_g, 'may_chu', null)); end if;
        continue;
      end if;
      v_b := '{"lv": 1, "exp": 0}';
    elsif jsonb_typeof(v_b) is distinct from 'object' then v_b := '{}';
    end if;
    if jsonb_typeof(v_g) is distinct from 'object' then v_e := v_b; v_lyc := 'thu_sua';
    else
      -- dòng tẩy luyện, trần dòng, cấp tính dòng: máy chủ giữ (p2d_tay_thu); khôi lỗi: cả sao, tiến hoá, bản sao
      v_e := public.p2d_thu_giu(v_g, v_b, case when v_pet then array['lines', 'cap', 'lvl'] else array['lines', 'cap', 'lvl', 'star', 'evo', 'copies'] end);
      if (v_g -> 'lines') is distinct from (v_b -> 'lines') then
        v_lyc := case when public.p2d_thu_noi(v_b -> 'lines', v_g -> 'lines', v_c -> 'dong' -> 'pool', greatest(coalesce(public.p2d_ky_so(v_g -> 'lv'), 1), coalesce(public.p2d_ky_so(v_b -> 'lv'), 1)))
                       then 'thu_cu' else 'thu_sua' end;
      end if;
      v_cho := 0;
      if v_pet then
        -- tiến hoá: đủ cấp và trả phí trong lần lưu này; đã tiến hoá thì giữ
        if public.p2d_thu_dung(v_b -> 'evo') then v_e := v_e || jsonb_build_object('evo', v_b -> 'evo');
        elsif public.p2d_thu_dung(v_e -> 'evo') then
          v_t2 := case when coalesce(public.p2d_ky_so(v_e -> 'lv'), 0) >= (v_k ->> 'evo_lv')::numeric then public.p2d_thu_tra(v_tt, (v_k ->> 'evo_lt')::numeric, v_k -> 'evo_mats', false) end;
          if v_t2 is null then v_e := public.p2d_thu_giu(v_e, v_b, array['evo']); v_lyc := public.p2d_thu_ly(v_lyc, 'thu_sua'); else v_tt := v_t2; end if;
        end if;
        -- bản sao, sao: tổng chỉ tăng từ thùng bản sao (dị chủng loài đã có)
        v_tn := public.p2d_thu_sao(v_e); v_tb := coalesce(public.p2d_thu_sao(v_b), 0);
        if v_tn is null or v_tn - v_tb > v_s then
          v_lyc := public.p2d_thu_ly(v_lyc, case when v_tn is null or v_tn - v_tb > v_s + v_stran then 'thu_sua' else 'thu_nhieu' end);
          v_e := public.p2d_thu_giu(v_e, v_b, array['copies', 'star']);
        elsif v_tn > v_tb then v_cho := v_tn - v_tb; v_s := v_s - v_cho;
        end if;
      end if;
      -- cấp, kinh nghiệm: con đang mang lấy từ thùng kinh nghiệm; mỗi bản sao mới thêm kinh nghiệm một cấp
      if (v_e -> 'lv') is distinct from (v_b -> 'lv') or (v_e -> 'exp') is distinct from (v_b -> 'exp') then
        v_max := case when v_pet and public.p2d_thu_dung(v_e -> 'evo') then (v_k ->> 'evo_max')::numeric else (v_k ->> 'max')::numeric end;
        v_lv := public.p2d_ky_so(v_e -> 'lv'); v_lvb := coalesce(public.p2d_ky_so(v_b -> 'lv'), 1);
        if v_lv is null or v_lv < 1 or v_lv <> floor(v_lv) or (v_lv > v_max and v_lv > v_lvb) or (v_e ? 'exp' and public.p2d_ky_so(v_e -> 'exp') is null) then
          v_e := public.p2d_thu_giu(v_e, v_b, array['lv', 'exp']); v_lyc := public.p2d_thu_ly(v_lyc, 'thu_sua');
        else
          v_d := public.p2d_thu_cach(v_k -> 'exp', v_lvb, public.p2d_ky_so(v_b -> 'exp'), v_lv, public.p2d_ky_so(v_e -> 'exp'));
          v_can := v_cho * public.p2d_thu_can(v_k -> 'exp', least(v_lv, v_max));
          if v_d > v_can + (case when p_act @> to_jsonb(v_id) then v_x else 0 end) then
            v_lyc := public.p2d_thu_ly(v_lyc, case when v_d > v_can + v_x + v_xt then 'thu_sua' else 'thu_nhieu' end);
            v_e := public.p2d_thu_giu(v_e, v_b, array['lv', 'exp']);
          elsif v_d > v_can then v_x := v_x - (v_d - v_can);
          end if;
        end if;
      end if;
      -- vừa tiến hoá mà cấp (sau khi kiểm) chưa đủ: bỏ tiến hoá, cấp không quá trần chưa tiến hoá
      if v_pet and public.p2d_thu_dung(v_e -> 'evo') and not public.p2d_thu_dung(v_b -> 'evo') and coalesce(public.p2d_ky_so(v_e -> 'lv'), 1) < (v_k ->> 'evo_lv')::numeric then
        v_e := public.p2d_thu_giu(v_e, v_b, array['evo']); v_lyc := public.p2d_thu_ly(v_lyc, 'thu_sua');
        if coalesce(public.p2d_ky_so(v_e -> 'lv'), 1) > greatest((v_k ->> 'max')::numeric, coalesce(public.p2d_ky_so(v_b -> 'lv'), 1)) then v_e := public.p2d_thu_giu(v_e, v_b, array['lv', 'exp']); end if;
      end if;
    end if;
    v_ra := v_ra || jsonb_build_object(v_id, v_e);
    if v_e is distinct from v_g then v_sua := v_sua || jsonb_build_object(v_id, v_e); end if;
    if v_lyc is not null then
      v_ly := v_ly || v_lyc;
      if v_lyc = 'thu_sua' and jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', p_loai, 'id', v_id, 'gui', v_g, 'may_chu', v_e)); end if;
    end if;
  end loop;
  return jsonb_build_object('m', v_ra, 'sua', v_sua, 'ly', to_jsonb(v_ly), 'ct', v_ct,
    'st', p_st || jsonb_build_object('tt', v_tt, 's', v_s, 'p', v_p, 'x', (p_st -> 'x') || jsonb_build_object(p_loai, v_x)));
end;
$$;

-- Thú cưỡi (mounts), dòng thú cưỡi (mountLine), con đang cưỡi (mount). Trả { m, l, sel, sua { mounts, mountLine, mount? }, ly, st }.
-- Con mới: Bạch Lộc khởi đầu miễn phí một lần; con rơi từ quái (cuoi.roi): Linh Thạch đã giảm đủ giá thì là mua, không thì thùng
-- thú cưỡi rơi (sv.cuoi), hết thùng mới tính mua bằng thùng Linh Thạch; con chỉ bán ở Ngự Thú Sư: phải trả đủ giá.
create or replace function public.p2d_thu_cuoi(p_cu jsonb, p_moi jsonb, p_st jsonb) returns jsonb language plpgsql volatile set search_path = ''
as $$
declare
  v_c jsonb := (select v -> 'thu' -> 'cuoi' from public.p2d_ky_cfg where k = 'cfg'); v_pool jsonb := (select v -> 'thu' -> 'dong' -> 'mpool' from public.p2d_ky_cfg where k = 'cfg');
  v_om jsonb := public.p2d_thu_bang(p_cu -> 'mounts'); v_nm jsonb := public.p2d_thu_bang(p_moi -> 'mounts');
  v_ol jsonb := case when jsonb_typeof(p_cu -> 'mountLine') = 'object' then p_cu -> 'mountLine' else '{}'::jsonb end;
  v_nl jsonb := p_moi -> 'mountLine';
  v_rm jsonb := '{}'; v_rl jsonb; v_sm jsonb := '{}'; v_sl jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]';
  v_tt jsonb := p_st -> 'tt'; v_t2 jsonb; v_m numeric := (p_st ->> 'm')::numeric; v_id text; v_g jsonb; v_ok boolean; v_gia numeric; v_sel jsonb;
begin
  for v_id, v_g in select e.key, e.value from jsonb_each(v_nm) e loop
    if v_om ? v_id then
      v_rm := v_rm || jsonb_build_object(v_id, v_om -> v_id);
      if v_g is distinct from v_om -> v_id then v_sm := v_sm || jsonb_build_object(v_id, v_om -> v_id); end if;
      continue;
    end if;
    v_ok := false; v_gia := (v_c -> 'gia' ->> v_id)::numeric;
    if not ((v_c -> 'ids') ? v_id) then v_ly := v_ly || 'thu_sua'::text;
    elsif v_id = v_c ->> 'starter' and not (p_st ->> 'stm')::boolean then p_st := p_st || '{"stm": true}'; v_ok := true;
    else
      v_t2 := case when (v_c -> 'roi') ? v_id then public.p2d_thu_tra(v_tt, v_gia, '{}', true) end;
      if v_t2 is not null then v_tt := v_t2; v_ok := true;
      elsif (v_c -> 'roi') ? v_id and v_m >= 1 then v_m := v_m - 1; v_ok := true;
      else
        v_t2 := public.p2d_thu_tra(v_tt, v_gia, '{}', false);
        if v_t2 is not null then v_tt := v_t2; v_ok := true;
        else v_ly := v_ly || case when (v_c -> 'roi') ? v_id then 'thu_nhieu' else 'thu_sua' end; end if;
      end if;
    end if;
    if v_ok then
      v_rm := v_rm || jsonb_build_object(v_id, true);
      if v_g <> 'true'::jsonb then v_sm := v_sm || jsonb_build_object(v_id, true); end if;
    else
      v_sm := v_sm || jsonb_build_object(v_id, null);
      if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'mount', 'id', v_id, 'gui', v_g, 'may_chu', null)); end if;
    end if;
  end loop;
  -- dòng thú cưỡi: dòng đã có giữ nguyên (cả của con đã bán); con có mà chưa có dòng: máy chủ bốc
  v_rl := v_ol;
  if jsonb_typeof(v_nl) = 'object' then
    for v_id, v_g in select e.key, e.value from jsonb_each(v_nl) e loop
      if v_ol ? v_id then
        if v_g is distinct from v_ol -> v_id then
          v_sl := v_sl || jsonb_build_object(v_id, v_ol -> v_id);
          if not (jsonb_typeof(v_g) = 'object' and v_g ? 'wait') then
            v_ly := v_ly || case when public.p2d_thu_dong_dung(v_g, v_pool, 0, null) then 'thu_cu' else 'thu_sua' end;
            if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'mountLine', 'id', v_id, 'gui', v_g, 'may_chu', v_ol -> v_id)); end if;
          end if;
        end if;
      elsif v_rm ? v_id then
        v_rl := v_rl || jsonb_build_object(v_id, public.p2d_thu_dong(v_pool, 0, null));
        v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
        if not (jsonb_typeof(v_g) = 'object' and v_g ? 'wait') then v_ly := v_ly || 'thu_cu'::text; end if;   -- bản game cũ tự bốc ở máy
      else
        v_sl := v_sl || jsonb_build_object(v_id, null);
      end if;
    end loop;
  end if;
  for v_id in select e.key from jsonb_each(v_ol) e where jsonb_typeof(v_nl) is distinct from 'object' or not (v_nl ? e.key) loop
    v_sl := v_sl || jsonb_build_object(v_id, v_ol -> v_id);
  end loop;
  -- con đang cưỡi phải là con đang có
  v_sel := p_moi -> 'mount';
  if jsonb_typeof(v_sel) = 'string' and not (v_rm ? (v_sel #>> '{}')) then
    v_sel := case when jsonb_typeof(p_cu -> 'mount') = 'string' and v_rm ? (p_cu ->> 'mount') then p_cu -> 'mount' else 'null'::jsonb end;
    v_sua := jsonb_build_object('mount', v_sel); v_ly := v_ly || 'thu_nhieu'::text;
  end if;
  if v_sm <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('mounts', v_sm); end if;
  if v_sl <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('mountLine', v_sl); end if;
  return jsonb_build_object('m', v_rm, 'l', v_rl, 'sel', v_sel, 'sua', v_sua, 'ly', to_jsonb(v_ly), 'ct', v_ct,
    'st', p_st || jsonb_build_object('tt', v_tt, 'm', v_m));
end;
$$;

-- Thời trang (outfits '<bộ>:<nam|nu>' hoặc '<bộ>' cũ) và dòng thời trang (outfitLine '<bộ>:<nam|nu>'). Bộ mua bằng Linh Thạch (shop,
-- NPC): phải trả đủ giá; bộ Tiên Ngọc chỉ do p2d_doi_tn ghi; bộ thành tựu / lễ / ma khí không ghi vào outfits. Dòng: máy chủ bốc
-- đúng phẩm của bộ, dòng đã có đúng phẩm thì giữ; bộ phải mua mà chưa có thì không có dòng.
create or replace function public.p2d_thu_thoi(p_cu jsonb, p_moi jsonb, p_uid uuid, p_st jsonb) returns jsonb language plpgsql volatile set search_path = ''
as $$
declare
  v_t jsonb := (select v -> 'thu' -> 'thoi' from public.p2d_ky_cfg where k = 'cfg');
  v_om jsonb := case when jsonb_typeof(p_cu -> 'outfits') = 'object' then p_cu -> 'outfits' else '{}'::jsonb end;
  v_nm jsonb := case when jsonb_typeof(p_moi -> 'outfits') = 'object' then p_moi -> 'outfits' else '{}'::jsonb end;
  v_ol jsonb := case when jsonb_typeof(p_cu -> 'outfitLine') = 'object' then p_cu -> 'outfitLine' else '{}'::jsonb end;
  v_nl jsonb := p_moi -> 'outfitLine'; v_look text;
  v_rm jsonb := '{}'; v_rl jsonb; v_sm jsonb := '{}'; v_sl jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]';
  v_tt jsonb := p_st -> 'tt'; v_t2 jsonb; v_id text; v_g jsonb; v_bo jsonb; v_b text; v_gi text; v_te integer; v_co boolean; v_cho boolean;
begin
  v_look := case when (v_t -> 'look') ? coalesce(p_moi ->> 'look', '') then p_moi ->> 'look' else v_t ->> 'def' end;
  for v_id, v_g in select e.key, e.value from jsonb_each(v_nm) e loop
    if v_om ? v_id then
      v_rm := v_rm || jsonb_build_object(v_id, v_om -> v_id);
      if v_g is distinct from v_om -> v_id then v_sm := v_sm || jsonb_build_object(v_id, v_om -> v_id); end if;
      continue;
    end if;
    v_b := split_part(v_id, ':', 1); v_gi := split_part(v_id, ':', 2); v_bo := v_t -> 'bo' -> v_b;
    if v_bo is null or (v_gi <> '' and not ((v_t -> 'look') ? v_gi)) or v_g <> 'true'::jsonb then v_ly := v_ly || 'thu_nhieu'::text;
    elsif jsonb_typeof(v_bo -> 2) = 'number' then
      v_t2 := public.p2d_thu_tra(v_tt, (v_bo ->> 2)::numeric, '{}', false);
      if v_t2 is not null then v_tt := v_t2; v_rm := v_rm || jsonb_build_object(v_id, true); continue; end if;
      v_ly := v_ly || 'thu_sua'::text;
    else v_ly := v_ly || case when (v_bo ->> 3)::boolean then 'thu_sua' else 'thu_nhieu' end;   -- bộ Tiên Ngọc chưa qua p2d_doi_tn
    end if;
    v_sm := v_sm || jsonb_build_object(v_id, null);
    if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'outfit', 'id', v_id, 'gui', v_g, 'may_chu', null)); end if;
  end loop;
  v_rl := v_ol;
  if jsonb_typeof(v_nl) = 'object' then
    for v_id, v_g in select e.key, e.value from jsonb_each(v_nl) e loop
      continue when v_g = v_ol -> v_id;
      v_b := split_part(v_id, ':', 1); v_gi := split_part(v_id, ':', 2); v_bo := v_t -> 'bo' -> v_b;
      v_cho := jsonb_typeof(v_g) = 'object' and v_g ? 'wait';   -- máy khách xin máy chủ bốc
      if v_bo is null or not ((v_t -> 'look') ? v_gi) then
        v_sl := v_sl || jsonb_build_object(v_id, v_ol -> v_id);   -- không có ở bản máy chủ thì null (bỏ)
        continue;
      end if;
      v_te := (v_bo ->> 0)::integer;
      v_co := (jsonb_typeof(v_bo -> 2) <> 'number' and not (v_bo ->> 3)::boolean) or v_rm ? v_id or (v_rm -> v_b = 'true'::jsonb and v_gi = v_look)
              or (jsonb_typeof(v_bo -> 4) = 'array' and (v_bo -> 4) ? p_uid::text);
      if v_ol ? v_id and (public.p2d_ky_so(v_ol -> v_id -> 't') = v_te or not v_co) then
        v_sl := v_sl || jsonb_build_object(v_id, v_ol -> v_id);   -- dòng đã có, đúng phẩm: giữ
        if not v_cho then
          v_ly := v_ly || case when public.p2d_thu_dong_dung(v_g, case when jsonb_typeof(v_bo -> 1) = 'string' then jsonb_build_array(v_bo -> 1) else v_t -> 'pool' end, 0, v_te) then 'thu_cu' else 'thu_sua' end;
          if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'outfitLine', 'id', v_id, 'gui', v_g, 'may_chu', v_ol -> v_id)); end if;
        end if;
      elsif v_co then
        v_rl := v_rl || jsonb_build_object(v_id, public.p2d_thu_dong(case when jsonb_typeof(v_bo -> 1) = 'string' then jsonb_build_array(v_bo -> 1) else v_t -> 'pool' end, 0, v_te));
        v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
        if not v_cho then v_ly := v_ly || 'thu_cu'::text; end if;   -- bản game cũ tự bốc ở máy
      else
        v_sl := v_sl || jsonb_build_object(v_id, null); v_ly := v_ly || 'thu_nhieu'::text;
      end if;
    end loop;
  end if;
  for v_id in select e.key from jsonb_each(v_ol) e where jsonb_typeof(v_nl) is distinct from 'object' or not (v_nl ? e.key) loop
    v_sl := v_sl || jsonb_build_object(v_id, v_ol -> v_id);
  end loop;
  if v_sm <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('outfits', v_sm); end if;
  if v_sl <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('outfitLine', v_sl); end if;
  return jsonb_build_object('m', v_rm, 'l', v_rl, 'sua', v_sua, 'ly', to_jsonb(v_ly), 'ct', v_ct, 'st', p_st || jsonb_build_object('tt', v_tt));
end;
$$;

revoke all on function public.p2d_thu_dung(jsonb), public.p2d_thu_bang(jsonb), public.p2d_thu_can(jsonb, numeric), public.p2d_thu_cach(jsonb, numeric, numeric, numeric, numeric), public.p2d_thu_sao(jsonb),
  public.p2d_thu_giu(jsonb, jsonb, text[]), public.p2d_thu_ly(text, text), public.p2d_thu_dong(jsonb, numeric, integer),
  public.p2d_thu_dong_dung(jsonb, jsonb, numeric, integer), public.p2d_thu_noi(jsonb, jsonb, jsonb, numeric), public.p2d_thu_tra(jsonb, numeric, jsonb, boolean),
  public.p2d_thu_bay(text, jsonb, jsonb, jsonb, jsonb), public.p2d_thu_cuoi(jsonb, jsonb, jsonb), public.p2d_thu_thoi(jsonb, jsonb, uuid, jsonb)
  from public, anon, authenticated;
