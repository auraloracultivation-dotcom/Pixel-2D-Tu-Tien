-- Chữ ký món, giai đoạn 3: MỨC NHẬN ĐỒ RƠI MỚI. Giai đoạn 1, 2 (20261105010000_p2d_ky_mon.sql, 20261105020000_p2d_ky_ngoc.sql)
-- khoá món đã có trong túi máy chủ, nhưng món MỚI (mã số uid chưa có trong túi máy chủ: đồ rơi, càn quét, thưởng việc, rèn,
-- cốt truyện) chỉ cần qua p2d_mon_hop_le là được ký. Máy khách sửa có thể nhét mỗi lần lưu 40 món Thiên mới, 10 dòng màu Đen,
-- cấp 81, rồi phân giải ở lần lưu sau lấy Linh Thạch / Tẩy Luyện Thạch / Đạo Vận Thạch không tính trần (p2d_mien_tran).
-- Từ nay p2d_luu gọi p2d_kiem_roi ngay sau p2d_kiem_ky (vá bằng thay chuỗi, không chép lại cả hàm):
-- 1) Món mới phải giống món vừa rơi (src/game/items.js rollItem): tối đa roi.dong dòng (1), chưa cường hoá (plus), chưa luyện
--    pháp bảo (pb), cấp món (lvl) không quá tầng tu vi (realm × tang + layer − 1, lấy bản cao hơn giữa bản gửi và bản máy chủ vì
--    có thể vừa tụt cảnh giới khi thua Thiên Ma). Sai thì bỏ món, ghi 'roi_sai' (cộng điểm nghi vấn); lần lưu đầu ghi 'roi_dau'.
-- 2) Mỗi độ hiếm một thùng (data.kyRoi.xo): hồi roi.phut món mỗi phút còn liên lạc (v_dt) + roi.gio món mỗi giờ thật kể từ lần
--    lưu trước (thưởng bí cảnh, càn quét tính theo lượt mỗi ngày chứ không theo giờ chơi), đầy roi.tran; chưa có kyRoi thì thùng
--    đầy. Món độ hiếm thấp được dùng thùng độ hiếm cao hơn khi thùng mình cạn. Món có dòng màu từ roi.mau.t (Tiên, Thượng Cổ)
--    tốn thêm một phần thùng màu (data.kyRoi.m). Hết thùng: bỏ món khỏi bản lưu, trả mã món ở sua.roi (máy khách bỏ khỏi túi,
--    src/game/cloud-guard.js), tháo nếu đang mặc. Gửi quá nang lần số được nhận (+2) thì 'roi_lo' (cộng điểm), còn lại
--    'roi_nhieu' (chỉ ghi). Mã món đã bỏ nhớ ở data.kyRoi.bo (roi.nho mã): bản game cũ chưa tải lại gửi lại món đó thì không tính
--    điểm, thùng có lại thì nhận. Món trùng mã số trong một lần gửi: giữ món đầu, ghi 'roi_trung' (chỉ ghi).
--    Số đo trên máy chủ thật 05/11/2026 (bản sao lưu đêm p2d_sao_luu, chỉ đọc): người cày nặng nhất tăng nextUid ~10.800 món /
--    ngày (150 nghìn quái, ~0,07 món / quái, ~7,5 món / phút nếu treo cả ngày); càn quét đủ 7 bí cảnh × 5 lượt ra 35 món Thiên
--    thưởng bậc + ~8 Thiên, ~51 Địa, ~105 Huyền từ quái; 'do_hiem' (> 2 Thiên hoặc > 4 Địa mới trong một lần lưu) gặp ở 7 người,
--    lần lưu trung vị 10 giây, tức đồ rơi đến từng đợt. Thùng: Thiên 1 / phút + 3 / giờ thật (72 / ngày), đầy 80 (gấp đôi túi 40);
--    Địa 3 + 6, đầy 150; Huyền 6 + 12, đầy 250; Linh 10 + 15, đầy 300; Phàm 20 + 30, đầy 400 (≥ 2 lần mức cày cao nhất đo được).
-- 3) Món từ Hòm thư (chợ, đạo lữ, Thiên Ma, quà) do p2d_nhan_thu_moi đặt thẳng vào túi máy chủ nên không phải món mới, không tốn thùng.
-- Không gắn chủ (user_id) vào chữ ký: p2d_kiem_ky không tin chữ ký máy khách gửi, chỉ so theo uid với túi trên máy chủ; món chép từ
-- tài khoản khác sang vốn đã là món mới, nay qua luật 1), 2). Gắn chủ không chặn thêm gì mà phải ký lại ở chợ, thư, đạo lữ.
-- Số ở p2d_ky_cfg.roi (tools/ky-cfg.mjs dựng từ data/items.json drop_budget, tools/check.mjs so).
-- Chạy lại cả file không sao (bảng số ghi đè, hàm thay bằng bản mới, phần vá thấy đã vá thì bỏ qua).
-- Thứ tự: chạy sau 20261105020000_p2d_ky_ngoc.sql (chỗ vá là dòng giai đoạn 2 thêm vào p2d_luu).

