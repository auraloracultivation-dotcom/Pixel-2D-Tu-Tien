-- Tông môn người chơi (chủ dự án chốt 27/10/2026; điều kiện 28/10: Kim Đan, 20.000 Linh Thạch, tối đa 30 người).
-- Lập, xin vào (tông môn mở thì vào thẳng, đóng thì chờ duyệt), 4 chức vụ, mời ra, nhường chức, rời, giải tán,
-- chat tông môn (kênh p2d_chat 'bang:<id>'), việc tuần: điểm danh + góp Linh Thạch → điểm tuần, đủ mốc thì mỗi người nhận thưởng.
-- Mọi thao tác qua hàm có kiểm tra; Linh Thạch trừ/cộng thẳng trong bản lưu trên máy chủ và tăng phien_ban (như chợ).
-- Thứ tự khoá dòng ở mọi hàm: p2d_nhan_vat → p2d_bang → p2d_bang_tv (tránh khoá chéo).
-- Câu xoá trong thân hàm viết dạng "with x as (delete ... returning 1)": chỉ chạy khi người chơi rời tông môn, huỷ lời xin...
-- Số liệu ở p2d_bang_cfg, khớp data/guild.json (tools/check.mjs so sánh).

alter table public.p2d_nhan_vat
  add column if not exists bang_roi_luc timestamptz,                         -- lần rời tông môn gần nhất (chờ leave_hours mới vào nơi khác)
  add column if not exists bang_thuong jsonb not null default '{}'::jsonb;   -- mốc thưởng tuần đã nhận: {"tuan": "2026-10-26", "moc": [0, 1]}

create table if not exists public.p2d_bang_cfg (k text primary key, v jsonb not null);
insert into public.p2d_bang_cfg (k, v) values ('cfg', '{"need_realm": 2, "cost": 20000, "max": 30, "max_pho": 2, "max_lao": 5, "checkin": 10, "donate": {"per": 100, "day_max": 50}, "min_pts": 10, "leave_hours": 24, "milestones": [{"pts": 200, "coins": 1500, "stones": 1}, {"pts": 600, "coins": 3000, "stones": 2}, {"pts": 1200, "coins": 6000, "stones": 3}]}'::jsonb)
on conflict (k) do update set v = excluded.v;
alter table public.p2d_bang_cfg enable row level security;
revoke all on table public.p2d_bang_cfg from anon, authenticated;

create table if not exists public.p2d_bang (
  id        uuid primary key default gen_random_uuid(),
  ten       text not null check (char_length(ten) between 2 and 16),
  mo_ta     text not null default '' check (char_length(mo_ta) <= 60),
  mo        boolean not null default true,                                 -- ai cũng vào được, không cần duyệt
  chu       uuid references auth.users (id) on delete set null,
  diem_tuan integer not null default 0,
  tuan      date not null default public.p2d_tuan_nay(),
  tao_luc   timestamptz not null default now()
);
create unique index if not exists p2d_bang_ten_idx on public.p2d_bang (lower(ten));
create index if not exists p2d_bang_diem_idx on public.p2d_bang (tuan, diem_tuan desc);
alter table public.p2d_bang enable row level security;
revoke all on table public.p2d_bang from anon, authenticated;

create table if not exists public.p2d_bang_tv (
  user_id   uuid primary key references auth.users (id) on delete cascade,   -- mỗi người một tông môn
  bang_id   uuid not null references public.p2d_bang (id) on delete cascade,
  chuc      text not null default 'de' check (chuc in ('chu', 'pho', 'lao', 'de')),
  vao_luc   timestamptz not null default now(),
  cong_hien integer not null default 0,
  cong_tuan integer not null default 0,
  tuan      date not null default public.p2d_tuan_nay(),
  diem_danh date,
  gop_ngay  date,
  gop_diem  integer not null default 0
);
create index if not exists p2d_bang_tv_bang_idx on public.p2d_bang_tv (bang_id);
alter table public.p2d_bang_tv enable row level security;
revoke all on table public.p2d_bang_tv from anon, authenticated;

