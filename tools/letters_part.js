/* ================= letters ================= */
var LET=AF.LETTERS, CVC=AF.CVC, T=AF.T, TC=AF.TC;
var LCOL=['#ff6f61','#19b3a6','#8a5cf6','#ffb627','#3d8bfd','#ec4a8f','#2fbf71','#ff8a3d'];
function lcol(i){ return LCOL[i%LCOL.length]; }
function groupOf(g){ var r=AF.GROUPS[g]; return LET.slice(r[0],r[1]); }
function upTo(g){ return LET.slice(0,AF.GROUPS[g][1]); }
function pick(a){ return a[randInt(0,a.length-1)]; }
function picImg(code,cls){ return '<img class="'+(cls||'pic')+'" src="assets/pics/'+code+'.svg" alt="" draggable="false">'; }
/* a letter friend: a soft rounded buddy with eyes, the letter on its tummy, and today's outfit */
function letterFriend(text,color,opts){
  opts=opts||{};
  var d=document.createElement('div');
  d.className='lf'+(opts.small?' small':'')+(opts.pop!==false?' pop':'');
  d.style.setProperty('--c',color||'#ff6f61');
  d.innerHTML='<i class="eye l"></i><i class="eye r"></i><i class="cheek l"></i><i class="cheek r"></i><b class="lt">'+text+'</b>';
  if(progress&&progress.outfit&&ACC_SVG[progress.outfit]){
    var sp=document.createElement('span'); sp.className='acc';
    sp.innerHTML='<svg viewBox="0 0 24 24">'+ACC_SVG[progress.outfit]+'</svg>';
    d.appendChild(sp);
  }
  return d;
}
/* letters come out of a shuffled bag so nothing repeats until the bag is empty */
function drawFrom(list,key){
  round.bags=round.bags||{};
  var bag=round.bags[key];
  if(!bag||bag.i>=bag.list.length){
    var w=weakLetters(list);
    bag=round.bags[key]={list:shuffle(list.slice()),i:0};
    // a letter she has found hard goes first
    if(w.length){ var k=bag.list.indexOf(w[0]); if(k>0){ bag.list.splice(k,1); bag.list.unshift(w[0]); } }
  }
  return bag.list[bag.i++];
}
function weakLetters(list){
  var score={};
  answerLog.slice(-60).forEach(function(e){ (e.n||[]).forEach(function(n){ score[n]=(score[n]||0)+(e.ok?-0.6:1); }); });
  return list.filter(function(o){ return (score[o.i]||0)>0.4; });
}
/* distractors: never two letters that make the same sound, never the same picture */
function others(o,pool,k,sameSound){
  var out=[], used={}; used[o.snd]=1;
  shuffle(pool.slice()).concat(shuffle(LET.slice())).forEach(function(x){
    if(out.length>=k||x.i===o.i) return;
    if(!sameSound&&used[x.snd]) return;
    if(out.some(function(y){return y.i===x.i;})) return;
    used[x.snd]=1; out.push(x);
  });
  return out;
}
function showChoiceItems(items,onPick,cls){
  var wrap=$('choices');
  wrap.innerHTML='';
  items.forEach(function(it){
    var b=document.createElement('button');
    b.className='choice '+(cls||'');
    b.innerHTML=it.html;
    b.dataset.key=it.key;
    b.setAttribute('aria-label',it.label||it.key);
    b.addEventListener('click',function(){ if(round.locked) return; onPick(it,b); });
    wrap.appendChild(b);
  });
}
function hintAnswer(){
  var b=document.querySelectorAll('#choices .choice');
  for(var i=0;i<b.length;i++) if(b[i].dataset.key===String(round.answer)) b[i].classList.add('hint');
}
function askItems(items,ansKey,onRight,cls){
  round.answer=ansKey;
  showChoiceItems(shuffle(items),function(it,btn){
    if(it.key===ansKey){ btn.classList.add('right'); onRight(); }
    else wrongNow(btn);
  },cls);
}
function letterItems(list,lower,color){ return list.map(function(x){ return {key:String(x.i),html:'<span class="ltr" style="color:'+(color||lcol(x.i))+'">'+(lower?x.l:x.U)+'</span>',label:x.U}; }); }
function picItems(list){ return list.map(function(x){ return {key:String(x.i),html:picImg(x.pic),label:x.word}; }); }
function cardRow(){ var r=document.createElement('div'); r.className='cardrow'; return r; }
function picCard(o,noWord){ var d=document.createElement('div'); d.className='piccard pop'; d.innerHTML=picImg(o.pic)+(noWord?'':'<span class="pw">'+o.word+'</span>'); return d; }
function ear(onTap){
  var b=document.createElement('button'); b.className='earbtn pop'; b.setAttribute('aria-label','Hear it again');
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>';
  b.addEventListener('click',function(){ popSound(); onTap(); });
  return b;
}

