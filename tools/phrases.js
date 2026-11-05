// Every spoken line in the game -> segment keys (same splitting as planSpeech in game.js)
const fs=require('fs');
require('../js/content.js');
const game=fs.readFileSync(__dirname+'/../js/game.js','utf8');
const lines=[...AF.allPhrases()];
// literal speak('...') calls and the praise lists
for(const m of game.matchAll(/speak\(\s*(['"])((?:(?!\1).)*)\1\s*[,)]/g)) lines.push(m[2]);
for(const name of ['PRAISE','PERSIST','NUDGE']){
  const m=game.match(new RegExp('var '+name+'=\\[([^\\]]*)\\]')); 
  for(const s of m[1].matchAll(/'([^']*)'/g)) lines.push(s[1]);
}
// any other sentence-like literal (prompts, ternaries, messages)
for(const m of game.matchAll(/'([A-Z][A-Za-z ,'’!?.]*[.!?])'/g)) if(/ /.test(m[1])) lines.push(m[1]);
// templated lines built in game.js
const PH=['met new letters','traced letters','matched big and little letters','played with letter sounds','did a review','put letters in order','blended words','did a bit of everything'];
PH.forEach(p=>{lines.push('Today you '+p+'.');lines.push('And you '+p+'.');});
for(let n=0;n<=200;n++) lines.push('Your jar has '+n+' stars!');
['Well done, X!','Hello, X!'].forEach(x=>lines.push(x.replace(', X','')));
// order stage reads short runs of letters: every letter alone is a clip
'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').forEach(c=>lines.push(c+'.'));
// stage titles are spoken when a stone on the map is tapped
const stagesSrc=game.match(/title:'([^']+)'/g)||[];
stagesSrc.forEach(t=>lines.push(t.slice(7,-1)));
['Meet ','Trace ','Big and little ','Letter sounds '].forEach(p=>['A to E','F to J','K to O','P to T','U to Z'].forEach(g=>lines.push(p+g)));
['Review A to J','Review A to O','Review A to T','Review A to Z'].forEach(x=>lines.push(x));
// ---- same normalisation as game.js
const ONES=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const TENS=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function nw(n){ if(n<20) return ONES[n]; if(n<100) return TENS[Math.floor(n/10)]+(n%10?' '+ONES[n%10]:''); if(n<1000) return ONES[Math.floor(n/100)]+' hundred'+(n%100?' and '+nw(n%100):''); return String(n); }
function normKey(s){ s=String(s).toLowerCase().replace(/[’']/g,''); s=s.replace(/\d+/g,d=>' '+nw(parseInt(d,10))+' '); return s.replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim(); }
function textFor(seg){ return seg.replace(/\d+/g,d=>nw(parseInt(d,10))).replace(/[.!?,…—]+\s*$/,'').trim(); }
const segs={};
for(const t of lines){
  const re=/[^.!?,…—]+[.!?,…—]*/g; let m;
  while((m=re.exec(t))){ const k=normKey(m[0]); if(k&&!segs[k]) segs[k]={text:textFor(m[0]),q:/\?/.test(m[0])}; }
}
fs.writeFileSync(__dirname+'/segs.json',JSON.stringify(segs,null,0));
console.log(lines.length,'lines',Object.keys(segs).length,'segments');
