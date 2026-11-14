-- Việc 6 "con số cả game", dòng 18a + 18b (docs/10-CAI-HON.md; chủ dự án 14/11/2026 23:25 duyệt bảng: "phải xây lại tỉ lệ triệu hồi ra đồ tốt").
-- LÚC VIẾT (15/11/2026) CHƯA ÁP LÊN MÁY CHỦ THẬT: chờ chủ dự án nói "áp lên". Áp cùng lúc với: data/he-thong.json → bac.on = true,
-- qua_dau.diem = 300 và câu chào "quà gặp mặt 300 điểm", rồi đưa bản máy khách mới lên; áp xong tự thử đăng ký tài khoản mới + đăng nhập.
--
-- Trước: 53 loại quà trọng số ngang nhau (mỗi loại 1,9%); sáu giải lớn (Linh Thạch 1–2 triệu, ngọc 7–8, đồ Tiên / Thượng Cổ) ra 11–13% số lượt, tức
-- 8 lượt một giải lớn; đo 72 giờ: 142 nghìn Linh Thạch mỗi lượt (có bạo kích), triệu hồi phát 64,7 triệu cho 17 người, gấp ba mọi nguồn thư khác.
-- Sau: năm bậc Thường 62% · Khá 26% · Hiếm 9,5% · Cực hiếm 2,2% · Truyền thuyết 0,3% (mỗi món = tỉ lệ bậc / số món trong bậc; bảng ở
-- data/he-thong.json → pool[].b, bac; chuỗi dưới sinh bằng `python3 tools/he-thong-sql.py bac 300`, tools/check.mjs so lại).
-- Bảo hiểm: 10 lượt liền chưa ra Hiếm trở lên thì lượt thứ 10 ra một món Hiếm; 80 lượt liền chưa ra Cực hiếm trở lên thì ra một món Cực hiếm
-- (số đếm ở p2d_ht_diem.bh2, bh3). Truyền thuyết: khoảng 350 lượt một lần, máy chủ báo lên kênh thế giới. Theo bảng: khoảng 10 nghìn Linh Thạch
-- mỗi lượt trước bạo kích (bạo kích giữ nguyên). Quà gặp mặt 1.000 → 300 điểm (người đã nhận 1.000 không bị trừ).

-- 1) Số đếm bảo hiểm
alter table public.p2d_ht_diem add column if not exists bh2 integer not null default 0;
alter table public.p2d_ht_diem add column if not exists bh3 integer not null default 0;

