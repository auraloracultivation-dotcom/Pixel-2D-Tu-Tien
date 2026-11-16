-- Đợt đổi mới 16/11/2026 (chủ dự án 21:57–22:0x): Ngọc bội thành Pháp tượng, thú cưỡi cũ thay 16 thú mới đổi bằng Thú Lệnh từ việc ngày,
-- thời trang và nhân vật cũ thay 16 trang phục mới. CHỈ ÁP KHI CHỦ DỰ ÁN NÓI "áp lên" CHO ĐỢT NÀY (CLAUDE.md, mục Đưa lên).
-- 1) p2d_ky_cfg dòng 'cfg' (node tools/ky-cfg.mjs): pool 16 pháp tượng thay 10 ngọc bội; thu.cuoi 16 thú mới, không bán, không rơi, không
--    tặng thú đầu, lenh = số Thú Lệnh đổi một thú, lenh_ngay = số việc ngày mỗi ngày để được 1 Thú Lệnh; thu.thoi 16 bộ mới.
-- 2) p2d_ht_cfg: bảng quà triệu hồi bỏ 4 thú cưỡi cũ và áo Hắc y (python3 tools/he-thong-sql.py bac); trang bị quà dùng 8 pháp tượng thường.
-- 3) Thú Lệnh: cột p2d_ht_diem.thu_lenh; p2d_ht_ngay cộng 1 khi việc ngày xong thứ lenh_ngay trong ngày; p2d_doi_thu_cuoi trừ lenh Thú Lệnh,
--    ghi thú vào bản lưu (dòng chỉ số máy chủ bốc ở lần lưu sau như thú mới); p2d_ht_trang_thai trả thêm thu_lenh.
-- 4) Một lần, mỗi bản lưu: sao lưu phần bị đổi vào p2d_xu_ly (hanh_dong doi_moi_16_11); ngọc bội cũ đổi base sang pháp tượng (giữ phẩm, cấp,
--    dòng, ngọc khảm), ký lại; bỏ thú cưỡi, dòng thú cưỡi, thời trang cũ; dòng thời trang của bộ đang mặc chuyển sang bộ mặc định của giới
--    (tp-02 nam, tp-10 nữ); ai từng có thú cưỡi hoặc thời trang cũ được 4 thú mới ngẫu nhiên không trùng (denBu16, máy khách báo một lần);
--    tăng phien_ban (máy đang mở tải lại bản máy chủ). Món ngọc bội trong Hòm thư chưa nhận, đang rao ở Chợ, quà Đại Ma Thần: đổi base, ký lại.

