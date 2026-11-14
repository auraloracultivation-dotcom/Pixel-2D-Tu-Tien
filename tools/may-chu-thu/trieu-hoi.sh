#!/bin/bash
# Máy chủ thử cho triệu hồi chia bậc (docs/10-CAI-HON.md việc 6 dòng 18a): dựng một PostgreSQL tạm trong máy làm việc, KHÔNG đụng máy chủ thật.
# Nạp lược đồ tối thiểu + bảng quà cũ, áp migration triệu hồi mới nhất, quay thử rồi in tỉ lệ từng bậc, chuỗi bảo hiểm, Linh Thạch mỗi lượt.
#   bash tools/may-chu-thu/trieu-hoi.sh [số mẻ=100] [lượt mỗi mẻ=2000] [tệp migration]
# Cần PostgreSQL 16 (initdb, pg_ctl, psql; PGBIN=<thư mục bin>). Đang là root thì script tự chạy các lệnh bằng người dùng postgres.
set -e
N=${1:-100}; M=${2:-2000}; HERE=$(cd "$(dirname "$0")/../.." && pwd)
MIG=${3:-$(ls "$HERE"/supabase/migrations/*_p2d_trieu_hoi_bac*.sql | tail -1)}
BIN=${PGBIN:-/usr/lib/postgresql/16/bin}; PORT=${PGPORT_THU:-54331}
RUN=""; BASE=${TMPDIR:-/tmp}
if [ "$(id -u)" = 0 ]; then RUN="runuser -u postgres --"; BASE=/var/lib/postgresql; fi
DIR=$(mktemp -d "$BASE/pgthu-XXXXXX"); [ -n "$RUN" ] && chown postgres:postgres "$DIR"
WORK=$(mktemp -d); cp "$HERE"/tools/may-chu-thu/*.sql "$MIG" "$WORK"/; chmod -R a+rX "$WORK"
trap '$RUN "$BIN"/pg_ctl -D "$DIR/data" -m immediate stop >/dev/null 2>&1; rm -rf "$DIR" "$WORK"' EXIT
$RUN "$BIN"/initdb -D "$DIR/data" -A trust -U postgres >/dev/null
$RUN "$BIN"/pg_ctl -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=''" -w start >/dev/null
Q="$RUN $BIN/psql -h $DIR -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"
$Q -f "$WORK/luoc-do-trieu-hoi.sql" >/dev/null
$Q -f "$WORK/$(basename "$MIG")" >/dev/null
$Q -f "$WORK/thu-trieu-hoi.sql" >/dev/null
for i in $(seq 1 "$N"); do $Q -At -c "select public.thu($M, '00000000-0000-0000-0000-000000000001')"; done > "$WORK/kq.jsonl"
$Q -At -c "select 'trạng thái: ' || (select row_to_json(d) from (select diem, so_lan, bh2, bh3 from public.p2d_ht_diem where user_id = '00000000-0000-0000-0000-000000000001') d)"
python3 - "$WORK/kq.jsonl" "$(basename "$MIG")" <<'PY'
import json, sys
R = [json.loads(l) for l in open(sys.argv[1]) if l.strip()]
n = sum(r['n'] for r in R); bac = [sum(r['bac'][i] for r in R) for i in range(5)]
print(f"{sys.argv[2]}: {n:,} lượt".replace(',', '.'))
print('tỉ lệ từng bậc (Thường / Khá / Hiếm / Cực hiếm / Truyền thuyết): ' + ' / '.join(f"{b / n * 100:.3f}%" for b in bac))
lon = sum(r['sau_giai_lon'] for r in R)
print(f"sáu giải lớn: {lon} lần = {lon / n * 100:.3f}%" + (f", {n / lon:.0f} lượt một lần" if lon else ''))
print('chuỗi dài nhất không ra Hiếm trở lên:', max(r['max_lien_khong_hiem'] for r in R), '· không ra Cực hiếm trở lên:', max(r['max_lien_khong_cuc'] for r in R))
print('Linh Thạch mỗi lượt (trước bạo kích):', round(sum(r['coins_goc_moi_luot'] * r['n'] for r in R) / n), '· lần báo kênh thế giới:', sum(r['loa'] for r in R), '· món đã có đổi ra Linh Thạch:', sum(r['doi'] for r in R))
PY
