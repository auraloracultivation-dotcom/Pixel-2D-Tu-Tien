-- Vá sau reset cảnh giới 12/11/2026 10:18 (20261112050000_p2d_mua_2.sql). Chủ dự án 10:25–10:26 gửi ảnh: tài khoản mở lại bằng bản game cũ
-- vẫn Trúc Cơ, vẫn mặc pháp bảo cũ, bí cảnh còn ra Trấn Yêu Tháp. Nguyên do: bản game cũ lúc vào chọn bản lưu trong máy (cùng dấu phiên
-- với bản máy chủ vừa reset) rồi lưu đè lên. Máy khách đã sửa (src/game/cloud-guard.js pickSave: máy chủ đã reset thì không lấy bản trong máy).
-- 1. Đồ thưởng máy chủ không bốc pháp bảo cũ (ô 'phap-bao' trong p2d_ht_cfg.bases): p2d_ht_do (quà Hệ Thống), p2d_mang_do (boss Thôn Thiên
--    Mãng). Chỉ thêm điều kiện vào đúng câu chọn món, phần còn lại của hàm giữ nguyên.
-- 2. Bản lưu bị bản cũ đè lại sau reset (data.mua >= 2 nhưng cảnh giới > 0 hoặc còn mặc pháp bảo cũ): sao lưu ('mua_2_sua_de') rồi reset lại
--    như lần đầu, KHÔNG hoàn Linh Thạch lần nữa (lần đầu đã hoàn, đã kiểm: chưa ai mất phần hoàn). Pháp bảo cũ trong túi: món đã nằm ở pbCu thì
--    bỏ khỏi túi (ngọc đã trả lần đầu), món chưa có thì trả ngọc rồi cất sang pbCu. Chỉ UPDATE, không xoá dòng.

-- 1. đồ thưởng máy chủ bỏ pháp bảo cũ
do $$
declare f text; d text;
  v_old text := 'select k into v_base from jsonb_object_keys(c -> ''bases'') k order by random() limit 1;';
  v_new text := 'select k into v_base from jsonb_object_keys(c -> ''bases'') k where coalesce(c -> ''bases'' -> k ->> ''slot'', '''') <> ''phap-bao'' order by random() limit 1;';
begin
  foreach f in array array['public.p2d_ht_do(integer,integer)', 'public.p2d_mang_do(integer,integer,text)'] loop
    d := pg_get_functiondef(f::regprocedure);
    if position(v_new in d) > 0 then continue; end if;   -- đã vá
    if position(v_old in d) = 0 then raise exception 'khong thay cau chon mon trong %', f; end if;
    execute replace(d, v_old, v_new);
  end loop;
end $$;

-- 2. reset lại bản lưu bị bản cũ đè
do $$
declare
  r record; d jsonb; it jsonb; v_bag jsonb; v_cu jsonb; v_uids jsonb; v_gems jsonb; g jsonb; k text; f text; v_n int := 0;
  v_old text[] := '{kim-luan,tran-yeu-thap,hoa-hon-linh,dao-van-an}';
  v_flags text[] := '{dao-kim,dao-moc,dao-tho,dong-phu,hac-phong,han-bang,mat-tieu-hoa,mo-bang-quat,mo-bi-canh,mo-co-thu,mo-dia-cung,mo-hac-phong-dong,mo-hoa-quat,mo-hu-khong-lao,mo-kiem-trung,mo-lang,mo-re-mau-thu,ngu-kiem,vao-vet-nut,vet-nut,lac-tuyet-vang,tieu-dao-vang,thanhTam}';
begin
  create temp table _de on commit drop as
  select n.user_id from public.p2d_nhan_vat n
  where n.user_id <> '625e027c-36b4-4bb7-bd0c-21572612bc50'::uuid and coalesce((n.data ->> 'mua')::int, 1) >= 2
    and exists (select 1 from public.p2d_xu_ly x where x.user_id = n.user_id and x.hanh_dong = 'mua_2_truoc_reset')
    and (coalesce((n.data ->> 'realm')::int, 0) > 0 or (jsonb_typeof(n.data -> 'equip') = 'object' and n.data -> 'equip' ? 'phap-bao'));
  insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
  select n.user_id, 'mua_2_sua_de', jsonb_build_object('data', n.data, 'canh_gioi', n.canh_gioi, 'tang', n.tang, 'phien_ban', n.phien_ban)
  from public.p2d_nhan_vat n join _de using (user_id);
  for r in select n.user_id, n.data from public.p2d_nhan_vat n join _de using (user_id) for update of n loop
    d := r.data;
    v_cu := case when jsonb_typeof(d -> 'pbCu') = 'array' then d -> 'pbCu' else '[]'::jsonb end;
    v_uids := (select coalesce(jsonb_agg(x -> 'uid'), '[]'::jsonb) from jsonb_array_elements(v_cu) x);
    v_gems := case when jsonb_typeof(d -> 'gems') = 'object' then d -> 'gems' else '{}'::jsonb end;
    v_bag := '[]'::jsonb;
    for it in select value from jsonb_array_elements(case when jsonb_typeof(d -> 'bag') = 'array' then d -> 'bag' else '[]'::jsonb end) loop
      if (it ->> 'base') = any (v_old) then
        if v_uids @> jsonb_build_array(it -> 'uid') then continue; end if;   -- đã cất lần đầu
        if jsonb_typeof(it -> 'sockets') = 'array' then
          for g in select value from jsonb_array_elements(it -> 'sockets') loop
            if jsonb_typeof(g) = 'string' then k := g #>> '{}'; v_gems := jsonb_set(v_gems, array[k], to_jsonb(coalesce((v_gems ->> k)::numeric, 0) + 1)); end if;
          end loop;
          it := jsonb_set(it, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(it -> 'sockets')));
        end if;
        v_cu := v_cu || jsonb_build_array(it);
      else
        v_bag := v_bag || jsonb_build_array(it);
      end if;
    end loop;
    d := jsonb_set(d, '{bag}', v_bag);
    if jsonb_array_length(v_cu) > 0 then d := jsonb_set(d, '{pbCu}', v_cu); end if;
    d := jsonb_set(d, '{gems}', v_gems);
    if jsonb_typeof(d -> 'equip') = 'object' then d := jsonb_set(d, '{equip}', (d -> 'equip') - 'phap-bao'); end if;
    if jsonb_typeof(d -> 'flags') = 'object' then
      foreach f in array v_flags loop d := jsonb_set(d, '{flags}', (d -> 'flags') - f); end loop;
    end if;
    if (d ? 'element') and jsonb_typeof(d -> 'root') = 'string' and not (d ? 'rootKeep') then d := jsonb_set(d, '{rootKeep}', d -> 'root'); end if;
    d := d || jsonb_build_object('mua', 2, 'realm', 0, 'layer', 1, 'qi', 0, 'giftAt', 0, 'step', 0, 'stepDone', false,
      'map', 'thanh-khe', 'spawn', 'vao', 'visited', jsonb_build_object('thanh-khe', true));
    update public.p2d_nhan_vat set data = d, canh_gioi = 0, tang = 1, phien_ban = phien_ban + 1, updated_at = now() where user_id = r.user_id;
    v_n := v_n + 1;
  end loop;
  raise notice 'mua 2 va: reset lai % ban luu', v_n;
end $$;