insert into public.p2d_ky_cfg (k, v) values ('cfg', '{"tay":{"base":120,"realm_mul":1.45,"r":1.3,"decay":0,"line_mul":2,"cost":2,"free":1},"mau":[[1,40],[1.3,28],[1.7,17],[2.2,9],[2.8,4],[3.6,1.6],[4.6,0.4]],"tu_pham":{"pham":0,"linh":0,"huyen":1,"dia":2,"thien":3},"cap_w":[8,12,14,15,14,12,10,7,5,3],"lpl":0.08,"cs":{"atk":[2,6,false],"atk_pct":[3,8,true],"hp":[10,30,false],"hp_pct":[4,10,true],"def":[1,4,false],"crit":[2,5,true],"crit_dmg":[8,20,true],"cdr":[2,6,true],"speed":[2,5,true],"qi_gain":[4,10,true]},"pool":{"thiet-kiem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"thanh-van-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-y":["hp","hp_pct","def","speed","cdr","qi_gain"],"huyen-giap":["hp","hp_pct","def","crit","atk"],"pt-thuong-lang":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"],"pt-tu-nguyet":["cdr","atk_pct","crit","qi_gain","hp_pct"],"pt-phan-lien":["hp_pct","def","qi_gain","cdr"],"pt-tu-tinh":["crit_dmg","crit","atk_pct","cdr"],"pt-bang-lien":["qi_gain","cdr","speed","hp","atk"],"pt-thuy-long":["hp_pct","atk_pct","qi_gain","cdr"],"pt-phuong-hoang":["atk_pct","crit_dmg","crit","qi_gain"],"pt-tinh-lien":["qi_gain","hp_pct","cdr","def"],"thiet-thuong":["atk","atk_pct","crit","crit_dmg","speed","hp"],"ba-tieu-phien":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"],"moc-cam":["atk_pct","cdr","qi_gain","crit","hp","def"],"tu-nguyet-liem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"truc-cung":["atk","atk_pct","crit","crit_dmg","speed","cdr"],"thien-mach-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-hai":["speed","hp","def","cdr","qi_gain"],"van-van-ngoa":["speed","crit","atk","hp_pct","cdr"],"bo-can":["hp","def","cdr","qi_gain","crit"],"thiet-khoi":["def","hp","hp_pct","crit","atk"],"thiet-gioi":["crit","crit_dmg","atk","atk_pct","def"],"linh-ngoc-gioi":["crit","crit_dmg","qi_gain","hp_pct","cdr"],"kim-luan":["atk","atk_pct","cdr","crit"],"tran-yeu-thap":["hp","hp_pct","def","cdr"],"hoa-hon-linh":["atk_pct","crit_dmg","cdr","qi_gain"],"xich-diem-giap":["hp","hp_pct","def","atk_pct"],"xich-diem-hai":["speed","atk","crit"],"xich-diem-quan":["crit","atk","atk_pct"],"xich-diem-gioi":["crit","crit_dmg","atk_pct"],"pt-hoa-long":["atk_pct","crit_dmg","qi_gain"],"han-bang-giap":["hp","hp_pct","def","cdr"],"han-bang-hai":["speed","def","hp"],"han-bang-quan":["def","hp","hp_pct"],"han-bang-gioi":["crit","cdr","hp_pct"],"pt-bang-tinh-hoan":["hp_pct","def","qi_gain"],"hac-phong-giap":["hp","speed","cdr","atk_pct"],"hac-phong-hai":["speed","cdr","crit"],"hac-phong-quan":["crit","cdr","speed"],"hac-phong-gioi":["crit","crit_dmg","cdr"],"pt-tu-diem-duc":["cdr","atk_pct","qi_gain"],"thanh-moc-bao":["hp","hp_pct","def","qi_gain"],"thanh-moc-hai":["speed","hp_pct","def"],"thanh-moc-quan":["hp","hp_pct","qi_gain"],"thanh-moc-gioi":["crit","crit_dmg","hp_pct"],"pt-thanh-dang":["qi_gain","hp_pct","def"],"kim-cang-giap":["def","hp_pct","atk_pct"],"kim-cang-hai":["speed","atk_pct","crit"],"kim-cang-quan":["crit","crit_dmg","atk_pct"],"kim-cang-gioi":["crit","crit_dmg","atk_pct"],"pt-kim-kiem-tran":["atk_pct","crit_dmg","cdr"],"hau-tho-giap":["hp","def","hp_pct"],"hau-tho-hai":["def","speed","hp_pct"],"hau-tho-quan":["def","hp","hp_pct"],"hau-tho-gioi":["hp_pct","def","crit"],"pt-kim-duong":["def","hp_pct","qi_gain"],"dao-van-binh":["atk","atk_pct","crit","crit_dmg","cdr"],"dao-van-quan":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-bao":["hp","hp_pct","def","atk_pct"],"pt-kim-diem-quan":["atk_pct","crit_dmg","cdr","qi_gain"],"dao-van-hai":["speed","crit","cdr","atk_pct"],"dao-van-gioi":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-an":["atk","atk_pct","cdr","crit"],"thai-hu-giap":["hp","hp_pct","cdr","atk_pct"],"thai-hu-hai":["speed","cdr","crit"],"thai-hu-quan":["crit","cdr","atk_pct"],"thai-hu-gioi":["crit","crit_dmg","atk_pct"],"pt-tinh-van":["cdr","atk_pct","qi_gain"]},"cuong":{"max":20,"iron":[1,2,3,4,5,6,8,10,12,15,18,21,25,30,36,43,51,61,73,87],"stones":[0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,11,13,15,17,20],"coins":[0,0,0,0,0,0,0,0,0,0,2000,2700,3600,4900,6600,8900,12000,16200,21900,29500],"rate":[1,1,0.95,0.85,0.75,0.65,0.55,0.45,0.35,0.25,0.22,0.2,0.18,0.16,0.14,0.12,0.11,0.1,0.09,0.08],"drop_from":7,"drop_chance":0.5,"open":{"base":10,"from_realm":2,"per_realm":2}},"he":["moc","hoa","thuy","kim","tho"],"doi_he":{"mat":"dao-van-thach","n":1},"ngoc":{"types":["hong-ngoc","lam-ngoc","hoang-ngoc","luc-ngoc"],"max":20,"merge":3,"phi":[30,2.5],"lo":{"max_lv":4,"toc_phut":20,"tran":600},"truyen":[[3,"hong-ngoc:5"],[4,"lam-ngoc:5"],[6,"hoang-ngoc:5"],[10,"luc-ngoc:5"]],"zalo":5},"pb_max":20,"luyen":{"base":3,"r":1.35,"mat":"manh-phap-bao","bases":["kim-luan","tran-yeu-thap","hoa-hon-linh","dao-van-an"]},"roi":{"thu_tu":["pham","linh","huyen","dia","thien"],"phut":{"pham":20,"linh":10,"huyen":6,"dia":3,"thien":1},"gio":{"pham":30,"linh":15,"huyen":12,"dia":6,"thien":3},"tran":{"pham":400,"linh":300,"huyen":250,"dia":150,"thien":80},"mau":{"t":5,"phut":0.2,"gio":1,"tran":20},"dong":1,"tang":9,"nang":2,"nho":60},"thu":{"pet":{"ids":["moc-linh","ma-tieu","hoa-lang","viem-linh","ma-cung","tuyet-lang","moc-yeu","kiem-hon","tho-khoi","hu-anh","phong-yeu","bang-tinh"],"max":20,"evo_max":40,"evo_lv":20,"evo_lt":600,"evo_mats":{"yeu-huyet":12,"tinh-thiet":8},"exp":[40,1.35],"starter":"moc-linh"},"comp":{"ids":["tieu-hoa","ho-linh","thanh-diep","mac-anh","thach-sinh","thiet-lan"],"max":30,"exp":[60,1.4],"gia":{"tieu-hoa":8000,"ho-linh":8000,"thanh-diep":10000,"mac-anh":12000,"thach-sinh":15000,"thiet-lan":18000}},"tech":{"ids":["kiem-tong-tam-phap","truong-sinh-quyet","kim-chung-trao","huyet-ma-kinh","loi-am-quyet","phong-hanh-thuat","ngu-hanh-quy-nguyen","thai-thuong-vong-tinh","huyen-bang-quyet","han-phong-bo","hac-phong-quyet","thanh-moc-truong-xuan","canh-kim-kiem-quyet","hau-tho-quyet","thai-hu-quyet","canh-kim-tu-linh","thanh-moc-duong-linh","bich-hai-hoi-linh","xich-viem-luyen-linh","hau-tho-tang-linh","van-linh-quy-nguyen"],"max":10,"exp":[40,1.6],"slots":3,"starter":"kiem-tong-tam-phap"},"cuoi":{"ids":["cuu-vi-ho","rua-non-bo","su-thuu","huou-sao","hoa-long","rua-nam","meo-co-quan","ca-voi-may","coc-sen","ho-pha-le","phuong-hoang","sua-den-long","su-tu-da","bach-tuoc","huou-may","nhen-pha-le"],"gia":{},"roi":[],"starter":null,"lenh":7,"lenh_ngay":10},"dong":{"pool":["atk","hp","def","crit","crit_dmg","atk_pct","hp_pct"],"phi":[500,2],"mats":{"linh-thao":3},"mpool":["atk_pct","hp_pct","crit","crit_dmg","cdr","speed","qi_gain"],"mphi":3000,"mmats":{"linh-thao":5}},"thoi":{"pool":["atk_pct","hp_pct","crit","crit_dmg","cdr","speed","qi_gain"],"bo":{"tp-02":[0,null,null,false,null],"tp-10":[0,null,null,false,null],"tp-05":[0,null,null,false,null],"tp-07":[0,null,null,false,null],"tp-08":[0,null,null,false,null],"tp-16":[0,null,null,false,null],"tp-01":[5,null,60000,false,null],"tp-09":[5,null,60000,false,null],"tp-11":[5,null,60000,false,null],"tp-04":[4,null,45000,false,null],"tp-06":[4,null,45000,false,null],"tp-13":[4,null,45000,false,null],"tp-14":[4,null,45000,false,null],"tp-03":[4,null,30000,false,null],"tp-12":[4,null,30000,false,null],"tp-15":[4,null,30000,false,null]},"look":["nam","nu"],"def":"nam","tn":{}},"chieu":{"ids":["kiem-khi","dang-phuoc","hoi-xuan","hoa-cau","liet-diem","bang-truy","thuy-thuan","kim-quang-tram","kim-cuong-the","dia-chan","thach-giap","van-moc-cham","thanh-moc-vuc","luc-dang-long","truong-xuan","hoa-long","phan-thien","liet-hoa-tran","phuong-hoang","bang-phong","thuy-long","han-bang-vuc","bang-phach","van-kiem","kim-luan","loi-dinh","kim-than","luu-sa","thach-chuy","son-nhac","dai-dia","long-thuong","cuong-phong","that-huyen","tu-nguyet-liem","song-nguyet-tram","tu-nguyet-luan","lien-chau","phap-kim-luan","phap-thanh-moc","phap-huyen-thuy","phap-tran-yeu","phap-hoa-hon","thiem-anh","vo-anh","van-kiem-thien","pha-thien","thien-phat"],"max":30,"mat":"bi-kip-chieu","book":[1,1.25],"coins":[150,1.3]},"dong_phu":[[1,300,{"tinh-thiet":10,"linh-thao":10}],[2,1000,{"tinh-thiet":20,"hoa-linh-chi":8}],[3,3000,{"tinh-thiet":35,"yeu-huyet":20}],[4,8000,{"tinh-thiet":60,"yeu-vuong-dan":1}]],"sv":{"exp_k":{"pet":1,"comp":1.6,"tech":6},"sao":{"phut":4,"tran":240},"moi":{"phut":0.05,"tran":3},"cuoi":{"phut":0.0042,"tran":2},"cp_moi":{"phut":1.5,"tran":30},"ban":{"giay":20,"tran":60000,"toc_giay":7200},"dau":0.34}}}'::jsonb)
on conflict (k) do update set v = excluded.v;