insert into public.p2d_ky_cfg (k, v) values ('cfg', '{"tay":{"base":120,"realm_mul":1.45,"r":1.3,"decay":0,"line_mul":2,"cost":2,"free":1},"mau":[[1,40],[1.3,28],[1.7,17],[2.2,9],[2.8,4],[3.6,1.6],[4.6,0.4]],"tu_pham":{"pham":0,"linh":0,"huyen":1,"dia":2,"thien":3},"cap_w":[8,12,14,15,14,12,10,7,5,3],"lpl":0.08,"cs":{"atk":[2,6,false],"atk_pct":[3,8,true],"hp":[10,30,false],"hp_pct":[4,10,true],"def":[1,4,false],"crit":[2,5,true],"crit_dmg":[8,20,true],"cdr":[2,6,true],"speed":[2,5,true],"qi_gain":[4,10,true]},"pool":{"thiet-kiem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"thanh-van-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-y":["hp","hp_pct","def","speed","cdr","qi_gain"],"huyen-giap":["hp","hp_pct","def","crit","atk"],"ngoc-boi-tho":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"],"linh-phu":["qi_gain","cdr","speed","hp","atk"],"thiet-thuong":["atk","atk_pct","crit","crit_dmg","speed","hp"],"ba-tieu-phien":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"],"moc-cam":["atk_pct","cdr","qi_gain","crit","hp","def"],"tu-nguyet-liem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"truc-cung":["atk","atk_pct","crit","crit_dmg","speed","cdr"],"thien-mach-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-hai":["speed","hp","def","cdr","qi_gain"],"van-van-ngoa":["speed","crit","atk","hp_pct","cdr"],"bo-can":["hp","def","cdr","qi_gain","crit"],"thiet-khoi":["def","hp","hp_pct","crit","atk"],"thiet-gioi":["crit","crit_dmg","atk","atk_pct","def"],"linh-ngoc-gioi":["crit","crit_dmg","qi_gain","hp_pct","cdr"],"kim-luan":["atk","atk_pct","cdr","crit"],"tran-yeu-thap":["hp","hp_pct","def","cdr"],"hoa-hon-linh":["atk_pct","crit_dmg","cdr","qi_gain"],"xich-diem-giap":["hp","hp_pct","def","atk_pct"],"xich-diem-hai":["speed","atk","crit"],"xich-diem-quan":["crit","atk","atk_pct"],"xich-diem-gioi":["crit","crit_dmg","atk_pct"],"xich-diem-boi":["atk_pct","crit_dmg","qi_gain"],"han-bang-giap":["hp","hp_pct","def","cdr"],"han-bang-hai":["speed","def","hp"],"han-bang-quan":["def","hp","hp_pct"],"han-bang-gioi":["crit","cdr","hp_pct"],"han-bang-boi":["hp_pct","def","qi_gain"],"hac-phong-giap":["hp","speed","cdr","atk_pct"],"hac-phong-hai":["speed","cdr","crit"],"hac-phong-quan":["crit","cdr","speed"],"hac-phong-gioi":["crit","crit_dmg","cdr"],"hac-phong-boi":["cdr","atk_pct","qi_gain"],"thanh-moc-bao":["hp","hp_pct","def","qi_gain"],"thanh-moc-hai":["speed","hp_pct","def"],"thanh-moc-quan":["hp","hp_pct","qi_gain"],"thanh-moc-gioi":["crit","crit_dmg","hp_pct"],"thanh-moc-boi":["qi_gain","hp_pct","def"],"kim-cang-giap":["def","hp_pct","atk_pct"],"kim-cang-hai":["speed","atk_pct","crit"],"kim-cang-quan":["crit","crit_dmg","atk_pct"],"kim-cang-gioi":["crit","crit_dmg","atk_pct"],"kim-cang-boi":["atk_pct","crit_dmg","cdr"],"hau-tho-giap":["hp","def","hp_pct"],"hau-tho-hai":["def","speed","hp_pct"],"hau-tho-quan":["def","hp","hp_pct"],"hau-tho-gioi":["hp_pct","def","crit"],"hau-tho-boi":["def","hp_pct","qi_gain"],"dao-van-binh":["atk","atk_pct","crit","crit_dmg","cdr"],"dao-van-quan":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-bao":["hp","hp_pct","def","atk_pct"],"dao-van-boi":["atk_pct","crit_dmg","cdr","qi_gain"],"dao-van-hai":["speed","crit","cdr","atk_pct"],"dao-van-gioi":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-an":["atk","atk_pct","cdr","crit"],"thai-hu-giap":["hp","hp_pct","cdr","atk_pct"],"thai-hu-hai":["speed","cdr","crit"],"thai-hu-quan":["crit","cdr","atk_pct"],"thai-hu-gioi":["crit","crit_dmg","atk_pct"],"thai-hu-boi":["cdr","atk_pct","qi_gain"]},"cuong":{"max":20,"iron":[1,2,3,4,5,6,8,10,12,15,18,21,25,30,36,43,51,61,73,87],"stones":[0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,11,13,15,17,20],"coins":[0,0,0,0,0,0,0,0,0,0,2000,2700,3600,4900,6600,8900,12000,16200,21900,29500],"rate":[1,1,0.95,0.85,0.75,0.65,0.55,0.45,0.35,0.25,0.22,0.2,0.18,0.16,0.14,0.12,0.11,0.1,0.09,0.08],"drop_from":7,"drop_chance":0.5,"open":{"base":10,"from_realm":2,"per_realm":2}},"he":["moc","hoa","thuy","kim","tho"],"doi_he":{"mat":"dao-van-thach","n":1},"ngoc":{"types":["hong-ngoc","lam-ngoc","hoang-ngoc","luc-ngoc"],"max":20,"merge":3,"phi":[30,2.5],"lo":{"max_lv":4,"toc_phut":6,"tran":150},"truyen":[[3,"hong-ngoc:5"],[4,"lam-ngoc:5"],[6,"hoang-ngoc:5"],[10,"luc-ngoc:5"]],"zalo":5},"pb_max":20,"luyen":{"base":3,"r":1.35,"mat":"manh-phap-bao","bases":["kim-luan","tran-yeu-thap","hoa-hon-linh","dao-van-an"]},"roi":{"thu_tu":["pham","linh","huyen","dia","thien"],"phut":{"pham":20,"linh":10,"huyen":6,"dia":3,"thien":1},"gio":{"pham":30,"linh":15,"huyen":12,"dia":6,"thien":3},"tran":{"pham":400,"linh":300,"huyen":250,"dia":150,"thien":80},"mau":{"t":5,"phut":0.2,"gio":1,"tran":20},"dong":1,"tang":9,"nang":2,"nho":60}}'::jsonb) on conflict (k) do update set v = excluded.v;