-- 2) Bảng quà có bậc, bảo hiểm, bậc báo kênh thế giới, quà gặp mặt
update public.p2d_ht_cfg set v = v || '{"pool":[{"id":"lt-20k","b":0,"coins":20000,"w":4.428571},{"id":"lt-50k","b":0,"coins":50000,"w":4.428571},{"id":"lt-100k","b":1,"coins":100000,"w":1.857143},{"id":"lt-200k","b":2,"coins":200000,"w":0.863636},{"id":"lt-500k","b":3,"coins":500000,"w":0.275},{"id":"lt-1tr","b":4,"coins":1000000,"w":0.05},{"id":"lt-2tr","b":4,"coins":2000000,"w":0.05},{"id":"ngoc-1","b":0,"gem":[1,1],"n":1,"w":4.428571},{"id":"ngoc-2","b":0,"gem":[2,2],"n":1,"w":4.428571},{"id":"ngoc-3","b":0,"gem":[3,3],"n":1,"w":4.428571},{"id":"ngoc-4","b":1,"gem":[4,4],"n":1,"w":1.857143},{"id":"ngoc-5","b":2,"gem":[5,5],"n":1,"w":0.863636},{"id":"ngoc-6","b":3,"gem":[6,6],"n":1,"w":0.275},{"id":"ngoc-7","b":4,"gem":[7,7],"n":1,"w":0.05},{"id":"ngoc-8","b":4,"gem":[8,8],"n":1,"w":0.05},{"id":"do-0","b":0,"gear":[0],"w":4.428571},{"id":"do-1","b":0,"gear":[1],"w":4.428571},{"id":"do-2","b":1,"gear":[2],"w":1.857143},{"id":"do-3","b":2,"gear":[3],"w":0.863636},{"id":"do-4","b":3,"gear":[4],"w":0.275},{"id":"do-5","b":4,"gear":[5],"w":0.05},{"id":"do-6","b":4,"gear":[6],"w":0.05},{"id":"dan-hoi-xuan-dan","b":0,"pill":"hoi-xuan-dan","n":10,"w":4.428571},{"id":"dan-hoi-linh-dan","b":0,"pill":"hoi-linh-dan","n":10,"w":4.428571},{"id":"dan-tu-khi-dan","b":0,"pill":"tu-khi-dan","n":5,"w":4.428571},{"id":"dan-boi-nguyen-dan","b":1,"pill":"boi-nguyen-dan","n":2,"w":1.857143},{"id":"dan-thanh-tam-dan","b":1,"pill":"thanh-tam-dan","n":2,"w":1.857143},{"id":"dan-tinh-lien-dan","b":2,"pill":"tinh-lien-dan","n":1,"w":0.863636},{"id":"dan-tu-van-dan","b":1,"pill":"tu-van-dan","n":3,"w":1.857143},{"id":"dan-tay-tuy-dan","b":2,"pill":"tay-tuy-dan","n":1,"w":0.863636},{"id":"nl-linh-thao","b":0,"mat":"linh-thao","n":20,"w":4.428571},{"id":"nl-yeu-huyet","b":0,"mat":"yeu-huyet","n":10,"w":4.428571},{"id":"nl-tinh-thiet","b":0,"mat":"tinh-thiet","n":20,"w":4.428571},{"id":"nl-hoa-linh-chi","b":1,"mat":"hoa-linh-chi","n":5,"w":1.857143},{"id":"nl-tay-luyen-thach","b":1,"mat":"tay-luyen-thach","n":10,"w":1.857143},{"id":"nl-khoa-linh-thach","b":1,"mat":"khoa-linh-thach","n":2,"w":1.857143},{"id":"nl-dao-van-thach","b":2,"mat":"dao-van-thach","n":1,"w":0.863636},{"id":"nl-manh-phap-bao","b":2,"mat":"manh-phap-bao","n":3,"w":0.863636},{"id":"cuoi-bach-loc","b":1,"mount":"bach-loc","gia":5000,"w":1.857143},{"id":"cuoi-phong-lang","b":2,"mount":"phong-lang","gia":12000,"w":0.863636},{"id":"cuoi-tuyet-ly","b":2,"mount":"tuyet-ly","gia":15000,"w":0.863636},{"id":"cuoi-hoa-ky-lan","b":3,"mount":"hoa-ky-lan","gia":25000,"w":0.275},{"id":"khoi-tieu-hoa","b":1,"comp":"tieu-hoa","gia":8000,"w":1.857143},{"id":"khoi-ho-linh","b":1,"comp":"ho-linh","gia":8000,"w":1.857143},{"id":"khoi-thanh-diep","b":2,"comp":"thanh-diep","gia":10000,"w":0.863636},{"id":"khoi-mac-anh","b":2,"comp":"mac-anh","gia":12000,"w":0.863636},{"id":"khoi-thach-sinh","b":3,"comp":"thach-sinh","gia":15000,"w":0.275},{"id":"khoi-thiet-lan","b":3,"comp":"thiet-lan","gia":18000,"w":0.275},{"id":"ao-thanh-sam","b":0,"outfit":"thanh-sam","gia":800,"w":4.428571},{"id":"ao-hac-y","b":1,"outfit":"hac-y","gia":1500,"w":1.857143},{"id":"ao-hong-y","b":1,"outfit":"hong-y","gia":1500,"w":1.857143},{"id":"ao-tien-nhan","b":3,"outfit":"tien-nhan","gia":10000,"w":0.275},{"id":"ao-hoang-kim","b":3,"outfit":"hoang-kim","gia":10000,"w":0.275}],"bh":{"hiem":10,"cuc":80},"loa":{"b":4,"ten":{"lt-1tr":"1 triệu Linh Thạch","lt-2tr":"2 triệu Linh Thạch","ngoc-7":"ngọc cấp 7","ngoc-8":"ngọc cấp 8","do-5":"trang bị phẩm Tiên","do-6":"trang bị Thượng Cổ"}},"qua_dau":300}'::jsonb where k = 'cfg';

