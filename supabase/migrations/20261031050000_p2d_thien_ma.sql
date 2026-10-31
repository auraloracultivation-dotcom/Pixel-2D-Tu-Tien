-- Thiên Ma Ngoại Vực (chủ dự án chốt 31/10/2026 08:40–08:50; tài liệu dự án claude/y-tuong-thien-ma-ngoai-vuc.md):
-- tài khoản admin hoathan là Thiên Ma. Không hiện trên bảng xếp hạng. Mỗi khi Thiên Ma online (nhịp sống trong 30 giây), ai từ
-- Kim Đan trở lên cũng khiêu chiến được, không giới hạn số lần. Trận đánh như So tài ở máy người chơi chỉ để xem; THẮNG THUA DO MÁY
-- CHỦ QUYẾT: lực chiến người chơi (máy chủ đã chặn trần theo cảnh giới) × ngẫu nhiên 0,8–1,2 so với sức mạnh Thiên Ma × 0,8–1,2.
-- Thắng: 1 món Đạo Vận vàng ngẫu nhiên, không ngọc, gửi Hòm thư. Thua: mất 10% tổng linh khí (có thể tụt tầng, tụt cảnh giới),
-- được an ủi 1 viên ngọc cấp 4 ngẫu nhiên loại (chủ dự án 08:48). Thông báo đứng tên "Thiên Đạo" cho có cảm giác hệ thống.
-- Thông báo toàn máy chủ qua kênh thế giới: Thiên Ma giáng lâm (online lại sau 5 phút vắng), mỗi trận khiêu chiến và kết quả.

create table if not exists public.p2d_thien_ma (
  user_id  uuid primary key references auth.users (id) on delete cascade,
  ten      text not null,
  suc_manh numeric not null
);
alter table public.p2d_thien_ma enable row level security;
revoke all on public.p2d_thien_ma from anon, authenticated;
insert into public.p2d_thien_ma (user_id, ten, suc_manh) values ('625e027c-36b4-4bb7-bd0c-21572612bc50', 'Đại Ma Thần', 50000000)
on conflict (user_id) do nothing;

create table if not exists public.p2d_thien_ma_tran (
  id       bigserial primary key,
  user_id  uuid not null references auth.users (id) on delete cascade,
  thien_ma uuid not null,
  luc      timestamptz not null default now(),
  thang    boolean not null,
  truoc    jsonb,
  sau      jsonb,
  mon      jsonb
);
alter table public.p2d_thien_ma_tran enable row level security;
revoke all on public.p2d_thien_ma_tran from anon, authenticated;

-- Mẫu món Đạo Vận vàng (cấp 80, chưa cường hoá, chưa khảm), hệ ngẫu nhiên khi trao
create table if not exists public.p2d_thien_ma_qua (base text primary key, mon jsonb not null);
alter table public.p2d_thien_ma_qua enable row level security;
revoke all on public.p2d_thien_ma_qua from anon, authenticated;
insert into public.p2d_thien_ma_qua (base, mon) values
  ('dao-van-binh', '{"base": "dao-van-binh", "rarity": "thien", "lvl": 80, "main": {"atk": 156}, "lines": [{"s": "crit_dmg", "v": 37}, {"s": "atk", "v": 72}, {"s": "atk_pct", "v": 16}, {"s": "crit", "v": 6}, {"s": "cdr", "v": 6}], "sockets": [null, null, null], "plus": 0}'::jsonb),
  ('dao-van-quan', '{"base": "dao-van-quan", "rarity": "thien", "lvl": 80, "main": {"crit": 13}, "lines": [{"s": "crit", "v": 9}, {"s": "crit_dmg", "v": 28}, {"s": "atk_pct", "v": 15}, {"s": "hp_pct", "v": 9}], "sockets": [null, null, null], "plus": 0}'::jsonb),
  ('dao-van-bao', '{"base": "dao-van-bao", "rarity": "thien", "lvl": 80, "main": {"hp": 2226}, "lines": [{"s": "atk_pct", "v": 15}, {"s": "hp", "v": 282}, {"s": "def", "v": 37}, {"s": "hp_pct", "v": 10}], "sockets": [null, null, null], "plus": 0}'::jsonb),
  ('dao-van-boi', '{"base": "dao-van-boi", "rarity": "thien", "lvl": 80, "main": {"atk_pct": 13}, "lines": [{"s": "cdr", "v": 9}, {"s": "atk_pct", "v": 13}, {"s": "crit_dmg", "v": 31}, {"s": "qi_gain", "v": 19}], "sockets": [null, null, null], "plus": 0}'::jsonb),
  ('dao-van-hai', '{"base": "dao-van-hai", "rarity": "thien", "lvl": 80, "main": {"speed": 15}, "lines": [{"s": "speed", "v": 8}, {"s": "crit", "v": 10}, {"s": "atk_pct", "v": 9}, {"s": "cdr", "v": 5}], "sockets": [null, null, null], "plus": 0}'::jsonb),
  ('dao-van-gioi', '{"base": "dao-van-gioi", "rarity": "thien", "lvl": 80, "main": {"crit_dmg": 25}, "lines": [{"s": "crit", "v": 5}, {"s": "crit_dmg", "v": 36}, {"s": "atk_pct", "v": 13}, {"s": "hp_pct", "v": 20}], "sockets": [null, null, null], "plus": 0}'::jsonb),
  ('dao-van-an', '{"base": "dao-van-an", "rarity": "thien", "lvl": 80, "main": {"atk": 111}, "lines": [{"s": "cdr", "v": 7}, {"s": "crit", "v": 10}, {"s": "atk_pct", "v": 13}, {"s": "atk", "v": 80}], "sockets": [null, null, null], "plus": 0}'::jsonb)

