-- Giới hạn tốc độ thao tác (chủ dự án 13/11/2026 00:25: "Mỗi lần 1 giây, ví dụ mua đồ cũng 1s mới mua được 1 món").
-- Lý do: 12/11/2026 vài tài khoản gọi máy chủ dồn dập (một tài khoản 22.509 lệnh, 3.163 lần mua nguyên liệu, có khả năng dùng tool),
-- máy chủ gói Free nghẹt CPU, người chơi khác "Mất kết nối".
-- Cách làm: hàm chạy trước mọi yêu cầu PostgREST (pgrst.db_pre_request). Với các thao tác đổi tài nguyên trong danh sách,
-- mỗi tài khoản chỉ được gọi cùng một thao tác tối đa 1 lần / giây; nhanh hơn thì báo lỗi 'qua_nhanh', không làm gì.
-- Đọc dữ liệu, nhịp sống, lưu game không bị giới hạn ở đây. Bảng chỉ giữ mốc giờ lần gọi cuối (một dòng / tài khoản / thao tác).

create unlogged table if not exists public.p2d_nhip_lenh (
  user_id uuid not null,
  lenh text not null,
  luc timestamptz not null default clock_timestamp(),
  primary key (user_id, lenh)
);
alter table public.p2d_nhip_lenh enable row level security;   -- không policy: máy khách không đọc / ghi trực tiếp
revoke all on public.p2d_nhip_lenh from anon, authenticated;

create or replace function public.p2d_gioi_han()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_path text := coalesce(current_setting('request.path', true), '');
  v_uid uuid := auth.uid();
  v_lenh text;
  v_cu timestamptz;
begin
  if v_uid is null or v_path not like '/rpc/%' then return; end if;
  v_lenh := substr(v_path, 6);
  if not (v_lenh = any (array[
    'p2d_nl_mua', 'p2d_mua_hang', 'p2d_rao_ban', 'p2d_huy_ban',
    'p2d_ghep_ngoc', 'p2d_kham_ngoc', 'p2d_go_ngoc', 'p2d_cuong_hoa',
    'p2d_luyen_phap_bao', 'p2d_tay_luyen', 'p2d_tay_thu',
    'p2d_ht_trieu', 'p2d_ht_nhan', 'p2d_ht_qua_dau', 'p2d_ht_ngay',
    'p2d_nhan_thu_moi', 'p2d_nhan_the', 'p2d_nhap_ma', 'p2d_qua_tn',
    'p2d_diem_danh', 'p2d_bang_diem_danh', 'p2d_bang_nhan', 'p2d_bang_gop',
    'p2d_kh_gop', 'p2d_kh_mua', 'p2d_uong_dan_x2', 'p2d_dl_tang2'
  ])) then return; end if;

  select luc into v_cu from p2d_nhip_lenh where user_id = v_uid and lenh = v_lenh;
  if v_cu is not null and clock_timestamp() - v_cu < interval '1 second' then
    raise exception 'qua_nhanh' using errcode = 'P0001', hint = 'Mỗi thao tác cách nhau ít nhất 1 giây';
  end if;
  insert into p2d_nhip_lenh (user_id, lenh, luc) values (v_uid, v_lenh, clock_timestamp())
    on conflict (user_id, lenh) do update set luc = excluded.luc;
end;
$$;

revoke all on function public.p2d_gioi_han() from public;
grant execute on function public.p2d_gioi_han() to anon, authenticated;

alter role authenticator set pgrst.db_pre_request = 'public.p2d_gioi_han';
notify pgrst, 'reload config';
