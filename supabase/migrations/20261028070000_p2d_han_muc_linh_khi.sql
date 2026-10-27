-- Hạn mức linh khí trên máy chủ (việc 20): cảnh giới, tầng, linh khí trong bản lưu chỉ được tăng trong một "thùng hạn mức"
-- đầy dần theo thời gian thật, như Linh Thạch. Rộng tay: tốc độ đầy 60 × 1,6^cảnh giới linh khí mỗi giây (gấp nhiều lần
-- đả tọa và đánh quái nhanh nhất), thùng chứa tối đa max(500.000, 1 giờ đầy). Lần lưu vượt thùng thì máy chủ giữ cảnh giới,
-- tầng, linh khí cũ, ghi nghi vấn 'linh_khi'; máy khách lưu lại sau khi thùng đầy thêm thì được nhận.
-- Làm bằng trigger trên p2d_nhan_vat (không phải viết lại p2d_luu): chỉ chạy khi realm, layer hoặc qi trong data đổi.
-- Công thức linh khí mỗi tầng khớp data/realms.json (qi_base 40, qi_growth 1.3, qi_soft_from 27, qi_soft_growth 1.03; tools/check.mjs so).

alter table public.p2d_nhan_vat
  add column if not exists qi_xo  numeric,       -- thùng hạn mức linh khí còn lại (null: đầy)
  add column if not exists qi_luc timestamptz;   -- lần đổ thùng gần nhất

-- Tổng linh khí đã tu tới (cảnh giới r, tầng l, linh khí q trong tầng)
create or replace function public.p2d_tong_lk(p_r integer, p_l integer, p_q numeric)
returns numeric language plpgsql immutable set search_path = ''
as $$
declare n integer := greatest(0, p_r) * 9 + greatest(1, p_l) - 1; s numeric := 0; i integer;
begin
  for i in 0 .. n - 1 loop
    s := s + round(40 * power(1.3, least(i, 27)) * power(1.03, greatest(0, i - 27)));
  end loop;
  return s + greatest(coalesce(p_q, 0), 0);
end;
$$;
revoke all on function public.p2d_tong_lk(integer, integer, numeric) from public, anon, authenticated;

create or replace function public.p2d_kiem_linh_khi()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  v_r     integer := coalesce((old.data ->> 'realm')::integer, old.canh_gioi);
  v_toc   numeric := 60 * power(1.6, greatest(v_r, 0));
  v_tran  numeric := greatest(500000, v_toc * 3600);
  v_dt    numeric := least(greatest(extract(epoch from (now() - coalesce(old.qi_luc, old.luu_luc))), 0), 43200);
  v_xo    numeric := least(v_tran, coalesce(old.qi_xo, v_tran) + v_toc * v_dt);
  v_tang  numeric;
begin
  if (new.data -> 'realm') is not distinct from (old.data -> 'realm') and (new.data -> 'layer') is not distinct from (old.data -> 'layer')
     and (new.data -> 'qi') is not distinct from (old.data -> 'qi') then
    return new;
  end if;
  v_tang := public.p2d_tong_lk((new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer, (new.data ->> 'qi')::numeric)
          - public.p2d_tong_lk((old.data ->> 'realm')::integer, (old.data ->> 'layer')::integer, (old.data ->> 'qi')::numeric);
  new.qi_luc := now();
  if v_tang <= v_xo then
    new.qi_xo := v_xo - greatest(v_tang, 0);
    return new;
  end if;
  -- vượt thùng: giữ cảnh giới, tầng, linh khí cũ
  new.data := jsonb_set(jsonb_set(jsonb_set(new.data, '{realm}', old.data -> 'realm'), '{layer}', old.data -> 'layer'), '{qi}', old.data -> 'qi');
  new.canh_gioi := old.canh_gioi; new.tang := old.tang;
  new.qi_xo := v_xo;
  new.nghi_van := new.nghi_van + 1;
  insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
  values (new.user_id, 'linh_khi', jsonb_build_object('tang', round(v_tang), 'xo', round(v_xo), 'giay', round(v_dt), 'canh_gioi', new.data -> 'realm'));
  return new;
end;
$$;
revoke all on function public.p2d_kiem_linh_khi() from public, anon, authenticated;

create or replace trigger p2d_kiem_linh_khi before update of data on public.p2d_nhan_vat
for each row execute function public.p2d_kiem_linh_khi();

-- Tự kiểm tra (hoàn tác dữ liệu thử)
do $kt$
declare
  v_hong text := ''; a uuid := '00000000-0000-4000-8000-0000000000b9';
begin
  begin
    if public.p2d_tong_lk(0, 1, 0) <> 0 or public.p2d_tong_lk(0, 2, 5) <> 45 or public.p2d_tong_lk(0, 3, 0) <> 92 then v_hong := v_hong || ' | công thức đầu: ' || public.p2d_tong_lk(0, 3, 0); end if;
    if abs(public.p2d_tong_lk(8, 9, 0) + round(40 * power(1.3, 27) * power(1.03, 80 - 27)) - 6410000) > 200000 then v_hong := v_hong || ' | tổng tới đỉnh: ' || public.p2d_tong_lk(8, 9, 0); end if;
    insert into auth.users (id, email, aud, role) values (a, 'kt_lk_a@nguoichoi.invalid', 'authenticated', 'authenticated');
    insert into public.p2d_nhan_vat (user_id, data, canh_gioi, tang, phien_ban, luu_luc) values (a, '{"realm": 2, "layer": 1, "qi": 0}', 2, 1, 1, now());
    -- tu bình thường: lên vài tầng
    update public.p2d_nhan_vat set data = '{"realm": 2, "layer": 3, "qi": 100}', canh_gioi = 2, tang = 3 where user_id = a;
    if (select (data ->> 'layer')::integer from public.p2d_nhan_vat where user_id = a) <> 3 then v_hong := v_hong || ' | chặn nhầm tu bình thường'; end if;
    -- nhảy thẳng lên Hoá Thần: vượt thùng
    update public.p2d_nhan_vat set data = '{"realm": 4, "layer": 9, "qi": 0}', canh_gioi = 4, tang = 9 where user_id = a;
    if (select (data ->> 'realm')::integer from public.p2d_nhan_vat where user_id = a) <> 2 or (select canh_gioi from public.p2d_nhan_vat where user_id = a) <> 2
       or not exists (select 1 from public.p2d_nghi_van where user_id = a and ly_do = 'linh_khi') then v_hong := v_hong || ' | không chặn nhảy cảnh giới'; end if;
    -- đổi chỗ khác trong data (Linh Thạch) không bị ảnh hưởng
    update public.p2d_nhan_vat set data = data || '{"lingshi": 5}' where user_id = a;
    if (select (data ->> 'lingshi')::integer from public.p2d_nhan_vat where user_id = a) <> 5 then v_hong := v_hong || ' | đụng việc khác'; end if;
    raise exception using errcode = 'P0001', message = 'p2d_hoan_tac_thu';
  exception when others then
    if sqlerrm <> 'p2d_hoan_tac_thu' then v_hong := v_hong || ' | lỗi bất ngờ: ' || sqlerrm; end if;
  end;
  if v_hong <> '' then raise exception 'Tự kiểm tra hạn mức linh khí TRƯỢT (đã hoàn tác cả migration):%', v_hong; end if;
  raise notice 'Tự kiểm tra hạn mức linh khí: đạt hết';
end
$kt$;
