-- Chữ ký món, giai đoạn 2 (chủ dự án duyệt 05/11/2026, "làm cho xong"): đóng nốt phần món còn tin máy khách là NGỌC và
-- LUYỆN PHÁP BẢO. Giai đoạn 1 (20261105010000_p2d_ky_mon.sql) để ngọc khảm (sockets), bậc pháp bảo (pb), túi ngọc (save.gems)
-- cho máy khách tự sửa; máy chủ chỉ kiểm loại / cấp ngọc. Từ nay:
-- 1) Khảm (p2d_kham_ngoc), gỡ (p2d_go_ngoc), ghép ngọc (p2d_ghep_ngoc), luyện pháp bảo (p2d_luyen_phap_bao) do máy chủ làm
--    trên bản lưu máy chủ, ký lại món, tăng phien_ban; luật y như máy khách (src/game/items.js socket / unsocket / mergeGems,
--    src/game/refine.js refine), số ở p2d_ky_cfg (tools/ky-cfg.mjs dựng từ data/, tools/check.mjs so).
-- 2) sockets, pb vào phần được ký (p2d_ky_phan). Ký lại một lần mọi món (túi, chợ, thư chưa nhận) có chữ ký khác chữ ký mới.
-- 3) p2d_kiem_ky (thay bằng bản mới, giữ cách làm cũ): ô khảm, bậc pháp bảo của món đã có lấy theo máy chủ. Máy khách chỉ được
--    thêm ô trống ở cuối (ô thứ 4, src/game/socket4.js). Bản game cũ chưa tải lại còn tự khảm / gỡ ở máy: trả ô máy chủ, ghi
--    'ngoc_cu' (không cộng điểm nghi vấn); ô sai luật ghi 'ngoc_sai' như cũ. Bậc pháp bảo tăng 1..3 bậc: 'sua_do_cu', còn lại
--    'sua_do'. Món mới (đồ rơi) không được mang ngọc: ô khảm về trống, ngọc tính vào túi ngọc (bước 4).
-- 4) p2d_kiem_ngoc (p2d_luu gọi sau p2d_kiem_ky, vá bằng thay chuỗi): so tổng ngọc mỗi loại:cấp (túi ngọc + đang khảm) máy
--    khách gửi với bản máy chủ. Giảm thì được. Tăng chỉ được: từ thùng ngọc rơi (cấp 1..max_lv, tính bằng viên cấp 1, đầy
--    tran viên, hồi toc_phut viên / phút còn liên lạc, giữ ở data.kyNgoc.xo), quà ngọc cốt truyện (data/story.json, mỗi bước
--    một lần, data.kyNgoc.tr), quà Zalo (một lần, data.kyNgoc.zalo), ghép ở máy của bản game cũ (3 viên cấp dưới đổi 1 viên
--    cấp trên, ghi 'ngoc_cu'). Phần lố bị cắt, trả máy khách ở sua.gems, ghi 'ngoc_lo' (cộng điểm nghi vấn). Ngọc từ Hòm thư,
--    chợ, đạo lữ, chia sẻ clip, điểm danh do hàm máy chủ cộng thẳng vào bản lưu máy chủ nên đã nằm trong bản cũ.
-- 5) Chợ (p2d_rao_ban) tháo ngọc rồi ký lại món; các hàm nhận / trả ngọc (p2d_rao_ban, p2d_dl_tang, p2d_dl_tang2,
--    p2d_nhan_thu_moi) kiểm khoá ngọc theo p2d_ky_cfg (loại, cấp 1..max) thay cho biểu thức cố định.
-- Chạy lại cả file không sao (hàm thay bằng bản mới, phần vá thấy đã vá thì bỏ qua, chỉ ký lại món có chữ ký cũ).

