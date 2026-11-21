-- Giờ chơi đếm cả nhịp qua phòng Cloudflare (một người chơi báo 22/11/2026: "chơi 6 tiếng rồi mà vẫn kêu có 1,6 tiếng").
-- Migration 20261120011000 chỉ thêm tong vào p2d_nhip_song (đường nhịp gọi thẳng Supabase), còn đường thường dùng là phòng Cloudflare
-- gom nhịp 12 giây một lần gọi p2d_nhip_gop, hàm này chỉ cộng giay (hạn mức kinh tế) nên giờ chơi gần như không tăng từ 20/11.
-- Thêm một chỗ hụt: lần lưu (p2d_nhip_dung) đặt lại luc, nên khoảng từ nhịp trước tới lúc lưu bị bỏ; lưu càng dày càng mất giờ.
-- Sau: cột tluc (lần cuối cộng giờ chơi) riêng cho tong, lần lưu không đụng tới. Phòng cộng số giây còn liên lạc theo đồng hồ phòng
-- (v_g), chặn bởi khoảng từ lần cộng trước + 3 giây như giay (hai phòng / hai đường cùng báo một người không cộng đôi).
-- giay, luc, chống hack, hạn mức kinh tế không đổi.

alter table public.p2d_nhip add column if not exists tluc timestamptz;

-- Nhịp gom của phòng: cộng tong
do $$
declare v_def text := pg_get_functiondef('public.p2d_nhip_gop'::regproc);
  v_cu text := 'luc = now(), mang = coalesce(excluded.mang, n.mang);';
  v_moi text := 'tong = n.tong + least(v_g, greatest(0, extract(epoch from (now() - coalesce(n.tluc, n.luc)))) + 3), tluc = now(),
            luc = now(), mang = coalesce(excluded.mang, n.mang);';
begin
  if position('tong = n.tong' in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_cu, ''))) / length(v_cu) <> 1 then raise exception 'p2d_nhip_gop: không thấy đúng một chỗ'; end if;
  execute replace(v_def, v_cu, v_moi);
end $$;

-- Nhịp gọi thẳng: tính từ lần cộng giờ chơi trước (tluc), không từ luc (lần lưu đặt lại luc)
do $$
declare v_def text := pg_get_functiondef('public.p2d_nhip_song'::regproc);
  v_cu text := 'tong = n.tong + case when now() - n.luc <= interval ''15 seconds'' then extract(epoch from (now() - n.luc)) else 0 end,';
  v_moi text := 'tong = n.tong + case when now() - coalesce(n.tluc, n.luc) <= interval ''15 seconds'' then extract(epoch from (now() - coalesce(n.tluc, n.luc))) else 0 end, tluc = now(),';
begin
  if position('coalesce(n.tluc, n.luc)' in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_cu, ''))) / length(v_cu) <> 1 then raise exception 'p2d_nhip_song: không thấy đúng một chỗ'; end if;
  execute replace(v_def, v_cu, v_moi);
end $$;
