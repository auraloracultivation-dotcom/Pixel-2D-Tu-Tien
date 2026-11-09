-- Chiêu không theo hệ bán ở Vạn Bảo Lâu (chủ dự án 09–10/11/2026): Thiểm Ảnh Liên Trảm, Vô Ảnh Trảm Vực, Phá Thiên Tuyệt Trảm, Thiên Phạt.
-- Thêm mã 'thiem-anh', 'vo-anh', 'pha-thien', 'thien-phat' vào danh sách chiêu máy chủ nhận cấp (thu.chieu.ids, p2d_thu_cap) để luyện cấp
-- không bị trả về. Chỉ nối thêm mã còn thiếu, không ghi đè phần cấu hình khác (chủ dự án duyệt áp 10/11/2026 02:09).
update public.p2d_ky_cfg
set v = jsonb_set(v, '{thu,chieu,ids}',
  (v->'thu'->'chieu'->'ids') || coalesce((select jsonb_agg(x) from unnest(array['thiem-anh','vo-anh','pha-thien','thien-phat']) x
    where not (v->'thu'->'chieu'->'ids') ? x), '[]'::jsonb))
where k = 'cfg';
