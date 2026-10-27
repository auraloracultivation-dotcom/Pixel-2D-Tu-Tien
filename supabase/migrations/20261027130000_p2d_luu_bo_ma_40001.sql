-- Sửa lỗi treo máy chủ: p2d_luu báo "phien_ban_cu" bằng mã 40001 (serialization_failure).
-- PostgREST tự chạy lại giao dịch khi gặp mã này, nên một máy lưu bản cũ bị chạy lại mãi
-- (mỗi giây một lần, 5 tiếng sáng 27/10), giữ chỗ kết nối và làm mọi lệnh khác (BXH, tải, lưu) bị 504.
-- Giờ dùng mã thường P0001; nội dung lỗi giữ nguyên "phien_ban_cu" nên máy khách vẫn nhận ra.
create or replace function public.p2d_luu(p_data jsonb, p_phien_ban integer)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid       uuid := (select auth.uid());
  v_cu        public.p2d_nhan_vat%rowtype;
  v_canh_gioi integer;
  v_tang      integer;
  v_tui       integer;
begin
  if v_uid is null then
    raise exception 'chua_dang_nhap' using errcode = '28000';
  end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  if octet_length(p_data::text) > 200000 then
    raise exception 'du_lieu_qua_lon' using errcode = '22023';
  end if;
  if jsonb_typeof(p_data -> 'realm') <> 'number' or jsonb_typeof(p_data -> 'layer') <> 'number'
     or jsonb_typeof(p_data -> 'qi') <> 'number' or jsonb_typeof(p_data -> 'step') <> 'number' then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;

  v_canh_gioi := (p_data ->> 'realm')::integer;
  v_tang := (p_data ->> 'layer')::integer;
  if v_canh_gioi not between 0 and 8 or v_tang not between 1 and 9 or (p_data ->> 'qi')::numeric < 0 then
    raise exception 'canh_gioi_sai' using errcode = '22023';
  end if;

  -- Túi đồ: tối đa 40 món (data/items.json bag_size), độ hiếm thuộc 5 bậc
  v_tui := coalesce(jsonb_array_length(case when jsonb_typeof(p_data -> 'bag') = 'array' then p_data -> 'bag' end), 0);
  if v_tui > 40 then
    raise exception 'tui_qua_day' using errcode = '22023';
  end if;
  if exists (
    select 1 from jsonb_array_elements(coalesce(case when jsonb_typeof(p_data -> 'bag') = 'array' then p_data -> 'bag' end, '[]'::jsonb)) it
    where coalesce(it ->> 'rarity', '') not in ('pham', 'linh', 'huyen', 'dia', 'thien')
  ) then
    raise exception 'do_sai' using errcode = '22023';
  end if;

  select * into v_cu from public.p2d_nhan_vat where user_id = v_uid for update;

  if not found then
    -- Lần lưu đầu: chỉ nhận nhân vật mới bắt đầu (Luyện Khí, tầng thấp)
    if v_canh_gioi > 0 or v_tang > 3 then
      raise exception 'canh_gioi_sai' using errcode = '22023';
    end if;
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban)
    values (v_uid, p_data, v_canh_gioi, v_tang, 1);
    return 1;
  end if;

  if p_phien_ban is distinct from v_cu.phien_ban then
    raise exception 'phien_ban_cu' using errcode = 'P0001';
  end if;

  -- Mỗi lần lưu lên tối đa một cảnh giới (lên cảnh giới phải qua thiên kiếp, từng bậc một);
  -- trong một cảnh giới thì nhảy nhiều tầng là hợp lệ (đả tọa khi vắng mặt, đan linh khí)
  if v_canh_gioi > v_cu.canh_gioi + 1 then
    raise exception 'canh_gioi_sai' using errcode = '22023';
  end if;

  update public.p2d_nhan_vat
     set data = p_data, canh_gioi = v_canh_gioi, tang = v_tang,
         phien_ban = v_cu.phien_ban + 1, updated_at = now()
   where user_id = v_uid;
  return v_cu.phien_ban + 1;
end;
$$;