-- Kiểm món mới trong túi (p2d_luu gọi sau p2d_kiem_ky). p_cu: bản lưu máy chủ; p_moi: bản lưu mới (túi đã qua p2d_kiem_ky);
-- p_dt: giây còn liên lạc; p_tuong: giây thật kể từ lần lưu trước; p_tk_moi: lần lưu đầu.
-- Trả { bag, ky (data.kyRoi mới), bo (mã món bị bỏ), sua (máy khách phải sửa túi), ly_do, chi_tiet }.
create or replace function public.p2d_kiem_roi(p_cu jsonb, p_moi jsonb, p_dt numeric, p_tuong numeric, p_tk_moi boolean) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_c jsonb := (select v -> 'roi' from public.p2d_ky_cfg where k = 'cfg');
  v_ky jsonb := case when jsonb_typeof(p_cu -> 'kyRoi') = 'object' then p_cu -> 'kyRoi' else '{}'::jsonb end;
  v_dt numeric := least(greatest(coalesce(p_dt, 0), 0), 86400);
  v_tg numeric := least(greatest(coalesce(p_tuong, 0), 0), 172800);
  v_nho jsonb := case when jsonb_typeof(v_ky -> 'bo') = 'array' then v_ky -> 'bo' else '[]'::jsonb end;
  v_ids text[]; v_xo numeric[] := '{}'; v_m numeric; v_tran numeric; v_tang integer; v_lv numeric; i integer; j integer; v_r integer;
  v_cu jsonb; v_thay jsonb := '{}'; v_ra jsonb := '[]'; v_bo jsonb := '[]'; v_ct jsonb := '[]'; v_ly text[] := '{}'; v_xo_ra jsonb := '{}';
  v_g jsonb; v_k text; v_l jsonb; v_sai boolean; v_mau boolean; v_nhan integer := 0; v_lo integer := 0; v_lai integer := 0; v_trung boolean := false;
