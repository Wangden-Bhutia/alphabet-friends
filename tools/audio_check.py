from pathlib import Path
ROOT=str(Path(__file__).resolve().parent.parent); OUTDIR=ROOT+'/tools/out/'
# Static cross-check: every spoken segment (from content.js templates + every literal speak() in game.js)
# has a clip in assets/audio/manifest.json, and every clip file exists.
import json, os, subprocess
R=ROOT
subprocess.run(['node',R+'/tools/phrases.js'],check=True,capture_output=True)
segs=json.load(open(R+'/tools/segs.json')); man=json.load(open(R+'/assets/audio/manifest.json'))
missing=[k for k in segs if k not in man]
nofile=[f for f in man.values() if not os.path.exists(f'{R}/assets/audio/{f}')]
sw=open(R+'/sw.js').read(); notcached=[f for f in man.values() if f'assets/audio/{f}' not in sw]
print('segments',len(segs),'clips',len(man),'missing clips',missing,'missing files',nofile,'not precached',len(notcached))
