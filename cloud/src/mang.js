// Durable Object "Mang": lõi boss thế giới Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026: làm sẵn một con vô hạn máu,
// thanh máu luôn 99%, bảng xếp hạng sát thương bên phải màn hình; ổn rồi mới mở giới hạn). Một Mang duy nhất cho cả máy chủ.
// Các phòng bản đồ (src/phong.js) cứ 2 giây gửi tổng sát thương đã kẹp và số giây chém thật của người trong phòng; Mang cộng dồn,
// trả bảng xếp hạng. Lưu SQLite 5 phút một lần (chỉ dòng đổi) cho khỏi tốn lượt ghi.
// Thưởng (chủ dự án 06/11/2026 09:34 "chém con đó thì cứ tính linh thạch x10 so với farm thường"): giây chém × Linh Thạch farm/giây
// của tinh cầu đó × 10 (src/mang-cfg.js), dồn theo người; 5 phút một lần gửi một lô ký HMAC về Supabase (p2d_mang_thuong) → Hòm thư.
// Khoá ký tự sinh lần đầu, giữ trong kho của Mang, tự đăng ký với Supabase (p2d_mang_dang_ky chỉ nhận khi chưa có khoá).
import { DurableObject } from 'cloudflare:workers';
import { FARM_LT_S, LT_MULT, LT_BONUS } from './mang-cfg.js';

