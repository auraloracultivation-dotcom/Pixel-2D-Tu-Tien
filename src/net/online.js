// Thấy người chơi khác: mỗi đảo một kênh Realtime "p2d:<đảo>". Presence = ai đang ở đây (tên, hệ, cảnh giới);
// broadcast "move" = vị trí, gửi tối đa ~8 lần/giây và chỉ khi đã "joined"; broadcast "say" = chào hỏi, trò chuyện
// (game/social.js lọc chữ). Không ghi gì vào cơ sở dữ liệu.
import { supabase } from './client.js';

const SEND_MS = 125;

export function createOnline(me, handlers) {
  let ch = null, mapId = null, lastSend = 0, lastPos = '';

  async function leave() {
    if (ch) { const old = ch; ch = null; await supabase.removeChannel(old); }
    handlers.onClear();
  }

  async function join(id, profile) {
    if (id === mapId && ch) return;
    await leave();
    mapId = id;
    if (!id) return;
    const c = supabase.channel(`p2d:${id}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
    ch = c;
    c.on('presence', { event: 'sync' }, () => {
      if (ch !== c) return;
      const state = c.presenceState();
      const list = Object.entries(state).filter(([k]) => k !== me.id).map(([k, metas]) => ({ id: k, ...metas[metas.length - 1] }));
      handlers.onPresence(list);
    })
      .on('broadcast', { event: 'move' }, ({ payload }) => { if (ch === c) handlers.onMove(payload); })
      .on('broadcast', { event: 'say' }, ({ payload }) => { if (ch === c) handlers.onSay?.(payload); })
      .subscribe(status => {
        if (status === 'SUBSCRIBED' && ch === c) c.track({ name: me.name, ...profile });
      });
  }

  function send(p, extra = {}) {
    if (!ch || ch.state !== 'joined') return;
    const now = Date.now();
    const key = `${Math.round(p.x)},${Math.round(p.y)},${extra.act || ''}`;
    if (now - lastSend < SEND_MS || (key === lastPos && now - lastSend < 2000)) return;
    lastSend = now; lastPos = key;
    ch.send({ type: 'broadcast', event: 'move', payload: { id: me.id, x: Math.round(p.x), y: Math.round(p.y), fx: +p.face.x.toFixed(2), fy: +p.face.y.toFixed(2), ...extra } });
  }

  // Chào hỏi, trò chuyện: { e: id } hoặc { m: chữ }, người gửi gắn id của mình
  function say(body) {
    if (!ch || ch.state !== 'joined') return;
    ch.send({ type: 'broadcast', event: 'say', payload: { id: me.id, ...body } });
  }

  return { me, join, leave, send, say };
}
