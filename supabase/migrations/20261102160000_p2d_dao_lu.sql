-- Đạo lữ giữa hai người chơi (chủ dự án chốt 02/11/2026 14:39): trong Bạn bè, một người mời, người kia đồng ý là thành đạo lữ.
-- Đạo lữ tặng đồ, nguyên liệu, Linh Thạch thẳng cho nhau (qua hòm thư, không qua chợ). Huỷ đạo lữ thì cả hai phải chờ 30 ngày
-- mới kết đạo lữ mới (chống chuyển tài nguyên sang nick chính). Thưởng +5% Linh Thạch, linh khí khi có đạo lữ: máy khách tự cộng.
-- p2d_dao_lu: (a mời b) trang_thai 'cho' (chờ b đồng ý) hoặc 'ket' (đã kết). p2d_dao_lu_cho: hạn chờ sau khi huỷ.

create table if not exists public.p2d_dao_lu (
  a uuid not null references auth.users (id) on delete cascade,
  b uuid not null references auth.users (id) on delete cascade,
  trang_thai text not null default 'cho' check (trang_thai in ('cho', 'ket')),
  luc timestamptz not null default now(),
  primary key (a, b),
  check (a <> b)
);
create index if not exists p2d_dao_lu_b on public.p2d_dao_lu (b);
alter table public.p2d_dao_lu enable row level security;
revoke all on public.p2d_dao_lu from anon, authenticated;

create table if not exists public.p2d_dao_lu_cho (
  user_id uuid primary key references auth.users (id) on delete cascade,
  het timestamptz not null
);
alter table public.p2d_dao_lu_cho enable row level security;
revoke all on public.p2d_dao_lu_cho from anon, authenticated;

-- Đạo lữ hiện tại của một người (null nếu chưa có)
create or replace function public.p2d_dl_cua(p_u uuid)
returns uuid language sql stable security definer set search_path = ''
as $$ select case when a = p_u then b else a end from public.p2d_dao_lu where trang_thai = 'ket' and (a = p_u or b = p_u) limit 1 $$;
revoke all on function public.p2d_dl_cua(uuid) from public, anon, authenticated;

create or replace function public.p2d_dl_het_cho(p_u uuid)
returns timestamptz language sql stable security definer set search_path = ''
as $$ select het from public.p2d_dao_lu_cho where user_id = p_u and het > now() $$;
revoke all on function public.p2d_dl_het_cho(uuid) from public, anon, authenticated;

