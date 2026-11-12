-- Nhịp sống gom qua phòng Cloudflare (chủ dự án 13/11/2026 01:24: "onl kết nối các thứ khác cho hết Cloudflare xử lý",
-- Supabase giữ kinh tế, chống hack). Mỗi phòng (cloud/src/nhip.js) 12 giây gửi một lần cho cả phòng thay vì mỗi người
-- 5–10 giây gọi p2d_nhip_song2. Ký HMAC bằng khoá lõi Mang đã đăng ký (p2d_bi_mat 'cf_mang', như p2d_pvp_ghi), lệch giờ tối đa 2 phút.
-- p_ds = {"r": [[uid, giây online, mã phiên, địa chỉ mạng], ...]} tối đa 200 dòng.
-- Mỗi dòng: cộng giây vào p2d_nhip như p2d_nhip_song (trần 43.200), nhưng không quá thời gian thật kể từ lần liên lạc trước + 3 giây
-- (hai phòng cùng tài khoản không cộng đôi); mạng = dải /22 (IPv6 /56) như p2d_mang(). Trả {"khac": [uid]}: tài khoản mà mã phiên
-- máy chủ giữ (p2d_phien) khác mã phòng gửi = máy khác đã vào sau, phòng báo máy cũ thoát.
-- Máy khách vẫn gọi p2d_nhip_song2 khi chưa vào phòng Cloudflare (src/game/net-watch.js), hàm cũ giữ nguyên.

create or replace function public.p2d_nhip_gop(p_ts bigint, p_ds text, p_ky text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_khoa text := (select v from public.p2d_bi_mat where k = 'cf_mang');
  v_r jsonb; v_uid uuid; v_g numeric; v_ph text; v_ip inet; v_mang text; v_cur text;
  v_khac jsonb := '[]'::jsonb; v_n int := 0;
begin
  if v_khoa is null or p_ts is null or p_ds is null or p_ky is null or length(p_ds) > 40000 then raise exception 'sai' using errcode = '42501'; end if;
  if abs(extract(epoch from now()) * 1000 - p_ts) > 120000 then raise exception 'het_gio' using errcode = '42501'; end if;
  if encode(extensions.hmac(p_ts::text || '.' || p_ds, v_khoa, 'sha256'), 'hex') <> lower(p_ky) then raise exception 'sai_ky' using errcode = '42501'; end if;

  for v_r in select value from jsonb_array_elements(coalesce(p_ds::jsonb -> 'r', '[]'::jsonb)) loop
    v_n := v_n + 1;
    exit when v_n > 200;
    begin v_uid := (v_r ->> 0)::uuid; exception when others then continue; end;
    v_g := greatest(0, least(coalesce((v_r ->> 1)::numeric, 0), 60));
    v_ph := nullif(left(coalesce(v_r ->> 2, ''), 64), '');
    v_mang := null;
    begin
      v_ip := nullif(btrim(v_r ->> 3), '')::inet;
      if v_ip is not null then v_mang := network(set_masklen(v_ip, case when family(v_ip) = 4 then 22 else 56 end))::text; end if;
    exception when others then v_mang := null; end;

    begin
      insert into public.p2d_nhip as n (user_id, luc, giay, mang) values (v_uid, now(), 0, v_mang)
      on conflict (user_id) do update
        set giay = least(n.giay + least(v_g, greatest(0, extract(epoch from (now() - n.luc))) + 3), 43200),
            luc = now(), mang = coalesce(excluded.mang, n.mang);
    exception when others then continue;   -- tài khoản không còn: bỏ dòng, không hỏng cả phòng
    end;

    select phien into v_cur from public.p2d_phien where user_id = v_uid;
    if v_cur is not null and v_ph is not null and v_cur <> v_ph then v_khac := v_khac || to_jsonb(v_uid::text); end if;
  end loop;
  return jsonb_build_object('khac', v_khac);
end;
$$;

revoke all on function public.p2d_nhip_gop(bigint, text, text) from public;
grant execute on function public.p2d_nhip_gop(bigint, text, text) to anon, authenticated;
