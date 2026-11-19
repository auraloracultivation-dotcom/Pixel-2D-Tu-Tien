-- Mã quà dùng chung phát thêm Thú Lệnh, điểm Quản trị viên và trang bị theo bậc (chủ dự án 19/11/2026 12:02–12:05: một mã
-- tặng 7 Thú Lệnh, 499 999 Linh Thạch, 1 Tẩy Tủy Đan, 10 điểm QTV, ngọc cấp 1 mỗi loại 10 viên, 1 trang bị Tiên phẩm).
-- Phần tử của p2d_ma_chung.thu (data/ma-chung.json) nay có thêm ba dạng, máy chủ xử lý ngay lúc nhập mã thay vì gửi thư:
--   {"thu_lenh": n}  1..100   cộng vào p2d_ht_diem.thu_lenh (đổi thú cưỡi ở Ngự Thú Sư)
--   {"qtv": n}       1..1000  ghi sổ p2d_qtv_so (nguon 'ma_qua', ref = mã)
--   {"do": t}        0..6     sinh một món bằng p2d_ht_do theo cảnh giới người nhập (như triệu hồi Hệ Thống), gửi vào Hòm thư
-- Các phần tử khác giữ như cũ (một lá thư vào Hòm thư). Kết quả trả thêm thu_lenh, qtv để máy khách báo.
create or replace function public.p2d_nhap_ma(p_ma text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid(); v_m public.p2d_ma_qua%rowtype; v_c public.p2d_ma_chung%rowtype; v_ma text := upper(btrim(coalesce(p_ma, ''))); v_l jsonb; v_n integer := 0;
  v_tl integer := 0; v_qtv integer := 0; v_k integer; v_lvl integer;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ma_qua:' || v_uid::text));
  select * into v_c from public.p2d_ma_chung where ma = v_ma for update;
  if found then
    if v_c.het_luc is not null and v_c.het_luc < now() then return jsonb_build_object('ok', false, 'ly_do', 'het_han'); end if;
    if exists (select 1 from public.p2d_ma_chung_dung where ma = v_ma and user_id = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'da_nhap'); end if;
    if v_c.tran is not null and v_c.da_dung >= v_c.tran then return jsonb_build_object('ok', false, 'ly_do', 'het_luot'); end if;
    if not exists (select 1 from public.p2d_nhan_vat where user_id = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'chua_luu'); end if;
    insert into public.p2d_ma_chung_dung (ma, user_id) values (v_ma, v_uid);
    update public.p2d_ma_chung set da_dung = da_dung + 1 where ma = v_ma;
    for v_l in select * from jsonb_array_elements(case when jsonb_typeof(v_c.thu) = 'array' then v_c.thu else '[]'::jsonb end) loop
      if v_l ? 'thu_lenh' then
        if jsonb_typeof(v_l -> 'thu_lenh') = 'number' then
          v_k := least(100, greatest(0, floor((v_l ->> 'thu_lenh')::numeric)::int));
          if v_k > 0 then
            insert into public.p2d_ht_diem (user_id, thu_lenh) values (v_uid, v_k)
            on conflict (user_id) do update set thu_lenh = public.p2d_ht_diem.thu_lenh + excluded.thu_lenh, luc = now();
            v_tl := v_tl + v_k;
          end if;
        end if;
        continue;
      end if;
      if v_l ? 'qtv' then
        if jsonb_typeof(v_l -> 'qtv') = 'number' then
          v_k := least(1000, greatest(0, floor((v_l ->> 'qtv')::numeric)::int));
          if v_k > 0 then
            insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu) values (v_uid, v_k, 'ma_qua', v_ma, left('Mã quà ' || coalesce(v_c.ghi_chu, v_ma), 200));
            v_qtv := v_qtv + v_k;
          end if;
        end if;
        continue;
      end if;
      if v_l ? 'do' then
        if jsonb_typeof(v_l -> 'do') <> 'number' then continue; end if;
        v_k := least(6, greatest(0, floor((v_l ->> 'do')::numeric)::int));
        select greatest(0, coalesce(canh_gioi, 0) * 9 + coalesce(tang, 1) - 1) into v_lvl from public.p2d_nhan_vat where user_id = v_uid;
        v_l := (v_l - 'do') || jsonb_build_object('item', public.p2d_ht_do(v_k, coalesce(v_lvl, 0)));
      end if;
      insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_uid, v_l || jsonb_build_object('tieu_de', coalesce(v_l ->> 'tieu_de', 'Quà mã ' || v_ma)), 'ma_qua');
      v_n := v_n + 1;
    end loop;
    return jsonb_build_object('ok', true, 'loai', 'chung', 'thu', v_n, 'thu_lenh', v_tl, 'qtv', v_qtv);
  end if;
  select * into v_m from public.p2d_ma_qua where ma = v_ma for update;
  if not found then return jsonb_build_object('ok', false, 'ly_do', 'sai_ma'); end if;
  if v_m.dung_boi is not null then return jsonb_build_object('ok', false, 'ly_do', case when v_m.dung_boi = v_uid then 'da_nhap' else 'het_luot' end); end if;
  if exists (select 1 from public.p2d_ma_qua where dot = v_m.dot and dung_boi = v_uid) then return jsonb_build_object('ok', false, 'ly_do', 'da_nhap_dot'); end if;
  update public.p2d_ma_qua set dung_boi = v_uid, dung_luc = now() where ma = v_ma;
  if v_m.loai = 'ht' then
    insert into public.p2d_ht_diem (user_id, diem) values (v_uid, v_m.diem)
    on conflict (user_id) do update set diem = public.p2d_ht_diem.diem + excluded.diem, luc = now();
  else
    insert into public.p2d_qtv_so (user_id, diem, nguon, ref, ghi_chu) values (v_uid, v_m.diem, 'ma_qua', v_ma, left('Mã quà ' || coalesce(v_m.ghi_chu, v_m.dot), 200));
  end if;
  return jsonb_build_object('ok', true, 'diem', v_m.diem, 'loai', v_m.loai);
end; $$;
