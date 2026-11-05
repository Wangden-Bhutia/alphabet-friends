# Audit checks (headless Chrome, 360x740 phone). Run with the site served at BASE.
import asyncio, random, re, sys, os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parent.parent
BASE=sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8090/'
SHOTS=sys.argv[2] if len(sys.argv)>2 else str(ROOT/'tools'/'out')
os.makedirs(SHOTS,exist_ok=True)
VIEW={'width':360,'height':740}
R=9
PARTS=set((os.environ.get('AUDIT_PARTS') or 'play,levels,trace,skip').split(','))   # run a subset while debugging
results={}
def report(n,name,ok,detail=''):
    results[n]=ok; print(f"[{'PASS' if ok else 'FAIL'}] {n:2d}. {name}"+(f" -- {detail}" if detail else ''),flush=True)

async def new_page(b,errs):
    ctx=await b.new_context(viewport=VIEW,device_scale_factor=2,is_mobile=True,has_touch=False)
    pg=await ctx.new_page()
    pg.on('console',lambda m: errs.append(m.text) if m.type=='error' else None)
    pg.on('pageerror',lambda e: errs.append('PAGEERR '+str(e)))
    await pg.goto(BASE); await pg.wait_for_timeout(2000); await pg.mouse.click(5,400)
    return ctx,pg

def strokes_of(st):
    pts,starts=st['pts'],st['starts']; out=[]
    for k,s in enumerate(starts):
        e=starts[k+1] if k+1<len(starts) else len(pts); out.append(pts[s:e])
    return out

async def trace_honest(pg,rng,jit):
    st=await pg.evaluate("__afTrace()"); n=jit*st['scale']
    for sk in strokes_of(st):
        await pg.mouse.move(sk[0]['x'],sk[0]['y']); await pg.mouse.down()
        for p in sk[1:]: await pg.mouse.move(p['x']+rng.uniform(-n,n),p['y']+rng.uniform(-n,n),steps=2)
        await pg.mouse.up()


DRAG_JS="""(strokes)=>{const svg=document.querySelector('#stage .trace-svg');
  const ev=(t,x,y)=>svg.dispatchEvent(new PointerEvent(t,{clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true,bubbles:true,cancelable:true}));
  for(const st of strokes){ ev('pointerdown',st[0][0],st[0][1]); for(const q of st.slice(1)) ev('pointermove',q[0],q[1]); ev('pointerup',st[st.length-1][0],st[st.length-1][1]); }}"""
async def drag(pg,strokes): await pg.evaluate(DRAG_JS,strokes)
def line(a,b,n): return [[a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n] for k in range(1,n+1)]

JS_CHOICES="""()=>Array.from(document.querySelectorAll('#choices .choice')).map(b=>{const cs=getComputedStyle(b);
  return {key:b.dataset.key,text:(b.textContent||'').trim(),bg:cs.backgroundColor+'|'+cs.backgroundImage+'|'+cs.borderColor+'|'+cs.color,
          imgs:Array.from(b.querySelectorAll('img')).map(i=>i.src)}})"""

async def play_stage(pg,sid,rng,probe):
    await pg.evaluate(f"__afStart('{sid}')"); await pg.wait_for_timeout(900)
    seen=set()
    for it in range(200):
        s=await pg.evaluate("AF_DEBUG.state()")
        if s['screen']=='done': return True
        if s['trace']:
            await probe(pg,sid,s,'trace',None); await trace_honest(pg,rng,0.4*R); await pg.wait_for_timeout(1300); continue
        nb=await pg.query_selector('#choices .nextbtn')
        if nb: await nb.evaluate("e=>e.click()"); await pg.wait_for_timeout(700); continue
        if not s['locked'] and s['answer'] is not None:
            tag=(s['index'],s['answer'])
            if tag not in seen:
                seen.add(tag); ch=await pg.evaluate(JS_CHOICES); await probe(pg,sid,s,'q',ch)
            if rng.random()<0.30:
                w=await pg.query_selector(f'#choices .choice:not([data-key="{s["answer"]}"]):not([disabled])')
                if w: await w.evaluate("e=>e.click()"); await pg.wait_for_timeout(500); continue
            r=await pg.query_selector(f'#choices .choice[data-key="{s["answer"]}"]')
            if r:
                await r.evaluate("e=>e.click()"); await pg.wait_for_timeout(900)
                await probe(pg,sid,s,'after',None); continue
        await pg.wait_for_timeout(400)
    return False

