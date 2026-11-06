// Tổ đội bí cảnh qua máy chủ phòng Cloudflare (thay src/net/party.js khi realtime.backend = "cf"). Cùng giao diện joinParty.
// Phòng "to:<mã>": máy chủ chuyển tiếp ngay mọi tin của đội; danh sách đội có giờ vào phòng (joined) để chọn đội trưởng.
import { openPhong } from './phong-ws.js';

export async function joinParty(me, code, handlers, opts = {}) {
  const roster = new Map();
  let myAt = Date.now(), conn = null;
  const push = () => handlers.onRoster([{ id: me.id, name: me.name, realm: me.realm, joined: myAt }, ...roster.values()]);
  await new Promise(resolve => {
    let done = false;
    const ok = () => { if (!done) { done = true; resolve(); } };
    conn = openPhong({
      url: opts.url, room: `to:${code}`,
      onOpen: w => {
        myAt = w.at || Date.now(); roster.clear();
        for (const u of w.l || []) if (u.id !== me.id) roster.set(u.id, u);
        conn.send({ t: 'p', p: { name: me.name, realm: me.realm } });
        push(); ok();
      },
      onMsg: m => {
        if (m.t === 'r' && m.from && m.d) handlers.onMsg({ ...m.d, from: m.from });
        else if (m.t === 'j' && m.u?.id && m.u.id !== me.id) { roster.set(m.u.id, { ...roster.get(m.u.id), ...m.u }); push(); }
        else if (m.t === 'l' && roster.delete(m.id)) push();
      },
      onDown: () => handlers.onError?.(),
    });
    setTimeout(ok, 5000);   // mạng chậm: vẫn trả về, tin gửi được khi đã nối
  });
  return {
    send(body) { conn?.send({ t: 'r', d: body }); },
    leave() { conn?.close(); conn = null; return Promise.resolve(); },
  };
}
