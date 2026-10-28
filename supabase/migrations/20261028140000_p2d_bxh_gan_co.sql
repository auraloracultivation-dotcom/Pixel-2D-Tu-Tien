-- Bảng xếp hạng hiện mọi người (chủ dự án xin 28/10/2026 20:40): trước đây ai có nghi_van >= 10 bị ẩn khỏi bảng.
-- Nay vẫn hiện, kèm cờ "co" để máy khách tô tên đỏ và gắn cờ; hạng của mình cũng tính cả người bị gắn cờ.
-- Danh hiệu tuần (p2d_chot_tuan → p2d_xep) giữ nguyên: người bị gắn cờ không nhận danh hiệu.
-- Chợ vẫn chặn người bị gắn cờ như cũ.

create or replace function public.p2d_xep_ca(p_loai text, p_gioi_han integer)
returns table (hang bigint, user_id uuid, ten text, gia_tri bigint, canh_gioi smallint, tang smallint, co boolean)
language sql
stable
security definer
set search_path = ''
as $$
  select row_number() over (order by
           case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                       else n.canh_gioi::bigint * 10 + n.tang end desc,
           n.updated_at asc) as hang,
         n.user_id, n.ten,
         case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                     else n.canh_gioi::bigint * 10 + n.tang end as gia_tri,
         n.canh_gioi, n.tang, n.nghi_van >= 10 as co
  from public.p2d_nhan_vat n
  where (p_loai <> 'thap' or n.thap > 0)
  order by 1
  limit p_gioi_han;
$$;
revoke all on function public.p2d_xep_ca(text, integer) from public, anon, authenticated;

create or replace function public.p2d_bxh(p_loai text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_nho  public.p2d_bxh_nho%rowtype;
  v_top  jsonb;
  v_toi  jsonb;
  v_dh   jsonb;
  v_me   public.p2d_nhan_vat%rowtype;
  v_gt   bigint;
  v_hang bigint;
begin
  if v_uid is null then raise exception 'chua_dang_nhap' using errcode = '28000'; end if;
  if p_loai not in ('luc_chien', 'canh_gioi', 'thap') then raise exception 'loai_sai' using errcode = '22023'; end if;
  perform public.p2d_chot_tuan();
  select * into v_nho from public.p2d_bxh_nho where loai = p_loai;
  if (not found or v_nho.luc < now() - interval '60 seconds') and pg_try_advisory_xact_lock(hashtext('p2d_bxh:' || p_loai)) then
    select coalesce(jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'gia_tri', x.gia_tri,
             'canh_gioi', x.canh_gioi, 'tang', x.tang, 'co', x.co, 'u', x.user_id) order by x.hang), '[]'::jsonb)
      into v_top from public.p2d_xep_ca(p_loai, 50) x;
    insert into public.p2d_bxh_nho (loai, top, luc) values (p_loai, v_top, now())
    on conflict (loai) do update set top = excluded.top, luc = excluded.luc;
  else
    v_top := coalesce(v_nho.top, '[]'::jsonb);
  end if;
  -- Gắn "là tôi", bỏ mã người chơi trước khi trả về
  select coalesce(jsonb_agg((e - 'u') || jsonb_build_object('la_toi', e ->> 'u' = v_uid::text) order by (e ->> 'hang')::bigint), '[]'::jsonb)
    into v_top from jsonb_array_elements(v_top) e;
  -- Hạng của mình: đếm người hơn mình, tính cả người bị gắn cờ (cùng thứ tự với bảng)
  select * into v_me from public.p2d_nhan_vat where user_id = v_uid;
  if found and (p_loai <> 'thap' or v_me.thap > 0) then
    v_gt := case p_loai when 'luc_chien' then v_me.luc_chien::bigint when 'thap' then v_me.thap::bigint
                        else v_me.canh_gioi::bigint * 10 + v_me.tang end;
    select count(*) + 1 into v_hang from public.p2d_nhan_vat n
     where n.user_id <> v_uid
       and (case p_loai when 'luc_chien' then n.luc_chien::bigint when 'thap' then n.thap::bigint
                        else n.canh_gioi::bigint * 10 + n.tang end) > v_gt;
    v_toi := jsonb_build_object('hang', v_hang, 'ten', v_me.ten, 'gia_tri', v_gt, 'canh_gioi', v_me.canh_gioi, 'tang', v_me.tang,
                                'co', v_me.nghi_van >= 10);
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('loai', t.loai, 'hang', t.hang)), '[]'::jsonb)
    into v_dh from public.p2d_bxh_tuan t
   where t.user_id = v_uid and t.tuan = public.p2d_tuan_nay() - 7;
  return jsonb_build_object('top', v_top, 'toi', v_toi, 'danh_hieu', v_dh, 'tuan', public.p2d_tuan_nay());
end;
$$;
revoke all on function public.p2d_bxh(text) from public, anon;
grant execute on function public.p2d_bxh(text) to authenticated;

-- Bảng nhớ tạm theo kiểu cũ tự hết hạn sau 60 giây (p2d_bxh dựng lại), không cần xoá tay.
