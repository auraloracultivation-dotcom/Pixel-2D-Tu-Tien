-- Bán, phân giải, tách không tính vào trần ngày (chủ dự án chốt 04/11/2026 ở Bàn duyệt góp ý; báo lỗi #101 bán linh thú không nhận
-- Linh Thạch, #120 tách pháp bảo bị giảm mảnh). Trước đây p2d_luu so bản lưu mới với bản cũ: Linh Thạch, nguyên liệu tăng thêm đều
-- bị tính vào thùng hạn mức và trần ngày (p2d_tran_ngay), nên tiền bán, đồ phân giải ra cũng bị cắt.
-- - p2d_mien_tran(cu, moi, uid): nhìn những gì biến mất khỏi bản lưu (món trong túi không rao chợ, linh thú, thú cưỡi), tính phần
--   Linh Thạch / nguyên liệu tối đa mà việc bán, phân giải những thứ đó có thể sinh ra (theo data/shop.json sell, data/items.json
--   salvage, data/gear.json enhance + refine, data/cave.json salvage_iron, data/pets.json home.sell), rồi cộng phần đó vào "số cũ".
--   Như vậy phần tăng do bán / phân giải không bị coi là nhặt được, phần nhặt thật vẫn tính trần như cũ. Chỉ miễn, không cho thêm gì.
-- - p2d_luu: thêm đúng một dòng gọi hàm trên, trước khi tính thùng hạn mức Linh Thạch (vá bằng thay chuỗi, không chép lại cả hàm).

create or replace function public.p2d_mien_tran(p_cu jsonb, p_moi jsonb, p_uid uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare
  v_sell  jsonb := '{"pham":4,"linh":10,"huyen":25,"dia":70,"thien":180}';
  v_stone jsonb := '{"pham":1,"linh":2,"huyen":3,"dia":6,"thien":12}';
  v_iron  jsonb := '{"pham":1,"linh":2,"huyen":3,"dia":5,"thien":8}';
  v_manh  jsonb := '{"pham":1,"linh":2,"huyen":4,"dia":8,"thien":16}';
  v_ci int[] := '{0,1,3,6,10,15,21,29,39,51,66,84,105,130,160,196,239,290,351,424,511}';   -- tinh thiết cộng dồn theo cấp cường hoá
  v_cs int[] := '{0,0,0,0,0,1,2,4,6,9,13,18,24,31,39,48,59,72,87,104,124}';              -- Tẩy Luyện Thạch cộng dồn
  v_l numeric := 0; v_tl numeric := 0; v_tt numeric := 0; v_mp numeric := 0; v_dv numeric := 0;
  v_rao jsonb; v_it jsonb; v_r text; v_p int; v_k text; v_v jsonb;
begin
  if p_cu is null or p_moi is null then return p_cu; end if;
  select coalesce(jsonb_agg(c.mon -> 'uid'), '[]'::jsonb) into v_rao from public.p2d_cho c where c.nguoi_ban = p_uid and c.loai = 'mon';
  -- món rời túi (không phải do đem rao chợ): bán được Linh Thạch hoặc phân giải ra thạch, tinh thiết, mảnh pháp bảo, Đạo Vận Thạch
  for v_it in select o from jsonb_array_elements(case when jsonb_typeof(p_cu -> 'bag') = 'array' then p_cu -> 'bag' else '[]'::jsonb end) o
               where jsonb_typeof(o) = 'object'
                 and not exists (select 1 from jsonb_array_elements(case when jsonb_typeof(p_moi -> 'bag') = 'array' then p_moi -> 'bag' else '[]'::jsonb end) n where n -> 'uid' = o -> 'uid')
                 and not (v_rao @> jsonb_build_array(o -> 'uid')) loop
    v_r := coalesce(v_it ->> 'rarity', 'pham');
    v_p := least(greatest(coalesce(case when jsonb_typeof(v_it -> 'plus') = 'number' then (v_it ->> 'plus')::int end, 0), 0), 20);
    v_l  := v_l  + coalesce((v_sell ->> v_r)::numeric, 0);
    v_tl := v_tl + coalesce((v_stone ->> v_r)::numeric, 0) + floor(v_cs[v_p + 1] * 0.4);
    v_tt := v_tt + coalesce((v_iron ->> v_r)::numeric, 0) + floor(v_ci[v_p + 1] * 0.4);
    if coalesce(v_it ->> 'base', '') in ('kim-luan', 'tran-yeu-thap', 'hoa-hon-linh', 'dao-van-an') then
      v_mp := v_mp + coalesce((v_manh ->> v_r)::numeric, 1) + floor(least(greatest(coalesce(case when jsonb_typeof(v_it -> 'pb') = 'number' then (v_it ->> 'pb')::numeric end, 0), 0), 100) / 2);
    end if;
    v_dv := v_dv + 1;
  end loop;
  -- linh thú đã bán: base + cấp × per_lv + sao × per_star (+ tiến hoá)
  if jsonb_typeof(p_cu -> 'pets') = 'object' then
    for v_k, v_v in select e.key, e.value from jsonb_each(p_cu -> 'pets') e
                     where not (case when jsonb_typeof(p_moi -> 'pets') = 'object' then p_moi -> 'pets' else '{}'::jsonb end ? e.key) loop
      v_l := v_l + 300 + least(coalesce(case when jsonb_typeof(v_v -> 'lv') = 'number' then (v_v ->> 'lv')::numeric end, 1), 1000) * 150
                 + least(coalesce(case when jsonb_typeof(v_v -> 'star') = 'number' then (v_v ->> 'star')::numeric end, 0), 100) * 1000
                 + case when coalesce(v_v ->> 'evo', 'false') not in ('false', 'null', '0', '') then 5000 else 0 end;
    end loop;
  end if;
  -- thú cưỡi đã bán: mount_base + tốc chạy × mount_per_speed, lấy tốc cao nhất 0,65
  if jsonb_typeof(p_cu -> 'mounts') = 'object' then
    select v_l + count(*) * 8500 into v_l from jsonb_object_keys(p_cu -> 'mounts') k
     where not (case when jsonb_typeof(p_moi -> 'mounts') = 'object' then p_moi -> 'mounts' else '{}'::jsonb end ? k);
  end if;
  if v_l > 0 then
    p_cu := jsonb_set(p_cu, '{lingshi}', to_jsonb(coalesce(case when jsonb_typeof(p_cu -> 'lingshi') = 'number' then (p_cu ->> 'lingshi')::numeric end, 0) + v_l));
  end if;
  if v_dv > 0 then
    if jsonb_typeof(p_cu -> 'mats') is distinct from 'object' then p_cu := jsonb_set(p_cu, '{mats}', '{}'::jsonb); end if;
    select p_cu || jsonb_build_object('mats', (p_cu -> 'mats') || coalesce(jsonb_object_agg(m.k,
             coalesce(case when jsonb_typeof(p_cu -> 'mats' -> m.k) = 'number' then (p_cu -> 'mats' ->> m.k)::numeric end, 0) + m.n), '{}'::jsonb))
      into p_cu
      from (values ('tay-luyen-thach', v_tl), ('tinh-thiet', v_tt), ('manh-phap-bao', v_mp), ('dao-van-thach', v_dv)) m(k, n) where m.n > 0;
  end if;
  return p_cu;
end;
$$;
revoke all on function public.p2d_mien_tran(jsonb, jsonb, uuid) from public, anon, authenticated;

-- Vá p2d_luu: thêm một dòng ngay trước thùng hạn mức Linh Thạch. Chạy lại không sao (đã vá thì bỏ qua).
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  neo text := '  v_toc := 6 * power(1.6, v_cu.canh_gioi);';
begin
  if position('p2d_mien_tran' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, '  if not v_moi then v_cu.data := public.p2d_mien_tran(v_cu.data, v_data, v_uid); end if;   -- bán, phân giải, tách không tính trần (#101, #120)' || chr(10) || neo);
end;
$$;