/* ---------- 1. meet the letter ---------- */
function mkMeet(list){
  var o=drawFrom(list,'meet');
  var q={sig:'meet'+o.i, nums:[o.i], maxN:1, cols:1,
    promptHTML:'<span class="pl">'+o.U+o.l+'</span> says <b>/'+o.show+'/</b>',
    promptSpeech:T.meet(o)+' '+T.findPic(o),
    build:function(el){
      var r=cardRow();
      var f=letterFriend(o.U+o.l,lcol(o.i)); f.classList.add('tapable');
      f.addEventListener('click',function(){ popSound(); f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); speak(T.says(o)); });
      r.appendChild(f);
      el.appendChild(r); q.row=r;
      var opts=[o].concat(others(o,LET.filter(function(x){return x.pic!==o.pic;}),2,true));
      askItems(picItems(opts),String(o.i),correctNow,'picchoice');
    },
    afterCorrect:function(done){ if(q.row) q.row.appendChild(picCard(o)); speak(T.word(o)); speak(T.says(o)); done(); },
    help:hintAnswer
  };
  return q;
}
/* ---------- 2. trace big and little ---------- */
function mkTraceLetter(list){
  var o=drawFrom(list,'trace');
  var q={sig:'trace'+o.i, nums:[o.i], maxN:1, cols:1, noChoices:true,
    promptHTML:'Trace <b>'+o.U+'</b>', promptSpeech:'',
    build:function(){
      traceGlyph(AF.TRACE.up[o.U],{html:'Trace big <b>'+o.U+'</b>',speech:T.traceBig(o),color:lcol(o.i)},function(ok1){
        if(!ok1){ skipNow(); return; }   // Skip: no reward, no praise
        traceGlyph(AF.TRACE.lo[o.l],{html:'Now little <b>'+o.l+'</b>',speech:T.traceSmall(o),color:lcol(o.i)},function(ok2){
          if(!ok2){ skipNow(); return; }
          var st=$('stage'); st.innerHTML='';
          var r=cardRow(); r.appendChild(letterFriend(o.U,lcol(o.i))); r.appendChild(letterFriend(o.l,lcol(o.i+3)));
          st.appendChild(r);
          correctNow();
        });
      });
    },
    afterCorrect:function(done){ speak(T.upLow(o)); done(); }
  };
  return q;
}
/* ---------- 3. big and little ---------- */
function mkMatch(list){
  var o=drawFrom(list,'match');
  var toLower=Math.random()<0.6;
  var q={sig:'match'+o.i+toLower, nums:[o.i], maxN:1, cols:1,
    promptHTML:toLower?'Find the little one':'Find the big one',
    promptSpeech:toLower?T.findSmall(o):T.findBig(o),
    build:function(el){
      var r=cardRow(); r.appendChild(letterFriend(toLower?o.U:o.l,lcol(o.i))); el.appendChild(r);
      // tricky look-alikes make good distractors once she is going well
      var maxI=Math.max.apply(null,list.map(function(x){return x.i;}));
      var pool=list.concat(LET.filter(function(x){ return 'bdpqnumw'.indexOf(x.l)>=0&&x.i<=maxI; }));
      var opts=[o].concat(others(o,pool,2,true));
      askItems(letterItems(opts,toLower,NEUTRAL),String(o.i),correctNow,'ltrchoice');
    },
    afterCorrect:function(done){ speak(T.upLow(o)); done(); },
    help:hintAnswer
  };
  return q;
}
/* ---------- 4. letter sounds ---------- */
function mkSounds(list,kind){
  var noX=list.filter(function(x){return x.U!=='X';});
  kind=kind||pick(['says','starts','pic']);
  if(!noX.length) kind='says';
  var o=drawFrom(kind==='says'?list:noX,'snd'+kind);
  var q={sig:'snd'+kind+o.i, nums:[o.i], maxN:1, cols:1, help:hintAnswer};
  if(kind==='says'){
    q.promptHTML='Which letter says this?';
    q.promptSpeech=T.whichSays(o);
    q.build=function(el){
      var r=cardRow(); r.appendChild(ear(function(){ speak(T.snd(o)); })); el.appendChild(r);
      askItems(letterItems([o].concat(others(o,list,2,false)),false,NEUTRAL),String(o.i),correctNow,'ltrchoice');
    };
    q.afterCorrect=function(done){ speak(T.says(o)); done(); };
  }else if(kind==='starts'){
    q.promptHTML='It starts with…';
    q.promptSpeech=T.startsWith(o);
    q.build=function(el){
      var r=cardRow(); r.appendChild(picCard(o,true)); el.appendChild(r);
      askItems(letterItems([o].concat(others(o,list,2,false)),false,NEUTRAL),String(o.i),correctNow,'ltrchoice');
    };
    q.afterCorrect=function(done){ speak(T.meet(o).replace(/^This is [A-Z]\. /,'')); done(); };
  }else{
    q.promptHTML='Which starts with <b>/'+o.show+'/</b>?';
    q.promptSpeech=T.picStarts(o);
    q.build=function(el){
      var r=cardRow(); var f=letterFriend(o.U+o.l,lcol(o.i),{small:true}); r.appendChild(f);
      r.appendChild(ear(function(){ speak(T.snd(o)); })); el.appendChild(r);
      var opts=[o].concat(others(o,noX,2,false).filter(function(x){return x.U!=='X';}));
      if(opts.length<3) opts=opts.concat(others(o,noX.filter(function(x){return opts.indexOf(x)<0;}),3-opts.length,false));
      askItems(picItems(opts),String(o.i),correctNow,'picchoice');
    };
    q.afterCorrect=function(done){ speak(T.word(o)); speak(T.says(o)); done(); };
  }
  return q;
}
/* ---------- 5. alphabet order ---------- */
function mkOrder(maxI){
  var kind=pick(['missing','missing','after','before']);
  var q={maxN:1,cols:1,help:hintAnswer};
  if(kind==='missing'){
    var s=randInt(0,maxI-3), hole=randInt(1,3), seq=LET.slice(s,s+4), o=seq[hole];
    q.sig='miss'+s+hole; q.nums=[o.i];
    q.promptHTML='Which letter is missing?'; q.promptSpeech='Which letter is missing?';
    q.build=function(el){
      var r=cardRow(); r.classList.add('seq');
      seq.forEach(function(x,i){
        var c=document.createElement('div'); c.className='seqcard pop'; c.style.animationDelay=(i*80)+'ms';
        if(i===hole){ c.classList.add('hole'); c.textContent='?'; q.hole=c; }
        else { c.textContent=x.U; c.style.color=lcol(x.i); }
        r.appendChild(c);
      });
      el.appendChild(r);
      askItems(letterItems([o].concat(others(o,LET.slice(Math.max(0,s-2),s+6).filter(function(x){return seq.indexOf(x)<0;}),2,true)),false,NEUTRAL),String(o.i),correctNow,'ltrchoice');
    };
    q.afterCorrect=function(done){
      q.hole.textContent=o.U; q.hole.classList.remove('hole'); q.hole.style.color=lcol(o.i);
      speak(seq.map(function(x){return x.U;}).join(', ')+'.'); done();
    };
  }else{
    var after=kind==='after', a=after?randInt(0,maxI-1):randInt(1,maxI), base=LET[a], ans=LET[after?a+1:a-1];
    q.sig=kind+a; q.nums=[ans.i];
    q.promptHTML=(after?'What comes after ':'What comes before ')+'<b>'+base.U+'</b>?';
    q.promptSpeech=after?T.after(base):T.before(base);
    q.build=function(el){
      var r=cardRow(); r.classList.add('seq');
      var c1=document.createElement('div'); c1.className='seqcard pop';
      var c2=document.createElement('div'); c2.className='seqcard hole pop'; c2.textContent='?'; q.hole=c2;
      c1.textContent=base.U; c1.style.color=lcol(base.i);
      if(after){ r.appendChild(c1); r.appendChild(c2); } else { r.appendChild(c2); r.appendChild(c1); }
      el.appendChild(r);
      askItems(letterItems([ans].concat(others(ans,LET.slice(Math.max(0,a-3),a+4).filter(function(x){return x!==base;}),2,true)),false,NEUTRAL),String(ans.i),correctNow,'ltrchoice');
    };
    q.afterCorrect=function(done){
      q.hole.textContent=ans.U; q.hole.classList.remove('hole'); q.hole.style.color=lcol(ans.i);
      speak((after?[base,ans]:[ans,base]).map(function(x){return x.U;}).join(', ')+'.'); done();
    };
  }
  return q;
}
/* ---------- 6. blend a first word ---------- */
function mkBlend(words){
  round.bags=round.bags||{};
  var bag=round.bags.cvc;
  if(!bag||bag.i>=bag.list.length) bag=round.bags.cvc={list:shuffle(words.slice()),i:0};
  var c=bag.list[bag.i++];
  var letters=c.w.split('').map(function(ch){ return LET[ch.toUpperCase().charCodeAt(0)-65]; });
  var q={sig:'cvc'+c.w, nums:letters.map(function(x){return x.i;}), maxN:1, cols:1, help:hintAnswer,
    promptHTML:'Say the sounds. Which picture?',
    promptSpeech:TC.blend(c),
    replay:TC.blend(c),
    build:function(el){
      var r=cardRow(); r.classList.add('seq');
      letters.forEach(function(x,i){
        var t=document.createElement('button'); t.className='seqcard tile pop'; t.style.animationDelay=(i*120)+'ms';
        t.textContent=x.l; t.style.color=lcol(x.i);
        t.addEventListener('click',function(){ popSound(); t.classList.remove('bump'); void t.offsetWidth; t.classList.add('bump'); speak(T.snd(x)); });
        r.appendChild(t);
      });
      el.appendChild(r);
      q.row=r;
      var pool=shuffle(CVC.filter(function(x){return x.w!==c.w&&x.p!==c.p;})).slice(0,2);
      var items=[c].concat(pool).map(function(x){ return {key:x.w,html:picImg(x.p),label:x.w}; });
      askItems(items,c.w,correctNow,'picchoice');
    },
    afterCorrect:function(done){
      var tiles=q.row.children;
      for(var i=0;i<tiles.length;i++){ (function(t,k){ later(function(){ t.classList.add('bump'); },k*380); })(tiles[i],i); }
      q.row.classList.add('joined');
      speak(TC.word(c)); done();
    }
  };
  return q;
}
/* ---------- review and mix ---------- */
function mkReview(list){
  var k=randInt(0,3);
  if(k===0) return mkMatch(list);
  if(k===1) return mkSounds(list,'says');
  if(k===2) return mkSounds(list,'starts');
  return mkSounds(list,'pic');
}
function mkMix(){
  var k=randInt(0,4);
  if(k===0) return mkOrder(25);
  if(k===1) return mkBlend(CVC);
  return mkReview(LET);
}

