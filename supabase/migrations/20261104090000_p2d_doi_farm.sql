-- Tổ đội farm ngoài thế giới mở (chủ dự án chốt 04/11/2026). Tách riêng khỏi tổ đội bí cảnh (kênh Realtime p2d-to:<mã>,
-- src/net/party.js, không ghi cơ sở dữ liệu). Số ở đây khớp data/doi-farm.json (tools/check.mjs so max).
-- - p2d_doi: mỗi tổ đội một dòng. Tên 2–16 ký tự (bỏ khoảng trắng đầu cuối, gộp khoảng trắng giữa), không trùng trên cả máy chủ
--   (không phân biệt hoa thường), vì thành viên đi khắp các tinh cầu. che_do 'mo' (vào thẳng) hoặc 'duyet' (đội trưởng duyệt).
--   ban_do: tinh cầu đội trưởng đang đứng (chỉ để xem).
-- - p2d_doi_tv: thành viên; user_id là khoá chính nên mỗi người chỉ ở một tổ đội. ban_do, nhip_luc do nhịp tổ đội ghi.
-- - p2d_doi_xin: xin vào tổ đội đang duyệt; hết hạn sau 10 phút hoặc khi người xin mất nhịp sống (p2d_nhip) quá 60 giây.
-- - Mất nhịp tổ đội quá 60 giây là coi như thoát game: tự rời đội. Đội trưởng rời / mất nhịp thì người vào sớm nhất làm đội trưởng;
--   hết người thì giải tán. Dọn ở p2d_doi_don, chạy mỗi lần gọi hàm tổ đội.
-- - Máy khách không đọc / ghi thẳng (RLS bật, không có chính sách). Mọi hàm security definer, gọi qua p2d_uid (người bị cấm
--   không dùng được), khoá chung pg_advisory_xact_lock để đếm người, đổi đội trưởng không đua nhau.
-- - Thưởng +10% Linh Thạch / linh khí mỗi người cùng tinh cầu do máy khách tính (src/game/farm-team-bonus.js); hạn mức ngày ở
--   p2d_luu, p2d_tran_ngay giữ nguyên, không đổi ở đây.
-- - Thành viên gọi bằng mã công khai k (p2d_chat_key), không lộ mã tài khoản. Tên hiển thị lấy tên đặt trong game, chưa có thì
--   tên mặc định "Đạo hữu XXXX" (không dùng p2d_ten_nguoi vì hàm đó lấy phần đầu email khi chưa có bản lưu: lộ tên đăng nhập).

create table if not exists public.p2d_doi (
  id      bigint generated always as identity primary key,
  ten     text not null check (char_length(ten) between 2 and 16),
  truong  uuid not null references auth.users (id) on delete cascade,
  che_do  text not null default 'mo' check (che_do in ('mo', 'duyet')),
  ban_do  text,
  tao_luc timestamptz not null default now()
);
create unique index if not exists p2d_doi_ten_idx on public.p2d_doi (lower(ten));
alter table public.p2d_doi enable row level security;
revoke all on table public.p2d_doi from anon, authenticated;

create table if not exists public.p2d_doi_tv (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  doi_id   bigint not null references public.p2d_doi (id) on delete cascade,
  vao_luc  timestamptz not null default now(),
  ban_do   text,
  nhip_luc timestamptz not null default now()
);
create index if not exists p2d_doi_tv_doi_idx on public.p2d_doi_tv (doi_id, vao_luc);
create index if not exists p2d_doi_tv_nhip_idx on public.p2d_doi_tv (nhip_luc);
alter table public.p2d_doi_tv enable row level security;
revoke all on table public.p2d_doi_tv from anon, authenticated;

