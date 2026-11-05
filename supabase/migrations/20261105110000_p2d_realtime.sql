-- Realtime cho chat và truyền âm (chủ dự án duyệt 05/11/2026 10:21). Trước đây máy khách đọc lại kênh chat 5–20 giây một lần
-- (p2d_doc_chat khoảng 33 nghìn lần mỗi ngày) và truyền âm 5–30 giây (p2d_doc_truyen_am khoảng 15 nghìn lần mỗi ngày).
-- Giờ máy chủ đẩy tin qua Realtime Broadcast ngay khi ghi:
-- - p2d_chat: trigger gửi event "tin" (id, kênh, tên, nội dung, lúc, cảnh giới, mã chat k) lên chủ đề riêng tư "p2dc:<kênh>".
-- - p2d_truyen_am: trigger gửi event "ta" (chỉ id, không nội dung) lên "p2dw:<mã tài khoản người nhận>"; máy khách đọc lại
--   bằng p2d_doc_truyen_am như cũ.
-- Đường ghi không đổi: máy khách vẫn chỉ ghi qua p2d_gui_chat / p2d_gui_truyen_am (đã kiểm tra cấm chat, tốc độ, độ dài).
-- Quyền đọc (realtime.messages, chủ đề riêng tư): "p2dc:the-gioi" mọi người đã đăng nhập; "p2dc:bang:<id>" chỉ thành viên tông môn
-- đó (p2d_vao_kenh như p2d_doc_chat); "p2dw:<uid>" chỉ chính người đó. Không có chính sách ghi cho các chủ đề này nên máy khách
-- không gửi giả tin vào được (realtime.send chạy ở máy chủ, không qua RLS). Chủ đề "p2d:%" (đảo), "p2d-to:%" (tổ đội) giữ nguyên.
-- Gửi Realtime lỗi thì bỏ qua: không bao giờ làm hỏng lần ghi chat (máy khách còn đọc bù định kỳ).

-- 1. Ai được nghe chủ đề nào (một hàm để chính sách gọn và tự kiểm tra được)
create or replace function public.p2d_rt_doc(p_topic text, p_uid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_uid is not null and p_topic is not null and (
    p_topic = 'p2dc:the-gioi'
    or (p_topic like 'p2dc:bang:%' and public.p2d_vao_kenh(substr(p_topic, 6), p_uid))
    or p_topic = 'p2dw:' || p_uid::text
  );
$$;
revoke all on function public.p2d_rt_doc(text, uuid) from public, anon;
grant execute on function public.p2d_rt_doc(text, uuid) to authenticated;

drop policy if exists p2d_rt_day_nhan on realtime.messages;
create policy p2d_rt_day_nhan on realtime.messages
  for select to authenticated
  using (
    extension = 'broadcast'
    and (select public.p2d_rt_doc((select realtime.topic()), (select auth.uid())))
  );

-- 2. Đẩy chat khi ghi (mọi đường ghi vào p2d_chat, kể cả tin hệ thống)
create or replace function public.p2d_chat_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v_cg integer;
begin
  begin
    select n.canh_gioi into v_cg from public.p2d_nhan_vat n where n.user_id = new.user_id;
    perform realtime.send(
      jsonb_build_object('id', new.id, 'kenh', new.kenh, 'ten', new.ten, 'chu', new.noi_dung, 'luc', new.tao_luc,
                         'canh_gioi', v_cg, 'k', public.p2d_chat_key(new.user_id)),
      'tin', 'p2dc:' || new.kenh, true);
  exception when others then
    null;   -- Realtime lỗi: tin vẫn ghi, máy khách đọc bù
  end;
  return null;
end;
$$;
revoke all on function public.p2d_chat_day() from public, anon, authenticated;

drop trigger if exists p2d_chat_day on public.p2d_chat;
create trigger p2d_chat_day after insert on public.p2d_chat
  for each row execute function public.p2d_chat_day();

-- 3. Báo có truyền âm mới cho người nhận (chỉ id)
create or replace function public.p2d_truyen_am_day()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  begin
    perform realtime.send(jsonb_build_object('id', new.id), 'ta', 'p2dw:' || new.den::text, true);
  exception when others then
    null;
  end;
  return null;
end;
$$;
revoke all on function public.p2d_truyen_am_day() from public, anon, authenticated;

drop trigger if exists p2d_truyen_am_day on public.p2d_truyen_am;
create trigger p2d_truyen_am_day after insert on public.p2d_truyen_am
  for each row execute function public.p2d_truyen_am_day();

-- 4. Tự kiểm tra quyền nghe (không ghi gì): sai thì cả migration hoàn tác
do $kt$
declare
  a uuid := '00000000-0000-4000-8000-0000000000aa';
  b uuid := '00000000-0000-4000-8000-0000000000bb';
  g record;
begin
  if not public.p2d_rt_doc('p2dc:the-gioi', a) then raise exception 'kt: the-gioi phai doc duoc'; end if;
  if public.p2d_rt_doc('p2dc:the-gioi', null) then raise exception 'kt: chua dang nhap khong doc'; end if;
  if not public.p2d_rt_doc('p2dw:' || a::text, a) then raise exception 'kt: truyen am cua minh'; end if;
  if public.p2d_rt_doc('p2dw:' || b::text, a) then raise exception 'kt: truyen am nguoi khac'; end if;
  if public.p2d_rt_doc('p2dc:bang:999999999', a) then raise exception 'kt: bang khong phai thanh vien'; end if;
  if public.p2d_rt_doc('p2d:lang', a) or public.p2d_rt_doc('p2dc:khac', a) then raise exception 'kt: chu de la'; end if;
  select t.user_id, t.bang_id into g from public.p2d_bang_tv t limit 1;
  if found then
    if not public.p2d_rt_doc('p2dc:bang:' || g.bang_id::text, g.user_id) then raise exception 'kt: thanh vien bang phai doc duoc'; end if;
    if public.p2d_rt_doc('p2dc:bang:' || g.bang_id::text, b) then raise exception 'kt: nguoi ngoai bang'; end if;
  end if;
end;
$kt$;
