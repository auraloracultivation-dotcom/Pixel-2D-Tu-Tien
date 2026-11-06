# Sinh migration hệ thống quà (python3 tools/he-thong-sql.py > supabase/migrations/<tên>.sql): chép nhiệm vụ, bảng quà và số liệu
# tạo trang bị từ data/ vào máy chủ. Đổi data/he-thong.json (missions, pool) thì chạy lại thành migration mới.
import json, sys
J = lambda f: json.load(open(f'data/{f}.json', encoding='utf-8'))
H, I, E, DL = J('he-thong'), J('items'), J('elements'), J('daily')
q = lambda s: "'" + str(s).replace("'", "''") + "'"
bases = {k: {'slot': v['slot'], 'main': v['main'], 'pool': v['pool']} for k, v in I['bases'].items() if v.get('pool') and not v.get('set') and not v.get('dv')}
cfg = {
  'bases': bases,
  'stats': {k: {'min': v.get('min', 1), 'max': v.get('max', 1), 'pct': bool(v.get('pct'))} for k, v in I['stats'].items() if not k.startswith('_') and isinstance(v, dict)},
  'rar': {r['id']: {'mult': r['mult'], 'sockets': r.get('sockets', 0)} for r in I['rarities']},
  'tiers': [t['mult'] for t in I['line_tiers']['list']],
  'tier_rar': ['pham', 'linh', 'huyen', 'dia', 'thien', 'thien', 'thien'],
  'cap_w': I['line_tiers']['cap_w'], 'main_per_lvl': I['main_per_lvl'], 'line_per_lvl': I['line_per_lvl'],
  'els': [k for k in E if not k.startswith('_')], 'gems': list(I['gems']['types'].keys()),
  'pool': H['pool'], 'cost': H['cost'], 'points': H['points'], 'mail': H['text']['mail'], 'quest_mail': H['text']['quest_mail'],
  'daily': {t['id']: t['n'] for t in DL['pool']}, 'per_day': DL['per_day'],
}
out = sys.stdout
out.write("""-- Hệ Thống Tu Tiên: điểm nhiệm vụ và triệu hồi quà (chủ dự án 06/11/2026 16:49–17:05: hệ thống thay cốt truyện và nhiệm vụ hằng
-- ngày; mỗi nhiệm vụ điểm như nhau, đủ điểm triệu hồi quà ngẫu nhiên như nhau cho mọi người: Linh Thạch, ngọc cấp 1–8, Tẩy Luyện Thạch,
-- trang bị mọi ô phẩm Lục → Thượng Cổ). Sinh bằng tools/he-thong-sql.py từ data/he-thong.json, data/items.json, data/elements.json.
-- p2d_ht_nhan: máy chủ kiểm điều kiện nhiệm vụ trên bản lưu trên máy chủ rồi cộng điểm (mỗi nhiệm vụ một lần).
-- p2d_ht_trieu: trừ điểm, quay bảng quà trên máy chủ, quà vào Hòm thư (ly_do he_thong_qua).

create table if not exists public.p2d_ht_diem (
  user_id uuid primary key,
  diem integer not null default 0,
  xong text[] not null default '{}',
  so_lan integer not null default 0,
  luc timestamptz not null default now()
);
alter table public.p2d_ht_diem enable row level security;
revoke all on table public.p2d_ht_diem from public, anon, authenticated;

create table if not exists public.p2d_ht_nv (id text primary key, ord integer not null, dk jsonb not null);
alter table public.p2d_ht_nv enable row level security;
revoke all on table public.p2d_ht_nv from public, anon, authenticated;

create table if not exists public.p2d_ht_cfg (k text primary key, v jsonb not null);
alter table public.p2d_ht_cfg enable row level security;
revoke all on table public.p2d_ht_cfg from public, anon, authenticated;

create table if not exists public.p2d_ht_lich_su (
  id bigint generated always as identity primary key,
  user_id uuid not null, qua text not null, noi_dung jsonb not null, luc timestamptz not null default now()
);
create index if not exists p2d_ht_lich_su_user_idx on public.p2d_ht_lich_su (user_id, luc desc);
alter table public.p2d_ht_lich_su enable row level security;
revoke all on table public.p2d_ht_lich_su from public, anon, authenticated;

-- Quà từng nhiệm vụ, nhiệm vụ ngày (chủ dự án 06/11/2026 18:03)
alter table public.p2d_ht_nv add column if not exists qua jsonb not null default '[]'::jsonb;
alter table public.p2d_ht_diem add column if not exists ngay date;
alter table public.p2d_ht_diem add column if not exists ngay_xong text[] not null default '{}';

""")
out.write("insert into public.p2d_ht_cfg (k, v) values ('cfg', " + q(json.dumps(cfg, ensure_ascii=False)) + "::jsonb) on conflict (k) do update set v = excluded.v;\n\n")
rows = ",\n".join(f"({q(m['id'])}, {i}, {q(json.dumps(m['dk']))}::jsonb, {q(json.dumps(m.get('qua', []), ensure_ascii=False))}::jsonb)" for i, m in enumerate(H['missions']))
out.write("insert into public.p2d_ht_nv (id, ord, dk, qua) values\n" + rows + "\non conflict (id) do update set ord = excluded.ord, dk = excluded.dk, qua = excluded.qua;\n\n")
out.write(open('tools/he-thong-fn.sql', encoding='utf-8').read())
