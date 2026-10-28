-- Tổng hợp mỗi giờ gửi email cho chủ dự án (chủ dự án xin 29/10/2026: "tự động cập nhật báo lỗi, đề xuất + bất thường trên máy chủ, gửi qua email").
-- Việc định kỳ của Claude gọi p2d_tong_hop() lấy mọi thứ mới từ mốc lần gửi trước: báo lỗi / đề xuất, cờ chống gian lận
-- (p2d_nghi_van), lỗi JavaScript máy người chơi (p2d_loi), báo cáo chat, số người chơi, tài khoản mới; gửi email xong thì
-- p2d_dat_moc('email', den) dời mốc. Chỉ Claude (qua công cụ quản trị cơ sở dữ liệu) gọi được, máy khách không có quyền.

create table if not exists public.p2d_theo_doi (
  khoa text primary key,
  luc timestamptz not null
);
alter table public.p2d_theo_doi enable row level security;
revoke all on public.p2d_theo_doi from anon, authenticated;

create or replace function public.p2d_tong_hop(p_khoa text default 'email')
returns jsonb language sql stable security definer set search_path = ''
as $$
  with m as (select coalesce((select luc from public.p2d_theo_doi where khoa = p_khoa), now() - interval '1 hour') as tu, now() as den)
  select jsonb_build_object(
    'tu', m.tu, 'den', m.den,
    'gop_y', (select coalesce(jsonb_agg(jsonb_build_object('id', g.id, 'loai', g.loai, 'tieu_de', g.tieu_de, 'mo_ta', left(g.mo_ta, 160),
                'ten', public.p2d_ten_nguoi(g.user_id), 'trang_thai', g.trang_thai, 'luc', g.tao_luc) order by g.id), '[]'::jsonb)
              from public.p2d_gop_y g where g.tao_luc > m.tu and g.tao_luc <= m.den),
    'nghi_van', (select coalesce(jsonb_agg(x order by (x ->> 'lan')::int desc), '[]'::jsonb) from (
                 select jsonb_build_object('ten', public.p2d_ten_nguoi(v.user_id), 'ly_do', string_agg(distinct v.ly_do, ', '), 'lan', count(*),
                        'canh_gioi', max(n.canh_gioi), 'tong_co', max(n.nghi_van)) x
                   from public.p2d_nghi_van v left join public.p2d_nhan_vat n on n.user_id = v.user_id
                  where v.luc > m.tu and v.luc <= m.den and v.ly_do <> 'do_da_rao'
                  group by v.user_id) s),
    'loi_js', (select coalesce(jsonb_agg(jsonb_build_object('tin', left(l.tin, 160), 'lan', l.lan, 'ban', left(l.ban, 60), 'may', left(l.may, 80)) order by l.cuoi desc), '[]'::jsonb)
               from (select * from public.p2d_loi where cuoi > m.tu and cuoi <= m.den order by cuoi desc limit 15) l),
    'bao_cao_chat', (select coalesce(jsonb_agg(jsonb_build_object('ly_do', b.ly_do, 'kenh', b.kenh, 'noi_dung', left(b.noi_dung, 120), 'bi_bao', public.p2d_ten_nguoi(b.bi_bao)) order by b.id), '[]'::jsonb)
                     from public.p2d_bao_cao b where b.luc > m.tu and b.luc <= m.den),
    'nguoi_choi', (select count(*) from public.p2d_nhan_vat where luu_luc > m.tu),
    'tai_khoan_moi', (select count(*) from auth.users where created_at > m.tu and created_at <= m.den),
    'gop_y_cho', (select count(*) from public.p2d_gop_y where trang_thai in ('moi', 'dang_xem'))
  ) from m
$$;
revoke all on function public.p2d_tong_hop(text) from public, anon, authenticated;

create or replace function public.p2d_dat_moc(p_khoa text, p_luc timestamptz)
returns void language sql security definer set search_path = ''
as $$
  insert into public.p2d_theo_doi (khoa, luc) values (p_khoa, p_luc) on conflict (khoa) do update set luc = excluded.luc
$$;
revoke all on function public.p2d_dat_moc(text, timestamptz) from public, anon, authenticated;