/* ================= stage definitions ================= */
var GNAME=['A to E','F to J','K to O','P to T','U to Z'];
var STAGES=[];
AF.GROUPS.forEach(function(r,g){
  var nm=GNAME[g], L=groupOf(g), n=L.length;
  STAGES.push({id:'meet'+g,  type:'meet',  g:g,title:'Meet '+nm,     short:'Meet '+nm,  total:n,make:function(){return mkMeet(L);}});
  STAGES.push({id:'trace'+g, type:'trace', g:g,title:'Trace '+nm,    short:'Trace '+nm, total:n,make:function(){return mkTraceLetter(L);}});
  STAGES.push({id:'match'+g, type:'match', g:g,title:'Big and little '+nm,short:'Big and little',make:function(){return mkMatch(L);}});
  STAGES.push({id:'sounds'+g,type:'sounds',g:g,title:'Letter sounds '+nm,short:'Sounds '+nm,make:function(){return mkSounds(L);}});
  if(g>0) STAGES.push({id:'review'+g,type:'review',g:g,title:'Review A to '+L[n-1].U,short:'Review',total:6,make:function(){return mkReview(upTo(g));}});
});
STAGES.push({id:'order1',type:'order',title:'ABC order A to M',short:'ABC order',make:function(){return mkOrder(12);}});
STAGES.push({id:'order2',type:'order',title:'ABC order A to Z',short:'ABC order',make:function(){return mkOrder(25);}});
STAGES.push({id:'words1',type:'words',title:'First words',short:'First words',make:function(){return mkBlend(CVC.slice(0,8));}});
STAGES.push({id:'words2',type:'words',title:'More words',short:'More words',make:function(){return mkBlend(CVC);}});
STAGES.push({id:'mix',type:'mix',title:'Big mix',short:'Big mix',total:6,make:function(){return mkMix();}});
function stageById(id){for(var i=0;i<STAGES.length;i++) if(STAGES[i].id===id) return STAGES[i]; return null;}
function stageIndex(id){for(var i=0;i<STAGES.length;i++) if(STAGES[i].id===id) return i; return 0;}
function isUnlocked(i){return i===0 || !!(progress.unlocked&&progress.unlocked[STAGES[i].id]);}

