// Khởi tạo Supabase (dùng chung dự án với game cũ Auralora). Khoá publishable được phép công khai;
// quyền thật do RLS + RPC ở máy chủ quyết định. Cùng tên miền github.io nên phiên đăng nhập dùng chung.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

export const SUPABASE_URL = 'https://ympsgrghczpzkonfadco.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_xu2slWDBny_GVKzfsc3Z1Q_IIzP3YtN';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
