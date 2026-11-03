-- Bảng xếp hạng Sát thương/giây (chủ dự án chốt 04/11/2026, góp ý #114). Người chơi đánh Mộc Nhân trong động phủ đủ 60 giây
-- liền; máy khách tính sát thương/giây = tổng sát thương ÷ 60 (src/game/dummy.js) rồi gửi kết quả cao nhất lên đây.
-- - p2d_dps: mỗi người một dòng, giữ kết quả cao nhất. Máy khách không đọc / ghi thẳng (RLS bật, không có chính sách).
-- - p2d_gui_dps(p_dps): cần đăng nhập, không bị cấm (p2d_uid), đã có bản lưu; 55 giây mới gửi một lần (một lượt đo là 60 giây);
--   chặn số vô lý: không quá 5 lần lực chiến đang lưu (tối thiểu tính như lực chiến 1000). Lực chiến do p2d_luu đã kẹp theo cảnh giới.
-- - p2d_bxh_dps(): chỉ đọc, top 2000 và hạng của mình, cùng dạng với p2d_bxh2_het; bỏ người đang bị cấm và tài khoản Thiên Ma,
--   cờ nghi vấn (nghi_van >= 10) trả co như các bảng khác.

create table if not exists public.p2d_dps (
  user_id uuid primary key references auth.users (id) on delete cascade,
  dps     bigint not null default 0 check (dps >= 0),
  luc     timestamptz not null default now(),   -- lúc đạt kết quả cao nhất (hoà điểm thì ai đạt trước đứng trên)
  gui_luc timestamptz not null default now()    -- lần gửi gần nhất (giới hạn 55 giây)
);
create index if not exists p2d_dps_xep_idx on public.p2d_dps (dps desc, luc asc);
alter table public.p2d_dps enable row level security;
revoke all on table public.p2d_dps from anon, authenticated;

create or replace function public.p2d_gui_dps(p_dps bigint)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := public.p2d_uid();
  v_luc  bigint;
  v_cu   public.p2d_dps%rowtype;
  v_best bigint;
begin
  select coalesce(n.luc_chien, 0)::bigint into v_luc from public.p2d_nhan_vat n where n.user_id = v_uid;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if p_dps is null or p_dps < 1 then raise exception 'so_sai' using errcode = '22023'; end if;
  if p_dps > greatest(v_luc, 1000) * 5 then raise exception 'qua_muc' using errcode = '22023'; end if;
  select * into v_cu from public.p2d_dps d where d.user_id = v_uid for update;
  if found and v_cu.gui_luc > now() - interval '55 seconds' then raise exception 'cham_lai' using errcode = '22023'; end if;
  insert into public.p2d_dps as d (user_id, dps, luc, gui_luc) values (v_uid, p_dps, now(), now())
  on conflict (user_id) do update
    set dps = greatest(d.dps, excluded.dps),
        luc = case when excluded.dps > d.dps then now() else d.luc end,
        gui_luc = now()
  returning d.dps into v_best;
  return jsonb_build_object('dps', v_best, 'moi', v_best = p_dps);
end;
$$;

create or replace function public.p2d_bxh_dps()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_top jsonb;
  v_toi jsonb;
begin
  with diem as (
    select d.user_id, d.dps as gia_tri, d.luc,
           coalesce(nullif(n.ten, ''), public.p2d_ten_mac_dinh(d.user_id)) as ten,
           n.canh_gioi, n.tang, coalesce(n.nghi_van >= 10, false) as co
      from public.p2d_dps d
      left join public.p2d_nhan_vat n on n.user_id = d.user_id
     where d.dps > 0
       and not exists (select 1 from auth.users u where u.id = d.user_id and u.banned_until > now())
       and not exists (select 1 from public.p2d_thien_ma tm where tm.user_id = d.user_id)
  ), xep as (
    select row_number() over (order by x.gia_tri desc, x.luc asc) as hang, x.* from diem x
  )
  select coalesce((select jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'canh_gioi', x.canh_gioi,
                                                       'tang', x.tang, 'co', x.co, 'la_toi', x.user_id = v_uid,
                                                       'k', public.p2d_chat_key(x.user_id)) order by x.hang)
                     from xep x where x.hang <= 2000), '[]'::jsonb),
         (select jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'co', x.co, 'k', public.p2d_chat_key(x.user_id))
            from xep x where x.user_id = v_uid)
    into v_top, v_toi;
  return jsonb_build_object('top', v_top, 'toi', v_toi);
end;
$$;

revoke all on function public.p2d_gui_dps(bigint) from public, anon;
revoke all on function public.p2d_bxh_dps() from public, anon;
grant execute on function public.p2d_gui_dps(bigint) to authenticated;
grant execute on function public.p2d_bxh_dps() to authenticated;