/* ================= trace a letter ================= */
var traceState=null;
function traceGlyph(strokes,opts,done){
  var stage=$('stage');
  stage.className='stage';
  stage.innerHTML='';
  var wrap=document.createElement('div');
  wrap.className='tracewrap';
  stage.appendChild(wrap);
  var NS='http://www.w3.org/2000/svg';
  var svg=document.createElementNS(NS,'svg');
  svg.setAttribute('viewBox','0 0 100 150');
  svg.setAttribute('class','trace-svg');
  svg.style.setProperty('--tc',opts.color||'#ff6f61');
  wrap.appendChild(svg);
  // faint writing lines like a school book
  [20,60,120].forEach(function(y,i){
    var ln=document.createElementNS(NS,'line');
    ln.setAttribute('x1','2'); ln.setAttribute('x2','98'); ln.setAttribute('y1',y); ln.setAttribute('y2',y);
    ln.setAttribute('class','rule'+(i===1?' mid':''));
    svg.appendChild(ln);
  });
  var samples=[], starts=[];
  strokes.forEach(function(d){
    var p=document.createElementNS(NS,'path');
    p.setAttribute('d',d); p.setAttribute('class','guide');
    svg.appendChild(p);
    var L=p.getTotalLength(), steps=Math.max(2,Math.round(L/6));
    starts.push(samples.length);
    for(var i=0;i<=steps;i++){ var pt=p.getPointAtLength(L*i/steps); samples.push({x:pt.x,y:pt.y}); }
  });
  var trail=document.createElementNS(NS,'polyline');
  trail.setAttribute('class','trail'); trail.setAttribute('points','');
  svg.appendChild(trail);
  var cps=samples.map(function(q){
    var c=document.createElementNS(NS,'circle');
    c.setAttribute('class','cp'); c.setAttribute('r','2.4'); c.setAttribute('cx',q.x); c.setAttribute('cy',q.y);
    svg.appendChild(c); return c;
  });
  var dot=document.createElementNS(NS,'circle');
  dot.setAttribute('class','startdot pulse'); dot.setAttribute('r','7');
  svg.appendChild(dot);
  var next=0, finished=false, drawing=false, pts=[], last=null;
  function strokeOf(i){ var s=0; for(var k=0;k<starts.length;k++) if(i>=starts[k]) s=k; return s; }
  function markNext(){
    cps.forEach(function(c,i){ c.setAttribute('class', i<next?'cp hit':(i===next?'cp nextcp':'cp')); });
    if(next<samples.length){
      dot.setAttribute('cx',samples[next].x); dot.setAttribute('cy',samples[next].y);
      var atStart=starts.indexOf(next)>=0;
      dot.style.display=atStart?'':'none';
    }
  }
  markNext();
  setPrompt(opts.html,opts.speech);
  var choices=$('choices'); choices.innerHTML='';
  var skip=document.createElement('button'); skip.className='skipbtn'; skip.textContent='Skip';
  skip.addEventListener('click',function(){ finish(false); });
  choices.appendChild(skip);
  function toSvg(e){
    var pt=svg.createSVGPoint(); pt.x=e.clientX; pt.y=e.clientY;
    return pt.matrixTransform(svg.getScreenCTM().inverse());
  }
  var R=9, LOOK=2, OFF=20, OFFN=6, offCount=0;
  function strokeEnd(k){ return k+1<starts.length?starts[k+1]:samples.length; }
  function restartStroke(){
    // back to the start of the stroke she is on; strokes already finished stay finished
    next=starts[strokeOf(next)]; offCount=0; pts=[]; trail.setAttribute('points','');
    dot.classList.add('pulse'); markNext();
  }
  function offPath(p){
    var k=strokeOf(next), e=strokeEnd(k);
    for(var j=starts[k];j<e;j++){ var dx=samples[j].x-p.x, dy=samples[j].y-p.y; if(dx*dx+dy*dy<=OFF*OFF) return false; }
    return true;
  }
  function advance(p){
    var adv=true;
    while(adv&&next<samples.length){
      adv=false;
      // only look a few dots ahead, and never across into the next stroke without its start dot
      var lim=Math.min(samples.length,next+LOOK+1);
      for(var j=next;j<lim;j++){
        if(j>next&&starts.indexOf(j)>=0) break;
        var dx=samples[j].x-p.x, dy=samples[j].y-p.y;
        if(dx*dx+dy*dy<R*R){ next=j+1; adv=true; break; }
      }
    }
  }
  function onMove(e){
    if(finished) return;
    var p=toSvg(e);
    pts.push(Math.round(p.x)+','+Math.round(p.y));
    trail.setAttribute('points',pts.join(' '));
    var before=next;
    // a fast finger skips across the screen: check the points in between too
    if(last){
      var dx=p.x-last.x, dy=p.y-last.y, n=Math.ceil(Math.sqrt(dx*dx+dy*dy)/3);
      for(var k=1;k<=n;k++) advance({x:last.x+dx*k/n,y:last.y+dy*k/n});
    }else advance(p);
    last=p;
    if(next!==before){
      if(strokeOf(next)!==strokeOf(before)&&next<samples.length) tone(1040,0.08,'sine',0.07);
      markNext();
    }
    if(next>=samples.length){ finish(true); return; }
    // wandering off the letter: after a few moves away from this stroke, start the stroke again
    if(drawing&&offPath(p)){ if(++offCount>=OFFN) restartStroke(); }
    else offCount=0;
  }
  function onDown(e){
    if(finished) return;
    drawing=true; pts=[]; last=null; offCount=0;
    dot.classList.remove('pulse');
    try{ svg.setPointerCapture(e.pointerId); }catch(err){}
    onMove(e);
    e.preventDefault();
  }
  function onUp(){
    drawing=false; last=null;
    if(finished) return;
    // lifting in the middle of a stroke means that stroke starts again
    if(next>starts[strokeOf(next)]) restartStroke();
    dot.classList.add('pulse');
  }
  svg.addEventListener('pointerdown',onDown);
  svg.addEventListener('pointermove',function(e){ if(drawing) onMove(e); });
  svg.addEventListener('pointerup',onUp);
  svg.addEventListener('pointercancel',onUp);
  traceState={svg:svg,samples:samples,starts:starts,get next(){return next;},get finished(){return finished;}};
  function finish(ok){
    if(finished) return;
    finished=true;
    svg.classList.add('done');
    if(ok){ confetti(14); yesSound(); setTimeout(function(){ done(true); },900); }
    else done(false);
  }
}
window.__afTrace=function(){
  if(!traceState) return null;
  var m=traceState.svg.getScreenCTM();
  return {next:traceState.next,total:traceState.samples.length,finished:traceState.finished,starts:traceState.starts,
    pts:traceState.samples.map(function(s){ return {x:m.a*s.x+m.c*s.y+m.e, y:m.b*s.x+m.d*s.y+m.f}; }),scale:m.a};
};
window.__afStart=function(id){ startStage(id); };

