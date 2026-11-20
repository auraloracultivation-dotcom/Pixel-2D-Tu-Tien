#!/usr/bin/env bash
# Gói game vào thư mục $1 (mặc định _site) để đưa lên chỗ khác GitHub Pages (Vercel: tools/deploy-vercel.sh), ví dụ lúc GitHub khoá
# tài khoản 07/11/2026. Việc gói do tools/goi.mjs làm (dùng chung với .github/workflows/pages.yml từ 20/11/2026: JS vài tệp, dữ liệu
# một tệp, CSS gộp, gắn số phiên bản). esbuild: biến ESBUILD, hoặc bản đi kèm Vercel CLI; không có thì goi.mjs chép từng tệp như cũ.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"
node tools/check.mjs
VES="$(npm root -g 2>/dev/null)/vercel/node_modules/@esbuild/linux-x64/bin/esbuild"
if [ -z "${ESBUILD:-}" ] && [ -x "$VES" ]; then export ESBUILD="$VES"; fi
node tools/goi.mjs "$OUT"
printf '.env*\n.vercel\n' > "$OUT/.vercelignore"   # không bao giờ đưa khoá (vercel env pull) lên trang công khai
echo "built $OUT"
