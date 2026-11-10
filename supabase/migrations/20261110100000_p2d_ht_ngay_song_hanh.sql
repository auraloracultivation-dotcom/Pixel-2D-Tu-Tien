-- Nhiệm vụ ngày song hành với nhiệm vụ hệ thống (chủ dự án 10/11/2026 09:47: "nhiệm vụ hàng ngày song hành cùng chính tuyến đi,
-- mới fix linh khí rồi, khó hoàn thành hết lắm"): bỏ điều kiện phải làm xong hết nhiệm vụ hệ thống (lỗi 'chua_het'). Còn lại giữ nguyên.

create or replace function public.p2d_ht_ngay(p_task text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype; v_d jsonb;
  v_today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_day date; v_t jsonb; v_pt int := (c ->> 'points')::int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if not c -> 'daily' ? p_task then raise exception 'khong_co' using errcode = '22023'; end if;
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if v_row.ngay is distinct from v_today then v_row.ngay_xong := '{}'; end if;
  if p_task = any (v_row.ngay_xong) then raise exception 'da_nhan' using errcode = '22023'; end if;
  if coalesce(array_length(v_row.ngay_xong, 1), 0) >= (c ->> 'per_day')::int then raise exception 'het_luot' using errcode = '22023'; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  begin v_day := to_date(v_d -> 'daily' ->> 'day', 'YYYY-MM-DD'); exception when others then v_day := null; end;
  if v_day is null or abs(v_day - v_today) > 1 then raise exception 'chua_xong' using errcode = '22023'; end if;
  select t into v_t from jsonb_array_elements(case when jsonb_typeof(v_d -> 'daily' -> 'tasks') = 'array' then v_d -> 'daily' -> 'tasks' else '[]'::jsonb end) t where t ->> 'id' = p_task limit 1;
  if v_t is null or coalesce((v_t ->> 'n')::numeric, 0) < (c -> 'daily' ->> p_task)::numeric then raise exception 'chua_xong' using errcode = '22023'; end if;
  update public.p2d_ht_diem set diem = diem + v_pt, ngay = v_today, ngay_xong = array_append(v_row.ngay_xong, p_task), luc = now() where user_id = v_uid returning * into v_row;
  return jsonb_build_object('diem', v_row.diem, 'ngay_xong', to_jsonb(v_row.ngay_xong), 'them', v_pt);
end;
$$;
revoke all on function public.p2d_ht_ngay(text) from public, anon;
grant execute on function public.p2d_ht_ngay(text) to authenticated;
