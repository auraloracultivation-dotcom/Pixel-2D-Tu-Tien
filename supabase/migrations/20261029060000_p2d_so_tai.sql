-- Xem hồ sơ và So tài (chủ dự án xin 29/10/2026: "ấn vào tên ở bảng xếp hạng xem được cả trang bị và đá đang đeo; so tài với
-- bản sao người kia có linh thú, người đi theo, dùng chiêu như thường ở chế độ tự đánh").
-- p2d_bxh: mỗi dòng thêm k (mã người chơi dùng chung với kênh chat, p2d_chat_key) để máy khách hỏi hồ sơ.
-- p2d_xem_nguoi(k): hồ sơ công khai lọc từ bản lưu: cảnh giới, hệ, vũ khí, trang bị đang mặc (kèm ngọc khảm), công pháp đang mang,
-- linh thực đang ăn, đan bồi nguyên (máu), 3 ô chiêu và cấp chiêu, linh thú và đồng hành đang mang (cấp, sao, tiến hoá), ngoại hình.
-- Đủ để máy khách tính đúng chỉ số bằng cùng công thức với chính chủ (src/game/stats.js → playerStats). Không trả túi đồ,
-- Linh Thạch, nguyên liệu hay thứ gì khác. Chỉ đọc; trận so tài không có thưởng nên không cần máy chủ chấm.

create or replace function public.p2d_bxh(p_loai text)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_nho  public.p2d_bxh_nho%rowtype;
  v_top  jsonb;
  v_toi  jsonb;
  v_dh   jsonb;
  v_me   public.p2d_nhan_vat%rowtype;
  v_gt   bigint;
  v_hang bigint;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('luc_chien', 'canh_gioi', 'thap') then raise exception 'loai_sai' using errcode = '22023'; end if;
  perform public.p2d_chot_tuan();
  select * into v_nho from public.p2d_bxh_nho where loai = p_loai;
  if (not found or v_nho.luc < now() - interval '60 seconds') and pg_try_advisory_xact_lock(hashtext('p2d_bxh:' || p_loai)) then
    select coalesce(jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri,
             'canh_gioi', x.canh_gioi, 'tang', x.tang, 'co', x.co, 'u', x.user_id) order by x.hang), '[]'::jsonb)
      into v_top from public.p2d_xep_ca(p_loai, 50) x;
    insert into public.p2d_bxh_nho (loai, top, luc) values (p_loai, v_top, now())
    on conflict (loai) do update set top = excluded.top, luc = excluded.luc;
  else
    v_top := coalesce(v_nho.top, '[]'::jsonb);
  end if;
  -- mã người chơi k thay cho mã tài khoản (không lộ mã tài khoản)
  select coalesce(jsonb_agg((e - 'u') || jsonb_build_object('la_toi', e ->> 'u' = v_uid::text, 'k', public.p2d_chat_key((e ->> 'u')::uuid))
         order by (e ->> 'hang')::bigint), '[]'::jsonb)
    into v_top from jsonb_array_elements(v_top) e;
  select * into v_me from public.p2d_nhan_vat where user_id = v_uid;
  if found and (p_loai <> 'thap' or v_me.thap > 0) then
    v_gt := case p_loai when 'luc_chien' then v_me.luc_chien::bigint when 'thap' then v_me.thap::bigint
                        else v_me.canh_gioi::bigint * 10 + v_me.tang end;
    select count(*) + 1 into v_hang from public.p2d_nhan_vat n
     where n.user_id <> v_uid
       and (case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                        else n.canh_gioi::bigint * 10 + n.tang end) > v_gt;
    v_toi := jsonb_build_object('hang', v_hang, 'ten', v_me.ten, 'gia_tri', v_gt, 'canh_gioi', v_me.canh_gioi, 'tang', v_me.tang,
                                'co', v_me.nghi_van >= 10, 'k', public.p2d_chat_key(v_uid));
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('loai', t.loai, 'hang', t.hang)), '[]'::jsonb)
    into v_dh from public.p2d_bxh_tuan t
   where t.user_id = v_uid and t.tuan = public.p2d_tuan_nay() - 7;
  return jsonb_build_object('top', v_top, 'toi', v_toi, 'danh_hieu', v_dh, 'tuan', public.p2d_tuan_nay());
end;
$$;

create or replace function public.p2d_xem_nguoi(p_k text)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid()); n public.p2d_nhan_vat%rowtype; d jsonb; v_equip jsonb; v_pet text; v_comp text;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_k is null or p_k !~ '^[0-9a-f]{12}$' then raise exception 'du_lieu_sai' using errcode = '22023'; end if;
  select * into n from public.p2d_nhan_vat x where public.p2d_chat_key(x.user_id) = p_k limit 1;
  if not found then raise exception 'khong_thay' using errcode = 'P0001'; end if;
  d := n.data;
  v_equip := case when jsonb_typeof(d -> 'equip') = 'object' then d -> 'equip' else '{}'::jsonb end;
  v_pet := d ->> 'pet'; v_comp := d ->> 'companion';
  return jsonb_build_object(
    'k', p_k, 'ten', coalesce(n.ten, public.p2d_ten_mac_dinh(n.user_id)), 'luc_chien', n.luc_chien, 'canh_gioi', n.canh_gioi, 'tang', n.tang,
    'co', n.nghi_van >= 10, 'la_toi', n.user_id = v_uid,
    'save', jsonb_strip_nulls(jsonb_build_object(
      'realm', d -> 'realm', 'layer', d -> 'layer', 'element', d -> 'element', 'weapon', d -> 'weapon', 'root', d -> 'root',
      'equip', v_equip,
      'bag', (select coalesce(jsonb_agg(it), '[]'::jsonb) from jsonb_array_elements(case when jsonb_typeof(d -> 'bag') = 'array' then d -> 'bag' else '[]'::jsonb end) it
               where exists (select 1 from jsonb_each(v_equip) e where e.value = it -> 'uid')),
      'techSlots', d -> 'techSlots', 'techs', d -> 'techs', 'snack', d -> 'snack',
      'flags', jsonb_build_object('boiNguyen', d -> 'flags' -> 'boiNguyen'),
      'loadout', d -> 'loadout', 'skillLv', d -> 'skillLv',
      'pet', d -> 'pet', 'pets', case when v_pet is not null then jsonb_build_object(v_pet, d -> 'pets' -> v_pet) end,
      'companion', d -> 'companion', 'comps', case when v_comp is not null then jsonb_build_object(v_comp, d -> 'comps' -> v_comp) end,
      'look', d -> 'look', 'gioi', d -> 'gioi', 'outfit', d -> 'outfit')));
end;
$$;
revoke all on function public.p2d_xem_nguoi(text) from public, anon;
grant execute on function public.p2d_xem_nguoi(text) to authenticated;
