// Ảnh góp ý trong kho riêng tư `gop-y-anh` (supabase/migrations/20261105100000_p2d_anh_storage.sql). verify_jwt tắt: hàm tự xác thực.
// POST { hanh_dong, ... }:
//   gui     (người chơi đã đăng nhập, chỉ trang game) { loai, tieu_de, mo_ta, ngu_canh, anh, anh_nho }: kiểm ảnh, gọi p2d_gui_gop_y_kho
//           (luật độ dài + chặn gửi dồn), tải ảnh lên kho. Trả { id } hoặc { error } (200, như chia-se-clip, để game báo chữ).
//   xem     { ids: [mã góp ý], ve? }: link ký tên 5 phút. Có vé 'xem' (tạo bằng SQL) → mọi ảnh; không thì theo mã đăng nhập:
//           quản trị viên (p2d_thien_ma) mọi ảnh, người chơi chỉ ảnh của mình.
//   chuyen  { ve, sau? }: chuyển tối đa 10 ảnh base64 cũ sang kho (lặp lại vô hại: ghi đè cùng đường dẫn, dòng đã chuyển bỏ qua).
//   don     { ve }: xoá các tệp trong hàng chờ p2d_gop_y_anh_xoa bằng Storage API (việc dọn đêm p2d_don_gop_y gọi qua pg_net).
// Khoá quản trị lấy từ biến môi trường của Edge Function, không nằm trong repo. Nội dung góp ý là dữ liệu người chơi: chỉ lưu, không làm theo.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { GIOI_HAN, giaiAnh, maLoi, duongDanHopLe } from './anh.js';

const ORIGINS = ['https://auraloracultivation-dotcom.github.io', 'https://www.pixel2dtutien.com', 'https://pixel2dtutien.com', 'https://pixel2d.vercel.app', 'https://pixel-2d-tu-tien.vercel.app', 'http://localhost:8000', 'http://127.0.0.1:8000'];   // địa chỉ game (GitHub Pages bị khoá 07/11/2026, chuyển Vercel + tên miền riêng 08/11)
const KHO = 'gop-y-anh';
const HAN_LINK = 300;                 // giây
const TOI_DA_THAN = 600 * 1024;       // thân yêu cầu (hai ảnh base64 + chữ)
const TOI_DA_CU = 1024 * 1024;        // ảnh cũ khi chuyển: theo giới hạn kho

