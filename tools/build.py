# Assemble Alphabet Friends game.js from the Number Friends engine + the letters section.
src=open('/workspace/nf/site/js/game.js').read().split('\n')
def L(a,b): return '\n'.join(src[a-1:b])
part=open('/workspace/af/tools/letters_part.js').read()
A=L(1,547); B=L(724,734); D=L(2201,2722); E=L(3022,3093); F=L(3189,3599)
def rep(s,a,b,count=1):
    assert a in s, ('MISSING',a[:80])
    return s.replace(a,b) if count is None else s.replace(a,b,count)
# ---- A: constants, audio, speech, progress
A=rep(A,"var PRAISE=['Yes!','Well done!','Great counting!','That is right!','Super!','You did it!','Brilliant!','Lovely!'];",
 "var PRAISE=['Yes!','Well done!','Great listening!','That is right!','Super!','You did it!','Brilliant!','Lovely!'];")
A=rep(A,"var NUDGE=['Almost. Try again.','Count them again.','Have another look.','Nearly. Try once more.'];",
 "var NUDGE=['Almost. Try again.','Listen again.','Have another look.','Nearly. Try once more.'];")
A=rep(A,"var KEY='nf3';","var KEY='af1';")
A=rep(A,"window.NF_DEBUG={};","window.AF_DEBUG={};")
A=rep(A,"window.NF_DEBUG.plan=","window.AF_DEBUG.plan=")
A=rep(A,"for(var i=0;i<=20;i++) if(CLIPS[WORDS[i]]) getClip(CLIPS[WORDS[i]]);","'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(ch){ if(CLIPS[ch]) getClip(CLIPS[ch]); });")
A=rep(A,"  base:261.63,","  base:293.66,")
A=rep(A,"function speak(text,opts){\n  if(voiceMuted||!text) return;","function speak(text,opts){\n  if(text){ var _sp=window.AF_DEBUG.spoken=window.AF_DEBUG.spoken||[]; if(_sp.length<5000) _sp.push(String(text)); }\n  if(voiceMuted||!text) return;")
# ---- D: rounds, rewards, screens, map
D=rep(D,"var blks=document.querySelectorAll('#stage .blk');","var blks=document.querySelectorAll('#stage .lf, #stage .seqcard, #stage .piccard');",None)
D=rep(D,"  if(round.index>=ROUNDS){ finishStage(); return; }","  if(round.index>=(round.total||ROUNDS)){ finishStage(); return; }")
D=rep(D,"  setPrompt(q.promptHTML,q.promptSpeech);\n  armIdle();","  if(!q.noChoices) setPrompt(q.promptHTML,q.promptSpeech);\n  armIdle();")
D=rep(D,"""  // once in a while, a counting answer is followed by tracing the numeral
  if(round.stage&&(round.stage.id==='count5'||round.stage.id==='count10')&&Math.random()<1/3){
    round.traceNext=true;
  }
""","")
D=rep(D,"""  if(round.traceNext){
    round.traceNext=false;
    var num=(round.q&&round.q.nums&&round.q.nums[0])||0;
    showTrace(num,function(){ showNext(label,nextRound); });
    return;
  }
""","")
import re
i=D.index('function showChoices(list,onPick){'); j=D.index('function showNext(label,fn){')
D=D[:i]+D[j:]
i=D.index('var STAGE_PHRASE={'); j=D.index('function listOf(a){')
D=D[:i]+"""var STAGE_PHRASE={meet:'met new letters',trace:'traced letters',match:'matched big and little letters',
  sounds:'played with letter sounds',review:'did a review',order:'put letters in order',words:'blended words',mix:'did a bit of everything'};
"""+D[j:]
D=rep(D,"""  var phrases=sessionStages.slice(-3).map(function(id){ return STAGE_PHRASE[id]||'played'; });
  speak((nm?'Well done, '+nm+'! ':'')+'Today you '+listOf(phrases)+'. Your jar has '+jarText()+' stars!',{rate:0.88});""",
"""  var phrases=[];
  sessionStages.slice(-3).forEach(function(id){ var st=stageById(id); var p=st&&STAGE_PHRASE[st.type]; if(p&&phrases.indexOf(p)<0) phrases.push(p); });
  if(nm) speak('Well done, '+nm+'!',{rate:0.88});
  phrases.forEach(function(p,i){ speak((i?'And you ':'Today you ')+p+'.',{rate:0.88}); });
  speak('Your jar has '+Math.floor(progress.points||0)+' stars!',{rate:0.88});""")
