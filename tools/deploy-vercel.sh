#!/usr/bin/env bash
# Đưa game lên Vercel (dự án pixel-2d-tu-tien, https://pixel-2d-tu-tien.vercel.app), chỗ chứa tạm khi GitHub Pages không dùng được
# (GitHub khoá tài khoản 07/11/2026). Cần Vercel CLI đã đăng nhập (vercel login). Chạy: bash tools/deploy-vercel.sh [thư mục tạm]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-/tmp/p2d-site}"
bash tools/build-site.sh "$OUT"
cd "$OUT"
vercel link --yes --project pixel-2d-tu-tien >/dev/null
vercel deploy --prod --yes
