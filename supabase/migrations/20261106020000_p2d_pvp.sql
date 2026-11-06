-- PvP ở Ngoại Vực Vết Nứt (chủ dự án 06/11/2026 09:06 và 09:37): chỉ ở vet-nut-ngoai, chỉ khi cả hai đều tắt bảo vệ, chỉ tính khi
-- đứng trong tầm chiêu; ai cũng đánh được ai (Luyện Khí đánh Độ Kiếp cũng được). Chết thì rơi 1 trang bị hoặc vật phẩm trong kho kèm
-- 10% Linh Thạch; trang bị đang mặc không mất.
-- Máy chủ phòng Cloudflare (cloud/src/pvp.js) giữ máu PvP, kiểm tầm, nhịp đánh, lực chiến; ai gục thì lõi Mang ký HMAC (cùng khoá
-- cf_mang, migration 20261106010000) gửi p2d_pvp_ghi → một dòng nợ. Người gục tự trả nợ qua p2d_pvp_tra (máy họ gọi ngay khi gục
-- và mỗi lần vào game, qua game.cloud.run như lệnh chợ) → máy chủ trừ trong bản lưu, gửi đồ + Linh Thạch vào Hòm thư người hạ.
-- Chống lạm dụng: cùng một cặp chỉ tính một lần mỗi giờ (khỏi đánh mãi một người, khỏi chuyển đồ giữa tài khoản phụ);
-- bên nào đang cờ đỏ (nghi_van ≥ 10) thì đồ rơi bị huỷ, không vào tay ai.

create table if not exists public.p2d_pvp_no (
  id bigint generated always as identity primary key,
  ts bigint not null,
  ke uuid not null,
  nan uuid not null,
  tao_luc timestamptz not null default now(),
  tra_luc timestamptz,
  ket_qua jsonb,
  unique (ts, nan)
);
create index if not exists p2d_pvp_no_nan_idx on public.p2d_pvp_no (nan) where tra_luc is null;
create index if not exists p2d_pvp_no_cap_idx on public.p2d_pvp_no (ke, nan, tao_luc desc);
alter table public.p2d_pvp_no enable row level security;
revoke all on table public.p2d_pvp_no from public, anon, authenticated;