insert into public.p2d_ky_cfg (k, v) values ('cfg', '{"tay":{"base":120,"realm_mul":1.45,"r":1.3,"decay":0,"line_mul":2,"cost":2,"free":1},"mau":[[1,40],[1.3,28],[1.7,17],[2.2,9],[2.8,4],[3.6,1.6],[4.6,0.4]],"tu_pham":{"pham":0,"linh":0,"huyen":1,"dia":2,"thien":3},"cap_w":[8,12,14,15,14,12,10,7,5,3],"lpl":0.08,"cs":{"atk":[2,6,false],"atk_pct":[3,8,true],"hp":[10,30,false],"hp_pct":[4,10,true],"def":[1,4,false],"crit":[2,5,true],"crit_dmg":[8,20,true],"cdr":[2,6,true],"speed":[2,5,true],"qi_gain":[4,10,true]},"pool":{"thiet-kiem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"thanh-van-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-y":["hp","hp_pct","def","speed","cdr","qi_gain"],"huyen-giap":["hp","hp_pct","def","crit","atk"],"ngoc-boi-tho":["atk_pct","hp_pct","crit","crit_dmg","qi_gain","cdr"],"linh-phu":["qi_gain","cdr","speed","hp","atk"],"thiet-thuong":["atk","atk_pct","crit","crit_dmg","speed","hp"],"ba-tieu-phien":["atk","atk_pct","cdr","qi_gain","crit","hp_pct"],"moc-cam":["atk_pct","cdr","qi_gain","crit","hp","def"],"tu-nguyet-liem":["atk","atk_pct","crit","crit_dmg","cdr","speed"],"truc-cung":["atk","atk_pct","crit","crit_dmg","speed","cdr"],"thien-mach-kiem":["atk","atk_pct","crit","crit_dmg","cdr","qi_gain"],"bo-hai":["speed","hp","def","cdr","qi_gain"],"van-van-ngoa":["speed","crit","atk","hp_pct","cdr"],"bo-can":["hp","def","cdr","qi_gain","crit"],"thiet-khoi":["def","hp","hp_pct","crit","atk"],"thiet-gioi":["crit","crit_dmg","atk","atk_pct","def"],"linh-ngoc-gioi":["crit","crit_dmg","qi_gain","hp_pct","cdr"],"kim-luan":["atk","atk_pct","cdr","crit"],"tran-yeu-thap":["hp","hp_pct","def","cdr"],"hoa-hon-linh":["atk_pct","crit_dmg","cdr","qi_gain"],"xich-diem-giap":["hp","hp_pct","def","atk_pct"],"xich-diem-hai":["speed","atk","crit"],"xich-diem-quan":["crit","atk","atk_pct"],"xich-diem-gioi":["crit","crit_dmg","atk_pct"],"xich-diem-boi":["atk_pct","crit_dmg","qi_gain"],"han-bang-giap":["hp","hp_pct","def","cdr"],"han-bang-hai":["speed","def","hp"],"han-bang-quan":["def","hp","hp_pct"],"han-bang-gioi":["crit","cdr","hp_pct"],"han-bang-boi":["hp_pct","def","qi_gain"],"hac-phong-giap":["hp","speed","cdr","atk_pct"],"hac-phong-hai":["speed","cdr","crit"],"hac-phong-quan":["crit","cdr","speed"],"hac-phong-gioi":["crit","crit_dmg","cdr"],"hac-phong-boi":["cdr","atk_pct","qi_gain"],"thanh-moc-bao":["hp","hp_pct","def","qi_gain"],"thanh-moc-hai":["speed","hp_pct","def"],"thanh-moc-quan":["hp","hp_pct","qi_gain"],"thanh-moc-gioi":["crit","crit_dmg","hp_pct"],"thanh-moc-boi":["qi_gain","hp_pct","def"],"kim-cang-giap":["def","hp_pct","atk_pct"],"kim-cang-hai":["speed","atk_pct","crit"],"kim-cang-quan":["crit","crit_dmg","atk_pct"],"kim-cang-gioi":["crit","crit_dmg","atk_pct"],"kim-cang-boi":["atk_pct","crit_dmg","cdr"],"hau-tho-giap":["hp","def","hp_pct"],"hau-tho-hai":["def","speed","hp_pct"],"hau-tho-quan":["def","hp","hp_pct"],"hau-tho-gioi":["hp_pct","def","crit"],"hau-tho-boi":["def","hp_pct","qi_gain"],"dao-van-binh":["atk","atk_pct","crit","crit_dmg","cdr"],"dao-van-quan":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-bao":["hp","hp_pct","def","atk_pct"],"dao-van-boi":["atk_pct","crit_dmg","cdr","qi_gain"],"dao-van-hai":["speed","crit","cdr","atk_pct"],"dao-van-gioi":["crit","crit_dmg","atk_pct","hp_pct"],"dao-van-an":["atk","atk_pct","cdr","crit"],"thai-hu-giap":["hp","hp_pct","cdr","atk_pct"],"thai-hu-hai":["speed","cdr","crit"],"thai-hu-quan":["crit","cdr","atk_pct"],"thai-hu-gioi":["crit","crit_dmg","atk_pct"],"thai-hu-boi":["cdr","atk_pct","qi_gain"]},"cuong":{"max":20,"iron":[1,2,3,4,5,6,8,10,12,15,18,21,25,30,36,43,51,61,73,87],"stones":[0,0,0,0,1,1,2,2,3,4,5,6,7,8,9,11,13,15,17,20],"coins":[0,0,0,0,0,0,0,0,0,0,2000,2700,3600,4900,6600,8900,12000,16200,21900,29500],"rate":[1,1,0.95,0.85,0.75,0.65,0.55,0.45,0.35,0.25,0.22,0.2,0.18,0.16,0.14,0.12,0.11,0.1,0.09,0.08],"drop_from":7,"drop_chance":0.5,"open":{"base":10,"from_realm":2,"per_realm":2}},"he":["moc","hoa","thuy","kim","tho"],"doi_he":{"mat":"dao-van-thach","n":1},"ngoc":{"types":["hong-ngoc","lam-ngoc","hoang-ngoc","luc-ngoc"],"max":20,"merge":3,"phi":[30,2.5],"lo":{"max_lv":4,"toc_phut":6,"tran":150},"truyen":[[3,"hong-ngoc:5"],[4,"lam-ngoc:5"],[6,"hoang-ngoc:5"],[10,"luc-ngoc:5"]],"zalo":5},"pb_max":20,"luyen":{"base":3,"r":1.35,"mat":"manh-phap-bao","bases":["kim-luan","tran-yeu-thap","hoa-hon-linh","dao-van-an"]}}'::jsonb) on conflict (k) do update set v = excluded.v;

-- Phần được ký: thêm ô khảm, bậc pháp bảo
create or replace function public.p2d_ky_phan(p_mon jsonb) returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key, e.value), '{}'::jsonb)
    from jsonb_each(case when jsonb_typeof(p_mon) = 'object' then p_mon else '{}'::jsonb end) e
   where e.key = any (array['uid', 'base', 'rarity', 'lvl', 'main', 'lines', 'plus', 'cap', 'el', 'wt', 'dv', 'set', 'sockets', 'pb'])
$$;

-- Khoá ngọc hợp lệ: "loại:cấp", loại trong data/items.json gems, cấp 1..max
create or replace function public.p2d_ngoc_dung(p text) returns boolean language sql stable set search_path = ''
as $$
  select coalesce(p ~ '^[a-z-]{1,30}:[0-9]{1,2}$'
    and (select (v -> 'ngoc' -> 'types') ? split_part(p, ':', 1) and split_part(p, ':', 2)::int between 1 and (v -> 'ngoc' ->> 'max')::int
           from public.p2d_ky_cfg where k = 'cfg'), false)
$$;

-- Số viên của một khoá trong túi ngọc (không phải số nguyên không âm thì 0)
create or replace function public.p2d_ngoc_so(p_gems jsonb, p_k text) returns numeric language sql immutable set search_path = ''
as $$ select case when jsonb_typeof(p_gems -> p_k) = 'number' and (p_gems ->> p_k)::numeric >= 0 then floor((p_gems ->> p_k)::numeric) else 0 end $$;

