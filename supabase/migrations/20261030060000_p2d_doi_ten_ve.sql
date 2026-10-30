-- Đổi tên (chủ dự án chốt 30/10/2026 16:26–16:30): đặt tên lần đầu (từ tên mặc định "Đạo hữu XXXX", cột ten còn rỗng) miễn phí,
-- sau đó mỗi tài khoản có 1 lần đổi miễn phí (người đã có tên hiện giờ cũng còn 1 lần, vì nút đổi tên trước đây khó tìm).
-- Hết lần miễn phí thì cần Vé đổi tên (ve_doi_ten, bán sau). Bỏ giới hạn mỗi ngày một lần.

alter table public.p2d_nhan_vat add column if not exists doi_ten_free integer not null default 1;
alter table public.p2d_nhan_vat add column if not exists ve_doi_ten integer not null default 0;

create or replace function public.p2d_dat_ten(p_ten text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_nv  public.p2d_nhan_vat%rowtype;
  v_ten text;
begin
  v_ten := btrim(regexp_replace(regexp_replace(coalesce(p_ten, ''),
             '[[:cntrl:]<>"''`\\​-‏‪-‮⁠-⁩﻿]', '', 'g'), '\s+', ' ', 'g'));
  if char_length(v_ten) not between 2 and 16 or lower(v_ten) like 'đạo hữu%' then
    raise exception 'ten_sai' using errcode = '22023';
  end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.ten = v_ten then return v_ten; end if;
  if v_nv.ten is not null and v_nv.doi_ten_free <= 0 and v_nv.ve_doi_ten <= 0 then
    raise exception 'can_ve' using errcode = '22023';
  end if;
  if exists (select 1 from public.p2d_nhan_vat where lower(ten) = lower(v_ten) and user_id <> v_uid) then
    raise exception 'ten_trung' using errcode = '22023';
  end if;
  update public.p2d_nhan_vat set ten = v_ten, ten_doi_luc = now(),
         doi_ten_free = case when v_nv.ten is null then doi_ten_free when doi_ten_free > 0 then doi_ten_free - 1 else doi_ten_free end,
         ve_doi_ten = case when v_nv.ten is null or v_nv.doi_ten_free > 0 then ve_doi_ten else ve_doi_ten - 1 end
   where user_id = v_uid;
  return v_ten;
end;
$$;

-- Lượt đổi tên còn lại của mình: dau = chưa đặt tên lần nào (lần đầu miễn phí), free = lần đổi miễn phí còn, ve = số vé
create or replace function public.p2d_ten_luot()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select jsonb_build_object('dau', n.ten is null, 'free', n.doi_ten_free, 've', n.ve_doi_ten)
    from public.p2d_nhan_vat n where n.user_id = public.p2d_uid();
$$;
revoke all on function public.p2d_ten_luot() from public, anon;
grant execute on function public.p2d_ten_luot() to authenticated;