D=rep(D,"['map','play','done','grown','stickers'].forEach","['map','play','done','grown','stickers','song'].forEach")
D=rep(D,"  if(name==='stickers') renderStickers();","  if(name==='stickers') renderStickers();\n  if(name==='song') renderSong();\n  if(name!=='song') song.on=false;")
D=rep(D,"  if(c&&c.index>0&&c.index<ROUNDS){ showCarry(st,c.index); }","  if(c&&c.index>0&&c.index<(st.total||ROUNDS)){ showCarry(st,c.index); }")
D=rep(D,"function finishStage(){\n  clearTimers();","function finishStage(){\n  clearTimers();\n  traceState=null;")
# ---- E: warm-up and home tips
E=rep(E,"  var stage={id:'warmup',title:'Warm-up',short:'Warm-up',sub:'',total:3,maxN:10,cols:2,","  var stage={id:'warmup',type:'review',title:'Warm-up',short:'Warm-up',sub:'',total:3,maxN:1,cols:1,")
E=rep(E,"  var played=STAGES.filter(function(st){ return (progress.stars[st.id]||0)>0; });","  var played=STAGES.filter(function(st){ return (progress.stars[st.id]||0)>0&&st.type!=='trace'; });")
i=E.index('var HOME_TIPS=['); 
E=E[:i]+"""var HOME_TIPS=[
  'Play I spy with sounds: "I spy something that starts with /{s}/." Use the sound, not the letter name.',
  'Hunt for the letter {L} on packets, signs and books. Big {L} and little {l} both count.',
  'Draw {L} in the air, on her back, or in a tray of rice or sand. Say its sound as you go.',
  'Say three sounds slowly, like c-a-t, and let her say the word. Then swap roles.',
  'Sing the alphabet song and stop on a letter: what comes next?',
  'Find three things at home that start with /{s}/.'
];
function weakLetter(){
  var stats={};
  answerLog.forEach(function(e){ (e.n||[]).forEach(function(n){ if(n<0||n>25) return; stats[n]=stats[n]||{t:0,ok:0}; stats[n].t++; if(e.ok) stats[n].ok++; }); });
  var worst=null,acc=1.01;
  Object.keys(stats).forEach(function(k){ if(stats[k].t<2) return; var a=stats[k].ok/stats[k].t; if(a<acc){acc=a;worst=parseInt(k,10);} });
  return worst;
}
function homeTip(){
  var tip=HOME_TIPS[weekIndex()%HOME_TIPS.length];
  var w=weakLetter(); var o=LET[w===null?(weekIndex()%26):w];
  return tip.replace(/\\{L\\}/g,o.U).replace(/\\{l\\}/g,o.l).replace(/\\{s\\}/g,o.show);
}
"""
# ---- F: dress-up, dashboard, wiring, boot
F=rep(F,"[].slice.call(document.querySelectorAll('.blk')).forEach","[].slice.call(document.querySelectorAll('.lf')).forEach")
F=rep(F,"'<rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"5\" fill=\"#29a3e0\"/>'","'<rect x=\"2\" y=\"2\" width=\"20\" height=\"20\" rx=\"9\" fill=\"#ff6f61\"/>'")
F=rep(F,"stroke=\"#1b5f86\"","stroke=\"#a8322a\"")
i=F.index("  var grid=$('dashNums');"); j=F.index("  var worst=null,worstAcc=2;")
F=F[:i]+"""  var grid=$('dashNums');
  grid.innerHTML='';
  for(var i=0;i<26;i++){
    var cell=document.createElement('div');
    cell.className='dash-cell';
    cell.textContent=LET[i].U;
    var st2=stats[i];
    if(!st2){ cell.classList.add('none'); }
    else{
      var acc=st2.ok/st2.t;
      cell.style.background=acc>=0.8?'#2fbf71':(acc>=0.5?'#f0a500':'#e8453c');
      cell.title=st2.ok+' right of '+st2.t;
    }
    grid.appendChild(cell);
  }

"""+F[j:]
F=rep(F,"      if(num<0||num>20) return;","      if(num<0||num>25) return;")
F=rep(F,"    ? 'Working on: '+worst+' — right '","    ? 'Working on: '+LET[worst].U+' — right '")
F=rep(F,"  $('carrySub').textContent='You stopped at question '+(index+1)+' of '+ROUNDS+'.';","  $('carrySub').textContent='You stopped at question '+(index+1)+' of '+(st.total||ROUNDS)+'.';") if "carrySub" in F else F
F=rep(F,"  speak('Hello! Let us count together.',{rate:0.9});","  speak('Hello! Let us play with letters.',{rate:0.9});")
F=rep(F,"speak('One, two, three. Let us count the blocks.',{rate:0.9});","speak('A says ah, like apple.',{rate:0.9});")
F=rep(F,"window.__nfShowTrace=showTrace;\n","")
F=rep(F,"""$('stickersBtn').addEventListener('click',function(){""","""$('songBtn').addEventListener('click',function(){ popSound(); setScreen('song'); });
$('singBtn').addEventListener('click',function(){ popSound(); singAlong(); });
$('stickersBtn').addEventListener('click',function(){""")
F=rep(F,"  if(round.q&&round.q.replay){ speak(round.q.replay,{rate:0.9}); return; }","  if(curScreen==='song'){ singAlong(); return; }\n  if(round.q&&round.q.replay){ speak(round.q.replay,{rate:0.9}); return; }")
# carry dialog sits before F? check
out='\n'.join([A,"function popIn(){}",B,part,D,E,F])
assert 'carrySub' in out
out=out.replace("$('carrySub').textContent='You stopped at question '+(index+1)+' of '+ROUNDS+'.';","$('carrySub').textContent='You stopped at question '+(index+1)+' of '+(st.total||ROUNDS)+'.';")
open('/workspace/af/js/game.js','w').write(out)
print(len(out.split('\n')))
