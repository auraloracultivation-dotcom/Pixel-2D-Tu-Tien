// Durable Object "Mang": lõi boss thế giới Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026: làm sẵn một con vô hạn máu,
// thanh máu luôn 99%, bảng xếp hạng sát thương bên phải màn hình; ổn rồi mới mở giới hạn). Một Mang duy nhất cho cả máy chủ.
// Các phòng bản đồ (src/phong.js) cứ 2 giây gửi tổng sát thương đã kẹp và số giây chém thật của người trong phòng; Mang cộng dồn,
// trả bảng xếp hạng.
// Thưởng (chủ dự án 06/11/2026 09:34 "chém con đó thì cứ tính linh thạch x10 so với farm thường"): giây chém × Linh Thạch farm/giây
// của tinh cầu đó × 10 (src/mang-cfg.js), dồn theo người; 5 phút một lần gửi một lô ký HMAC về Supabase (p2d_mang_thuong) → Hòm thư.
// Khoá ký tự sinh lần đầu, giữ trong kho của Mang, tự đăng ký với Supabase (p2d_mang_dang_ky chỉ nhận khi chưa có khoá).
import { DurableObject } from 'cloudflare:workers';
import { FARM_LT_S, LT_MULT, LT_BONUS, LICH } from './mang-cfg.js';

// Lưu (chủ dự án 06/11/2026 10:15: bảng tụt từ 5 triệu về 3 triệu — lúc triển khai bản mới Mang khởi động lại, mất phần chưa lưu
// vì trước đây 5 phút mới lưu). Cloudflare tính tiền theo số DÒNG ghi, nên cả bảng (sát thương + Linh Thạch chờ gửi + giờ gửi kế)
// gom thành MỘT dòng JSON, có thay đổi thì 2 giây ghi một lần (khớp nhịp phòng gửi về): ~1,3 triệu dòng/tháng dù 10 hay
// 10.000 người, nằm trong 50 triệu miễn phí của gói Workers Paid. Gửi Linh Thạch vẫn 5 phút một lần (PAY_MS).
// Trần sát thương theo lực chiến (chủ dự án 06/11/2026 15:48 hỏi vì sao admin 2,2 tỷ sau vài phút): mỗi tài khoản có một thùng chung
// mọi tuyến, đầy dần DPS_K × lực chiến mỗi giây (tối đa BUD_S giây), sát thương báo về chỉ được tính trong phần thùng còn.
// Trước đây phòng kẹp theo từng tin và tính lại từ đầu mỗi lượt gom 2 giây, gửi tin dồn dập (hoặc nhiều tuyến) thì vượt trần.
const DPS_K = 5, BUD_S = 10;
const TOP = 10, ACTIVE_MS = 15000, SAVE_MS = 2000, PAY_MS = 300000, PAY_MAX = 60000;   // trần một lô 5 phút / người (chủ dự án 06/11/2026 11:39: Linh Thạch boss ×3)
const sign = async (khoa, msg) => {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(khoa), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(msg)));
};
// Đang trong khung giờ lịch (LICH) không; ngày theo múi giờ lịch (YYYY-MM-DD)
const vnDate = now => new Date(now + LICH.tz * 3600000);
export const inLich = (now = Date.now()) => { const d = vnDate(now), m = d.getUTCHours() * 60 + d.getUTCMinutes(); return m >= LICH.from && m < LICH.to; };
const lichDay = now => vnDate(now).toISOString().slice(0, 10);
const lichEnd = now => { const d = vnDate(now); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + LICH.to * 60000 - LICH.tz * 3600000; };
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');