-- Đếm ngọc đang khảm trong cả túi: { "loại:cấp": số }
create or replace function public.p2d_ngoc_kham(p_bag jsonb) returns jsonb language sql immutable set search_path = ''
as $$
  select coalesce(jsonb_object_agg(x.k, x.n), '{}'::jsonb) from (
    select s #>> '{}' as k, count(*) as n
      from jsonb_array_elements(case when jsonb_typeof(p_bag) = 'array' then p_bag else '[]'::jsonb end) it,
           jsonb_array_elements(case when jsonb_typeof(it -> 'sockets') = 'array' then it -> 'sockets' else '[]'::jsonb end) s
     where jsonb_typeof(s) = 'string' group by 1) x
$$;

-- Cộng / trừ n viên vào túi ngọc của bản lưu (hết thì xoá khoá, như máy khách)
create or replace function public.p2d_ngoc_cong(p_data jsonb, p_k text, p_n numeric) returns jsonb language sql immutable set search_path = ''
as $$
  select jsonb_set(p_data, '{gems}', case when public.p2d_ngoc_so(g, p_k) + p_n > 0 then g || jsonb_build_object(p_k, public.p2d_ngoc_so(g, p_k) + p_n) else g - p_k end)
    from (select case when jsonb_typeof(p_data -> 'gems') = 'object' then p_data -> 'gems' else '{}'::jsonb end as g) x
$$;

-- Kiểm túi mới so với túi trên máy chủ (p2d_luu gọi). Trả { bag, ly_do, sua (món máy khách phải lấy lại), chi_tiet }.
-- Như bản giai đoạn 1, thêm: ô khảm và bậc pháp bảo theo máy chủ, món mới không mang ngọc.
create or replace function public.p2d_kiem_ky(p_cu jsonb, p_moi jsonb) returns jsonb language plpgsql volatile security definer set search_path = ''
as $$
declare
  v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg');
  v_ky text[] := array['uid', 'base', 'rarity', 'lvl', 'main', 'lines', 'plus', 'cap', 'el', 'wt', 'dv', 'set', 'sockets', 'pb'];
  v_map jsonb; v_ra jsonb := '[]'; v_sua jsonb := '[]'; v_ct jsonb := '[]'; v_ly text[] := '{}';
  v_g jsonb; v_n jsonb; v_o jsonb; v_o2 jsonb; v_pn jsonb; v_po jsonb; v_doi_mau boolean; v_kh text;
  v_sk jsonb; v_skn jsonb; v_pad jsonb; v_q numeric; v_qo numeric;
