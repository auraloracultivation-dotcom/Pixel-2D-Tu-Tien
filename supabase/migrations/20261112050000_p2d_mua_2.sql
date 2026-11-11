-- Mùa 2 (chủ dự án 12/11/2026 04:07, chọn lúc 04:10: "reset toàn bộ cảnh giới của toàn sever về Luyện Khí tầng 1", phạm vi "cảnh giới + truyện",
-- động phủ thu lại tới bước truyện ban lại (giữ đồ), thưởng truyện và nhiệm vụ Hệ Thống nhận lại được, pháp bảo cũ ẩn + hoàn Linh Thạch,
-- không đền bù, tài khoản thử của chủ dự án (data/phap-bao.json test_uid) giữ nguyên; mở Hệ Pháp Bảo Luyện Chế cho mọi người).
-- Máy khách làm cùng phép ở src/game/season.js (save.mua < 2) cho bản chơi thử trong máy và bản lỡ sót.
-- 1. Sao lưu cả bản lưu và điểm Hệ Thống của từng người vào p2d_xu_ly ('mua_2_truoc_reset') trước khi đổi (khôi phục được).
-- 2. Reset từng bản lưu (chỉ UPDATE, không xoá dòng nào): cảnh giới, tầng, linh khí về đầu; truyện về bước 0, xoá cờ truyện
--    (data/config.json season.story_flags), về Mảnh Vỡ Thanh Khê; pháp bảo cũ (ô 'phap-bao') tháo, ngọc khảm trả về túi ngọc,
--    món cất sang data.pbCu (không chiếm túi); xoá bản Pháp Bảo Luyện Chế cũ (nhận lại theo mốc); giữ phẩm linh căn (rootKeep).
--    Hoàn Linh Thạch: chiêu đã mua ở Vạn Bảo Lâu (giá data/shop.json) + mỗi pháp bảo cũ: giá bán theo độ hiếm + Linh Thạch đã tốn
--    cho các cấp cường hoá đã lên (data/gear.json enhance.coins, không tính lần hỏng). Ghi data.mua = 2.
-- 3. Nhiệm vụ Hệ Thống: xoá danh sách đã nhận (nhận lại thưởng khi đi lại); "Mặc đủ 7 món" thành 6 món (ô pháp bảo cũ đã bỏ);
--    thêm 10 nhiệm vụ Pháp Bảo Luyện Chế (điều kiện pb_wear, pb_mods, pb_lv, pb_slots trong p2d_ht_dk); đồ thưởng không rơi pháp bảo cũ;
--    xếp lại ord theo data/he-thong.json.
-- 4. Kiểm cơ bản data.phapBao khi lưu (p2d_kiem_phap_bao): loại / phẩm / chiêu phải có thật, 1–4 ô, cấp không quá trần theo cảnh giới,
--    tối đa 30 món, Đá Khai Khiếu không quá số có thể nhận theo tu vi. Lỗi gì cũng để bản lưu đi qua (không chặn người chơi).

-- 3a. điều kiện nhiệm vụ: thêm pb_*
create or replace function public.p2d_ht_dk(d jsonb, dk jsonb)
returns boolean language plpgsql immutable set search_path = '' as $$
declare v_eq jsonb := case when jsonb_typeof(d -> 'equip') = 'object' then d -> 'equip' else '{}'::jsonb end;
  v_bag jsonb := case when jsonb_typeof(d -> 'bag') = 'array' then d -> 'bag' else '[]'::jsonb end;
  v_realm int := coalesce((d ->> 'realm')::int, 0); v_n int;
  v_pb jsonb := case when jsonb_typeof(d -> 'phapBao' -> 'items') = 'array' then d -> 'phapBao' -> 'items' else '[]'::jsonb end;
  v_wear jsonb := case when jsonb_typeof(d -> 'phapBao' -> 'wear') = 'array' then d -> 'phapBao' -> 'wear' else '[]'::jsonb end;
  cnt jsonb;
