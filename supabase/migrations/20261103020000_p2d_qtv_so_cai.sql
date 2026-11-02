-- Sổ cái điểm quản trị viên (chủ dự án 03/11/2026 02:34): lưu lịch sử mọi lần được / bị trừ / đổi điểm QTV làm bằng chứng
-- đóng góp của người chơi, CHỈ THÊM, KHÔNG SỬA, KHÔNG XOÁ (trigger chặn update / delete / truncate, kể cả chủ dự án).
-- Nguồn điểm (giữ đúng cách tính của p2d_bxh_qtv2): góp ý báo lỗi đã sửa +10, đề xuất đã làm +20, sẽ làm +5, spam −15;
-- mời bạn thành công +15 (mời đạt trước 03/11/2026 02:00 giờ VN) và +60 từ đó (chủ dự án 03/11 02:12). p2d_qtv_dong_bo ghi
-- phần chênh của từng mục (ví dụ sẽ làm → đã sửa: +15) nên tổng sổ luôn bằng điểm bảng; chạy đầu p2d_bxh_qtv3, p2d_qtv_lich_su,
-- p2d_qtv_doi (không gắn trigger vào bảng cũ: chạy trên máy chủ ngày 03/11 không cần hỏi lại).
-- Đổi Tiên Ngọc 1 điểm = 1 Tiên Ngọc, tối đa 500 mỗi tuần (thứ Hai 00:00 giờ VN), ghi dòng âm 'doi_tien_ngoc'.
-- Bảng QTV bản 3 đọc từ sổ (điểm xếp hạng = tổng điểm đã được, không trừ phần đã đổi).

create table if not exists public.p2d_qtv_so (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id),
  diem integer not null,
  nguon text not null check (nguon in ('gop_y', 'gioi_thieu', 'doi_tien_ngoc')),
  ref text not null,
  ghi_chu text,
  luc timestamptz not null default now()
);
create index if not exists p2d_qtv_so_user on public.p2d_qtv_so (user_id, luc);
create index if not exists p2d_qtv_so_ref on public.p2d_qtv_so (nguon, ref);
alter table public.p2d_qtv_so enable row level security;   -- không policy: chỉ đọc qua hàm

create or replace function public.p2d_qtv_so_khoa() returns trigger language plpgsql set search_path = '' as $$
begin raise exception 'so_cai_chi_them' using errcode = '42501'; end; $$;
create trigger p2d_qtv_so_khoa before update or delete on public.p2d_qtv_so for each row execute function public.p2d_qtv_so_khoa();
create trigger p2d_qtv_so_khoa_t before truncate on public.p2d_qtv_so for each statement execute function public.p2d_qtv_so_khoa();
revoke all on public.p2d_qtv_so from public, anon, authenticated;

-- Ghi phần chênh giữa điểm đúng của một mục và tổng đã ghi
create or replace function public.p2d_qtv_ghi(p_uid uuid, p_nguon text, p_ref text, p_dung integer, p_ghi text)
returns void language plpgsql security definer set search_path = '' as $$
declare v_da integer;
begin
  if p_uid is null then return; end if;
  select coalesce(sum(diem), 0) into v_da from public.p2d_qtv_so where nguon = p_nguon and ref = p_ref;
  if p_dung <> v_da then
    insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu) values (p_uid, p_dung - v_da, p_nguon, p_ref, left(p_ghi, 200));
  end if;
end; $$;
revoke all on function public.p2d_qtv_ghi(uuid, text, text, integer, text) from public, anon, authenticated;

create or replace function public.p2d_qtv_diem_gop_y(p_loai text, p_tt text) returns integer language sql immutable set search_path = '' as $$
  select case when p_loai = 'loi' and p_tt = 'da_sua' then 10 when p_loai = 'de_xuat' and p_tt = 'da_sua' then 20
              when p_tt = 'se_lam' then 5 when p_tt = 'spam' then -15 else 0 end; $$;