begin
  if jsonb_typeof(p_moi) is distinct from 'array' then
    return jsonb_build_object('bag', p_moi, 'ly_do', '[]'::jsonb, 'sua', '[]'::jsonb, 'chi_tiet', '[]'::jsonb);
  end if;
  select coalesce(jsonb_object_agg(o ->> 'uid', o), '{}'::jsonb) into v_map
    from jsonb_array_elements(case when jsonb_typeof(p_cu) = 'array' then p_cu else '[]'::jsonb end) o
   where jsonb_typeof(o) = 'object' and jsonb_typeof(o -> 'uid') = 'number';
  for v_g in select x.e from jsonb_array_elements(p_moi) with ordinality x(e, i) order by x.i loop
    v_n := v_g;
    v_o := case when jsonb_typeof(v_n) = 'object' then v_map -> (v_n ->> 'uid') end;
    if jsonb_typeof(v_n) is distinct from 'object' then
      null;   -- p2d_luu đã chặn món không phải object
    elsif v_o is null then
      -- Món mới (đồ rơi): không mang ngọc (ngọc khảm tính vào túi ngọc ở p2d_kiem_ngoc); hợp lệ thì ký, không thì để p2d_luu ghi do_sai_chi_so
      v_n := v_n - 'sig' - 'free';
      if jsonb_typeof(v_n -> 'sockets') = 'array' and exists (select 1 from jsonb_array_elements(v_n -> 'sockets') s where s <> 'null'::jsonb) then
        v_n := jsonb_set(v_n, '{sockets}', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from jsonb_array_elements(v_n -> 'sockets')));
        v_sua := v_sua || jsonb_build_array(v_n);
      end if;
      if public.p2d_mon_hop_le(v_n) and public.p2d_lo_hop_le(v_n) then v_n := public.p2d_ky_dong(v_n); end if;
    elsif (v_n - 'sig') = (v_o - 'sig') then
      v_n := v_o;   -- không đổi gì (phần lớn các lần lưu): giữ y bản máy chủ, không tính chữ ký
    else
      -- ô khảm theo máy chủ; máy khách chỉ được thêm ô trống ở cuối khi đủ luật lỗ (ô thứ 4)
      v_sk := case when jsonb_typeof(v_o -> 'sockets') = 'array' then v_o -> 'sockets' end;
      v_skn := v_n -> 'sockets'; v_pad := v_sk;
      if v_skn is distinct from v_sk then
        if jsonb_typeof(v_skn) = 'array' and jsonb_array_length(v_skn) > coalesce(jsonb_array_length(v_sk), 0) and jsonb_array_length(v_skn) <= 6 then
          v_pad := coalesce(v_sk, '[]'::jsonb);
          while jsonb_array_length(v_pad) < jsonb_array_length(v_skn) loop v_pad := v_pad || 'null'::jsonb; end loop;
          if not public.p2d_lo_hop_le(v_o || jsonb_build_object('sockets', v_pad)) then v_pad := v_sk; end if;
        end if;
        if v_skn is distinct from v_pad then
          -- tự khảm / gỡ ở máy (bản game cũ) hoặc ô sai luật: trả ô máy chủ; ngọc trong túi ngọc p2d_kiem_ngoc tính lại
          v_ly := array_append(v_ly, case when public.p2d_lo_hop_le(v_n) then 'ngoc_cu' else 'ngoc_sai' end);
        end if;
        v_n := case when v_pad is null then v_n - 'sockets' else v_n || jsonb_build_object('sockets', v_pad) end;
      end if;
      v_o2 := case when v_pad is distinct from v_sk then v_o || jsonb_build_object('sockets', v_pad) else v_o end;
      -- bậc luyện pháp bảo theo máy chủ (luyện ở máy của bản game cũ: tăng 1..3 bậc thì chỉ ghi, không cộng điểm)
      if (v_n -> 'pb') is distinct from (v_o -> 'pb') then
        v_q := public.p2d_ky_so(v_n -> 'pb'); v_qo := coalesce(public.p2d_ky_so(v_o -> 'pb'), 0);
        v_ly := array_append(v_ly, case when v_q > v_qo and v_q <= v_qo + 3 and v_q <= (v_cfg ->> 'pb_max')::numeric then 'sua_do_cu' else 'sua_do' end);
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('uid', v_n -> 'uid', 'gui', jsonb_build_object('pb', v_n -> 'pb'), 'may_chu', jsonb_build_object('pb', v_o -> 'pb'))); end if;
        v_n := case when v_o ? 'pb' then v_n || jsonb_build_object('pb', v_o -> 'pb') else v_n - 'pb' end;
      end if;
      -- trần dòng, hệ do máy chủ quyết (như giai đoạn 1)
      if v_o ? 'cap' then v_n := v_n || jsonb_build_object('cap', v_o -> 'cap');
      elsif v_n ? 'cap' then
        v_n := v_n || jsonb_build_object('cap', greatest(jsonb_array_length(case when jsonb_typeof(v_o -> 'lines') = 'array' then v_o -> 'lines' else '[]'::jsonb end),
          public.p2d_ky_boc(array(select x::numeric from jsonb_array_elements_text(v_cfg -> 'cap_w') with ordinality a(x, i) order by i)) + 1));
      end if;
      if coalesce(v_o ->> 'el', '') <> '' then v_n := v_n || jsonb_build_object('el', v_o -> 'el');
      elsif v_n ? 'el' then v_n := v_n || jsonb_build_object('el', v_cfg -> 'he' -> ((v_n ->> 'uid')::numeric % jsonb_array_length(v_cfg -> 'he'))::integer);
      end if;
      v_pn := public.p2d_ky_phan(v_n); v_po := public.p2d_ky_phan(v_o2); v_doi_mau := false;
      if v_pn = v_po then
        null;
      elsif public.p2d_ky_cu_hop_le(v_o2, v_n) then
        v_doi_mau := (v_pn -> 'lines') is distinct from (v_po -> 'lines')
          and exists (select 1 from jsonb_array_elements(v_po -> 'lines') l where public.p2d_ky_so(l -> 't') is null);
      else
        v_ly := array_append(v_ly, case when public.p2d_ky_nhe(v_o2, v_n) then 'sua_do_cu' else 'sua_do' end);
        if jsonb_array_length(v_ct) < 5 then v_ct := v_ct || jsonb_build_array(jsonb_build_object('uid', v_n -> 'uid', 'gui', v_pn, 'may_chu', v_po)); end if;
        v_n := (v_n - v_ky) || v_po; v_pn := v_po;
      end if;
      foreach v_kh in array array['free', 'rr', 'rrDay'] loop
        v_n := case when v_o ? v_kh then v_n || jsonb_build_object(v_kh, v_o -> v_kh) else v_n - v_kh end;
      end loop;
      if v_doi_mau then v_n := v_n || jsonb_build_object('free', coalesce(public.p2d_ky_so(v_o -> 'free'), 0) + (v_cfg -> 'tay' ->> 'free')::numeric); end if;
      if v_pn = public.p2d_ky_phan(v_o) then v_n := case when v_o ? 'sig' then v_n || jsonb_build_object('sig', v_o -> 'sig') else v_n - 'sig' end;
      else v_n := public.p2d_ky_dong(v_n); end if;   -- đồ cũ vừa được game sửa đúng luật / mở ô thứ 4: ký bản mới
      if (v_n - 'sig') <> (v_g - 'sig') then v_sua := v_sua || jsonb_build_array(v_n); end if;
    end if;
    v_ra := v_ra || jsonb_build_array(v_n);
  end loop;
  return jsonb_build_object('bag', v_ra, 'ly_do', to_jsonb(array(select distinct unnest(v_ly))), 'sua', v_sua, 'chi_tiet', v_ct);
end;
$$;

-- Kiểm túi ngọc (p2d_luu gọi sau p2d_kiem_ky). p_cu: bản lưu máy chủ; p_gui: túi máy khách gửi (trước p2d_kiem_ky);
-- p_moi: bản lưu mới (túi đã qua p2d_kiem_ky, túi ngọc máy khách gửi); p_dt: giây còn liên lạc; p_tk_moi: lần lưu đầu.
-- Trả { gems (túi ngọc nhận), ky (data.kyNgoc mới), ly_do, sua (true khi túi ngọc khác bản máy khách) }.
create or replace function public.p2d_kiem_ngoc(p_cu jsonb, p_gui jsonb, p_moi jsonb, p_dt numeric, p_tk_moi boolean) returns jsonb
language plpgsql stable set search_path = ''
as $$
declare
  v_c jsonb := (select v -> 'ngoc' from public.p2d_ky_cfg where k = 'cfg');
  v_merge integer := (v_c ->> 'merge')::integer; v_max integer := (v_c ->> 'max')::integer;
  v_oi jsonb := case when jsonb_typeof(p_cu -> 'gems') = 'object' then p_cu -> 'gems' else '{}'::jsonb end;
  v_ni jsonb := p_moi -> 'gems';
  v_ky jsonb := case when jsonb_typeof(p_cu -> 'kyNgoc') = 'object' then p_cu -> 'kyNgoc' else '{}'::jsonb end;
  v_ob jsonb; v_cb jsonb; v_fb jsonb; v_t jsonb := '{}'; v_cc jsonb := '{}'; v_e jsonb := '{}'; v_ra jsonb := '{}'; v_tr jsonb;
  v_xo numeric; v_ly text[] := '{}'; v_k text; v_ty text; v_lv integer; v_n numeric; v_m numeric; v_carry numeric; v_cost numeric;
  v_s0 numeric := coalesce(public.p2d_ky_so(p_cu -> 'step'), 0); v_s1 numeric := coalesce(public.p2d_ky_so(p_moi -> 'step'), 0);
  v_x jsonb; v_lo boolean := false; v_cu boolean := false;