on conflict (base) do update set mon = excluded.mon;

-- Bảng xếp hạng bỏ Thiên Ma (Đại Ma Thần)
create or replace function public.p2d_xep_ca(p_loai text, p_gioi_han integer)
returns table(hang bigint, user_id uuid, ten text, gia_tri bigint, canh_gioi smallint, tang smallint, co boolean)
language sql stable security definer set search_path = ''
as $$
  select row_number() over (order by
           case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                       else n.canh_gioi::bigint * 10 + n.tang end desc,
           n.updated_at asc) as hang,
         n.user_id, n.ten,
         case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                     else n.canh_gioi::bigint * 10 + n.tang end as gia_tri,
         n.canh_gioi, n.tang, n.nghi_van >= 10 as co
  from public.p2d_nhan_vat n
  where (p_loai <> 'thap' or n.thap > 0)
    and not exists (select 1 from auth.users u where u.id = n.user_id and u.banned_until > now())
    and not exists (select 1 from public.p2d_thien_ma tm where tm.user_id = n.user_id)
  order by 1
  limit p_gioi_han;
$$;
update public.p2d_bxh_nho set luc = '2000-01-01';

-- Đổi tổng linh khí ra cảnh giới, tầng, linh khí lẻ (ngược với p2d_tong_lk)
create or replace function public.p2d_lk_ve(p_tong numeric)
returns jsonb language plpgsql immutable set search_path = ''
as $$
declare i integer := 0; c numeric; t numeric := greatest(coalesce(p_tong, 0), 0);
begin
  loop
    exit when i >= 80;
    c := public.p2d_lk_can(i);
    exit when t < c;
    t := t - c; i := i + 1;
  end loop;
  return jsonb_build_object('realm', i / 9, 'layer', i % 9 + 1, 'qi', floor(t));
end;
$$;

-- Trạng thái: Thiên Ma nào đang online (để hiện nút, đài); mã công khai k để dựng bản sao So tài
create or replace function public.p2d_thien_ma_xem()
returns jsonb language sql stable security definer set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', t.user_id, 'k', public.p2d_chat_key(t.user_id), 'ten', t.ten,
           'online', coalesce(h.luc > now() - interval '30 seconds', false))), '[]'::jsonb)
    from public.p2d_thien_ma t left join public.p2d_nhip h on h.user_id = t.user_id
   where public.p2d_uid() is not null;
$$;
revoke all on function public.p2d_thien_ma_xem() from public, anon;
grant execute on function public.p2d_thien_ma_xem() to authenticated;

create or replace function public.p2d_thien_ma_khieu_chien(p_tm uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); t public.p2d_thien_ma%rowtype; n public.p2d_nhan_vat%rowtype;
  v_ta numeric; v_ma numeric; v_thang boolean; v_tong numeric; v_moi jsonb; v_mon jsonb; v_ten text; v_ve text;
  v_els text[] := array['moc', 'hoa', 'thuy', 'kim', 'tho']; v_gem text;
  v_ngoc text[] := array['hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc'];
  v_cg text[] := array['Luyện Khí', 'Trúc Cơ', 'Kim Đan', 'Nguyên Anh', 'Hóa Thần', 'Luyện Hư', 'Hợp Thể', 'Đại Thừa', 'Độ Kiếp'];
