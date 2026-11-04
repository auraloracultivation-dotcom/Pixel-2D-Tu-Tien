-- Kiểm tra A-Z 05/11/2026: advisor hiệu năng báo hai khoá ngoại chưa có chỉ mục (xoá / sửa dòng cha phải quét cả bảng con).
create index if not exists p2d_doi_truong_idx on public.p2d_doi (truong);
create index if not exists p2d_ma_qua_dung_boi_idx on public.p2d_ma_qua (dung_boi);
