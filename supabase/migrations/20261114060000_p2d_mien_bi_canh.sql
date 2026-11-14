-- Sửa luật cờ "linh_thach" báo nhầm (chủ dự án 14/11/2026 11:22, bảng câu hỏi câu 8: "sửa luật").
--
-- Chuyện gì xảy ra: thùng hạn mức Linh Thạch (29/10, 20261029010000_p2d_chong_gian_3.sql) chỉ đầy dần 6 × 1,6^cảnh giới mỗi giây lúc
-- đang chơi, tối đa 20.000 + 1 giờ (41.600 ở Luyện Khí, 54.560 ở Trúc Cơ, 75.296 ở Kim Đan). Linh Thạch máy khách tự cộng vượt thùng
-- thì máy chủ cắt phần vượt, ghi cờ linh_thach, 5 cờ trong 24 giờ là cờ đỏ, tài khoản dưới 3 ngày đủ 3 cờ là tự khoá.
-- Ba thứ làm sau ngày đó phát Linh Thạch thành từng cục lớn hơn thùng mà thùng không biết:
--   1) Bí cảnh Linh Thạch Rễ Mẫu Thụ (02/11): mỗi lượt 12.000–36.000, năm lượt mỗi ngày.
--   2) Càn quét ra đồ như đánh thật (04/11): cả lượt bí cảnh (thưởng cấp + Linh Thạch rơi của mọi quái) dồn vào một lần lưu.
--   3) Quà tu vi và reset cảnh giới (12/11): đột phá nhận 10.000–40.000; người cũ về cảnh giới thấp (thùng nhỏ lại) nhưng bậc bí cảnh giữ nguyên.
-- Đo 12–14/11: 20 cờ linh_thach / 8 người, toàn người chơi thật lúc đi bí cảnh hằng ngày hoặc vừa đột phá (một người bị cờ đỏ tự động
-- 14/11 09:08, một người 4 cờ / 24 giờ, hai tài khoản mới tạo 14/11 mỗi người 1 cờ ngay lần đột phá đầu); phần Linh Thạch vượt thùng
-- của họ bị cắt mất. Thư (tiền bán chợ, quà triệu hồi) do máy chủ tự cộng vào bản lưu nên không dính luật này.
-- Thử trên máy chủ thật trước khi vá (giao dịch lùi lại hết): càn quét 5 lượt Rễ Mẫu Thụ (+77.100) lúc thùng đầy thì chỉ nhận 41.600, mất
-- 35.500; lúc thùng còn 3.000 thì vượt cả thùng lẫn trần (day_cuc), trigger tự khoá chạy rồi chính lần lưu đó bị p2d_chan_bi_cam chặn
-- ('bi_cam') nên cả lần lưu lùi lại: người chơi không lưu được, cờ và lệnh khoá cũng không ghi lại được.
--
-- Sửa:
--   1) Mỗi lượt bí cảnh thêm trong lần lưu (save.dunRuns) giải thích được một khoản Linh Thạch: thưởng cấp của bậc cao nhất có thể vừa
--      đánh + Linh Thạch rơi nhiều nhất của quái trong bí cảnh đó (hàm p2d_mien_bi_canh, số ở p2d_ky_cfg dòng 'bi_canh' dựng từ data/
--      bằng tools/ky-cfg.mjs bcCfg, tools/check.mjs so khớp). Khoản đó không trừ vào thùng, không ghi cờ; vẫn tính vào trần mỗi ngày
--      (p2d_tran_ngay) như cũ. Sửa thẳng số Linh Thạch trong bộ nhớ mà không có lượt bí cảnh nào thì vẫn bị cắt và ghi cờ như trước.
--   2) Tài khoản mới: thùng lúc tạo 2.000 → 20.000 (bằng mức nền của mọi tài khoản từ 31/10), đủ cho quà đột phá đầu tiên 10.000.
--   3) Cờ linh_thach ghi thêm chi_tiet.lt { tang: số tăng, xo: thùng lúc đó, bc: khoản bí cảnh } để lần sau soát là biết ngay vì sao.
-- Không đổi: luật cờ đỏ, luật tự khoá, trần ngày, các thùng khác. Chạy lại không đổi gì.
-- Giới hạn còn lại: thành viên tổ đội nhận thưởng theo bậc của đội trưởng (cao hơn bậc của mình) thì phần chênh vẫn tính vào thùng.

