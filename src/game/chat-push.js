// Chat và truyền âm do máy chủ đẩy qua Realtime (chủ dự án duyệt 05/11/2026 10:21; máy chủ: migration 20261105110000_p2d_realtime.sql,
// máy khách nghe ở src/net/push.js). Trước đây mọi máy đọc lại kênh Thế giới 5–20 giây một lần, truyền âm 5–30 giây (khoảng 33 nghìn
// lần p2d_doc_chat và 15 nghìn lần p2d_doc_truyen_am mỗi ngày). Giờ:
// - Đã đăng nhập thì nghe "p2dc:the-gioi", "p2dc:bang:<id>" khi có tông môn, "p2dw:<mã mình>"; tin chat tới thì gộp thẳng vào
//   hàng tin (game/world-chat.js pushRow), có truyền âm thì đọc ngay một lần (gom các báo trong whisper_debounce_ms).
// - Vào kênh xong (cả lúc nối lại) đọc bù một lần; còn nghe được thì các vòng đọc cũ chỉ đọc bù mỗi fallback_s giây
//   (whisper_fallback_s cho truyền âm), mất kết nối thì tự quay về nhịp đọc cũ. Ghi vẫn chỉ qua p2d_gui_chat / p2d_gui_truyen_am.
// Số ở data/config.json → realtime. game.push.live(key) cho world-chat.js, whisper.js biết kênh nào đang nghe.
import { every } from '../core/ticker.js';
import { pullChan, pushRow } from './world-chat.js';
import { pullWhisper } from './whisper.js';
import { chatKey } from './guild.js';

export function startChatPush(game) {
  const subs = new Map();   // key → { topic, h, live, closing }
  let wTimer = 0;
  game.push = { live: key => { const s = subs.get(key); return !!(s?.live && s.h?.live()); } };   // socket rớt: kênh hết joined, đọc lại như cũ

  function wanted() {
    const on = !!(game.online && game.cloud && game.online.me?.id);
    if (!on) return new Map();
    const m = new Map([['the-gioi', 'p2dc:the-gioi'], ['w', 'p2dw:' + game.online.me.id]]);
    let g = null;
    try { g = chatKey(game); } catch { /* tông môn chưa nạp xong */ }
    if (g) m.set(g, 'p2dc:' + g);
    return m;
  }

  function onMsg(key, ev, p) {
    if (ev === 'tin' && key !== 'w') pushRow(game, key, p);
    else if (ev === 'ta' && key === 'w') {
      clearTimeout(wTimer);
      wTimer = setTimeout(() => pullWhisper(game, true), game.data.config.realtime?.whisper_debounce_ms || 600);
    }
  }

  function onStatus(key, sub, st) {
    if (subs.get(key) !== sub) return;
    sub.live = st === 'SUBSCRIBED';
    if (sub.live) { if (key === 'w') pullWhisper(game, true); else pullChan(game, key, true); }   // đọc bù tin lỡ lúc chưa nghe
  }

  async function open(key, topic) {
    const sub = { topic, h: null, live: false };
    subs.set(key, sub);
    try {
      const { listen } = await import('../net/push.js');
      sub.h = await listen(topic, (ev, p) => subs.get(key) === sub && onMsg(key, ev, p), st => onStatus(key, sub, st));
      if (subs.get(key) !== sub) sub.h.close();   // đã thôi cần trong lúc chờ
    } catch { if (subs.get(key) === sub) subs.delete(key); }   // không tải được: vòng sau thử lại, các vòng đọc cũ vẫn chạy
  }

  function close(key) {
    const sub = subs.get(key);
    subs.delete(key);
    sub?.h?.close?.();
  }

  function sync() {
    const want = wanted();
    for (const [key, sub] of [...subs]) if (want.get(key) !== sub.topic) close(key);
    for (const [key, topic] of want) if (!subs.has(key)) open(key, topic);
  }
  every(sync, 3000, { whenHidden: true });   // trang ẩn vẫn giữ kênh (socket tự ngủ theo trình duyệt), mở lại thì đọc bù khi nối lại
  game.pushState = () => [...subs].map(([k, s]) => ({ key: k, topic: s.topic, live: game.push.live(k) }));   // kiểm thử
}
