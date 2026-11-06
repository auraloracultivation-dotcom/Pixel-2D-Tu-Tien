-- Thưởng Linh Thạch khi chém Cửu Đầu Thôn Thiên Mãng (chủ dự án 06/11/2026 09:34: "khi chém con đó thì cứ tính linh thạch x10
-- so với farm thường"). Cloudflare (cloud/src/mang.js) biết ai thật sự đang đánh (sát thương đã kẹp theo lực chiến, đứng gần mép
-- tinh cầu), cứ 5 phút gửi một lô { u: mã tài khoản, lt } về đây, ký HMAC-SHA256 bằng khoá dùng chung. Đây chỉ kiểm chữ ký, hạn giờ,
-- chống gửi lại, kẹp số rồi bỏ Linh Thạch vào Hòm thư (người chơi nhận như thư thường: p2d_nhan_thu_moi cộng ở máy chủ).
-- Khoá dùng chung: Cloudflare tự sinh lần đầu và đăng ký qua p2d_mang_dang_ky (chỉ nhận khi chưa có khoá); không ai phải chép khoá
-- qua tay người, không nằm trong kho mã. Đổi khoá: xoá dòng p2d_bi_mat k = 'cf_mang' (chủ dự án) để Cloudflare đăng ký lại.

create table if not exists public.p2d_mang_ky (ts bigint primary key, luc timestamptz not null default now());
alter table public.p2d_mang_ky enable row level security;
revoke all on table public.p2d_mang_ky from public, anon, authenticated;

create or replace function public.p2d_mang_dang_ky(p_khoa text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_khoa is null or length(p_khoa) < 48 or length(p_khoa) > 128 or p_khoa !~ '^[A-Za-z0-9_-]+$' then return false; end if;
  insert into public.p2d_bi_mat (k, v) values ('cf_mang', p_khoa) on conflict (k) do nothing;
  return found;
end;
$$;
revoke all on function public.p2d_mang_dang_ky(text) from public;
grant execute on function public.p2d_mang_dang_ky(text) to anon, authenticated;

-- Dấu vân tay khoá (để Claude so với Cloudflare, không lộ khoá)
create or replace function public.p2d_mang_van_tay()
returns text
language sql
stable
security definer
set search_path = ''
as $$ select encode(extensions.digest((select v from public.p2d_bi_mat where k = 'cf_mang'), 'sha256'), 'hex') $$;
revoke all on function public.p2d_mang_van_tay() from public, anon, authenticated;

create or replace function public.p2d_mang_thuong(p_ts bigint, p_ds text, p_ky text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_khoa text := (select v from public.p2d_bi_mat where k = 'cf_mang'); v_e jsonb; v_n integer := 0; v_lt bigint; v_u uuid;
begin
  if v_khoa is null or p_ts is null or p_ds is null or p_ky is null or length(p_ds) > 200000 then raise exception 'sai' using errcode = '42501'; end if;
  if abs(extract(epoch from now()) * 1000 - p_ts) > 120000 then raise exception 'het_gio' using errcode = '42501'; end if;
  if encode(extensions.hmac(p_ts::text || '.' || p_ds, v_khoa, 'sha256'), 'hex') <> lower(p_ky) then raise exception 'sai_ky' using errcode = '42501'; end if;
  insert into public.p2d_mang_ky (ts) values (p_ts) on conflict do nothing;
  if not found then raise exception 'gui_lai' using errcode = '42501'; end if;
  for v_e in select * from jsonb_array_elements(p_ds::jsonb) limit 2000 loop
    begin v_u := (v_e ->> 'u')::uuid; exception when others then continue; end;
    v_lt := least(coalesce((v_e ->> 'lt')::numeric, 0), 20000)::bigint;   -- trần một lô 5 phút / người (vết nứt: 3,76 × 10 × 300 giây ≈ 11 280)
    if v_lt < 1 then continue; end if;
    if not exists (select 1 from auth.users u where u.id = v_u and (u.banned_until is null or u.banned_until < now())) then continue; end if;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_u, jsonb_build_object('coins', v_lt), 'thon_thien_mang');
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$$;
revoke all on function public.p2d_mang_thuong(bigint, text, text) from public;
grant execute on function public.p2d_mang_thuong(bigint, text, text) to anon, authenticated;