create table if not exists public.p2d_bang_xin (
  bang_id uuid not null references public.p2d_bang (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  luc     timestamptz not null default now(),
  primary key (bang_id, user_id)
);
create index if not exists p2d_bang_xin_user_idx on public.p2d_bang_xin (user_id);
alter table public.p2d_bang_xin enable row level security;
revoke all on table public.p2d_bang_xin from anon, authenticated;

-- ===================== Hàm phụ =====================
-- Mã đồng môn (không lộ mã tài khoản): 12 ký tự băm từ người + tông môn
create or replace function public.p2d_bang_key(p_uid uuid, p_bang uuid)
returns text language sql immutable set search_path = ''
as $$ select left(md5(p_uid::text || p_bang::text), 12); $$;

-- Bỏ ký tự điều khiển, ký tự vô hình, dấu dễ chèn mã; gộp khoảng trắng
create or replace function public.p2d_bang_sach(p text)
returns text language sql immutable set search_path = ''
as $$ select btrim(regexp_replace(regexp_replace(coalesce(p, ''), '[[:cntrl:]<>"''`\\​-‏‪-‮⁠-⁩﻿]', '', 'g'), '\s+', ' ', 'g')); $$;

-- Sang tuần mới: điểm tuần của tông môn và đồng môn về 0
create or replace function public.p2d_bang_moi_tuan(p_bang uuid)
returns void language plpgsql security definer set search_path = ''
as $$
declare v_tuan date := public.p2d_tuan_nay();
begin
  update public.p2d_bang set diem_tuan = 0, tuan = v_tuan where id = p_bang and tuan <> v_tuan;
  update public.p2d_bang_tv set cong_tuan = 0, tuan = v_tuan where bang_id = p_bang and tuan <> v_tuan;
end;
$$;

-- Tên hiển thị của người chơi
create or replace function public.p2d_bang_ten_nguoi(p_uid uuid)
returns text language sql stable security definer set search_path = ''
as $$ select coalesce((select nullif(n.ten, '') from public.p2d_nhan_vat n where n.user_id = p_uid), public.p2d_ten_mac_dinh(p_uid)); $$;

revoke all on function public.p2d_bang_key(uuid, uuid), public.p2d_bang_sach(text), public.p2d_bang_moi_tuan(uuid), public.p2d_bang_ten_nguoi(uuid) from public, anon, authenticated;

-- Kênh chat: thế giới, hoặc kênh tông môn mình đang ở
create or replace function public.p2d_vao_kenh(p_kenh text, p_uid uuid)
returns boolean language sql stable security definer set search_path = ''
as $$ select p_kenh = 'the-gioi' or exists (select 1 from public.p2d_bang_tv t where t.user_id = p_uid and p_kenh = 'bang:' || t.bang_id::text); $$;
revoke all on function public.p2d_vao_kenh(text, uuid) from public, anon, authenticated;

-- ===================== Lập, xem =====================
create or replace function public.p2d_bang_lap(p_ten text, p_mo_ta text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg');
  v_nv public.p2d_nhan_vat%rowtype; v_ten text := public.p2d_bang_sach(p_ten); v_mo_ta text := left(public.p2d_bang_sach(p_mo_ta), 60);
  v_lt numeric; v_gia numeric := (v_cfg ->> 'cost')::numeric; v_id uuid; v_pb integer; v_n integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  if v_nv.canh_gioi < (v_cfg ->> 'need_realm')::integer then raise exception 'chua_du_canh_gioi' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_bang_tv where user_id = v_uid) then raise exception 'da_co_bang' using errcode = '22023'; end if;
  if char_length(v_ten) not between 2 and 16 then raise exception 'ten_sai' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_bang where lower(ten) = lower(v_ten)) then raise exception 'ten_trung' using errcode = '22023'; end if;
  v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
  if v_lt < v_gia then raise exception 'thieu_tien' using errcode = '22023'; end if;
  begin
    insert into public.p2d_bang (ten, mo_ta, chu) values (v_ten, v_mo_ta, v_uid) returning id into v_id;
  exception when unique_violation then raise exception 'ten_trung' using errcode = '22023';
  end;
  insert into public.p2d_bang_tv (user_id, bang_id, chuc) values (v_uid, v_id, 'chu');
  update public.p2d_nhan_vat set data = jsonb_set(data, '{lingshi}', to_jsonb(v_lt - v_gia)), phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  with x as (delete from public.p2d_bang_xin where user_id = v_uid returning 1) select count(*) into v_n from x;
  return jsonb_build_object('id', v_id, 'ten', v_ten, 'gia', v_gia, 'phien_ban', v_pb);
end;
$$;