SMALL_JS="""()=>Array.from(document.querySelectorAll('button')).filter(b=>{const r=b.getBoundingClientRect(),cs=getComputedStyle(b);
  return b.offsetParent&&r.width>0&&r.height>0&&cs.visibility!=='hidden'&&cs.opacity!=='0'&&r.bottom>0&&r.top<innerHeight})
  .map(b=>{const r=b.getBoundingClientRect();return [b.id||b.className,Math.round(r.width),Math.round(r.height)]}).filter(a=>Math.min(a[1],a[2])<44)"""

async def main():
    errs=[]
    async with async_playwright() as p:
        b=await p.chromium.launch(channel='chrome',headless=True,args=['--autoplay-policy=no-user-gesture-required'])
        ctx,pg=await new_page(b,errs)
        rng=random.Random(11)
        colour_bad=[]; text_bad=[]; meet_bad=[]; shots=set(); small=[]
        async def shot(name):
            if name not in shots: shots.add(name); await pg.screenshot(path=f'{SHOTS}/audit_{name}.png')
        async def probe(pg,sid,s,kind,ch):
            if kind=='trace':
                await shot('trace')
                if 'trace' not in [x[0] for x in small]: small.append(('trace',await pg.evaluate(SMALL_JS)))
                return
            if kind=='after':
                if sid.startswith('meet'): await shot('meet_after')
                return
            ans=[c for c in ch if c['key']==s['answer']]
            if not ans: return
            a=ans[0]; others=[c for c in ch if c is not a]
            # 2: the answer must not be the odd colour out
            if len(ch)>=2 and not sid.startswith('meet'):
                if any(c['bg']!=a['bg'] for c in others) and (len(others)<2 or len(set(c['bg'] for c in others))==1):
                    colour_bad.append((sid,s['index'],a['text'],[c['bg'].split('|')[0] for c in ch]))
            # 3: the prompt must not show the answer letter on its own or as /x/
            q=await pg.evaluate("(document.getElementById('qText')||{}).textContent||''")
            L=a['text']
            if len(L)==1 and L.isalpha() and not sid.startswith('meet'):
                if re.search(r'(^|[^A-Za-z])'+re.escape(L)+r'([^A-Za-z]|$)',q) and not re.fullmatch(r'(?i)a',L) or ('/'+L.lower()+'/') in q.lower():
                    text_bad.append((sid,q,L))
                elif L in 'Aa' and re.search(r'(^|\W)'+L+r'(\W*$)',q):
                    text_bad.append((sid,q,L))
            # 4: in meet, the picture of the answer is not on show before she answers
            if sid.startswith('meet'):
                await shot('meet_before')
                imgs=await pg.evaluate("Array.from(document.querySelectorAll('#stage img')).map(i=>i.src)")
                if set(imgs)&set(a['imgs']): meet_bad.append((sid,s['index']))
            if sid.startswith('match'): await shot('match')
            if sid.startswith('sounds') and 'say' in q.lower(): await shot('says')
            if 'play' not in [x[0] for x in small]: small.append(('play',await pg.evaluate(SMALL_JS)))
        await pg.wait_for_timeout(300)
        small.append(('map',await pg.evaluate(SMALL_JS)))
        if 'play' in PARTS:
            stages=await pg.evaluate("AF_DEBUG.stages()")
            played={}
            for sid in stages:
                played[sid]=await play_stage(pg,sid,rng,probe)
                if 'done' not in [x[0] for x in small]:
                    await pg.wait_for_timeout(1500); small.append(('done',await pg.evaluate(SMALL_JS)))
            bad=[k for k,v in played.items() if not v]
            report(1,'every stage plays to done with ~30% wrong taps',not bad,f'{len(stages)-len(bad)}/{len(stages)} done'+(f' failed {bad}' if bad else ''))
            report(2,'choice colours never single out the answer',not colour_bad,str(colour_bad[:5]))
            report(3,'#qText never shows the answer letter alone or as /x/',not text_bad,str(text_bad[:5]))
            report(4,'meet: no #stage img matches the correct choice before answering',not meet_bad,str(meet_bad[:5]))

            # 9 spoken lines
            spoken=await pg.evaluate("Array.from(new Set(AF_DEBUG.spoken))"); miss=[]
            for t in spoken:
                pl=await pg.evaluate("t=>AF_DEBUG.plan(t)",t)
                gaps=[x['text'] for x in (pl or []) if not x.get('clip')]
                if pl is None or gaps: miss.append((t,gaps))
            report(9,'every part of every spoken line has a clip',not miss,f'{len(spoken)} unique lines'+(f'; missing {miss[:5]}' if miss else ''))

        if 'levels' in PARTS:
            # 10 choice count by level
            out=[]
            for lv,want in ((1,4),(-1,2),(0,3)):
                await pg.evaluate(f"AF_DEBUG.setLevel('match0',{lv})"); await pg.evaluate("__afStart('match0')")
                for _ in range(30):
                    s=await pg.evaluate("AF_DEBUG.state()")
                    if not s['locked'] and s['answer'] is not None: break
                    await pg.wait_for_timeout(300)
                n=await pg.evaluate("document.querySelectorAll('#choices .choice').length")
                ov=await pg.evaluate("""()=>{const c=document.getElementById('choices');return c.scrollWidth>c.clientWidth+1||Array.from(c.querySelectorAll('.choice')).some(b=>{const r=b.getBoundingClientRect();return r.left<0||r.right>innerWidth||r.bottom>innerHeight})||document.documentElement.scrollWidth>innerWidth}""")
                if lv==1: await pg.screenshot(path=f'{SHOTS}/audit_match_4choices.png')
                out.append((lv,n,want,ov))
            report(10,'levels.match0=1 gives 4 choices, no overflow at 360px; -1 gives 2',all(n==w and not ov for _,n,w,ov in out),str(out))

            # 11 one question, two wrong taps -> one log entry with ok:0
            await pg.evaluate("AF_DEBUG.setLevel('match0',0)"); await pg.evaluate("__afStart('match0')")
            for _ in range(30):
                s=await pg.evaluate("AF_DEBUG.state()")
                if not s['locked'] and s['answer'] is not None: break
                await pg.wait_for_timeout(300)
            n0=len(await pg.evaluate("AF_DEBUG.log()"))
            for _ in range(2):
                for _ in range(20):
                    s=await pg.evaluate("AF_DEBUG.state()")
                    if not s['locked']: break
                    await pg.wait_for_timeout(250)
                w=await pg.query_selector(f'#choices .choice:not([data-key="{s["answer"]}"]):not([disabled])')
                await w.evaluate("e=>e.click()"); await pg.wait_for_timeout(700)
            for _ in range(20):
                s=await pg.evaluate("AF_DEBUG.state()")
                if not s['locked']: break
                await pg.wait_for_timeout(250)
            await (await pg.query_selector(f'#choices .choice[data-key="{s["answer"]}"]')).evaluate("e=>e.click()"); await pg.wait_for_timeout(900)
            lg=await pg.evaluate("AF_DEBUG.log()"); new=lg[n0:]
            report(11,'one question with 2 wrong taps logs exactly one entry (ok:0)',len(new)==1 and new[0]['ok']==0,str(new))

        if 'trace' in PARTS:
            # 5-7 tracing, every glyph on its own
            glyphs=[(True,c) for c in 'ABCDEFGHIJKLMNOPQRSTUVWXYZ']+[(False,c) for c in 'abcdefghijklmnopqrstuvwxyz']
            async def load(up,c):
                await pg.evaluate(f"__afTraceTest({'true' if up else 'false'},'{c}')"); await pg.wait_for_timeout(100)
                return await pg.evaluate("__afTrace()")
            async def finished(wait=900):
                await pg.wait_for_timeout(wait); st=await pg.evaluate("__afTrace()"); return st['finished'],await pg.evaluate("window.__afTraceResult")
            fails5=[]
            for seed in ((1,2,3) if 'honest' not in os.environ.get('AUDIT_SKIP','') else ()):
                rr=random.Random(seed)
                for up,c in glyphs:
                    st=await load(up,c); n=0.6*R*st['scale']; out=[]
                    for sk in strokes_of(st):
                        path=[[sk[0]['x'],sk[0]['y']]]
                        for q in sk[1:]: path+=line(path[-1],[q['x']+rr.uniform(-n,n),q['y']+rr.uniform(-n,n)],2)
                        out.append(path)
                    await drag(pg,out); f,r=await finished()
                    if not (f and r is True): fails5.append((seed,c))
            report(5,'honest trace (jitter +/-0.6R) completes all 52 glyphs, 3 seeds',not fails5,f'{3*52-len(fails5)}/156'+(f' failed {fails5}' if fails5 else ''))
            fails6=[]
            for up,c in glyphs:
                st=await load(up,c)
                bb=await pg.evaluate("(()=>{const r=document.querySelector('#stage .trace-svg').getBoundingClientRect();return [r.left,r.top,r.right,r.bottom]})()")
                x0,y0,x1,y1=bb[0]+4,bb[1]+4,bb[2]-4,bb[3]-4
                path=[[x0,y0]]
                for i in range(14):
                    y=y0+(y1-y0)*i/13; xs=(x0,x1) if i%2==0 else (x1,x0)
                    path+=line(path[-1],[xs[0],y],4); path+=line(path[-1],[xs[1],y],30)
                for i in range(10):
                    x=x0+(x1-x0)*i/9; ys=(y0,y1) if i%2==0 else (y1,y0)
                    path+=line(path[-1],[x,ys[0]],4); path+=line(path[-1],[x,ys[1]],40)
                await drag(pg,[path])
                f,r=await finished(500)
                if f: fails6.append(c)
            report(6,'zig-zag scribble (14 horizontal + 10 vertical sweeps) completes none of 52',not fails6,f'completed: {fails6}')
            fails7=[]; tried=0
            for up,c in glyphs:
                st=await load(up,c)
                if max(len(s) for s in strokes_of(st))<4: continue
                tried+=1
                dabs=[]
                for sk in strokes_of(st):
                    for i in range(len(sk)-1): dabs.append([[sk[i]['x'],sk[i]['y']],[sk[i+1]['x'],sk[i+1]['y']]])
                await drag(pg,dabs)
                f,r=await finished(500)
                if f: fails7.append(c)
            report(7,'dabbing with lifts does not complete a multi-point stroke',not fails7,f'{tried} glyphs dabbed; completed: {fails7}')

        if 'play' in PARTS:
            # 13 small buttons
            tiny=[(scr,lst) for scr,lst in small if lst]
            report(13,'no visible button under 44px on map, play, trace, done at 360px',not tiny,str(tiny) if tiny else 'screens: '+','.join(s for s,_ in small))
        await ctx.close()

        if 'skip' in PARTS:
            # 8 skip all of trace1 in a fresh profile
            ctx2,pg2=await new_page(b,errs)
            p0=(await pg2.evaluate("AF_DEBUG.progress()")).get('points',0)
            await pg2.evaluate("__afStart('trace1')"); await pg2.wait_for_timeout(900)
            for _ in range(200):
                s=await pg2.evaluate("AF_DEBUG.state()")
                if s['screen']=='done': break
                nb=await pg2.query_selector('#choices .nextbtn')
                if nb: await nb.evaluate("e=>e.click()"); await pg2.wait_for_timeout(600); continue
                sk=await pg2.query_selector('#choices .skipbtn')
                if sk: await sk.evaluate("e=>e.click()"); await pg2.wait_for_timeout(400); continue
                await pg2.wait_for_timeout(300)
            await pg2.wait_for_timeout(1500)
            pr=await pg2.evaluate("AF_DEBUG.progress()"); stg=await pg2.evaluate("AF_DEBUG.stages()")
            nxt=stg[stg.index('trace1')+1]
            pts=(pr.get('points',0) or 0)-(p0 or 0); stars=(pr.get('stars') or {}).get('trace1'); unl=bool((pr.get('unlocked') or {}).get(nxt))
            report(8,'skipping all of trace1: 0 points, 1 star, next stage stays locked',s['screen']=='done' and pts==0 and stars==1 and not unl,f'points +{pts}, stars {stars}, {nxt} unlocked={unl}')
            await ctx2.close()
        report(12,'no console errors',not errs,str(errs[:5]))
        await b.close()
    print('\nSUMMARY: %d/%d passed'%(sum(results.values()),len(results)))
    sys.exit(0 if all(results.values()) else 1)
asyncio.run(main())
