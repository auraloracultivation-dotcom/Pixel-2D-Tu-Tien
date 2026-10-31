-- Đề xuất #39 (chủ dự án duyệt 31/10/2026): Thăng Linh Đan — uống vào 15 phút linh khí gấp đôi, mỗi ngày (giờ Việt Nam) tối đa 2 viên.
-- Không nhân Linh Thạch / ngọc / nguyên liệu. Máy chủ ghi thời gian đan còn tác dụng, trigger p2d_kiem_linh_khi cộng thêm hạn mức
-- linh khí (v_toc mỗi giây) cho phần thời gian lưu nằm trong lúc đan chạy, để người uống đan không bị cắt oan.

create table if not exists public.p2d_dan_x2 (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ngay    date not null,
  so      integer not null default 0,
  bat_luc timestamptz,
  het_luc timestamptz
);
alter table public.p2d_dan_x2 enable row level security;   -- không có policy: máy khách không đọc / ghi thẳng

-- Uống một viên: kiểm tra bản lưu máy chủ còn viên (data.pills.thang-linh-dan > 0) và chưa quá 2 viên hôm nay.
-- Đan đang chạy thì cộng nối thêm 15 phút. Trả về { het_luc, con } (con = số viên còn uống được hôm nay).
create or replace function public.p2d_uong_dan_x2()
returns jsonb language plpgsql security definer set search_path to '' as $function$
declare
  v_uid  uuid := (select auth.uid());
  v_ngay date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  v_co   numeric;
  v_d    public.p2d_dan_x2%rowtype;
  v_so   integer;
  v_bat  timestamptz;
  v_het  timestamptz;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  select coalesce((data -> 'pills' ->> 'thang-linh-dan')::numeric, 0) into v_co from public.p2d_nhan_vat where user_id = v_uid;
  if coalesce(v_co, 0) <= 0 then raise exception 'chua_co_dan' using errcode = 'P0001'; end if;
  select * into v_d from public.p2d_dan_x2 where user_id = v_uid for update;
  v_so := case when v_d.ngay = v_ngay then v_d.so else 0 end;
  if v_so >= 2 then raise exception 'het_luot_hom_nay' using errcode = 'P0001'; end if;
  if v_d.het_luc is not null and v_d.het_luc > now() then
    v_bat := v_d.bat_luc; v_het := v_d.het_luc + interval '15 minutes';
  else
    v_bat := now(); v_het := now() + interval '15 minutes';
  end if;
  insert into public.p2d_dan_x2 (user_id, ngay, so, bat_luc, het_luc) values (v_uid, v_ngay, v_so + 1, v_bat, v_het)
  on conflict (user_id) do update set ngay = excluded.ngay, so = excluded.so, bat_luc = excluded.bat_luc, het_luc = excluded.het_luc;
  return jsonb_build_object('het_luc', v_het, 'con', 2 - (v_so + 1));
end;
$function$;
revoke all on function public.p2d_uong_dan_x2() from public, anon;
grant execute on function public.p2d_uong_dan_x2() to authenticated;

-- Hạn mức linh khí: như cũ, cộng thêm v_toc × số giây (từ lần lưu trước tới giờ) nằm trong lúc Thăng Linh Đan chạy (tối đa 30 phút).
create or replace function public.p2d_kiem_linh_khi()
returns trigger language plpgsql security definer set search_path to '' as $function$
declare
  v_r     integer := coalesce((old.data ->> 'realm')::integer, old.canh_gioi);
  v_l     integer := coalesce((old.data ->> 'layer')::integer, old.tang);
  v_can   numeric := public.p2d_lk_can(greatest(v_r, 0) * 9 + greatest(v_l, 1) - 1);
  v_toc   numeric := greatest(90 * power(1.6, least(greatest(v_r, 0), 4)), v_can / 150);
  v_tran  numeric := greatest(500000, v_can * 8);
  v_dt    numeric := least(greatest(extract(epoch from (now() - coalesce(old.qi_luc, old.luu_luc))), 0), 43200);
  v_on    numeric := nullif(current_setting('p2d.on', true), '')::numeric;
  v_x2    numeric := 0;
  v_xo    numeric;
  v_tang  numeric;
  v_den   jsonb;
begin
  if (new.data -> 'realm') is not distinct from (old.data -> 'realm') and (new.data -> 'layer') is not distinct from (old.data -> 'layer')
     and (new.data -> 'qi') is not distinct from (old.data -> 'qi') then
    return new;
  end if;
  select greatest(0, extract(epoch from (least(now(), d.het_luc) - greatest(coalesce(old.qi_luc, old.luu_luc), d.bat_luc))))
    into v_x2 from public.p2d_dan_x2 d where d.user_id = old.user_id;
  v_x2 := least(coalesce(v_x2, 0), 1800);
  if v_on is not null then
    v_xo := least(v_tran + v_toc * v_x2, coalesce(old.qi_xo, v_tran) + v_toc * least(v_dt, v_on + 5) + 20 * least(greatest(v_dt - v_on - 5, 0), 28800) + v_toc * v_x2);
  else
    v_xo := least(v_tran + v_toc * v_x2, coalesce(old.qi_xo, v_tran) + v_toc * v_dt + v_toc * v_x2);
  end if;
  v_tang := public.p2d_tong_lk((new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer, (new.data ->> 'qi')::numeric)
          - public.p2d_tong_lk(v_r, v_l, (old.data ->> 'qi')::numeric);
  new.qi_luc := now();
  if v_tang <= v_xo then
    new.qi_xo := least(v_tran, v_xo - greatest(v_tang, 0));
    return new;
  end if;
  v_den := public.p2d_lk_tien(v_r, v_l, (old.data ->> 'qi')::numeric, v_xo, (new.data ->> 'realm')::integer, (new.data ->> 'layer')::integer);
  new.data := jsonb_set(jsonb_set(jsonb_set(new.data, '{realm}', v_den -> 'realm'), '{layer}', v_den -> 'layer'), '{qi}', v_den -> 'qi');
  new.canh_gioi := (v_den ->> 'realm')::integer; new.tang := (v_den ->> 'layer')::integer;
  new.qi_xo := 0;
  if v_tang > v_xo + v_tran then perform set_config('p2d.sua_lk', '1', true); end if;
  if v_tang - v_xo > v_can then
    if public.p2d_co_moi(new.user_id) then new.nghi_van := new.nghi_van + 1; end if;
    insert into public.p2d_nghi_van (user_id, ly_do, chi_tiet)
    values (new.user_id, 'linh_khi', jsonb_build_object('tang', round(v_tang), 'xo', round(v_xo), 'giay', round(v_dt), 'lien_lac', round(v_on), 'canh_gioi', v_r, 'den', v_den, 'x2', round(v_x2)));
  end if;
  return new;
end;
$function$;
