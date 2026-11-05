-- Chữ ký giai đoạn 4, phần 2 (đọc đầu file 20261105120000_p2d_ky_thu.sql): công pháp, cấp chiêu, động phủ; hàm kiểm chung
-- p2d_kiem_thu; tẩy luyện linh thú / khôi lỗi / thú cưỡi do máy chủ tung (p2d_tay_thu); vá p2d_doi_tn, p2d_luu.
-- Chạy sau 20261105120000_p2d_ky_thu.sql. Chạy lại không đổi gì.

-- Công pháp (techs, techSlots). Cuốn mới / bí kíp trùng: thùng sv.cp_moi (mỗi phần một cuốn hoặc kinh nghiệm một cấp);
-- kinh nghiệm cuốn đang mang: thùng kinh nghiệm công pháp. Cuốn đã học không mất. Trả { m, slots, sua, ly, ct, st }.
create or replace function public.p2d_thu_cp(p_cu jsonb, p_moi jsonb, p_st jsonb) returns jsonb language plpgsql volatile set search_path = ''
as $$
declare
  v_k jsonb := (select v -> 'thu' -> 'tech' from public.p2d_ky_cfg where k = 'cfg');
  v_o jsonb := case when jsonb_typeof(p_cu -> 'techs') = 'object' then p_cu -> 'techs' else '{}'::jsonb end;
  v_n jsonb := case when jsonb_typeof(p_moi -> 'techs') = 'object' then p_moi -> 'techs' else v_o end;
  v_act jsonb := (case when jsonb_typeof(p_cu -> 'techSlots') = 'array' then p_cu -> 'techSlots' else '[]'::jsonb end)
                 || (case when jsonb_typeof(p_moi -> 'techSlots') = 'array' then p_moi -> 'techSlots' else '[]'::jsonb end);
  v_x numeric := (p_st -> 'x' ->> 'tech')::numeric; v_xt numeric := (p_st -> 'xt' ->> 'tech')::numeric; v_t numeric := (p_st ->> 't')::numeric;
  v_ra jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]'; v_sl jsonb; v_ss jsonb := '{}';
  v_id text; v_g jsonb; v_e jsonb; v_b jsonb; v_lyc text; v_lv numeric; v_lvb numeric; v_max numeric := (v_k ->> 'max')::numeric; v_d numeric; v_a numeric; v_can numeric; v_u numeric;
