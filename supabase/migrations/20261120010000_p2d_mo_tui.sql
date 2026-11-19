-- Mở thêm ô túi đồ bằng Linh Thạch (chủ dự án 20/11/2026 00:43, data/items.json → bag_extra): túi 40 ô, mở thêm tối đa 40 ô (tổng 80),
-- ô thứ 41 giá 10 000 Linh Thạch, mỗi ô sau × 2. Máy chủ giữ số ô đã mở ở p2d_nhan_vat.tui_mo (máy khách không tự tăng được);
-- p2d_luu và p2d_nhan_thu_moi tính sức chứa = 40 + tui_mo. Bài thử: tools/kiem/thu-luu.mjs (lưu) trước và sau khi áp.

alter table public.p2d_nhan_vat add column if not exists tui_mo integer not null default 0;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'p2d_nhan_vat_tui_mo_chk') then
    alter table public.p2d_nhan_vat add constraint p2d_nhan_vat_tui_mo_chk check (tui_mo between 0 and 40);
  end if;
end $$;

-- p2d_luu: túi lố 40 + tui_mo mới từ chối (trước: lố 40)
do $$
declare v_def text := pg_get_functiondef('public.p2d_luu'::regproc);
  v_cu text := 'if v_tui > 40 then raise exception ''tui_qua_day''';
  v_moi text := 'if v_tui > 40 + coalesce((select n.tui_mo from public.p2d_nhan_vat n where n.user_id = v_uid), 0) then raise exception ''tui_qua_day''';
begin
  if position('n.tui_mo from public.p2d_nhan_vat' in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_cu, ''))) / length(v_cu) <> 1 then raise exception 'p2d_luu: không thấy đúng một chỗ kiểm túi'; end if;
  execute replace(v_def, v_cu, v_moi);
end $$;

-- p2d_nhan_thu_moi: chỗ trống nhận món qua thư = 40 + tui_mo - số món
do $$
declare v_def text := pg_get_functiondef('public.p2d_nhan_thu_moi'::regproc);
  v_cu text := 'v_cho := 40 - coalesce(';
  v_moi text := 'v_cho := 40 + coalesce(v_nv.tui_mo, 0) - coalesce(';
begin
  if position(v_moi in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_cu, ''))) / length(v_cu) <> 1 then raise exception 'p2d_nhan_thu_moi: không thấy đúng một chỗ kiểm túi'; end if;
  execute replace(v_def, v_cu, v_moi);
end $$;

create or replace function public.p2d_mo_tui()
returns jsonb
language plpgsql
security definer
set search_path to ''
as $function$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_lt numeric; v_gia bigint;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.tui_mo >= 40 then raise exception 'tui_toi_da' using errcode = '22023'; end if;
  v_gia := (10000 * power(2, v_nv.tui_mo))::bigint;
  v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
  if v_lt < v_gia then raise exception 'thieu_lt' using errcode = '22023'; end if;
  perform set_config('p2d.ly_do', 'mo_tui', true);
  update public.p2d_nhan_vat
     set data = jsonb_set(jsonb_set(data, '{lingshi}', to_jsonb(v_lt - v_gia)), '{tuiMo}', to_jsonb(v_nv.tui_mo + 1)),
         tui_mo = v_nv.tui_mo + 1, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid
   returning phien_ban into v_nv.phien_ban;
  return jsonb_build_object('tui_mo', v_nv.tui_mo + 1, 'gia', v_gia, 'phien_ban', v_nv.phien_ban);
end;
$function$;
revoke all on function public.p2d_mo_tui() from public, anon;
grant execute on function public.p2d_mo_tui() to authenticated;