-- 3) Triệu hồi: quay theo trọng số của bậc, bảo hiểm, ghi bậc vào thư và lịch sử, báo kênh thế giới
create or replace function public.p2d_ht_trieu()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_row public.p2d_ht_diem%rowtype;
  v_cost int := (c ->> 'cost')::int; v_tot numeric; v_x numeric; e jsonb; v_pick jsonb; v_nd jsonb; v_lvl int; v_lv int; v_t int; v_d jsonb; v_g text; v_k text; v_bk int; v_cf jsonb; v_bh jsonb := coalesce(c -> 'bh', '{}'::jsonb); v_only int; v_b int;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  select * into v_row from public.p2d_ht_diem where user_id = v_uid for update;
  if not found or v_row.diem < v_cost then raise exception 'thieu_diem' using errcode = '22023'; end if;
  -- Bảo hiểm: đủ số lượt liền chưa ra bậc đó trở lên thì lượt này chỉ quay trong ĐÚNG bậc đó (Cực hiếm xét trước). Quay riêng trong bậc nên
  -- tỉ lệ Truyền thuyết của các lượt thường không đổi.
  if (v_bh ->> 'cuc') is not null and v_row.bh3 + 1 >= (v_bh ->> 'cuc')::int then v_only := 3;
  elsif (v_bh ->> 'hiem') is not null and v_row.bh2 + 1 >= (v_bh ->> 'hiem')::int then v_only := 2;
  end if;
  select sum((x ->> 'w')::numeric) into v_tot from jsonb_array_elements(c -> 'pool') x where v_only is null or coalesce((x ->> 'b')::int, 0) = v_only;
  v_x := random() * v_tot;
  for e in select * from jsonb_array_elements(c -> 'pool') loop
    continue when v_only is not null and coalesce((e ->> 'b')::int, 0) <> v_only;
    v_pick := e;   -- sai số cộng dồn làm vòng lặp chạy hết mà chưa trừ về 0 thì lấy món hợp lệ cuối cùng
    v_x := v_x - (e ->> 'w')::numeric;
    exit when v_x <= 0;
  end loop;
  v_pick := coalesce(v_pick, c -> 'pool' -> 0);
  v_b := coalesce((v_pick ->> 'b')::int, 0);
  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;
  if v_pick ? 'coins' then v_nd := jsonb_build_object('coins', (v_pick ->> 'coins')::int);
  elsif v_pick ? 'gem' then
    v_lv := (v_pick -> 'gem' ->> 0)::int + floor(random() * ((v_pick -> 'gem' ->> 1)::int - (v_pick -> 'gem' ->> 0)::int + 1))::int;
    v_nd := jsonb_build_object('gem', jsonb_build_object('key', (c -> 'gems' ->> floor(random() * jsonb_array_length(c -> 'gems'))::int) || ':' || v_lv, 'n', coalesce((v_pick ->> 'n')::int, 1)));
  elsif v_pick ? 'mat' then v_nd := jsonb_build_object('mat', jsonb_build_object('id', v_pick ->> 'mat', 'n', (v_pick ->> 'n')::int));
  elsif v_pick ? 'pill' then v_nd := jsonb_build_object('pill', jsonb_build_object('id', v_pick ->> 'pill', 'n', (v_pick ->> 'n')::int));
  elsif v_pick ? 'mount' or v_pick ? 'comp' or v_pick ? 'outfit' then
    v_g := case when v_d ->> 'gioi' = 'nu' then 'nu' else 'nam' end;
    v_k := coalesce(v_pick ->> 'mount', v_pick ->> 'comp', v_pick ->> 'outfit');
    if (v_pick ? 'mount' and (coalesce((v_d -> 'mounts') ? v_k, false) or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.noi_dung ->> 'mount' = v_k)))
       or (v_pick ? 'comp' and (coalesce((v_d -> 'comps') ? v_k, false) or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.noi_dung ->> 'comp' = v_k)))
       or (v_pick ? 'outfit' and (coalesce((v_d -> 'outfits') ? (v_k || ':' || v_g), false) or (v_d -> 'outfits' -> v_k) = 'true'::jsonb
           or exists (select 1 from public.p2d_hom_thu t where t.user_id = v_uid and t.nhan_luc is null and t.noi_dung ->> 'outfit' = v_k))) then
      v_nd := jsonb_build_object('coins', (v_pick ->> 'gia')::int, 'doi', v_k);   -- đã có: đổi ra Linh Thạch
    elsif v_pick ? 'mount' then v_nd := jsonb_build_object('mount', v_k);
    elsif v_pick ? 'comp' then v_nd := jsonb_build_object('comp', v_k);
    else v_nd := jsonb_build_object('outfit', v_k, 'g', v_g);
    end if;
  else
    select greatest(0, coalesce(canh_gioi, 0) * 9 + coalesce(tang, 1) - 1) into v_lvl from public.p2d_nhan_vat where user_id = v_uid;
    v_t := (v_pick -> 'gear' ->> floor(random() * jsonb_array_length(v_pick -> 'gear'))::int)::int;
    v_nd := jsonb_build_object('item', public.p2d_ht_do(v_t, coalesce(v_lvl, 0)));
  end if;
  -- Bạo kích (chủ dự án 06/11/2026 23:52: tỉ lệ không ghi vào game): số liệu ở p2d_ht_cfg 'bk' trên máy chủ (p: tỉ lệ lên mỗi bậc,
  -- max: bậc cao nhất, cap: trần Linh Thạch một lần), không có trong repo. Chỉ nhân đồ đếm được: Linh Thạch, đan, nguyên liệu, ngọc.
  v_bk := 1; v_cf := coalesce((select v from public.p2d_ht_cfg where k = 'bk'), '{"p": 0, "max": 1, "cap": 0}'::jsonb);
  if v_nd ? 'coins' and not v_nd ? 'doi' or v_nd ? 'pill' or v_nd ? 'mat' or v_nd ? 'gem' then
    while v_bk < (v_cf ->> 'max')::int and random() < (v_cf ->> 'p')::numeric loop v_bk := v_bk + 1; end loop;
  end if;
  if v_bk > 1 then
    if v_nd ? 'coins' then v_nd := jsonb_set(v_nd, '{coins}', to_jsonb(least((v_nd ->> 'coins')::bigint * v_bk, greatest((v_cf ->> 'cap')::bigint, (v_nd ->> 'coins')::bigint))));
    else
      v_k := case when v_nd ? 'pill' then 'pill' when v_nd ? 'mat' then 'mat' else 'gem' end;
      v_nd := jsonb_set(v_nd, array[v_k, 'n'], to_jsonb((v_nd -> v_k ->> 'n')::int * v_bk));
    end if;
    v_nd := v_nd || jsonb_build_object('bk', v_bk);
  end if;
  v_nd := v_nd || jsonb_build_object('tieu_de', c ->> 'mail', 'bac', v_b);
  insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, v_nd, 'he_thong_qua');
  insert into public.p2d_ht_lich_su (user_id, qua, noi_dung) values (v_uid, v_pick ->> 'id', v_nd);
  update public.p2d_ht_diem set diem = diem - v_cost, so_lan = so_lan + 1, luc = now(),
    bh2 = case when v_b >= 2 then 0 else bh2 + 1 end, bh3 = case when v_b >= 3 then 0 else bh3 + 1 end
  where user_id = v_uid returning * into v_row;
  -- Bậc cao nhất: báo lên kênh thế giới (không báo khi món đã có bị đổi ra Linh Thạch). Kênh lỗi thì thôi, không làm hỏng lượt triệu hồi.
  if v_b >= coalesce((c -> 'loa' ->> 'b')::int, 99) and not v_nd ? 'doi' then
    begin
      insert into public.p2d_chat (kenh, user_id, ten, noi_dung)
      values ('the-gioi', v_uid, 'Hệ Thống', left('【Hệ Thống】Khí vận nghịch thiên! ' || coalesce(nullif((select ten from public.p2d_nhan_vat where user_id = v_uid), ''), 'Một đạo hữu')
        || ' triệu hồi được ' || coalesce(c -> 'loa' -> 'ten' ->> (v_pick ->> 'id'), 'quà Truyền thuyết') || '!', 120));
    exception when others then null;
    end;
  end if;
  return jsonb_build_object('qua', v_pick ->> 'id', 'noi_dung', v_nd, 'diem', v_row.diem, 'bk', v_bk, 'bac', v_b, 'bh2', v_row.bh2, 'bh3', v_row.bh3);
