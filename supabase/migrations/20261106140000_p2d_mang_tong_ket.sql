-- Tổng kết boss Cửu Đầu Thôn Thiên Mãng tự động (chủ dự án 06/11/2026 20:59: boss xuất hiện 20:30–21:00 hằng ngày giờ VN).
-- Hết giờ, máy chủ phòng Cloudflare (cloud/src/mang.js tongKet, hẹn giờ trong cloud/wrangler.jsonc) gửi bảng sát thương ký HMAC
-- (cùng khoá cf_mang như p2d_mang_thuong). Mỗi ngày phát một lần (bảng p2d_mang_dot): top N mỗi người 1 trang bị ngẫu nhiên mọi ô
-- dòng màu top_tier + ngọc + Linh Thạch; mọi người khác có sát thương 1 trang bị dòng màu all_tier + ngọc + Linh Thạch
-- (data/thien-mang.json → thuong, chép vào p2d_ht_cfg 'mang_tk'). Tài khoản đang bị khoá thì bỏ qua.

create table if not exists public.p2d_mang_dot (
  ngay date primary key,
  so_nguoi integer not null default 0,
  luc timestamptz not null default now()
);
alter table public.p2d_mang_dot enable row level security;
revoke all on table public.p2d_mang_dot from public, anon, authenticated;

insert into public.p2d_ht_cfg (k, v) values ('mang_tk', '{"top": 10, "top_tier": 6, "top_rarity": "thien", "top_gems": 50, "top_lt": 200000, "all_tier": 5, "all_rarity": "dia", "all_gems": 25, "all_lt": 100000, "gem_lv": 1, "loai": "trang_bi"}'::jsonb) on conflict (k) do update set v = excluded.v;

-- Trang bị ngẫu nhiên mọi ô như p2d_ht_do nhưng chọn phẩm (rarity) riêng
create or replace function public.p2d_mang_do(p_t int, p_lvl int, p_rar text)
returns jsonb
language plpgsql
volatile
set search_path = ''
as $$
declare c jsonb := (select v from public.p2d_ht_cfg where k = 'cfg'); v_base text; b jsonb; r jsonb; v_rid text; v_main jsonb := '{}'::jsonb;
  kv record; v_s text; st jsonb; v_cap int := 1; v_tot numeric; v_x numeric; i int; v_val int; v_pool jsonb;
