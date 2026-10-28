-- Quà chia sẻ clip (data/record.json "share", chủ dự án xin 28/10/2026): người chơi đăng clip công khai lên TikTok/YouTube
-- có tag, dán link; hàm Edge chia-se-clip hỏi oEmbed để chắc bài công khai rồi gọi p2d_qua_chia_se (chỉ service_role gọi được)
-- để cộng 1 viên ngọc cấp 5 vào bản lưu. Mỗi tài khoản nhận một lần, mỗi bài đăng chỉ dùng một lần.
-- Cấp ngọc 5 phải khớp data/record.json share.gem_level.

create table if not exists public.p2d_chia_se (
  id        bigint generated always as identity primary key,
  user_id   uuid references auth.users (id) on delete set null,   -- xoá tài khoản vẫn giữ bài đã dùng
  bai       text not null unique,           -- 'tiktok:<mã video>' hoặc 'youtube:<mã video>'
  link      text not null,
  tac_gia   text,
  ngoc      text not null,
  luc       timestamptz not null default now()
);
create unique index if not exists p2d_chia_se_user_idx on public.p2d_chia_se (user_id) where user_id is not null;
comment on table public.p2d_chia_se is 'Quà chia sẻ clip: ai đã nhận, bằng bài đăng nào. Ghi qua p2d_qua_chia_se (hàm Edge chia-se-clip).';

alter table public.p2d_chia_se enable row level security;
revoke all on table public.p2d_chia_se from anon, authenticated;

create or replace function public.p2d_qua_chia_se(p_uid uuid, p_bai text, p_link text, p_tac_gia text, p_loai text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_nv  public.p2d_nhan_vat%rowtype;
  v_key text := p_loai || ':5';
  v_gems jsonb;
begin
  if p_loai is null or p_loai not in ('hong-ngoc', 'lam-ngoc', 'hoang-ngoc', 'luc-ngoc') then
    raise exception 'loai_sai' using errcode = '22023';
  end if;
  if p_bai is null or p_bai !~ '^(tiktok|youtube):[A-Za-z0-9_-]{5,40}$' then
    raise exception 'link_sai' using errcode = '22023';
  end if;
  select * into v_nv from public.p2d_nhan_vat where user_id = p_uid for update;
  if not found then raise exception 'chua_luu' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_chia_se where user_id = p_uid) then raise exception 'da_nhan' using errcode = '22023'; end if;
  if exists (select 1 from public.p2d_chia_se where bai = p_bai) then raise exception 'link_da_dung' using errcode = '22023'; end if;

  insert into public.p2d_chia_se (user_id, bai, link, tac_gia, ngoc)
  values (p_uid, p_bai, left(p_link, 300), left(p_tac_gia, 80), v_key);

  v_gems := case when jsonb_typeof(v_nv.data -> 'gems') = 'object' then v_nv.data -> 'gems' else '{}'::jsonb end;
  v_gems := jsonb_set(v_gems, array[v_key], to_jsonb(coalesce(case when jsonb_typeof(v_gems -> v_key) = 'number' then (v_gems ->> v_key)::numeric end, 0) + 1));
  v_nv.data := jsonb_set(v_nv.data, '{gems}', v_gems) || jsonb_build_object('quaChiaSe', true);
  update public.p2d_nhan_vat set data = v_nv.data, phien_ban = phien_ban + 1, updated_at = now()
   where user_id = p_uid returning phien_ban into v_nv.phien_ban;
  return jsonb_build_object('gem', v_key, 'phien_ban', v_nv.phien_ban);
end;
$$;

revoke all on function public.p2d_qua_chia_se(uuid, text, text, text, text) from public, anon, authenticated;
grant execute on function public.p2d_qua_chia_se(uuid, text, text, text, text) to service_role;
