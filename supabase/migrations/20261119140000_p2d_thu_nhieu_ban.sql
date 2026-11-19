-- Thú cưỡi, thời trang nhiều bản (chủ dự án 19/11/2026 12:58–13:02): cùng loại có nhiều con / nhiều bộ, mỗi bản phẩm ngẫu nhiên Phàm → Tiên,
-- bán theo phẩm như trang bị, Ngự Thú Sư và tiệm thời trang bán lại loại đã có. Máy khách: src/game/inst.js.
-- Khoá bản: bản đầu giữ khoá cũ ('<thú>' trong mounts, '<bộ>:<giới>' trong outfits); bản thêm có đuôi '#xxxxxx'.
-- 1) p2d_doi_thu_cuoi: đã có loại đó thì đặt khoá bản thêm '<thú>#<6 ký tự>', trả 'key'.
-- 2) p2d_thu_cuoi (kiểm thú cưỡi lúc lưu): thú đang chọn (mount = mã loại) hợp lệ khi còn ít nhất một bản cùng loại; dòng của bản đã bán
--    (khoá không còn trong mounts) bỏ đi, không giữ lại (trước đây máy chủ giữ dòng cũ khi máy khách bỏ).
-- 3) p2d_thu_thoi (kiểm thời trang): khoá '<bộ>:<giới>#xxxx' tính giới theo phần trước '#', trả tiền như mua bộ; dòng của bản thêm bốc phẩm
--    ngẫu nhiên (không theo giá), giữ nguyên khi lưu lại; dòng của bản đã bán bỏ đi. Chủ dự án 13:51: mọi bộ ở tiệm 50 000 Linh Thạch,
--    phẩm ngẫu nhiên: bộ bán ở tiệm (kể cả khoá gốc mua từ trước) không bốc lại dòng khi giá đổi.
-- Mua thú vẫn chỉ qua máy chủ (gia rỗng); bản thêm do máy khách tự đặt khoá thú vẫn bị gỡ như cũ (thu_sua).