begin
  select k into v_base from jsonb_object_keys(c -> 'bases') k order by random() limit 1;
  b := c -> 'bases' -> v_base;
  v_rid := coalesce(p_rar, c -> 'tier_rar' ->> p_t); r := c -> 'rar' -> v_rid;
  for kv in select * from jsonb_each(b -> 'main') loop
    st := c -> 'stats' -> kv.key;
    v_main := v_main || jsonb_build_object(kv.key, greatest(1, round((kv.value #>> '{}')::numeric
      * (case when coalesce((st ->> 'pct')::boolean, false) then 1 else 1 + p_lvl * (c ->> 'main_per_lvl')::numeric end) * (r ->> 'mult')::numeric)));
  end loop;
  v_pool := b -> 'pool';
  v_s := v_pool ->> floor(random() * jsonb_array_length(v_pool))::int;
  st := c -> 'stats' -> v_s;
  v_val := greatest(1, round(((st ->> 'min')::numeric + random() * ((st ->> 'max')::numeric - (st ->> 'min')::numeric))
    * (case when coalesce((st ->> 'pct')::boolean, false) then 1 else 1 + p_lvl * (c ->> 'line_per_lvl')::numeric end) * (c -> 'tiers' ->> p_t)::numeric));
  select sum(x::numeric) into v_tot from jsonb_array_elements_text(c -> 'cap_w') x;
  v_x := random() * v_tot;
  for i in 0 .. jsonb_array_length(c -> 'cap_w') - 1 loop
    v_x := v_x - (c -> 'cap_w' ->> i)::numeric;
    if v_x <= 0 then v_cap := i + 1; exit; end if;
  end loop;
  return jsonb_build_object('uid', 0, 'base', v_base, 'rarity', v_rid, 'lvl', p_lvl, 'main', v_main,
    'lines', jsonb_build_array(jsonb_build_object('s', v_s, 'v', v_val, 't', p_t)), 'cap', v_cap,
    'sockets', (select coalesce(jsonb_agg('null'::jsonb), '[]'::jsonb) from generate_series(1, coalesce((r ->> 'sockets')::int, 0))),
    'el', c -> 'els' ->> floor(random() * jsonb_array_length(c -> 'els'))::int);
end;
$$;
revoke all on function public.p2d_mang_do(int, int, text) from public, anon, authenticated;

create or replace function public.p2d_mang_tong_ket(p_ts bigint, p_ds text, p_ky text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_khoa text := (select v from public.p2d_bi_mat where k = 'cf_mang'); t jsonb := (select v from public.p2d_ht_cfg where k = 'mang_tk');
  v_ds jsonb; v_ngay date; v_e jsonb; v_u uuid; v_r int := 0; v_top boolean; v_lvl int; v_n int := 0; v_g int; v_per int; v_tieu text;
  v_gems text[] := array['hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc']; i int; v_k int;
begin
  if v_khoa is null or p_ts is null or p_ds is null or p_ky is null or length(p_ds) > 400000 then raise exception 'sai' using errcode = '42501'; end if;
  if abs(extract(epoch from now()) * 1000 - p_ts) > 120000 then raise exception 'het_gio' using errcode = '42501'; end if;
  if encode(extensions.hmac(p_ts::text || '.' || p_ds, v_khoa, 'sha256'), 'hex') <> lower(p_ky) then raise exception 'sai_ky' using errcode = '42501'; end if;
  v_ds := p_ds::jsonb; v_ngay := (v_ds ->> 'ngay')::date;
  insert into public.p2d_mang_dot (ngay) values (v_ngay) on conflict do nothing;
  if not found then raise exception 'da_phat' using errcode = '42501'; end if;
  for v_e in select * from jsonb_array_elements(v_ds -> 'd') limit 5000 loop
    begin v_u := (v_e ->> 0)::uuid; exception when others then continue; end;
    if coalesce((v_e ->> 1)::numeric, 0) <= 0 then continue; end if;
    if not exists (select 1 from auth.users u where u.id = v_u and (u.banned_until is null or u.banned_until < now())) then continue; end if;
    v_r := v_r + 1; v_top := v_r <= (t ->> 'top')::int;
    select greatest(0, coalesce(canh_gioi, 0) * 9 + coalesce(tang, 1) - 1) into v_lvl from public.p2d_nhan_vat where user_id = v_u;
    v_tieu := case when v_top then 'Top ' || v_r || ' sát thương Thôn Thiên Mãng' else 'Tham gia chém Thôn Thiên Mãng' end;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_u, jsonb_build_object(
      'coins', (t ->> case when v_top then 'top_lt' else 'all_lt' end)::int,
      'item', public.p2d_mang_do((t ->> case when v_top then 'top_tier' else 'all_tier' end)::int, coalesce(v_lvl, 0), t ->> case when v_top then 'top_rarity' else 'all_rarity' end),
      'tieu_de', v_tieu), 'thon_thien_mang_tk');
    v_g := (t ->> case when v_top then 'top_gems' else 'all_gems' end)::int; v_per := v_g / 4;
    for i in 1 .. 4 loop
      v_k := v_per + case when i <= v_g - v_per * 4 then 1 else 0 end;
      if v_k > 0 then insert into public.p2d_hom_thu (user_id, noi_dung, ly_do) values (v_u, jsonb_build_object('gem', jsonb_build_object('key', v_gems[i] || ':' || coalesce(t ->> 'gem_lv', '1'), 'n', v_k), 'tieu_de', v_tieu), 'thon_thien_mang_tk'); end if;
    end loop;
    v_n := v_n + 1;
  end loop;
  update public.p2d_mang_dot set so_nguoi = v_n where ngay = v_ngay;
  return v_n;
end;
$$;
revoke all on function public.p2d_mang_tong_ket(bigint, text, text) from public;
grant execute on function public.p2d_mang_tong_ket(bigint, text, text) to anon, authenticated;