export class Mang extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.tot = new Map();      // uid → { name, v }
    this.seen = new Map();     // uid → lần đánh gần nhất (đếm người đang vây công)
    this.pend = new Map();     // uid → Linh Thạch chờ gửi
    this.bud = new Map();      // uid → { b: sát thương còn được tính, at } (trần theo lực chiến)
    this.sum = 0; this.payAt = 0; this.changed = false;
    this.moTo = 0;             // boss mở tới lúc này (ms); hết giờ thì không nhận sát thương, không trả Linh Thạch (lệnh 'mo' / 'tat')
    this.pk = new Map();       // uid → { off, immune } khiên PvP (src/pvp.js)
    ctx.blockConcurrencyWhile(async () => {
      const q = ctx.storage.sql;
      q.exec('CREATE TABLE IF NOT EXISTS anh (k TEXT PRIMARY KEY, j TEXT)');
      const row = [...q.exec("SELECT j FROM anh WHERE k = 'bang'")][0];
      if (row) {
        const b = JSON.parse(row.j);
        for (const [uid, name, v] of b.d || []) { this.tot.set(uid, { name, v }); this.sum += v; }
        for (const [uid, lt] of b.p || []) this.pend.set(uid, lt);
        this.payAt = b.at || 0; this.moTo = b.mo || 0;
        for (const [uid, off, immune] of b.k || []) this.pk.set(uid, { off: !!off, immune: immune || 0 });
      } else {   // bản cũ lưu mỗi người một dòng (bảng dmg, pay): đọc một lần rồi chuyển sang một dòng
        q.exec('CREATE TABLE IF NOT EXISTS dmg (uid TEXT PRIMARY KEY, name TEXT, v REAL)');
        q.exec('CREATE TABLE IF NOT EXISTS pay (uid TEXT PRIMARY KEY, lt REAL)');
        for (const r of q.exec('SELECT uid, name, v FROM dmg')) { this.tot.set(r.uid, { name: r.name, v: r.v }); this.sum += r.v; }
        for (const r of q.exec('SELECT uid, lt FROM pay')) this.pend.set(r.uid, r.lt);
        this.payAt = (await ctx.storage.get('pay_at')) || 0;
      }
    });
  }

  // list: [{ id, name, n, s, map }] (n đã kẹp, s giây chém thật ở phòng). Trả bảng xếp hạng, hạng và Linh Thạch chờ nhận của người trong list.
  async add(list) {
    const now = Date.now(), lt = {}, open = now < this.moTo || inLich(now);   // lịch hằng ngày 20:30–21:00 giờ VN (chủ dự án 06/11/2026 20:59)   // chủ dự án 06/11/2026 15:53: tắt boss thì máy chủ phải tự chặn (máy mở sẵn từ trước vẫn còn đầu boss)
    const top = Math.max(1, ...(Array.isArray(list) ? list : []).map(x => (x?.s > 0 && x.n > 0 ? Number(x.n) || 0 : 0)));   // sát thương cao nhất tuyến trong lượt
    for (const it of Array.isArray(list) ? list.slice(0, 64) : []) {
      if (typeof it?.id !== 'string' || !(it.n >= 0)) continue;
      const pw = Math.max(1000, Number(it.pw) || 0), bu = this.bud.get(it.id) || { b: pw * DPS_K * 2, at: now };
      bu.b = Math.min(pw * DPS_K * BUD_S, bu.b + pw * DPS_K * Math.max(0, now - bu.at) / 1000); bu.at = now;
      const n = open ? Math.min(Number(it.n) || 0, 1e15, bu.b) : 0; bu.b -= n; this.bud.set(it.id, bu);
      const cur = this.tot.get(it.id) || { name: it.name || 'Đạo hữu', v: 0 };
      if (it.name) cur.name = String(it.name).slice(0, 24);
      if (n > 0) { cur.v += n; this.sum += n; this.seen.set(it.id, now); this.changed = true; }
      this.tot.set(it.id, cur);
      const s = open ? Math.min(Number(it.s) || 0, 10) : 0, rate = FARM_LT_S[it.map] || 0;
      const mul = LT_MULT * (1 + LT_BONUS * Math.sqrt(Math.min(1, n / top)));   // phần cố định + tối đa 50% theo sát thương
      if (s > 0 && rate > 0) { this.pend.set(it.id, Math.min(PAY_MAX, (this.pend.get(it.id) || 0) + s * rate * mul)); this.changed = true; }
      lt[it.id] = Math.floor(this.pend.get(it.id) || 0);
    }
    for (const [id, at] of this.seen) if (now - at > ACTIVE_MS) this.seen.delete(id);
    if (this.changed) { const at = await this.ctx.storage.getAlarm(); if (!at || at > now + SAVE_MS) await this.ctx.storage.setAlarm(now + SAVE_MS); }
    const sorted = [...this.tot.entries()].filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v);
    const ranks = {};
    const want = new Set((list || []).map(x => x?.id));
    sorted.forEach(([id, x], i) => { if (want.has(id)) ranks[id] = [i + 1, Math.round(x.v)]; });
    return { top: sorted.slice(0, TOP).map(([, x]) => [x.name, Math.round(x.v)]), n: this.seen.size, total: Math.round(this.sum), ranks, lt, mo: open ? Math.max(this.moTo, inLich(now) ? lichEnd(now) : 0) : 0 };
  }

  // Một dòng cho cả bảng (xem SAVE_MS)
  save() {
    this.changed = false;
    const d = [...this.tot].filter(([, x]) => x.v > 0).map(([uid, x]) => [uid, x.name, x.v]);
    this.ctx.storage.sql.exec("INSERT INTO anh (k, j) VALUES ('bang', ?) ON CONFLICT(k) DO UPDATE SET j = excluded.j", JSON.stringify({ d, p: [...this.pend], at: this.payAt, mo: this.moTo, k: [...this.pk].filter(([, x]) => x.off || x.immune > Date.now()).map(([uid, x]) => [uid, x.off ? 1 : 0, x.immune]) }));
  }

  async alarm() {
    const now = Date.now();
    if (this.tkCho === undefined) this.tkCho = (await this.ctx.storage.get('tk_cho')) || null;
    if (this.tkCho && !inLich(now)) await this.tongKet();   // tổng kết lần trước lỗi mạng: thử lại
    if (!this.payAt) { this.payAt = now + PAY_MS; this.changed = true; }
    else if (now >= this.payAt && this.pend.size) { await this.pay(); this.payAt = now + PAY_MS; this.changed = true; }
    if (this.changed) this.save();
    // còn Linh Thạch chờ gửi: hẹn đúng giờ gửi; có người đang đánh thì add() tự hẹn 2 giây
    if (this.pend.size) await this.ctx.storage.setAlarm(Math.max(now + SAVE_MS, Math.min(this.payAt, now + PAY_MS)));
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
      else this.pend.delete(u);
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

  // Lệnh quản trị có ký (Claude tính chữ ký từ khoá trong Supabase, khoá không rời máy chủ): 'bang' trả cả bảng [uid, tên, sát thương]
  // để phát thưởng tổng kết; 'xong' gửi nốt Linh Thạch chờ, cất bảng vào lịch sử (dòng 'mua:<ts>'), xoá bảng cho lần boss sau.
  // 'mo' (arg = số phút): mở boss từ giờ tới giờ + arg phút; 'tat': tắt ngay. Chữ ký trên `${ts}.${action}` (có arg thì `.${arg}`).
  async lenh(action, ts, ky, arg = '') {
    ts = Number(ts);
    if (!['bang', 'xong', 'mo', 'tat', 'trang', 'tk'].includes(action) || !(Math.abs(Date.now() - ts) < 120000) || typeof ky !== 'string') return null;
    const khoa = await this.ctx.storage.get('khoa');
    if (!khoa || (await sign(khoa, `${ts}.${action}${arg ? '.' + arg : ''}`)) !== ky.toLowerCase()) return null;
    if (action === 'mo') { const m = Math.min(24 * 60, Math.max(1, Number(arg) || 0)); this.moTo = Date.now() + m * 60000; this.save(); return { ok: true, mo: this.moTo }; }
    if (action === 'tat') { this.moTo = 0; this.save(); return { ok: true, mo: 0 }; }
    if (action === 'trang') return { mo: this.moTo, open: Date.now() < this.moTo || inLich(), lich: inLich(), tk: this.tkCho || null };
    if (action === 'tk') return this.tongKet();   // tổng kết tay (thử, hoặc cron lỡ)
    const d = [...this.tot].filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v).map(([uid, x]) => [uid, x.name, Math.round(x.v)]);
    if (action === 'bang') return { d, total: Math.round(this.sum) };
    if (this.pend.size) await this.pay();
    this.ctx.storage.sql.exec('INSERT INTO anh (k, j) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET j = excluded.j', `mua:${ts}`, JSON.stringify({ d, total: Math.round(this.sum) }));
    this.tot.clear(); this.seen.clear(); this.sum = 0; this.save();
    return { ok: true, n: d.length, left: this.pend.size };
  }

  // Tổng kết sau mỗi lần boss (cron hằng ngày lúc hết giờ, index.js scheduled): gửi bảng sát thương ký HMAC tới Supabase
  // p2d_mang_tong_ket (phát quà top 10 / người tham gia, mỗi ngày một lần), gửi nốt Linh Thạch chờ, cất bảng vào lịch sử, xoá bảng.
  // Lỗi mạng thì 5 phút sau thử lại (tkCho); Supabase báo đã phát ngày đó thì coi như xong.
  async tongKet() {
    const now = Date.now(), ngay = this.tkCho || lichDay(now - 60000);
    const d = [...this.tot].filter(([, x]) => x.v > 0).sort((a, b) => b[1].v - a[1].v).map(([uid, x]) => [uid, Math.round(x.v)]).slice(0, 5000);
    if (!d.length) { this.tkCho = null; return { ok: true, n: 0 }; }
    const khoa = this.env.SUPABASE_URL && await this.khoa();
    if (!khoa) return { ok: false };
    const ts = Date.now(), ds = JSON.stringify({ ngay, d });
    const r = await this.rpc('p2d_mang_tong_ket', { p_ts: ts, p_ds: ds, p_ky: await sign(khoa, `${ts}.${ds}`) });
    const body = await r.text().catch(() => '');
    if (!r.ok && !body.includes('da_phat')) {
      console.log('mang_tong_ket', r.status, body.slice(0, 200));
      this.tkCho = ngay; await this.ctx.storage.put('tk_cho', ngay); await this.ctx.storage.setAlarm(now + 300000);
      return { ok: false, status: r.status };
    }
    if (this.pend.size) await this.pay();
    this.ctx.storage.sql.exec('INSERT INTO anh (k, j) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET j = excluded.j', `mua:${ngay}`, JSON.stringify({ d, total: Math.round(this.sum) }));
    this.tot.clear(); this.seen.clear(); this.bud.clear(); this.sum = 0; this.tkCho = null; await this.ctx.storage.delete('tk_cho'); this.save();
    return { ok: true, n: d.length, phat: Number(body) || 0 };
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

  // Khiên PvP theo tài khoản: phòng hỏi lúc vào, báo lúc tắt khiên / chết
  pkGet(uid) { return this.pk.get(uid) || { off: false, immune: 0 }; }
  async pkSet(uid, off, immune) {
    if (typeof uid !== 'string') return;
    this.pk.set(uid, { off: !!off, immune: immune || 0 });
    this.changed = true;
    const now = Date.now(), at = await this.ctx.storage.getAlarm();
    if (!at || at > now + SAVE_MS) await this.ctx.storage.setAlarm(now + SAVE_MS);
  }

  rpc(fn, body) {
    return fetch(`${this.env.SUPABASE_URL}/rest/v1/rpc/${fn}`, { method: 'POST', headers: { apikey: this.env.SUPABASE_KEY, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  }
}
