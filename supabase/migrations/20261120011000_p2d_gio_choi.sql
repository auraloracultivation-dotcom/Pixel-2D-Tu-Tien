-- Đồng hồ giờ chơi đếm đúng (chủ dự án 20/11/2026 00:0x "người ta chơi lâu rồi mà máy chủ coi như người mới"; 00:4x chọn bù theo số quái ÷ 6).
-- Trước: trigger p2d_dem_choi chỉ cộng giờ khi hai lần LƯU cách nhau ≤ 3 phút, nên treo Tự đánh, tắt màn hình, lưu hỏng đều bị bỏ giờ;
-- đồng hồ lại chỉ có từ 06/11. Mốc quà (giờ, quái chặn 6 con / giây chơi), chợ (khoá dưới 4 giờ) đọc số hụt này.
-- Sau: giờ chơi = choi_giay (mốc nền, không cộng thêm nữa) + p2d_nhip.tong (giây còn liên lạc, nhịp sống 5 giây, khoảng ≤ 15 giây mới tính,
-- như hạn mức Linh Thạch). Mọi chỗ đọc giờ chơi gọi p2d_choi_giay(uid). Bù một lần ở cuối file. Không đổi updated_at / luu_luc (bảng Người chơi đếm theo luu_luc).

alter table public.p2d_nhip add column if not exists tong numeric not null default 0;

create or replace function public.p2d_choi_giay(p_uid uuid)
returns numeric
language sql
stable security definer
set search_path to ''
as $function$
  select coalesce((select choi_giay from public.p2d_nhan_vat where user_id = p_uid), 0)
       + coalesce((select tong from public.p2d_nhip where user_id = p_uid), 0)
$function$;
revoke all on function public.p2d_choi_giay(uuid) from public, anon, authenticated;

-- Nhịp sống cộng thêm tong (cùng khoảng giây như giay)
do $$
declare v_def text := pg_get_functiondef('public.p2d_nhip_song'::regproc);
  v_cu text := 'luc = now(), mang = coalesce(excluded.mang, n.mang);';
  v_moi text := 'tong = n.tong + case when now() - n.luc <= interval ''15 seconds'' then extract(epoch from (now() - n.luc)) else 0 end,
        luc = now(), mang = coalesce(excluded.mang, n.mang);';
begin
  if position('tong = n.tong' in v_def) > 0 then return; end if;
  if (length(v_def) - length(replace(v_def, v_cu, ''))) / length(v_cu) <> 1 then raise exception 'p2d_nhip_song: không thấy đúng một chỗ'; end if;
  execute replace(v_def, v_cu, v_moi);
end $$;

-- Trigger cũ thôi cộng giờ (tránh đếm hai lần), chỉ giữ mốc choi_luc
create or replace function public.p2d_dem_choi()
returns trigger
language plpgsql
set search_path to ''
as $function$
begin
  new.choi_luc := now();
  return new;
end;
$function$;

-- Ba chỗ đọc giờ chơi
do $$
declare v_def text; r record;
begin
  for r in select * from (values
      ('public.p2d_cho_mo', 'coalesce((select choi_giay from public.p2d_nhan_vat where user_id = p_uid), 0)', 'public.p2d_choi_giay(p_uid)'),
      ('public.p2d_cho_mo_trang_thai', 'coalesce((select choi_giay from public.p2d_nhan_vat where user_id = public.p2d_uid()), 0)', 'public.p2d_choi_giay(public.p2d_uid())'),
      ('public.p2d_ht_xong', '''_choi'', choi_giay', '''_choi'', public.p2d_choi_giay(user_id)')
    ) t(f, cu, moi) loop
    v_def := pg_get_functiondef(r.f::regproc);
    if position(r.moi in v_def) > 0 then continue; end if;
    if (length(v_def) - length(replace(v_def, r.cu, ''))) / length(r.cu) <> 1 then raise exception '%: không thấy đúng một chỗ đọc giờ chơi', r.f; end if;
    execute replace(v_def, r.cu, r.moi);
  end loop;
end $$;

-- Bù giờ cũ một lần (chủ dự án 20/11/2026 00:4x–01:0x): max(choi_giay, số quái ÷ 6, mỗi ngày tuổi tài khoản 1 giờ tối đa 4 giờ),
-- trừ tài khoản cờ đỏ. Số quái ÷ 6 đúng mức chặn của Mốc quà; phần tuổi tài khoản để người chơi cũ mở được chợ (khoá dưới 4 giờ).
update public.p2d_nhan_vat n
   set choi_giay = greatest(n.choi_giay,
         case when jsonb_typeof(n.data -> 'stats' -> 'kills') = 'number' then floor((n.data -> 'stats' ->> 'kills')::numeric / 6)::int else 0 end,
         least(4 * 3600, floor(extract(epoch from (now() - u.created_at)) / 86400)::int * 3600))
  from auth.users u
 where u.id = n.user_id
   and not public.p2d_la_co_do(n.user_id)
   and greatest(
         case when jsonb_typeof(n.data -> 'stats' -> 'kills') = 'number' then floor((n.data -> 'stats' ->> 'kills')::numeric / 6)::int else 0 end,
         least(4 * 3600, floor(extract(epoch from (now() - u.created_at)) / 86400)::int * 3600)) > n.choi_giay;
