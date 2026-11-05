# Generate the voice: en-US-JennyNeural, -8% rate, +4Hz pitch, silence trimmed, mono 24 kHz mp3.
# Phonic sounds are spliced in as their own clips so the sentence never spells them out:
#   vowels and f/s/v/z/x are cut from the start (or end) of the picture word itself,
#   the other consonants are short "buh"-style syllables.
import asyncio, json, os, subprocess, hashlib, numpy as np, edge_tts
ROOT='/workspace/af'; OUT=ROOT+'/assets/audio'; RAW='/tmp/afraw'
os.makedirs(OUT,exist_ok=True); os.makedirs(RAW,exist_ok=True)
VOICE='en-US-JennyNeural'; SR=24000
segs=json.load(open(ROOT+'/tools/segs.json'))
SLICE={'ah':('apple','vowel'),'eh':('egg','vowel'),'ih':('insect','vowel'),'aw':('octopus','vowel'),'uh':('umbrella','vowel'),
       'fff':('fish','fs'),'sss':('sun','fs'),'zzz':('zebra','fs'),'vvv':('van','fs'),'ks':('fox','fe')}
ALIAS={'guh':'guhh'}
SOUNDS=set(SLICE)|{'buh','kuh','duh','guh','huh','juh','luh','muh','nuh','puh','kwuh','ruh','tuh','wuh','yuh'}
sem=asyncio.Semaphore(6)
TRIM='silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse'
async def tts(text):
    h=hashlib.md5(text.encode()).hexdigest()[:16]; wav=f'{RAW}/{h}.wav'
    if os.path.exists(wav): return wav
    mp=f'{RAW}/{h}.mp3'
    async with sem:
        for a in range(6):
            try:
                await edge_tts.Communicate(text,VOICE,rate='-8%',pitch='+4Hz').save(mp)
                if os.path.getsize(mp)>500: break
            except Exception: await asyncio.sleep(2+a*2)
    subprocess.run(['ffmpeg','-y','-v','error','-i',mp,'-af',TRIM,'-ac','1','-ar',str(SR),wav],check=True)
    return wav
def load(wav):
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',wav,'-f','s16le','-ac','1','-ar',str(SR),'-'])
    return np.frombuffer(raw,np.int16).astype(np.float32)/32768
def frames(x,ms=10):
    n=int(SR*ms/1000); k=len(x)//n; f=x[:k*n].reshape(k,n)
    rms=np.sqrt((f**2).mean(1)); zcr=(np.abs(np.diff(np.sign(f),axis=1))>0).mean(1)
    return n,rms,zcr
def fade(y,fi=0.01,fo=0.05):
    y=y.copy(); a=int(SR*fi); b=int(SR*fo)
    if len(y)>a+b: y[:a]*=np.linspace(0,1,a); y[-b:]*=np.linspace(1,0,b)
    return y
REPORT={}
def cut(word_wav,mode,tok):
    x=load(word_wav); n,rms,zcr=frames(x); pk=rms.max()
    on=int(np.argmax(rms>0.08*pk))
    if mode=='vowel':
        end=min(len(rms),on+18); peak=0
        for i in range(on,end):
            peak=max(peak,rms[i])
            if i>on+8 and rms[i]<0.55*peak: end=i-1; break
        y=x[on*n:end*n]; stretch='auto'
    elif mode=='fs':
        on=int(np.argmax((rms>0.004*pk)&(zcr>0.2))); end=on
        while end<len(zcr)-1 and end<on+30 and not (zcr[end]<0.16 and zcr[end+1]<0.16): end+=1
        end=max(end,on+12); y=x[on*n:end*n]; stretch='auto'
    else:  # fricative at the end of the word
        last=len(rms)-1-int(np.argmax(rms[::-1]>0.02*pk)); st=last
        while st>0 and st>last-30 and not (zcr[st]<0.16 and zcr[st-1]<0.16): st-=1
        st=min(st,last-8); y=x[st*n:(last+1)*n]; stretch='0.75'
    y=fade(y,0.008,0.06 if mode=='vowel' else 0.03)
    if stretch=='auto':
        f=max(0.36,min(1.0,len(y)/SR/0.27))
        stretch=('0.6,atempo=%.3f'%(f/0.6)) if f<0.5 else '%.3f'%f
    src=f'{RAW}/cut_{tok}.wav'; dst=f'{RAW}/snd_{tok}.wav'
    import wave
    with wave.open(src,'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes())
    subprocess.run(['ffmpeg','-y','-v','error','-i',src,'-af',f'atempo={stretch},volume=1.3',dst],check=True)
    yy=load(dst); _,r2,z2=frames(yy)
    REPORT[tok]={'from':os.path.basename(word_wav),'ms':round(len(yy)/SR*1000),'zcr':round(float(z2.mean()),3)}
    return dst
SOUND_WAV={}
async def sound(tok):
    if tok in SOUND_WAV: return SOUND_WAV[tok]
    if tok in SLICE:
        w,mode=SLICE[tok]; ww=await tts(w[0].upper()+w[1:]+'.'); p=cut(ww,mode,tok)
    else:
        p=await tts(ALIAS.get(tok,tok)+'.')
        y=load(p); REPORT[tok]={'tts':ALIAS.get(tok,tok),'ms':round(len(y)/SR*1000)}
    SOUND_WAV[tok]=p; return p
SIL=None
def concat(parts,dst):
    ys=[]
    for i,p in enumerate(parts):
        if i: ys.append(np.zeros(int(SR*0.09),np.float32))
        ys.append(load(p))
    y=np.concatenate(ys); import wave
    with wave.open(dst,'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(y,-1,1)*32767).astype(np.int16).tobytes())
async def build(i,key,info):
    fn=f'a{i:04d}.mp3'; dst=f'{OUT}/{fn}'
    text=info['text']; end='?' if info['q'] else '.'
    words=text.split(' ')
    if any(w.lower() in SOUNDS for w in words):
        parts=[]; buf=[]
        async def flush(last):
            if buf:
                t=' '.join(buf); t=t[0].upper()+t[1:]
                parts.append(await tts(t+(end if last else ''))); buf.clear()
        for j,w in enumerate(words):
            if w.lower() in SOUNDS:
                await flush(False); parts.append(await sound(w.lower()))
            else: buf.append(w)
        await flush(True)
        wav=f'{RAW}/seg_{i}.wav'; concat(parts,wav)
    else:
        wav=await tts(text[0].upper()+text[1:]+end)
    subprocess.run(['ffmpeg','-y','-v','error','-i',wav,'-af','adelay=20,apad=pad_dur=0.04','-ac','1','-ar','24000','-b:a','32k',dst],check=True)
    return key,fn
async def main():
    for t in SLICE: await sound(t)
    res=await asyncio.gather(*[build(i,k,v) for i,(k,v) in enumerate(sorted(segs.items()))])
    man=dict(res)
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in set(man.values()): os.remove(f'{OUT}/{f}')
    json.dump(man,open(f'{OUT}/manifest.json','w'),separators=(',',':'))
    json.dump(REPORT,open(ROOT+'/tools/sound_report.json','w'),indent=1)
    print(len(man),'clips'); print(json.dumps(REPORT))
asyncio.run(main())
