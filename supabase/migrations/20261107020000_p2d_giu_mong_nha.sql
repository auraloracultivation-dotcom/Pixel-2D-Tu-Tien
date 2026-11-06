-- Giữ móng nhà (chủ dự án 07/11/2026 01:02): ai đó (người, AI, hay mã độc lỡ có quyền) được lấy vài món lẻ, không được dỡ cả nhà.
-- 1. Không xoá bảng, không xoá cả schema public (DROP TABLE / DROP SCHEMA bị chặn).
-- 2. Không TRUNCATE (xoá sạch một phát) các bảng quan trọng.
-- 3. Mỗi câu lệnh chỉ xoá tối đa vài dòng ở bảng nhân vật, điểm hệ thống, bang, bản sao lưu trước xử lý (p2d_xu_ly), cấu hình.
--    Xoá tài khoản, giải tán bang (từng dòng) vẫn chạy bình thường.
-- 4. Bản sao lưu đêm (p2d_sao_luu): việc dọn bản cũ vẫn chạy, nhưng không xoá hàng loạt bản của 2 ngày gần nhất.
-- Mở khoá có chủ đích (chỉ ai có quyền SQL của chủ dự án): trong cùng giao dịch, set local p2d.cho_pha = 'co';

create or replace function public.p2d_cho_pha() returns boolean language sql stable set search_path = '' as $$
  select coalesce(current_setting('p2d.cho_pha', true), '') = 'co'
$$;

-- Chặn TRUNCATE
create or replace function public.p2d_chan_truncate() returns trigger language plpgsql set search_path = '' as $$
begin
  if not public.p2d_cho_pha() then raise exception 'giu_mong_nha: khong duoc xoa sach bang %', tg_table_name using errcode = '42501'; end if;
  return null;
end $$;

-- Chặn một câu DELETE xoá quá TG_ARGV[0] dòng
create or replace function public.p2d_chan_xoa_nhieu() returns trigger language plpgsql set search_path = '' as $$
declare n integer;
begin
  select count(*) into n from cu;
  if n > tg_argv[0]::int and not public.p2d_cho_pha() then
    raise exception 'giu_mong_nha: xoa % dong % mot luc (toi da %)', n, tg_table_name, tg_argv[0] using errcode = '42501';
  end if;
  return null;
end $$;

-- Bản sao lưu: không xoá hơn 10 bản của 2 ngày gần nhất trong một câu
create or replace function public.p2d_chan_xoa_sao_luu() returns trigger language plpgsql set search_path = '' as $$
declare n integer;
begin
  select count(*) into n from cu where ngay >= current_date - 2;
  if n > 10 and not public.p2d_cho_pha() then
    raise exception 'giu_mong_nha: xoa % ban sao luu gan day mot luc', n using errcode = '42501';
  end if;
  return null;
end $$;

do $$
declare t text;
begin
  foreach t in array array['p2d_nhan_vat', 'p2d_sao_luu', 'p2d_xu_ly', 'p2d_ht_diem', 'p2d_ht_nv', 'p2d_ht_cfg', 'p2d_ht_lich_su', 'p2d_bang',
    'p2d_bang_tv', 'p2d_cho', 'p2d_hom_thu', 'p2d_tin_cay', 'p2d_bi_mat', 'p2d_ky_cfg', 'p2d_bang_cfg', 'p2d_khoi_phuc', 'p2d_gop_y'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create or replace trigger p2d_giu_truncate before truncate on public.%I for each statement execute function public.p2d_chan_truncate()', t);
    end if;
  end loop;
  foreach t in array array['p2d_nhan_vat', 'p2d_xu_ly', 'p2d_ht_diem', 'p2d_ht_nv', 'p2d_ht_cfg', 'p2d_bang', 'p2d_tin_cay', 'p2d_bi_mat', 'p2d_ky_cfg', 'p2d_bang_cfg'] loop
    if to_regclass('public.' || t) is not null then
      execute format('create or replace trigger p2d_giu_xoa after delete on public.%I referencing old table as cu for each statement execute function public.p2d_chan_xoa_nhieu(%L)', t, '10');
    end if;
  end loop;
end $$;
create or replace trigger p2d_giu_xoa after delete on public.p2d_sao_luu referencing old table as cu for each statement execute function public.p2d_chan_xoa_sao_luu();

-- Chặn DROP TABLE, DROP SCHEMA trong public
create or replace function public.p2d_chan_drop() returns event_trigger language plpgsql set search_path = '' as $$
declare r record;
begin
  if public.p2d_cho_pha() then return; end if;
  for r in select * from pg_event_trigger_dropped_objects() loop
    if r.object_type in ('table', 'schema') and (r.schema_name = 'public' or r.object_name = 'public') then
      raise exception 'giu_mong_nha: khong duoc xoa % %', r.object_type, r.object_identity using errcode = '42501';
    end if;
  end loop;
end $$;
do $$ begin
  if not exists (select 1 from pg_event_trigger where evtname = 'p2d_chan_drop') then
    create event trigger p2d_chan_drop on sql_drop execute function public.p2d_chan_drop();
  end if;
end $$;