begin
  for v_id, v_g in select e.key, e.value from jsonb_each(v_n) e loop
    v_b := v_o -> v_id; v_lyc := null;
    if v_b is not null and v_g = v_b then v_ra := v_ra || jsonb_build_object(v_id, v_g); continue; end if;
    if v_b is null then
      if not ((v_k -> 'ids') ? v_id) or jsonb_typeof(v_g) is distinct from 'object' then v_lyc := 'thu_sua';
      elsif v_id = v_k ->> 'starter' and v_o = '{}'::jsonb then v_b := '{"lv": 1, "exp": 0}';   -- công pháp khởi đầu (game.js pendingTech)
      elsif v_t >= 1 then v_t := v_t - 1; v_b := '{"lv": 1, "exp": 0}';
      else v_lyc := 'thu_nhieu'; end if;
      if v_lyc is not null then v_ly := v_ly || v_lyc; v_sua := v_sua || jsonb_build_object(v_id, null); continue; end if;
    elsif jsonb_typeof(v_b) is distinct from 'object' then v_b := '{}';
    end if;
    v_e := case when jsonb_typeof(v_g) = 'object' then v_g else v_b end;
    v_lv := public.p2d_ky_so(v_e -> 'lv'); v_lvb := coalesce(public.p2d_ky_so(v_b -> 'lv'), 1);
    if jsonb_typeof(v_g) is distinct from 'object' or v_lv is null or v_lv < 1 or v_lv <> floor(v_lv) or (v_lv > v_max and v_lv > v_lvb)
       or (v_e ? 'exp' and public.p2d_ky_so(v_e -> 'exp') is null) then
      v_e := public.p2d_thu_giu(v_e, v_b, array['lv', 'exp']); v_lyc := 'thu_sua';
    else
      v_d := public.p2d_thu_cach(v_k -> 'exp', v_lvb, public.p2d_ky_so(v_b -> 'exp'), v_lv, public.p2d_ky_so(v_e -> 'exp'));
      v_a := case when v_act @> to_jsonb(v_id) then v_x else 0 end;
      if v_d > v_a then
        v_can := public.p2d_thu_can(v_k -> 'exp', least(v_lv, v_max)); v_u := ceil((v_d - v_a) / v_can);   -- bí kíp trùng: mỗi cuốn một cấp
        if v_u <= floor(v_t) then v_t := v_t - v_u; v_x := v_x - v_a;
        else
          v_lyc := case when v_d > v_x + floor(v_t) * v_can + v_xt then 'thu_sua' else 'thu_nhieu' end;
          v_e := public.p2d_thu_giu(v_e, v_b, array['lv', 'exp']);
        end if;
      elsif v_d > 0 then v_x := v_x - v_d;
      end if;
    end if;
    v_ra := v_ra || jsonb_build_object(v_id, v_e);
    if v_e is distinct from v_g then v_sua := v_sua || jsonb_build_object(v_id, v_e); end if;
    if v_lyc is not null then
      v_ly := v_ly || v_lyc;
      if v_lyc = 'thu_sua' and jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('loai', 'tech', 'id', v_id, 'gui', v_g, 'may_chu', v_e)); end if;
    end if;
  end loop;
  for v_id in select e.key from jsonb_each(v_o) e where not (v_n ? e.key) loop   -- cuốn đã học không mất
    v_ra := v_ra || jsonb_build_object(v_id, v_o -> v_id); v_sua := v_sua || jsonb_build_object(v_id, v_o -> v_id);
  end loop;
  -- ô mang: cuốn đã học, không trùng, tối đa slots
  select coalesce(jsonb_agg(x.id order by x.n), '[]'::jsonb) into v_sl from (
    select s.e #>> '{}' as id, min(s.n) as n from jsonb_array_elements(case when jsonb_typeof(p_moi -> 'techSlots') = 'array' then p_moi -> 'techSlots' else coalesce(p_cu -> 'techSlots', '[]'::jsonb) end) with ordinality s(e, n)
     where jsonb_typeof(s.e) = 'string' and v_ra ? (s.e #>> '{}') group by 1 order by 2 limit (v_k ->> 'slots')::integer) x;
  if v_sua <> '{}'::jsonb then v_ss := jsonb_build_object('techs', v_sua); end if;
  if v_sl is distinct from p_moi -> 'techSlots' then v_ss := v_ss || jsonb_build_object('techSlots', v_sl); end if;
  return jsonb_build_object('m', v_ra, 'slots', v_sl, 'sua', v_ss, 'ly', to_jsonb(v_ly), 'ct', v_ct, 'st', p_st || jsonb_build_object('t', v_t, 'x', (p_st -> 'x') || jsonb_build_object('tech', v_x)));
end;
$$;

-- Cấp chiêu (skillLv, src/game/skill-level.js) và động phủ (caveLv, src/game/evolve.js): mỗi cấp lên phải trả đủ phí trong lần lưu.
-- Hạ cấp thì nhận (không có lợi). Trả { sk, cave, sua, ly, st }.
create or replace function public.p2d_thu_cap(p_cu jsonb, p_moi jsonb, p_st jsonb) returns jsonb language plpgsql volatile set search_path = ''
as $$
declare
  v_c jsonb := (select v -> 'thu' from public.p2d_ky_cfg where k = 'cfg'); v_k jsonb;
  v_o jsonb := case when jsonb_typeof(p_cu -> 'skillLv') = 'object' then p_cu -> 'skillLv' else '{}'::jsonb end;
  v_n jsonb := case when jsonb_typeof(p_moi -> 'skillLv') = 'object' then p_moi -> 'skillLv' else '{}'::jsonb end;
  v_tt jsonb := p_st -> 'tt'; v_t2 jsonb; v_ra jsonb := '{}'; v_ss jsonb := '{}'; v_sua jsonb := '{}'; v_ly text[] := '{}';
  v_id text; v_g jsonb; v_v numeric; v_b numeric; v_l integer; v_lt numeric; v_bk numeric; v_cv numeric; v_cb numeric; v_r numeric;
begin
  v_k := v_c -> 'chieu';
  for v_id, v_g in select e.key, e.value from jsonb_each(v_n) e loop
    v_v := public.p2d_ky_so(v_g); v_b := least(greatest(coalesce(public.p2d_ky_so(v_o -> v_id), 1), 1), (v_k ->> 'max')::numeric);
    if v_g = v_o -> v_id then v_ra := v_ra || jsonb_build_object(v_id, v_g); continue; end if;
    if not ((v_k -> 'ids') ? v_id) or v_v is null or v_v <> floor(v_v) or v_v < 1 then
      v_sua := v_sua || jsonb_build_object(v_id, v_o -> v_id);
      if v_o ? v_id then v_ra := v_ra || jsonb_build_object(v_id, v_o -> v_id); end if;
      continue;
    end if;
    if v_v > v_b then
      v_lt := 0; v_bk := 0;
      if v_v <= (v_k ->> 'max')::numeric then
        for v_l in v_b::integer .. v_v::integer - 1 loop
          v_bk := v_bk + ceil((v_k -> 'book' ->> 0)::numeric * power((v_k -> 'book' ->> 1)::numeric, v_l - 1) - 0.000000001);
          v_lt := v_lt + round((v_k -> 'coins' ->> 0)::numeric * power((v_k -> 'coins' ->> 1)::numeric, v_l - 1));
        end loop;
        v_t2 := public.p2d_thu_tra(v_tt, v_lt, jsonb_build_object(v_k ->> 'mat', v_bk), false);
      else v_t2 := null; end if;
      if v_t2 is null then
        v_ly := v_ly || 'thu_sua'::text; v_sua := v_sua || jsonb_build_object(v_id, v_o -> v_id);
        if v_o ? v_id then v_ra := v_ra || jsonb_build_object(v_id, v_o -> v_id); end if;
        continue;
      end if;
      v_tt := v_t2;
    end if;
    v_ra := v_ra || jsonb_build_object(v_id, v_g);
  end loop;
  if v_sua <> '{}'::jsonb then v_ss := jsonb_build_object('skillLv', v_sua); end if;
  -- động phủ: từng cấp cần cảnh giới và phí (data/cave.json levels)
  v_cv := coalesce(public.p2d_ky_so(p_moi -> 'caveLv'), 0); v_cb := coalesce(public.p2d_ky_so(p_cu -> 'caveLv'), 0);
  v_r := greatest(coalesce(public.p2d_ky_so(p_cu -> 'realm'), 0), coalesce(public.p2d_ky_so(p_moi -> 'realm'), 0));
  if v_cv <> v_cb and (v_cv <> floor(v_cv) or v_cv < 0) then v_cv := v_cb; v_ss := v_ss || jsonb_build_object('caveLv', v_cb);
  elsif v_cv > v_cb then
    v_l := v_cb::integer;
    while v_l < v_cv loop
      exit when v_c -> 'dong_phu' -> v_l is null or v_r < (v_c -> 'dong_phu' -> v_l ->> 0)::numeric;
      v_t2 := public.p2d_thu_tra(v_tt, (v_c -> 'dong_phu' -> v_l ->> 1)::numeric, v_c -> 'dong_phu' -> v_l -> 2, false);
      exit when v_t2 is null;
      v_tt := v_t2; v_l := v_l + 1;
    end loop;
    if v_l < v_cv then v_cv := v_l; v_ly := v_ly || 'thu_sua'::text; v_ss := v_ss || jsonb_build_object('caveLv', v_l); end if;
  end if;
  return jsonb_build_object('sk', v_ra, 'cave', v_cv, 'sua', v_ss, 'ly', to_jsonb(v_ly), 'st', p_st || jsonb_build_object('tt', v_tt));
end;
$$;

-- Có khoá nào trong nhóm khác bản máy chủ
create or replace function public.p2d_thu_doi(p_cu jsonb, p_moi jsonb, p_k text[]) returns boolean language sql immutable set search_path = ''
as $$ select exists (select 1 from unnest(p_k) k where (p_cu -> k) is distinct from (p_moi -> k)) $$;

-- Kiểm chung (p2d_luu gọi sau p2d_kiem_ngoc). p_cu: bản máy chủ (đã cộng tiền bán, p2d_mien_tran); p_moi: bản gửi (Linh Thạch,
-- nguyên liệu đã sửa theo thùng); p_dt: giây còn liên lạc; p_tuong: giây thật từ lần lưu trước; p_xo / p_xo_nl: thùng Linh Thạch /
-- nguyên liệu còn lại. Trả { data (bản lưu đã sửa, kèm kyThu), sua?, ly_do, chi_tiet, tieu_lt, tieu_nl (bù từ thùng) }.
create or replace function public.p2d_kiem_thu(p_cu jsonb, p_moi jsonb, p_dt numeric, p_tuong numeric, p_tk_moi boolean, p_xo numeric, p_xo_nl numeric, p_uid uuid)
returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_sv jsonb := (select v -> 'thu' -> 'sv' from public.p2d_ky_cfg where k = 'cfg');
  v_ky jsonb := case when jsonb_typeof(p_cu -> 'kyThu') = 'object' then p_cu -> 'kyThu' else '{}'::jsonb end;
  v_kh text[] := array['pets', 'comps', 'mounts', 'mountLine', 'outfits', 'outfitLine', 'techs', 'techSlots', 'skillLv', 'caveLv', 'pet', 'mount', 'companion', 'companion2'];
  v_dt numeric := least(greatest(coalesce(p_dt, 0), 0), 43200); v_off numeric;
  v_g integer; v_can numeric; v_toc numeric; v_tq numeric; v_q numeric; v_kk text; v_x jsonb := '{}'; v_xt jsonb := '{}'; v_b jsonb := '{}';
  v_st jsonb; v_a jsonb; v_data jsonb := p_moi; v_sua jsonb := '{}'; v_ly text[] := '{}'; v_ct jsonb := '[]'; v_f jsonb; v_nt boolean;
begin
  v_off := least(greatest(coalesce(p_tuong, 0) - v_dt, 0), 28800);
  -- tốc linh khí trần (trigger p2d_kiem_linh_khi), tầng cao hơn giữa bản máy chủ và bản gửi; tài khoản mới: thùng kinh nghiệm rỗng
  v_g := least(80, greatest(0, greatest(coalesce(public.p2d_ky_so(p_cu -> 'realm'), 0) * 9 + coalesce(public.p2d_ky_so(p_cu -> 'layer'), 1) - 1,
                                        coalesce(public.p2d_ky_so(p_moi -> 'realm'), 0) * 9 + coalesce(public.p2d_ky_so(p_moi -> 'layer'), 1) - 1)))::integer;
  v_can := public.p2d_lk_can(v_g); v_toc := greatest(90 * power(1.6, least(v_g / 9, 4)), v_can / 150); v_tq := greatest(500000, v_can * 8);
  foreach v_kk in array array['pet', 'comp', 'tech'] loop
    v_q := (v_sv -> 'exp_k' ->> v_kk)::numeric;
    v_xt := v_xt || jsonb_build_object(v_kk, v_q * v_tq);
    v_x := v_x || jsonb_build_object(v_kk, least(v_q * v_tq, coalesce(public.p2d_ky_so(v_ky -> 'x' -> v_kk), case when p_tk_moi then 0 else v_q * v_tq end) + v_q * v_toc * v_dt + v_q * 20 * v_off));
  end loop;
  -- thùng đếm theo phút còn liên lạc: bản sao, loài linh thú mới, công pháp mới, thú cưỡi rơi (tài khoản mới: bắt đầu ở sv.dau × đầy)
  foreach v_kk in array array['s:sao', 'p:moi', 't:cp_moi', 'm:cuoi'] loop
    v_q := (v_sv -> split_part(v_kk, ':', 2) ->> 'tran')::numeric;
    v_b := v_b || jsonb_build_object(split_part(v_kk, ':', 1), least(v_q, coalesce(public.p2d_ky_so(v_ky -> split_part(v_kk, ':', 1)), case when p_tk_moi then (v_sv ->> 'dau')::numeric else 1 end * v_q) + (v_sv -> split_part(v_kk, ':', 2) ->> 'phut')::numeric / 60 * v_dt));
  end loop;
  v_st := v_b || jsonb_build_object('x', v_x, 'xt', v_xt,
    'stp', public.p2d_thu_dung(v_ky -> 'stp') or public.p2d_thu_dung(p_cu -> 'flags' -> 'nguThu'),
    'stm', public.p2d_thu_dung(v_ky -> 'stm') or public.p2d_thu_dung(p_cu -> 'flags' -> 'nguThu'),
    'tt', jsonb_build_object('d', greatest(0, coalesce(public.p2d_ky_so(p_cu -> 'lingshi'), 0) - coalesce(public.p2d_ky_so(p_moi -> 'lingshi'), 0)),
      'x', greatest(coalesce(p_xo, 0), 0), 'xn', greatest(coalesce(p_xo_nl, 0), 0), 'tl', 0, 'tn', 0,
      'dm', (select coalesce(jsonb_object_agg(e.key, greatest(0, (e.value #>> '{}')::numeric - coalesce(public.p2d_ky_so(p_moi -> 'mats' -> e.key), 0))), '{}'::jsonb)
               from jsonb_each(case when jsonb_typeof(p_cu -> 'mats') = 'object' then p_cu -> 'mats' else '{}'::jsonb end) e where jsonb_typeof(e.value) = 'number')));
  -- phần lớn các lần lưu không đổi khoá nào ở đây: chỉ hồi thùng
  if (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(p_moi) e where e.key = any (v_kh))
     = (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(p_cu) e where e.key = any (v_kh)) then
    v_nt := true;
  else
    v_nt := false;
    -- linh thú, con đang mang (mỗi nhóm chỉ kiểm khi khoá của nhóm đổi)
    if public.p2d_thu_doi(p_cu, p_moi, array['pets', 'pet']) then
    v_a := public.p2d_thu_bay('pet', p_cu -> 'pets', p_moi -> 'pets', jsonb_build_array(p_cu -> 'pet', p_moi -> 'pet'), v_st);
    v_st := v_a -> 'st'; v_data := jsonb_set(v_data, '{pets}', v_a -> 'm'); v_ly := v_ly || array(select jsonb_array_elements_text(v_a -> 'ly')); v_ct := v_ct || (v_a -> 'ct');
    if v_a -> 'sua' <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('pets', v_a -> 'sua'); end if;
    if jsonb_typeof(v_data -> 'pet') = 'string' and not ((v_data -> 'pets') ? (v_data ->> 'pet')) then
      v_f := case when jsonb_typeof(p_cu -> 'pet') = 'string' and (v_data -> 'pets') ? (p_cu ->> 'pet') then p_cu -> 'pet' else 'null'::jsonb end;
      v_data := jsonb_set(v_data, '{pet}', v_f); v_sua := v_sua || jsonb_build_object('pet', v_f); v_ly := v_ly || 'thu_nhieu'::text;
    end if;
    end if;
    -- khôi lỗi, hai con đang mang
    if public.p2d_thu_doi(p_cu, p_moi, array['comps', 'companion', 'companion2']) then
    v_a := public.p2d_thu_bay('comp', p_cu -> 'comps', p_moi -> 'comps', jsonb_build_array(p_cu -> 'companion', p_cu -> 'companion2', p_moi -> 'companion', p_moi -> 'companion2'), v_st);
    v_st := v_a -> 'st'; v_data := jsonb_set(v_data, '{comps}', v_a -> 'm'); v_ly := v_ly || array(select jsonb_array_elements_text(v_a -> 'ly')); v_ct := v_ct || (v_a -> 'ct');
    if v_a -> 'sua' <> '{}'::jsonb then v_sua := v_sua || jsonb_build_object('comps', v_a -> 'sua'); end if;
    foreach v_kk in array array['companion', 'companion2'] loop
      if jsonb_typeof(v_data -> v_kk) = 'string' and not ((v_data -> 'comps') ? (v_data ->> v_kk)) then
        v_data := jsonb_set(v_data, array[v_kk], 'null'::jsonb); v_sua := v_sua || jsonb_build_object(v_kk, null); v_ly := v_ly || 'thu_nhieu'::text;
      end if;
    end loop;
    end if;
    -- thú cưỡi, dòng thú cưỡi
    if public.p2d_thu_doi(p_cu, p_moi, array['mounts', 'mountLine', 'mount']) then
    v_a := public.p2d_thu_cuoi(p_cu, v_data, v_st);
    v_st := v_a -> 'st'; v_data := jsonb_set(jsonb_set(v_data, '{mounts}', v_a -> 'm'), '{mountLine}', v_a -> 'l');
    if jsonb_typeof(p_moi -> 'mounts') is distinct from 'object' and p_moi -> 'mounts' is distinct from (v_a -> 'm') then   -- mảng / sai kiểu: trả cả bảng
      v_sua := v_sua || jsonb_build_object('mounts_all', v_a -> 'm'); v_ly := v_ly || 'thu_sua'::text;
    end if;
    if v_data ? 'mount' then v_data := jsonb_set(v_data, '{mount}', coalesce(v_a -> 'sel', 'null'::jsonb)); end if;
    v_ly := v_ly || array(select jsonb_array_elements_text(v_a -> 'ly')); v_ct := v_ct || (v_a -> 'ct'); v_sua := v_sua || (v_a -> 'sua');
    end if;
    -- thời trang
    if public.p2d_thu_doi(p_cu, p_moi, array['outfits', 'outfitLine']) then
    v_a := public.p2d_thu_thoi(p_cu, v_data, p_uid, v_st);
    v_st := v_a -> 'st'; v_data := jsonb_set(jsonb_set(v_data, '{outfits}', v_a -> 'm'), '{outfitLine}', v_a -> 'l');
    v_ly := v_ly || array(select jsonb_array_elements_text(v_a -> 'ly')); v_ct := v_ct || (v_a -> 'ct'); v_sua := v_sua || (v_a -> 'sua');
    end if;
    -- công pháp
    if public.p2d_thu_doi(p_cu, p_moi, array['techs', 'techSlots']) then
    v_a := public.p2d_thu_cp(p_cu, v_data, v_st);
    v_st := v_a -> 'st'; v_data := jsonb_set(jsonb_set(v_data, '{techs}', v_a -> 'm'), '{techSlots}', v_a -> 'slots');
    v_ly := v_ly || array(select jsonb_array_elements_text(v_a -> 'ly')); v_ct := v_ct || (v_a -> 'ct'); v_sua := v_sua || (v_a -> 'sua');
    end if;
    -- cấp chiêu, động phủ
    if public.p2d_thu_doi(p_cu, p_moi, array['skillLv', 'caveLv']) then
    v_a := public.p2d_thu_cap(p_cu, v_data, v_st);
    v_st := v_a -> 'st'; v_data := jsonb_set(v_data, '{skillLv}', v_a -> 'sk');
    if v_data ? 'caveLv' or (v_a ->> 'cave')::numeric > 0 then v_data := jsonb_set(v_data, '{caveLv}', v_a -> 'cave'); end if;
    v_ly := v_ly || array(select jsonb_array_elements_text(v_a -> 'ly')); v_sua := v_sua || (v_a -> 'sua');
    end if;
  end if;
  if p_tk_moi and array_length(v_ly, 1) > 0 then v_ly := array['thu_dau']; end if;   -- lần lưu đầu: chỉ ghi
  v_data := v_data || jsonb_build_object('kyThu', jsonb_build_object(
    'x', (select jsonb_object_agg(e.key, round((e.value #>> '{}')::numeric, 2)) from jsonb_each(v_st -> 'x') e),
    's', round((v_st ->> 's')::numeric, 2), 'p', round((v_st ->> 'p')::numeric, 3), 't', round((v_st ->> 't')::numeric, 3), 'm', round((v_st ->> 'm')::numeric, 4),
    'stp', (v_st ->> 'stp')::boolean, 'stm', (v_st ->> 'stm')::boolean));
  return jsonb_build_object('data', v_data, 'ly_do', to_jsonb(array(select distinct unnest(v_ly))), 'chi_tiet', v_ct,
    'tieu_lt', (v_st -> 'tt' ->> 'tl')::numeric, 'tieu_nl', (v_st -> 'tt' ->> 'tn')::numeric)
    || case when v_sua <> '{}'::jsonb then jsonb_build_object('sua', v_sua || jsonb_build_object('im', coalesce(array_length(v_ly, 1), 0) = 0)) else '{}'::jsonb end;
end;
$$;

-- Tẩy luyện linh thú / khôi lỗi (src/game/beast.js rerollBeast: mở thêm 1 dòng tới trần dòng, phí coins × mul^(số dòng) + mats)
-- hoặc thú cưỡi (rerollMount: bốc lại dòng %, phí cố định). Máy chủ tung, trừ phí trên bản lưu máy chủ, tăng phien_ban.
create or replace function public.p2d_tay_thu(p_loai text, p_id text) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg'); v_d jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_key text; v_b jsonb; v_lines jsonb; v_n integer; v_cap integer; v_q numeric; v_lv numeric;
  v_fee numeric; v_mats jsonb; v_k text; v_m numeric; v_line jsonb;
begin
  v_d := v_cfg -> 'thu' -> 'dong';
  if coalesce(p_loai, '') not in ('pet', 'puppet', 'mount') or coalesce(p_id, '') !~ '^[a-z0-9-]{1,40}$' then raise exception 'loai_sai' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if p_loai = 'mount' then
    if not public.p2d_thu_dung(v_nv.data -> 'mounts' -> p_id) then raise exception 'khong_thu' using errcode = '22023'; end if;
    v_fee := (v_d ->> 'mphi')::numeric; v_mats := v_d -> 'mmats';
  else
    v_key := case when p_loai = 'pet' then 'pets' else 'comps' end;
    v_b := v_nv.data -> v_key -> p_id;
    if jsonb_typeof(v_b) is distinct from 'object' then raise exception 'khong_thu' using errcode = '22023'; end if;
    v_lv := greatest(coalesce(public.p2d_ky_so(v_b -> 'lv'), 1), 1);
    v_b := v_b || jsonb_build_object('lvl', v_lv);
    v_lines := case when jsonb_typeof(v_b -> 'lines') = 'array' then v_b -> 'lines' else '[]'::jsonb end;
    v_n := jsonb_array_length(v_lines);
    v_q := public.p2d_ky_so(v_b -> 'cap');   -- trần dòng; chưa có thì bốc (ensureCap), không thấp hơn số dòng đang có
    if v_q is not null and v_q = floor(v_q) then v_cap := v_q::integer;
    else
      v_cap := greatest(v_n, public.p2d_ky_boc(array(select x::numeric from jsonb_array_elements_text(v_cfg -> 'cap_w') with ordinality a(x, i) order by i)) + 1);
      v_b := v_b || jsonb_build_object('cap', v_cap);
    end if;
    if v_n >= v_cap then
      if v_q is null or v_q <> floor(v_q) then   -- trần vừa bốc: lưu lại
        v_nv.data := jsonb_set(v_nv.data, array[v_key, p_id], v_b);
        return jsonb_build_object('du_dong', true, 'thu', v_b, 'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data), 'tru', jsonb_build_object('coins', 0, 'mats', '{}'::jsonb));
      end if;
      raise exception 'du_dong' using errcode = '22023';
    end if;
    v_fee := round((v_d -> 'phi' ->> 0)::numeric * power((v_d -> 'phi' ->> 1)::numeric, v_n)); v_mats := v_d -> 'mats';
  end if;
  if coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0) < v_fee then raise exception 'thieu' using errcode = '22023'; end if;
  for v_k, v_m in select e.key, (e.value #>> '{}')::numeric from jsonb_each(coalesce(v_mats, '{}'::jsonb)) e loop
    if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k), 0) < v_m then raise exception 'thieu' using errcode = '22023'; end if;
    v_nv.data := jsonb_set(v_nv.data, array['mats', v_k], to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k) - v_m));
  end loop;
  v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0) - v_fee));
  if p_loai = 'mount' then
    v_line := public.p2d_thu_dong(v_d -> 'mpool', 0, null);
    if jsonb_typeof(v_nv.data -> 'mountLine') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mountLine}', '{}'::jsonb); end if;
    v_nv.data := jsonb_set(v_nv.data, array['mountLine', p_id], v_line);
    return jsonb_build_object('thu', v_line, 'dong', v_line, 'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data), 'tru', jsonb_build_object('coins', v_fee, 'mats', v_mats));
  end if;
  v_line := public.p2d_thu_dong(v_d -> 'pool', v_lv, null);
  v_b := v_b || jsonb_build_object('lines', v_lines || jsonb_build_array(v_line));
  v_nv.data := jsonb_set(v_nv.data, array[v_key, p_id], v_b);
  return jsonb_build_object('thu', v_b, 'dong', v_line, 'cuoi', v_n + 1 >= v_cap, 'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data),
    'tru', jsonb_build_object('coins', v_fee, 'mats', v_mats));
end;
$$;

-- Bộ thời trang đổi bằng Tiên Ngọc: ghi vào bản lưu máy chủ (bản theo giới tính đang chọn, như grantOutfit ở máy khách)
create or replace function public.p2d_thu_tn(p_data jsonb, p_ma text) returns jsonb language sql stable set search_path = ''
as $$
  select case when t -> 'tn' ? coalesce(p_ma, '') then
    jsonb_set(case when jsonb_typeof(p_data -> 'outfits') = 'object' then p_data else jsonb_set(p_data, '{outfits}', '{}'::jsonb) end,
              array['outfits', (t -> 'tn' ->> p_ma) || ':' || case when (t -> 'look') ? coalesce(p_data ->> 'look', '') then p_data ->> 'look' else t ->> 'def' end], 'true'::jsonb)
    else p_data end
  from (select v -> 'thu' -> 'thoi' as t from public.p2d_ky_cfg where k = 'cfg') c
$$;

-- Thùng tiền bán (linh thú, thú cưỡi, đồ; p2d_mien_tran cộng thẳng vào bản máy chủ, ngoài thùng Linh Thạch thường và trần ngày):
-- hồi ban.giay + tốc Linh Thạch của cảnh giới (6 × 1,6^cảnh giới, như p2d_luu) mỗi giây còn liên lạc, đầy ban.tran + ban.toc_giay × tốc.
-- Phần vượt bỏ khỏi bản máy chủ (lần lưu này tính như Linh Thạch thường, qua thùng lt_xo). p_cu: trước p2d_mien_tran, p_sau: sau.
create or replace function public.p2d_thu_ban(p_cu jsonb, p_sau jsonb, p_dt numeric) returns jsonb language plpgsql stable set search_path = ''
as $$
declare
  v_b0 jsonb := (select v -> 'thu' -> 'sv' -> 'ban' from public.p2d_ky_cfg where k = 'cfg');
  v_toc numeric := 6 * power(1.6, least(greatest(coalesce(public.p2d_ky_so(p_cu -> 'realm'), 0), 0), 8));
  v_tran numeric; v_b numeric; v_d numeric; v_lt numeric := coalesce(public.p2d_ky_so(p_cu -> 'lingshi'), 0);
begin
  v_tran := (v_b0 ->> 'tran')::numeric + (v_b0 ->> 'toc_giay')::numeric * v_toc;
  v_b := least(v_tran, coalesce(public.p2d_ky_so(p_cu -> 'kyThu' -> 'b'), v_tran) + ((v_b0 ->> 'giay')::numeric + v_toc) * greatest(coalesce(p_dt, 0), 0));
  v_d := coalesce(public.p2d_ky_so(p_sau -> 'lingshi'), 0) - v_lt;
  if v_d <= v_b then return jsonb_build_object('cu', p_sau, 'b', round(v_b - greatest(v_d, 0), 2), 'ly', '[]'::jsonb); end if;
  return jsonb_build_object('cu', jsonb_set(p_sau, '{lingshi}', to_jsonb(v_lt + floor(v_b))), 'b', 0, 'ly', '["ban_lo"]'::jsonb,
    'ct', jsonb_build_object('ban', v_d, 'nhan', floor(v_b)));
end;
$$;

revoke all on function public.p2d_thu_cp(jsonb, jsonb, jsonb), public.p2d_thu_cap(jsonb, jsonb, jsonb), public.p2d_thu_doi(jsonb, jsonb, text[]),
  public.p2d_kiem_thu(jsonb, jsonb, numeric, numeric, boolean, numeric, numeric, uuid), public.p2d_thu_tn(jsonb, text), public.p2d_thu_ban(jsonb, jsonb, numeric) from public, anon, authenticated;
revoke all on function public.p2d_tay_thu(text, text) from public, anon;
grant execute on function public.p2d_tay_thu(text, text) to authenticated;

-- Vá p2d_doi_tn: đổi bộ thời trang bằng Tiên Ngọc thì ghi bộ vào bản lưu máy chủ
do $$
declare d text := pg_get_functiondef('public.p2d_doi_tn(text)'::regprocedure);
  neo text := 'data = data || jsonb_build_object(''tn'', tien_ngoc - v_gia)';
begin
  if position('p2d_thu_tn' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_doi_tn da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, 'data = public.p2d_thu_tn(data, p_ma) || jsonb_build_object(''tn'', tien_ngoc - v_gia)');
end;
$$;

-- Vá p2d_mien_tran: thú cưỡi dạng mảng (máy khách sửa) đọc như bảng, không coi là đã bán hết để cộng tiền bán
do $$
declare d text := pg_get_functiondef('public.p2d_mien_tran(jsonb,jsonb,uuid)'::regprocedure);
  a1 text := 'if jsonb_typeof(p_cu -> ''mounts'') = ''object'' then'; b1 text := 'if jsonb_typeof(p_cu -> ''mounts'') in (''object'', ''array'') then';
  a2 text := 'jsonb_object_keys(p_cu -> ''mounts'')'; b2 text := 'jsonb_object_keys(public.p2d_thu_bang(p_cu -> ''mounts''))';
  a3 text := 'case when jsonb_typeof(p_moi -> ''mounts'') = ''object'' then p_moi -> ''mounts'' else ''{}''::jsonb end'; b3 text := 'public.p2d_thu_bang(p_moi -> ''mounts'')';
  x text;
begin
  if position('p2d_thu_bang' in d) > 0 then return; end if;
  foreach x in array array[a1, a2, a3] loop
    if (length(d) - length(replace(d, x, ''))) / length(x) <> 1 then raise exception 'p2d_mien_tran da doi, khong tim thay cho va: %', left(x, 60); end if;
  end loop;
  execute replace(replace(replace(d, a1, b1), a2, b2), a3, b3);
end;
$$;

-- Vá p2d_luu (bản đang chạy = 20261031030000 + vá 20261104030000 … 20261105090000): gọi p2d_kiem_thu ngay sau p2d_kiem_ngoc,
-- trừ phần bù từ thùng Linh Thạch / nguyên liệu, trả sua.thu; tiền bán (p2d_mien_tran) qua thùng tiền bán p2d_thu_ban.
-- 'thu_cu', 'thu_nhieu', 'thu_dau', 'ban_lo' chỉ ghi, không cộng điểm (phần vượt vẫn bị thùng Linh Thạch thường cắt, ghi linh_thach).
-- Bằng chứng (bản gửi và bản máy chủ) ghi 'thu_mon' như 'sua_do_mon'.
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  khai text := '  v_tao timestamptz; v_nang boolean := false; v_on numeric; v_ngoc jsonb; v_roi jsonb;';
  mt text := '  if not v_moi then v_cu.data := public.p2d_mien_tran(v_cu.data, v_data, v_uid); end if;';
  neo text := '  if (v_ngoc ->> ''sua'')::boolean then v_sua := v_sua || jsonb_build_object(''gems'', v_ngoc -> ''gems''); end if;';
  neo2 text := '  if v_sua <> ''{}''::jsonb then perform set_config(''p2d.sua'', v_sua::text, true); end if;';
  a text := 'array_length(' || repeat('array_remove(', 8) || 'v_ly_do';
  b text := 'array_length(' || repeat('array_remove(', 12) || 'v_ly_do';
  a2 text := '''ngoc_lo''), 1)';
  b2 text := '''ngoc_lo''), ''thu_cu''), ''thu_nhieu''), ''thu_dau''), ''ban_lo''), 1)';
  x text;