create table if not exists public.p2d_doi_xin (
  doi_id  bigint not null references public.p2d_doi (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  luc     timestamptz not null default now(),
  primary key (doi_id, user_id)
);
create index if not exists p2d_doi_xin_user_idx on public.p2d_doi_xin (user_id);
alter table public.p2d_doi_xin enable row level security;
revoke all on table public.p2d_doi_xin from anon, authenticated;

-- Tên hiển thị (nội bộ)
create or replace function public.p2d_doi_ten(p_uid uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select coalesce((select nullif(n.ten, '') from public.p2d_nhan_vat n where n.user_id = p_uid), public.p2d_ten_mac_dinh(p_uid));
$$;

-- Mã tinh cầu hợp lệ (nội bộ): chữ thường, số, gạch nối, tối đa 40
create or replace function public.p2d_doi_bd(p_ban_do text)
returns text language plpgsql immutable set search_path = ''
as $$
begin
  if p_ban_do is null or p_ban_do !~ '^[a-z0-9-]{1,40}$' then raise exception 'ban_do_sai' using errcode = '22023'; end if;
  return p_ban_do;
end;
$$;

-- Dọn (nội bộ): bỏ người mất nhịp quá 60 giây, lời xin cũ; đổi đội trưởng cho đội mất đội trưởng; giải tán đội trống
create or replace function public.p2d_doi_don()
returns void language plpgsql security definer set search_path = ''
as $$
begin
  delete from public.p2d_doi_tv t where t.nhip_luc < now() - interval '60 seconds';
  delete from public.p2d_doi_xin x
   where x.luc < now() - interval '10 minutes'
      or exists (select 1 from public.p2d_doi_tv t where t.user_id = x.user_id)
      or not exists (select 1 from public.p2d_nhip h where h.user_id = x.user_id and h.luc > now() - interval '60 seconds');
  update public.p2d_doi d
     set truong = (select t.user_id from public.p2d_doi_tv t where t.doi_id = d.id order by t.vao_luc, t.user_id limit 1)
   where not exists (select 1 from public.p2d_doi_tv t where t.doi_id = d.id and t.user_id = d.truong)
     and exists (select 1 from public.p2d_doi_tv t where t.doi_id = d.id);
  delete from public.p2d_doi d where not exists (select 1 from public.p2d_doi_tv t where t.doi_id = d.id);
end;
$$;

-- Trạng thái trả về máy khách (nội bộ): các tổ đội có người đang ở tinh cầu p_ban_do, và tổ đội của mình
create or replace function public.p2d_doi_tt(p_uid uuid, p_ban_do text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_doi public.p2d_doi%rowtype;
  v_ds  jsonb;
  v_toi jsonb := null;
begin
  select d.* into v_doi from public.p2d_doi d join public.p2d_doi_tv t on t.doi_id = d.id where t.user_id = p_uid;
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ten', x.ten, 'che_do', x.che_do, 'n', x.n, 'o', x.o,
                                               'toi', coalesce(x.id = v_doi.id, false), 'xin', x.xin) order by x.o desc, x.n desc, x.tao_luc), '[]'::jsonb)
    into v_ds
    from (
      select d.id, d.ten, d.che_do, d.tao_luc, count(*) as n, count(*) filter (where t.ban_do = p_ban_do) as o,
             exists (select 1 from public.p2d_doi_xin x where x.doi_id = d.id and x.user_id = p_uid) as xin
        from public.p2d_doi d join public.p2d_doi_tv t on t.doi_id = d.id
       group by d.id
      having count(*) filter (where t.ban_do = p_ban_do) > 0
       order by 6 desc, 5 desc, d.tao_luc
       limit 50
    ) x;
  if v_doi.id is not null then
    v_toi := jsonb_build_object(
      'id', v_doi.id, 'ten', v_doi.ten, 'che_do', v_doi.che_do, 'truong', v_doi.truong = p_uid,
      'tv', (select coalesce(jsonb_agg(jsonb_build_object('k', public.p2d_chat_key(t.user_id), 'ten', public.p2d_doi_ten(t.user_id),
                                                          'truong', t.user_id = v_doi.truong, 'cung', coalesce(t.ban_do = p_ban_do, false),
                                                          'la_toi', t.user_id = p_uid) order by t.vao_luc, t.user_id), '[]'::jsonb)
               from public.p2d_doi_tv t where t.doi_id = v_doi.id),
      'xin', case when v_doi.truong = p_uid then
               (select coalesce(jsonb_agg(jsonb_build_object('k', public.p2d_chat_key(x.user_id), 'ten', public.p2d_doi_ten(x.user_id)) order by x.luc), '[]'::jsonb)
                  from public.p2d_doi_xin x where x.doi_id = v_doi.id)
             else '[]'::jsonb end);
  end if;
  return jsonb_build_object('ds', v_ds, 'toi', v_toi, 'max', 5);
end;
$$;

