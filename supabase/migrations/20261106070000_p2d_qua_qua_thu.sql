-- Mọi quà đi qua Hòm thư, bấm Nhận mới vào kho (chủ dự án 06/11/2026: "all quà đều qua thư và đều cần bấm để nhận mới vào kho").
-- Trước: quà ra mắt Tiên Ngọc (p2d_qua_tn) và quà chia sẻ clip (p2d_qua_chia_se) cộng thẳng vào bản lưu, mã quà (p2d_nhap_ma)
-- cộng thẳng điểm QTV, quà Zalo cộng ngọc ở máy; còn thư thì game tự nhận mỗi 90 giây nên người chơi không thấy quà
-- (Thần Nguyên báo "chưa nhận quà" top 3 Thôn Thiên Mãng: thư đã tự nhận lúc 11:54, vũ khí và ngọc đã vào túi).
-- Giờ bốn chỗ trên chỉ gửi thư (số quà giữ nguyên); p2d_nhan_thu_moi nhận thêm hai loại nội dung:
--   tn (Tiên Ngọc, cộng cột tien_ngoc và data.tn) và diem (điểm QTV, ghi p2d_qtv_so).
-- Quà Zalo lên máy chủ (p2d_qua_zalo): 1 viên ngọc cấp 5 (data/community.json zalo.gem_level), mỗi tài khoản một lần.
-- Phía game (src/game/market.js, src/ui/inbox-panel.js) thôi tự nhận thư: Hòm thư có mục Quà chờ nhận, nút Nhận / Nhận hết.

create or replace function public.p2d_nhan_thu_moi(p_ids bigint[], p_uid_tu bigint default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_t record; v_next bigint; v_cho integer; v_item jsonb; v_lt numeric; v_ra jsonb := '[]'::jsonb; v_nd jsonb; v_gk text;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_next := greatest(coalesce(case when jsonb_typeof(v_nv.data -> 'nextUid') = 'number' then (v_nv.data ->> 'nextUid')::bigint end, 1), coalesce(p_uid_tu, 0));
  v_cho := 40 - coalesce(jsonb_array_length(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end), 0);
  for v_t in select * from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.id = any (p_ids) order by t.id loop
    v_nd := v_t.noi_dung;
    if v_nd ? 'item' then
      if v_cho <= 0 then continue; end if;
      v_item := public.p2d_ky_dong(((v_nd -> 'item') - 'sig') || jsonb_build_object('uid', v_next));   -- uid mới: ký lại (20261105010000_p2d_ky_mon)
      v_nv.data := jsonb_set(v_nv.data, '{bag}', coalesce(case when jsonb_typeof(v_nv.data -> 'bag') = 'array' then v_nv.data -> 'bag' end, '[]'::jsonb) || jsonb_build_array(v_item));
      v_nd := jsonb_set(v_nd, '{item}', v_item); v_next := v_next + 1; v_cho := v_cho - 1;
    end if;
    if v_nd ? 'coins' and jsonb_typeof(v_nd -> 'coins') = 'number' then
      v_lt := coalesce(case when jsonb_typeof(v_nv.data -> 'lingshi') = 'number' then (v_nv.data ->> 'lingshi')::numeric end, 0);
      v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt + (v_nd ->> 'coins')::numeric));
    end if;
    if v_nd ? 'mat' and jsonb_typeof(v_nd -> 'mat' -> 'n') = 'number' and coalesce(v_nd -> 'mat' ->> 'id', '') ~ '^[a-z0-9-]{1,40}$' then
      if jsonb_typeof(v_nv.data -> 'mats') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mats}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['mats', v_nd -> 'mat' ->> 'id'], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'mats' -> (v_nd -> 'mat' ->> 'id')) = 'number' then (v_nv.data -> 'mats' ->> (v_nd -> 'mat' ->> 'id'))::numeric end, 0) + (v_nd -> 'mat' ->> 'n')::numeric));
    end if;
    v_gk := v_nd -> 'gem' ->> 'key';
    if v_nd ? 'gem' and jsonb_typeof(v_nd -> 'gem' -> 'n') = 'number' and public.p2d_ngoc_dung(coalesce(v_gk, '')) then
      if jsonb_typeof(v_nv.data -> 'gems') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{gems}', '{}'::jsonb); end if;
      v_nv.data := jsonb_set(v_nv.data, array['gems', v_gk], to_jsonb(
        coalesce(case when jsonb_typeof(v_nv.data -> 'gems' -> v_gk) = 'number' then (v_nv.data -> 'gems' ->> v_gk)::numeric end, 0) + (v_nd -> 'gem' ->> 'n')::numeric));
    end if;
    -- Tiên Ngọc (quà ra mắt quầy): cột tien_ngoc là số thật, data.tn để game hiện
    if v_nd ? 'tn' and jsonb_typeof(v_nd -> 'tn') = 'number' and (v_nd ->> 'tn')::numeric > 0 then
      v_nv.tien_ngoc := v_nv.tien_ngoc + (v_nd ->> 'tn')::integer;
      v_nv.data := v_nv.data || jsonb_build_object('tn', v_nv.tien_ngoc);
    end if;
    -- điểm QTV (mã quà): ghi sổ lúc bấm nhận
    if v_nd ? 'diem' and jsonb_typeof(v_nd -> 'diem') = 'number' and (v_nd ->> 'diem')::numeric > 0 then
      insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu)
      values (v_uid, (v_nd ->> 'diem')::integer, 'ma_qua', left(coalesce(v_nd ->> 'ref', ''), 64), left(coalesce(v_nd ->> 'ghi', 'Mã quà'), 200));
    end if;
    update public.p2d_hom_thu set nhan_luc = now() where id = v_t.id;
    v_ra := v_ra || jsonb_build_array(jsonb_build_object('id', v_t.id, 'noi_dung', v_nd, 'ly_do', v_t.ly_do));
  end loop;
  if jsonb_array_length(v_ra) > 0 then
    v_nv.data := jsonb_set(v_nv.data, '{nextUid}', to_jsonb(v_next));
    update public.p2d_nhan_vat set data = v_nv.data, tien_ngoc = v_nv.tien_ngoc, phien_ban = phien_ban + 1, updated_at = now()
     where user_id = v_uid returning phien_ban into v_nv.phien_ban;
  end if;
  return jsonb_build_object('thu', v_ra, 'phien_ban', v_nv.phien_ban, 'next_uid', v_next, 'tn', v_nv.tien_ngoc);