create or replace function public.p2d_qtv_diem_gt(p_dat timestamptz, p_khoa timestamptz, p_cung boolean) returns integer language sql immutable set search_path = '' as $$
  select case when p_dat is null or p_khoa is not null or coalesce(p_cung, false) then 0
              when p_dat < timestamptz '2026-11-02 18:00:00+00' then 15 else 60 end; $$;

-- Ghi mọi phần chênh còn thiếu (góp ý đổi trạng thái, mời bạn đạt / bị khoá)
create or replace function public.p2d_qtv_dong_bo()
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform pg_advisory_xact_lock(hashtext('qtv_dong_bo'));
  perform public.p2d_qtv_ghi(g.user_id, 'gop_y', g.id::text, public.p2d_qtv_diem_gop_y(g.loai, g.trang_thai),
                             'Góp ý #' || g.id || ' (' || g.loai || ') ' || g.trang_thai || ': ' || coalesce(g.tieu_de, ''))
    from public.p2d_gop_y g
   where public.p2d_qtv_diem_gop_y(g.loai, g.trang_thai) <> coalesce((select sum(s.diem) from public.p2d_qtv_so s where s.nguon = 'gop_y' and s.ref = g.id::text), 0);
  perform public.p2d_qtv_ghi(t.nguoi_gt, 'gioi_thieu', t.user_id::text, public.p2d_qtv_diem_gt(t.dat_luc, t.khoa_luc, t.cung_mang),
                             'Mời bạn ' || coalesce((select n.ten from public.p2d_nhan_vat n where n.user_id = t.user_id), '?'))
    from public.p2d_gioi_thieu t
   where public.p2d_qtv_diem_gt(t.dat_luc, t.khoa_luc, t.cung_mang) <> coalesce((select sum(s.diem) from public.p2d_qtv_so s where s.nguon = 'gioi_thieu' and s.ref = t.user_id::text), 0);
end; $$;
revoke all on function public.p2d_qtv_dong_bo() from public, anon, authenticated;
select public.p2d_qtv_dong_bo();   -- ghi lại toàn bộ điểm đã có lúc mở sổ

-- Lịch sử điểm của chính mình + số dư đổi được + đã đổi tuần này
create or replace function public.p2d_qtv_lich_su()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := public.p2d_uid(); v_tuan timestamptz := date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  perform public.p2d_qtv_dong_bo();
  return jsonb_build_object(
    'du', (select coalesce(sum(diem), 0) from public.p2d_qtv_so where user_id = v_uid),
    'tong', (select coalesce(sum(diem), 0) from public.p2d_qtv_so where user_id = v_uid and nguon <> 'doi_tien_ngoc'),
    'tuan', (select coalesce(-sum(diem), 0) from public.p2d_qtv_so where user_id = v_uid and nguon = 'doi_tien_ngoc' and luc >= v_tuan),
    'gioi_han', 500,
    'dong', coalesce((select jsonb_agg(jsonb_build_object('diem', diem, 'nguon', nguon, 'ghi', ghi_chu, 'luc', luc) order by luc desc)
                      from (select * from public.p2d_qtv_so where user_id = v_uid order by luc desc limit 100) x), '[]'::jsonb));
end; $$;

-- Đổi điểm QTV lấy Tiên Ngọc 1 = 1, tối đa 500 mỗi tuần
create or replace function public.p2d_qtv_doi(p_n integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := public.p2d_uid(); v_du integer; v_tuan_da integer; v_tn bigint;
        v_tuan timestamptz := date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh') at time zone 'Asia/Ho_Chi_Minh';
begin
  if p_n is null or p_n < 1 or p_n > 500 then raise exception 'so_sai' using errcode = '22023'; end if;
  perform public.p2d_qtv_dong_bo();
  perform pg_advisory_xact_lock(hashtext('qtv_doi:' || v_uid::text));
  select coalesce(sum(diem), 0) into v_du from public.p2d_qtv_so where user_id = v_uid;
  if v_du < p_n then raise exception 'khong_du' using errcode = '22023'; end if;
  select coalesce(-sum(diem), 0) into v_tuan_da from public.p2d_qtv_so where user_id = v_uid and nguon = 'doi_tien_ngoc' and luc >= v_tuan;
  if v_tuan_da + p_n > 500 then raise exception 'qua_tuan' using errcode = '22023'; end if;
  update public.p2d_nhan_vat set tien_ngoc = tien_ngoc + p_n where user_id = v_uid returning tien_ngoc into v_tn;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu) values (v_uid, -p_n, 'doi_tien_ngoc', gen_random_uuid()::text, 'Đổi ' || p_n || ' Tiên Ngọc');
  return jsonb_build_object('tn', v_tn, 'du', v_du - p_n, 'tuan', v_tuan_da + p_n);