-- Nhịp tổ đội: máy khách gọi 10–15 giây một lần khi đã đăng nhập, báo tinh cầu đang đứng (cả bí cảnh, động phủ: khi đó
-- đồng đội thấy mình màu xám, không cộng thưởng). Trả trạng thái như p2d_doi_ds.
create or replace function public.p2d_doi_nhip(p_ban_do text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_bd  text := public.p2d_doi_bd(p_ban_do);
begin
  perform pg_advisory_xact_lock(73160401);
  update public.p2d_doi_tv t set ban_do = v_bd, nhip_luc = now() where t.user_id = v_uid;
  update public.p2d_doi d set ban_do = v_bd where d.truong = v_uid and d.ban_do is distinct from v_bd;
  perform public.p2d_doi_don();
  return public.p2d_doi_tt(v_uid, v_bd);
end;
$$;

-- Xem danh sách (không ghi nhịp), dùng ngay sau một thao tác
create or replace function public.p2d_doi_ds(p_ban_do text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_bd  text := public.p2d_doi_bd(p_ban_do);
begin
  perform pg_advisory_xact_lock(73160401);
  perform public.p2d_doi_don();
  return public.p2d_doi_tt(v_uid, v_bd);
end;
$$;

-- Lập tổ đội: mình làm đội trưởng, chế độ mở
create or replace function public.p2d_doi_lap(p_ten text, p_ban_do text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_bd  text := public.p2d_doi_bd(p_ban_do);
  v_ten text := regexp_replace(btrim(coalesce(p_ten, '')), '\s+', ' ', 'g');
  v_id  bigint;
begin
  if char_length(v_ten) < 2 or char_length(v_ten) > 16 then raise exception 'ten_dai' using errcode = '22023'; end if;
  if v_ten ~ '[[:cntrl:]<>]' then raise exception 'ten_sai' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(73160401);
  perform public.p2d_doi_don();
  if exists (select 1 from public.p2d_doi_tv t where t.user_id = v_uid) then raise exception 'da_co_doi' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_doi d where lower(d.ten) = lower(v_ten)) then raise exception 'trung_ten' using errcode = '22023'; end if;
  insert into public.p2d_doi (ten, truong, ban_do) values (v_ten, v_uid, v_bd) returning id into v_id;
  insert into public.p2d_doi_tv (user_id, doi_id, ban_do) values (v_uid, v_id, v_bd);
  delete from public.p2d_doi_xin x where x.user_id = v_uid;
  return jsonb_build_object('kq', 'lap', 'id', v_id);
end;
$$;

-- Chạm tên tổ đội: đội mở thì vào thẳng, đội duyệt thì gửi lời xin (tối đa 3 lời xin đang chờ mỗi người)
create or replace function public.p2d_doi_vao(p_doi bigint, p_ban_do text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_bd  text := public.p2d_doi_bd(p_ban_do);
  v_doi public.p2d_doi%rowtype;
begin
  perform pg_advisory_xact_lock(73160401);
  perform public.p2d_doi_don();
  if exists (select 1 from public.p2d_doi_tv t where t.user_id = v_uid) then raise exception 'da_co_doi' using errcode = '22023'; end if;
  select * into v_doi from public.p2d_doi d where d.id = p_doi;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_doi_tv t where t.doi_id = v_doi.id) >= 5 then raise exception 'day' using errcode = '22023'; end if;
  if v_doi.che_do = 'mo' then
    insert into public.p2d_doi_tv (user_id, doi_id, ban_do) values (v_uid, v_doi.id, v_bd);
    delete from public.p2d_doi_xin x where x.user_id = v_uid;
    return jsonb_build_object('kq', 'vao', 'id', v_doi.id);
  end if;
  if not exists (select 1 from public.p2d_doi_xin x where x.doi_id = v_doi.id and x.user_id = v_uid)
     and (select count(*) from public.p2d_doi_xin x where x.user_id = v_uid) >= 3 then
    raise exception 'xin_nhieu' using errcode = '22023';
  end if;
  insert into public.p2d_doi_xin as x (doi_id, user_id) values (v_doi.id, v_uid)
  on conflict (doi_id, user_id) do update set luc = now();
  return jsonb_build_object('kq', 'xin', 'id', v_doi.id);
end;
$$;

-- Đội trưởng nhận / từ chối lời xin (người xin gọi bằng mã k)
create or replace function public.p2d_doi_duyet(p_k text, p_nhan boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_doi bigint;
  v_ai  uuid;
begin
  perform pg_advisory_xact_lock(73160401);
  perform public.p2d_doi_don();
  select d.id into v_doi from public.p2d_doi d where d.truong = v_uid;
  if v_doi is null then raise exception 'khong_phai_truong' using errcode = '42501'; end if;
  select x.user_id into v_ai from public.p2d_doi_xin x where x.doi_id = v_doi and public.p2d_chat_key(x.user_id) = p_k;
  if v_ai is null then raise exception 'khong_co' using errcode = '22023'; end if;
  delete from public.p2d_doi_xin x where x.doi_id = v_doi and x.user_id = v_ai;
  if not coalesce(p_nhan, false) then return jsonb_build_object('kq', 'tu_choi'); end if;
  if exists (select 1 from public.p2d_doi_tv t where t.user_id = v_ai) then raise exception 'da_co_doi' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_doi_tv t where t.doi_id = v_doi) >= 5 then raise exception 'day' using errcode = '22023'; end if;
  insert into public.p2d_doi_tv (user_id, doi_id) values (v_ai, v_doi);   -- tinh cầu chưa biết: nhịp kế của người đó ghi
  delete from public.p2d_doi_xin x where x.user_id = v_ai;
  return jsonb_build_object('kq', 'nhan');
end;
$$;

-- Đội trưởng mời một thành viên ra khỏi đội
create or replace function public.p2d_doi_moi_ra(p_k text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_doi bigint;
  v_ai  uuid;
begin
  perform pg_advisory_xact_lock(73160401);
  perform public.p2d_doi_don();
  select d.id into v_doi from public.p2d_doi d where d.truong = v_uid;
  if v_doi is null then raise exception 'khong_phai_truong' using errcode = '42501'; end if;
  select t.user_id into v_ai from public.p2d_doi_tv t where t.doi_id = v_doi and t.user_id <> v_uid and public.p2d_chat_key(t.user_id) = p_k;
  if v_ai is null then raise exception 'khong_co' using errcode = '22023'; end if;
  delete from public.p2d_doi_tv t where t.user_id = v_ai;
  return jsonb_build_object('kq', 'moi_ra');
end;
$$;

-- Thoát tổ đội: đội trưởng thoát thì người vào sớm nhất lên thay, đội trống thì giải tán (p2d_doi_don)
create or replace function public.p2d_doi_roi()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
begin
  perform pg_advisory_xact_lock(73160401);
  delete from public.p2d_doi_tv t where t.user_id = v_uid;
  if not found then raise exception 'chua_co_doi' using errcode = '22023'; end if;
  perform public.p2d_doi_don();
  return jsonb_build_object('kq', 'roi');
end;
$$;

-- Đội trưởng đổi chế độ: 'mo' (ai chạm cũng vào) hoặc 'duyet'
create or replace function public.p2d_doi_che_do(p_che_do text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
begin
  if p_che_do is null or p_che_do not in ('mo', 'duyet') then raise exception 'che_do_sai' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(73160401);
  perform public.p2d_doi_don();
  update public.p2d_doi d set che_do = p_che_do where d.truong = v_uid;
  if not found then raise exception 'khong_phai_truong' using errcode = '42501'; end if;
  return jsonb_build_object('kq', 'che_do', 'che_do', p_che_do);
end;
$$;

revoke all on function public.p2d_doi_ten(uuid) from public, anon, authenticated;
revoke all on function public.p2d_doi_bd(text) from public, anon, authenticated;
revoke all on function public.p2d_doi_don() from public, anon, authenticated;
revoke all on function public.p2d_doi_tt(uuid, text) from public, anon, authenticated;
revoke all on function public.p2d_doi_nhip(text) from public, anon;
revoke all on function public.p2d_doi_ds(text) from public, anon;
revoke all on function public.p2d_doi_lap(text, text) from public, anon;
revoke all on function public.p2d_doi_vao(bigint, text) from public, anon;
revoke all on function public.p2d_doi_duyet(text, boolean) from public, anon;
revoke all on function public.p2d_doi_moi_ra(text) from public, anon;
revoke all on function public.p2d_doi_roi() from public, anon;
revoke all on function public.p2d_doi_che_do(text) from public, anon;
grant execute on function public.p2d_doi_nhip(text) to authenticated;
grant execute on function public.p2d_doi_ds(text) to authenticated;
grant execute on function public.p2d_doi_lap(text, text) to authenticated;
grant execute on function public.p2d_doi_vao(bigint, text) to authenticated;
grant execute on function public.p2d_doi_duyet(text, boolean) to authenticated;
grant execute on function public.p2d_doi_moi_ra(text) to authenticated;
grant execute on function public.p2d_doi_roi() to authenticated;
grant execute on function public.p2d_doi_che_do(text) to authenticated;
