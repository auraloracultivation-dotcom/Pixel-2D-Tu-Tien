-- Kiểm tra cấp chiêu trên máy chủ (chủ dự án chọn làm ngay, trưa 28/10/2026): cấp chiêu trong bản lưu (data.skillLv) chỉ được
-- tăng khi trả đủ Bí Kíp Chiêu. Phần sách thấy bị trừ trong bản lưu (mats.bi-kip-chieu giảm) được tính trước; phần còn thiếu
-- (sách vừa nhận rồi tiêu ngay giữa hai lần lưu) lấy từ "thùng" ck_xo: chứa tối đa 60 sách, đầy lại 30 sách mỗi giờ (rộng tay).
-- Vượt thùng, cấp không phải số nguyên 1..30, hoặc skillLv sai kiểu thì máy chủ giữ cấp chiêu cũ, ghi nghi vấn 'cap_chieu'
-- (tối đa một dòng mỗi 10 phút). Không sửa dữ liệu đang có, chỉ xét lần lưu mới. Giá khớp data/config.json → skill_lv
-- (book_base 1, book_r 1.25, max 30; tools/check.mjs so).

alter table public.p2d_nhan_vat
  add column if not exists ck_xo  numeric,       -- thùng sách cấp chiêu còn lại (null: đầy)
  add column if not exists ck_luc timestamptz;   -- lần đổ thùng gần nhất

-- Tổng Bí Kíp Chiêu nâng một chiêu từ cấp p_tu lên p_den
create or replace function public.p2d_sach_cap(p_tu integer, p_den integer)
returns numeric language plpgsql immutable set search_path = ''
as $$
declare s numeric := 0; l integer;
begin
  for l in greatest(1, p_tu) .. least(p_den, 30) - 1 loop
    s := s + ceil(power(1.25::numeric, l - 1) - 0.000000001);
  end loop;
  return s;
end;
$$;
revoke all on function public.p2d_sach_cap(integer, integer) from public, anon, authenticated;

create or replace function public.p2d_kiem_cap_chieu()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_cu      jsonb := coalesce(old.data -> 'skillLv', '{}'::jsonb);
  v_moi     jsonb := new.data -> 'skillLv';
  v_can     numeric := 0;
  v_sai     boolean := false;
  v_e       record;
  v_tu      integer;
  v_den     integer;
  v_sach_cu numeric := coalesce(case when jsonb_typeof(old.data -> 'mats' -> 'bi-kip-chieu') = 'number' then (old.data -> 'mats' ->> 'bi-kip-chieu')::numeric end, 0);
  v_sach    numeric := coalesce(case when jsonb_typeof(new.data -> 'mats' -> 'bi-kip-chieu') = 'number' then (new.data -> 'mats' ->> 'bi-kip-chieu')::numeric end, 0);
  v_dt      numeric := least(greatest(extract(epoch from (now() - coalesce(old.ck_luc, old.luu_luc, now()))), 0), 43200);
  v_xo      numeric := least(60, coalesce(old.ck_xo, 60) + v_dt / 120);
  v_thieu   numeric;