// Lưu 15 giây một lần (chủ dự án 06/11/2026 10:15: bảng tụt từ 5 triệu về 3 triệu — lúc triển khai bản mới, Mang khởi động lại
// và mất phần chưa lưu; trước đây 5 phút mới lưu). Gửi Linh Thạch vẫn 5 phút một lần (PAY_MS).
const TOP = 10, ACTIVE_MS = 15000, SAVE_MS = 15000, PAY_MS = 300000, PAY_MAX = 20000;
const sign = async (khoa, msg) => {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(khoa), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
};
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export class Mang extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.tot = new Map();      // uid → { name, v }
    this.dirty = new Set();
    this.seen = new Map();     // uid → lần đánh gần nhất (đếm người đang vây công)
    this.pend = new Map();     // uid → Linh Thạch chờ gửi
    this.sum = 0;
    ctx.blockConcurrencyWhile(async () => {
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS dmg (uid TEXT PRIMARY KEY, name TEXT, v REAL)');
      ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS pay (uid TEXT PRIMARY KEY, lt REAL)');
      for (const r of ctx.storage.sql.exec('SELECT uid, name, v FROM dmg')) { this.tot.set(r.uid, { name: r.name, v: r.v }); this.sum += r.v; }
      for (const r of ctx.storage.sql.exec('SELECT uid, lt FROM pay')) this.pend.set(r.uid, r.lt);
    });
  }

  // list: [{ id, name, n, s, map }] (n đã kẹp, s giây chém thật ở phòng). Trả bảng xếp hạng, hạng và Linh Thạch chờ nhận của người trong list.
  async add(list) {
    const now = Date.now(), lt = {};
    const top = Math.max(1, ...(Array.isArray(list) ? list : []).map(x => (x?.s > 0 && x.n > 0 ? Number(x.n) || 0 : 0)));   // sát thương cao nhất tuyến trong lượt
    for (const it of Array.isArray(list) ? list.slice(0, 64) : []) {
      if (typeof it?.id !== 'string' || !(it.n >= 0)) continue;
      const n = Math.min(Number(it.n) || 0, 1e15);
      const cur = this.tot.get(it.id) || { name: it.name || 'Đạo hữu', v: 0 };
      if (it.name) cur.name = String(it.name).slice(0, 24);
      if (n > 0) { cur.v += n; this.sum += n; this.seen.set(it.id, now); this.dirty.add(it.id); }
      this.tot.set(it.id, cur);
      const s = Math.min(Number(it.s) || 0, 10), rate = FARM_LT_S[it.map] || 0;
      const mul = LT_MULT * (1 + LT_BONUS * Math.sqrt(Math.min(1, n / top)));   // phần cố định + tối đa 50% theo sát thương
      if (s > 0 && rate > 0) { this.pend.set(it.id, Math.min(PAY_MAX, (this.pend.get(it.id) || 0) + s * rate * mul)); this.dirty.add(it.id); }
      lt[it.id] = Math.floor(this.pend.get(it.id) || 0);
    }
    for (const [id, at] of this.seen) if (now - at > ACTIVE_MS) this.seen.delete(id);
    if (this.dirty.size && !(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(now + SAVE_MS);
    const sorted = [...this.tot.entries()].filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v);
    const ranks = {};
    const want = new Set((list || []).map(x => x?.id));
    sorted.forEach(([id, x], i) => { if (want.has(id)) ranks[id] = [i + 1, Math.round(x.v)]; });
    return { top: sorted.slice(0, TOP).map(([, x]) => [x.name, Math.round(x.v)]), n: this.seen.size, total: Math.round(this.sum), ranks, lt };
  }

  async alarm() {
    const now = Date.now(), ids = [...this.dirty]; this.dirty.clear();
    for (const id of ids) {
      const x = this.tot.get(id);
      if (x) this.ctx.storage.sql.exec('INSERT INTO dmg (uid, name, v) VALUES (?, ?, ?) ON CONFLICT(uid) DO UPDATE SET name = excluded.name, v = excluded.v', id, x.name, x.v);
    }
    for (const id of ids) { const v = this.pend.get(id); if (v != null) this.ctx.storage.sql.exec('INSERT INTO pay (uid, lt) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET lt = excluded.lt', id, v); }
    const payAt = (await this.ctx.storage.get('pay_at')) || 0;
    if (!payAt) await this.ctx.storage.put('pay_at', now + PAY_MS);
    else if (now >= payAt) {
      await this.pay();
      for (const [id, v] of this.pend) this.ctx.storage.sql.exec('INSERT INTO pay (uid, lt) VALUES (?, ?) ON CONFLICT(uid) DO UPDATE SET lt = excluded.lt', id, v);
      await this.ctx.storage.put('pay_at', now + PAY_MS);
    }
    if (this.pend.size || this.dirty.size) await this.ctx.storage.setAlarm(now + SAVE_MS);   // còn Linh Thạch chờ gửi: hẹn tiếp
  }

  // Gửi lô Linh Thạch phần nguyên; trả lỗi thì giữ lại lần sau (đã kẹp PAY_MAX mỗi người)
  async pay() {
    const rows = [...this.pend].map(([u, v]) => ({ u, lt: Math.floor(v) })).filter(r => r.lt >= 1).slice(0, 2000);
    if (!rows.length || !this.env.SUPABASE_URL) return;
    const khoa = await this.khoa();
    if (!khoa) return;
    const ts = Date.now(), ds = JSON.stringify(rows);
    const ky = await sign(khoa, `${ts}.${ds}`);
    const r = await this.rpc('p2d_mang_thuong', { p_ts: ts, p_ds: ds, p_ky: ky });
    if (!r.ok) { console.log('mang_thuong', r.status, await r.text().catch(() => '')); return; }
    for (const { u, lt } of rows) {
      const left = (this.pend.get(u) || 0) - lt;
      if (left >= 1) this.pend.set(u, left);
      else { this.pend.delete(u); this.ctx.storage.sql.exec('DELETE FROM pay WHERE uid = ?', u); }
    }
  }

  // Khoá ký: sinh một lần, đăng ký với Supabase một lần (đăng ký trả false khi khoá đã có: của mình từ trước hoặc kẻ khác chiếm trước;
  // kẻ khác chiếm thì chữ ký sai, Claude so vân tay /mang/kt với p2d_mang_van_tay để phát hiện)
  async khoa() {
    let k = await this.ctx.storage.get('khoa');
    if (!k) {
      const b = crypto.getRandomValues(new Uint8Array(48));
      k = btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      await this.ctx.storage.put('khoa', k);
    }
    if (!(await this.ctx.storage.get('da_dk'))) {
      const r = await this.rpc('p2d_mang_dang_ky', { p_khoa: k });
      if (!r.ok) return null;
      await this.ctx.storage.put('da_dk', 1);
    }
    return k;
  }

  async vanTay() {   // gọi ngay sau khi triển khai: sinh và đăng ký khoá luôn, khỏi để trống chỗ cho kẻ khác chiếm
    const k = this.env.SUPABASE_URL ? await this.khoa() : await this.ctx.storage.get('khoa');
    return k ? hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(k))) : null;
  }

  // PvP Ngoại Vực (src/pvp.js): báo Supabase một lần hạ, ký bằng cùng khoá; true khi Supabase ghi nợ (cùng cặp trong 1 giờ thì không)
  async pvp(ke, nan) {
    if (!this.env.SUPABASE_URL || typeof ke !== 'string' || typeof nan !== 'string') return false;
    const khoa = await this.khoa();
    if (!khoa) return false;
    const ts = Date.now(), ds = JSON.stringify({ k: ke, v: nan });
    const r = await this.rpc('p2d_pvp_ghi', { p_ts: ts, p_ds: ds, p_ky: await sign(khoa, `${ts}.${ds}`) });
    if (!r.ok) { console.log('pvp_ghi', r.status, await r.text().catch(() => '')); return false; }
    return (await r.json().catch(() => false)) === true;
  }

  rpc(fn, body) {
    return fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: this.env.SUPABASE_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }
}
