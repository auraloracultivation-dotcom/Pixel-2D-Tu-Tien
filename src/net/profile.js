// Lưu nhân vật lên máy chủ qua hai hàm p2d_tai / p2d_luu2 (supabase/migrations). Chỉ dùng khi
// data/config.json bật "server_save"; mất mạng thì game vẫn chơi với bản lưu trong máy.
// Máy chủ giữ thật: Linh Thạch và nguyên liệu tăng theo hạn mức, Tiên Ngọc, chợ, hòm thư (migration 20261027140000).
// Lệnh nào sửa bản lưu ở máy chủ (rao bán, mua, nhận thư, Tiên Ngọc) chạy qua run(): đợi lần lưu đang gửi xong, đẩy
// bản mới nhất, gọi lệnh, nhận phien_ban mới; trong lúc đó không gửi bản lưu nào (khỏi bị coi là bản cũ).
// Chống gian lận (migration 20261028140000): bản gửi kèm ss (mã phiên) và clk (đồng hồ máy) để máy chủ bắt tăng tốc;
// máy chủ trả "sua" khi số gửi lên lố quá xa, onFix(bản đã gửi, sua) để game nhận lại số đúng.
// Bản gửi được làm sạch trước (cleanSave): số hỏng (NaN, âm, quá trần) làm cả lần lưu bị từ chối mãi.
// Lưu phần thay đổi (migration 20261105090000_p2d_luu_vi, src/net/save-diff.js): lần đầu, mỗi FULL_MS, sau lỗi thì gửi cả bản
// (p2d_luu2); còn lại chỉ gửi khoá đổi qua p2d_luu_vi. Không khoá nào đổi (chỉ mốc giờ, đồng hồ) thì không gọi máy chủ,
// trừ khi đã KEEP_MS chưa gọi (gửi mốc giờ cho máy chủ biết lần chơi cuối). Nhịp sống, một máy một tài khoản chạy riêng
// (src/net/heartbeat.js), không dựa vào lần lưu.
import { supabase } from './client.js';
import { sendError } from './errlog.js';
import { createSaveDiff } from './save-diff.js';

const WAIT_MS = 4000; // gom nhiều lần lưu liên tiếp thành một lần gửi (chủ dự án giữ 4 giây)
const FULL_MS = 5 * 60000;   // gửi cả bản định kỳ cho chắc
const KEEP_MS = 60000;       // không đổi gì thì vẫn gửi mốc giờ mỗi phút
const SS = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);   // mã phiên lần mở game này
const fin = v => typeof v === 'number' && Number.isFinite(v);

// Sửa bản gửi cho vừa khuôn p2d_luu kiểm; trả về các khoá đã sửa
export function cleanSave(d) {
  const fixed = [];
  const num = (k, lo, hi, int) => {
    let v = fin(d[k]) ? d[k] : lo;
    if (int) v = Math.floor(v);
    v = Math.min(hi, Math.max(lo, v));
    if (v !== d[k]) { fixed.push(k); d[k] = v; }
  };
  num('realm', 0, 8, true); num('layer', 1, 9, true); num('qi', 0, 1e15);
  if (!fin(d.step)) { d.step = 0; fixed.push('step'); }
  if (d.lingshi != null) num('lingshi', 0, 2e9);
  if (d.mats != null && (typeof d.mats !== 'object' || Array.isArray(d.mats))) { d.mats = {}; fixed.push('mats'); }
  for (const [k, v] of Object.entries(d.mats || {})) {
    if (!fin(v)) { delete d.mats[k]; fixed.push('mats.' + k); }
    else if (v < 0 || v > 1e7) { d.mats[k] = Math.min(1e7, Math.max(0, v)); fixed.push('mats.' + k); }
  }
  return fixed;
}

// Hình dạng bản gửi (để đọc báo lỗi, không gửi cả bản lưu)
function shape(d) {
  const t = v => (v === null ? 'null' : Array.isArray(v) ? 'arr' : typeof v);
  const bag = Array.isArray(d.bag) ? d.bag : [];
  return { realm: d.realm, layer: d.layer, qi: t(d.qi), step: t(d.step), lingshi: t(d.lingshi), mats: t(d.mats),
    bag: bag.length, badItems: bag.filter(it => !it || typeof it.uid !== 'number' || !['pham', 'linh', 'huyen', 'dia', 'thien'].includes(it.rarity)).length,
    size: JSON.stringify(d).length };
}

