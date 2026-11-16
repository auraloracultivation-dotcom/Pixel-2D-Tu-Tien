"""Bỏ vết màu nền xanh (#00ff00) SpriteCook còn sót trong chuyển động: điểm xanh sát chỗ trống thì xoá, điểm xanh nằm trong thân thì lấy màu hàng xóm nhiều nhất."""
import sys, numpy as np
from collections import Counter
from PIL import Image, ImageSequence
def green(a):
    r,g,b=a[...,0].astype(int),a[...,1].astype(int),a[...,2].astype(int)
    return (a[...,3]>0)&(g>r+50)&(g>b+50)
def clean(fr):
    a=np.array(fr.convert('RGBA')); m=green(a); n=int(m.sum())
    h,w=m.shape
    for y,x in zip(*np.nonzero(m)):
        nb=[(y+dy,x+dx) for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)) if 0<=y+dy<h and 0<=x+dx<w]
        if any(a[yy,xx,3]==0 for yy,xx in nb): a[y,x]=(0,0,0,0); continue
        cols=[tuple(a[yy,xx]) for yy,xx in nb if not m[yy,xx] and a[yy,xx,3]>0]
        a[y,x]=Counter(cols).most_common(1)[0][0] if cols else (0,0,0,0)
    return Image.fromarray(a,'RGBA'), n
if __name__=='__main__':
    src,dst=sys.argv[1],sys.argv[2]
    fr=[f.copy() for f in ImageSequence.Iterator(Image.open(src))]
    out=[]; tot=0
    for f in fr: o,n=clean(f); out.append(o); tot+=n
    out[0].save(dst,'WEBP',save_all=True,append_images=out[1:],duration=125,loop=0,lossless=True)
    print(src.split('/')[-1], 'điểm xanh đã xử lý:', tot)