-- Cloudflare báo một lần hạ: p_ds = {"k": người hạ, "v": người gục}, ký HMAC-SHA256(ts.ds) bằng khoá cf_mang
create or replace function public.p2d_pvp_ghi(p_ts bigint, p_ds text, p_ky text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_khoa text := (select v from public.p2d_bi_mat where k = 'cf_mang'); v_d jsonb; v_k uuid; v_v uuid;
begin
  if v_khoa is null or p_ts is null or p_ds is null or p_ky is null or length(p_ds) > 500 then raise exception 'sai' using errcode = '42501'; end if;
  if abs(extract(epoch from now()) * 1000 - p_ts) > 120000 then raise exception 'het_gio' using errcode = '42501'; end if;
  if encode(extensions.hmac(p_ts::text || '.' || p_ds, v_khoa, 'sha256'), 'hex') <> lower(p_ky) then raise exception 'sai_ky' using errcode = '42501'; end if;
  v_d := p_ds::jsonb;
  v_k := (v_d ->> 'k')::uuid; v_v := (v_d ->> 'v')::uuid;
  if v_k = v_v then return false; end if;
  if exists (select 1 from public.p2d_pvp_no n where n.ke = v_k and n.nan = v_v and n.tao_luc > now() - interval '1 hour') then return false; end if;
  insert into public.p2d_pvp_no (ts, ke, nan) values (p_ts, v_k, v_v) on conflict do nothing;
  return found;
end;
$$;
revoke all on function public.p2d_pvp_ghi(bigint, text, text) from public;
grant execute on function public.p2d_pvp_ghi(bigint, text, text) to anon, authenticated;

-- Người gục trả nợ. Trả { phien_ban, mat: [{ lt, item_uid | mat_id + n, ke_ten }] } để máy họ sửa bản lưu y như máy chủ.
create or replace function public.p2d_pvp_tra()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_n record; v_ra jsonb := '[]'::jsonb;
  v_lt numeric; v_mat bigint; v_bag jsonb; v_eq jsonb; v_cands jsonb; v_c jsonb; v_kq jsonb; v_thu jsonb; v_huy boolean; v_ten_ke text; v_ten text;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then return jsonb_build_object('mat', v_ra); end if;
  v_ten := coalesce(v_nv.ten, 'Đạo hữu');
  for v_n in select * from public.p2d_pvp_no n where n.nan = v_uid and n.tra_luc is null order by n.id for update loop
    select coalesce(k.ten, 'Đạo hữu'), (coalesce(k.nghi_van, 0) >= 10 or coalesce(v_nv.nghi_van, 0) >= 10) into v_ten_ke, v_huy
      from public.p2d_nhan_vat k where k.user_id = v_n.ke;
    v_huy := coalesce(v_huy, true);
    -- 10% Linh Thạch
    v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
    v_mat := greatest(0, floor(v_lt * 0.1))::bigint;
    if v_mat > 0 then v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_mat)); end if;
    v_kq := jsonb_build_object('lt', v_mat, 'ke_ten', v_ten_ke);
    v_thu := jsonb_build_object('coins', v_mat, 'tu', v_ten);
    -- 1 món: trang bị trong túi không đang mặc, hoặc một phần (10%, ít nhất 1) của một loại nguyên liệu
    v_bag := case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' else '[]'::jsonb end;
    v_eq := case when jsonb_typeof(v_nv.data -> 'equip') = 'object' then v_nv.data -> 'equip' else '{}'::jsonb end;
    select coalesce(jsonb_agg(c), '[]'::jsonb) into v_cands from (
      select jsonb_build_object('i', b) c from jsonb_array_elements(v_bag) b
        where jsonb_typeof(b -> 'uid') = 'number' and not exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')
      union all
      select jsonb_build_object('m', e.key, 'n', greatest(1, floor((e.value #>> '{}')::numeric * 0.1))::bigint) from jsonb_each(
          case when jsonb_typeof(v_nv.data -> 'mats') = 'object' then v_nv.data -> 'mats' else '{}'::jsonb end) e
        where jsonb_typeof(e.value) = 'number' and (e.value #>> '{}')::numeric >= 1 and e.key ~ '^[a-z0-9-]{1,40}$'
    ) s;
    if jsonb_array_length(v_cands) > 0 then
      v_c := v_cands -> floor(random() * jsonb_array_length(v_cands))::int;
      if v_c ? 'i' then
        v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce((select jsonb_agg(b) from jsonb_array_elements(v_bag) b where b -> 'uid' is distinct from v_c -> 'i' -> 'uid'), '[]'::jsonb));
        v_kq := v_kq || jsonb_build_object('item_uid', v_c -> 'i' -> 'uid', 'item', (v_c -> 'i') - 'sig');
        v_thu := v_thu || jsonb_build_object('item', (v_c -> 'i') - 'sig');
      else
        v_nv.data := jsonb_set(v_nv.data, array['mats', v_c ->> 'm'], to_jsonb((v_nv.data -> 'mats' ->> (v_c ->> 'm'))::numeric - (v_c ->> 'n')::numeric));
        v_kq := v_kq || jsonb_build_object('mat_id', v_c ->> 'm', 'n', (v_c ->> 'n')::bigint);
        v_thu := v_thu || jsonb_build_object('mat', jsonb_build_object('id', v_c ->> 'm', 'n', (v_c ->> 'n')::bigint));
      end if;
    end if;
    if not v_huy and (v_mat > 0 or v_thu ? 'item' or v_thu ? 'mat') then
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_n.ke, v_thu, 'pvp_ha');
    end if;
    v_kq := v_kq || jsonb_build_object('huy', v_huy);
    update public.p2d_pvp_no set tra_luc = now(), ket_qua = v_kq where id = v_n.id;
    v_ra := v_ra || jsonb_build_array(v_kq);
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_nv.phien_ban;
  end if;
  return jsonb_build_object('mat', v_ra, 'phien_ban', v_nv.phien_ban);
end;
$$;
revoke all on function public.p2d_pvp_tra() from public, anon;
grant execute on function public.p2d_pvp_tra() to authenticated;
