-- Mua nguyên liệu trên máy chủ (chủ dự án 12/11/2026 00:30–00:34: "mua thì tốn Linh Thạch, sao lại giới hạn người ta", "mình chỉ cần
-- kiểm soát tốt số lượng là được", giao em tự chọn cách hợp lý).
-- Trước: nút Mua nhanh và mua nguyên liệu ở Vạn Bảo Lâu cộng nguyên liệu trên điện thoại rồi lưu lên; p2d_luu không phân biệt mua với
-- hack nên tính vào trần nhận mỗi ngày (p2d_tran_ngay) và cắt phần vượt, Linh Thạch thì đã trừ (người chơi mất tiền, không có đồ).
-- Nay: p2d_nl_mua trừ Linh Thạch và cộng nguyên liệu ngay trên bản lưu máy chủ (biết chắc là mua), không tính vào trần ngày.
-- Giá máy chủ giữ ngay trong hàm (v_cfg, chép từ data/market.json → quick: gia = giá gốc mỗi cái, nhan = hệ số Mua nhanh);
-- p_nhanh = false: giá gốc như Vạn Bảo Lâu (data/shop.json items cùng giá gốc). Sửa giá ở data/ thì thêm migration thay hàm này.

create or replace function public.p2d_nl_mua(p_mua jsonb, p_nhanh boolean default true)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_me uuid := public.p2d_uid(); v_cfg jsonb := '{"nhan": 1.1, "gia": {"linh-thao": 5, "yeu-huyet": 12.5, "tinh-thiet": 17.5, "hoa-linh-chi": 45, "tay-luyen-thach": 40, "khoa-linh-thach": 400, "bi-kip-chieu": 60, "manh-phap-bao": 30, "linh-mach": 20, "linh-dau": 20, "hong-qua": 30, "kim-tieu": 45, "ngoc-lo-hoa": 60, "tu-van-sam": 120, "thai-hu-lien": 200, "linh-ngu": 15, "van-ngu": 30, "hoa-ly": 30, "bang-ngu": 30, "nguyet-ngu": 60, "kim-tu-ngu": 60, "nham-ngu": 60}}'::jsonb;
  v_nv public.p2d_nhan_vat%rowtype; v_k text; v_n jsonb; v_gia numeric := 0; v_lt numeric; v_pb integer; v_them jsonb := '{}'::jsonb;
begin
  if v_cfg is null then raise exception 'chua_cau_hinh' using errcode = '22023'; end if;
  if p_mua is null or jsonb_typeof(p_mua) <> 'object' or (select count(*) from jsonb_object_keys(p_mua)) not between 1 and 10 then
    raise exception 'du_lieu_sai' using errcode = '22023';
  end if;
  for v_k, v_n in select key, value from jsonb_each(p_mua) loop
    if jsonb_typeof(v_n) <> 'number' or (v_n #>> '{}')::numeric <> floor((v_n #>> '{}')::numeric) or (v_n #>> '{}')::numeric not between 1 and 999 then
      raise exception 'du_lieu_sai' using errcode = '22023';
    end if;
    if not (v_cfg -> 'gia') ? v_k then raise exception 'khong_ban' using errcode = '22023'; end if;
    v_gia := v_gia + ceil((v_cfg -> 'gia' ->> v_k)::numeric * (v_n #>> '{}')::numeric * case when p_nhanh then (v_cfg ->> 'nhan')::numeric else 1 end);
    v_them := v_them || jsonb_build_object(v_k, (v_n #>> '{}')::integer);
  end loop;
  select * into v_nv from public.p2d_nhan_vat where user_id = v_me for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  v_lt := coalesce(public.p2d_ky_so(v_nv.data -> 'lingshi'), 0);
  if v_lt < v_gia then raise exception 'thieu' using errcode = '22023'; end if;
  v_nv.data := jsonb_set(v_nv.data, '{lingshi}', to_jsonb(v_lt - v_gia));
  if jsonb_typeof(v_nv.data -> 'mats') is distinct from 'object' then v_nv.data := jsonb_set(v_nv.data, '{mats}', '{}'::jsonb); end if;
  for v_k, v_n in select key, value from jsonb_each(v_them) loop
    v_nv.data := jsonb_set(v_nv.data, array['mats', v_k], to_jsonb(coalesce(public.p2d_ky_so(v_nv.data -> 'mats' -> v_k), 0) + (v_n #>> '{}')::numeric));
  end loop;
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now() where user_id = v_me returning phien_ban into v_pb;
  return jsonb_build_object('phien_ban', v_pb, 'tru', jsonb_build_object('coins', v_gia), 'them', v_them);
end;
$$;
revoke all on function public.p2d_nl_mua(jsonb, boolean) from public, anon;
grant execute on function public.p2d_nl_mua(jsonb, boolean) to authenticated;
