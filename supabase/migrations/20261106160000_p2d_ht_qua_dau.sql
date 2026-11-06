-- Quà gặp mặt Hệ Thống (chủ dự án 06/11/2026 22:59: "ai mới chơi hoặc lần đầu gặp hệ thống cũng được 1000 điểm hệ thống").
-- Mỗi tài khoản một lần (cột qua_dau), số điểm ở p2d_ht_cfg 'cfg' → qua_dau (chép từ data/he-thong.json → qua_dau.diem).
alter table public.p2d_ht_diem add column if not exists qua_dau timestamptz;
update public.p2d_ht_cfg set v = v || '{"qua_dau": 1000}'::jsonb where k = 'cfg';

create or replace function public.p2d_ht_qua_dau()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_n int := coalesce(((select v from public.p2d_ht_cfg where k = 'cfg') ->> 'qua_dau')::int, 0); v_row public.p2d_ht_diem%rowtype;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if not exists (select 1 from public.p2d_nhan_vat where user_id = v_uid) then return jsonb_build_object('them', 0); end if;   -- chưa có nhân vật
  insert into public.p2d_ht_diem (user_id) values (v_uid) on conflict (user_id) do nothing;
  update public.p2d_ht_diem set diem = diem + v_n, qua_dau = now(), luc = now() where user_id = v_uid and qua_dau is null returning * into v_row;
  if not found then return jsonb_build_object('them', 0); end if;
  return jsonb_build_object('them', v_n, 'diem', v_row.diem);
end;
$$;
revoke all on function public.p2d_ht_qua_dau() from public, anon;
grant execute on function public.p2d_ht_qua_dau() to authenticated;