-- Danh sách tông môn (tìm theo tên), xếp theo điểm tuần
create or replace function public.p2d_bang_ds(p_tim text default '')
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_tuan date := public.p2d_tuan_nay(); v_max integer := ((select v from public.p2d_bang_cfg where k = 'cfg') ->> 'max')::integer;
  v_tim text := left(regexp_replace(public.p2d_bang_sach(p_tim), '[%_\\]', '', 'g'), 16);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'ten', x.ten, 'mo_ta', x.mo_ta, 'mo', x.mo, 'so_tv', x.so_tv, 'max', v_max,
            'chu', x.chu_ten, 'diem_tuan', x.diem, 'da_xin', x.da_xin) order by x.diem desc, x.so_tv desc, x.tao_luc), '[]'::jsonb)
    from (select b.id, b.ten, b.mo_ta, b.mo, b.tao_luc, case when b.tuan = v_tuan then b.diem_tuan else 0 end as diem,
                 (select count(*) from public.p2d_bang_tv t where t.bang_id = b.id) as so_tv,
                 case when b.chu is null then '' else public.p2d_bang_ten_nguoi(b.chu) end as chu_ten,
                 exists (select 1 from public.p2d_bang_xin s where s.bang_id = b.id and s.user_id = v_uid and s.luc > now() - interval '3 days') as da_xin
            from public.p2d_bang b where v_tim = '' or b.ten ilike '%' || v_tim || '%'
           order by 6 desc, 7 desc, b.tao_luc limit 30) x);
end;
$$;

-- Tông môn của mình: thông tin, đồng môn, lời xin vào (Tông chủ, Phó tông chủ thấy), phần của mình tuần này
create or replace function public.p2d_bang_toi()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_tv public.p2d_bang_tv%rowtype; v_b public.p2d_bang%rowtype; v_tuan date := public.p2d_tuan_nay();
  v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_th jsonb;
begin
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  if not found then return null; end if;
  perform public.p2d_bang_moi_tuan(v_tv.bang_id);
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid;
  select * into v_b from public.p2d_bang where id = v_tv.bang_id;
  select bang_thuong into v_th from public.p2d_nhan_vat where user_id = v_uid;
  return jsonb_build_object(
    'bang', jsonb_build_object('id', v_b.id, 'ten', v_b.ten, 'mo_ta', v_b.mo_ta, 'mo', v_b.mo, 'diem_tuan', v_b.diem_tuan),
    'chuc', v_tv.chuc, 'tuan', v_tuan,
    'toi', jsonb_build_object('cong_tuan', v_tv.cong_tuan, 'cong_hien', v_tv.cong_hien, 'diem_danh', coalesce(v_tv.diem_danh = v_ngay, false),
           'gop_diem', case when v_tv.gop_ngay = v_ngay then v_tv.gop_diem else 0 end,
           'thuong', case when v_th ->> 'tuan' = v_tuan::text then coalesce(v_th -> 'moc', '[]'::jsonb) else '[]'::jsonb end),
    'tv', (select coalesce(jsonb_agg(jsonb_build_object('k', public.p2d_bang_key(t.user_id, t.bang_id), 'ten', public.p2d_bang_ten_nguoi(t.user_id), 'chuc', t.chuc,
             'canh_gioi', n.canh_gioi, 'tang', n.tang, 'cong_tuan', t.cong_tuan, 'cong_hien', t.cong_hien, 'la_toi', t.user_id = v_uid)
             order by array_position(array['chu', 'pho', 'lao', 'de'], t.chuc), t.cong_tuan desc, t.vao_luc), '[]'::jsonb)
           from public.p2d_bang_tv t left join public.p2d_nhan_vat n on n.user_id = t.user_id where t.bang_id = v_b.id),
    'xin', case when v_tv.chuc in ('chu', 'pho') then
           (select coalesce(jsonb_agg(jsonb_build_object('k', public.p2d_bang_key(s.user_id, s.bang_id), 'ten', public.p2d_bang_ten_nguoi(s.user_id),
                    'canh_gioi', n.canh_gioi, 'tang', n.tang) order by s.luc), '[]'::jsonb)
              from public.p2d_bang_xin s left join public.p2d_nhan_vat n on n.user_id = s.user_id
             where s.bang_id = v_b.id and s.luc > now() - interval '3 days' and not exists (select 1 from public.p2d_bang_tv t where t.user_id = s.user_id))
           else '[]'::jsonb end);
end;
$$;

