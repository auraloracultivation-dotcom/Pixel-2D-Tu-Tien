-- Đổi đồ hệ cũ ra Linh Thạch (chủ dự án 21/11/2026 01:3x: "Đổi ra Linh Thạch", tỉ lệ "Nửa giá").
-- Bí Kíp Chiêu (nâng cấp 48 chiêu cũ, ẩn từ Mùa 2) và Mảnh Pháp Bảo (luyện pháp bảo kiểu cũ) không còn chỗ dùng.
-- Giá bán cũ ở Luyện Khí Sư: Bí Kíp 1 200, Mảnh 3 000 → đổi nửa giá: 600 và 1 500 Linh Thạch mỗi cái.
-- 1) Một lần: bản lưu có hai nguyên liệu này thì bỏ khỏi mats, tăng phien_ban (máy đang mở tải lại bản máy chủ), gửi Linh Thạch qua
--    Hòm thư (ly_do doi_do_cu). Đo trước khi áp (21/11 00:4x): 59 người giữ 3 038 Bí Kíp, 76 người giữ 11 131 Mảnh, tổng phát ~18,5 triệu.
--    Máy khách bản mới cũng tự bỏ hai món này khỏi bản lưu trong máy (src/game/doi-moi.js).
-- 2) Bảng triệu hồi Hệ Thống bỏ món nl-manh-phap-bao (python3 tools/he-thong-sql.py bac; các món cùng bậc chia lại tỉ lệ của bậc).

do $$
declare
  r record; v_bk numeric; v_mp numeric; v_lt bigint;
begin
  for r in select user_id, data from public.p2d_nhan_vat
           where jsonb_typeof(data -> 'mats') = 'object' and (data -> 'mats' ? 'bi-kip-chieu' or data -> 'mats' ? 'manh-phap-bao') for update loop
    v_bk := case when jsonb_typeof(r.data -> 'mats' -> 'bi-kip-chieu') = 'number' then greatest(0, floor((r.data -> 'mats' ->> 'bi-kip-chieu')::numeric)) else 0 end;
    v_mp := case when jsonb_typeof(r.data -> 'mats' -> 'manh-phap-bao') = 'number' then greatest(0, floor((r.data -> 'mats' ->> 'manh-phap-bao')::numeric)) else 0 end;
    v_lt := (v_bk * 600 + v_mp * 1500)::bigint;
    update public.p2d_nhan_vat
       set data = jsonb_set(r.data, '{mats}', (r.data -> 'mats') - 'bi-kip-chieu' - 'manh-phap-bao'),
           phien_ban = phien_ban + 1, updated_at = now()
     where user_id = r.user_id;
    if v_lt > 0 then
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
      values (r.user_id, jsonb_build_object('coins', v_lt, 'tieu_de', 'Đổi đồ hệ cũ ra Linh Thạch',
        'text', 'Bí Kíp Chiêu ×' || v_bk || ', Mảnh Pháp Bảo ×' || v_mp || ' đã đổi nửa giá cũ: ' || v_lt || ' Linh Thạch.'), 'doi_do_cu');
    end if;
  end loop;
end;
$$;

