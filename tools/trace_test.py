import asyncio, random, json
from playwright.async_api import async_playwright
random.seed(7)
async def draw(pg,pts,starts,upto=None,noise=0.0,reverse=False):
    strokes=[]
    for k,s in enumerate(starts):
        e=starts[k+1] if k+1<len(starts) else len(pts)
        strokes.append(list(range(s,e)))
    if reverse: strokes=[st[::-1] for st in strokes[::-1]]
    count=0
    for st in strokes:
        if upto is not None and count>=upto: break
        first=True
        for i in st:
            if upto is not None and count>=upto: break
            x=pts[i]['x']+random.uniform(-noise,noise); y=pts[i]['y']+random.uniform(-noise,noise)
            if first: await pg.mouse.move(x,y); await pg.mouse.down(); first=False
            else: await pg.mouse.move(x,y,steps=2)
            count+=1
        await pg.mouse.up()
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome')
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
        pg=await ctx.new_page(); errs=[]
        pg.on('pageerror',lambda e: errs.append(str(e)))
        await pg.goto('http://localhost:8090/'); await pg.wait_for_timeout(1500)
        fails=[]; rows=[]
        for up in (True,False):
            for ch in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ':
                c=ch if up else ch.lower()
                res={}
                for mode in ('half','reverse','wobbly'):
                    await pg.evaluate(f"__afTraceTest({'true' if up else 'false'},'{c}')"); await pg.wait_for_timeout(120)
                    st=await pg.evaluate("__afTrace()")
                    scale=st['scale']; noise=12*0.55*scale   # 55% of the 12-unit tolerance radius
                    if mode=='half': await draw(pg,st['pts'],st['starts'],upto=st['total']//2,noise=noise*0.5)
                    elif mode=='reverse': await draw(pg,st['pts'],st['starts'],reverse=True,noise=0)
                    else: await draw(pg,st['pts'],st['starts'],noise=noise)
                    await pg.wait_for_timeout(1000 if mode=='wobbly' else 150)
                    s2=await pg.evaluate("__afTrace()"); r=await pg.evaluate("window.__afTraceResult")
                    res[mode]=(s2['finished'],s2['next'],s2['total'],r)
                ok = (not res['half'][0]) and (not res['reverse'][0]) and res['wobbly'][0] and res['wobbly'][3] is True
                rows.append((c,res['half'][1:3],res['reverse'][1],res['wobbly'][0]))
                if not ok: fails.append((c,res))
        for r in rows: print(r)
        print('FAILS',fails); print('errors',errs)
        await b.close()
asyncio.run(main())