-- ===================== Vào, duyệt, chức vụ, mời ra, rời =====================
create or replace function public.p2d_bang_xin_vao(p_bang uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg');
  v_nv public.p2d_nhan_vat%rowtype; v_b public.p2d_bang%rowtype; v_n integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;
  if exists (select 1 from public.p2d_bang_tv where user_id = v_uid) then raise exception 'da_co_bang' using errcode = '22023'; end if;
  if v_nv.bang_roi_luc > now() - make_interval(hours => (v_cfg ->> 'leave_hours')::integer) then raise exception 'cho_roi' using errcode = '54000'; end if;
  select * into v_b from public.p2d_bang where id = p_bang for update;
  if not found then raise exception 'khong_co' using errcode = '22023'; end if;
  if (select count(*) from public.p2d_bang_tv where bang_id = p_bang) >= (v_cfg ->> 'max')::integer then raise exception 'day' using errcode = '22023'; end if;
  if v_b.mo then
    insert into public.p2d_bang_tv (user_id, bang_id) values (v_uid, p_bang);
    with x as (delete from public.p2d_bang_xin where user_id = v_uid returning 1) select count(*) into v_n from x;
    return jsonb_build_object('vao', true, 'ten', v_b.ten);
  end if;
  if (select count(*) from public.p2d_bang_xin where user_id = v_uid and bang_id <> p_bang and luc > now() - interval '3 days') >= 5 then
    raise exception 'qua_nhieu' using errcode = '54000';
  end if;
  insert into public.p2d_bang_xin (bang_id, user_id) values (p_bang, v_uid) on conflict (bang_id, user_id) do update set luc = now();
  return jsonb_build_object('vao', false, 'ten', v_b.ten);
end;
$$;

create or replace function public.p2d_bang_duyet(p_k text, p_dong_y boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg');
  v_bang uuid; v_chuc text; v_ai uuid; v_n integer;
begin
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  select chuc into v_chuc from public.p2d_bang_tv where user_id = v_uid and bang_id = v_bang;
  if v_chuc is null or v_chuc not in ('chu', 'pho') then raise exception 'khong_quyen' using errcode = '42501'; end if;
  select s.user_id into v_ai from public.p2d_bang_xin s where s.bang_id = v_bang and public.p2d_bang_key(s.user_id, s.bang_id) = p_k;
  if v_ai is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if p_dong_y then
    if exists (select 1 from public.p2d_bang_tv where user_id = v_ai) then raise exception 'da_co_bang' using errcode = '22023'; end if;
    if (select count(*) from public.p2d_bang_tv where bang_id = v_bang) >= (v_cfg ->> 'max')::integer then raise exception 'day' using errcode = '22023'; end if;
    insert into public.p2d_bang_tv (user_id, bang_id) values (v_ai, v_bang);
    with x as (delete from public.p2d_bang_xin where user_id = v_ai returning 1) select count(*) into v_n from x;
  else
    with x as (delete from public.p2d_bang_xin where bang_id = v_bang and user_id = v_ai returning 1) select count(*) into v_n from x;
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Đổi chức: Tông chủ đặt Phó/Trưởng lão/Đệ tử hoặc nhường chức Tông chủ (mình thành Phó); Phó tông chủ đặt Trưởng lão/Đệ tử cho người dưới mình
create or replace function public.p2d_bang_chuc(p_k text, p_chuc text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg');
  v_bang uuid; v_toi text; v_ai uuid; v_cu text;
begin
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  select chuc into v_toi from public.p2d_bang_tv where user_id = v_uid and bang_id = v_bang;
  select t.user_id, t.chuc into v_ai, v_cu from public.p2d_bang_tv t where t.bang_id = v_bang and public.p2d_bang_key(t.user_id, t.bang_id) = p_k;
  if v_ai is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_ai = v_uid or p_chuc is null or p_chuc not in ('chu', 'pho', 'lao', 'de') then raise exception 'khong_quyen' using errcode = '42501'; end if;
  if v_toi = 'pho' and (v_cu not in ('lao', 'de') or p_chuc not in ('lao', 'de')) then raise exception 'khong_quyen' using errcode = '42501'; end if;
  if v_toi not in ('chu', 'pho') then raise exception 'khong_quyen' using errcode = '42501'; end if;
  if p_chuc = 'chu' then
    if v_toi <> 'chu' then raise exception 'khong_quyen' using errcode = '42501'; end if;
    update public.p2d_bang_tv set chuc = 'pho' where user_id = v_uid;
    update public.p2d_bang_tv set chuc = 'chu' where user_id = v_ai;
    update public.p2d_bang set chu = v_ai where id = v_bang;
    return jsonb_build_object('ok', true);
  end if;
  if p_chuc in ('pho', 'lao') and (select count(*) from public.p2d_bang_tv where bang_id = v_bang and chuc = p_chuc and user_id <> v_ai)
     >= (v_cfg ->> (case p_chuc when 'pho' then 'max_pho' else 'max_lao' end))::integer then
    raise exception 'du_chuc' using errcode = '22023';
  end if;
  update public.p2d_bang_tv set chuc = p_chuc where user_id = v_ai;
  return jsonb_build_object('ok', true);
end;
$$;

-- Mời ra: Tông chủ mời ai cũng được (trừ mình), Phó tông chủ mời Trưởng lão, Đệ tử
create or replace function public.p2d_bang_duoi(p_k text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_bang uuid; v_toi text; v_ai uuid; v_cu text; v_n integer;
begin
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  select chuc into v_toi from public.p2d_bang_tv where user_id = v_uid and bang_id = v_bang;
  select t.user_id, t.chuc into v_ai, v_cu from public.p2d_bang_tv t where t.bang_id = v_bang and public.p2d_bang_key(t.user_id, t.bang_id) = p_k;
  if v_ai is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_ai = v_uid or not (v_toi = 'chu' or (v_toi = 'pho' and v_cu in ('lao', 'de'))) then raise exception 'khong_quyen' using errcode = '42501'; end if;
  with x as (delete from public.p2d_bang_tv where user_id = v_ai and bang_id = v_bang returning 1) select count(*) into v_n from x;
  return jsonb_build_object('ok', true);
end;
$$;

-- Rời tông môn; Tông chủ phải nhường chức trước, trừ khi chỉ còn một mình (thì tông môn giải tán)
create or replace function public.p2d_bang_roi()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_bang uuid; v_chuc text; v_n integer; v_tan boolean := false;
begin
  perform 1 from public.p2d_nhan_vat where user_id = v_uid for update;
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  select chuc into v_chuc from public.p2d_bang_tv where user_id = v_uid and bang_id = v_bang;
  if v_chuc = 'chu' then
    if exists (select 1 from public.p2d_bang_tv where bang_id = v_bang and user_id <> v_uid) then raise exception 'chu_phai_nhuong' using errcode = '22023'; end if;
    with x as (delete from public.p2d_bang where id = v_bang returning 1) select count(*) into v_n from x;
    v_tan := true;
  else
    with x as (delete from public.p2d_bang_tv where user_id = v_uid returning 1) select count(*) into v_n from x;
  end if;
  update public.p2d_nhan_vat set bang_roi_luc = now() where user_id = v_uid;
  return jsonb_build_object('ok', true, 'giai_tan', v_tan);
end;
$$;

create or replace function public.p2d_bang_sua(p_mo_ta text, p_mo boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_bang uuid; v_chuc text;
begin
  select bang_id, chuc into v_bang, v_chuc from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  if v_chuc not in ('chu', 'pho') then raise exception 'khong_quyen' using errcode = '42501'; end if;
  update public.p2d_bang set mo_ta = case when p_mo_ta is null then mo_ta else left(public.p2d_bang_sach(p_mo_ta), 60) end, mo = coalesce(p_mo, mo) where id = v_bang;
  return jsonb_build_object('ok', true);
end;
$$;

-- ===================== Việc tuần =====================
create or replace function public.p2d_bang_diem_danh()
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg');
  v_n integer := (v_cfg ->> 'checkin')::integer; v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_bang uuid; v_tv public.p2d_bang_tv%rowtype;
begin
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  perform public.p2d_bang_moi_tuan(v_bang);
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid for update;
  if v_tv.diem_danh = v_ngay then raise exception 'da_diem_danh' using errcode = '22023'; end if;
  update public.p2d_bang_tv set diem_danh = v_ngay, cong_tuan = cong_tuan + v_n, cong_hien = cong_hien + v_n where user_id = v_uid;
  update public.p2d_bang set diem_tuan = diem_tuan + v_n where id = v_bang;
  return jsonb_build_object('diem', v_n);
end;
$$;

-- Góp Linh Thạch: mỗi donate.per Linh Thạch được 1 điểm, tối đa donate.day_max điểm mỗi ngày; chỉ trừ phần được tính điểm
create or replace function public.p2d_bang_gop(p_lt integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg');
  v_per integer := (v_cfg -> 'donate' ->> 'per')::integer; v_max integer := (v_cfg -> 'donate' ->> 'day_max')::integer;
  v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; v_nv public.p2d_nhan_vat%rowtype; v_bang uuid; v_tv public.p2d_bang_tv%rowtype;
  v_lt numeric; v_da integer; v_diem integer; v_pb integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  perform public.p2d_bang_moi_tuan(v_bang);
  select * into v_tv from public.p2d_bang_tv where user_id = v_uid for update;
  v_da := case when v_tv.gop_ngay = v_ngay then v_tv.gop_diem else 0 end;
  if v_da >= v_max then raise exception 'het_luot' using errcode = '22023'; end if;
  v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
  v_diem := least(floor(greatest(coalesce(p_lt, 0), 0) / v_per)::integer, v_max - v_da, floor(v_lt / v_per)::integer);
  if v_diem <= 0 then raise exception 'thieu_tien' using errcode = '22023'; end if;
  update public.p2d_nhan_vat set data = jsonb_set(data, '{lingshi}', to_jsonb(v_lt - v_diem * v_per)), phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into v_pb;
  update public.p2d_bang_tv set gop_ngay = v_ngay, gop_diem = v_da + v_diem, cong_tuan = cong_tuan + v_diem, cong_hien = cong_hien + v_diem where user_id = v_uid;
  update public.p2d_bang set diem_tuan = diem_tuan + v_diem where id = v_bang;
  return jsonb_build_object('diem', v_diem, 'lt', v_diem * v_per, 'phien_ban', v_pb);
end;
$$;

-- Nhận thưởng mốc tuần (mỗi người mỗi mốc một lần mỗi tuần, đổi tông môn cũng không nhận lại được)
create or replace function public.p2d_bang_nhan(p_moc integer)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_bang_cfg where k = 'cfg'); v_m jsonb := v_cfg -> 'milestones' -> p_moc;
  v_tuan date := public.p2d_tuan_nay(); v_nv public.p2d_nhan_vat%rowtype; v_bang uuid; v_diem integer; v_cong integer; v_th jsonb; v_d jsonb; v_pb integer;
begin
  if v_m is null or p_moc < 0 then raise exception 'khong_co' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  select bang_id into v_bang from public.p2d_bang_tv where user_id = v_uid;
  if v_bang is null then raise exception 'khong_co' using errcode = '22023'; end if;
  perform 1 from public.p2d_bang where id = v_bang for update;
  perform public.p2d_bang_moi_tuan(v_bang);
  select diem_tuan into v_diem from public.p2d_bang where id = v_bang;
  select cong_tuan into v_cong from public.p2d_bang_tv where user_id = v_uid;
  if v_diem < (v_m ->> 'pts')::integer then raise exception 'chua_du' using errcode = '22023'; end if;
  if v_cong < (v_cfg ->> 'min_pts')::integer then raise exception 'gop_it' using errcode = '22023'; end if;
  v_th := case when v_nv.bang_thuong ->> 'tuan' = v_tuan::text then v_nv.bang_thuong else jsonb_build_object('tuan', v_tuan, 'moc', '[]'::jsonb) end;
  if coalesce(v_th -> 'moc', '[]'::jsonb) @> to_jsonb(p_moc) then raise exception 'da_nhan' using errcode = '22023'; end if;
  v_th := jsonb_set(v_th, '{moc}', coalesce(v_th -> 'moc', '[]'::jsonb) || to_jsonb(p_moc));
  v_d := v_nv.data;
  if jsonb_typeof(v_d -> 'mats') is distinct from 'object' then v_d := jsonb_set(v_d, '{mats}', '{}'::jsonb); end if;
  v_d := jsonb_set(v_d, '{lingshi}', to_jsonb(coalesce(case when jsonb_typeof(v_d -> 'lingshi') = 'number' then (v_d ->> 'lingshi')::numeric end, 0) + (v_m ->> 'coins')::numeric));
  v_d := jsonb_set(v_d, '{mats,tay-luyen-thach}', to_jsonb(coalesce(case when jsonb_typeof(v_d -> 'mats' -> 'tay-luyen-thach') = 'number' then (v_d -> 'mats' ->> 'tay-luyen-thach')::numeric end, 0) + (v_m ->> 'stones')::numeric));
  update public.p2d_nhan_vat set data = v_d, bang_thuong = v_th, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  return jsonb_build_object('coins', (v_m ->> 'coins')::integer, 'stones', (v_m ->> 'stones')::integer, 'phien_ban', v_pb);
end;
$$;

revoke all on function public.p2d_bang_lap(text, text), public.p2d_bang_ds(text), public.p2d_bang_toi(), public.p2d_bang_xin_vao(uuid), public.p2d_bang_duyet(text, boolean),
  public.p2d_bang_chuc(text, text), public.p2d_bang_duoi(text), public.p2d_bang_roi(), public.p2d_bang_sua(text, boolean), public.p2d_bang_diem_danh(),
  public.p2d_bang_gop(integer), public.p2d_bang_nhan(integer) from public, anon;
grant execute on function public.p2d_bang_lap(text, text), public.p2d_bang_ds(text), public.p2d_bang_toi(), public.p2d_bang_xin_vao(uuid), public.p2d_bang_duyet(text, boolean),
  public.p2d_bang_chuc(text, text), public.p2d_bang_duoi(text), public.p2d_bang_roi(), public.p2d_bang_sua(text, boolean), public.p2d_bang_diem_danh(),
  public.p2d_bang_gop(integer), public.p2d_bang_nhan(integer) to authenticated;

-- ===================== Tự kiểm tra (trượt thì hoàn tác cả migration) =====================
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000a1'; b uuid := '00000000-0000-4000-8000-0000000000b1'; c uuid := '00000000-0000-4000-8000-0000000000c1';
  x jsonb; v_bang uuid; k_b text; k_c text; n numeric;
begin
  begin
    insert into auth.users (id, email, aud, role) values
      (a, 'kt_bang_a@nguoichoi.invalid', 'authenticated', 'authenticated'), (b, 'kt_bang_b@nguoichoi.invalid', 'authenticated', 'authenticated'),
      (c, 'kt_bang_c@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban) values
      (a, '{"lingshi": 50000, "mats": {}}', 2, 1, 1), (b, '{"lingshi": 50000}', 2, 1, 1), (c, '{"lingshi": 5000}', 0, 3, 1);
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    begin perform public.p2d_bang_lap('Tiểu Tông', ''); v_hong := v_hong || ' | lập khi chưa Kim Đan lọt';
    exception when others then if sqlerrm <> 'chua_du_canh_gioi' then v_hong := v_hong || ' | lập chưa Kim Đan: ' || sqlerrm; end if; end;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    x := public.p2d_bang_lap('  Thanh   Vân ', 'Cùng nhau tu tiên');
    v_bang := (x ->> 'id')::uuid;
    if x ->> 'ten' <> 'Thanh Vân' or (select (data ->> 'lingshi')::int from public.p2d_nhan_vat where user_id = a) <> 30000
       or (select phien_ban from public.p2d_nhan_vat where user_id = a) <> 2 then v_hong := v_hong || ' | lập: ' || x::text; end if;
    begin perform public.p2d_bang_lap('Khác', ''); v_hong := v_hong || ' | lập hai tông môn lọt';
    exception when others then if sqlerrm <> 'da_co_bang' then v_hong := v_hong || ' | lập hai: ' || sqlerrm; end if; end;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    begin perform public.p2d_bang_lap('thanh vân', ''); v_hong := v_hong || ' | tên trùng lọt';
    exception when others then if sqlerrm <> 'ten_trung' then v_hong := v_hong || ' | tên trùng: ' || sqlerrm; end if; end;
    x := public.p2d_bang_xin_vao(v_bang);
    if not (x ->> 'vao')::boolean then v_hong := v_hong || ' | vào tông môn mở'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    perform public.p2d_bang_sua('Đóng cửa', false);
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    x := public.p2d_bang_xin_vao(v_bang);
    if (x ->> 'vao')::boolean then v_hong := v_hong || ' | tông môn đóng mà vào thẳng'; end if;
    if public.p2d_bang_toi() is not null then v_hong := v_hong || ' | chưa duyệt đã là đồng môn'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    begin perform public.p2d_bang_duyet(public.p2d_bang_key(c, v_bang), true); v_hong := v_hong || ' | đệ tử duyệt lọt';
    exception when others then if sqlerrm <> 'khong_quyen' then v_hong := v_hong || ' | đệ tử duyệt: ' || sqlerrm; end if; end;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    x := public.p2d_bang_toi();
    if jsonb_array_length(x -> 'xin') <> 1 or jsonb_array_length(x -> 'tv') <> 2 or x -> 'tv' -> 0 ->> 'chuc' <> 'chu' then v_hong := v_hong || ' | xem tông môn: ' || x::text; end if;
    k_c := x -> 'xin' -> 0 ->> 'k'; k_b := public.p2d_bang_key(b, v_bang);
    perform public.p2d_bang_duyet(k_c, true);
    if (select bang_id from public.p2d_bang_tv where user_id = c) is distinct from v_bang then v_hong := v_hong || ' | duyệt chưa vào'; end if;
    perform public.p2d_bang_chuc(k_b, 'pho');
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    perform public.p2d_bang_chuc(k_c, 'lao');
    begin perform public.p2d_bang_chuc(public.p2d_bang_key(a, v_bang), 'de'); v_hong := v_hong || ' | phó hạ chức tông chủ lọt';
    exception when others then if sqlerrm <> 'khong_quyen' then v_hong := v_hong || ' | phó hạ tông chủ: ' || sqlerrm; end if; end;
    if (select chuc from public.p2d_bang_tv where user_id = c) <> 'lao' then v_hong := v_hong || ' | đổi chức'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    x := public.p2d_bang_diem_danh();
    begin perform public.p2d_bang_diem_danh(); v_hong := v_hong || ' | điểm danh hai lần lọt';
    exception when others then if sqlerrm <> 'da_diem_danh' then v_hong := v_hong || ' | điểm danh hai: ' || sqlerrm; end if; end;
    x := public.p2d_bang_gop(1050);
    if (x ->> 'diem')::int <> 10 or (select (data ->> 'lingshi')::int from public.p2d_nhan_vat where user_id = c) <> 4000 then v_hong := v_hong || ' | góp: ' || x::text; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    x := public.p2d_bang_gop(100000);
    if (x ->> 'diem')::int <> 50 or (x ->> 'lt')::int <> 5000 then v_hong := v_hong || ' | góp trần ngày: ' || x::text; end if;
    begin perform public.p2d_bang_gop(100); v_hong := v_hong || ' | góp quá trần lọt';
    exception when others then if sqlerrm <> 'het_luot' then v_hong := v_hong || ' | góp quá trần: ' || sqlerrm; end if; end;
    if (select diem_tuan from public.p2d_bang where id = v_bang) <> 70 then v_hong := v_hong || ' | điểm tuần ' || (select diem_tuan from public.p2d_bang where id = v_bang); end if;
    perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
    begin perform public.p2d_bang_nhan(0); v_hong := v_hong || ' | nhận khi chưa đủ mốc lọt';
    exception when others then if sqlerrm <> 'chua_du' then v_hong := v_hong || ' | chưa đủ mốc: ' || sqlerrm; end if; end;
    update public.p2d_bang set diem_tuan = 250 where id = v_bang;
    select (data ->> 'lingshi')::numeric into n from public.p2d_nhan_vat where user_id = c;
    x := public.p2d_bang_nhan(0);
    if (select (data ->> 'lingshi')::numeric from public.p2d_nhan_vat where user_id = c) <> n + 1500
       or (select (data -> 'mats' ->> 'tay-luyen-thach')::int from public.p2d_nhan_vat where user_id = c) <> 1 then v_hong := v_hong || ' | nhận mốc: ' || x::text; end if;
    begin perform public.p2d_bang_nhan(0); v_hong := v_hong || ' | nhận mốc hai lần lọt';
    exception when others then if sqlerrm <> 'da_nhan' then v_hong := v_hong || ' | nhận hai: ' || sqlerrm; end if; end;
    if not public.p2d_vao_kenh('bang:' || v_bang::text, c) or public.p2d_vao_kenh('bang:' || v_bang::text, '00000000-0000-4000-8000-0000000000ff') then v_hong := v_hong || ' | kênh chat tông môn'; end if;
    perform public.p2d_gui_chat('bang:' || v_bang::text, 'Chào đồng môn');
    if jsonb_array_length(public.p2d_doc_chat('bang:' || v_bang::text, 0)) <> 1 then v_hong := v_hong || ' | đọc chat tông môn'; end if;
    perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
    begin perform public.p2d_bang_nhan(0); v_hong := v_hong || ' | chưa góp mà nhận mốc lọt';
    exception when others then if sqlerrm <> 'gop_it' then v_hong := v_hong || ' | chưa góp: ' || sqlerrm; end if; end;
    begin perform public.p2d_bang_roi(); v_hong := v_hong || ' | tông chủ rời khi còn người lọt';
    exception when others then if sqlerrm <> 'chu_phai_nhuong' then v_hong := v_hong || ' | tông chủ rời: ' || sqlerrm; end if; end;
    perform public.p2d_bang_chuc(k_b, 'chu');
    if (select chu from public.p2d_bang where id = v_bang) <> b or (select chuc from public.p2d_bang_tv where user_id = a) <> 'pho' then v_hong := v_hong || ' | nhường chức'; end if;
    perform public.p2d_bang_duoi(k_c);
    if exists (select 1 from public.p2d_bang_tv where user_id = c) then v_hong := v_hong || ' | mời ra'; end if;
    perform public.p2d_bang_roi();
    begin perform public.p2d_bang_xin_vao(v_bang); v_hong := v_hong || ' | vừa rời đã vào lại lọt';
    exception when others then if sqlerrm <> 'cho_roi' then v_hong := v_hong || ' | vừa rời: ' || sqlerrm; end if; end;
    perform set_config('request.jwt.claims', json_build_object('sub', b, 'role', 'authenticated')::text, true);
    if jsonb_array_length(public.p2d_bang_ds('thanh')) <> 1 then v_hong := v_hong || ' | tìm tông môn'; end if;
    x := public.p2d_bang_roi();
    if not (x ->> 'giai_tan')::boolean or exists (select 1 from public.p2d_bang where id = v_bang) then v_hong := v_hong || ' | giải tán'; end if;
    if has_function_privilege('anon', 'public.p2d_bang_lap(text,text)', 'execute') or has_function_privilege('authenticated', 'public.p2d_bang_moi_tuan(uuid)', 'execute')
       or not has_function_privilege('authenticated', 'public.p2d_bang_gop(integer)', 'execute') then v_hong := v_hong || ' | quyền gọi hàm'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra tông môn TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra tông môn: đạt hết';
end
$kt$;