-- Mời làm đạo lữ; người kia đã mời mình thì thành đạo lữ luôn
create or replace function public.p2d_dao_lu_moi(p_k text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_b uuid := public.p2d_bb_tim(p_k);
begin
  if v_b is null then raise exception 'khong_thay' using errcode = '22023'; end if;
  if v_b = v_uid then raise exception 'chinh_minh' using errcode = '22023'; end if;
  if not public.p2d_bb_la_ban(v_uid, v_b) then raise exception 'chua_la_ban' using errcode = '22023'; end if;
  if public.p2d_dl_cua(v_uid) is not null then raise exception 'da_co_dao_lu' using errcode = '22023'; end if;
  if public.p2d_dl_cua(v_b) is not null then raise exception 'nguoi_kia_co_dao_lu' using errcode = '22023'; end if;
  if public.p2d_dl_het_cho(v_uid) is not null then raise exception 'dang_cho' using errcode = '22023'; end if;
  if public.p2d_dl_het_cho(v_b) is not null then raise exception 'nguoi_kia_dang_cho' using errcode = '22023'; end if;
  update public.p2d_dao_lu set trang_thai = 'ket', luc = now() where a = v_b and b = v_uid and trang_thai = 'cho';
  if found then
    delete from public.p2d_dao_lu where trang_thai = 'cho' and (a in (v_uid, v_b) or b in (v_uid, v_b));   -- lời mời khác của hai người bỏ hết
    return 'thanh_dao_lu';
  end if;
  if (select count(*) from public.p2d_dao_lu where a = v_uid and trang_thai = 'cho') >= 5 then raise exception 'qua_nhieu_loi_moi' using errcode = '22023'; end if;
  insert into public.p2d_dao_lu (a, b) values (v_uid, v_b) on conflict do nothing;
  return 'da_gui';
end;
$$;
revoke all on function public.p2d_dao_lu_moi(text) from public, anon;
grant execute on function public.p2d_dao_lu_moi(text) to authenticated;

-- Huỷ: đã kết thì huỷ đạo lữ, cả hai chờ 30 ngày; còn là lời mời thì chỉ rút / từ chối
create or replace function public.p2d_dao_lu_huy(p_k text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_b uuid := public.p2d_bb_tim(p_k); v_tt text;
begin
  delete from public.p2d_dao_lu where (a = v_uid and b = v_b) or (a = v_b and b = v_uid) returning trang_thai into v_tt;
  if v_tt is null then return 'khong_co'; end if;
  if v_tt = 'ket' then
    insert into public.p2d_dao_lu_cho (user_id, het) values (v_uid, now() + interval '30 days'), (v_b, now() + interval '30 days')
      on conflict (user_id) do update set het = excluded.het;
    return 'da_huy';
  end if;
  return 'da_rut';
end;
$$;
revoke all on function public.p2d_dao_lu_huy(text) from public, anon;
grant execute on function public.p2d_dao_lu_huy(text) to authenticated;

-- Trạng thái của mình: đạo lữ, lời mời đến, lời mời đã gửi, hạn chờ
create or replace function public.p2d_dao_lu_tt()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_d uuid := public.p2d_dl_cua(v_uid);
begin
  return jsonb_build_object(
    'dao_lu', (select jsonb_build_object('k', public.p2d_chat_key(n.user_id), 'ten', n.ten,
                 'tu', (select luc from public.p2d_dao_lu where trang_thai = 'ket' and (a = v_uid or b = v_uid) limit 1))
                 from public.p2d_nhan_vat n where n.user_id = v_d),
    'moi_toi', coalesce((select jsonb_agg(jsonb_build_object('k', public.p2d_chat_key(n.user_id), 'ten', n.ten))
                 from public.p2d_dao_lu x join public.p2d_nhan_vat n on n.user_id = x.a where x.b = v_uid and x.trang_thai = 'cho'), '[]'::jsonb),
    'toi_moi', coalesce((select jsonb_agg(jsonb_build_object('k', public.p2d_chat_key(n.user_id), 'ten', n.ten))
                 from public.p2d_dao_lu x join public.p2d_nhan_vat n on n.user_id = x.b where x.a = v_uid and x.trang_thai = 'cho'), '[]'::jsonb),
    'cho_den', public.p2d_dl_het_cho(v_uid));
end;
$$;
revoke all on function public.p2d_dao_lu_tt() from public, anon;
grant execute on function public.p2d_dao_lu_tt() to authenticated;

-- Tặng đạo lữ: máy chủ tự lấy món / nguyên liệu / Linh Thạch trong bản lưu trên máy chủ của người tặng (như rao bán),
-- gửi vào hòm thư người nhận (ly_do 'dao_lu'). p_loai: 'mon' {uid}, 'nl' {id, n}, 'lt' {n}.
create or replace function public.p2d_dl_tang(p_loai text, p_mon jsonb)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_d uuid := public.p2d_dl_cua(v_uid);
  v_nv public.p2d_nhan_vat%rowtype; v_mon jsonb; v_co numeric; v_n integer; v_k text; v_pb integer; v_nd jsonb;
begin
  if v_d is null then raise exception 'chua_co_dao_lu' using errcode = '22023'; end if;
  if p_mon is null or jsonb_typeof(p_mon) <> 'object' then raise exception 'mon_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.nghi_van >= 10 then raise exception 'bi_khoa' using errcode = '42501'; end if;

  if p_loai = 'mon' then
    if jsonb_typeof(p_mon -> 'uid') is distinct from 'number' then raise exception 'mon_sai' using errcode = '22023'; end if;
    select it into v_mon from jsonb_array_elements(coalesce(v_nv.data -> 'bag', '[]'::jsonb)) it where it -> 'uid' = p_mon -> 'uid' limit 1;
    if v_mon is null or exists (select 1 from jsonb_each(coalesce(v_nv.data -> 'equip', '{}'::jsonb)) e where e.value = p_mon -> 'uid') then
      raise exception 'khong_co' using errcode = '22023';
    end if;
    if not public.p2d_mon_hop_le(v_mon) then raise exception 'mon_sai' using errcode = '22023'; end if;
    if coalesce(v_mon ->> 'base', '') like 'dao-van-%' then raise exception 'khong_tang' using errcode = '22023'; end if;
    if jsonb_typeof(v_mon -> 'sockets') = 'array' then   -- ngọc khảm trả về túi người tặng
      if jsonb_typeof(v_nv.data -> 'gems') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{gems}', '{}'::jsonb); end if;
      for v_k in select s from jsonb_array_elements_text(v_mon -> 'sockets') s where s ~ '^(hong|lam|hoang|luc)-ngoc:([1-9]|1[0-9]|20)$' loop
        v_nv.data := jsonb_set(v_nv.data, array['gems', v_k], to_jsonb(coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_k) = 'number' then (v_nv.data -> 'gems' ->> v_k)::numeric end, 0) + 1));
      end loop;
      v_mon := jsonb_set(v_mon, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(v_mon -> 'sockets')));
    end if;
    v_mon := v_mon - 'uid';
    v_nv.data := jsonb_set(v_nv.data, '{bag}', (select coalesce(jsonb_agg(it), '[]'::jsonb) from jsonb_array_elements(v_nv.data -> 'bag') it where it -> 'uid' <> p_mon -> 'uid'));
    v_nd := jsonb_build_object('item', v_mon);
  elsif p_loai in ('nl', 'lt') then
    if jsonb_typeof(p_mon -> 'n') is distinct from 'number' or (p_mon ->> 'n')::numeric <> floor((p_mon ->> 'n')::numeric)
       or (p_mon ->> 'n')::numeric not between 1 and (array[9999, 10000000])[(p_loai = 'lt')::int + 1] then
      raise exception 'mon_sai' using errcode = '22023';
    end if;
    v_n := (p_mon ->> 'n')::integer;
    if p_loai = 'lt' then
      v_co := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      if v_co < v_n then raise exception 'khong_co' using errcode = '22023'; end if;
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_co - v_n));
      v_nd := jsonb_build_object('coins', v_n);
    else
      if coalesce(p_mon ->> 'id', '') !~ '^[a-z0-9-]{1,40}$' or p_mon ->> 'id' = 'dao-van-thach' then raise exception 'mon_sai' using errcode = '22023'; end if;
      v_co := coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (p_mon ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (p_mon ->> 'id'))::numeric end, 0);
      if v_co < v_n then raise exception 'khong_co' using errcode = '22023'; end if;
      v_nv.data := jsonb_set(v_nv.data, array['mats', p_mon ->> 'id'], to_jsonb(v_co - v_n));
      v_nd := jsonb_build_object('mat', jsonb_build_object('id', p_mon ->> 'id', 'n', v_n));
    end if;
  else
    raise exception 'loai_sai' using errcode = '22023';
  end if;

  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
    values (v_d, v_nd || jsonb_build_object('tu', coalesce(nullif(v_nv.ten, ''), public.p2d_ten_mac_dinh(v_uid))), 'dao_lu');
  return jsonb_build_object('phien_ban', v_pb);
end;
$$;
revoke all on function public.p2d_dl_tang(text, jsonb) from public, anon;
grant execute on function public.p2d_dl_tang(text, jsonb) to authenticated;