begin
  if position('p2d_kiem_thu' in d) > 0 then return; end if;
  foreach x in array array[khai, mt, neo, neo2, a, a2] loop
    if (length(d) - length(replace(d, x, ''))) / length(x) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va: %', left(x, 60); end if;
  end loop;
  d := replace(d, khai, khai || ' v_thu jsonb; v_ban jsonb;');
  d := replace(d, mt, '  if not v_moi then   -- tiền bán vượt thùng tiền bán (p2d_thu_ban) tính như Linh Thạch thường (20261105120000_p2d_ky_thu)' || chr(10) ||
    '    v_ban := public.p2d_thu_ban(v_cu.data, public.p2d_mien_tran(v_cu.data, v_data, v_uid), v_dt);' || chr(10) ||
    '    v_cu.data := v_ban -> ''cu''; v_ly_do := v_ly_do || array(select jsonb_array_elements_text(v_ban -> ''ly''));' || chr(10) ||
    '  end if;');
  d := replace(d, neo, neo || chr(10) ||
    '  -- Linh thú, khôi lỗi, thú cưỡi, công pháp, thời trang, cấp chiêu, động phủ (20261105120000_p2d_ky_thu): phần sai trả về sua.thu' || chr(10) ||
    '  v_thu := public.p2d_kiem_thu(v_cu.data, v_data, least(v_dt, v_on + 5), case when v_moi then 0 else extract(epoch from (now() - v_cu.luu_luc)) end, v_moi, v_xo, v_xo_nl, v_uid);' || chr(10) ||
    '  v_data := v_thu -> ''data'';' || chr(10) ||
    '  if v_ban is not null then v_data := jsonb_set(v_data, ''{kyThu,b}'', v_ban -> ''b''); end if;' || chr(10) ||
    '  v_xo := v_xo - (v_thu ->> ''tieu_lt'')::numeric; v_xo_nl := v_xo_nl - (v_thu ->> ''tieu_nl'')::numeric;' || chr(10) ||
    '  v_ly_do := v_ly_do || array(select jsonb_array_elements_text(v_thu -> ''ly_do''));' || chr(10) ||
    '  if v_thu ? ''sua'' then v_sua := v_sua || jsonb_build_object(''thu'', v_thu -> ''sua''); end if;');
  d := replace(d, neo2,
    '  if (v_thu -> ''ly_do'') ? ''thu_sua'' and not exists (select 1 from public.p2d_nghi_van x where x.user_id = v_uid and x.ly_do = ''thu_mon'' and x.luc > now() - interval ''10 minutes'') then' || chr(10) ||
    '    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (v_uid, ''thu_mon'', jsonb_build_object(''thu'', v_thu -> ''chi_tiet''));' || chr(10) ||
    '  end if;' || chr(10) || neo2);
  execute replace(replace(d, a2, b2), a, b);
end;
$$;
