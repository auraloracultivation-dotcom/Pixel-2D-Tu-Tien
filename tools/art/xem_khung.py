import sys
from PIL import Image, ImageSequence
def sheet(still, anims, out, Z=5):
    st=Image.open(still).convert('RGBA'); rows=[]
    for a in anims:
        fr=[f.convert('RGBA').copy() for f in ImageSequence.Iterator(Image.open(a))]
        W,H=fr[0].size; s2=Image.new('RGBA',(W,H),(0,0,0,0)); s2.alpha_composite(st,((W-st.width)//2,(H-st.height)//2))
        row=Image.new('RGBA',((W+3)*(len(fr)+1)*Z,(H+3)*Z),(58,92,52,255))
        for i,f in enumerate([s2]+fr): row.alpha_composite(f.resize((W*Z,H*Z),Image.NEAREST),(i*(W+3)*Z,1*Z))
        rows.append(row)
    Wm=max(r.width for r in rows); o=Image.new('RGBA',(Wm,sum(r.height for r in rows)),(20,20,28,255)); y=0
    for r in rows: o.alpha_composite(r,(0,y)); y+=r.height
    o.convert('RGB').save(out)
if __name__=='__main__': sheet(sys.argv[1], sys.argv[3:], sys.argv[2])