/* ================= stickers ================= */
var TYPE_COL={meet:'#ff6f61',trace:'#19b3a6',match:'#8a5cf6',sounds:'#ffb627',review:'#3d8bfd',order:'#ec4a8f',words:'#2fbf71',mix:'#ff8a3d'};
function stickerSVG(id,size){
  var st=stageById(id); if(!st) return '';
  var c=TYPE_COL[st.type]||'#ff6f61', inner='';
  var g=st.g||0, L=groupOf(g), o=L[0];
  var txt=function(t,fs,y,col){ return '<text x="32" y="'+(y||42)+'" text-anchor="middle" font-family="Baloo 2,system-ui,sans-serif" font-weight="800" font-size="'+fs+'" fill="'+(col||'#fff')+'">'+t+'</text>'; };
  if(st.type==='meet') inner='<image href="assets/pics/'+o.pic+'.svg" x="14" y="10" width="36" height="36"/>'+txt(o.U+'–'+L[L.length-1].U,13,58);
  else if(st.type==='trace') inner='<text x="32" y="47" text-anchor="middle" font-family="Baloo 2,system-ui,sans-serif" font-weight="800" font-size="40" fill="none" stroke="#fff" stroke-width="2.4" stroke-dasharray="4 3">'+o.U+'</text>';
  else if(st.type==='match') inner=txt(o.U+o.l,30,44);
  else if(st.type==='sounds') inner='<path d="M18 26h6l8-7v26l-8-7h-6z" fill="#fff"/><path d="M37 25a9 9 0 010 14M41 20a15 15 0 010 24" stroke="#fff" stroke-width="3" fill="none" stroke-linecap="round"/>'+txt(o.l,14,58);
  else if(st.type==='review') inner='<image href="assets/pics/2b50.svg" x="16" y="10" width="32" height="32"/>'+txt('A–'+L[L.length-1].U,13,58);
  else if(st.type==='order') inner=txt(id==='order1'?'ABC':'XYZ',20,40)+txt(id==='order1'?'A–M':'A–Z',12,56);
  else if(st.type==='words') inner='<image href="assets/pics/'+(id==='words1'?'1f431':'1f414')+'.svg" x="16" y="8" width="32" height="32"/>'+txt(id==='words1'?'cat':'hen',14,56);
  else inner='<image href="assets/pics/1f4af.svg" x="14" y="12" width="36" height="36"/>';
  return '<svg viewBox="0 0 64 64" width="'+(size||'100%')+'" height="'+(size||'100%')+'"><circle cx="32" cy="32" r="30" fill="'+c+'"/><circle cx="32" cy="32" r="26" fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"/>'+inner+'</svg>';
}
function renderStickers(){
  var grid=$('stickerGrid');
  if(!grid) return;
  grid.innerHTML='';
  STAGES.forEach(function(st){
    var lv=progress.stickers?progress.stickers[st.id]||0:0;
    var d=document.createElement('div');
    d.className='sticker'+(lv?'':' locked')+(lv===2?' shiny':'');
    d.innerHTML=stickerSVG(st.id);
    grid.appendChild(d);
  });
  renderDress();
}

