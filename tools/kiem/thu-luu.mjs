// Bài thử bắt buộc trước khi áp migration (chủ dự án 20/11/2026 00:12, sau vụ 19/11 hàm lưu chê món phẩm mới 8 tiếng):
// đăng nhập tài khoản thử riêng (claude_kiem, bảng Người chơi bỏ qua tài khoản claude_*), lưu một bản có túi đồ đủ MỌI phẩm trong
// data/items.json → rarities: máy chủ phải NHẬN bản lưu (món chưa ký thì máy chủ gỡ đi là đúng luật chống hack, không tính trượt;
// trượt là khi cả bản lưu bị từ chối như 19/11). Chạy: NODE_USE_ENV_PROXY=1 node tools/kiem/thu-luu.mjs  (trượt thì thoát mã 1, KHÔNG áp).
// Chỉ dùng khoá publishable và RPC công khai như máy người chơi; mật khẩu tài khoản thử lấy từ biến môi trường P2D_KIEM_MK.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const URL = 'https://idlzqbpszxexcxhhamzm.supabase.co', KEY = 'sb_publishable_Sv6fxGfRtmDOiVHK5VieEg_GsaFriNL';
const USER = 'claude_kiem', PASS = process.env.P2D_KIEM_MK;
if (!PASS) { console.error('Thiếu P2D_KIEM_MK'); process.exit(2); }
const root = resolve(import.meta.dirname, '../..');
const items = JSON.parse(readFileSync(resolve(root, 'data/items.json'), 'utf8'));
const rar = items.rarities.map(r => r.id);
const H = t => ({ apikey: KEY, 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) });
const post = async (path, body, t) => { const r = await fetch(URL + path, { method: 'POST', headers: H(t), body: JSON.stringify(body) }); return { ok: r.ok, j: await r.json().catch(() => null) }; };

async function token() {
  let r = await post('/auth/v1/token?grant_type=password', { email: `${USER}@nguoichoi.invalid`, password: PASS });
  if (!r.ok) { await post('/functions/v1/dang-ky', { username: USER, password: PASS }); r = await post('/auth/v1/token?grant_type=password', { email: `${USER}@nguoichoi.invalid`, password: PASS }); }
  if (!r.ok) throw new Error('đăng nhập hỏng: ' + JSON.stringify(r.j));
  return r.j.access_token;
}

const t = await token();
const tai = await post('/rest/v1/rpc/p2d_tai', {}, t);
if (!tai.ok) throw new Error('p2d_tai hỏng: ' + JSON.stringify(tai.j));
const d = tai.j?.data || { realm: 0, layer: 1, qi: 0, step: 0, lingshi: 0, mats: {}, equip: {} };
const base = Object.keys(items.bases)[0];
d.bag = rar.map((r, i) => ({ uid: 900000 + i, base, rarity: r, lvl: 1, lines: [], sockets: [] }));
d.nextUid = 900000 + rar.length;
const luu = await post('/rest/v1/rpc/p2d_luu2', { p_data: d, p_phien_ban: tai.j?.phien_ban || 0 }, t);
const fails = [];
if (!luu.ok) fails.push('lưu bị từ chối: ' + JSON.stringify(luu.j));
const lai = await post('/rest/v1/rpc/p2d_tai', {}, t);
if (!lai.ok) fails.push('tải lại hỏng: ' + JSON.stringify(lai.j));
if (fails.length) { console.error('❌ Thử lưu TRƯỢT:\n- ' + fails.join('\n- ')); process.exit(1); }
console.log(`✅ Thử lưu đạt: máy chủ nhận bản lưu có đủ ${rar.length} phẩm (${rar.join(', ')}), tải lại được`);
