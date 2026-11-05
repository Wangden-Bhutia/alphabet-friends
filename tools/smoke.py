import asyncio, json
from playwright.async_api import async_playwright
from pathlib import Path
ROOT=str(Path(__file__).resolve().parent.parent); OUTDIR=ROOT+'/tools/out/'
import os as _os; _os.makedirs(OUTDIR,exist_ok=True)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        pg=await ctx.new_page(); errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto('http://localhost:8090/'); await pg.wait_for_timeout(2000)
        await pg.screenshot(path=OUTDIR+'map.png')
        ids=await pg.evaluate("Array.from(document.querySelectorAll('#course')).length")
        for sid in ['meet0','trace0','match0','sounds0','review1','order1','words1','mix']:
            await pg.evaluate(f"__afStart('{sid}')"); await pg.wait_for_timeout(1500)
            await pg.screenshot(path=OUTDIR+f'{sid}.png')
        print('errors',errs)
        await b.close()
asyncio.run(main())
