import os, json, sys
R='/workspace/af'; V=sys.argv[1] if len(sys.argv)>1 else 'af-v1'
core=['index.html','manifest.json','css/style.css','css/premium.css','css/af.css','js/content.js','js/game.js','js/pwa.js','assets/audio/manifest.json']
core+=['assets/icons/'+f for f in sorted(os.listdir(R+'/assets/icons'))]
core+=['assets/pics/'+f for f in sorted(os.listdir(R+'/assets/pics'))]
audio=['assets/audio/'+f for f in sorted(os.listdir(R+'/assets/audio')) if f.endswith('.mp3')]
s=open('/workspace/nf/site/sw.js').read().split('\n')
body='\n'.join(s[4:]).replace("ks.filter(k=>k!==VERSION)","ks.filter(k=>k.startsWith('af-')&&k!==VERSION)").replace("caches.match('./index.html')","caches.match('./index.html')")
out=f"/* Alphabet Friends service worker: cache-first, versioned */\nconst VERSION='{V}';\nconst CORE={json.dumps(core)};\nconst AUDIO={json.dumps(audio)};\n"+body
open(R+'/sw.js','w').write(out); print(V,len(core),len(audio))
