// Lấy lại tài khoản bằng mã khôi phục (người chơi tự tạo trong game khi còn nhớ mật khẩu; supabase/migrations/20261028090000_p2d_ma_khoi_phuc.sql).
// POST { username, code, password }: đúng mã thì đặt mật khẩu mới; mã dùng một lần (muốn có mã mới thì vào game tạo lại).
// Thử sai bị giới hạn theo địa chỉ mạng (5 lần mỗi giờ, 20 lần mỗi ngày, chỉ lưu mã băm). Chỉ trang game được gọi từ trình duyệt.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const DOMAIN = 'nguoichoi.invalid'; // đồng bộ src/net/auth.js
const ORIGINS = ['https://auraloracultivation-dotcom.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];

const corsFor = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return {
    ...(ORIGINS.includes(o) ? { 'Access-Control-Allow-Origin': o } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

async function hashIp(ip: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('p2d-kp:' + ip));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405);

  let body: { username?: unknown; code?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'BAD_JSON' }, 400); }
  const username = String(body.username ?? '').trim().toLowerCase();
  const code = String(body.code ?? '').trim();
  const password = String(body.password ?? '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: 'USERNAME_INVALID' }, 400);
  if (code.replace(/[^A-Za-z0-9]/g, '').length !== 16) return json({ error: 'CODE_INVALID' }, 400);
  if (password.length < 8 || password.length > 72) return json({ error: 'PASSWORD_INVALID' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'khong-ro';
  const { data: uid, error } = await admin.rpc('p2d_dung_ma_khoi_phuc', { p_email: `${username}@${DOMAIN}`, p_ma: code, p_ip: await hashIp(ip) });
  if (error) {
    if (/thu_nhieu/.test(error.message)) return json({ error: 'TOO_MANY' }, 429);
    console.error('check', error.message);
    return json({ error: 'RECOVER_FAILED' }, 500);
  }
  if (!uid) return json({ error: 'CODE_WRONG' }, 400);
  const { error: e2 } = await admin.auth.admin.updateUserById(uid as string, { password });
  if (e2) { console.error('update', e2.message); return json({ error: 'RECOVER_FAILED' }, 500); }
  return json({ ok: true });
});
