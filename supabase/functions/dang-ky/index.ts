// Đăng ký bằng tên tài khoản (không cần email thật).
// Supabase bắt buộc có email, nên máy chủ tự sinh email ẩn: <tài khoản>@nguoichoi.invalid
// Tạo qua quyền quản trị với email_confirm = true → không gửi thư, không cần xác nhận.
// Đăng nhập thì máy khách tự ghép lại email ẩn và gọi signInWithPassword như thường.
// Chống tạo tài khoản hàng loạt: mỗi địa chỉ mạng tối đa 3 tài khoản / giờ và 10 / ngày (bảng p2d_dang_ky_ip, chỉ lưu mã băm);
// chỉ trang game được gọi từ trình duyệt (CORS). Mật khẩu mới 8–72 ký tự.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const DOMAIN = 'nguoichoi.invalid'; // đồng bộ src/net/auth.js
const ORIGINS = ['https://auraloracultivation-dotcom.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];
const PER_HOUR = 3, PER_DAY = 10;

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
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('p2d:' + ip));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405);

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'BAD_JSON' }, 400); }

  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: 'USERNAME_INVALID' }, 400);
  if (password.length < 8 || password.length > 72) return json({ error: 'PASSWORD_INVALID' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Giới hạn theo địa chỉ mạng
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'khong-ro';
  const key = await hashIp(ip);
  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const count = async (ms: number) => {
    const { count: n, error } = await admin.from('p2d_dang_ky_ip').select('id', { count: 'exact', head: true }).eq('ip', key).gte('luc', since(ms));
    if (error) throw error;
    return n ?? 0;
  };
  try {
    if ((await count(3600_000)) >= PER_HOUR || (await count(86400_000)) >= PER_DAY) return json({ error: 'TOO_MANY' }, 429);
  } catch (e) {
    console.error('rate', (e as Error).message);
    return json({ error: 'SIGNUP_FAILED' }, 500);
  }

  const { error } = await admin.auth.admin.createUser({
    email: `${username}@${DOMAIN}`,
    password,
    email_confirm: true,
    user_metadata: { username },
  });
  if (error) {
    if (/already|exists|registered/i.test(error.message)) return json({ error: 'USERNAME_TAKEN' }, 409);
    console.error('createUser', error.message);
    return json({ error: 'SIGNUP_FAILED' }, 500);
  }
  await admin.from('p2d_dang_ky_ip').insert({ ip: key });
  return json({ ok: true });
});
