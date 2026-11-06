// Durable Object "Mang": lõi boss thế giới Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026: làm sẵn một con vô hạn máu,
// thanh máu luôn 99%, bảng xếp hạng sát thương bên phải màn hình; ổn rồi mới mở giới hạn). Một Mang duy nhất cho cả máy chủ.
// Các phòng bản đồ (src/phong.js) cứ 2 giây gửi tổng sát thương đã kẹp của người trong phòng; Mang cộng dồn, trả bảng xếp hạng.
// Lưu SQLite 5 phút một lần (chỉ dòng đổi) cho khỏi tốn lượt ghi; mất tối đa 5 phút khi phòng bị dọn — chấp nhận cho bản thử.
import { DurableObject } from 'cloudflare:workers';

const TOP = 10, ACTIVE_MS = 15000, SAVE_MS = 300000;

export class Mang extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.tot = new Map();      // uid → { name, v }
    this.dirty = new Set();
    this.seen = new Map();     // uid → lần đánh gần nhất (đếm người đang vây công)
    this.sum = 0;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS dmg (uid TEXT PRIMARY KEY, name TEXT, v REAL)');
      for (const r of ctx.storage.sql.exec('SELECT uid, name, v FROM dmg')) { this.tot.set(r.uid, { name: r.name, v: r.v }); this.sum += r.v; }
    });
  }

  // list: [{ id, name, n }] (n đã kẹp ở phòng). Trả bảng xếp hạng và hạng của những người trong list.
  async add(list) {
    const now = Date.now();
    for (const it of Array.isArray(list) ? list.slice(0, 64) : []) {
      if (typeof it?.id !== 'string' || !(it.n >= 0)) continue;
      const n = Math.min(Number(it.n) || 0, 1e15);
      const cur = this.tot.get(it.id) || { name: it.name || 'Đạo hữu', v: 0 };
      if (it.name) cur.name = String(it.name).slice(0, 24);
      if (n > 0) { cur.v += n; this.sum += n; this.seen.set(it.id, now); this.dirty.add(it.id); }
      this.tot.set(it.id, cur);
    }
    for (const [id, at] of this.seen) if (now - at > ACTIVE_MS) this.seen.delete(id);
    if (this.dirty.size && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + SAVE_MS);
    const sorted = [...this.tot.entries()].filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v);
    const ranks = {};
    const want = new Set((list || []).map(x => x?.id));
    sorted.forEach(([id, x], i) => { if (want.has(id)) ranks[id] = [i + 1, Math.round(x.v)]; });
    return { top: sorted.slice(0, TOP).map(([, x]) => [x.name, Math.round(x.v)]), n: this.seen.size, total: Math.round(this.sum), ranks };
  }

  async alarm() {
    if (!this.dirty.size) return;
    const ids = [...this.dirty]; this.dirty.clear();
    for (const id of ids) {
      const x = this.tot.get(id);
      if (x) this.ctx.storage.sql.exec('INSERT INTO dmg (uid, name, v) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET name = excluded.name, v = excluded.v', id, x.name, x.v);
    }
  }
}