end; $$;

-- Bảng QTV bản 3: điểm từ sổ cái (tổng đã được), giữ các cột như bản 2
create or replace function public.p2d_bxh_qtv3()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := public.p2d_uid();
begin
  perform public.p2d_qtv_dong_bo();
  return (with s as (
    select user_id, greatest(0, sum(diem)) as diem from public.p2d_qtv_so where nguon <> 'doi_tien_ngoc' group by user_id),
  g as (
    select g.user_id,
      count(*) filter (where g.loai = 'loi' and g.trang_thai = 'da_sua') as loi,
      count(*) filter (where g.loai = 'de_xuat' and g.trang_thai = 'da_sua') as dx,
      count(*) filter (where g.trang_thai = 'se_lam') as ghi,
      count(*) filter (where g.trang_thai in ('khong_lam', 'trung', 'chua_sua_duoc', 'spam')) as khong,
      count(*) filter (where g.trang_thai = 'moi') as cho
    from public.p2d_gop_y g group by g.user_id),
  m as (
    select t.nguoi_gt as user_id, count(*) as moi from public.p2d_gioi_thieu t
     where t.dat_luc is not null and t.khoa_luc is null and not coalesce(t.cung_mang, false) group by t.nguoi_gt),
  r as (
    select row_number() over (order by s.diem desc, coalesce(g.loi, 0) + coalesce(g.dx, 0) + coalesce(m.moi, 0) desc, n.ten) as hang,
      s.user_id, s.diem, n.ten, coalesce(g.loi, 0) loi, coalesce(g.dx, 0) dx, coalesce(g.ghi, 0) ghi, coalesce(g.khong, 0) khong, coalesce(g.cho, 0) cho, coalesce(m.moi, 0) moi,
      case when s.diem >= 600 then 5 when s.diem >= 300 then 4 when s.diem >= 150 then 3 when s.diem >= 60 then 2 when s.diem >= 20 then 1 else 0 end as cap
    from s join public.p2d_nhan_vat n on n.user_id = s.user_id left join g on g.user_id = s.user_id left join m on m.user_id = s.user_id)
  select jsonb_build_object(
    'top', coalesce((select jsonb_agg(jsonb_build_object('hang', hang, 'k', public.p2d_chat_key(user_id), 'ten', coalesce(nullif(ten, ''), public.p2d_ten_mac_dinh(user_id)),
                       'diem', diem, 'cap', cap, 'loi', loi, 'dx', dx, 'ghi', ghi, 'moi', moi, 'khong', khong, 'cho', cho, 'la_toi', user_id = v_uid) order by hang)
                     from r where hang <= 50), '[]'::jsonb),
    'toi', (select jsonb_build_object('hang', hang, 'diem', diem, 'cap', cap) from r where user_id = v_uid)));
end; $$;

revoke all on function public.p2d_qtv_lich_su() from public, anon;
revoke all on function public.p2d_qtv_doi(integer) from public, anon;
revoke all on function public.p2d_bxh_qtv3() from public, anon;
grant execute on function public.p2d_qtv_lich_su() to authenticated;
grant execute on function public.p2d_qtv_doi(integer) to authenticated;
grant execute on function public.p2d_bxh_qtv3() to authenticated;