begin
  if v_moi is not distinct from (old.data -> 'skillLv') then return new; end if;
  if v_moi is null or jsonb_typeof(v_moi) <> 'object' then
    v_sai := v_moi is not null;
  else
    for v_e in select key, value from jsonb_each(v_moi) loop
      if jsonb_typeof(v_e.value) <> 'number' or (v_e.value #>> '{}')::numeric <> floor((v_e.value #>> '{}')::numeric)
         or (v_e.value #>> '{}')::numeric not between 1 and 30 or length(v_e.key) > 40 then
        v_sai := true; exit;
      end if;
      v_den := (v_e.value #>> '{}')::integer;
      v_tu := coalesce(case when jsonb_typeof(v_cu -> v_e.key) = 'number' then floor((v_cu ->> v_e.key)::numeric)::integer end, 1);
      if v_den > v_tu then v_can := v_can + public.p2d_sach_cap(v_tu, v_den); end if;
    end loop;
  end if;
  new.ck_luc := now();
  v_thieu := v_can - greatest(v_sach_cu - v_sach, 0);   -- sách không thấy bị trừ trong bản lưu
  if not v_sai and v_thieu <= v_xo then
    new.ck_xo := v_xo - greatest(v_thieu, 0);
    return new;
  end if;
  -- vượt thùng hoặc sai: giữ cấp chiêu cũ
  new.data := case when old.data ? 'skillLv' then jsonb_set(new.data, '{skillLv}', old.data -> 'skillLv') else new.data - 'skillLv' end;
  new.ck_xo := v_xo;
  if not exists (select 1 from public.p2d_nghi_van where user_id = new.user_id and ly_do = 'cap_chieu' and luc > now() - interval '10 minutes') then
    new.nghi_van := new.nghi_van + 1;
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
    values (new.user_id, 'cap_chieu', jsonb_build_object('can', v_can, 'tru', v_sach_cu - v_sach, 'xo', round(v_xo), 'sai', v_sai));
  end if;
  return new;
end;
$$;
revoke all on function public.p2d_kiem_cap_chieu() from public, anon, authenticated;

create or replace trigger p2d_kiem_cap_chieu before update of data on public.p2d_nhan_vat
for each row execute function public.p2d_kiem_cap_chieu();

-- Tự kiểm tra (hoàn tác dữ liệu thử)
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000c3';
  lv integer;
begin
  begin
    if public.p2d_sach_cap(1, 2) <> 1 or public.p2d_sach_cap(1, 3) <> 3 or public.p2d_sach_cap(1, 10) <> 29 then
      v_hong := v_hong || ' | công thức sách: ' || public.p2d_sach_cap(1, 10);
    end if;
    insert into auth.users (id, email, aud, role) values (a, 'kt_cc_a@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luu_luc)
    values (a, '{"realm": 2, "layer": 1, "qi": 0, "skillLv": {"hoa-cau": 1}, "mats": {"bi-kip-chieu": 10}}', 2, 1, 1, now());
    -- nâng đúng giá: 1 → 3 tốn 3 sách, sách giảm 10 → 7
    update public.p2d_nhan_vat set data = data || '{"skillLv": {"hoa-cau": 3}, "mats": {"bi-kip-chieu": 7}}' where user_id = a;
    select (data -> 'skillLv' ->> 'hoa-cau')::integer into lv from public.p2d_nhan_vat where user_id = a;
    if lv <> 3 then v_hong := v_hong || ' | chặn nhầm nâng đúng giá'; end if;
    -- nhảy thẳng lên 20 không trả sách: vượt thùng, giữ cấp 3
    update public.p2d_nhan_vat set data = data || '{"skillLv": {"hoa-cau": 20}}' where user_id = a;
    select (data -> 'skillLv' ->> 'hoa-cau')::integer into lv from public.p2d_nhan_vat where user_id = a;
    if lv <> 3 or not exists (select 1 from public.p2d_nghi_van where user_id = a and ly_do = 'cap_chieu') then v_hong := v_hong || ' | không chặn nhảy cấp: ' || lv; end if;
    -- cấp 31: sai, giữ cũ
    update public.p2d_nhan_vat set data = data || '{"skillLv": {"hoa-cau": 31}, "mats": {"bi-kip-chieu": 0}}' where user_id = a;
    select (data -> 'skillLv' ->> 'hoa-cau')::integer into lv from public.p2d_nhan_vat where user_id = a;
    if lv <> 3 then v_hong := v_hong || ' | lọt cấp 31'; end if;
    -- nâng ít, sách vừa nhận rồi tiêu ngay (không thấy trừ): thùng cho qua
    update public.p2d_nhan_vat set data = data || '{"skillLv": {"hoa-cau": 4}}' where user_id = a;
    select (data -> 'skillLv' ->> 'hoa-cau')::integer into lv from public.p2d_nhan_vat where user_id = a;
    if lv <> 4 then v_hong := v_hong || ' | thùng không cho qua nâng nhỏ'; end if;
    -- đổi chỗ khác trong data không đụng cấp chiêu
    update public.p2d_nhan_vat set data = data || '{"lingshi": 5}' where user_id = a;
    if (select (data ->> 'lingshi')::integer from public.p2d_nhan_vat where user_id = a) <> 5 then v_hong := v_hong || ' | đụng việc khác'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra cấp chiêu TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra cấp chiêu: đạt hết';
end
$kt$;
