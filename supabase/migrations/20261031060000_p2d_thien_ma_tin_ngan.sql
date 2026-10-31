-- Sửa Đại Ma Thần (31/10/2026): tin kênh thế giới tối đa 120 ký tự (p2d_chat_noi_dung_check) — thông báo dài làm nhịp sống
-- của Đại Ma Thần và trận khiêu chiến lỗi. Rút ngắn, cắt bằng left(); tên người khiêu chiến cắt 20 ký tự. Lời thua đổi thành
-- "bại dưới tay". Đã áp lên máy chủ (p2d_thien_ma_7_nhip_ngan, p2d_thien_ma_8_kc_ngan).

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
      values ('the-gioi', v_uid, 'Thiên Đạo', left('【Thiên Đạo】Trời đất biến sắc, ' || v_ten || ' xuất thế! Chiến bại hắn có cơ duyên nhận Đạo Vận vàng.', 120));
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
  v_ten := left(coalesce(n.ten, public.p2d_ten_mac_dinh(v_uid)), 20);
  v_ta := greatest(n.luc_chien, 0) * (0.8 + random() * 0.4);
  -- Chỉ số thật của Đại Ma Thần (chủ dự án 08:59: không đeo đồ thì yếu): lực chiến máy khách của chính tài khoản đó, không chặn trần
  v_ma := coalesce((select case when jsonb_typeof(x.data -> 'power') = 'number' then (x.data ->> 'power')::numeric end from public.p2d_nhan_vat x where x.user_id = p_tm), t.suc_manh) * (0.8 + random() * 0.4);
  v_thang := v_ta > v_ma;
  if v_thang then
    select q.mon into v_mon from public.p2d_thien_ma_qua q order by random() limit 1;
    v_mon := v_mon || jsonb_build_object('el', v_els[1 + floor(random() * 5)::int]);
    if v_mon ->> 'base' = 'dao-van-binh' and n.data ? 'weapon' then v_mon := v_mon || jsonb_build_object('wt', n.data ->> 'weapon'); end if;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, jsonb_build_object('item', v_mon), 'Chiến bại ' || t.ten);
    insert into public.p2d_thien_ma_tran (user_id, thien_ma, thang, mon) values (v_uid, p_tm, true, v_mon);
    insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
    values ('the-gioi', p_tm, 'Thiên Đạo', left('【Thiên Đạo】' || v_ten || ' chiến bại ' || t.ten || ', đoạt được một món Đạo Vận vàng!', 120));
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
  values ('the-gioi', p_tm, 'Thiên Đạo', left('【Thiên Đạo】' || v_ten || ' bại dưới tay ' || t.ten || ', tổn một thành tu vi, rơi về ' || v_ve || '.', 120));
  return jsonb_build_object('thang', false, 'sau', v_moi, 'phien_ban', n.phien_ban, 'ngoc', v_gem);
end;
$$;
revoke all on function public.p2d_thien_ma_khieu_chien(uuid) from public, anon;
grant execute on function public.p2d_thien_ma_khieu_chien(uuid) to authenticated;
