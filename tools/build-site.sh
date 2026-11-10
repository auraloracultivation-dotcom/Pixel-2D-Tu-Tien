#!/usr/bin/env bash
# Gom file chạy game vào thư mục $1 (mặc định _site) và gắn số phiên bản, giống .github/workflows/pages.yml.
# Dùng khi đưa game lên chỗ khác GitHub Pages (Vercel: tools/deploy-vercel.sh), ví dụ lúc GitHub khoá tài khoản 07/11/2026.
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-_site}"; V="$(git rev-parse --short=8 HEAD)"
node tools/check.mjs
rm -rf "$OUT"; mkdir -p "$OUT"
cp -r index.html privacy.html terms.html xoa-tai-khoan.html legal.css style.css style-khung.css style-ui-kit.css style-ui-kit2.css style-ui-kit3.css style-ui-hoa-dao.css style-ui-icon.css style-ui-x.css style-man-dau.css manifest.webmanifest sw.js robots.txt sitemap.xml src data "$OUT"/
[ -d assets ] && cp -r assets "$OUT"/ || true
cd "$OUT"
find src -name '*.js' -exec perl -pi -e "s#((?:from\s+|import\()\s*['\"])(\.{1,2}/[^'\"]+?\.js)(['\"])#\$1\$2?v=$V\$3#g" {} +
perl -pi -e "s#src/main\.js#src/main.js?v=$V#; s#style\.css#style.css?v=$V#; s#style-man-dau\.css#style-man-dau.css?v=$V#; s#src/ui/man-dau\.js#src/ui/man-dau.js?v=$V#" index.html
perl -pi -e "s#(style-[a-z0-9-]+\.css)#\$1?v=$V#g" style.css
sed -i "s#const BUILD = 'dev'#const BUILD = '$V'#" src/core/data.js
node -e "const fs=require('fs');const src=fs.readFileSync('src/core/data.js','utf8');const F=JSON.parse(src.match(/const FILES = (\[[^\]]*\])/)[1].replace(/'/g,'\"'));const d={maps:{}};for(const f of F)d[f]=JSON.parse(fs.readFileSync('data/'+f+'.json','utf8'));for(const id of d.config.maps)d.maps[id]=JSON.parse(fs.readFileSync('data/maps/'+id+'.json','utf8'));fs.writeFileSync('data/_all.json',JSON.stringify(d))"   # gộp data một file (src/core/data.js)
sed -i "s#const V = 'dev'#const V = '$V'#" sw.js
printf '.env*\n.vercel\n' > .vercelignore   # không bao giờ đưa khoá (vercel env pull) lên trang công khai
echo "built $OUT ($V)"
