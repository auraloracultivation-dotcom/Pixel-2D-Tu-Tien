// Đăng nhập bằng TÊN TÀI KHOẢN ; email chỉ là thứ ẩn bên dưới (hàm máy chủ dang-ky).
import { supabase } from './client.js';

const HIDDEN_DOMAIN = 'nguoichoi.invalid'; // đồng bộ với supabase/functions/dang-ky
const USERNAME_RE = /^[a-z0-9_]{3,20}$/;

const normalize = a => String(a || '').trim().toLowerCase();

function toEmail(account) {
  const a = normalize(account);
  if (a.includes('@')) return a;
  if (!USERNAME_RE.test(a)) throw new Error('Tài khoản gồm 3–20 ký tự: chữ không dấu, số hoặc _.');
  return `${a}@${HIDDEN_DOMAIN}`;
}

// Tên hiển thị: phần trước @ của email ẩn
export function displayName(session) {
  const email = session?.user?.email || '';
  return email.split('@')[0] || 'Đạo hữu';
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function signIn(account, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(account), password });
  if (error) throw translate(error);
  return data.session;
}

export async function signUp(account, password) {
  const username = normalize(account);
  if (username.includes('@')) throw new Error('Đăng ký bằng tên tài khoản, không cần email.');
  toEmail(username);
  if (password.length < 6) throw new Error('Mật khẩu cần ít nhất 6 ký tự.');
  const { data, error } = await supabase.functions.invoke('dang-ky', { body: { username, password } });
  if (error) {
    let code = '';
    try { code = (await error.context.json()).error; } catch { /* không đọc được thân lỗi */ }
    if (code === 'USERNAME_TAKEN') throw new Error('Tên tài khoản đã có người dùng.');
    if (code === 'USERNAME_INVALID') throw new Error('Tài khoản gồm 3–20 ký tự: chữ không dấu, số hoặc _.');
    if (code === 'PASSWORD_INVALID') throw new Error('Mật khẩu cần 6–72 ký tự.');
    throw new Error('Không tạo được tài khoản, thử lại sau.');
  }
  if (!data?.ok) throw new Error('Không tạo được tài khoản, thử lại sau.');
  return signIn(username, password);
}

export async function signOut() {
  await supabase.auth.signOut();
}

function translate(error) {
  const m = (error.message || '').toLowerCase();
  if (m.includes('invalid login')) return new Error('Sai tài khoản hoặc mật khẩu.');
  if (m.includes('rate limit')) return new Error('Thử quá nhiều lần, đợi một lát rồi thử lại.');
  if (m.includes('password')) return new Error('Mật khẩu cần ít nhất 6 ký tự.');
  return new Error(error.message);
}
