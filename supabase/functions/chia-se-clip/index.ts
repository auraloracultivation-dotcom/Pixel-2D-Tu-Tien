// Quà chia sẻ clip (data/record.json "share"): người chơi đã đăng nhập gửi link bài đăng TikTok / YouTube và loại ngọc.
// Hàm hỏi oEmbed công khai của nền tảng: video riêng tư, đã xoá hoặc sai link thì không đọc được → không nhận.
// Mô tả TikTok (YouTube: tiêu đề) phải có TAG. Đạt thì gọi p2d_qua_chia_se (migration 20261028143000) để cộng ngọc
// vào bản lưu trên máy chủ; mỗi tài khoản một lần, mỗi bài một lần. Lỗi nghiệp vụ trả 200 kèm { error } để game báo chữ.
// Chỉ trang game gọi được từ trình duyệt (CORS). TAG phải khớp data/record.json share.tag.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';

const ORIGINS = ['https://auraloracultivation-dotcom.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000'];
const TAG = /#pixeltutien(?![a-z0-9_])/i;
const LOAI = ['hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc'];
const TIMEOUT = 8000;

const corsFor = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return {
    ...(ORIGINS.includes(o) ? { 'Access-Control-Allow-Origin': o } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

const get = (url: string, redirect: RequestRedirect = 'follow') =>
  fetch(url, { redirect, signal: AbortSignal.timeout(TIMEOUT), headers: { 'user-agent': 'Mozilla/5.0 (compatible; Pixel2DTuTien/1.0)' } });

// Link rút gọn (vm.tiktok.com, tiktok.com/t/...) → link đầy đủ, theo tối đa 4 lần chuyển hướng
async function expand(url: string) {
  let u = url;
  for (let i = 0; i < 4; i++) {
    const r = await get(u, 'manual');
    const loc = r.headers.get('location');
    await r.body?.cancel();
    if (!loc) return u;
    u = new URL(loc, u).href;
  }
  return u;
}

// Trả về { bai, oembed } hoặc null nếu link không phải bài TikTok / YouTube
async function parse(raw: string) {
  let u: URL;
  try { u = new URL(raw.trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  if (host === 'vm.tiktok.com' || host === 'vt.tiktok.com' || (host === 'tiktok.com' && u.pathname.startsWith('/t/'))) {
    try { u = new URL(await expand(u.href)); } catch { return null; }
  }
  const h = u.hostname.toLowerCase().replace(/^(www|m)\./, '');
  if (h === 'tiktok.com') {
    const m = u.pathname.match(/^\/@([\w.-]{1,40})\/video\/(\d{5,25})/);
    if (!m) return null;
    const clean = `https://www.tiktok.com/@${m[1]}/video/${m[2]}`;
    return { bai: `tiktok:${m[2]}`, link: clean, oembed: `https://www.tiktok.com/oembed?url=${encodeURIComponent(clean)}` };
  }
  let id = '';
  if (h === 'youtu.be') id = u.pathname.slice(1).split('/')[0];
  else if (h === 'youtube.com') id = u.pathname.startsWith('/shorts/') ? u.pathname.split('/')[2] : (u.searchParams.get('v') || '');
  if (!/^[A-Za-z0-9_-]{6,20}$/.test(id)) return null;
  const clean = `https://www.youtube.com/watch?v=${id}`;
  return { bai: `youtube:${id}`, link: clean, oembed: `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(clean)}` };
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'loi' }, 405);

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const { data: who } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const uid = who?.user?.id;
  if (!uid) return json({ error: 'chua_dang_nhap' });

  let body: { url?: unknown; loai?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'link_sai' }); }
  const loai = String(body.loai ?? '');
  if (!LOAI.includes(loai)) return json({ error: 'loi' });
  const post = await parse(String(body.url ?? '').slice(0, 400));
  if (!post) return json({ error: 'link_sai' });

  // Đã nhận hoặc bài đã dùng: báo sớm, khỏi hỏi nền tảng
  const { data: had } = await admin.from('p2d_chia_se').select('user_id, bai').or(`user_id.eq.${uid},bai.eq.${post.bai}`).limit(2);
  if (had?.some((r) => r.user_id === uid)) return json({ error: 'da_nhan' });
  if (had?.length) return json({ error: 'link_da_dung' });

  let info: { title?: string; author_name?: string } | null = null;
  try {
    const r = await get(post.oembed);
    if (r.ok) info = await r.json(); else await r.body?.cancel();
  } catch (e) { console.error('oembed', (e as Error).message); }
  if (!info) return json({ error: 'khong_cong_khai' });
  if (!TAG.test(String(info.title || ''))) return json({ error: 'thieu_tag' });

  const { data, error } = await admin.rpc('p2d_qua_chia_se', {
    p_uid: uid, p_bai: post.bai, p_link: post.link, p_tac_gia: String(info.author_name || '').slice(0, 80), p_loai: loai,
  });
  if (error) {
    const code = ['da_nhan', 'link_da_dung', 'chua_luu', 'link_sai'].find((c) => error.message?.includes(c));
    if (!code) console.error('rpc', error.message);
    return json({ error: code || 'loi' });
  }
  return json(data);
});
