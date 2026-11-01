-- Kết bạn và thăm nhà bạn (chủ dự án chốt 02/11/2026, nhóm B Bạn bè + nhóm E khung bạn bè trước cửa động phủ).
-- p2d_ban_be: một dòng (a gửi lời mời cho b); trang_thai 'cho' (chờ b đồng ý) hoặc 'ban' (đã là bạn). Người chơi chỉ dùng
-- mã công khai k (p2d_chat_key), không thấy mã tài khoản. Tối đa 100 bạn, tối đa 30 lời mời đang chờ do mình gửi.
-- p2d_tham_nha(k): chỉ bạn bè mới xem được: tên, đồ trang trí động phủ (data.decor), hình nhân vật. Chỉ đọc.

create table if not exists public.p2d_ban_be (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  trang_thai text not null default 'cho' check (trang_thai in ('cho', 'ban')),
  luc timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create index if not exists p2d_ban_be_b on public.p2d_ban_be (b);
alter table public.p2d_ban_be enable row level security;
revoke all on public.p2d_ban_be from anon, authenticated;

create or replace function public.p2d_bb_tim(p_k text)
returns uuid language sql stable security definer set search_path = ''
as $$ select n.user_id from public.p2d_nhan_vat n where public.p2d_chat_key(n.user_id) = p_k limit 1 $$;
revoke all on function public.p2d_bb_tim(text) from public, anon, authenticated;

create or replace function public.p2d_bb_la_ban(p_x uuid, p_y uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.p2d_ban_be where trang_thai = 'ban' and ((a = p_x and b = p_y) or (a = p_y and b = p_x))) $$;
revoke all on function public.p2d_bb_la_ban(uuid, uuid) from public, anon, authenticated;

-- Gửi lời mời; người kia đã mời mình thì thành bạn luôn
create or replace function public.p2d_ket_ban(p_k text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_b uuid := public.p2d_bb_tim(p_k);
begin
  if v_b is null then raise exception 'khong_thay' using errcode = '22023'; end if;
  if v_b = v_uid then raise exception 'chinh_minh' using errcode = '22023'; end if;
  if public.p2d_bb_la_ban(v_uid, v_b) then return 'da_la_ban'; end if;
  if (select count(*) from public.p2d_ban_be where trang_thai = 'ban' and (a = v_uid or b = v_uid)) >= 100 then raise exception 'qua_nhieu_ban' using errcode = '22023'; end if;
  update public.p2d_ban_be set trang_thai = 'ban', luc = now() where a = v_b and b = v_uid and trang_thai = 'cho';
  if found then return 'thanh_ban'; end if;
  if (select count(*) from public.p2d_ban_be where a = v_uid and trang_thai = 'cho') >= 30 then raise exception 'qua_nhieu_loi_moi' using errcode = '22023'; end if;
  insert into public.p2d_ban_be (a, b) values (v_uid, v_b) on conflict do nothing;
  return 'da_gui';
end;
$$;
revoke all on function public.p2d_ket_ban(text) from public, anon;
grant execute on function public.p2d_ket_ban(text) to authenticated;

-- Huỷ bạn / từ chối / rút lời mời
create or replace function public.p2d_huy_ban(p_k text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_b uuid := public.p2d_bb_tim(p_k);
begin
  delete from public.p2d_ban_be where (a = v_uid and b = v_b) or (a = v_b and b = v_uid);
  return found;
end;
$$;
revoke all on function public.p2d_huy_ban(text) from public, anon;
grant execute on function public.p2d_huy_ban(text) to authenticated;

-- Danh sách: bạn ('ban'), người mời mình ('moi_toi'), mình đã mời ('toi_moi')
create or replace function public.p2d_ban_be_ds()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object('k', public.p2d_chat_key(n.user_id), 'ten', n.ten, 'canh_gioi', n.canh_gioi, 'tang', n.tang,
                                        'trang_thai', x.tt) order by x.tt, n.ten)
      from (select case when f.trang_thai = 'ban' then 'ban' when f.a = v_uid then 'toi_moi' else 'moi_toi' end as tt,
                   case when f.a = v_uid then f.b else f.a end as ai
              from public.p2d_ban_be f where f.a = v_uid or f.b = v_uid) x
      join public.p2d_nhan_vat n on n.user_id = x.ai), '[]'::jsonb);
end;
$$;
revoke all on function public.p2d_ban_be_ds() from public, anon;
grant execute on function public.p2d_ban_be_ds() to authenticated;

-- Thăm nhà bạn: đồ trang trí (chỉ khoá: giá trị 1), hình nhân vật
create or replace function public.p2d_tham_nha(p_k text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_b uuid := public.p2d_bb_tim(p_k); n public.p2d_nhan_vat%rowtype;
begin
  if v_b is null or not public.p2d_bb_la_ban(v_uid, v_b) then raise exception 'chua_la_ban' using errcode = '22023'; end if;
  select * into n from public.p2d_nhan_vat where user_id = v_b;
  return jsonb_build_object('ten', n.ten,
    'decor', coalesce((select jsonb_object_agg(e.key, 1) from jsonb_each(case when jsonb_typeof(n.data -> 'decor') = 'object' then n.data -> 'decor' else '{}'::jsonb end) e
                        where e.key ~ '^[a-z0-9-]{1,40}$'), '{}'::jsonb),
    'look', n.data ->> 'look', 'outfit', n.data ->> 'outfit');
end;
$$;
revoke all on function public.p2d_tham_nha(text) from public, anon;
grant execute on function public.p2d_tham_nha(text) to authenticated;
