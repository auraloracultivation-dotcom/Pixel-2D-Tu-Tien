// Kiểm vé đăng nhập Supabase (JWT ES256) ngay trên Cloudflare, không gọi về Supabase mỗi lần vào phòng:
// lấy khoá công khai từ <SUPABASE_URL>/auth/v1/.well-known/jwks.json (giữ 1 giờ), kiểm chữ ký, hạn dùng, nơi cấp, vai trò.
const enc = new TextEncoder();
let jwks = null, jwksAt = 0;

const b64u = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), c => c.charCodeAt(0));
const json = s => JSON.parse(new TextDecoder().decode(b64u(s)));

async function keys(url, force) {
  if (!force && jwks && Date.now() - jwksAt < 3600e3) return jwks;
  const r = await fetch(`${url}/auth/v1/.well-known/jwks.json`, { cf: { cacheTtl: 600 } });
  if (!r.ok) throw new Error('jwks');
  const list = (await r.json()).keys || [];
  const out = {};
  for (const k of list) {
    if (k.kty !== 'EC' || k.crv !== 'P-256') continue;
    out[k.kid] = await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: k.x, y: k.y, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
  }
  jwks = out; jwksAt = Date.now();
  return out;
}

// Trả về mã tài khoản (sub) nếu vé hợp lệ, không thì null
export async function verifyToken(token, url, key) {
  try {
    const [h, p, s] = String(token || '').split('.');
    if (!h || !p || !s) return null;
    const head = json(h), body = json(p);
    if (head.alg !== 'ES256') return key ? await askSupabase(token, url, key) : null;   // vé kiểu cũ (HS256): hỏi Supabase
    let ks = await keys(url, false);
    if (!ks[head.kid]) ks = await keys(url, true);   // khoá mới vừa xoay vòng
    const pub = ks[head.kid];
    if (!pub) return null;
    const ok = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, pub, b64u(s), enc.encode(`${h}.${p}`));
    if (!ok) return null;
    const now = Date.now() / 1000;
    if (!(body.exp > now - 30) || body.iss !== `${url}/auth/v1` || body.role !== 'authenticated' || typeof body.sub !== 'string') return null;
    return body.sub;
  } catch { return null; }
}

// Dự phòng: hỏi Supabase vé còn hợp lệ không (khoá publishable là khoá công khai, như trong máy khách)
async function askSupabase(token, url, key) {
  try {
    const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
    if (!r.ok) return null;
    const u = await r.json();
    return typeof u?.id === 'string' && !u.banned_until ? u.id : null;
  } catch { return null; }
}