update public.p2d_ht_cfg set v = v || '{"pool":[{"id":"lt-20k","b":0,"coins":20000,"w":4.769231},{"id":"lt-50k","b":0,"coins":50000,"w":4.769231},{"id":"lt-100k","b":1,"coins":100000,"w":2.363636},{"id":"lt-200k","b":2,"coins":200000,"w":1.055556},{"id":"lt-500k","b":3,"coins":500000,"w":0.44},{"id":"lt-1tr","b":4,"coins":1000000,"w":0.05},{"id":"lt-2tr","b":4,"coins":2000000,"w":0.05},{"id":"ngoc-1","b":0,"gem":[1,1],"n":1,"w":4.769231},{"id":"ngoc-2","b":0,"gem":[2,2],"n":1,"w":4.769231},{"id":"ngoc-3","b":0,"gem":[3,3],"n":1,"w":4.769231},{"id":"ngoc-4","b":1,"gem":[4,4],"n":1,"w":2.363636},{"id":"ngoc-5","b":2,"gem":[5,5],"n":1,"w":1.055556},{"id":"ngoc-6","b":3,"gem":[6,6],"n":1,"w":0.44},{"id":"ngoc-7","b":4,"gem":[7,7],"n":1,"w":0.05},{"id":"ngoc-8","b":4,"gem":[8,8],"n":1,"w":0.05},{"id":"do-0","b":0,"gear":[0],"w":4.769231},{"id":"do-1","b":0,"gear":[1],"w":4.769231},{"id":"do-2","b":1,"gear":[2],"w":2.363636},{"id":"do-3","b":2,"gear":[3],"w":1.055556},{"id":"do-4","b":3,"gear":[4],"w":0.44},{"id":"do-5","b":4,"gear":[5],"w":0.05},{"id":"do-6","b":4,"gear":[6],"w":0.05},{"id":"dan-hoi-xuan-dan","b":0,"pill":"hoi-xuan-dan","n":10,"w":4.769231},{"id":"dan-hoi-linh-dan","b":0,"pill":"hoi-linh-dan","n":10,"w":4.769231},{"id":"dan-tu-khi-dan","b":0,"pill":"tu-khi-dan","n":5,"w":4.769231},{"id":"dan-boi-nguyen-dan","b":1,"pill":"boi-nguyen-dan","n":2,"w":2.363636},{"id":"dan-thanh-tam-dan","b":1,"pill":"thanh-tam-dan","n":2,"w":2.363636},{"id":"dan-tinh-lien-dan","b":2,"pill":"tinh-lien-dan","n":1,"w":1.055556},{"id":"dan-tu-van-dan","b":1,"pill":"tu-van-dan","n":3,"w":2.363636},{"id":"dan-tay-tuy-dan","b":2,"pill":"tay-tuy-dan","n":1,"w":1.055556},{"id":"nl-linh-thao","b":0,"mat":"linh-thao","n":20,"w":4.769231},{"id":"nl-yeu-huyet","b":0,"mat":"yeu-huyet","n":10,"w":4.769231},{"id":"nl-tinh-thiet","b":0,"mat":"tinh-thiet","n":20,"w":4.769231},{"id":"nl-hoa-linh-chi","b":1,"mat":"hoa-linh-chi","n":5,"w":2.363636},{"id":"nl-tay-luyen-thach","b":1,"mat":"tay-luyen-thach","n":10,"w":2.363636},{"id":"nl-khoa-linh-thach","b":1,"mat":"khoa-linh-thach","n":2,"w":2.363636},{"id":"nl-dao-van-thach","b":2,"mat":"dao-van-thach","n":1,"w":1.055556},{"id":"nl-manh-phap-bao","b":2,"mat":"manh-phap-bao","n":3,"w":1.055556},{"id":"khoi-tieu-hoa","b":1,"comp":"tieu-hoa","gia":8000,"w":2.363636},{"id":"khoi-ho-linh","b":1,"comp":"ho-linh","gia":8000,"w":2.363636},{"id":"khoi-thanh-diep","b":2,"comp":"thanh-diep","gia":10000,"w":1.055556},{"id":"khoi-mac-anh","b":2,"comp":"mac-anh","gia":12000,"w":1.055556},{"id":"khoi-thach-sinh","b":3,"comp":"thach-sinh","gia":15000,"w":0.44},{"id":"khoi-thiet-lan","b":3,"comp":"thiet-lan","gia":18000,"w":0.44}],"bh":{"hiem":10,"cuc":80},"loa":{"b":4,"ten":{"lt-1tr":"1 triệu Linh Thạch","lt-2tr":"2 triệu Linh Thạch","ngoc-7":"ngọc cấp 7","ngoc-8":"ngọc cấp 8","do-5":"trang bị phẩm Tiên","do-6":"trang bị Thượng Cổ"}},"qua_dau":300}'::jsonb where k = 'cfg';
update public.p2d_ht_cfg set v = jsonb_set(v, '{bases}', '{"thiet-kiem":{"slot":"vu-khi","main":{"atk":4},"pool":["atk","atk_pct","crit","crit_dmg","cdr","speed"]},"thanh-van-kiem":{"slot":"vu-khi","main":{"atk":5},"pool":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"]},"bo-y":{"slot":"giap","main":{"hp":20},"pool":["hp","hp_pct","def","speed","cdr","qi_gain"]},"huyen-giap":{"slot":"giap","main":{"def":2},"pool":["hp","hp_pct","def","crit","atk"]},"pt-thuong-lang":{"slot":"ngoc-boi","main":{"crit":2},"pool":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"]},"pt-tu-nguyet":{"slot":"ngoc-boi","main":{"cdr":3},"pool":["cdr","atk_pct","crit","qi_gain","hp_pct"]},"pt-phan-lien":{"slot":"ngoc-boi","main":{"hp_pct":4},"pool":["hp_pct","def","qi_gain","cdr"]},"pt-tu-tinh":{"slot":"ngoc-boi","main":{"crit_dmg":6},"pool":["crit_dmg","crit","atk_pct","cdr"]},"pt-bang-lien":{"slot":"ngoc-boi","main":{"qi_gain":5},"pool":["qi_gain","cdr","speed","hp","atk"]},"pt-thuy-long":{"slot":"ngoc-boi","main":{"hp_pct":4},"pool":["hp_pct","atk_pct","qi_gain","cdr"]},"pt-phuong-hoang":{"slot":"ngoc-boi","main":{"atk_pct":4},"pool":["atk_pct","crit_dmg","crit","qi_gain"]},"pt-tinh-lien":{"slot":"ngoc-boi","main":{"qi_gain":5},"pool":["qi_gain","hp_pct","cdr","def"]},"thiet-thuong":{"slot":"vu-khi","main":{"atk":5},"pool":["atk","atk_pct","crit","crit_dmg","speed","hp"]},"ba-tieu-phien":{"slot":"vu-khi","main":{"atk":3},"pool":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"]},"moc-cam":{"slot":"vu-khi","main":{"atk":3},"pool":["atk_pct","cdr","qi_gain","crit","hp","def"]},"tu-nguyet-liem":{"slot":"vu-khi","main":{"atk":5},"pool":["atk","atk_pct","crit","crit_dmg","cdr","speed"]},"truc-cung":{"slot":"vu-khi","main":{"atk":4},"pool":["atk","atk_pct","crit","crit_dmg","speed","cdr"]},"thien-mach-kiem":{"slot":"vu-khi","main":{"atk":7},"pool":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"]},"bo-hai":{"slot":"giay","main":{"speed":3},"pool":["speed","hp","def","cdr","qi_gain"]},"van-van-ngoa":{"slot":"giay","main":{"speed":4},"pool":["speed","crit","atk","hp_pct","cdr"]},"bo-can":{"slot":"mu","main":{"hp":15},"pool":["hp","def","cdr","qi_gain","crit"]},"thiet-khoi":{"slot":"mu","main":{"def":2},"pool":["def","hp","hp_pct","crit","atk"]},"thiet-gioi":{"slot":"nhan","main":{"crit":2},"pool":["crit","crit_dmg","atk","atk_pct","def"]},"linh-ngoc-gioi":{"slot":"nhan","main":{"crit_dmg":10},"pool":["crit","crit_dmg","qi_gain","hp_pct","cdr"]},"kim-luan":{"slot":"phap-bao","main":{"atk":3},"pool":["atk","atk_pct","cdr","crit"]},"tran-yeu-thap":{"slot":"phap-bao","main":{"hp":30},"pool":["hp","hp_pct","def","cdr"]},"hoa-hon-linh":{"slot":"phap-bao","main":{"atk_pct":4},"pool":["atk_pct","crit_dmg","cdr","qi_gain"]}}'::jsonb) where k = 'cfg';

