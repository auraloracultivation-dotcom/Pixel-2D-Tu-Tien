# Sinh migration Mốc quà (python3 tools/moc-sql.py > supabase/migrations/<tên>.sql): chép data/he-thong.json → moc thành nhiệm vụ hệ thống
# trên máy chủ (p2d_ht_nv, id moc-*), thêm điều kiện kills / choi / trieu vào p2d_ht_dk, và p2d_ht_xong đưa giờ chơi, số lần triệu hồi
# của chính máy chủ vào bản lưu trước khi xét (người chơi không tự ghi được hai số đó). Đổi bảng mốc thì chạy lại thành migration mới.
import json, re, sys
H = json.load(open('data/he-thong.json', encoding='utf-8'))
q = lambda s: "'" + str(s).replace("'", "''") + "'"
SERVER = {'coins', 'mat', 'gem', 'pill', 'gear'}   # qi_pct: máy khách cộng (linh khí theo tầng), máy chủ bỏ qua
def dk(k, n):
  return {'kills': {'kills': n}, 'gio': {'choi': n * 3600}, 'trieu': {'trieu': n}, 'realm': {'realm': n}}[k]
rows = []
for g in H['moc']['groups']:
  for i, m in enumerate(g['list']):
    qua = [e for e in m['qua'] if SERVER & set(e)]
    rows.append(f"({q(m['id'])}, {9000 + len(rows)}, {q(json.dumps(dk(g['k'], m['n'])))}::jsonb, {q(json.dumps(qua, ensure_ascii=False))}::jsonb)")
src = open('supabase/migrations/20261112050000_p2d_mua_2.sql', encoding='utf-8').read()
fn_dk = re.search(r'create or replace function public\.p2d_ht_dk\(.*?\n\$\$;', src, re.S).group(0)
fn_dk = fn_dk.replace("  return true;\nend;", """  -- Mốc quà (19/11/2026): số quái trong bản lưu, chặn trên 6 quái mỗi giây chơi (sửa bản lưu không ăn hết mốc); giờ chơi, số lần
  -- triệu hồi do p2d_ht_xong đưa vào từ bảng của máy chủ (_choi, _trieu)
  if dk ? 'kills' and least(case when jsonb_typeof(d -> 'stats' -> 'kills') = 'number' then (d -> 'stats' ->> 'kills')::numeric else 0 end,
      6 * coalesce((d ->> '_choi')::numeric, 0)) < (dk ->> 'kills')::numeric then return false; end if;
  if dk ? 'choi' and coalesce((d ->> '_choi')::numeric, 0) < (dk ->> 'choi')::numeric then return false; end if;
  if dk ? 'trieu' and coalesce((d ->> '_trieu')::numeric, 0) < (dk ->> 'trieu')::numeric then return false; end if;
  return true;
end;""")
assert '_trieu' in fn_dk
src2 = open('supabase/migrations/20261106110000_p2d_he_thong_tan_thu.sql', encoding='utf-8').read()
fn_x = re.search(r'create or replace function public\.p2d_ht_xong\(.*?\n\$\$;', src2, re.S).group(0)
old = "  select data into v_d from public.p2d_nhan_vat where user_id = v_uid;\n"
assert old in fn_x
fn_x = fn_x.replace(old, """  select data || jsonb_build_object('_choi', choi_giay, '_trieu', v_row.so_lan) into v_d from public.p2d_nhan_vat where user_id = v_uid;
""")
sys.stdout.write(f"""-- Mốc quà (chủ dự án 19/11/2026 03:26): hạ bao nhiêu quái, chơi bao nhiêu giờ, triệu hồi bao nhiêu lần, lên cảnh giới nào thì nhận quà.
-- Sinh bằng tools/moc-sql.py từ data/he-thong.json → moc. Mỗi mốc là một nhiệm vụ hệ thống (id moc-*): nhận một lần, cộng điểm như mọi
-- nhiệm vụ, quà vào Hòm thư (p2d_ht_thuong). Không đổi bảng, không xoá gì.

insert into public.p2d_ht_nv (id, ord, dk, qua) values
{(','+chr(10)).join(rows)}
on conflict (id) do update set ord = excluded.ord, dk = excluded.dk, qua = excluded.qua;

{fn_dk}
revoke all on function public.p2d_ht_dk(jsonb, jsonb) from public, anon, authenticated;

{fn_x}
revoke all on function public.p2d_ht_xong(text, int) from public, anon, authenticated;
""")