export function createCloudSave({ onConflict, onError, onFix, retry = {} }) {
  let version = 0, timer = null, pending = null, stopped = false, sending = null, busy = 0;
  let fn = 'p2d_luu2', fails = 0, told = false, fixedTold = false, lastFixed = [];
  let viOff = false, lastFull = -1e9, lastCall = -1e9;   // viOff: máy chủ chưa có p2d_luu_vi
  const diff = createSaveDiff();
  const api = { name: '' };

  async function load() {
    const { data, error } = await supabase.rpc('p2d_tai');
    if (error) throw error;
    version = data?.phien_ban || 0;
    api.name = data?.ten || '';
    return data?.data || null;
  }

  const call = body => supabase.rpc(fn, { p_data: body, p_phien_ban: version });
  const callVi = p => supabase.rpc('p2d_luu_vi', { p_vi: p.vi, p_xoa: p.xoa, p_phien_ban: version });
  const missing = (e, name) => e.code === 'PGRST202' || new RegExp(name).test(e.message || '');

  async function send() {
    const body = pending; pending = null;
    const now = performance.now();
    body.ss = SS; body.clk = Math.round(now);   // lấy lúc gửi, khỏi lệch khi phải chờ thử lại
    const p = diff.plan(body);
    let vi = !p.full && !viOff && fn === 'p2d_luu2' && now - lastFull < FULL_MS;
    if (vi && !p.changed && now - lastCall < KEEP_MS) return true;   // không khoá nào đổi: khỏi gọi máy chủ
    let res = vi ? await callVi(p) : await call(body);
    if (vi && res.error && (missing(res.error, 'p2d_luu_vi') || /chua_co_ban_luu/.test(res.error.message || ''))) {   // máy chủ chưa có hàm mới / chưa có bản lưu
      if (missing(res.error, 'p2d_luu_vi')) viOff = true;
      vi = false; res = await call(body);
    }
    if (res.error && fn === 'p2d_luu2' && missing(res.error, 'p2d_luu2')) { fn = 'p2d_luu'; res = await call(body); }   // máy chủ chưa có hàm mới
    const { data, error } = res;
    if (!error) {
      fails = 0; lastCall = now;
      if (!vi) lastFull = now;
      if (fn === 'p2d_luu2') { version = data.pb; diff.ack(p, data.sua); if (data.sua) onFix?.(body, data.sua); } else version = data;
      return true;
    }
    diff.reset();   // không chắc máy chủ đang giữ gì: lần sau gửi cả bản
    if (error.message?.includes('phien_ban_cu')) { stopped = true; onConflict?.(); return false; }
    pending = pending || body; // giữ bản lưu, thử lại sau
    fails++;
    const bad = ['22023', '22P02', '42501'].includes(error.code);   // máy chủ chê số liệu: báo về một lần để sửa tận gốc
    if (bad && !told) { told = true; sendError(`luu: ${error.message}`, JSON.stringify({ fixed: lastFixed, shape: shape(body) }).slice(0, 1500), fn).catch(() => {}); }
    onError?.(error, bad);
    return false;
  }

  async function flush() {
    timer = null;
    if (stopped || sending || busy || !pending) return;
    sending = send();
    await sending; sending = null;
    if (pending && !busy) schedule();
  }

  // Lỗi liên tiếp thì chờ lâu dần (đỡ gửi mỗi 4 giây mãi khi máy chủ chê)
  function delay() { return fails ? Math.min(retry.max || 60000, (retry.ms || WAIT_MS) * 2 ** (fails - 1)) : WAIT_MS; }
  function schedule() { if (!timer && !stopped) timer = setTimeout(flush, delay()); }

  // Lưu bản sao để thay đổi sau đó không lẫn vào lần gửi đang chờ
  function save(s) {
    if (stopped) return;
    pending = JSON.parse(JSON.stringify(s));
    const fixed = cleanSave(pending);
    if (fixed.length) {   // số hỏng thì sửa luôn bản trong máy (NaN làm game và cả lần lưu hỏng theo)
      lastFixed = fixed;
      for (const k of fixed) {
        const [top, sub] = k.split('.');
        if (!sub) { if (top !== 'mats') s[top] = pending[top]; }
        else if (s.mats) { if (sub in pending.mats) s.mats[sub] = pending.mats[sub]; else delete s.mats[sub]; }
      }
      if (!fixedTold) { fixedTold = true; sendError(`luu_sach: ${fixed.slice(0, 8).join(',')}`, JSON.stringify(shape(pending)), fn).catch(() => {}); }
    }
    schedule();
  }

  // Chạy một lệnh sửa bản lưu ở máy chủ. fn trả về { phien_ban, ... }; mirror(kq) sửa bản lưu trong máy cho giống máy chủ
  // (rồi gọi game.persist như thường). Bản lưu chờ gửi được đẩy lên trước để máy chủ kiểm tra theo bản mới nhất.
  async function run(job, mirror) {
    if (stopped) throw new Error('phien_ban_cu');
    busy++;
    try {
      clearTimeout(timer); timer = null;
      if (sending) await sending;
      if (pending) { sending = send(); const ok = await sending; sending = null; if (!ok && stopped) throw new Error('phien_ban_cu'); }
      const r = await job();
      if (r && Number.isInteger(r.phien_ban)) version = r.phien_ban;
      mirror?.(r);
      return r;
    } finally {
      busy--;
      if (pending && !busy) schedule();
    }
  }

  // Đóng dấu bản lưu trong máy: mã phiên và phiên bản máy chủ đang dựa vào (báo cáo #13, issue #335).
  // Lúc vào game, pickSave (src/game/cloud-guard.js) dùng dấu này biết máy khác đã ghi lên sau bản trong máy hay chưa.
  // Đã bị máy khác chặn (stopped) thì thôi đóng dấu: bản trong máy giữ dấu cũ, lần sau vào game nhường bản máy chủ.
  function mark(s) { if (!stopped) { s.ss = SS; s.pb = version; } }

  return Object.assign(api, { load, save, flush, run, mark, get version() { return version; } });
}

// Đặt tên hiển thị (khác tên đăng nhập): 2–16 ký tự, mỗi ngày đổi một lần
// Lượt đổi tên còn lại: { dau, free, ve } (supabase/migrations/20261030060000_p2d_doi_ten_ve.sql)
export async function renameLeft() {
  const { data, error } = await supabase.rpc('p2d_ten_luot');
  if (error) throw error;
  return data;
}

export async function setDisplayName(ten) {
  const { data, error } = await supabase.rpc('p2d_dat_ten', { p_ten: ten });
  if (error) throw error;
  return data;
}

// Tiên Ngọc: máy chủ giữ số dư
export const topupCalls = {
  starter: () => rpc('p2d_qua_tn'),
  buy: ma => rpc('p2d_doi_tn', { p_ma: ma }),
  card: () => rpc('p2d_nhan_the'),
};

async function rpc(fn, args) {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw error;
  return data;
}
