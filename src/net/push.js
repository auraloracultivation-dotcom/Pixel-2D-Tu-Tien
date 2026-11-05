// Tin máy chủ đẩy qua Realtime (supabase/migrations/20261105110000_p2d_realtime.sql): kênh riêng tư chỉ nghe, máy khách không gửi được
// (realtime.messages chỉ có chính sách đọc cho các chủ đề này). "p2dc:<kênh chat>" nhận event "tin" = một dòng chat vừa ghi
// (p2d_gui_chat vẫn là đường ghi duy nhất); "p2dw:<mã tài khoản>" nhận event "ta" = có truyền âm mới (chỉ báo id, nội dung đọc qua
// p2d_doc_truyen_am). onStatus nhận 'SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED' như supabase-js.
import { supabase, realtimeAuth } from './client.js';

export async function listen(topic, onMsg, onStatus) {
  await realtimeAuth();
  const ch = supabase.channel(topic, { config: { private: true } });
  ch.on('broadcast', { event: '*' }, m => onMsg(m?.event, m?.payload))
    .subscribe(st => onStatus?.(st));
  return {
    live: () => ch.state === 'joined',
    close: () => supabase.removeChannel(ch),
  };
}
