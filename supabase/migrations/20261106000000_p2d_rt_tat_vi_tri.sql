-- Giảm tin Realtime (chủ dự án 06/11/2026 07:09: Supabase báo 13,4 → 15 triệu tin / 5 triệu gói Pro, "tạm thời giảm thiểu tối đa trước").
-- Phần lớn tin là vị trí người chơi trên kênh đảo "p2d:<đảo>": mỗi tin tính 1 gửi + 1 cho mỗi người cùng đảo.
-- Tạm chỉ cho máy khách gửi presence (ai đang ở đảo) trên "p2d:%", không gửi broadcast (vị trí, chào hỏi) nữa; kênh tổ đội
-- "p2d-to:%" giữ nguyên để bí cảnh tổ đội vẫn chơi được. Máy khách mới cũng thôi gửi (data/config.json realtime.map_send=false).
-- Mở lại: đổi with_check về ('p2d:%' or 'p2d-to:%') sau khi máy khách đã dùng mức gửi thưa. Đã áp máy chủ 06/11 07:15.
alter policy p2d_rt_gui on realtime.messages
  with check (
    ((select realtime.topic()) like 'p2d-to:%')
    or ((select realtime.topic()) like 'p2d:%' and extension = 'presence')
  );
