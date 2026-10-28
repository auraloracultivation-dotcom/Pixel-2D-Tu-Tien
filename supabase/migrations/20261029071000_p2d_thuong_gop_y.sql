-- Thưởng người báo lỗi, đề xuất (chủ dự án chốt 29/10/2026 07:28): mỗi vấn đề được nhận (trạng thái 'da_sua' hoặc 'se_lam')
-- thưởng 1 viên ngọc cấp 4 qua Hòm thư, loại ngọc theo lựa chọn của người chơi (p2d_gt_ngoc, mặc định Hồng Ngọc). Trùng, rác,
-- chưa sửa được thì không thưởng. Mỗi báo cáo thưởng một lần (thuong_luc). Bảng vinh danh: p2d_bxh_gop_y (top 20 theo số vấn đề
-- được nhận). Các báo cáo đã sửa trước đó được thưởng bù khi chạy migration này.

alter table public.p2d_gop_y add column if not exists thuong_luc timestamptz;

create or replace function public.p2d_gop_y_thuong()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare v_loai text;
begin
  if new.trang_thai in ('da_sua', 'se_lam') and new.thuong_luc is null and new.user_id is not null then
    select loai into v_loai from public.p2d_gt_ngoc where user_id = new.user_id;
    insert into public.p2d_hom_thu (user_id, noi_dung, ly_do)
    values (new.user_id, jsonb_build_object('gem', jsonb_build_object('key', coalesce(v_loai, 'hong-ngoc') || ':4', 'n', 1),
                                            'tieu_de', left(new.tieu_de, 60), 'loai', new.loai), 'gop_y');
    new.thuong_luc := now();
  end if;
  return new;
end;
$$;
revoke all on function public.p2d_gop_y_thuong() from public, anon, authenticated;

drop trigger if exists p2d_gop_y_thuong on public.p2d_gop_y;
create trigger p2d_gop_y_thuong before update of trang_thai on public.p2d_gop_y
  for each row execute function public.p2d_gop_y_thuong();

-- Thưởng bù các báo cáo đã được nhận trước khi có luật này
update public.p2d_gop_y set trang_thai = trang_thai where trang_thai in ('da_sua', 'se_lam') and thuong_luc is null;

-- Bảng vinh danh người góp ý: top 20 theo số vấn đề được nhận (bằng nhau thì ai được nhận trước đứng trên)
create or replace function public.p2d_bxh_gop_y()
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_uid uuid := public.p2d_uid();
begin
  return jsonb_build_object(
    'top', (select coalesce(jsonb_agg(jsonb_build_object('hang', x.hang, 'ten', x.ten, 'loi', x.loi, 'de_xuat', x.dx, 'tong', x.tong,
              'la_toi', x.user_id = v_uid) order by x.hang), '[]'::jsonb)
            from (select g.user_id, public.p2d_ten_nguoi(g.user_id) ten, count(*) filter (where g.loai = 'loi') loi,
                         count(*) filter (where g.loai = 'de_xuat') dx, count(*) tong,
                         row_number() over (order by count(*) desc, min(g.thuong_luc)) hang
                    from public.p2d_gop_y g where g.thuong_luc is not null and g.user_id is not null
                   group by g.user_id order by count(*) desc, min(g.thuong_luc) limit 20) x),
    'toi', (select jsonb_build_object('tong', count(*) filter (where thuong_luc is not null), 'cho', count(*) filter (where trang_thai in ('moi', 'dang_xem')))
              from public.p2d_gop_y where user_id = v_uid),
    'cap', 4);
end;
$$;
revoke all on function public.p2d_bxh_gop_y() from public, anon;
grant execute on function public.p2d_bxh_gop_y() to authenticated;
