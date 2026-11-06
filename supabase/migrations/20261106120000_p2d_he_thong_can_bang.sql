-- Cân bằng quà tân thủ sau lần chạy thử nhân vật ảo 25 phút (06/11/2026): hết Tinh Thiết ở +4/+5, kẹt độ kiếp Kim Đan.
-- Thêm Tinh Thiết, Thanh Tâm Đan, Bồi Nguyên Đan. Sinh từ data/he-thong.json.
update public.p2d_ht_nv set qua = '[{"pill": "tu-khi-dan", "n": 5}, {"coins": 2000}, {"mat": "tinh-thiet", "n": 5}]'::jsonb where id = 'kham-1';
update public.p2d_ht_nv set qua = '[{"gear": 1, "slot": "thieu"}, {"mat": "tinh-thiet", "n": 12}]'::jsonb where id = 'truyen-8';
update public.p2d_ht_nv set qua = '[{"mat": "tinh-thiet", "n": 25}, {"mat": "tay-luyen-thach", "n": 2}]'::jsonb where id = 'mac-7';
update public.p2d_ht_nv set qua = '[{"mat": "tinh-thiet", "n": 10}, {"coins": 3000}]'::jsonb where id = 'luyen-khi-5';
update public.p2d_ht_nv set qua = '[{"pill": "tu-khi-dan", "n": 10}, {"pill": "thang-linh-dan", "n": 2}, {"pill": "thanh-tam-dan", "n": 2}]'::jsonb where id = 'hoi-dot-pha';
update public.p2d_ht_nv set qua = '[{"gear": 2, "slot": "thieu"}, {"coins": 10000}, {"mat": "tinh-thiet", "n": 15}, {"pill": "thanh-tam-dan", "n": 2}, {"pill": "boi-nguyen-dan", "n": 3}]'::jsonb where id = 'truc-co';
