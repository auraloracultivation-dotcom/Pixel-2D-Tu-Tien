-- Bảng xếp hạng 3 tab: lực chiến, cảnh giới, tầng tháp cao nhất.
-- Ba cột mới do trigger tự điền từ bản lưu (máy khách không ghi thẳng cột nào); tên lấy phần trước @ của email.
-- Cuối mỗi tuần (giờ Việt Nam, tuần bắt đầu thứ Hai) chốt top 10 mỗi tab vào p2d_bxh_tuan để trao danh hiệu
-- (chỉ để trưng, không có chỉ số). Việc chốt chạy lười: lần gọi p2d_bxh đầu tiên của tuần mới sẽ chốt tuần trước.

alter table public.p2d_nhan_vat
  add column if not exists ten       text    not null default '',
  add column if not exists luc_chien integer not null default 0,
  add column if not exists thap      integer not null default 0;

create or replace function public.p2d_dien_bxh()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.luc_chien := case when jsonb_typeof(new.data -> 'power') = 'number'
                        then least(greatest((new.data ->> 'power')::numeric, 0), 100000000)::integer else 0 end;
  new.thap := case when jsonb_typeof(new.data -> 'tower' -> 'best') = 'number'
                   then least(greatest((new.data -> 'tower' ->> 'best')::numeric, 0), 100000)::integer else 0 end;
  if new.ten = '' then
    select left(split_part(coalesce(u.email, ''), '@', 1), 24) into new.ten from auth.users u where u.id = new.user_id;
    new.ten := coalesce(nullif(new.ten, ''), 'Đạo hữu');
  end if;
  return new;
end;
$$;

revoke all on function public.p2d_dien_bxh() from public, anon, authenticated;

drop trigger if exists p2d_nhan_vat_bxh on public.p2d_nhan_vat;
create trigger p2d_nhan_vat_bxh before insert or update of data on public.p2d_nhan_vat
  for each row execute function public.p2d_dien_bxh();

update public.p2d_nhan_vat set data = data;   -- điền cột cho các dòng có sẵn

create index if not exists p2d_nhan_vat_luc_chien_idx on public.p2d_nhan_vat (luc_chien desc);
create index if not exists p2d_nhan_vat_thap_idx on public.p2d_nhan_vat (thap desc);

-- Top 10 đã chốt của từng tuần
create table if not exists public.p2d_bxh_tuan (
  tuan    date     not null,
  loai    text     not null check (loai in ('luc_chien', 'canh_gioi', 'thap')),
  hang    smallint not null check (hang between 1 and 10),
  user_id uuid     not null references auth.users (id) on delete cascade,
  ten     text     not null,
  primary key (tuan, loai, hang)
);
create index if not exists p2d_bxh_tuan_user_idx on public.p2d_bxh_tuan (user_id, tuan);

alter table public.p2d_bxh_tuan enable row level security;
revoke all on table public.p2d_bxh_tuan from anon, authenticated;

create or replace function public.p2d_tuan_nay()
returns date
language sql
stable
set search_path = ''
as $$ select date_trunc('week', now() at time zone 'Asia/Ho_Chi_Minh')::date; $$;

-- Danh sách xếp hạng theo tab, dùng nội bộ (máy khách không gọi trực tiếp, nên không lộ user_id)
create or replace function public.p2d_xep(p_loai text, p_gioi_han integer)
returns table (hang bigint, user_id uuid, ten text, gia_tri bigint, canh_gioi smallint, tang smallint)
language sql
stable
security definer
set search_path = ''
as $$
  select row_number() over (order by
           case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                       else n.canh_gioi::bigint * 10 + n.tang end desc,
           n.updated_at asc) as hang,
         n.user_id, n.ten,
         case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                     else n.canh_gioi::bigint * 10 + n.tang end as gia_tri,
         n.canh_gioi, n.tang
  from public.p2d_nhan_vat n
  where p_loai <> 'thap' or n.thap > 0
  order by 1
  limit p_gioi_han;
$$;
revoke all on function public.p2d_xep(text, integer) from public, anon, authenticated;

-- Chốt tuần trước nếu chưa chốt (gọi lười từ p2d_bxh)
create or replace function public.p2d_chot_tuan()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tuan date := public.p2d_tuan_nay() - 7;
  v_loai text;
begin
  if exists (select 1 from public.p2d_bxh_tuan where tuan = v_tuan) then return; end if;
  perform pg_advisory_xact_lock(hashtext('p2d_chot_tuan'));
  if exists (select 1 from public.p2d_bxh_tuan where tuan = v_tuan) then return; end if;
  foreach v_loai in array array['luc_chien', 'canh_gioi', 'thap'] loop
    insert into public.p2d_bxh_tuan (tuan, loai, hang, user_id, ten)
    select v_tuan, v_loai, x.hang, x.user_id, x.ten from public.p2d_xep(v_loai, 10) x
    on conflict do nothing;
  end loop;
end;
$$;
revoke all on function public.p2d_chot_tuan() from public, anon, authenticated;

-- Máy khách gọi: top 50 của một tab, hạng của mình, và danh hiệu tuần này của mình
create or replace function public.p2d_bxh(p_loai text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_top jsonb;
  v_toi jsonb;
  v_dh  jsonb;
begin
  if v_uid is null then
    raise exception 'chua_dang_nhap' using errcode = '28000';
  end if;
  if p_loai not in ('luc_chien', 'canh_gioi', 'thap') then
    raise exception 'loai_sai' using errcode = '22023';
  end if;
  perform public.p2d_chot_tuan();

  select coalesce(jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri,
           'canh_gioi', x.canh_gioi, 'tang', x.tang, 'la_toi', x.user_id = v_uid) order by x.hang), '[]'::jsonb)
    into v_top from public.p2d_xep(p_loai, 50) x;

  select jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri, 'canh_gioi', x.canh_gioi, 'tang', x.tang)
    into v_toi from public.p2d_xep(p_loai, 100000) x where x.user_id = v_uid;

  select coalesce(jsonb_agg(jsonb_build_object('loai', t.loai, 'hang', t.hang)), '[]'::jsonb)
    into v_dh from public.p2d_bxh_tuan t
   where t.user_id = v_uid and t.tuan = public.p2d_tuan_nay() - 7;

  return jsonb_build_object('top', v_top, 'toi', v_toi, 'danh_hieu', v_dh, 'tuan', public.p2d_tuan_nay());
end;
$$;

revoke all on function public.p2d_bxh(text) from public, anon;
grant execute on function public.p2d_bxh(text) to authenticated;