begin
  if dk ? 'step' and coalesce((d ->> 'step')::int, 0) < (dk ->> 'step')::int then return false; end if;
  if dk ? 'realm' then
    if v_realm < (dk ->> 'realm')::int then return false; end if;
    if dk ? 'layer' and v_realm = (dk ->> 'realm')::int and coalesce((d ->> 'layer')::int, 1) < (dk ->> 'layer')::int then return false; end if;
  end if;
  if dk ? 'equip' and (select count(*) from jsonb_object_keys(v_eq)) < (dk ->> 'equip')::int then return false; end if;
  foreach cnt in array array[to_jsonb('techs'::text), to_jsonb('pets'::text), to_jsonb('mounts'::text)] loop
    if dk ? (cnt #>> '{}') then
      v_n := case when jsonb_typeof(d -> (cnt #>> '{}')) = 'object' then (select count(*) from jsonb_object_keys(d -> (cnt #>> '{}'))) else 0 end;
      if v_n < (dk ->> (cnt #>> '{}'))::int then return false; end if;
    end if;
  end loop;
  if dk ? 'plus' and coalesce((select max(coalesce((b ->> 'plus')::int, 0)) from jsonb_array_elements(v_bag) b
      where exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')), 0) < (dk ->> 'plus')::int then return false; end if;
  if dk ? 'socket' and coalesce((select count(*) from jsonb_array_elements(v_bag) b, jsonb_array_elements(case when jsonb_typeof(b -> 'sockets') = 'array' then b -> 'sockets' else '[]'::jsonb end) s
      where jsonb_typeof(s) = 'string' and exists (select 1 from jsonb_each(v_eq) e where e.value = b -> 'uid')), 0) < (dk ->> 'socket')::int then return false; end if;
  -- Pháp Bảo Luyện Chế (như src/game/he-thong.js missionDone)
  if dk ? 'pb_wear' and (select count(*) from jsonb_array_elements(v_pb) i where exists (select 1 from jsonb_array_elements(v_wear) w where w = i -> 'uid')) < (dk ->> 'pb_wear')::int then return false; end if;
  if dk ? 'pb_mods' and coalesce((select sum((select count(*) from jsonb_array_elements(case when jsonb_typeof(i -> 'mods') = 'array' then i -> 'mods' else '[]'::jsonb end) with ordinality m(v, k)
        where jsonb_typeof(m.v) = 'string' and m.k <= coalesce((i ->> 'slots')::int, 0)))
      from jsonb_array_elements(v_pb) i where exists (select 1 from jsonb_array_elements(v_wear) w where w = i -> 'uid')), 0) < (dk ->> 'pb_mods')::int then return false; end if;
  if dk ? 'pb_lv' and coalesce((select max(coalesce((i ->> 'lv')::int, 0)) from jsonb_array_elements(v_pb) i), 0) < (dk ->> 'pb_lv')::int then return false; end if;
  if dk ? 'pb_slots' and coalesce((select max(coalesce((i ->> 'slots')::int, 0)) from jsonb_array_elements(v_pb) i), 0) < (dk ->> 'pb_slots')::int then return false; end if;
  return true;
end;
$$;

-- 3b. đồ thưởng nhiệm vụ: không chọn ô pháp bảo cũ
create or replace function public.p2d_ht_thuong(p_uid uuid, p_qua jsonb, p_d jsonb)
returns void language plpgsql set search_path = '' as $$
declare c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); e jsonb; v_nd jsonb; v_it jsonb; v_lvl int; v_eq text[];
begin
  select greatest(0, coalesce(canh_gioi, 0) * 9 + coalesce(tang, 1) - 1) into v_lvl from public.p2d_nhan_vat where user_id = p_uid;
  select coalesce(array_agg(k), '{}') into v_eq from jsonb_object_keys(case when jsonb_typeof(p_d -> 'equip') = 'object' then p_d -> 'equip' else '{}'::jsonb end) k;
  for e in select * from jsonb_array_elements(coalesce(p_qua, '[]'::jsonb)) loop
    v_nd := case
      when e ? 'coins' then jsonb_build_object('coins', (e ->> 'coins')::int)
      when e ? 'mat' then jsonb_build_object('mat', jsonb_build_object('id', e ->> 'mat', 'n', (e ->> 'n')::int))
      when e ? 'gem' then jsonb_build_object('gem', jsonb_build_object('key', e ->> 'gem', 'n', (e ->> 'n')::int))
      when e ? 'pill' then jsonb_build_object('pill', jsonb_build_object('id', e ->> 'pill', 'n', (e ->> 'n')::int))
      else null end;
    if e ? 'gear' then
      v_it := public.p2d_ht_do_o((e ->> 'gear')::int, coalesce(v_lvl, 0), (case when e ->> 'slot' = 'thieu' then v_eq else '{}' end) || array['phap-bao']);
      v_eq := v_eq || (v_it ->> 'slot');
      v_nd := jsonb_build_object('item', v_it - 'slot');
    end if;
    if v_nd is not null then
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (p_uid, v_nd || jsonb_build_object('tieu_de', c ->> 'quest_mail'), 'he_thong_nv');
    end if;
  end loop;
end;
$$;

-- 3c. nhiệm vụ
update public.p2d_ht_nv set dk = '{"equip": 6}'::jsonb where id = 'mac-7';
insert into public.p2d_ht_nv (id, ord, dk, qua) values
('pb-kham-1', 8, '{"pb_mods": 1}'::jsonb, '[{"coins": 2000}, {"pill": "hoi-linh-dan", "n": 3}]'::jsonb),
('pb-mac-3', 20, '{"pb_wear": 3}'::jsonb, '[{"coins": 3000}, {"pill": "tu-khi-dan", "n": 4}]'::jsonb),
('pb-cap-5', 27, '{"pb_lv": 5}'::jsonb, '[{"coins": 3000}, {"mat": "tinh-thiet", "n": 6}]'::jsonb),
('pb-duc-3', 45, '{"pb_slots": 3}'::jsonb, '[{"coins": 8000}, {"pill": "tu-khi-dan", "n": 5}]'::jsonb),
('pb-kham-6', 50, '{"pb_mods": 6}'::jsonb, '[{"coins": 8000}, {"mat": "tay-luyen-thach", "n": 2}]'::jsonb),
('pb-cap-15', 56, '{"pb_lv": 15}'::jsonb, '[{"pill": "tu-van-dan", "n": 3}, {"coins": 15000}]'::jsonb),
('pb-duc-4', 60, '{"pb_slots": 4}'::jsonb, '[{"pill": "tu-van-dan", "n": 4}, {"coins": 20000}]'::jsonb),
('pb-mac-4', 64, '{"pb_wear": 4}'::jsonb, '[{"pill": "tu-van-dan", "n": 5}, {"coins": 20000}]'::jsonb),
('pb-cap-20', 67, '{"pb_lv": 20}'::jsonb, '[{"pill": "tu-van-dan", "n": 5}, {"coins": 30000}]'::jsonb),
('pb-kham-16', 72, '{"pb_mods": 16}'::jsonb, '[{"pill": "tu-van-dan", "n": 6}, {"coins": 50000}]'::jsonb)
on conflict (id) do update set dk = excluded.dk, qua = excluded.qua;
update public.p2d_ht_nv n set ord = v.ord from (values
('hoi-xuyen-khong', 0),
('truyen-1', 1),
('hoi-linh-can', 2),
('truyen-2', 3),
('mac-4', 4),
('hoi-cuong-hoa', 5),
('truyen-3', 6),
('hoi-tu-danh', 7),
('pb-kham-1', 8),
('cuong-hoa-3', 9),
('hoi-kham', 10),
('kham-1', 11),
('kham-2', 12),
('truyen-4', 13),
('hoi-mau', 14),
('truyen-5', 15),
('hoi-len-tang', 16),
('luyen-khi-3', 17),
('truyen-6', 18),
('luyen-khi-5', 19),
('pb-mac-3', 20),
('hoi-bi-canh', 21),
('truyen-7', 22),
('truyen-8', 23),
('truyen-9', 24),
('truyen-10', 25),
('luyen-khi-7', 26),
('pb-cap-5', 27),
('hoi-pham', 28),
('hoi-tay-luyen', 29),
('cong-phap-2', 30),
('cong-phap-3', 31),
('hoi-linh-thu', 32),
('hoi-khien', 33),
('linh-thu-1', 34),
('linh-thu-2', 35),
('thu-cuoi-1', 36),
('mac-7', 37),
('cuong-hoa-5', 38),
('cuong-hoa-6', 39),
('kham-4', 40),
('hoi-boss', 41),
('luyen-khi-9', 42),
('hoi-dot-pha', 43),
('truc-co', 44),
('pb-duc-3', 45),
('truc-co-3', 46),
('truc-co-5', 47),
('cong-phap-5', 48),
('truc-co-7', 49),
('pb-kham-6', 50),
('truc-co-9', 51),
('cuong-hoa-8', 52),
('kim-dan', 53),
('kim-dan-3', 54),
('kim-dan-5', 55),
('pb-cap-15', 56),
('linh-thu-3', 57),
('kham-8', 58),
('kim-dan-7', 59),
('pb-duc-4', 60),
('cuong-hoa-10', 61),
('kim-dan-9', 62),
('canh-gioi-3', 63),
('pb-mac-4', 64),
('nguyen-anh-3', 65),
('nguyen-anh-5', 66),
('pb-cap-20', 67),
('cong-phap-8', 68),
('nguyen-anh-7', 69),
('cuong-hoa-13', 70),
('nguyen-anh-9', 71),
('pb-kham-16', 72),
('kham-12', 73),
('linh-thu-5', 74),
('canh-gioi-4', 75),
('hoa-than-3', 76),
('hoa-than-5', 77),
('thu-cuoi-2', 78),
('hoa-than-7', 79),
('cong-phap-12', 80),
('hoa-than-9', 81),
('thu-cuoi-3', 82),
('canh-gioi-5', 83),
('luyen-hu-3', 84),
('luyen-hu-5', 85),
('cuong-hoa-15', 86),
('luyen-hu-7', 87),
('luyen-hu-9', 88),
('kham-16', 89),
('canh-gioi-6', 90),
('hop-the-3', 91),
('hop-the-5', 92),
('linh-thu-8', 93),
('hop-the-7', 94),
('cuong-hoa-17', 95),
('hop-the-9', 96),
('canh-gioi-7', 97),
('dai-thua-3', 98),
('dai-thua-5', 99),
('cong-phap-16', 100),
('dai-thua-7', 101),
('thu-cuoi-4', 102),
('dai-thua-9', 103),
('canh-gioi-8', 104),
('do-kiep-3', 105),
('do-kiep-5', 106),
('cuong-hoa-20', 107),
('do-kiep-7', 108),
('do-kiep-9', 109)
) v(id, ord) where n.id = v.id;

-- 4. kiểm cơ bản data.phapBao (không bao giờ chặn lưu)
create or replace function public.p2d_kiem_phap_bao()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_types text[] := '{phi-kiem,linh-chau,bao-phien,dai-an,ho-thuan,dong-chung,tran-ky,ho-lo}'; v_mods text[] := '{toa-nhanh,lien-phat,danh-lan,xuyen-thau,nay-bat,cau-xoay,truy-kich,kim,moc,thuy,hoa,tho,loi-kich,phan-chan,tu-bao,bao-kich,hap-huyet,toc-kich,tiet-linh}'; v_grades text[] := '{pham,linh,huyen,dia,thien}';
  v_cap int[] := '{5,10,15,20,25,30,35,40,45}';
  v_pb jsonb; v_it jsonb; v_out jsonb := '[]'::jsonb; v_r int; v_l int; v_c int; v_mx numeric; v_m jsonb; v_sai boolean := false;
begin
  v_pb := new.data -> 'phapBao';
  if v_pb is null or v_pb is not distinct from (old.data -> 'phapBao') then return new; end if;
  if new.user_id = '625e027c-36b4-4bb7-bd0c-21572612bc50'::uuid then return new; end if;
  begin
    v_r := least(greatest(coalesce((new.data ->> 'realm')::int, 0), 0), 8); v_l := least(greatest(coalesce((new.data ->> 'layer')::int, 1), 1), 9);
    v_c := v_cap[v_r + 1];
    for v_it in select value from jsonb_array_elements(case when jsonb_typeof(v_pb -> 'items') = 'array' then v_pb -> 'items' else '[]'::jsonb end) limit 30 loop
      if not ((v_it ->> 'type') = any (v_types)) or not ((v_it ->> 'grade') = any (v_grades)) then v_sai := true; continue; end if;
      if coalesce((v_it ->> 'slots')::int, 0) not between 1 and 4 then v_it := jsonb_set(v_it, '{slots}', to_jsonb(least(greatest(coalesce((v_it ->> 'slots')::int, 1), 1), 4))); v_sai := true; end if;
      if coalesce((v_it ->> 'lv')::int, 0) > v_c or coalesce((v_it ->> 'lv')::int, 0) < 0 then v_it := jsonb_set(v_it, '{lv}', to_jsonb(least(greatest(coalesce((v_it ->> 'lv')::int, 0), 0), v_c))); v_sai := true; end if;
      if jsonb_typeof(v_it -> 'mods') = 'array' then
        v_m := (select coalesce(jsonb_agg(case when jsonb_typeof(x) = 'string' and (x #>> '{}') = any (v_mods) then x else 'null'::jsonb end order by k), '[]'::jsonb)
                from jsonb_array_elements(v_it -> 'mods') with ordinality t(x, k) where k <= 4);
        if v_m is distinct from (v_it -> 'mods') then v_it := jsonb_set(v_it, '{mods}', v_m); v_sai := true; end if;
      end if;
      v_out := v_out || jsonb_build_array(v_it);
    end loop;
    if jsonb_array_length(coalesce(v_pb -> 'items', '[]'::jsonb)) > 30 then v_sai := true; end if;
    v_mx := (v_r * 9 + v_l) + v_r * 3 + 12;   -- đá nhận được tối đa theo tu vi (data/realms.json gift + mốc), dư một ít
    v_pb := jsonb_set(v_pb, '{items}', v_out);
    if coalesce((v_pb ->> 'stones')::numeric, 0) > v_mx or coalesce((v_pb ->> 'stones')::numeric, 0) < 0 then v_pb := jsonb_set(v_pb, '{stones}', to_jsonb(least(greatest(coalesce((v_pb ->> 'stones')::numeric, 0), 0), v_mx))); v_sai := true; end if;
    if v_sai then
      new.data := jsonb_set(new.data, '{phapBao}', v_pb);
      if not exists (select 1 from public.p2d_nghi_van where user_id = new.user_id and ly_do = 'phap_bao' and luc > now() - interval '10 minutes') then
        insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (new.user_id, 'phap_bao', jsonb_build_object('canh_gioi', v_r, 'tang', v_l));
      end if;
    end if;
  exception when others then
    return new;   -- lỗi kiểm thì thôi, không chặn lưu
  end;
  return new;
end;
$$;
drop trigger if exists p2d_kiem_phap_bao on public.p2d_nhan_vat;
create trigger p2d_kiem_phap_bao before update of data on public.p2d_nhan_vat for each row execute function public.p2d_kiem_phap_bao();

-- 1 + 2. sao lưu rồi reset mùa
do $$
declare
  r record; d jsonb; v_ref numeric; it jsonb; v_bag jsonb; v_cu jsonb; v_gems jsonb; g jsonb; k text; v_plus int; f text;
  v_skill jsonb := '{"thiem-anh": 50000, "vo-anh": 100000, "pha-thien": 100000, "thien-phat": 100000, "van-kiem-thien": 150000}'::jsonb; v_sell jsonb := '{"pham": 4, "linh": 10, "huyen": 25, "dia": 70, "thien": 180}'::jsonb; v_coins jsonb := '[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2000, 2700, 3600, 4900, 6600, 8900, 12000, 16200, 21900, 29500]'::jsonb;
  v_old text[] := '{kim-luan,tran-yeu-thap,hoa-hon-linh,dao-van-an}'; v_flags text[] := '{dao-kim,dao-moc,dao-tho,dong-phu,hac-phong,han-bang,mat-tieu-hoa,mo-bang-quat,mo-bi-canh,mo-co-thu,mo-dia-cung,mo-hac-phong-dong,mo-hoa-quat,mo-hu-khong-lao,mo-kiem-trung,mo-lang,mo-re-mau-thu,ngu-kiem,vao-vet-nut,vet-nut,lac-tuyet-vang,tieu-dao-vang,thanhTam}';
  v_n int := 0; v_lt numeric := 0;
begin
  insert into public.p2d_xu_ly (user_id, hanh_dong, du_lieu)
  select n.user_id, 'mua_2_truoc_reset', jsonb_build_object('data', n.data, 'canh_gioi', n.canh_gioi, 'tang', n.tang, 'phien_ban', n.phien_ban,
    'ht', (select to_jsonb(h) from public.p2d_ht_diem h where h.user_id = n.user_id))
  from public.p2d_nhan_vat n where n.user_id <> '625e027c-36b4-4bb7-bd0c-21572612bc50'::uuid and coalesce((n.data ->> 'mua')::int, 1) < 2;
  for r in select user_id, data from public.p2d_nhan_vat where user_id <> '625e027c-36b4-4bb7-bd0c-21572612bc50'::uuid and coalesce((data ->> 'mua')::int, 1) < 2 for update loop
    d := r.data; v_ref := 0;
    -- chiêu đã mua
    if jsonb_typeof(d -> 'boughtSkills') = 'array' then
      select coalesce(sum((v_skill ->> s)::numeric), 0) into v_ref from jsonb_array_elements_text(d -> 'boughtSkills') s where v_skill ? s;
    end if;
    -- pháp bảo cũ: hoàn, trả ngọc, cất sang pbCu
    v_bag := '[]'::jsonb; v_cu := case when jsonb_typeof(d -> 'pbCu') = 'array' then d -> 'pbCu' else '[]'::jsonb end;
    v_gems := case when jsonb_typeof(d -> 'gems') = 'object' then d -> 'gems' else '{}'::jsonb end;
    for it in select value from jsonb_array_elements(case when jsonb_typeof(d -> 'bag') = 'array' then d -> 'bag' else '[]'::jsonb end) loop
      if (it ->> 'base') = any (v_old) then
        v_ref := v_ref + coalesce((v_sell ->> (it ->> 'rarity'))::numeric, 0);
        v_plus := least(greatest(coalesce((it ->> 'plus')::int, 0), 0), jsonb_array_length(v_coins));
        if v_plus > 0 then select v_ref + coalesce(sum(x::numeric), 0) into v_ref from jsonb_array_elements_text(v_coins) with ordinality t(x, k) where t.k <= v_plus; end if;
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
    -- cờ truyện
    if jsonb_typeof(d -> 'flags') = 'object' then
      foreach f in array v_flags loop d := jsonb_set(d, '{flags}', (d -> 'flags') - f); end loop;
    end if;
    if (d ? 'element') and jsonb_typeof(d -> 'root') = 'string' then d := jsonb_set(d, '{rootKeep}', d -> 'root'); end if;
    d := (d - 'phapBao') || jsonb_build_object('mua', 2, 'realm', 0, 'layer', 1, 'qi', 0, 'giftAt', 0, 'step', 0, 'stepDone', false,
      'map', 'thanh-khe', 'spawn', 'vao', 'visited', jsonb_build_object('thanh-khe', true),
      'lingshi', coalesce((d ->> 'lingshi')::numeric, 0) + v_ref);
    update public.p2d_nhan_vat set data = d, canh_gioi = 0, tang = 1, phien_ban = phien_ban + 1, updated_at = now() where user_id = r.user_id;
    v_n := v_n + 1; v_lt := v_lt + v_ref;
  end loop;
  update public.p2d_ht_diem set xong = '{}' where user_id <> '625e027c-36b4-4bb7-bd0c-21572612bc50'::uuid;
  raise notice 'mua 2: reset % nhan vat, hoan % Linh Thach', v_n, v_lt;
end $$;