insert into public.p2d_ky_cfg (k, v) values ('bi_canh', '{"luot":5,"buoc":10,"nhich":0.015,"cap":1.15,"thuong":[150,400,1000,2500,6000,15000,40000],"tuan":[1,1,1,2],"bc":{"bi-canh":[1,58,10],"hoa-quat":[1,197,11],"han-bang-quat":[1,429,12],"hac-phong-dong":[1,854,13],"co-thu-tam":[1,1527,12],"re-mau-thu":[80,2503,19],"kiem-trung":[1,3298,17],"dia-cung":[1,4317,17],"hu-khong-lao":[1,5641,17],"vet-nut":[1,23547,12]}}'::jsonb)
on conflict (k) do update set v = excluded.v;

-- Khoản Linh Thạch các lượt bí cảnh thêm trong lần lưu này giải thích được. p_cu: bản máy chủ đang giữ, p_moi: bản máy khách gửi.
create or replace function public.p2d_mien_bi_canh(p_cu jsonb, p_moi jsonb)
returns numeric
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_c jsonb; v_or jsonb; v_nr jsonb; v_cung boolean; v_luot numeric; v_buoc numeric; v_nhich numeric; v_cuoi integer; v_nt integer; v_tuan numeric;
  v_id text; v_b jsonb; v_them numeric; v_l numeric; v_cap integer; v_s numeric; v_tong numeric := 0;
begin
  -- hầu hết các lần lưu không có lượt bí cảnh nào thêm: thoát ngay
  if jsonb_typeof(p_moi -> 'dunRuns') is distinct from 'object' or (p_cu -> 'dunRuns') is not distinct from (p_moi -> 'dunRuns') then return 0; end if;
  begin
    select c.v into v_c from public.p2d_ky_cfg c where c.k = 'bi_canh';
    if v_c is null then return 0; end if;
    v_or := case when jsonb_typeof(p_cu -> 'dunRuns') = 'object' then p_cu -> 'dunRuns' else '{}'::jsonb end;
    v_nr := p_moi -> 'dunRuns';
    v_cung := (v_or -> 'day') is not distinct from (v_nr -> 'day');   -- sang ngày mới máy khách đếm lại từ 0 (src/game/dun-run.js runsUsed)
    v_luot := (v_c ->> 'luot')::numeric; v_buoc := (v_c ->> 'buoc')::numeric; v_nhich := (v_c ->> 'nhich')::numeric;
    v_cuoi := jsonb_array_length(v_c -> 'thuong') - 1; v_nt := jsonb_array_length(v_c -> 'tuan');
    -- Sự kiện tuần xoay vòng theo số tuần tính bằng giờ máy người chơi (src/game/events.js weekNo): lấy hệ số lớn nhất trong mọi múi giờ
    v_tuan := greatest(
      (v_c -> 'tuan' ->> mod(mod(floor((floor(extract(epoch from now() - interval '12 hours') / 86400) - 4) / 7)::integer, v_nt) + v_nt, v_nt))::numeric,
      (v_c -> 'tuan' ->> mod(mod(floor((floor(extract(epoch from now() + interval '14 hours') / 86400) - 4) / 7)::integer, v_nt) + v_nt, v_nt))::numeric);
    for v_id, v_b in select e.key, e.value from jsonb_each(v_c -> 'bc') e loop
      v_them := floor(least(greatest(coalesce(public.p2d_ky_so(v_nr -> v_id), 0) - case when v_cung then coalesce(public.p2d_ky_so(v_or -> v_id), 0) else 0 end, 0), v_luot));
      continue when v_them < 1;
      -- bậc cao nhất có thể vừa đánh (đếm từ 0): số bậc đã qua máy khách gửi, nhưng không quá số máy chủ đang giữ + số lượt thêm
      v_l := floor(least(greatest(least(coalesce(public.p2d_ky_so(p_moi -> 'dunLv2' -> v_id), 0), coalesce(public.p2d_ky_so(p_cu -> 'dunLv2' -> v_id), 0) + v_them) - 1, 0), 3000));
      v_cap := floor(v_l / v_buoc)::integer; v_s := v_l - v_cap * v_buoc;
      v_tong := v_tong + v_them * (
        ceil((v_c -> 'thuong' ->> least(v_cap, v_cuoi))::numeric * (v_b ->> 0)::numeric * (1 + v_nhich * case when v_cap > v_cuoi then v_buoc - 1 else v_s end)) + 1
        + ceil((v_b ->> 1)::numeric * power((v_c ->> 'cap')::numeric, v_cap) * (1 + v_nhich * v_s) * v_tuan) + 2 * (v_b ->> 2)::numeric);
    end loop;
  exception when others then
    return 0;   -- số lạ: coi như không có khoản nào (luật cũ), không bao giờ làm hỏng lần lưu
  end;
  return v_tong;
