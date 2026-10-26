// Đăng ký bằng tên tài khoản (không cần email thật).
// Supabase bắt buộc có email, nên máy chủ tự sinh email ẩn: <tài khoản>@nguoichoi.invalid
// Tạo qua quyền quản trị với email_confirm = true → không gửi thư, không cần xác nhận.
// Đăng nhập thì máy khách tự ghép lại email ẩn và gọi signInWithPassword như thường.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const DOMAIN = 'nguoichoi.invalid'; // đồng bộ src/net/auth.js
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405);

  let body: { username?: unknown; password?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'BAD_JSON' }, 400); }

  const username = String(body.username ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  if (!/^[a-z0-9_]{3,20}$/.test(username)) return json({ error: 'USERNAME_INVALID' }, 400);
  if (password.length < 6 || password.length > 72) return json({ error: 'PASSWORD_INVALID' }, 400);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
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
  return json({ ok: true });
});
