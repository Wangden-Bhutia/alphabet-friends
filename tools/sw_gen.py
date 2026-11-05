import os, json, sys
from pathlib import Path
R=str(Path(__file__).resolve().parent.parent); V=sys.argv[1] if len(sys.argv)>1 else 'af-v1'
core=['index.html','manifest.json','css/style.css','css/premium.css','css/af.css','js/content.js','js/game.js','js/pwa.js','assets/audio/manifest.json']
core+=['assets/icons/'+f for f in sorted(os.listdir(R+'/assets/icons'))]
core+=['assets/pics/'+f for f in sorted(os.listdir(R+'/assets/pics'))]
audio=['assets/audio/'+f for f in sorted(os.listdir(R+'/assets/audio')) if f.endswith('.mp3')]
# service-worker body (install / activate / fetch), kept here so the tool needs nothing outside the repo
BODY=r'''self.addEventListener('install',e=>{
  e.waitUntil(caches.open(VERSION).then(async c=>{
    await c.addAll(['./',...CORE]);
    // audio in batches so one slow file never blocks install
    for(let i=0;i<AUDIO.length;i+=60){
      await Promise.all(AUDIO.slice(i,i+60).map(u=>c.add(u).catch(()=>{})));
    }
  }).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('af-')&&k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin) return;
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(hit=>hit||fetch(req).then(res=>{
    if(res&&res.ok){const copy=res.clone();caches.open(VERSION).then(c=>c.put(req,copy));}
    return res;
  }).catch(()=>req.mode==='navigate'?caches.match('./index.html'):Response.error())));
});
'''
out=f"/* Alphabet Friends service worker: cache-first, versioned */\nconst VERSION='{V}';\nconst CORE={json.dumps(core)};\nconst AUDIO={json.dumps(audio)};\n"+BODY
open(R+'/sw.js','w').write(out); print(V,len(core),len(audio))
