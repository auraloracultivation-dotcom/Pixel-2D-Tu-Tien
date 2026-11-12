"""Hình hiệu ứng chiêu vẽ bằng PixelFX (chủ dự án 13/11/2026 01:53: thay toàn bộ hình chiêu ảnh GPT).

PixelFX (github.com/patch-gg/pixelfx, MIT, bản ghim PIN) vẽ mỗi hiệu ứng bằng code, đổi màu bằng bảng màu. Công cụ này:
1. Đọc data/vfx.json → pfx: tên hình → [mã hiệu ứng, bảng màu PAL, tuỳ chọn {fps, span, down, opts}].
2. Gọi `node <pixelfx>/tools/render.mjs <mã> --sheet --opts {...}` (khung 30 hình/giây, nền trong suốt).
3. Giữ phần đầu `span`, lấy mẫu về `fps` (mặc định 15), tối đa MAXF khung; cắt khung chung theo vùng có hình; thu nhỏ `down`.
4. Lưu dải ngang vào tools/art/nguon/pfx/<tên>.png + meta.json (nguồn để build.py dựng lại không cần Node), rồi
   assets/art/pfx-<tên>.png và mục 'pfx.<tên>' trong data/art.json (anchor = điểm gốc hiệu ứng: tâm, chân, đầu đạn).

Chạy: python3 -I tools/art/vfx_pfx.py [tên ...]   (PIXELFX_DIR=thư mục bản PixelFX; không có thì tự clone bản PIN vào nguon/pfx/src)
build.py gọi build(save) để đưa các dải đã dựng vào bảng hình như mọi hình khác."""
import hashlib, json, os, re, subprocess, sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
NGUON = Path(__file__).resolve().parent / 'nguon' / 'pfx'
PIN = '5294518ce7c72e48b6100a744596e0acf57f2826'
REPO = 'https://github.com/patch-gg/pixelfx'
MAXF = 24


def pixelfx_dir():
    d = Path(os.environ.get('PIXELFX_DIR') or NGUON / 'src')
    if not (d / 'tools' / 'render.mjs').exists():
        subprocess.run(['git', 'clone', '-q', REPO, str(d)], check=True)
        subprocess.run(['git', '-C', str(d), 'checkout', '-q', PIN], check=True)
    return d


def palettes(d):
    src = (d / 'src' / 'core' / 'color.js').read_text(encoding='utf-8')
    body = src[src.index('export const PAL = {'):]
    body = body[:body.index('};')]
    return {m.group(1): re.findall(r'"(#[0-9a-fA-F]{3,6})"', m.group(2)) for m in re.finditer(r'(\w+):\s*\[([^\]]*)\]', body)}


def render(d, name, fx, pal, o):
    opts = {'palette': pal, **(o.get('opts') or {})}
    subprocess.run(['node', 'tools/render.mjs', fx, '--sheet', '--opts', json.dumps(opts)], cwd=d, check=True, capture_output=True)
    base = fx.split('/')[-1]
    meta = json.loads((d / 'records' / fx / f'{base}.json').read_text(encoding='utf-8'))
    sheet = Image.open(d / 'records' / fx / f'{base}.png').convert('RGBA')
    P = meta['meta']['pixelfx']
    fw, fh = P['frameSize']
    frames = [sheet.crop((f['frame']['x'], f['frame']['y'], f['frame']['x'] + fw, f['frame']['y'] + fh)) for f in meta['frames']]
    keep = max(1, round(len(frames) * o.get('span', 1)))
    fps = o.get('fps', 15)
    step = max(1, round(P['fps'] / fps))
    pick = frames[:keep:step]
    if len(pick) > MAXF:   # quá dài: lấy đều MAXF khung
        pick = [pick[round(i * (len(pick) - 1) / (MAXF - 1))] for i in range(MAXF)]
        fps = max(1, round(len(pick) / (keep / P['fps'])))
    box = None
    for im in pick:   # vùng có hình chung mọi khung (bỏ viền trong suốt)
        b = im.getchannel('A').point(lambda a: 255 if a > 6 else 0).getbbox()
        if b:
            box = b if box is None else (min(box[0], b[0]), min(box[1], b[1]), max(box[2], b[2]), max(box[3], b[3]))
    box = box or (0, 0, fw, fh)
    k = o.get('down', 1)
    w, h = box[2] - box[0], box[3] - box[1]
    W, H = max(1, round(w * k)), max(1, round(h * k))
    strip = Image.new('RGBA', (W * len(pick), H))
    for i, im in enumerate(pick):
        c = im.crop(box)
        if k != 1:
            c = c.resize((W, H), Image.LANCZOS)
        strip.alpha_composite(c, (i * W, 0))
    ax, ay = P.get('pivot', [fw / 2, fh / 2])
    NGUON.mkdir(parents=True, exist_ok=True)
    strip.save(NGUON / f'{name}.png', optimize=True)
    return {'w': W, 'h': H, 'frames': len(pick), 'anchor': [round((ax - box[0]) * k), round((ay - box[1]) * k)],
            'fps': fps, 'loop': bool(P.get('loop')), 'fx': fx}


def build(save=None):
    """Đưa dải đã dựng (nguon/pfx) vào data/art.json. save: hàm của build.py; không có thì ghi thẳng art.json."""
    meta = json.loads((NGUON / 'meta.json').read_text(encoding='utf-8')) if (NGUON / 'meta.json').exists() else {}
    art_p = ROOT / 'data' / 'art.json'
    art = json.loads(art_p.read_text(encoding='utf-8'))
    out = ROOT / 'assets' / 'art'
    for name, m in sorted(meta.items()):
        png = NGUON / f'{name}.png'
        if not png.exists():
            continue
        dst = out / f'pfx-{name}.png'
        dst.write_bytes(png.read_bytes())
        v = hashlib.sha1(dst.read_bytes()).hexdigest()[:8]
        art['sprites'][f'pfx.{name}'] = {'file': f'assets/art/pfx-{name}.png', 'v': v, 'w': m['w'], 'h': m['h'], 'frames': m['frames'],
                                         'anchor': m['anchor'], 'fps': m['fps'], 'loop': m['loop'],
                                         'note': f"hiệu ứng chiêu {name}: PixelFX {m['fx']} (MIT), tools/art/vfx_pfx.py"}
    art['sprites'] = dict(sorted(art['sprites'].items()))
    art_p.write_text(json.dumps(art, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    return len(meta)


def main(only):
    d = pixelfx_dir()
    pal = palettes(d)
    spec = json.loads((ROOT / 'data' / 'vfx.json').read_text(encoding='utf-8'))['pfx']
    meta_p = NGUON / 'meta.json'
    meta = json.loads(meta_p.read_text(encoding='utf-8')) if meta_p.exists() else {}
    for name, row in spec.items():
        if name.startswith('_') or (only and name not in only):
            continue
        fx, p = row[0], row[1]
        o = row[2] if len(row) > 2 else {}
        meta[name] = render(d, name, fx, pal[p] if isinstance(p, str) else p, o)
        print(name, fx, p, f"{meta[name]['frames']}f {meta[name]['w']}x{meta[name]['h']}")
    NGUON.mkdir(parents=True, exist_ok=True)
    meta_p.write_text(json.dumps(meta, ensure_ascii=False, indent=1) + '\n', encoding='utf-8')
    print('đưa vào art.json:', build())


if __name__ == '__main__':
    main(set(sys.argv[1:]))
