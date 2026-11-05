-- Đường nhanh cho p2d_kiem_thu (giai đoạn 4, 20261105120000_p2d_ky_thu): đo trên máy chủ thật 05/11/2026 sau khi bật, mỗi lần lưu
-- tốn thêm ~3,7 ms dù không đổi linh thú / thú cưỡi / công pháp... (phần lớn các lần lưu). Nay lần lưu không đổi khoá nào của giai
-- đoạn 4 chỉ cộng dồn giây còn liên lạc / vắng mặt vào kyThu.dt / kyThu.off; lần có đổi mới hồi thùng bằng tổng giây đó rồi xoá
-- dt / off (kyThu dựng lại). Thùng tăng tuyến tính tới trần nên kết quả y như hồi từng lần. Chạy lại không sao (thay hàm).

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
  -- đường nhanh (20261105130000): không khoá nào của giai đoạn 4 đổi thì chỉ cộng dồn giây vào kyThu (dt, off), không tính thùng;
  -- lần có đổi mới hồi thùng một lượt bằng tổng giây (thùng tăng tuyến tính tới trần nên kết quả y như hồi từng lần)
  if not p_tk_moi and (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(p_moi) e where e.key = any (v_kh))
     = (select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb) from jsonb_each(p_cu) e where e.key = any (v_kh)) then
    return jsonb_build_object('data', p_moi || jsonb_build_object('kyThu', v_ky || jsonb_build_object(
        'dt', round(least(43200, coalesce(public.p2d_ky_so(v_ky -> 'dt'), 0) + v_dt), 1),
        'off', round(least(28800, coalesce(public.p2d_ky_so(v_ky -> 'off'), 0) + v_off), 1))),
      'ly_do', '[]'::jsonb, 'chi_tiet', '[]'::jsonb, 'tieu_lt', 0, 'tieu_nl', 0);
  end if;
  v_dt := least(43200, v_dt + coalesce(public.p2d_ky_so(v_ky -> 'dt'), 0));
  v_off := least(28800, v_off + coalesce(public.p2d_ky_so(v_ky -> 'off'), 0));
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
revoke all on function public.p2d_kiem_thu(jsonb, jsonb, numeric, numeric, boolean, numeric, numeric, uuid) from public, anon, authenticated;