begin
  select * into t from public.p2d_thien_ma where user_id = p_tm;
  if not found or p_tm = v_uid then raise exception 'khong_thay' using errcode = '22023'; end if;
  if not exists (select 1 from public.p2d_nhip h where h.user_id = p_tm and h.luc > now() - interval '30 seconds') then
    raise exception 'vang_mat' using errcode = '22023'; end if;
  select * into n from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if n.canh_gioi < 2 then raise exception 'chua_du' using errcode = '22023'; end if;
  v_ten := coalesce(n.ten, public.p2d_ten_mac_dinh(v_uid));
  v_ta := greatest(n.luc_chien, 0) * (0.8 + random() * 0.4);
  v_ma := t.suc_manh * (0.8 + random() * 0.4);
  v_thang := v_ta > v_ma;
  if v_thang then
    select q.mon into v_mon from public.p2d_thien_ma_qua q order by random() limit 1;
    v_mon := v_mon || jsonb_build_object('el', v_els[1 + floor(random() * 5)::int]);
    if v_mon ->> 'base' = 'dao-van-binh' and n.data ? 'weapon' then v_mon := v_mon || jsonb_build_object('wt', n.data ->> 'weapon'); end if;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, jsonb_build_object('item', v_mon), 'Chiến bại ' || t.ten);
    insert into public.p2d_thien_ma_tran (user_id, thien_ma, thang, mon) values (v_uid, p_tm, true, v_mon);
    insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
    values ('the-gioi', p_tm, 'Thiên Đạo', '【Thiên Đạo】' || v_ten || ' chiến bại ' || t.ten || ', đoạt được một món Đạo Vận vàng!');
    return jsonb_build_object('thang', true, 'mon', v_mon);
  end if;
  v_tong := public.p2d_tong_lk(n.canh_gioi, n.tang, coalesce((n.data ->> 'qi')::numeric, 0));
  v_moi := public.p2d_lk_ve(floor(v_tong * 0.9));
  update public.p2d_nhan_vat set data = data || v_moi, canh_gioi = (v_moi ->> 'realm')::int, tang = (v_moi ->> 'layer')::int,
         phien_ban = phien_ban + 1, updated_at = now()
   where user_id = v_uid returning phien_ban into n.phien_ban;
  insert into public.p2d_thien_ma_tran (user_id, thien_ma, thang, truoc, sau)
  values (v_uid, p_tm, false, jsonb_build_object('realm', n.canh_gioi, 'layer', n.tang, 'qi', n.data -> 'qi'), v_moi);
  v_ve := v_cg[(v_moi ->> 'realm')::int + 1] || ' tầng ' || (v_moi ->> 'layer');
  v_gem := v_ngoc[1 + floor(random() * 4)::int] || ':4';
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, jsonb_build_object('gem', jsonb_build_object('key', v_gem, 'n', 1)), 'Khiêu chiến ' || t.ten);
  insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
  values ('the-gioi', p_tm, 'Thiên Đạo', '【Thiên Đạo】' || v_ten || ' khiêu chiến ' || t.ten || ' thất bại, tu vi tổn hao một thành, rơi về ' || v_ve || '.');
  return jsonb_build_object('thang', false, 'sau', v_moi, 'phien_ban', n.phien_ban, 'ngoc', v_gem);
end;
$$;
revoke all on function public.p2d_thien_ma_khieu_chien(uuid) from public, anon;
grant execute on function public.p2d_thien_ma_khieu_chien(uuid) to authenticated;

-- Nhịp sống: Thiên Ma online lại sau 5 phút vắng thì báo toàn máy chủ (kênh thế giới)
create or replace function public.p2d_nhip_song()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid();
  v_cu  timestamptz;
  v_ten text;
begin
  select ten into v_ten from public.p2d_thien_ma where user_id = v_uid;
  if v_ten is not null then
    select luc into v_cu from public.p2d_nhip where user_id = v_uid;
    if v_cu is null or v_cu < now() - interval '5 minutes' then
      insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
      values ('the-gioi', v_uid, 'Thiên Đạo', '【Thiên Đạo】Trời đất biến sắc, ' || v_ten || ' xuất thế! Chiến bại ' || v_ten || ' có cơ duyên nhận một món Đạo Vận vàng. Từ Kim Đan trở lên có thể khiêu chiến; bại trận tổn hao một thành tu vi.');
    end if;
  end if;
  insert into public.p2d_nhip as n (user_id, luc, giay, mang) values (v_uid, now(), 0, public.p2d_mang())
  on conflict (user_id) do update
    set giay = least(n.giay + case when now() - n.luc <= interval '15 seconds' then extract(epoch from (now() - n.luc)) else 0 end, 43200),
        luc = now(), mang = coalesce(excluded.mang, n.mang);
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.p2d_nhip_song() from public, anon;
grant execute on function public.p2d_nhip_song() to authenticated;
