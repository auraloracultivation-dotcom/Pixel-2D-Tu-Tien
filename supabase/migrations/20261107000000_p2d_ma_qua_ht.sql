-- Mã quà tặng điểm hệ thống (chủ dự án 07/11/2026 00:11: "tạo code sử dụng 1 lần, tặng 10k điểm hệ thống").
-- p2d_ma_qua thêm cột loai: 'qtv' (như cũ, ghi sổ cái QTV) hoặc 'ht' (cộng vào p2d_ht_diem, điểm dùng để triệu hồi quà
-- Hệ Thống, migration 20261106080000). Luật dùng giữ nguyên: một mã một lần, mỗi tài khoản một mã mỗi đợt (dot).
-- Mã vẫn thêm thẳng trên máy chủ, KHÔNG ghi mã vào repo. Trả thêm 'loai' để máy khách hiện đúng chữ (data/menu.json → ma_qua).

alter table public.p2d_ma_qua add column if not exists loai text not null default 'qtv';
alter table public.p2d_ma_qua drop constraint if exists p2d_ma_qua_loai_check;
alter table public.p2d_ma_qua add constraint p2d_ma_qua_loai_check check (loai in ('qtv', 'ht'));

create or replace function public.p2d_nhap_ma(p_ma text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare v_uid uuid := public.p2d_uid(); v_m public.p2d_ma_qua%rowtype; v_ma text := upper(btrim(coalesce(p_ma, '')));
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '42501'; end if;
  perform pg_advisory_xact_lock(hashtext('ma_qua:' || v_uid::text));
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
revoke all on function public.p2d_nhap_ma(text) from public, anon;
grant execute on function public.p2d_nhap_ma(text) to authenticated;
