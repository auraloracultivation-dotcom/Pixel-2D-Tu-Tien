-- Nguyên tắc con giun: p2d_thien_ma_tran (nhật ký trận Thiên Ma, migration 20261031050000) chỉ thêm mà không bao giờ xoá.
-- Không hàm nào đọc lại bảng này (chỉ để tra cứu), nên dọn trận cũ hơn 30 ngày trong p2d_don_dep chạy mỗi đêm.
-- Giữ nguyên các luật dọn cũ. Không đổi số kinh tế hay lối chơi.
-- Giảm lag: khoá ngoại p2d_thien_ma_tran.user_id chưa có chỉ mục (Supabase cảnh báo unindexed_foreign_keys).

create or replace function public.p2d_don_dep()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v jsonb := '{}'; n integer;
begin
  with x as (delete from public.p2d_nghi_van where luc < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('nghi_van', n);
  with x as (delete from public.p2d_hom_thu where nhan_luc is not null and nhan_luc < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('hom_thu', n);
  with x as (delete from public.p2d_cho where trang_thai in ('da_ban', 'huy', 'het_han') and coalesce(xong_luc, tao_luc) < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('cho', n);
  with x as (delete from public.p2d_bao_cao where luc < now() - interval '60 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('bao_cao', n);
  with x as (delete from public.p2d_bxh_tuan where tuan < current_date - 56 returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('bxh_tuan', n);
  with x as (delete from public.p2d_thiet_bi where lan_cuoi < now() - interval '90 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('thiet_bi', n);
  with x as (delete from public.p2d_thien_ma_tran where luc < now() - interval '30 days' returning 1) select count(*) into n from x;
  v := v || jsonb_build_object('thien_ma_tran', n);
  return v;
end;
$$;

revoke all on function public.p2d_don_dep() from public, anon, authenticated;

create index if not exists p2d_thien_ma_tran_user_idx on public.p2d_thien_ma_tran (user_id);
