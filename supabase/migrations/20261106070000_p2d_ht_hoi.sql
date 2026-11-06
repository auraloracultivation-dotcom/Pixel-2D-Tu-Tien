-- Hỏi thêm trong Hệ Thống (chủ dự án 06/11/2026 16:15): người chơi gõ câu hỏi chưa có trong Hỏi đáp, máy chủ ghi lại để Claude đọc
-- và bổ sung data/faq.json. Mỗi người tối đa 10 câu / ngày, mỗi câu 4–300 chữ. Không thưởng (khác góp ý báo lỗi).
create table if not exists public.p2d_ht_hoi (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  cau_hoi text not null,
  buoc integer,
  luc timestamptz not null default now(),
  tra_loi text
);
create index if not exists p2d_ht_hoi_user_idx on public.p2d_ht_hoi (user_id, luc desc);
alter table public.p2d_ht_hoi enable row level security;
revoke all on table public.p2d_ht_hoi from public, anon, authenticated;

create or replace function public.p2d_ht_hoi_gui(p_cau text, p_buoc integer default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c text := btrim(coalesce(p_cau, ''));
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if length(v_c) < 4 then raise exception 'ngan' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_ht_hoi h where h.user_id = v_uid and h.luc > now() - interval '1 day') >= 10 then raise exception 'qua_nhieu' using errcode = '22023'; end if;
  insert into public.p2d_ht_hoi (user_id, cau_hoi, buoc) values (v_uid, left(v_c, 300), p_buoc);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.p2d_ht_hoi_gui(text, integer) from public, anon;
grant execute on function public.p2d_ht_hoi_gui(text, integer) to authenticated;

create or replace function public.p2d_ht_hoi_cua_toi()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce(jsonb_agg(jsonb_build_object('q', cau_hoi, 'a', tra_loi, 'luc', luc) order by luc desc), '[]'::jsonb)
  from (select cau_hoi, tra_loi, luc from public.p2d_ht_hoi where user_id = public.p2d_uid() order by luc desc limit 10) s $$;
revoke all on function public.p2d_ht_hoi_cua_toi() from public, anon;
grant execute on function public.p2d_ht_hoi_cua_toi() to authenticated;