create or replace function public.p2d_doi_thu_cuoi(p_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_c jsonb := (select v -> 'thu' -> 'cuoi' from public.p2d_ky_cfg where k = 'cfg');
  v_n int; v_tl int; v_d jsonb; v_m jsonb; v_pb int; v_key text; v_cu text;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  v_n := coalesce((v_c ->> 'lenh')::int, 7);
  if not coalesce((v_c -> 'ids') ? p_id, false) then raise exception 'khong_co' using errcode = '22023'; end if;
  select thu_lenh into v_tl from public.p2d_ht_diem where user_id = v_uid for update;
  if coalesce(v_tl, 0) < v_n then raise exception 'thieu' using errcode = '22023'; end if;
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid for update;
  if v_d is null then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_m := case when jsonb_typeof(v_d -> 'mounts') = 'object' then v_d -> 'mounts' else '{}'::jsonb end;
  v_key := p_id;
  if v_m ? p_id then v_key := p_id || '#' || substr(md5(random()::text || clock_timestamp()::text), 1, 6); end if;   -- đã có: bản thêm
  update public.p2d_ht_diem set thu_lenh = thu_lenh - v_n, luc = now() where user_id = v_uid returning thu_lenh into v_tl;
  v_d := jsonb_set(v_d, '{mounts}', v_m || jsonb_build_object(v_key, true));
  v_cu := coalesce(v_d ->> 'mount', '');
  if not exists (select 1 from jsonb_object_keys(v_m) k where split_part(k, '#', 1) = v_cu) then
    v_d := jsonb_set(v_d, '{mount}', to_jsonb(p_id)); v_d := jsonb_set(v_d, '{mountKey}', to_jsonb(v_key));
  end if;
  update public.p2d_nhan_vat set data = v_d, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_uid returning phien_ban into v_pb;
  return jsonb_build_object('thu_lenh', v_tl, 'mount', p_id, 'key', v_key, 'phien_ban', v_pb);
end;
$$;

create or replace function public.p2d_thu_cuoi(p_cu jsonb, p_moi jsonb, p_st jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_c jsonb := (select v -> 'thu' -> 'cuoi' from public.p2d_ky_cfg where k = 'cfg'); v_pool jsonb := (select v -> 'thu' -> 'dong' -> 'mpool' from public.p2d_ky_cfg where k = 'cfg');
  v_om jsonb := public.p2d_thu_bang(p_cu -> 'mounts'); v_nm jsonb := public.p2d_thu_bang(p_moi -> 'mounts');
  v_ol jsonb := case when jsonb_typeof(p_cu -> 'mountLine') = 'object' then p_cu -> 'mountLine' else '{}'::jsonb end;
  v_nl jsonb := p_moi -> 'mountLine';
  v_rm jsonb := '{}'; v_rl jsonb; v_sm jsonb := '{}'; v_sl jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]';
  v_tt jsonb := p_st -> 'tt'; v_t2 jsonb; v_m numeric := (p_st ->> 'm')::numeric; v_id text; v_g jsonb; v_ok boolean; v_gia numeric; v_sel jsonb;
begin
  for v_id, v_g in select e.key, e.value from jsonb_each(v_nm) e loop
    if v_om ? v_id then
      v_rm := v_rm || jsonb_build_object(v_id, v_om -> v_id);
      if v_g is distinct from v_om -> v_id then v_sm := v_sm || jsonb_build_object(v_id, v_om -> v_id); end if;
      continue;
    end if;
    v_ok := false; v_gia := (v_c -> 'gia' ->> v_id)::numeric;
    if not ((v_c -> 'ids') ? v_id) then v_ly := v_ly || 'thu_sua'::text;
    elsif v_id = v_c ->> 'starter' and not (p_st ->> 'stm')::boolean then p_st := p_st || '{"stm": true}'; v_ok := true;
    else
      v_t2 := case when (v_c -> 'roi') ? v_id then public.p2d_thu_tra(v_tt, v_gia, '{}', true) end;
      if v_t2 is not null then v_tt := v_t2; v_ok := true;
      elsif (v_c -> 'roi') ? v_id and v_m >= 1 then v_m := v_m - 1; v_ok := true;
      else
        v_t2 := public.p2d_thu_tra(v_tt, v_gia, '{}', false);
        if v_t2 is not null then v_tt := v_t2; v_ok := true;
        else v_ly := v_ly || case when (v_c -> 'roi') ? v_id then 'thu_nhieu' else 'thu_sua' end; end if;
      end if;
    end if;
    if v_ok then
      v_rm := v_rm || jsonb_build_object(v_id, true);
      if v_g <> 'true'::jsonb then v_sm := v_sm || jsonb_build_object(v_id, true); end if;
    else
      v_sm := v_sm || jsonb_build_object(v_id, null);
      if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'mount', 'id', v_id, 'gui', v_g, 'may_chu', null)); end if;
    end if;
  end loop;
  -- dòng chỉ còn cho bản đang có (bản đã bán bỏ dòng)
  v_rl := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(v_ol) e where v_rm ? e.key), '{}'::jsonb);
  if jsonb_typeof(v_nl) = 'object' then
    for v_id, v_g in select e.key, e.value from jsonb_each(v_nl) e loop
      if v_ol ? v_id and v_rm ? v_id then
        if v_g is distinct from v_ol -> v_id then
          v_sl := v_sl || jsonb_build_object(v_id, v_ol -> v_id);
          if not (jsonb_typeof(v_g) = 'object' and v_g ? 'wait') then
            v_ly := v_ly || case when public.p2d_thu_dong_dung(v_g, v_pool, 0, null) then 'thu_cu' else 'thu_sua' end;
            if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'mountLine', 'id', v_id, 'gui', v_g, 'may_chu', v_ol -> v_id)); end if;
          end if;
        end if;
      elsif v_rm ? v_id then
        v_rl := v_rl || jsonb_build_object(v_id, public.p2d_thu_dong(v_pool, 0, null));
        v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
        if not (jsonb_typeof(v_g) = 'object' and v_g ? 'wait') then v_ly := v_ly || 'thu_cu'::text; end if;
      else
        v_sl := v_sl || jsonb_build_object(v_id, null);
      end if;
    end loop;
  end if;
  for v_id in select e.key from jsonb_each(v_rl) e where jsonb_typeof(v_nl) is distinct from 'object' or not (v_nl ? e.key) loop
    v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
  end loop;
  v_sel := p_moi -> 'mount';   -- mã loại: hợp lệ khi còn ít nhất một bản cùng loại
  if jsonb_typeof(v_sel) = 'string' and not exists (select 1 from jsonb_object_keys(v_rm) k where split_part(k, '#', 1) = (v_sel #>> '{}')) then
    v_sel := case when jsonb_typeof(p_cu -> 'mount') = 'string' and exists (select 1 from jsonb_object_keys(v_rm) k where split_part(k, '#', 1) = (p_cu ->> 'mount')) then p_cu -> 'mount' else 'null'::jsonb end;
    v_sua := jsonb_build_object('mount', v_sel); v_ly := v_ly || 'thu_nhieu'::text;
  end if;
  if v_sm <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('mounts', v_sm); end if;
  if v_sl <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('mountLine', v_sl); end if;
  return jsonb_build_object('m', v_rm, 'l', v_rl, 'sel', v_sel, 'sua', v_sua, 'ly', to_jsonb(v_ly), 'ct', v_ct,
    'st', p_st || jsonb_build_object('tt', v_tt, 'm', v_m));
end;
$$;

create or replace function public.p2d_thu_thoi(p_cu jsonb, p_moi jsonb, p_uid uuid, p_st jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_t jsonb := (select v -> 'thu' -> 'thoi' from public.p2d_ky_cfg where k = 'cfg');
  v_om jsonb := case when jsonb_typeof(p_cu -> 'outfits') = 'object' then p_cu -> 'outfits' else '{}'::jsonb end;
  v_nm jsonb := case when jsonb_typeof(p_moi -> 'outfits') = 'object' then p_moi -> 'outfits' else '{}'::jsonb end;
  v_ol jsonb := case when jsonb_typeof(p_cu -> 'outfitLine') = 'object' then p_cu -> 'outfitLine' else '{}'::jsonb end;
  v_nl jsonb := p_moi -> 'outfitLine'; v_look text;
  v_rm jsonb := '{}'; v_rl jsonb; v_sm jsonb := '{}'; v_sl jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]';
  v_tt jsonb := p_st -> 'tt'; v_t2 jsonb; v_id text; v_g jsonb; v_bo jsonb; v_b text; v_gi text; v_te integer; v_co boolean; v_cho boolean; v_ban boolean;
begin
  v_look := case when (v_t -> 'look') ? coalesce(p_moi ->> 'look', '') then p_moi ->> 'look' else v_t ->> 'def' end;
  for v_id, v_g in select e.key, e.value from jsonb_each(v_nm) e loop
    if v_om ? v_id then
      v_rm := v_rm || jsonb_build_object(v_id, v_om -> v_id);
      if v_g is distinct from v_om -> v_id then v_sm := v_sm || jsonb_build_object(v_id, v_om -> v_id); end if;
      continue;
    end if;
    v_b := split_part(v_id, ':', 1); v_gi := split_part(split_part(v_id, ':', 2), '#', 1); v_bo := v_t -> 'bo' -> v_b;
    if v_bo is null or (v_gi <> '' and not ((v_t -> 'look') ? v_gi)) or v_g <> 'true'::jsonb then v_ly := v_ly || 'thu_nhieu'::text;
    elsif jsonb_typeof(v_bo -> 2) = 'number' then
      v_t2 := public.p2d_thu_tra(v_tt, (v_bo ->> 2)::numeric, '{}', false);
      if v_t2 is not null then v_tt := v_t2; v_rm := v_rm || jsonb_build_object(v_id, true); continue; end if;
      v_ly := v_ly || 'thu_sua'::text;
    else v_ly := v_ly || case when (v_bo ->> 3)::boolean then 'thu_sua' else 'thu_nhieu' end;
    end if;
    v_sm := v_sm || jsonb_build_object(v_id, null);
    if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'outfit', 'id', v_id, 'gui', v_g, 'may_chu', null)); end if;
  end loop;
  -- dòng của bản thêm đã bán (khoá có '#', không còn trong outfits) bỏ đi; bộ gốc giữ như cũ (có sẵn, thành tựu, lễ không nằm trong outfits)
  v_rl := coalesce((select jsonb_object_agg(e.key, e.value) from jsonb_each(v_ol) e where position('#' in e.key) = 0 or v_rm ? e.key), '{}'::jsonb);
  if jsonb_typeof(v_nl) = 'object' then
    for v_id, v_g in select e.key, e.value from jsonb_each(v_nl) e loop
      continue when v_g = v_rl -> v_id;
      v_ban := position('#' in v_id) > 0;
      v_b := split_part(v_id, ':', 1); v_gi := split_part(split_part(v_id, ':', 2), '#', 1); v_bo := v_t -> 'bo' -> v_b;
      v_cho := jsonb_typeof(v_g) = 'object' and v_g ? 'wait';
      if v_bo is null or not ((v_t -> 'look') ? v_gi) or (v_ban and not (v_rm ? v_id)) then
        v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
        continue;
      end if;
      v_te := case when v_ban or jsonb_typeof(v_bo -> 2) = 'number' then null else (v_bo ->> 0)::integer end;   -- bộ bán ở tiệm (mọi bản): phẩm ngẫu nhiên, giữ dòng đang có khi đổi giá (13:51); bộ có sẵn / thưởng: phẩm cố định
      v_co := (jsonb_typeof(v_bo -> 2) <> 'number' and not (v_bo ->> 3)::boolean) or v_rm ? v_id or (v_rm -> v_b = 'true'::jsonb and v_gi = v_look)
              or (jsonb_typeof(v_bo -> 4) = 'array' and (v_bo -> 4) ? p_uid::text);
      if v_rl ? v_id and (v_te is null or public.p2d_ky_so(v_rl -> v_id -> 't') = v_te or not v_co) then
        v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
        if not v_cho then
          v_ly := v_ly || case when public.p2d_thu_dong_dung(v_g, case when jsonb_typeof(v_bo -> 1) = 'string' then jsonb_build_array(v_bo -> 1) else v_t -> 'pool' end, 0, v_te) then 'thu_cu' else 'thu_sua' end;
          if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'outfitLine', 'id', v_id, 'gui', v_g, 'may_chu', v_rl -> v_id)); end if;
        end if;
      elsif v_co then
        v_rl := v_rl || jsonb_build_object(v_id, public.p2d_thu_dong(case when jsonb_typeof(v_bo -> 1) = 'string' then jsonb_build_array(v_bo -> 1) else v_t -> 'pool' end, 0, v_te));
        v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
        if not v_cho then v_ly := v_ly || 'thu_cu'::text; end if;
      else
        v_sl := v_sl || jsonb_build_object(v_id, null); v_ly := v_ly || 'thu_nhieu'::text;
      end if;
    end loop;
  end if;
  for v_id in select e.key from jsonb_each(v_rl) e where jsonb_typeof(v_nl) is distinct from 'object' or not (v_nl ? e.key) loop
    v_sl := v_sl || jsonb_build_object(v_id, v_rl -> v_id);
  end loop;
  if v_sm <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('outfits', v_sm); end if;
  if v_sl <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('outfitLine', v_sl); end if;
  return jsonb_build_object('m', v_rm, 'l', v_rl, 'sua', v_sua, 'ly', to_jsonb(v_ly), 'ct', v_ct, 'st', p_st || jsonb_build_object('tt', v_tt));
end;
$$;