end;
$$;
revoke all on function public.p2d_ht_trieu() from public, anon;
grant execute on function public.p2d_ht_trieu() to authenticated;

-- 4) Trạng thái: thêm hai số đếm bảo hiểm cho máy khách hiện "còn mấy lượt nữa chắc chắn ra"
create or replace function public.p2d_ht_trang_thai()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$ select coalesce((select jsonb_build_object('diem', diem, 'xong', to_jsonb(xong), 'so_lan', so_lan, 'bh2', bh2, 'bh3', bh3,
    'ngay_xong', case when ngay = (now() at time zone 'Asia/Ho_Chi_Minh')::date then to_jsonb(ngay_xong) else '[]'::jsonb end)
  from public.p2d_ht_diem where user_id = public.p2d_uid()),
  jsonb_build_object('diem', 0, 'xong', '[]'::jsonb, 'so_lan', 0, 'bh2', 0, 'bh3', 0, 'ngay_xong', '[]'::jsonb)) $$;
revoke all on function public.p2d_ht_trang_thai() from public, anon;
grant execute on function public.p2d_ht_trang_thai() to authenticated;

-- 5) Bảng "Vừa trúng lớn": lượt có ghi bậc thì lấy từ Cực hiếm trở lên (không tính món đã có bị đổi ra Linh Thạch) hoặc bạo kích từ x5;
--    lượt cũ chưa ghi bậc giữ điều kiện cũ.
create or replace function public.p2d_ht_vinh_danh()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(x order by x ->> 'luc' desc), '[]'::jsonb) from (
    select jsonb_build_object('ten', coalesce(nullif(n.ten, ''), 'Đạo hữu'), 'qua', l.qua, 'luc', l.luc,
      'nd', (l.noi_dung - 'tieu_de') - 'item' || case when l.noi_dung ? 'item'
        then jsonb_build_object('item', jsonb_build_object('base', l.noi_dung -> 'item' ->> 'base', 'el', l.noi_dung -> 'item' ->> 'el', 'rarity', l.noi_dung -> 'item' ->> 'rarity',
          'lines', l.noi_dung -> 'item' -> 'lines', 'main', l.noi_dung -> 'item' -> 'main', 'lvl', l.noi_dung -> 'item' -> 'lvl')) else '{}'::jsonb end) x
    from public.p2d_ht_lich_su l left join public.p2d_nhan_vat n using (user_id)
    where coalesce((l.noi_dung ->> 'bk')::int, 1) >= 5
       or (l.noi_dung ? 'bac' and (l.noi_dung ->> 'bac')::int >= 3 and not l.noi_dung ? 'doi')
       or (not l.noi_dung ? 'bac' and (coalesce((l.noi_dung -> 'item' -> 'lines' -> 0 ->> 't')::int, -1) >= 5
           or (l.qua in ('lt-1tr', 'lt-2tr', 'ngoc-8', 'nl-dao-van-thach') and not l.noi_dung ? 'doi')))
    order by l.luc desc limit 10) s
$$;
revoke all on function public.p2d_ht_vinh_danh() from public, anon;
grant execute on function public.p2d_ht_vinh_danh() to authenticated;
