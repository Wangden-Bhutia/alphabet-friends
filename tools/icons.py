from PIL import Image, ImageDraw, ImageFont
F='/tmp/baloo.ttf'
def make(size, maskable=False, out=None):
    S=1024
    im=Image.new('RGBA',(S,S),(0,0,0,0))
    bg=Image.new('RGBA',(S,S)); d=ImageDraw.Draw(bg)
    for y in range(S):
        t=y/S; d.line([(0,y),(S,y)],fill=(int(255-30*t),int(214-60*t),int(228-10*t),255))
    mask=Image.new('L',(S,S),0); md=ImageDraw.Draw(mask)
    if maskable: md.rectangle([0,0,S,S],fill=255)
    else: md.rounded_rectangle([0,0,S-1,S-1],radius=230,fill=255)
    im.paste(bg,(0,0),mask)
    d=ImageDraw.Draw(im)
    sc=0.74 if maskable else 0.92
    cx=S/2; cy=S/2+20*sc
    w=640*sc; h=600*sc; x0=cx-w/2; y0=cy-h/2
    d.rounded_rectangle([x0,y0+30*sc,x0+w,y0+h+30*sc],radius=260*sc,fill=(196,64,54))
    d.rounded_rectangle([x0,y0,x0+w,y0+h],radius=260*sc,fill=(255,111,97))
    # eyes
    ey=y0+190*sc
    for ex in (cx-110*sc,cx+110*sc):
        d.ellipse([ex-46*sc,ey-56*sc,ex+46*sc,ey+56*sc],fill='white')
        d.ellipse([ex-24*sc,ey-26*sc,ex+24*sc,ey+30*sc],fill=(45,42,74))
        d.ellipse([ex-12*sc,ey-20*sc,ex+2*sc,ey-6*sc],fill='white')
    for ex in (cx-200*sc,cx+200*sc):
        d.ellipse([ex-40*sc,ey+70*sc,ex+40*sc,ey+110*sc],fill=(255,170,170))
    try:
        font=ImageFont.truetype(F,int(330*sc))
        try: font.set_variation_by_axes([800])
        except Exception: pass
    except Exception: font=ImageFont.load_default()
    d.text((cx,y0+h*0.70),'Aa',font=font,fill='white',anchor='mm',stroke_width=int(6*sc),stroke_fill=(196,64,54))
    # a teal star sticker
    sx,sy,r=x0+w-20*sc,y0+30*sc,95*sc
    import math
    pts=[(sx+(r if i%2==0 else r*0.45)*math.cos(math.pi/2+i*math.pi/5)*-1, sy-(r if i%2==0 else r*0.45)*math.sin(math.pi/2+i*math.pi/5)) for i in range(10)]
    d.polygon(pts,fill=(25,179,166))
    im.resize((size,size),Image.LANCZOS).save(out)
p='/workspace/af/assets/icons/'
make(192,out=p+'icon-192.png'); make(512,out=p+'icon-512.png')
make(512,True,p+'icon-maskable-512.png'); make(180,True,p+'apple-touch-icon.png')