update public.p2d_ht_cfg set v = v || '{"pool":[{"id":"lt-20k","b":0,"coins":20000,"w":4.769231},{"id":"lt-50k","b":0,"coins":50000,"w":4.769231},{"id":"lt-100k","b":1,"coins":100000,"w":2.363636},{"id":"lt-200k","b":2,"coins":200000,"w":1.1875},{"id":"lt-500k","b":3,"coins":500000,"w":0.44},{"id":"lt-1tr","b":4,"coins":1000000,"w":0.05},{"id":"lt-2tr","b":4,"coins":2000000,"w":0.05},{"id":"ngoc-1","b":0,"gem":[1,1],"n":1,"w":4.769231},{"id":"ngoc-2","b":0,"gem":[2,2],"n":1,"w":4.769231},{"id":"ngoc-3","b":0,"gem":[3,3],"n":1,"w":4.769231},{"id":"ngoc-4","b":1,"gem":[4,4],"n":1,"w":2.363636},{"id":"ngoc-5","b":2,"gem":[5,5],"n":1,"w":1.1875},{"id":"ngoc-6","b":3,"gem":[6,6],"n":1,"w":0.44},{"id":"ngoc-7","b":4,"gem":[7,7],"n":1,"w":0.05},{"id":"ngoc-8","b":4,"gem":[8,8],"n":1,"w":0.05},{"id":"do-0","b":0,"gear":[0],"w":4.769231},{"id":"do-1","b":0,"gear":[1],"w":4.769231},{"id":"do-2","b":1,"gear":[2],"w":2.363636},{"id":"do-3","b":2,"gear":[3],"w":1.1875},{"id":"do-4","b":3,"gear":[4],"w":0.44},{"id":"do-5","b":4,"gear":[5],"w":0.05},{"id":"do-6","b":4,"gear":[6],"w":0.05},{"id":"dan-hoi-xuan-dan","b":0,"pill":"hoi-xuan-dan","n":10,"w":4.769231},{"id":"dan-hoi-linh-dan","b":0,"pill":"hoi-linh-dan","n":10,"w":4.769231},{"id":"dan-tu-khi-dan","b":0,"pill":"tu-khi-dan","n":5,"w":4.769231},{"id":"dan-boi-nguyen-dan","b":1,"pill":"boi-nguyen-dan","n":2,"w":2.363636},{"id":"dan-thanh-tam-dan","b":1,"pill":"thanh-tam-dan","n":2,"w":2.363636},{"id":"dan-tinh-lien-dan","b":2,"pill":"tinh-lien-dan","n":1,"w":1.1875},{"id":"dan-tu-van-dan","b":1,"pill":"tu-van-dan","n":3,"w":2.363636},{"id":"dan-tay-tuy-dan","b":2,"pill":"tay-tuy-dan","n":1,"w":1.1875},{"id":"nl-linh-thao","b":0,"mat":"linh-thao","n":20,"w":4.769231},{"id":"nl-yeu-huyet","b":0,"mat":"yeu-huyet","n":10,"w":4.769231},{"id":"nl-tinh-thiet","b":0,"mat":"tinh-thiet","n":20,"w":4.769231},{"id":"nl-hoa-linh-chi","b":1,"mat":"hoa-linh-chi","n":5,"w":2.363636},{"id":"nl-tay-luyen-thach","b":1,"mat":"tay-luyen-thach","n":10,"w":2.363636},{"id":"nl-khoa-linh-thach","b":1,"mat":"khoa-linh-thach","n":2,"w":2.363636},{"id":"nl-dao-van-thach","b":2,"mat":"dao-van-thach","n":1,"w":1.1875},{"id":"khoi-tieu-hoa","b":1,"comp":"tieu-hoa","gia":8000,"w":2.363636},{"id":"khoi-ho-linh","b":1,"comp":"ho-linh","gia":8000,"w":2.363636},{"id":"khoi-thanh-diep","b":2,"comp":"thanh-diep","gia":10000,"w":1.1875},{"id":"khoi-mac-anh","b":2,"comp":"mac-anh","gia":12000,"w":1.1875},{"id":"khoi-thach-sinh","b":3,"comp":"thach-sinh","gia":15000,"w":0.44},{"id":"khoi-thiet-lan","b":3,"comp":"thiet-lan","gia":18000,"w":0.44}],"bh":{"hiem":10,"cuc":80},"loa":{"b":4,"ten":{"lt-1tr":"1 triệu Linh Thạch","lt-2tr":"2 triệu Linh Thạch","ngoc-7":"ngọc cấp 7","ngoc-8":"ngọc cấp 8","do-5":"trang bị phẩm Tiên","do-6":"trang bị Thượng Cổ"}},"qua_dau":300}'::jsonb where k = 'cfg';
