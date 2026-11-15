-- Pháp bảo: hạ cấp món cũ được hoàn Linh Thạch (chủ dự án 15/11/2026 01:53, câu 19: "hoàn linh thạch"; tỉ lệ 80% AI đề nghị).
-- Vì sao qua máy chủ: nâng cấp trước đây tính trên điện thoại, máy chủ chỉ kẹp cấp theo trần cảnh giới, không biết người chơi đã trả bao nhiêu.
-- Hoàn theo cấp thì sửa cấp lên rồi hạ là ra Linh Thạch. Nên máy chủ giữ SỔ số Linh Thạch đã trả cho từng món (p2d_pb_tra):
--   p2d_pb_nang_cap(uid): trừ Linh Thạch, lên một cấp, cộng giá vào sổ (máy khách mới nâng cấp qua hàm này; khách chơi không mạng vẫn tính trong máy).
--   p2d_pb_ha_cap(uid): cấp về 0, hoàn floor(80% × số trong sổ), sổ về 0. Cấp nâng ngoài hàm (bản cũ trên điện thoại, hoặc sửa bản lưu) không có trong sổ, không được hoàn.
--   Cấp đang có lúc áp migration này được ghi sổ một lần theo giá chuẩn (người chơi đã nâng thật trước đó không thiệt).
-- Số chép từ data/phap-bao.json → level (base 300, grow 1,2, cap theo cảnh giới, giá × (1 + 0,5 × bậc phẩm)) và level.refund (0,8);
-- tools/check.mjs so các số này với data/. Sửa số ở data/ thì thêm migration thay hai hàm.

create table if not exists public.p2d_pb_tra (
  user_id uuid not null references auth.users(id) on delete cascade,
  uid integer not null,
  tra bigint not null default 0 check (tra >= 0),
  luc timestamptz not null default now(),
  primary key (user_id, uid)
);
alter table public.p2d_pb_tra enable row level security;   -- không chính sách nào: máy khách không đọc / ghi thẳng, chỉ qua hai hàm dưới

create or replace function public.p2d_pb_gia(p_lv integer, p_grade text)
returns bigint language sql immutable set search_path = '' as $$
  select round(300 * power(1.2::numeric, p_lv) * (1 + 0.5 * greatest(0, coalesce(array_position(array['pham', 'linh', 'huyen', 'dia', 'thien'], p_grade), 1) - 1)))::bigint
$$;

-- Ghi sổ một lần cho cấp đang có
insert into public.p2d_pb_tra (user_id, uid, tra)
select n.user_id, (it ->> 'uid')::int, (select coalesce(sum(public.p2d_pb_gia(i, it ->> 'grade')), 0) from generate_series(0, least((it ->> 'lv')::int, 45) - 1) i)
from public.p2d_nhan_vat n, jsonb_array_elements(case when jsonb_typeof(n.data -> 'phapBao' -> 'items') = 'array' then n.data -> 'phapBao' -> 'items' else '[]'::jsonb end) it
where jsonb_typeof(it -> 'uid') = 'number' and jsonb_typeof(it -> 'lv') = 'number' and (it ->> 'lv')::int > 0
on conflict (user_id, uid) do nothing;

create or replace function public.p2d_pb_nang_cap(p_uid integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid(); v_cap int[] := '{5,10,15,20,25,30,35,40,45}';
  v_nv public.p2d_nhan_vat%rowtype; v_items jsonb; v_it jsonb; v_k int; v_lv int; v_r int; v_gia bigint; v_lt numeric; v_pb int;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_items := case when jsonb_typeof(v_nv.data -> 'phapBao' -> 'items') = 'array' then v_nv.data -> 'phapBao' -> 'items' else '[]'::jsonb end;
  select t.x, t.k - 1 into v_it, v_k from jsonb_array_elements(v_items) with ordinality t(x, k) where (t.x ->> 'uid') = p_uid::text limit 1;
  if v_it is null then raise exception 'khong_thay' using errcode = '22023'; end if;
  v_lv := greatest(coalesce((v_it ->> 'lv')::int, 0), 0);
  v_r := least(greatest(coalesce((v_nv.data ->> 'realm')::int, 0), 0), 8);
  if v_lv >= v_cap[v_r + 1] then raise exception 'tran' using errcode = '22023'; end if;
  v_gia := public.p2d_pb_gia(v_lv, v_it ->> 'grade');
  v_lt := coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0);
  if v_lt < v_gia then raise exception 'thieu' using errcode = '22023'; end if;
  v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_gia));
  v_nv.data := jsonb_set(v_nv.data, array['phapBao', 'items', v_k::text, 'lv'], to_jsonb(v_lv + 1));
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  insert into public.p2d_pb_tra as t (user_id, uid, tra) values (v_me, p_uid, v_gia)
  on conflict (user_id, uid) do update set tra = t.tra + excluded.tra, luc = now();
  return jsonb_build_object('phien_ban', v_pb, 'lv', v_lv + 1, 'tru', v_gia);
end;
$$;
revoke all on function public.p2d_pb_nang_cap(integer) from public, anon;
grant execute on function public.p2d_pb_nang_cap(integer) to authenticated;

create or replace function public.p2d_pb_ha_cap(p_uid integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_items jsonb; v_it jsonb; v_k int; v_lv int; v_tra bigint; v_hoan bigint; v_pb int;
begin
  if v_me is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_items := case when jsonb_typeof(v_nv.data -> 'phapBao' -> 'items') = 'array' then v_nv.data -> 'phapBao' -> 'items' else '[]'::jsonb end;
  select t.x, t.k - 1 into v_it, v_k from jsonb_array_elements(v_items) with ordinality t(x, k) where (t.x ->> 'uid') = p_uid::text limit 1;
  if v_it is null then raise exception 'khong_thay' using errcode = '22023'; end if;
  v_lv := greatest(coalesce((v_it ->> 'lv')::int, 0), 0);
  if v_lv = 0 then raise exception 'chua_nang' using errcode = '22023'; end if;
  select tra into v_tra from public.p2d_pb_tra where user_id = v_me and uid = p_uid for update;
  v_hoan := floor(0.8 * coalesce(v_tra, 0));
  v_nv.data := jsonb_set(v_nv.data, array['phapBao', 'items', v_k::text, 'lv'], '0'::jsonb);
  v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0) + v_hoan));
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  update public.p2d_pb_tra set tra = 0, luc = now() where user_id = v_me and uid = p_uid;
  if v_hoan < floor(0.8 * (select coalesce(sum(public.p2d_pb_gia(i, v_it ->> 'grade')), 0) from generate_series(0, least(v_lv, 45) - 1) i)) then
    -- cấp cao hơn số trong sổ: cấp nâng ngoài hàm nâng cấp (bản cũ hoặc sửa bản lưu); chỉ ghi lại để soi, không phạt
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (v_me, 'pb_ha_cap', jsonb_build_object('uid', p_uid, 'lv', v_lv, 'tra', coalesce(v_tra, 0), 'hoan', v_hoan));
  end if;
  return jsonb_build_object('phien_ban', v_pb, 'lv_cu', v_lv, 'hoan', v_hoan);
end;
$$;
revoke all on function public.p2d_pb_ha_cap(integer) from public, anon;
grant execute on function public.p2d_pb_ha_cap(integer) to authenticated;