begin
  v_ids := array(select jsonb_array_elements_text(v_c -> 'thu_tu'));
  v_tang := (v_c ->> 'tang')::integer;
  -- thùng mỗi độ hiếm hồi theo phút còn liên lạc và giờ thật; chưa có kyRoi thì đầy
  for i in 1 .. coalesce(array_length(v_ids, 1), 0) loop
    v_tran := (v_c -> 'tran' ->> v_ids[i])::numeric;
    v_xo := v_xo || least(v_tran, coalesce(public.p2d_ky_so(v_ky -> 'xo' -> v_ids[i]), v_tran)
      + (v_c -> 'phut' ->> v_ids[i])::numeric / 60 * v_dt + (v_c -> 'gio' ->> v_ids[i])::numeric / 3600 * v_tg);
  end loop;
  v_tran := (v_c -> 'mau' ->> 'tran')::numeric;
  v_m := least(v_tran, coalesce(public.p2d_ky_so(v_ky -> 'm'), v_tran)
    + (v_c -> 'mau' ->> 'phut')::numeric / 60 * v_dt + (v_c -> 'mau' ->> 'gio')::numeric / 3600 * v_tg);
  -- cấp món mới tối đa: tầng tu vi cao hơn giữa bản gửi và bản máy chủ (totalLayer, src/game/stats.js)
  v_lv := greatest(coalesce(public.p2d_ky_so(p_moi -> 'realm'), 0) * v_tang + coalesce(public.p2d_ky_so(p_moi -> 'layer'), 1) - 1,
                   coalesce(public.p2d_ky_so(p_cu -> 'realm'), 0) * v_tang + coalesce(public.p2d_ky_so(p_cu -> 'layer'), 1) - 1);
  select coalesce(jsonb_object_agg(o ->> 'uid', true), '{}'::jsonb) into v_cu
    from jsonb_array_elements(case when jsonb_typeof(p_cu -> 'bag') = 'array' then p_cu -> 'bag' else '[]'::jsonb end) o
   where jsonb_typeof(o) = 'object' and jsonb_typeof(o -> 'uid') = 'number';
  if jsonb_typeof(p_moi -> 'bag') = 'array' then
    for v_g in select x.e from jsonb_array_elements(p_moi -> 'bag') with ordinality x(e, n) order by x.n loop
      if jsonb_typeof(v_g) is distinct from 'object' then v_ra := v_ra || jsonb_build_array(v_g); continue; end if;   -- p2d_luu đã chặn
      v_k := v_g ->> 'uid';
      if v_thay ? v_k then v_trung := true; continue; end if;   -- trùng mã số trong một lần gửi: giữ món đầu
      v_thay := v_thay || jsonb_build_object(v_k, true);
      if v_cu ? v_k then v_ra := v_ra || jsonb_build_array(v_g); continue; end if;   -- món đã có: p2d_kiem_ky đã lo
      v_l := case when jsonb_typeof(v_g -> 'lines') = 'array' then v_g -> 'lines' else '[]'::jsonb end;
      -- 1) món mới phải giống món vừa rơi
      v_sai := jsonb_array_length(v_l) > (v_c ->> 'dong')::integer
        or coalesce(public.p2d_ky_so(v_g -> 'plus'), 0) <> 0 or coalesce(public.p2d_ky_so(v_g -> 'pb'), 0) <> 0
        or coalesce(public.p2d_ky_so(v_g -> 'lvl'), 0) > v_lv;
      if v_sai then
        v_ly := array_append(v_ly, case when p_tk_moi then 'roi_dau' else 'roi_sai' end);
        v_bo := v_bo || jsonb_build_array(v_g -> 'uid');
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('ly', 'sai', 'mon', v_g - 'sig')); end if;
        continue;
      end if;
      -- 2) thùng: độ hiếm của món, cạn thì dùng thùng độ hiếm cao hơn; dòng Tiên / Thượng Cổ tốn thêm thùng màu
      v_r := coalesce(array_position(v_ids, v_g ->> 'rarity'), 1);
      v_mau := exists (select 1 from jsonb_array_elements(v_l) l where coalesce(public.p2d_ky_so(l -> 't'), 0) >= (v_c -> 'mau' ->> 't')::numeric);
      j := null;
      if not v_mau or v_m >= 1 then
        for i in v_r .. array_length(v_ids, 1) loop
          if v_xo[i] >= 1 then j := i; exit; end if;
        end loop;
      end if;
      if j is not null then
        v_xo[j] := v_xo[j] - 1;
        if v_mau then v_m := v_m - 1; end if;
        v_nhan := v_nhan + 1; v_ra := v_ra || jsonb_build_array(v_g);
      else
        v_bo := v_bo || jsonb_build_array(v_g -> 'uid');
        if v_nho @> jsonb_build_array(v_g -> 'uid') then v_lai := v_lai + 1; else v_lo := v_lo + 1; end if;   -- bản game cũ gửi lại món đã bỏ
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('ly', 'lo', 'uid', v_g -> 'uid', 'rarity', v_g -> 'rarity', 'mau', v_mau)); end if;
      end if;
    end loop;
  end if;
  if v_lo + v_lai > 0 then
    v_ly := array_append(v_ly, case when p_tk_moi then 'roi_dau' when v_lo > ((v_c ->> 'nang')::numeric - 1) * v_nhan + 2 then 'roi_lo' else 'roi_nhieu' end);
  end if;
  if v_trung then v_ly := array_append(v_ly, 'roi_trung'); end if;
  for i in 1 .. coalesce(array_length(v_ids, 1), 0) loop v_xo_ra := v_xo_ra || jsonb_build_object(v_ids[i], round(v_xo[i], 2)); end loop;
  -- nhớ mã món đã bỏ, mới nhất trước, tối đa nho mã
  select coalesce(jsonb_agg(y.u order by y.n), '[]'::jsonb) into v_nho
    from (select x.u, min(x.n) as n from jsonb_array_elements(v_bo || v_nho) with ordinality x(u, n) group by x.u order by 2 limit (v_c ->> 'nho')::integer) y;
  return jsonb_build_object('bag', case when jsonb_typeof(p_moi -> 'bag') = 'array' then v_ra else p_moi -> 'bag' end,
    'ky', jsonb_build_object('xo', v_xo_ra, 'm', round(v_m, 2), 'bo', v_nho),
    'bo', v_bo, 'sua', jsonb_array_length(v_bo) > 0 or v_trung,
    'ly_do', to_jsonb(array(select distinct unnest(v_ly))), 'chi_tiet', v_ct);
