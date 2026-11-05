import asyncio, random, json, os, sys
from playwright.async_api import async_playwright
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8090/'
SH='/workspace/af_shots/'
random.seed(3)
async def hold(pg,sel,ms=2300):
    box=await (await pg.query_selector(sel)).bounding_box()
    await pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2); await pg.mouse.down(); await pg.wait_for_timeout(ms); await pg.mouse.up(); await pg.wait_for_timeout(600)
async def trace_full(pg):
    st=await pg.evaluate("__afTrace()")
    pts,starts=st['pts'],st['starts']; n=12*0.4*st['scale']
    for k,s in enumerate(starts):
        e=starts[k+1] if k+1<len(starts) else len(pts)
        await pg.mouse.move(pts[s]['x'],pts[s]['y']); await pg.mouse.down()
        for i in range(s+1,e): await pg.mouse.move(pts[i]['x']+random.uniform(-n,n),pts[i]['y']+random.uniform(-n,n),steps=2)
        await pg.mouse.up()
async def play_stage(pg,sid,shots=None):
    await pg.evaluate(f"__afStart('{sid}')"); await pg.wait_for_timeout(900)
    took=False
    for it in range(120):
        s=await pg.evaluate("AF_DEBUG.state()")
        if s['screen']=='done': return True
        if s['trace']:
            if shots and not took: await pg.screenshot(path=SH+shots+'_trace.png'); took=True
            await trace_full(pg); await pg.wait_for_timeout(1300); continue
        nb=await pg.query_selector('#choices .nextbtn')
        if nb: await nb.click(); await pg.wait_for_timeout(700); continue
        if not s['locked'] and s['answer'] is not None:
            if shots and not took: await pg.screenshot(path=SH+shots+'.png'); took=True
            if random.random()<0.25:
                w=await pg.query_selector(f'#choices .choice:not([data-key="{s["answer"]}"]):not([disabled])')
                if w: await w.click(); await pg.wait_for_timeout(500)
            r=await pg.query_selector(f'#choices .choice[data-key="{s["answer"]}"]')
            if r: await r.click(); await pg.wait_for_timeout(900); continue
        await pg.wait_for_timeout(400)
    return False
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',args=['--autoplay-policy=no-user-gesture-required'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=False)
        pg=await ctx.new_page(); errs=[]
        pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
        pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
        await pg.goto(BASE); await pg.wait_for_timeout(2500)
        await pg.mouse.click(5,400)
        sw=await pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!!r)")
        man=await pg.evaluate("fetch('manifest.json').then(r=>r.json())")
        await hold(pg,'#grownBtn')
        print('grown screen:',await pg.evaluate("document.body.dataset.screen"))
        await pg.fill('#nameInput','Maya'); await pg.click('#nameSave'); await pg.wait_for_timeout(300)
        await pg.screenshot(path=SH+'grown.png')
        await pg.evaluate("document.getElementById('backBtn').click()"); await pg.wait_for_timeout(500)
        stages=await pg.evaluate("AF_DEBUG.stages()")
        results={}
        for i,sid in enumerate(stages):
            ok=await play_stage(pg,sid,shots=sid if sid in ('meet0','trace0','sounds1','words1','order1','match2') else None)
            results[sid]=ok
            if sid=='meet0': await pg.wait_for_timeout(800); await pg.screenshot(path=SH+'done.png')
        print('stages played:',sum(results.values()),'/',len(results),[k for k,v in results.items() if not v])
        await pg.wait_for_timeout(1500)
        await pg.evaluate("document.getElementById('backBtn').click()"); await pg.wait_for_timeout(1200)
        await pg.screenshot(path=SH+'map_progress.png')
        await pg.click('#songBtn'); await pg.wait_for_timeout(600); await pg.click('#singBtn'); await pg.wait_for_timeout(7000)
        await pg.screenshot(path=SH+'song.png')
        for _ in range(60):
            if not await pg.evaluate("document.getElementById('singBtn').classList.contains('on')"): break
            await pg.wait_for_timeout(1000)
        sung=await pg.evaluate("AF_DEBUG.spoken.filter(t=>/^[A-Z]\\.$/.test(t)).length")
        print('song letters spoken:',sung)
        await pg.evaluate("document.querySelector('.songtile[data-i=\"1\"]').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("document.getElementById('backBtn').click()"); await pg.wait_for_timeout(500)
        await pg.click('#stickersBtn'); await pg.wait_for_timeout(800); await pg.screenshot(path=SH+'stickers.png')
        dress=await pg.query_selector_all('.dress:not(.locked)')
        if len(dress)>1: await dress[1].click(); await pg.wait_for_timeout(300)
        await pg.evaluate("document.getElementById('backBtn').click()"); await pg.wait_for_timeout(500)
        await pg.evaluate("__afStart('meet3')"); await pg.wait_for_timeout(1200); await pg.screenshot(path=SH+'meet_outfit.png')
        await pg.evaluate("document.getElementById('iosModal').classList.add('show')"); await pg.wait_for_timeout(600)
        await pg.screenshot(path=SH+'ioshint.png')
        spoken=await pg.evaluate("Array.from(new Set(AF_DEBUG.spoken))")
        bad=[]
        for t in spoken:
            pl=await pg.evaluate("t=>AF_DEBUG.plan(t)",t)
            tts=[x['text'] for x in pl if not x.get('clip')]
            if [x for x in tts if x!='maya']: bad.append((t,tts))
        print('unique spoken lines:',len(spoken),'with unrecorded parts:',bad)
        small=await pg.evaluate("Array.from(document.querySelectorAll('#choices button, .icon-btn, .pillbtn, .songtile, .earbtn')).filter(b=>b.offsetParent).map(b=>[b.id||b.className,Math.round(b.getBoundingClientRect().width),Math.round(b.getBoundingClientRect().height)]).filter(a=>Math.min(a[1],a[2])<64)")
        print('targets under 64px on current screen:',small)
        print('sw registered:',sw,'manifest:',man['name'],len(man['icons']),'icons')
        print('console errors:',errs)
        await b.close()
asyncio.run(main())