begin
  v_xo := least((v_c -> 'lo' ->> 'tran')::numeric, coalesce(public.p2d_ky_so(v_ky -> 'xo'), (v_c -> 'lo' ->> 'tran')::numeric)
                + (v_c -> 'lo' ->> 'toc_phut')::numeric / 60 * greatest(coalesce(p_dt, 0), 0));
  v_tr := case when jsonb_typeof(v_ky -> 'tr') = 'array' then v_ky -> 'tr' else '[]'::jsonb end;
  if coalesce(v_ky ->> 'zalo', '') <> 'true' and coalesce(p_cu ->> 'quaZalo', '') = 'true' then v_ky := v_ky || '{"zalo": true}'; end if;
  if jsonb_typeof(v_ni) is distinct from 'object' then   -- máy khách không gửi túi ngọc: giữ bản máy chủ
    return jsonb_build_object('gems', v_oi, 'ky', v_ky || jsonb_build_object('xo', round(v_xo, 2), 'tr', v_tr), 'ly_do', '[]'::jsonb, 'sua', v_oi <> '{}'::jsonb);
  end if;
  v_ob := public.p2d_ngoc_kham(p_cu -> 'bag'); v_cb := public.p2d_ngoc_kham(p_gui); v_fb := public.p2d_ngoc_kham(p_moi -> 'bag');
  if v_ni = v_oi and v_cb = v_ob and v_fb = v_cb then   -- không đổi gì (phần lớn các lần lưu)
    return jsonb_build_object('gems', v_ni, 'ky', v_ky || jsonb_build_object('xo', round(v_xo, 2), 'tr', v_tr), 'ly_do', '[]'::jsonb, 'sua', false);
  end if;
  -- tổng cũ (túi + khảm, bản máy chủ), tổng máy khách gửi, phần lố từng khoá
  for v_k in select distinct x from (select jsonb_object_keys(v_oi) x union all select jsonb_object_keys(v_ni) union all select jsonb_object_keys(v_ob)
                                     union all select jsonb_object_keys(v_cb) union all select jsonb_object_keys(v_fb)) a loop
    v_t := v_t || jsonb_build_object(v_k, public.p2d_ngoc_so(v_oi, v_k) + public.p2d_ngoc_so(v_ob, v_k));
    v_cc := v_cc || jsonb_build_object(v_k, public.p2d_ngoc_so(v_ni, v_k) + public.p2d_ngoc_so(v_cb, v_k));
    v_e := v_e || jsonb_build_object(v_k, greatest(0, (v_cc ->> v_k)::numeric - (v_t ->> v_k)::numeric));
  end loop;
  -- quà ngọc cốt truyện: mỗi bước một lần, khi bước đó vừa tới (lần lưu đầu: mọi bước đã qua)
  for v_x in select jsonb_array_elements(v_c -> 'truyen') loop
    v_k := v_x ->> 1; v_n := (v_x ->> 0)::numeric;
    if coalesce((v_e ->> v_k)::numeric, 0) > 0 and not (v_tr @> jsonb_build_array(v_n)) and v_s1 >= v_n and (p_tk_moi or v_s0 <= v_n) then
      v_e := v_e || jsonb_build_object(v_k, (v_e ->> v_k)::numeric - 1); v_tr := v_tr || jsonb_build_array(v_n);
    end if;
  end loop;
  -- quà Zalo: một viên cấp zalo, loại người chơi chọn, một lần
  if coalesce(v_ky ->> 'zalo', '') <> 'true' and coalesce(p_moi ->> 'quaZalo', '') = 'true' then
    v_ky := v_ky || '{"zalo": true}';
    select x.key into v_k from jsonb_each_text(v_e) x where (x.value)::numeric > 0 and x.key like '%:' || (v_c ->> 'zalo') and public.p2d_ngoc_dung(x.key) limit 1;
    if v_k is not null then v_e := v_e || jsonb_build_object(v_k, (v_e ->> v_k)::numeric - 1); end if;
  end if;
  -- ghép ở máy của bản game cũ: ngọc cấp dưới máy khách không còn (so với bản cũ) đổi 3 → 1 lên cấp trên, nối tiếp từng cấp
  for v_ty in select jsonb_array_elements_text(v_c -> 'types') loop
    v_carry := 0;
    for v_lv in 1 .. v_max loop
      v_k := v_ty || ':' || v_lv;
      v_n := coalesce((v_e ->> v_k)::numeric, 0);
      if v_n > 0 and v_carry > 0 then
        v_m := least(v_n, v_carry); v_e := v_e || jsonb_build_object(v_k, v_n - v_m); v_carry := v_carry - v_m; v_cu := true;
      end if;
      v_carry := floor((v_carry + greatest(0, coalesce((v_t ->> v_k)::numeric, 0) - coalesce((v_cc ->> v_k)::numeric, 0))) / v_merge);
    end loop;
  end loop;
  -- thùng ngọc rơi: cấp 1..max_lv, viên cấp n tốn merge^(n−1) viên cấp 1
  for v_lv in 1 .. least((v_c -> 'lo' ->> 'max_lv')::integer, v_max) loop
    v_cost := power(v_merge, v_lv - 1);
    for v_k in select x.key from jsonb_each_text(v_e) x where (x.value)::numeric > 0 and split_part(x.key, ':', 2) = v_lv::text and public.p2d_ngoc_dung(x.key) order by x.key loop
      v_m := least((v_e ->> v_k)::numeric, floor(v_xo / v_cost));
      v_e := v_e || jsonb_build_object(v_k, (v_e ->> v_k)::numeric - v_m); v_xo := v_xo - v_m * v_cost;
    end loop;
  end loop;
  -- phần còn lố: cắt. Quà cốt truyện phát lại khi mở lại game ở đúng bước đó (story.js) hoặc lần lưu đầu: chỉ ghi
  for v_k in select x.key from jsonb_each_text(v_e) x where (x.value)::numeric > 0 loop
    if p_tk_moi or exists (select 1 from jsonb_array_elements(v_c -> 'truyen') t where t ->> 1 = v_k and (t ->> 0)::numeric between v_s0 and v_s1) then v_cu := true;
    else v_lo := true; end if;
  end loop;
  if v_lo then v_ly := array_append(v_ly, 'ngoc_lo'); end if;
  if v_cu then v_ly := array_append(v_ly, 'ngoc_cu'); end if;
  -- túi ngọc nhận = tổng được nhận − đang khảm (túi sau p2d_kiem_ky)
  for v_k in select x from jsonb_object_keys(v_cc) x loop
    v_n := (v_cc ->> v_k)::numeric - (v_e ->> v_k)::numeric - public.p2d_ngoc_so(v_fb, v_k);
    if v_n > 0 then v_ra := v_ra || jsonb_build_object(v_k, v_n); end if;
  end loop;
  return jsonb_build_object('gems', v_ra, 'ky', v_ky || jsonb_build_object('xo', round(v_xo, 2), 'tr', v_tr), 'ly_do', to_jsonb(v_ly),
    'sua', v_ra <> coalesce((select jsonb_object_agg(x.key, x.value) from jsonb_each(v_ni) x where jsonb_typeof(x.value) = 'number' and (x.value #>> '{}')::numeric > 0), '{}'::jsonb));
end;
$$;

-- Lưu bản lưu sau một lệnh ngọc / pháp bảo (đã khoá dòng), trả phien_ban mới
create or replace function public.p2d_ky_ghi(p_me uuid, p_data jsonb) returns integer language plpgsql volatile set search_path = ''
as $$
declare v_pb integer;
begin
  update public.p2d_nhan_vat set data = p_data, phien_ban = phien_ban + 1, updated_at = now() where user_id = p_me returning phien_ban into v_pb;
  return v_pb;
end;
$$;

-- Khảm ngọc (src/game/items.js socket): lấy 1 viên từ túi ngọc vào ô p_o (0, 1 ...); ô đang có ngọc thì viên cũ về túi
create or replace function public.p2d_kham_ngoc(p_uid bigint, p_o integer, p_ngoc text) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_cu text; v_doi jsonb;
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  if jsonb_typeof(v_it -> 'sockets') is distinct from 'array' or p_o is null or p_o < 0 or p_o >= jsonb_array_length(v_it -> 'sockets') then raise exception 'o_sai' using errcode = '22023'; end if;
  if not public.p2d_ngoc_dung(p_ngoc) then raise exception 'ngoc_sai' using errcode = '22023'; end if;
  if public.p2d_ngoc_so(v_nv.data -> 'gems', p_ngoc) < 1 then raise exception 'chua_co_ngoc' using errcode = '22023'; end if;
  v_cu := case when jsonb_typeof(v_it -> 'sockets' -> p_o) = 'string' then v_it -> 'sockets' ->> p_o end;
  v_doi := jsonb_build_object(p_ngoc, -1);
  if v_cu is not null and public.p2d_ngoc_dung(v_cu) then
    v_nv.data := public.p2d_ngoc_cong(v_nv.data, v_cu, 1);
    v_doi := case when v_cu = p_ngoc then '{}'::jsonb else v_doi || jsonb_build_object(v_cu, 1) end;
  end if;
  v_nv.data := public.p2d_ngoc_cong(v_nv.data, p_ngoc, -1);
  v_it := public.p2d_ky_dong(jsonb_set(v_it, array['sockets', p_o::text], to_jsonb(p_ngoc)));
  v_nv.data := jsonb_set(v_nv.data, array['bag', v_x ->> 'i'], v_it);
  return jsonb_build_object('mon', v_it, 'doi', v_doi, 'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data), 'tru', jsonb_build_object('coins', 0, 'mats', '{}'::jsonb));
end;
$$;

-- Gỡ ngọc (src/game/items.js unsocket): viên ở ô p_o về túi ngọc
create or replace function public.p2d_go_ngoc(p_uid bigint, p_o integer) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_cu text; v_doi jsonb := '{}';
begin
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  if jsonb_typeof(v_it -> 'sockets') is distinct from 'array' or p_o is null or p_o < 0 or p_o >= jsonb_array_length(v_it -> 'sockets') then raise exception 'o_sai' using errcode = '22023'; end if;
  v_cu := case when jsonb_typeof(v_it -> 'sockets' -> p_o) = 'string' then v_it -> 'sockets' ->> p_o end;
  if v_cu is null then raise exception 'trong' using errcode = '22023'; end if;
  if public.p2d_ngoc_dung(v_cu) then v_nv.data := public.p2d_ngoc_cong(v_nv.data, v_cu, 1); v_doi := jsonb_build_object(v_cu, 1); end if;
  v_it := public.p2d_ky_dong(jsonb_set(v_it, array['sockets', p_o::text], 'null'::jsonb));
  v_nv.data := jsonb_set(v_nv.data, array['bag', v_x ->> 'i'], v_it);
  return jsonb_build_object('mon', v_it, 'doi', v_doi, 'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data), 'tru', jsonb_build_object('coins', 0, 'mats', '{}'::jsonb));
end;
$$;

-- Ghép ngọc (src/game/items.js mergeGems): merge viên cùng loại cùng cấp → 1 viên cấp trên, phí Linh Thạch base × r^(cấp − 1);
-- p_giu: Linh Thạch luôn chừa lại (tự hành); p_lan: ghép tối đa bấy nhiêu lần (nút "Ghép hết"). Trả số lần đã ghép.
create or replace function public.p2d_ghep_ngoc(p_ngoc text, p_giu numeric default 0, p_lan integer default 1) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_c jsonb := (select v -> 'ngoc' from public.p2d_ky_cfg where k = 'cfg');
  v_nv public.p2d_nhan_vat%rowtype; v_lv integer; v_up text; v_fee numeric; v_merge integer := (v_c ->> 'merge')::integer;
  v_co numeric; v_lt numeric; v_n integer := 0;
begin
  if not public.p2d_ngoc_dung(p_ngoc) then raise exception 'ngoc_sai' using errcode = '22023'; end if;
  v_lv := split_part(p_ngoc, ':', 2)::integer;
  if v_lv >= (v_c ->> 'max')::integer then raise exception 'toi_da' using errcode = '22023'; end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_up := split_part(p_ngoc, ':', 1) || ':' || (v_lv + 1);
  v_fee := round((v_c -> 'phi' ->> 0)::numeric * power((v_c -> 'phi' ->> 1)::numeric, v_lv - 1));
  v_co := public.p2d_ngoc_so(v_nv.data -> 'gems', p_ngoc);
  v_lt := coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0);
  while v_n < least(greatest(coalesce(p_lan, 1), 1), 1000) and v_co - v_merge * (v_n + 1) >= 0 and v_lt - v_fee * (v_n + 1) >= greatest(coalesce(p_giu, 0), 0) loop
    v_n := v_n + 1;
  end loop;
  if v_n = 0 then raise exception 'thieu' using errcode = '22023'; end if;
  v_nv.data := public.p2d_ngoc_cong(public.p2d_ngoc_cong(v_nv.data, p_ngoc, -v_merge * v_n), v_up, v_n);
  v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_fee * v_n));
  return jsonb_build_object('lan', v_n, 'ngoc', v_up, 'doi', jsonb_build_object(p_ngoc, -v_merge * v_n, v_up, v_n),
    'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data), 'tru', jsonb_build_object('coins', v_fee * v_n, 'mats', '{}'::jsonb));
end;
$$;

-- Luyện pháp bảo một bậc (src/game/refine.js refine): tốn ceil(base × r^bậc) mảnh pháp bảo, tối đa pb_max bậc
create or replace function public.p2d_luyen_phap_bao(p_uid bigint) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := (select v from public.p2d_ky_cfg where k = 'cfg'); v_l jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_x jsonb; v_it jsonb; v_n integer; v_need numeric; v_mat text;
begin
  v_l := v_cfg -> 'luyen'; v_mat := v_l ->> 'mat';
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_x := public.p2d_ky_lay(v_nv.data, p_uid); v_it := v_x -> 'mon';
  if not ((v_l -> 'bases') ? coalesce(v_it ->> 'base', '')) then raise exception 'khong_phai' using errcode = '22023'; end if;
  v_n := greatest(coalesce(public.p2d_ky_so(v_it -> 'pb'), 0), 0)::integer;
  if v_n >= (v_cfg ->> 'pb_max')::integer then raise exception 'toi_da' using errcode = '22023'; end if;
  v_need := ceil((v_l ->> 'base')::numeric * power((v_l ->> 'r')::numeric, v_n) - 0.000000001);
  if coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> v_mat), 0) < v_need then raise exception 'thieu' using errcode = '22023'; end if;
  v_nv.data := jsonb_set(v_nv.data, array['mats', v_mat], to_jsonb(public.p2d_ky_so(v_nv.data -> 'mats' -> v_mat) - v_need));
  v_it := public.p2d_ky_dong(v_it || jsonb_build_object('pb', v_n + 1));
  v_nv.data := jsonb_set(v_nv.data, array['bag', v_x ->> 'i'], v_it);
  return jsonb_build_object('mon', v_it, 'phien_ban', public.p2d_ky_ghi(v_me, v_nv.data), 'tru', jsonb_build_object('coins', 0, 'mats', jsonb_build_object(v_mat, v_need)));
end;
$$;

revoke all on function public.p2d_ngoc_dung(text), public.p2d_ngoc_so(jsonb, text), public.p2d_ngoc_kham(jsonb), public.p2d_ngoc_cong(jsonb, text, numeric),
  public.p2d_kiem_ky(jsonb, jsonb), public.p2d_kiem_ngoc(jsonb, jsonb, jsonb, numeric, boolean), public.p2d_ky_ghi(uuid, jsonb), public.p2d_ky_phan(jsonb)
  from public, anon, authenticated;
revoke all on function public.p2d_kham_ngoc(bigint, integer, text), public.p2d_go_ngoc(bigint, integer), public.p2d_ghep_ngoc(text, numeric, integer),
  public.p2d_luyen_phap_bao(bigint) from public, anon;
grant execute on function public.p2d_kham_ngoc(bigint, integer, text), public.p2d_go_ngoc(bigint, integer), public.p2d_ghep_ngoc(text, numeric, integer),
  public.p2d_luyen_phap_bao(bigint) to authenticated;

-- Vá p2d_luu (bản đang chạy = 20261031030000 + vá 20261104030000, 20261104100000, 20261105010000): giữ túi máy khách gửi
-- trước p2d_kiem_ky (biến v_bag, chỉ dùng cho đồ đang rao ở đoạn trên), rồi gọi p2d_kiem_ngoc ngay sau p2d_kiem_ky.
do $$
declare d text := pg_get_functiondef('public.p2d_luu(jsonb,integer)'::regprocedure);
  khai text := '  v_tao timestamptz; v_nang boolean := false; v_on numeric;';
  neo text := '  v_bo := public.p2d_kiem_ky(v_cu.data -> ''bag'', v_data -> ''bag'');';
  neo2 text := '  if jsonb_array_length(v_bo -> ''sua'') > 0 then v_sua := v_sua || jsonb_build_object(''mon'', v_bo -> ''sua''); end if;';
  a text := 'array_length(array_remove(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), ''sua_do_cu''), 1)';
  b text := 'array_length(array_remove(array_remove(array_remove(array_remove(v_ly_do, ''do_da_rao''), ''do_hiem''), ''sua_do_cu''), ''ngoc_cu''), 1)';
  x text;
begin
  if position('p2d_kiem_ngoc' in d) > 0 then return; end if;
  foreach x in array array[khai, neo, neo2, a] loop
    if (length(d) - length(replace(d, x, ''))) / length(x) <> 1 then raise exception 'p2d_luu da doi, khong tim thay cho va: %', left(x, 60); end if;
  end loop;
  d := replace(d, khai, khai || ' v_ngoc jsonb;');
  d := replace(d, neo, '  v_bag := v_data -> ''bag'';   -- túi máy khách gửi, cho p2d_kiem_ngoc (20261105020000_p2d_ky_ngoc)' || chr(10) || neo);
  d := replace(d, neo2, neo2 || chr(10) ||
    '  -- Túi ngọc (20261105020000_p2d_ky_ngoc): tổng ngọc chỉ tăng từ nguồn hợp lệ, phần lố trả máy khách ở sua.gems' || chr(10) ||
    '  v_ngoc := public.p2d_kiem_ngoc(v_cu.data, v_bag, v_data, v_dt, v_moi);' || chr(10) ||
    '  v_data := jsonb_set(v_data, ''{gems}'', v_ngoc -> ''gems'') || jsonb_build_object(''kyNgoc'', v_ngoc -> ''ky'');' || chr(10) ||
    '  v_ly_do := v_ly_do || array(select jsonb_array_elements_text(v_ngoc -> ''ly_do''));' || chr(10) ||
    '  if (v_ngoc ->> ''sua'')::boolean then v_sua := v_sua || jsonb_build_object(''gems'', v_ngoc -> ''gems''); end if;');
  execute replace(d, a, b);   -- 'ngoc_cu' (bản game cũ tự khảm / ghép ở máy) chỉ ghi, không cộng điểm nghi vấn
end;
$$;

-- Vá các hàm trả / nhận ngọc: khoá ngọc theo p2d_ky_cfg (loại, cấp 1..max) thay biểu thức cố định; chợ ký lại món sau khi tháo ngọc
do $$
declare
  re text := ' ~ ''^(hong|lam|hoang|luc)-ngoc:([1-9]|1[0-9]|20)$''';
  f text; d text; neo text; moi text;
begin
  foreach f in array array['public.p2d_rao_ban(text,jsonb,integer)', 'public.p2d_dl_tang(text,jsonb)', 'public.p2d_dl_tang2(text,jsonb)', 'public.p2d_nhan_thu_moi(bigint[],bigint)'] loop
    continue when to_regprocedure(f) is null;
    d := pg_get_functiondef(f::regprocedure);
    continue when position('p2d_ngoc_dung' in d) > 0;
    if f like '%nhan_thu_moi%' then neo := 'coalesce(v_gk, '''')' || re; moi := 'public.p2d_ngoc_dung(coalesce(v_gk, ''''))';
    else neo := 'where s' || re; moi := 'where public.p2d_ngoc_dung(s)'; end if;
    if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception '% da doi, khong tim thay cho va', f; end if;
    d := replace(d, neo, moi);
    if f like '%rao_ban%' then
      neo := '      v_mon := jsonb_set(v_mon, ''{sockets}'', (select coalesce(jsonb_agg(''null''::jsonb), ''[]''::jsonb) from jsonb_array_elements(v_mon -> ''sockets'')));';
      if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_rao_ban da doi, khong tim thay cho va (ky)'; end if;
      d := replace(d, neo, neo || chr(10) || '      v_mon := public.p2d_ky_dong(v_mon);   -- ô khảm nằm trong phần được ký (20261105020000_p2d_ky_ngoc)');
    end if;
    execute d;
  end loop;
end;
$$;

-- Ký lại một lần mọi món có chữ ký khác chữ ký mới (nay ký cả ô khảm, bậc pháp bảo): túi mọi nhân vật (không tăng phien_ban,
-- như giai đoạn 1), món đang rao chợ, món trong thư chưa nhận
update public.p2d_nhan_vat n
   set data = jsonb_set(n.data, '{bag}', (select coalesce(jsonb_agg(case when jsonb_typeof(it) = 'object' and it ->> 'sig' is distinct from public.p2d_ky_mon(it) then public.p2d_ky_dong(it) else it end order by x.i), '[]'::jsonb)
                                            from jsonb_array_elements(n.data -> 'bag') with ordinality x(it, i)))
 where jsonb_typeof(n.data -> 'bag') = 'array'
   and exists (select 1 from jsonb_array_elements(n.data -> 'bag') it where jsonb_typeof(it) = 'object' and it ->> 'sig' is distinct from public.p2d_ky_mon(it));
update public.p2d_cho set mon = public.p2d_ky_dong(mon) where loai = 'mon' and jsonb_typeof(mon) = 'object' and mon ->> 'sig' is distinct from public.p2d_ky_mon(mon);
update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{item}', public.p2d_ky_dong(noi_dung -> 'item'))
 where nhan_luc is null and jsonb_typeof(noi_dung -> 'item') = 'object' and noi_dung -> 'item' ->> 'sig' is distinct from public.p2d_ky_mon(noi_dung -> 'item');
update public.p2d_hom_thu set noi_dung = jsonb_set(noi_dung, '{sold}', public.p2d_ky_dong(noi_dung -> 'sold'))
 where nhan_luc is null and jsonb_typeof(noi_dung -> 'sold') = 'object' and noi_dung -> 'sold' ? 'uid' and noi_dung -> 'sold' ->> 'sig' is distinct from public.p2d_ky_mon(noi_dung -> 'sold');