end;
$$;

revoke all on function public.p2d_mien_bi_canh(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.p2d_mien_bi_canh(jsonb, jsonb) to service_role;

-- Vá thân hàm p2d_luu đang chạy (hàm dài, nhiều bản vá chồng nhau): mỗi chỗ phải thấy đúng một lần, không thì dừng, không đổi gì.
do $do$
declare
  d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  v text[] := array[
    -- biến mới
    'v_nhan numeric; v_can_giay numeric;',
    'v_nhan numeric; v_can_giay numeric; v_bc numeric := 0; v_lt_ct jsonb;',
    -- thùng lúc tạo tài khoản
    'v_cu.lt_xo := 2000;',
    'v_cu.lt_xo := 20000;',
    -- khoản bí cảnh không tính vào thùng
    E'\n  if v_lt_moi - v_lt_cu > v_xo then\n',
    E'\n  -- thưởng bí cảnh không tính vào thùng (20261114060000_p2d_mien_bi_canh.sql)\n  if not v_moi then v_bc := least(public.p2d_mien_bi_canh(v_cu.data, v_data), greatest(v_lt_moi - v_lt_cu, 0)); end if;\n  if v_lt_moi - v_lt_cu - v_bc > v_xo then\n    v_lt_ct := jsonb_build_object(''lt'', jsonb_build_object(''tang'', v_lt_moi - v_lt_cu, ''xo'', floor(v_xo), ''bc'', v_bc));\n',
    'if v_lt_moi - v_lt_cu > v_xo + v_tran then v_nang := true;',
    'if v_lt_moi - v_lt_cu - v_bc > v_xo + v_tran then v_nang := true;',
    'v_sua := v_sua || jsonb_build_object(''lingshi'', v_lt_cu + floor(v_xo));',
    'v_sua := v_sua || jsonb_build_object(''lingshi'', v_lt_cu + v_bc + floor(v_xo));',
    'v_lt_moi := v_lt_cu + floor(v_xo); v_data := jsonb_set(v_data, ''{lingshi}'', to_jsonb(v_lt_moi));',
    'v_lt_moi := v_lt_cu + v_bc + floor(v_xo); v_data := jsonb_set(v_data, ''{lingshi}'', to_jsonb(v_lt_moi));',
    'elsif v_lt_moi > v_lt_cu then v_xo := v_xo - (v_lt_moi - v_lt_cu); end if;',
    'elsif v_lt_moi - v_bc > v_lt_cu then v_xo := v_xo - (v_lt_moi - v_lt_cu - v_bc); end if;',
    -- chi tiết cờ
    'jsonb_build_object(''may'', round((v_clk - v_cu.dh_clk) / 1000), ''chu'', round(v_that)) end, ''ac'', v_ac));',
    'jsonb_build_object(''may'', round((v_clk - v_cu.dh_clk) / 1000), ''chu'', round(v_that)) end, ''ac'', v_ac) || coalesce(v_lt_ct, ''{}''::jsonb));'
  ];
  i integer; n integer;
begin
  if position('p2d_mien_bi_canh' in d) > 0 then return; end if;   -- đã vá
  for i in 1 .. array_length(v, 1) / 2 loop
    n := (length(d) - length(replace(d, v[2 * i - 1], ''))) / length(v[2 * i - 1]);
    if n <> 1 then raise exception 'p2d_mien_bi_canh: cho va thu % thay % lan (can dung 1)', i, n; end if;
    d := replace(d, v[2 * i - 1], v[2 * i]);
  end loop;
  execute d;
end $do$;

-- Tự kiểm: số của hàm máy chủ phải bằng số tools/ky-cfg.mjs bcLuot tính từ data/ (tuần thường hoặc tuần Linh Thạch × 2)
do $do$
declare
  r numeric;
begin
  -- 5 lượt càn quét Rễ Mẫu Thụ bậc 10 (đã qua 10 bậc): 5 × 16.500 (tuần thường) hoặc 5 × 19.341
  r := public.p2d_mien_bi_canh('{"dunRuns": {"day": "a"}, "dunLv2": {"re-mau-thu": 10}}', '{"dunRuns": {"day": "a", "re-mau-thu": 5}, "dunLv2": {"re-mau-thu": 10}}');
  if r not in (5 * 16500, 5 * 19341) then raise exception 'p2d_mien_bi_canh kt1: %', r; end if;
  -- vượt bậc mới (đã qua 9 → 10) Kiếm Trủng: 1 lượt ở bậc 10 (đếm từ 0 là 9): 3.950 hoặc 7.693
  r := public.p2d_mien_bi_canh('{"dunRuns": {"day": "a", "kiem-trung": 2}, "dunLv2": {"kiem-trung": 9}}', '{"dunRuns": {"day": "a", "kiem-trung": 3}, "dunLv2": {"kiem-trung": 10}}');
  if r not in (3950, 7693) then raise exception 'p2d_mien_bi_canh kt2: %', r; end if;
  -- sang ngày mới đếm lại từ 0; khai bậc cao hơn hẳn số máy chủ giữ thì chỉ tính tới (số máy chủ giữ + số lượt thêm): bậc 0 và bậc 6 (Địa Cung)
  r := public.p2d_mien_bi_canh('{"dunRuns": {"day": "a", "bi-canh": 5}, "dunLv2": {"dia-cung": 6}}', '{"dunRuns": {"day": "b", "bi-canh": 1, "dia-cung": 1}, "dunLv2": {"dia-cung": 60}}');
  if r not in (229 + 4905, 287 + 9611) then raise exception 'p2d_mien_bi_canh kt3: %', r; end if;
  -- không thêm lượt nào, số lượt lùi, khoá lạ, dữ liệu hỏng: 0
  if public.p2d_mien_bi_canh('{"dunRuns": {"day": "a", "re-mau-thu": 5}}', '{"dunRuns": {"day": "a", "re-mau-thu": 5}, "lingshi": 9}') <> 0
     or public.p2d_mien_bi_canh('{"dunRuns": {"day": "a", "re-mau-thu": 5}}', '{"dunRuns": {"day": "a", "re-mau-thu": 2, "thuong": 3, "la": "x"}}') <> 0
     or public.p2d_mien_bi_canh('{}', '{"dunRuns": "x"}') <> 0 or public.p2d_mien_bi_canh(null, null) <> 0 then raise exception 'p2d_mien_bi_canh kt4'; end if;
  -- khai 999 triệu lượt ở bậc 10^30: chỉ tính 5 lượt, bậc không quá (0 máy chủ giữ + 5 lượt) → bậc 5 (đếm từ 0 là 4): 5 × 15.413 hoặc 5 × 18.066
  r := public.p2d_mien_bi_canh('{}', '{"dunRuns": {"day": "a", "re-mau-thu": 999999999}, "dunLv2": {"re-mau-thu": 1e30}}');
  if r not in (77065, 90330) then raise exception 'p2d_mien_bi_canh kt5: %', r; end if;
  if position('p2d_mien_bi_canh' in pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure)) = 0 then raise exception 'p2d_mien_bi_canh kt6: p2d_luu chua va'; end if;
end $do$;
