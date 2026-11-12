"""Hình hiệu ứng chiêu vẽ bằng PixelFX (chủ dự án 13/11/2026 01:53: bỏ hình chiêu ảnh GPT, làm lại toàn bộ bằng điểm ảnh, "đẹp và chất").

PixelFX (github.com/patch-gg/pixelfx, MIT, bản ghim PIN) vẽ mỗi hiệu ứng bằng code. Quy trình:
1. tools/art/pfx/sprites.mjs: danh sách hình (hiệu ứng PixelFX nào, bảng màu, khoảng thời gian, số hướng).
   tools/art/pfx/fx/*.js: hiệu ứng riêng của game viết theo đúng luật PixelFX (nhìn từ trên xuống, đúng bán kính chiêu).
2. tools/art/pfx/export.mjs (Node) dựng ra tools/art/nguon/pfx/: <tên>.png (lớp màu, điểm ảnh nguyên bản), <tên>.l.png (lớp sáng cộng),
   meta.json (cỡ ô, khung, hướng, điểm neo, nhịp).
3. File này chép các tấm đó vào assets/art/pfx-*.png và ghi mục 'pfx.<tên>' (+ 'pfx.<tên>.l') trong data/art.json:
   w, h cỡ một ô; frames = số cột; rows = số hàng; n khung mỗi hướng; dirs số hướng dựng sẵn (0..90 độ); fps hoặc times; dur; loop;
   anchor điểm neo trong ô; k đơn vị bản đồ mỗi điểm ảnh; lit: có lớp sáng. Game vẽ ở src/render/vfx/pfx.js.

Chạy: python3 -I tools/art/vfx_pfx.py            (chỉ chép + ghi art.json từ nguon/pfx đã dựng; không cần Node)
      python3 -I tools/art/vfx_pfx.py --dung [tên ...]   (gọi export.mjs dựng lại trước; cần PIXELFX_DIR hoặc tự tải bản ghim)"""
import hashlib, json, os, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
NGUON = Path(__file__).resolve().parent / 'nguon' / 'pfx'
PIN = '5294518ce7c72e48b6100a744596e0acf57f2826'
REPO = 'https://github.com/patch-gg/pixelfx'


def pixelfx_dir():
    d = Path(os.environ.get('PIXELFX_DIR') or NGUON / 'src')
    if not (d / 'tools' / 'render.mjs').exists():
        subprocess.run(['git', 'clone', '-q', REPO, str(d)], check=True)
        subprocess.run(['git', '-C', str(d), 'checkout', '-q', PIN], check=True)
    return d


def build(save=None):
    """Đưa các tấm đã dựng (nguon/pfx) vào assets/art và data/art.json. Trả về số hình."""
    meta = json.loads((NGUON / 'meta.json').read_text(encoding='utf-8'))
    art_p = ROOT / 'data' / 'art.json'
    art = json.loads(art_p.read_text(encoding='utf-8'))
    out = ROOT / 'assets' / 'art'
    for k in [k for k in art['sprites'] if k.startswith('pfx.')]:
        if k.split('.')[1] not in meta:
            (ROOT / art['sprites'][k]['file']).unlink(missing_ok=True)
        del art['sprites'][k]

    def put(src, dst):
        b = (NGUON / src).read_bytes()
        (out / dst).write_bytes(b)
        return hashlib.sha1(b).hexdigest()[:8]

    for name, m in sorted(meta.items()):
        e = {'file': f'assets/art/pfx-{name}.png', 'v': put(f'{name}.png', f'pfx-{name}.png'), 'w': m['w'], 'h': m['h'], 'frames': m['cols'], 'rows': m['rows'],
             'n': m['n'], 'dirs': m['dirs'], 'fps': m['fps'], 'dur': m['dur'], 'loop': m['loop'], 'anchor': m['anchor'], 'k': m['k']}
        if m.get('times'):
            e['times'] = m['times']
        if m.get('lit'):
            L = m['lit']
            e['lit'] = 1
            art['sprites'][f'pfx.{name}.l'] = {'file': f'assets/art/pfx-{name}-l.png', 'v': put(f'{name}.l.png', f'pfx-{name}-l.png'), 'w': L['w'], 'h': L['h'],
                                              'frames': m['cols'], 'rows': m['rows'], 's': L['s'], 'anchor': [0, 0], 'note': f'lớp sáng của pfx.{name}'}
        e['note'] = f"hiệu ứng chiêu {name}: PixelFX {m['fx']} (MIT), tools/art/pfx/"
        art['sprites'][f'pfx.{name}'] = e
    art['sprites'] = dict(sorted(art['sprites'].items()))
    art_p.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return len(meta)


if __name__ == '__main__':
    a = sys.argv[1:]
    if a and a[0] == '--dung':
        subprocess.run(['node', str(ROOT / 'tools' / 'art' / 'pfx' / 'export.mjs'), *a[1:]], check=True, env={**os.environ, 'PIXELFX_DIR': str(pixelfx_dir())})
    print('pfx → art.json:', build(), 'hình')
