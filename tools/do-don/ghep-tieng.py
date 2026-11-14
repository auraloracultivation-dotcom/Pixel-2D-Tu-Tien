# Ghép khung hình + tiếng thành mp4 (cần ffmpeg, numpy, scipy): python3 -I tools/do-don/ghep-tieng.py <thư mục các đoạn của quay-canh.mjs> <thư mục wav> <thư mục ra> [gain]
# Thư mục wav: node tools/sfx-check.mjs --wav <thư mục> (dựng từng tiếng của game ra file).
# Tiếng: mỗi sự kiện [giờ game, tên, âm lượng] của sfx.json → cộng file wav của tiếng đó vào đúng mốc (bỏ lần lặp sát nhau như audio.js: rec.gap),
# thêm vang như game (ConvolverNode: nhiễu tắt dần 1,4 giây, chuẩn hoá theo công thức Web Audio) theo rec.rev.
import sys, json, wave, os, subprocess, glob
import numpy as np
from scipy.signal import fftconvolve
raw, wavd, out = sys.argv[1:4]; GAIN = float(sys.argv[4]) if len(sys.argv) > 4 else None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'data') + '/'
REC = {**json.load(open(ROOT + 'sounds.json'))['sfx'], **json.load(open(ROOT + 'tieng-chieu.json'))['sfx']}
SR = 44100
rng = np.random.default_rng(7)
n = int(SR * 1.4); env = (1 - np.arange(n) / n) ** 4
IR = np.stack([(rng.random(n) * 2 - 1) * env, (rng.random(n) * 2 - 1) * env])
IR *= 0.00125 / np.sqrt((IR ** 2).sum() / IR.size)   # chuẩn hoá của ConvolverNode (normalize = true)
cache = {}
def snd(name):
    if name not in cache:
        w = wave.open(f"{wavd}/{name}.wav"); assert w.getframerate() == SR and w.getnchannels() == 1
        cache[name] = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    return cache[name]
os.makedirs(out, exist_ok=True)
mixes = {}
for d in sorted(glob.glob(raw + '/*/')):
    name = os.path.basename(d.rstrip('/')); J = json.load(open(d + 'sfx.json')); T = J['n'] / J['fps']
    L = int((T + 1.6) * SR); dry = np.zeros(L); wet = np.zeros((2, L)); last = {}
    for t, s, v in J['log']:
        r = REC.get(s)
        if isinstance(r, list): r = {}
        if r is None or not os.path.exists(f"{wavd}/{s}.wav"): continue
        if s in last and t - last[s] < r.get('gap', 0.045): continue
        last[s] = t
        x = snd(s) * v * r.get('gain', 1); i = int(t * SR); m = min(len(x), L - i)
        if m <= 0: continue
        dry[i:i + m] += x[:m]
        if r.get('rev'):
            for c in range(2):
                y = fftconvolve(x, IR[c]) * r['rev']; k = min(len(y), L - i); wet[c, i:i + k] += y[:k]
    mixes[name] = (np.stack([dry + wet[0], dry + wet[1]]), T)
peak = max(np.abs(m).max() for m, _ in mixes.values()) or 1
g = GAIN or 0.89 / peak
print('đỉnh thô', round(peak, 3), '→ nhân', round(g, 3))
for name, (m, T) in mixes.items():
    L = int((T + 0.6) * SR); x = m[:, :L] * g; x[:, -int(0.25 * SR):] *= np.linspace(1, 0, int(0.25 * SR))   # đuôi vang tắt dần cho khỏi cụt
    x = np.clip(x, -1, 1)
    w = wave.open(f"{out}/{name}.wav", 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes((x.T * 32767).astype(np.int16).tobytes()); w.close()
    # hình dừng thêm 0,9 giây ở khung cuối cho tiếng ngân hết rồi mới lặp
    jpg = os.path.exists(f"{raw}/{name}/f-0001.jpg")   # quay-man.mjs chụp cả màn ở đúng cỡ điểm máy (jpg): giữ nguyên cỡ; quay-canh.mjs chép khung vẽ game (png): phóng gấp đôi
    cmd = ['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(json.load(open(f"{raw}/{name}/sfx.json"))['fps']), '-i', f"{raw}/{name}/f-%04d.{'jpg' if jpg else 'png'}", '-i', f"{out}/{name}.wav",
           '-vf', 'tpad=stop_mode=clone:stop_duration=0.6' + ('' if jpg else ',scale=iw*2:ih*2:flags=neighbor'), '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-preset', 'slow',
           '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', f"{out}/{name}.mp4"]
    subprocess.run(cmd, check=True)
    os.remove(f"{out}/{name}.wav")
    print(name, round(os.path.getsize(f"{out}/{name}.mp4") / 1024), 'KB', 'đỉnh', round(float(np.abs(x).max()), 2))