alter table public.p2d_ht_diem add column if not exists thu_lenh integer not null default 0;

create or replace function public.p2d_ht_ngay(p_task text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype; v_d jsonb;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_day date; v_t jsonb; v_pt int := (c ->> 'points')::int;
  v_can int := (select (v -> 'thu' -> 'cuoi' ->> 'lenh_ngay')::int from public.p2d_ky_cfg where k = 'cfg'); v_them int := 0;
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
  if v_can is not null and coalesce(array_length(v_row.ngay_xong, 1), 0) + 1 = v_can then v_them := 1; end if;   -- việc thứ lenh_ngay trong ngày: 1 Thú Lệnh
  update public.p2d_ht_diem set diem = diem + v_pt, ngay = v_today, ngay_xong = array_append(v_row.ngay_xong, p_task), thu_lenh = thu_lenh + v_them, luc = now()
   where user_id = v_uid returning * into v_row;
  return jsonb_build_object('diem', v_row.diem, 'ngay_xong', to_jsonb(v_row.ngay_xong), 'them', v_pt, 'thu_lenh', v_row.thu_lenh, 'thu_lenh_them', v_them);
end;
$$;
revoke all on function public.p2d_ht_ngay(text) from public, anon;
grant execute on function public.p2d_ht_ngay(text) to authenticated;

create or replace function public.p2d_ht_trang_thai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((select jsonb_build_object('diem', diem, 'xong', to_jsonb(xong), 'so_lan', so_lan, 'bh2', bh2, 'bh3', bh3, 'thu_lenh', thu_lenh,
    'ngay_xong', case when ngay = (now() at time zone 'Asia/Ho_Chi_Minh')::date then to_jsonb(ngay_xong) else '[]'::jsonb end)
  from public.p2d_ht_diem where user_id = public.p2d_uid()),
  jsonb_build_object('diem', 0, 'xong', '[]'::jsonb, 'so_lan', 0, 'bh2', 0, 'bh3', 0, 'thu_lenh', 0, 'ngay_xong', '[]'::jsonb)) $$;
revoke all on function public.p2d_ht_trang_thai() from public, anon;
grant execute on function public.p2d_ht_trang_thai() to authenticated;

-- Đổi Thú Lệnh lấy một thú cưỡi tự chọn (Ngự Thú Sư, src/game/beast-shop.js buyMount qua game.cloud.run)
create or replace function public.p2d_doi_thu_cuoi(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := (select v -> 'thu' -> 'cuoi' from public.p2d_ky_cfg where k = 'cfg');
  v_n int; v_tl int; v_d jsonb; v_m jsonb; v_pb int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  v_n := coalesce((v_c ->> 'lenh')::int, 7);
  if not coalesce((v_c -> 'ids') ? p_id, false) then raise exception 'khong_co' using errcode = '22023'; end if;
  select thu_lenh into v_tl from public.p2d_ht_diem where user_id = v_uid for update;
  if coalesce(v_tl, 0) < v_n then raise exception 'thieu' using errcode = '22023'; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid for update;
  if v_d is null then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_m := case when jsonb_typeof(v_d -> 'mounts') = 'object' then v_d -> 'mounts' else '{}'::jsonb end;
  if v_m ? p_id then raise exception 'da_co' using errcode = '22023'; end if;
  update public.p2d_ht_diem set thu_lenh = thu_lenh - v_n, luc = now() where user_id = v_uid returning thu_lenh into v_tl;
  v_d := jsonb_set(v_d, '{mounts}', v_m || jsonb_build_object(p_id, true));
  if not (v_m ? coalesce(v_d ->> 'mount', '')) then v_d := jsonb_set(v_d, '{mount}', to_jsonb(p_id)); end if;
  update public.p2d_nhan_vat set data = v_d, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  return jsonb_build_object('thu_lenh', v_tl, 'mount', p_id, 'phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_doi_thu_cuoi(text) from public, anon;
grant execute on function public.p2d_doi_thu_cuoi(text) to authenticated;

-- 4) Đổi bản lưu một lần
do $$
declare
  v_doi jsonb := '{"ngoc-boi-tho": "pt-thuong-lang", "linh-phu": "pt-bang-lien", "xich-diem-boi": "pt-hoa-long", "han-bang-boi": "pt-bang-tinh-hoan", "hac-phong-boi": "pt-tu-diem-duc", "thanh-moc-boi": "pt-thanh-dang", "kim-cang-boi": "pt-kim-kiem-tran", "hau-tho-boi": "pt-kim-duong", "dao-van-boi": "pt-kim-diem-quan", "thai-hu-boi": "pt-tinh-van"}';
  v_cu jsonb := '["bach-loc", "phong-lang", "hoa-ky-lan", "tuyet-ly"]';
  v_ids jsonb := (select v -> 'thu' -> 'cuoi' -> 'ids' from public.p2d_ky_cfg where k = 'cfg');
  v_tt jsonb := (select v -> 'thu' -> 'thoi' -> 'bo' from public.p2d_ky_cfg where k = 'cfg');
  r record; v_d jsonb; v_bag jsonb; v_it jsonb; v_om jsonb; v_ol jsonb; v_fl jsonb; v_cu_thu boolean; v_cu_ao boolean; v_doi_mon boolean;
  v_look text; v_mac text; v_line jsonb; v_den jsonb; v_moi jsonb; v_k text; v_v jsonb; v_lu jsonb;
begin
  for r in select user_id, data from public.p2d_nhan_vat for update loop
    v_d := r.data; v_doi_mon := false;
    v_look := case when v_d ->> 'look' in ('nam', 'nu') then v_d ->> 'look' else 'nam' end;
    -- ngọc bội → pháp tượng
    if jsonb_typeof(v_d -> 'bag') = 'array' and exists (select 1 from jsonb_array_elements(v_d -> 'bag') e where v_doi ? (e ->> 'base')) then
      select coalesce(jsonb_agg(case when jsonb_typeof(e) = 'object' and v_doi ? (e ->> 'base')
               then public.p2d_ky_dong((e - 'sig') || jsonb_build_object('base', v_doi ->> (e ->> 'base'))) else e end order by n), '[]'::jsonb)
        into v_bag from jsonb_array_elements(v_d -> 'bag') with ordinality as t(e, n);
      v_doi_mon := true;
    else v_bag := v_d -> 'bag';
    end if;
    v_om := case when jsonb_typeof(v_d -> 'mounts') = 'object' then v_d -> 'mounts' else '{}'::jsonb end;
    v_ol := case when jsonb_typeof(v_d -> 'outfits') = 'object' then v_d -> 'outfits' else '{}'::jsonb end;
    v_fl := case when jsonb_typeof(v_d -> 'outfitLine') = 'object' then v_d -> 'outfitLine' else '{}'::jsonb end;
    v_cu_thu := exists (select 1 from jsonb_object_keys(v_om) k where v_cu ? k);
    v_cu_ao := exists (select 1 from jsonb_object_keys(v_ol) k where not (v_tt ? split_part(k, ':', 1)))
               or (coalesce(v_d ->> 'outfit', '') <> '' and not (v_tt ? (v_d ->> 'outfit')));
    continue when not (v_doi_mon or v_cu_thu or v_cu_ao or exists (select 1 from jsonb_object_keys(v_om) k where not (v_ids ? k))
                       or exists (select 1 from jsonb_object_keys(v_fl) k where not (v_tt ? split_part(k, ':', 1))));
    insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
    values (r.user_id, 'doi_moi_16_11', jsonb_build_object('mounts', v_d -> 'mounts', 'mountLine', v_d -> 'mountLine', 'mount', v_d -> 'mount',
      'outfits', v_d -> 'outfits', 'outfitLine', v_d -> 'outfitLine', 'outfit', v_d -> 'outfit', 'look', v_d -> 'look',
      'ngoc_boi', (select coalesce(jsonb_agg(e), '[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(v_d -> 'bag') = 'array' then v_d -> 'bag' else '[]'::jsonb end) e where v_doi ? (e ->> 'base'))));
    -- thú cưỡi: bỏ con cũ (và mọi con không còn trong danh sách); đền bù 4 con mới ngẫu nhiên không trùng
    v_moi := (select coalesce(jsonb_object_agg(k, true), '{}'::jsonb) from jsonb_object_keys(v_om) k where v_ids ? k);
    v_lu := (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(case when jsonb_typeof(v_d -> 'mountLine') = 'object' then v_d -> 'mountLine' else '{}'::jsonb end) e where v_ids ? e.key);
    v_den := '[]'::jsonb;
    if v_cu_thu or v_cu_ao then
      select coalesce(jsonb_agg(x), '[]'::jsonb) into v_den from (select x from jsonb_array_elements_text(v_ids) x where not (v_moi ? x) order by random() limit 4) s;
      for v_k in select jsonb_array_elements_text(v_den) loop v_moi := v_moi || jsonb_build_object(v_k, true); end loop;
    end if;
    v_d := jsonb_set(jsonb_set(v_d, '{mounts}', v_moi), '{mountLine}', v_lu);
    if not (v_moi ? coalesce(v_d ->> 'mount', '')) then
      v_d := case when v_den <> '[]'::jsonb then jsonb_set(v_d, '{mount}', v_den -> 0) else v_d - 'mount' end;
    end if;
    v_d := v_d - 'ride';
    if v_den <> '[]'::jsonb then v_d := jsonb_set(v_d, '{denBu16}', v_den); end if;
    -- thời trang: bỏ bộ cũ; dòng của bộ đang mặc chuyển sang bộ mặc định của giới
    v_mac := v_d ->> 'outfit'; v_line := null;
    if v_mac is not null and not (v_tt ? v_mac) then v_line := coalesce(v_fl -> (v_mac || ':' || v_look), v_fl -> v_mac); end if;
    v_d := jsonb_set(v_d, '{outfits}', (select coalesce(jsonb_object_agg(k, v_ol -> k), '{}'::jsonb) from jsonb_object_keys(v_ol) k where v_tt ? split_part(k, ':', 1)));
    v_fl := (select coalesce(jsonb_object_agg(k, v_fl -> k), '{}'::jsonb) from jsonb_object_keys(v_fl) k where v_tt ? split_part(k, ':', 1));
    if v_line is not null and jsonb_typeof(v_line) = 'object' then
      v_fl := v_fl || jsonb_build_object(case when v_look = 'nu' then 'tp-10:nu' else 'tp-02:nam' end, v_line);
    end if;
    v_d := jsonb_set(v_d, '{outfitLine}', v_fl);
    if v_mac is not null and not (v_tt ? v_mac) then v_d := v_d - 'outfit'; end if;
    if v_doi_mon then v_d := jsonb_set(v_d, '{bag}', v_bag); end if;
    update public.p2d_nhan_vat set data = v_d, phien_ban = phien_ban + 1, updated_at = now() where user_id = r.user_id;
  end loop;
  update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{item}', public.p2d_ky_dong(((noi_dung -> 'item') - 'sig') || jsonb_build_object('base', v_doi ->> (noi_dung -> 'item' ->> 'base'))))
   where nhan_luc is null and jsonb_typeof(noi_dung -> 'item') = 'object' and v_doi ? (noi_dung -> 'item' ->> 'base');
  update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{sold}', public.p2d_ky_dong(((noi_dung -> 'sold') - 'sig') || jsonb_build_object('base', v_doi ->> (noi_dung -> 'sold' ->> 'base'))))
   where nhan_luc is null and jsonb_typeof(noi_dung -> 'sold') = 'object' and v_doi ? (noi_dung -> 'sold' ->> 'base');
  update public.p2d_cho set mon = public.p2d_ky_dong((mon - 'sig') || jsonb_build_object('base', v_doi ->> (mon ->> 'base')))
   where loai = 'mon' and jsonb_typeof(mon) = 'object' and v_doi ? (mon ->> 'base');
  update public.p2d_thien_ma_qua set base = v_doi ->> base, mon = mon || jsonb_build_object('base', v_doi ->> base) where v_doi ? base;
end;
$$;