end;
$$;

revoke all on function public.p2d_kiem_roi(jsonb, jsonb, numeric, numeric, boolean) from public, anon, authenticated;

-- Vá p2d_luu (bản đang chạy = 20261031030000 + vá 20261104030000, 20261104100000, 20261105010000, 20261105020000): gọi
-- p2d_kiem_roi giữa p2d_kiem_ky và p2d_kiem_ngoc; món bị bỏ ra khỏi túi, khỏi đồ đang mặc, khỏi sua.mon; trả sua.roi.
-- 'roi_nhieu', 'roi_trung', 'roi_dau' chỉ ghi, không cộng điểm nghi vấn. Bằng chứng (món bị bỏ) ghi 'roi_mon' như 'sua_do_mon'.
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  khai text := '  v_tao timestamptz; v_nang boolean := false; v_on numeric; v_ngoc jsonb;';
  neo text := '  -- Túi ngọc (20261105020000_p2d_ky_ngoc): tổng ngọc chỉ tăng từ nguồn hợp lệ, phần lố trả máy khách ở sua.gems';
  neo2 text := '  if v_sua <> ''{}''::jsonb then perform set_config(''p2d.sua'', v_sua::text, true); end if;';
  a text := 'array_length(array_remove(array_remove(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), ''sua_do_cu''), ''ngoc_cu''), 1)';
  b text := 'array_length(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), ''sua_do_cu''), ''ngoc_cu''), ''roi_nhieu''), ''roi_trung''), ''roi_dau''), 1)';
  x text;
