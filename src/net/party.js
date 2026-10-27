// Tổ đội bí cảnh: một kênh Realtime "p2d-to:<mã>" cho cả đội. Presence = ai trong đội (tên, cảnh giới, lúc vào);
// broadcast "p" = mọi tin của đội (bắt đầu, vị trí, quái, đòn đánh). Không ghi gì vào cơ sở dữ liệu.
import { supabase } from './client.js';

export function joinParty(me, code, handlers) {
  const ch = supabase.channel(`p2d-to:${code}`, { config: { presence: { key: me.id }, broadcast: { self: false } } });
  const joined = Date.now();
  ch.on('presence', { event: 'sync' }, () => {
    const list = Object.entries(ch.presenceState()).map(([id, metas]) => ({ id, ...metas[metas.length - 1] }));
    handlers.onRoster(list);
  })
    .on('broadcast', { event: 'p' }, ({ payload }) => handlers.onMsg(payload))
    .subscribe(status => {
      if (status === 'SUBSCRIBED') ch.track({ name: me.name, realm: me.realm, joined });
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') handlers.onError?.();
    });
  return {
    send(body) { if (ch.state === 'joined') ch.send({ type: 'broadcast', event: 'p', payload: { from: me.id, ...body } }); },
    leave() { return supabase.removeChannel(ch); },
  };
}
