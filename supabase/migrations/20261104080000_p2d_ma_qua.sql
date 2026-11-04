-- Mã quà (chủ dự án 04/11/2026 17:38: "tạo 2 code, mỗi code 300 điểm QTV, mỗi tài khoản chỉ nhập 1 lần, mỗi code chỉ nhập 1 lần",
-- thưởng người mang thành viên tới game). Bảng mã không lộ ra máy khách (RLS, không policy); mã do chủ dự án / Claude thêm thẳng
-- trên máy chủ, KHÔNG ghi mã vào repo. Một mã dùng được một lần; trong cùng một đợt (dot) mỗi tài khoản chỉ nhập được một mã.
-- Nhập đúng: ghi +diem vào sổ cái QTV (nguon 'ma_qua', ref = mã) → cộng vào bảng QTV, đổi Tiên Ngọc như điểm khác.
create table if not exists public.p2d_ma_qua (
  ma text primary key check (ma ~ '^[A-Z0-9-]{4,32}$'),
  diem integer not null check (diem between 1 and 10000),
  dot text not null,
  ghi_chu text,
  dung_boi uuid references auth.users (id),
  dung_luc timestamptz,
  tao_luc timestamptz not null default now()
);
create unique index if not exists p2d_ma_qua_mot_tk on public.p2d_ma_qua (dot, dung_boi) where dung_boi is not null;
alter table public.p2d_ma_qua enable row level security;
revoke all on public.p2d_ma_qua from public, anon, authenticated;

alter table public.p2d_qtv_so drop constraint if exists p2d_qtv_so_nguon_check;
alter table public.p2d_qtv_so add constraint p2d_qtv_so_nguon_check check (nguon in ('gop_y', 'gioi_thieu', 'doi_tien_ngoc', 'ma_qua'));

create or replace function public.p2d_nhap_ma(p_ma text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := public.p2d_uid(); v_m public.p2d_ma_qua%rowtype; v_ma text := upper(btrim(coalesce(p_ma, '')));
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ma_qua:' || v_uid::text));
  select * into v_m from public.p2d_ma_qua where ma = v_ma for update;
  if not found then return jsonb_build_object('ok', false, 'ly_do', 'sai_ma'); end if;
  if v_m.dung_boi is not null then return jsonb_build_object('ok', false, 'ly_do', case when v_m.dung_boi = v_uid then 'da_nhap' else 'het_luot' end); end if;
  if exists (select 1 from public.p2d_ma_qua where dot = v_m.dot and dung_boi = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'da_nhap_dot'); end if;
  update public.p2d_ma_qua set dung_boi = v_uid, dung_luc = now() where ma = v_ma;
  insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu) values (v_uid, v_m.diem, 'ma_qua', v_ma, left('Mã quà ' || coalesce(v_m.ghi_chu, v_m.dot), 200));
  return jsonb_build_object('ok', true, 'diem', v_m.diem);
end; $$;
revoke all on function public.p2d_nhap_ma(text) from public, anon;
grant execute on function public.p2d_nhap_ma(text) to authenticated;
