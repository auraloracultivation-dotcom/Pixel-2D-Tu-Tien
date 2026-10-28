#!/usr/bin/env python3
"""Giải ảnh xem nhanh (anh_nho) của một báo lỗi / đề xuất để Claude xem khi duyệt (docs/03-CAU-TRUC.md → Báo lỗi, đề xuất).
Cách dùng: chép nguyên chuỗi anh_nho (data:image/jpeg;base64,...) lấy từ máy chủ vào một tệp, rồi
    python3 tools/gop-y/anh.py <tệp> <md5 máy chủ trả>
In "ok" và ghi <tệp>.jpg nếu md5 khớp; không khớp thì in vị trí khối 4000 ký tự đầu tiên bị lệch (so với danh sách md5 từng khối nếu đưa thêm)."""
import base64, hashlib, sys

def main():
    if len(sys.argv) < 3:
        print(__doc__); sys.exit(1)
    path, want = sys.argv[1], sys.argv[2].strip().lower()
    s = ''.join(open(path, encoding='utf-8').read().split())
    got = hashlib.md5(s.encode()).hexdigest()
    if got != want:
        print(f'lệch md5: {got} (dài {len(s)}); lấy lại từng khối 4000 ký tự và so md5 từng khối')
        for i in range(0, len(s), 4000):
            print(i // 4000 + 1, hashlib.md5(s[i:i + 4000].encode()).hexdigest())
        sys.exit(2)
    head, _, data = s.partition(',')
    if not head.startswith('data:image/'):
        print('không phải data URL ảnh'); sys.exit(3)
    out = path + '.jpg'
    open(out, 'wb').write(base64.b64decode(data))
    print('ok', out)

main()