end;
$$;
revoke all on function public.p2d_nhan_thu_moi(bigint[], bigint) from public, anon;
grant execute on function public.p2d_nhan_thu_moi(bigint[], bigint) to authenticated;

-- Quà ra mắt quầy Tiên Ngọc: gửi thư, đánh dấu đã gửi (tn_qua); không đụng bản lưu
create or replace function public.p2d_qua_tn()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_n integer;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if v_nv.tn_qua then return jsonb_build_object('tn', v_nv.tien_ngoc, 'them', 0, 'thu', false); end if;
  select tn into v_n from public.p2d_tn_gia where ma = '_qua_ra_mat';
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, jsonb_build_object('tn', v_n), 'qua_tn');
  update public.p2d_nhan_vat set tn_qua = true where user_id = v_uid;
  return jsonb_build_object('tn', v_nv.tien_ngoc, 'them', v_n, 'thu', true);
end;
$$;
revoke all on function public.p2d_qua_tn() from public, anon;
grant execute on function public.p2d_qua_tn() to authenticated;

-- Quà chia sẻ clip (gọi từ hàm chia-se-clip bằng service_role): ghi bài, gửi thư 1 viên ngọc cấp 5
create or replace function public.p2d_qua_chia_se(p_uid uuid, p_bai text, p_link text, p_tac_gia text, p_loai text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_key text := p_loai || ':5';
begin
  if p_loai is null or p_loai not in ('hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc') then
    raise exception 'loai_sai' using errcode = '22023';
  end if;
  if p_bai is null or p_bai !~ '^(tiktok|youtube):[A-Za-z0-9_-]{5,40}$' then
    raise exception 'link_sai' using errcode = '22023';
  end if;
  perform 1 from public.p2d_nhan_vat where user_id = p_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_chia_se where user_id = p_uid) then raise exception 'da_nhan' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_chia_se where bai = p_bai) then raise exception 'link_da_dung' using errcode = '22023'; end if;
  insert into public.p2d_chia_se (user_id, bai, link, tac_gia, ngoc)
  values (p_uid, p_bai, left(p_link, 300), left(p_tac_gia, 80), v_key);
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (p_uid, jsonb_build_object('gem', jsonb_build_object('key', v_key, 'n', 1)), 'chia_se');
  return jsonb_build_object('gem', v_key, 'thu', true);
end;
$$;
revoke all on function public.p2d_qua_chia_se(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.p2d_qua_chia_se(uuid, text, text, text, text) to service_role;

-- Mã quà: đúng mã thì gửi thư điểm QTV (ghi sổ lúc bấm nhận)
create or replace function public.p2d_nhap_ma(p_ma text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_m public.p2d_ma_qua%rowtype; v_ma text := upper(btrim(coalesce(p_ma, '')));
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ma_qua:' || v_uid::text));
  select * into v_m from public.p2d_ma_qua where ma = v_ma for update;
  if not found then return jsonb_build_object('ok', false, 'ly_do', 'sai_ma'); end if;
  if v_m.dung_boi is not null then return jsonb_build_object('ok', false, 'ly_do', case when v_m.dung_boi = v_uid then 'da_nhap' else 'het_luot' end); end if;
  if exists (select 1 from public.p2d_ma_qua where dot = v_m.dot and dung_boi = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'da_nhap_dot'); end if;
  update public.p2d_ma_qua set dung_boi = v_uid, dung_luc = now() where ma = v_ma;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
  values (v_uid, jsonb_build_object('diem', v_m.diem, 'ref', v_ma, 'ghi', left('Mã quà ' || coalesce(v_m.ghi_chu, v_m.dot), 200)), 'ma_qua');
  return jsonb_build_object('ok', true, 'diem', v_m.diem, 'thu', true);
end;
$$;
revoke all on function public.p2d_nhap_ma(text) from public, anon;
grant execute on function public.p2d_nhap_ma(text) to authenticated;

-- Quà nhóm Zalo: 1 viên ngọc cấp 5 loại người chơi chọn, mỗi tài khoản một lần (bản lưu đã có quaZalo = đã nhận kiểu cũ)
create or replace function public.p2d_qua_zalo(p_loai text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  if p_loai is null or p_loai not in ('hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc') then raise exception 'loai_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if (v_nv.data -> 'quaZalo') = 'true'::jsonb or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.ly_do = 'zalo') then
    return jsonb_build_object('ok', false, 'ly_do', 'da_nhan');
  end if;
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, jsonb_build_object('gem', jsonb_build_object('key', p_loai || ':5', 'n', 1)), 'zalo');
  return jsonb_build_object('ok', true, 'gem', p_loai || ':5');
end;
$$;
revoke all on function public.p2d_qua_zalo(text) from public, anon;
grant execute on function public.p2d_qua_zalo(text) to authenticated;
