-- Cờ đỏ siết hạn mức (chủ dự án 05/11/2026 17:28–17:31: canh 2DDC, "cứ hack là tìm nguyên nhân, đóng lỗ, thu đồ, gắn cờ").
-- Đo 05/11 17:35–17:55: Đạo hữu 2DDC (đã cờ đỏ) gửi linh thú 40 / 20 sao, đồ rơi giả, ngọc vượt mức. Máy chủ chặn hết phần sai,
-- nhưng các thùng hạn mức giai đoạn 2–4 vẫn cho người bị cờ đỏ hưởng mức như người thường: thùng thú cưỡi rơi đầy sẵn 2 con
-- (lấy ngay Hoả Kỳ Lân + Tuyết Ly, bán lại được 20.000 Linh Thạch), thùng loài thú mới 3, thùng ngọc 600 viên.
-- Từ giờ tài khoản có trong p2d_co_do chỉ còn 10% mọi thùng (trần và tốc độ hồi): thú cưỡi rơi / loài mới / công pháp mới
-- dưới 1 nên không lấy thêm được, sao và kinh nghiệm thú, ngọc chỉ 10%. Người chơi thường không đổi gì.
-- Chạy lại không đổi gì.

create or replace function public.p2d_ky_siet(p_sv jsonb, p_f numeric)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_object_agg(e.key,
    case
      when jsonb_typeof(e.value) = 'object' and e.value ? 'tran' then
        e.value || jsonb_build_object('tran', (e.value ->> 'tran')::numeric * p_f)
                || case when e.value ? 'phut' then jsonb_build_object('phut', (e.value ->> 'phut')::numeric * p_f) else '{}'::jsonb end
                || case when e.value ? 'toc_phut' then jsonb_build_object('toc_phut', (e.value ->> 'toc_phut')::numeric * p_f) else '{}'::jsonb end
      when e.key = 'exp_k' and jsonb_typeof(e.value) = 'object' then
        (select jsonb_object_agg(k.key, (k.value #>> '{}')::numeric * p_f) from jsonb_each(e.value) k)
      else e.value
    end), '{}'::jsonb)
  from jsonb_each(coalesce(p_sv, '{}'::jsonb)) e;
$$;
revoke all on function public.p2d_ky_siet(jsonb, numeric) from public, anon, authenticated;

-- p2d_kiem_thu: thùng giai đoạn 4
do $$
declare d text := pg_get_functiondef('public.p2d_kiem_thu(jsonb,jsonb,numeric,numeric,boolean,numeric,numeric,uuid)'::regprocedure);
  neo text := E'\nbegin\n  v_off := least(';
begin
  if position('p2d_ky_siet' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_kiem_thu da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, E'\nbegin\n' ||
    E'  -- cờ đỏ (20261105150000_p2d_co_do_siet): mọi thùng chỉ còn 10%\n' ||
    E'  if p_uid is not null and exists (select 1 from public.p2d_co_do c where c.user_id = p_uid) then v_sv := public.p2d_ky_siet(v_sv, 0.1); end if;\n' ||
    E'  v_off := least(');
end;
$$;

-- p2d_kiem_ngoc: thùng ngọc
do $$
declare d text := pg_get_functiondef('public.p2d_kiem_ngoc(jsonb,jsonb,jsonb,numeric,boolean)'::regprocedure);
  neo text := E'\nbegin\n  v_xo := least(';
begin
  if position('p2d_ky_siet' in d) > 0 then return; end if;
  if (length(d) - length(replace(d, neo, ''))) / length(neo) <> 1 then raise exception 'p2d_kiem_ngoc da doi, khong tim thay cho va'; end if;
  execute replace(d, neo, E'\nbegin\n' ||
    E'  -- cờ đỏ (20261105150000_p2d_co_do_siet / p2d_ky_siet): thùng ngọc chỉ còn 10%\n' ||
    E'  if exists (select 1 from public.p2d_co_do c where c.user_id = (select auth.uid())) then v_c := public.p2d_ky_siet(v_c, 0.1); end if;\n' ||
    E'  v_xo := least(');
end;
$$;

do $kt$
declare s jsonb := public.p2d_ky_siet('{"cuoi":{"tran":2,"phut":0.0042},"dau":0.34,"exp_k":{"pet":1},"lo":{"tran":600,"toc_phut":20}}', 0.1);
begin
  if (s -> 'cuoi' ->> 'tran')::numeric <> 0.2 or (s ->> 'dau')::numeric <> 0.34 or (s -> 'exp_k' ->> 'pet')::numeric <> 0.1
     or (s -> 'lo' ->> 'tran')::numeric <> 60 or (s -> 'lo' ->> 'toc_phut')::numeric <> 2 then raise exception 'kt: p2d_ky_siet %', s; end if;
  if position('p2d_ky_siet' in pg_get_functiondef('public.p2d_kiem_thu(jsonb,jsonb,numeric,numeric,boolean,numeric,numeric,uuid)'::regprocedure)) = 0 then raise exception 'kt: kiem_thu'; end if;
  if position('p2d_ky_siet' in pg_get_functiondef('public.p2d_kiem_ngoc(jsonb,jsonb,jsonb,numeric,boolean)'::regprocedure)) = 0 then raise exception 'kt: kiem_ngoc'; end if;
end;
$kt$;