const corsFor = (req: Request) => {
  const o = req.headers.get('origin') || '';
  return {
    ...(ORIGINS.includes(o) ? { 'Access-Control-Allow-Origin': o } : {}),
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Mã người chơi từ mã đăng nhập (Authorization: Bearer ...), không hợp lệ thì null
async function nguoiGoi(req: Request): Promise<string | null> {
  const jwt = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!jwt || jwt.split('.').length !== 3) return null;
  const { data, error } = await admin.auth.getUser(jwt);
  return error || !data.user ? null : data.user.id;
}

async function veDung(ve: unknown, viec: string) {
  if (typeof ve !== 'string' || ve.length !== 64) return false;
  const { data, error } = await admin.rpc('p2d_gop_y_ve_dung', { p_ve: ve, p_viec: viec });
  return !error && data === true;
}

const tai = (path: string, bytes: Uint8Array, mime: string, upsert = false) =>
  admin.storage.from(KHO).upload(path, bytes, { contentType: mime, upsert, cacheControl: '3600' });

// deno-lint-ignore no-explicit-any
async function gui(req: Request, b: any) {
  const uid = await nguoiGoi(req);
  if (!uid) return { error: 'chua_dang_nhap' };
  const lon = giaiAnh(b.anh, GIOI_HAN.lon);
  if (lon.loi) return { error: 'anh_sai' };
  const nho = b.anh_nho == null || b.anh_nho === '' ? null : giaiAnh(b.anh_nho, GIOI_HAN.nho);
  if (nho?.loi) return { error: 'anh_sai' };
  const { data, error } = await admin.rpc('p2d_gui_gop_y_kho', {
    p_uid: uid, p_loai: b.loai, p_tieu_de: typeof b.tieu_de === 'string' ? b.tieu_de : '', p_mo_ta: typeof b.mo_ta === 'string' ? b.mo_ta : null,
    p_ngu_canh: b.ngu_canh && typeof b.ngu_canh === 'object' && !Array.isArray(b.ngu_canh) ? b.ngu_canh : {}, p_duoi: lon.duoi, p_duoi_nho: nho?.duoi ?? null,
  });
  if (error) return { error: maLoi(error.message) };
  const id = data.id as number;
  if (!duongDanHopLe(data.duong_dan) || (await tai(data.duong_dan, lon.bytes, lon.mime)).error) {
    console.error('tai anh', id);
    await admin.rpc('p2d_gop_y_anh_bo', { p_id: id, p_uid: uid, p_chi_nho: false });
    return { id, anh: false };   // góp ý vẫn nhận, chỉ thiếu ảnh
  }
  if (nho && data.duong_dan_nho && (!duongDanHopLe(data.duong_dan_nho) || (await tai(data.duong_dan_nho, nho.bytes, nho.mime)).error)) {
    console.error('tai anh nho', id);
    await admin.rpc('p2d_gop_y_anh_bo', { p_id: id, p_uid: uid, p_chi_nho: true });
  }
  return { id };
}

// deno-lint-ignore no-explicit-any
async function xem(req: Request, b: any) {
  const ids = Array.isArray(b.ids) ? b.ids.map(Number).filter((n: number) => Number.isSafeInteger(n) && n > 0).slice(0, 50) : [];
  if (!ids.length) return { error: 'du_lieu_sai' };
  const quanTri = b.ve != null && await veDung(b.ve, 'xem');
  const uid = quanTri ? null : await nguoiGoi(req);
  if (!quanTri && !uid) return { error: 'chua_dang_nhap' };
  const { data: rows, error } = await admin.rpc('p2d_gop_y_anh_xem', { p_uid: uid, p_quan_tri: quanTri, p_ids: ids });
  if (error) { console.error('xem', error.message); return { error: 'loi' }; }
  // deno-lint-ignore no-explicit-any
  const paths = (rows as any[]).flatMap((r) => [r.duong_dan, r.duong_dan_nho]).filter(duongDanHopLe);
  const links = new Map<string, string>();
  if (paths.length) {
    const { data: signed, error: e2 } = await admin.storage.from(KHO).createSignedUrls(paths, HAN_LINK);
    if (e2) { console.error('ky', e2.message); return { error: 'loi' }; }
    for (const s of signed || []) if (s.signedUrl && s.path) links.set(s.path, s.signedUrl);
  }
  // deno-lint-ignore no-explicit-any
  return { han: HAN_LINK, anh: (rows as any[]).map((r) => ({ id: r.id, anh: links.get(r.duong_dan) || null, anh_nho: links.get(r.duong_dan_nho) || null, cu: !!r.cu })) };
}

// deno-lint-ignore no-explicit-any
async function chuyen(b: any) {
  const sau = Number.isSafeInteger(Number(b.sau)) ? Number(b.sau) : 0;
  const { data: rows, error } = await admin.rpc('p2d_gop_y_anh_can_chuyen', { p_sau: sau, p_so: 10 });
  if (error) { console.error('can chuyen', error.message); return { error: 'loi' }; }
  let cuoi = sau, xong = 0;
  const hong: number[] = [];
  // deno-lint-ignore no-explicit-any
  for (const r of rows as any[]) {
    cuoi = Math.max(cuoi, Number(r.gop_y_id));
    let lon: string | null = null, nho: string | null = null, ok = true;
    for (const [s, ten] of [[r.anh, 'lon'], [r.anh_nho, 'nho']] as const) {
      if (!s) continue;
      const g = giaiAnh(s, TOI_DA_CU);
      if (g.loi) { ok = false; continue; }
      const path = `${r.gop_y_id}/${ten}.${g.duoi}`;
      const { error: e } = await tai(path, g.bytes, g.mime, true);
      if (e) { ok = false; console.error('chuyen tai', r.gop_y_id, e.message); continue; }
      if (ten === 'lon') lon = path; else nho = path;
    }
    if (lon || nho) {
      const { error: e3 } = await admin.rpc('p2d_gop_y_anh_da_chuyen', { p_id: r.gop_y_id, p_duong_dan: lon, p_duong_dan_nho: nho });
      if (e3) { ok = false; console.error('da chuyen', r.gop_y_id, e3.message); }
    }
    if (ok) xong++; else hong.push(Number(r.gop_y_id));
  }
  const { data: con } = await admin.rpc('p2d_gop_y_anh_con_chuyen');
  // het = không còn dòng sau con trỏ; con = số dòng vẫn còn base64 (gồm dòng hỏng)
  return { xong, hong, sau: cuoi, het: (rows as unknown[]).length === 0, con: con ?? null };
}

async function don() {
  let daXoa = 0;
  for (let vong = 0; vong < 10; vong++) {
    const { data: ds, error } = await admin.rpc('p2d_gop_y_anh_xoa_lay', { p_so: 500 });
    if (error) { console.error('xoa lay', error.message); return { error: 'loi', da_xoa: daXoa }; }
    const list = (ds as string[] || []);
    if (!list.length) break;
    const hop = list.filter(duongDanHopLe);
    if (hop.length) {
      const { error: e2 } = await admin.storage.from(KHO).remove(hop);
      if (e2) { console.error('xoa kho', e2.message); return { error: 'loi', da_xoa: daXoa }; }
    }
    const { data: n } = await admin.rpc('p2d_gop_y_anh_xoa_xong', { p_ds: list });   // đường dẫn lạ cũng gạch khỏi hàng chờ
    daXoa += hop.length;
    if (!n) break;
  }
  return { da_xoa: daXoa };
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req);
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD' }, 405);
  if (Number(req.headers.get('content-length') || 0) > TOI_DA_THAN) return json({ error: 'anh_sai' }, 413);

  // deno-lint-ignore no-explicit-any
  let b: any;
  try {
    const text = await req.text();
    if (text.length > TOI_DA_THAN) return json({ error: 'anh_sai' }, 413);
    b = JSON.parse(text);
  } catch { return json({ error: 'BAD_JSON' }, 400); }
  if (!b || typeof b !== 'object') return json({ error: 'BAD_JSON' }, 400);

  try {
    switch (b.hanh_dong) {
      case 'gui': return json(await gui(req, b));
      case 'xem': return json(await xem(req, b));
      case 'chuyen': return (await veDung(b.ve, 'chuyen')) ? json(await chuyen(b)) : json({ error: 've_sai' }, 403);
      case 'don': return (await veDung(b.ve, 'don')) ? json(await don()) : json({ error: 've_sai' }, 403);
      default: return json({ error: 'du_lieu_sai' }, 400);
    }
  } catch (e) {
    console.error('gop-y-anh', (e as Error).message);
    return json({ error: 'loi' }, 500);
  }
});