/* ================= sing-along ================= */
var song={on:false};
function renderSong(){
  var g=$('songGrid'); g.innerHTML='';
  LET.forEach(function(o){
    var b=document.createElement('button');
    b.className='songtile'; b.style.setProperty('--c',lcol(o.i)); b.dataset.i=o.i;
    b.innerHTML='<b>'+o.U+'</b><i>'+o.l+'</i>';
    b.addEventListener('click',function(){
      if(song.on) return;
      popSound(); bounceTile(o.i); showSongPic(o); speak(T.says(o)); speak(T.word(o));
    });
    g.appendChild(b);
  });
  $('songPic').innerHTML='';
}
function bounceTile(i){
  var t=document.querySelector('.songtile[data-i="'+i+'"]'); if(!t) return;
  t.classList.remove('sing'); void t.offsetWidth; t.classList.add('sing');
}
function showSongPic(o){ $('songPic').innerHTML=picImg(o.pic,'songimg')+'<span>'+o.U+' is for '+o.word+'</span>'; }
function singAlong(){
  if(song.on) return;
  clearSpeech(); song.on=true; $('singBtn').classList.add('on');
  var i=0, gen=++song.gen;
  speak("Let's sing the alphabet!");
  function step(){
    if(!song.on||gen!==song.gen||curScreen!=='song') return;
    if(i>=LET.length){
      song.on=false; $('singBtn').classList.remove('on');
      confetti(30); fanfare(); speak('Now you know your A B C! Well done!');
      return;
    }
    var o=LET[i++];
    bounceTile(o.i); tone(523*Math.pow(2,[0,0,7,7,9,9,7,5,5,4,4,2,2,2,2,0,7,7,5,4,4,2,7,7,5,4][o.i]/12),0.18,'triangle',0.05);
    speak(T.name(o),{rate:1});
    onSpeechIdle(function(){ later(step,110); });
  }
  onSpeechIdle(function(){ later(step,250); });
}
song.gen=0;
/* test hook: draw one glyph on its own */
window.__afTraceTest=function(up,ch){
  window.__afTraceResult=null;
  if(curScreen!=='play') setScreen('play');
  traceGlyph(up?AF.TRACE.up[ch]:AF.TRACE.lo[ch],{html:'Trace '+ch,speech:''},function(ok){ window.__afTraceResult=ok; });
};
window.AF_DEBUG.state=function(){ return {screen:curScreen,answer:round.answer,locked:round.locked,index:round.index,stage:round.stage&&round.stage.id,trace:!!(traceState&&!traceState.finished&&document.querySelector('#stage .trace-svg'))}; };
window.AF_DEBUG.stages=function(){ return STAGES.map(function(s){return s.id;}); };