begin
  if position('p2d_kiem_roi' in d) > 0 then return; end if;
  foreach x in array array[khai, neo, neo2, a] loop
    if (length(d) - length(replace(d, x, ''))) / length(x) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va: %', left(x, 60); end if;
  end loop;
  d := replace(d, khai, khai || ' v_roi jsonb;');
  d := replace(d, neo,
    '  -- Đồ rơi mới (20261105030000_p2d_ky_roi): món mới phải giống món vừa rơi, trong thùng độ hiếm; món bị bỏ trả máy khách ở sua.roi' || chr(10) ||
    '  v_roi := public.p2d_kiem_roi(v_cu.data, v_data, v_dt, extract(epoch from (now() - v_cu.luu_luc)), v_moi);' || chr(10) ||
    '  if jsonb_typeof(v_data -> ''bag'') = ''array'' then v_data := jsonb_set(v_data, ''{bag}'', v_roi -> ''bag''); end if;' || chr(10) ||
    '  v_data := v_data || jsonb_build_object(''kyRoi'', v_roi -> ''ky'');' || chr(10) ||
    '  v_ly_do := v_ly_do || array(select jsonb_array_elements_text(v_roi -> ''ly_do''));' || chr(10) ||
    '  if (v_roi ->> ''sua'')::boolean then' || chr(10) ||
    '    if jsonb_typeof(v_data -> ''equip'') = ''object'' then' || chr(10) ||
    '      v_data := jsonb_set(v_data, ''{equip}'', (select coalesce(jsonb_object_agg(e.key, e.value), ''{}''::jsonb) from jsonb_each(v_data -> ''equip'') e where not ((v_roi -> ''bo'') @> jsonb_build_array(e.value))));' || chr(10) ||
    '    end if;' || chr(10) ||
    '    if jsonb_typeof(v_sua -> ''mon'') = ''array'' then' || chr(10) ||
    '      v_sua := jsonb_set(v_sua, ''{mon}'', (select coalesce(jsonb_agg(m), ''[]''::jsonb) from jsonb_array_elements(v_sua -> ''mon'') m where not ((v_roi -> ''bo'') @> jsonb_build_array(m -> ''uid''))));' || chr(10) ||
    '    end if;' || chr(10) ||
    '    v_sua := v_sua || jsonb_build_object(''roi'', v_roi -> ''bo'');' || chr(10) ||
    '  end if;' || chr(10) || neo);
  d := replace(d, neo2,
    '  if (v_roi -> ''ly_do'') ?| array[''roi_lo'', ''roi_sai''] and not exists (select 1 from public.p2d_nghi_van x where x.user_id = v_uid and x.ly_do = ''roi_mon'' and x.luc > now() - interval ''10 minutes'') then' || chr(10) ||
    '    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet) values (v_uid, ''roi_mon'', jsonb_build_object(''mon'', v_roi -> ''chi_tiet''));' || chr(10) ||
    '  end if;' || chr(10) || neo2);
  execute replace(d, a, b);
end;
$$;
