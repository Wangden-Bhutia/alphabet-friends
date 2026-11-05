
(function(){
"use strict";

/* ================= constants ================= */
var PALETTE=['#e8453c','#f28c1e','#f5c518','#5cb85c','#29a3e0','#3f51b5','#8e5bd0','#ec4a8f','#c2703d','#12a5a5'];
var NEUTRAL='#3b3f6b';   // one colour for every letter choice, so colour never gives the answer away
var WORDS=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
var PRAISE=['Yes!','Well done!','Great listening!','That is right!','Super!','You did it!','Brilliant!','Lovely!'];
var PERSIST=['You kept trying!','You worked it out!','Good thinking!','You did not give up!'];
var NUDGE=['Almost. Try again.','Listen again.','Have another look.','Nearly. Try once more.'];
var ROUNDS=5;
var KEY='af1';

/* ================= utils ================= */
function $(id){return document.getElementById(id);}
function randInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function shuffle(a){for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
function colorOf(n){return PALETTE[(n-1)%10];}
var timers=[];
window.AF_DEBUG={};
function later(fn,ms){var id=setTimeout(fn,ms);timers.push(id);return id;}
function clearTimers(){
  timers.forEach(clearTimeout);
  timers=[];
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null;}
}

/* ================= audio ================= */
var actx=null, muted=false, musicOn=true, musicPlay=false, curScreen='map';
function musicAllowed(){
  if(!musicOn) return false;
  if(curScreen==='play') return musicPlay;   // quiet while she is learning, unless switched on
  return true;
}
function syncMusic(){
  var want=musicAllowed();
  if(want){ if(!music.playing){ audio(); music.start(); } }
  else if(music.playing){ music.stop(); }
  var btn=$('musicBtn');
  if(btn) btn.classList.toggle('off',!want);
}
function audio(){
  if(muted) return null;
  try{
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    return actx;
  }catch(e){return null;}
}
function ctxAny(){
  try{
    if(!actx) actx=new (window.AudioContext||window.webkitAudioContext)();
    if(actx.state==='suspended') actx.resume();
    return actx;
  }catch(e){return null;}
}
function tone(freq,dur,type,vol,delay){
  var c=audio(); if(!c) return;
  try{
    var t0=c.currentTime+(delay||0);
    var o=c.createOscillator(),g=c.createGain();
    o.type=type||'sine';
    o.frequency.setValueAtTime(freq,t0);
    g.gain.setValueAtTime(0,t0);
    g.gain.linearRampToValueAtTime(vol||0.14,t0+0.012);
    g.gain.exponentialRampToValueAtTime(0.0008,t0+(dur||0.15));
    o.connect(g);g.connect(c.destination);
    o.start(t0);o.stop(t0+(dur||0.15)+0.03);
  }catch(e){}
}
function popSound(){tone(700,0.08,'triangle',0.10);}
function yesSound(){tone(523,0.13,'triangle',0.13,0);tone(659,0.13,'triangle',0.13,0.09);tone(784,0.2,'triangle',0.13,0.18);}
function noSound(){tone(300,0.15,'sine',0.10,0);tone(232,0.19,'sine',0.10,0.11);}
function whoosh(){
  var c=audio(); if(!c) return;
  try{
    var dur=0.22,t0=c.currentTime;
    var o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();
    o.type='sine';
    o.frequency.setValueAtTime(700,t0);
    o.frequency.exponentialRampToValueAtTime(240,t0+dur);
    f.type='lowpass'; f.frequency.value=1400;
    g.gain.setValueAtTime(0.0001,t0);
    g.gain.linearRampToValueAtTime(0.13,t0+0.02);
    g.gain.exponentialRampToValueAtTime(0.0008,t0+dur);
    o.connect(f);f.connect(g);g.connect(c.destination);
    o.start(t0);o.stop(t0+dur+0.04);
  }catch(e){}
}
function starSound(){tone(900,0.09,'sine',0.10,0);tone(1200,0.14,'sine',0.09,0.07);}
function fanfare(){[523,659,784,1047].forEach(function(f,i){tone(f,0.24,'triangle',0.13,i*0.12);});}

/* ---------- background music ----------
   A gentle pentatonic loop: soft marimba melody, warm bass, a light shimmer.
   Everything is generated, so the file stays self-contained.            */
var music={
  master:null, timer:null, step:0, nextTime:0, playing:false, ducked:false,
  base:293.66,                        // C4
  pent:[0,2,4,7,9,12,14,16,19,21],    // C D E G A C D E G A
  melodyA:[5,3,4,2, 6,4,3,1, 4,2,3,0, 5,4,2,-1],
  melodyB:[4,2,5,3, 7,5,4,2, 5,3,2,1, 4,3,1,-1],
  bass:[0,0,3,3, 2,2,1,1],
  start:function(){
    var c=ctxAny(); if(!c||this.playing) return;
    this.playing=true; this.step=0; this.nextTime=c.currentTime+0.15;
    this.master=c.createGain();
    this.master.gain.setValueAtTime(0.0001,c.currentTime);
    this.master.gain.linearRampToValueAtTime(this.ducked?0.16:0.52,c.currentTime+1.2);
    this.master.connect(c.destination);
    var self=this;
    this.timer=setInterval(function(){self.tick();},120);
    this.tick();
  },
  stop:function(){
    if(this.timer) clearInterval(this.timer);
    this.timer=null;
    if(this.master){
      try{
        var m=this.master,c=actx;
        m.gain.cancelScheduledValues(c.currentTime);
        m.gain.setValueAtTime(m.gain.value,c.currentTime);
        m.gain.linearRampToValueAtTime(0.0001,c.currentTime+0.4);
        setTimeout(function(){try{m.disconnect();}catch(e){}},600);
      }catch(e){}
    }
    this.master=null; this.playing=false;
  },
  setDuck:function(on){
    this.ducked=on;
    if(!this.master||!actx) return;
    try{
      var t=actx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setValueAtTime(this.master.gain.value,t);
      this.master.gain.linearRampToValueAtTime(on?0.16:0.52,t+0.25);
    }catch(e){}
  },
  note:function(freq,t,dur,vol,type){
    var c=actx; if(!c||!this.master) return;
    try{
      var o=c.createOscillator(),g=c.createGain();
      o.type=type||'sine';
      o.frequency.setValueAtTime(freq,t);
      g.gain.setValueAtTime(0,t);
      g.gain.linearRampToValueAtTime(vol,t+0.02);
      g.gain.exponentialRampToValueAtTime(0.0006,t+dur);
      o.connect(g);g.connect(this.master);
      o.start(t);o.stop(t+dur+0.05);
    }catch(e){}
  },
  tick:function(){
    var c=actx; if(!c||!this.playing||!this.master) return;
    var beat=0.46;
    if(this.nextTime < c.currentTime) this.nextTime = c.currentTime + 0.06;
    while(this.nextTime<c.currentTime+0.5){
      var i=this.step, t=this.nextTime;
      var phrase=(Math.floor(i/16)%2===0)?this.melodyA:this.melodyB;
      var m=phrase[i%phrase.length];
      if(m>=0){
        var f=this.base*Math.pow(2,this.pent[m]/12);
        this.note(f,t,0.8,0.17,'triangle');
        this.note(f*2,t,0.55,0.05,'sine');
        if(i%4===0) this.note(f*1.5,t+0.02,0.9,0.035,'sine');
      }
      if(i%2===0){
        var b=this.bass[(i/2)%this.bass.length];
        this.note(this.base/2*Math.pow(2,this.pent[b]/12),t,1.2,0.12,'sine');
      }
      if(i%16===8){ this.note(this.base*4,t+0.23,0.9,0.035,'sine'); }
      this.nextTime+=beat;
      this.step++;
    }
  }
};

/* ================= speech =================
   A natural recorded voice (neural TTS clips in assets/audio, mapped by
   assets/audio/manifest.json). Sentences are matched whole when possible,
   otherwise stitched from the longest recorded pieces. Anything never
   recorded (a child's name) falls back to the best female device voice. */
var voices=[], chosenVoice=null, voiceMuted=false, useClips=true;
var CLIPS=null, clipBuf={}, clipLoading={}, vctx=null, curSrc=null;
var AUDIO_BASE='assets/audio/';
var FEMALE=/Samantha|Google UK English Female|Neerja|Aria|Jenny|Ava|Allison|Susan|Zira|Karen|Moira|Tessa|Serena|Fiona|Victoria|Veena|Kate|Libby|Sonia|Natasha|Female|Heera|Lekha|Salli|Joanna|Kendra|Kimberly|Ivy|Emma|Amy|Michelle/i;
var MALE=/Daniel|Alex\b|Fred|Rishi|David|Mark|George|Guy|Ryan|Male|Aaron|Arthur|Oliver|Thomas|Gordon|Lee\b|Ravi|Prabhat/i;
var GOOD=/Natural|Neural|Enhanced|Premium|Wavenet|Studio|Online/i;
function loadVoices(){
  if(!('speechSynthesis' in window)) return;
  try{
    voices=(window.speechSynthesis.getVoices()||[]).filter(function(v){return /^en/i.test(v.lang||'');});
    if(!voices.length) voices=window.speechSynthesis.getVoices()||[];
    var saved=null;
    try{saved=localStorage.getItem(KEY+'_voice');}catch(e){}
    useClips=!saved||saved==='natural';
    if(saved&&!useClips){ chosenVoice=voices.filter(function(v){return v.voiceURI===saved;})[0]||null; if(!chosenVoice) useClips=true; }
    if(!chosenVoice) chosenVoice=pickBestVoice();
    fillVoiceList();
  }catch(e){}
}
function scoreVoice(v){
  var s=0, lang=(v.lang||'').toLowerCase(), n=v.name||'';
  if(lang==='en-in'||lang==='en-gb'||lang==='en-us') s+=20; else if(/^en/.test(lang)) s+=12;
  if(FEMALE.test(n)) s+=50;
  if(MALE.test(n)) s-=60;
  if(GOOD.test(n)) s+=25;
  if(/Samantha|Neerja|Aria|Jenny|Google UK English Female/i.test(n)) s+=15;
  if(/compact|espeak|festival/i.test(n)) s-=40;
  return s;
}
function pickBestVoice(){
  if(!voices.length) return null;
  var best=voices[0],bs=-999;
  voices.forEach(function(v){var s=scoreVoice(v); if(s>bs){bs=s;best=v;}});
  return best;
}
function fillVoiceList(){
  var sel=$('voiceSel'); if(!sel) return;
  sel.innerHTML='';
  var o0=document.createElement('option'); o0.value='natural'; o0.textContent='Natural voice (recommended)';
  if(useClips) o0.selected=true;
  sel.appendChild(o0);
  voices.slice().sort(function(a,b){return scoreVoice(b)-scoreVoice(a);}).forEach(function(v){
    var o=document.createElement('option');
    o.value=v.voiceURI;
    o.textContent='Phone voice: '+v.name+' · '+(v.lang||'');
    if(!useClips&&chosenVoice&&v.voiceURI===chosenVoice.voiceURI) o.selected=true;
    sel.appendChild(o);
  });
}
if('speechSynthesis' in window){
  try{ window.speechSynthesis.onvoiceschanged=function(){loadVoices();}; }catch(e){}
}
var hasSpeech=('speechSynthesis' in window)&&(typeof SpeechSynthesisUtterance!=='undefined');
var sq=[],speaking=false,speechGen=0,duckState=false,unduckTimer=null,watchdog=null,idleCbs=[];

/* ---- clip library ---- */
function loadClips(){
  if(!window.fetch) return;
  fetch(AUDIO_BASE+'manifest.json').then(function(r){return r.json();}).then(function(m){
    CLIPS=m;
    // warm up the numbers so counting is instant
    'abcdefghijklmnopqrstuvwxyz'.split('').forEach(function(ch){ if(CLIPS[ch]) getClip(CLIPS[ch]); });
  }).catch(function(){});
}
function voiceCtx(){
  try{
    if(!vctx) vctx=new (window.AudioContext||window.webkitAudioContext)();
    if(vctx.state==='suspended') vctx.resume();
  }catch(e){ vctx=null; }
  return vctx;
}
function unlockVoice(){
  var c=voiceCtx(); if(!c) return;
  try{ var b=c.createBuffer(1,1,22050),s=c.createBufferSource(); s.buffer=b; s.connect(c.destination); s.start(0); }catch(e){}
}
function getClip(file){
  if(clipBuf[file]) return Promise.resolve(clipBuf[file]);
  if(clipLoading[file]) return clipLoading[file];
  var c=voiceCtx();
  var p=fetch(AUDIO_BASE+file).then(function(r){ if(!r.ok) throw 0; return r.arrayBuffer(); }).then(function(ab){
    if(!c) throw 0;
    return new Promise(function(res,rej){ c.decodeAudioData(ab,res,rej); });
  }).then(function(buf){ clipBuf[file]=buf; delete clipLoading[file]; return buf; },
          function(e){ delete clipLoading[file]; throw e; });
  clipLoading[file]=p;
  return p;
}
var ONES_W=['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
var TENS_W=['','','twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
function numWords(n){
  if(n<20) return ONES_W[n];
  if(n<100) return TENS_W[Math.floor(n/10)]+(n%10?' '+ONES_W[n%10]:'');
  if(n<1000) return ONES_W[Math.floor(n/100)]+' hundred'+(n%100?' and '+numWords(n%100):'');
  return String(n);
}
function normKey(s){
  s=String(s).toLowerCase().replace(/[’']/g,'');
  s=s.replace(/\d+/g,function(d){return ' '+numWords(parseInt(d,10))+' ';});
  return s.replace(/[^a-z ]+/g,' ').replace(/\s+/g,' ').trim();
}
function planSpeech(text){
  var out=[], re=/[^.!?,…—]+[.!?,…—]*/g, m;
  while((m=re.exec(text))){
    var seg=m[0], punct=(seg.match(/[.!?,…—]+\s*$/)||[''])[0];
    var gap=/[.!?…]/.test(punct)?230:(punct?110:60);
    var k=normKey(seg); if(!k) continue;
    if(CLIPS[k]){ out.push({clip:CLIPS[k],gap:gap}); continue; }
    var w=k.split(' '), i=0, pend=[];
    while(i<w.length){
      var found=0;
      for(var j=Math.min(w.length,i+12);j>i;j--){ if(CLIPS[w.slice(i,j).join(' ')]){found=j;break;} }
      if(found){
        if(pend.length){ out.push({text:pend.join(' '),gap:40}); pend=[]; }
        out.push({clip:CLIPS[w.slice(i,found).join(' ')],gap:15});
        i=found;
      }else{ pend.push(w[i]); i++; }
    }
    if(pend.length) out.push({text:pend.join(' '),gap:40});
    if(out.length) out[out.length-1].gap=gap;
  }
  return out;
}
window.AF_DEBUG.plan=function(t){ return CLIPS?planSpeech(t):null; };

function estimateMs(text,rate){
  var words=String(text).split(/\s+/).length;
  return (340+words*400)/(rate||1);
}
function fireIdleCbs(){
  if(speaking||sq.length) return;
  var cbs=idleCbs; idleCbs=[];
  cbs.forEach(function(fn){ try{ fn(); }catch(e){} });
}
function onSpeechIdle(fn){
  var gen=speechGen;
  setTimeout(function(){
    if(gen!==speechGen) return;
    if(!speaking&&!sq.length) fn();
    else idleCbs.push(fn);
  },0);
}
function updateDuck(){
  if(speaking||sq.length){
    if(unduckTimer){clearTimeout(unduckTimer);unduckTimer=null;}
    if(!duckState){duckState=true;music.setDuck(true);}
  }else{
    fireIdleCbs();
    if(duckState&&!unduckTimer){
      unduckTimer=setTimeout(function(){
        unduckTimer=null;
        if(!speaking&&!sq.length&&duckState){duckState=false;music.setDuck(false);}
      },300);
    }
  }
}
function stopCurrent(){
  if(curSrc){ try{ curSrc.onended=null; curSrc.stop(); }catch(e){} curSrc=null; }
  try{ if(hasSpeech) window.speechSynthesis.cancel(); }catch(e){}
}
function clearSpeech(){
  sq.length=0;
  speechGen++;
  speaking=false;
  idleCbs=[];
  if(watchdog){clearTimeout(watchdog);watchdog=null;}
  stopCurrent();
  updateDuck();
}
function ttsSay(text,rate,pitch,done){
  if(!hasSpeech){ setTimeout(done,0); return; }
  try{
    var u=new SpeechSynthesisUtterance(text);
    if(chosenVoice) u.voice=chosenVoice;
    u.rate=rate; u.pitch=pitch; u.volume=1;
    var fired=false; function f(){ if(fired) return; fired=true; done(); }
    u.onend=f; u.onerror=f;
    window.speechSynthesis.speak(u);
    setTimeout(f,estimateMs(text,rate)+2500);
  }catch(e){ setTimeout(done,0); }
}
function playBuf(buf,speed,done){
  var c=voiceCtx(); if(!c){ done(); return; }
  try{
    var s=c.createBufferSource(), g=c.createGain();
    s.buffer=buf; s.playbackRate.value=speed; g.gain.value=1.0;
    s.connect(g); g.connect(c.destination);
    var fired=false; function f(){ if(fired) return; fired=true; if(curSrc===s) curSrc=null; done(); }
    s.onended=f; curSrc=s; s.start(0);
    setTimeout(f,buf.duration*1000/speed+600);
  }catch(e){ done(); }
}
function pump(){
  if(speaking||!sq.length) return;
  var item=sq.shift();
  var myGen=speechGen;
  var rate=item.opts.rate||0.9;
  var fast=sq.length>=2;
  if(fast) rate=Math.min(1.75,rate*1.35);   // catch up when she taps fast
  speaking=true;

  function finish(){
    if(myGen!==speechGen) return;
    if(watchdog){clearTimeout(watchdog);watchdog=null;}
    speaking=false;
    pump();
    updateDuck();
  }
  var parts=(useClips&&CLIPS&&voiceCtx())?planSpeech(item.text):[{text:item.text,gap:0}];
  if(!hasSpeech) parts=parts.filter(function(p){return p.clip;});
  parts.forEach(function(p){ if(p.clip) getClip(p.clip).catch(function(){}); });   // fetch everything at once
  var idx=0;
  function next(){
    if(myGen!==speechGen) return;
    if(idx>=parts.length){ finish(); return; }
    var p=parts[idx++];
    var after=function(){ if(myGen!==speechGen) return; setTimeout(next,fast?p.gap*0.4:p.gap); };
    if(p.clip){
      getClip(p.clip).then(function(buf){
        if(myGen!==speechGen) return;
        playBuf(buf,fast?1.22:1,after);
      },function(){
        if(myGen!==speechGen) return;
        var k=null; for(var key in CLIPS) if(CLIPS[key]===p.clip){k=key;break;}
        ttsSay(k||'',useClips?0.92:rate,1.12,after);
      });
    }else{
      ttsSay(p.text,useClips?Math.min(rate+0.04,1.1):rate,useClips?1.12:1.08,after);
    }
  }
  next();

  watchdog=setTimeout(function(){
    watchdog=null;
    if(myGen!==speechGen||!speaking) return;
    speaking=false;
    pump();
    updateDuck();
  },estimateMs(item.text,rate)*1.6+4000);

  updateDuck();
}
function speak(text,opts){
  if(text){ var _sp=window.AF_DEBUG.spoken=window.AF_DEBUG.spoken||[]; if(_sp.length<5000) _sp.push(String(text)); }
  if(voiceMuted||!text) return;
  if(!hasSpeech&&!(window.AudioContext||window.webkitAudioContext)) return;
  sq.push({text:String(text),opts:opts||{}});
  updateDuck();
  pump();
}

/* ================= progress ================= */
var progress={stars:{},rounds:0};
function loadProgress(){
  try{var raw=localStorage.getItem(KEY+'_p'); if(raw) progress=JSON.parse(raw)||{stars:{},rounds:0};}catch(e){}
  if(!progress.stars) progress.stars={};
  if(typeof progress.points!=='number'){
    var sum=0; for(var k in progress.stars) sum+=progress.stars[k]||0;
    progress.points=sum;              // carry an old save's stars into the running counter
  }
  // anything before an unlocked stage is unlocked too, so the map has no locked holes
  if(progress.unlocked){
    STAGES.forEach(function(st,i){
      if(progress.unlocked[st.id]){
        for(var j=0;j<i;j++) progress.unlocked[STAGES[j].id]=true;
      }
    });
  }
  // one-time migration: stages unlocked under the old any-star rule stay unlocked
  if(!progress.unlocked){
    progress.unlocked={};
    STAGES.forEach(function(st,i){
      if(i>0&&(progress.stars[STAGES[i-1].id]||0)>=1) progress.unlocked[st.id]=true;
    });
    saveProgress();
  }
}
function saveProgress(){try{localStorage.setItem(KEY+'_p',JSON.stringify(progress));}catch(e){}}

/* ---- every answer is kept, so the game can lean on what she finds hard ---- */
var answerLog=[];
function loadLog(){
  try{ var r=localStorage.getItem(KEY+'_log'); if(r) answerLog=JSON.parse(r)||[]; }catch(e){ answerLog=[]; }
  if(!Array.isArray(answerLog)) answerLog=[];
}
function saveLog(){ try{ localStorage.setItem(KEY+'_log',JSON.stringify(answerLog.slice(-400))); }catch(e){} }
function logAnswer(nums,ok){
  if(!nums||!nums.length) return;
  answerLog.push({s:round.stage?round.stage.id:'',n:nums.slice(0,4),ok:ok?1:0,t:Date.now()});
  saveLog();
}
/* ---- how long she has actually been playing ---- */
var lastTick=Date.now();
function dayKey(d){
  return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2);
}
function addPlayTime(){
  var now=Date.now(), gap=Math.min(45000,now-lastTick);
  lastTick=now;
  if(gap<1500) return;
  progress.time=progress.time||{};
  var k=dayKey(new Date());
  progress.time[k]=(progress.time[k]||0)+Math.round(gap/1000);
  var keys=Object.keys(progress.time).sort();
  while(keys.length>14){ delete progress.time[keys.shift()]; }
  saveProgress();
}
/* ---- which numbers deserve another go ---- */
function weakNumbers(lo,hi){
  var score={};
  answerLog.slice(-40).forEach(function(e){
    (e.n||[]).forEach(function(n){
      if(n<lo||n>hi) return;
      score[n]=(score[n]||0)+(e.ok?-0.6:1);
    });
  });
  return Object.keys(score).map(Number)
    .filter(function(n){ return score[n]>0.4; })
    .sort(function(a,b){ return score[b]-score[a]; });
}
function totalStars(){var s=0;for(var k in progress.stars) s+=progress.stars[k]||0;return s;}
/* ---------------- the star jar ---------------- */
var jarSeq=0;
function jarSVG(pct,size){
  pct=Math.max(0,Math.min(1,pct||0));
  var id='jar'+(++jarSeq);
  var h=34*pct;
  return '<svg class="jar" width="'+size+'" height="'+Math.round(size*1.2)+'" viewBox="0 0 40 48" aria-hidden="true">'+
    '<defs><clipPath id="'+id+'"><rect x="9" y="7" width="22" height="36" rx="7"/></clipPath></defs>'+
    '<rect x="9" y="7" width="22" height="36" rx="7" fill="#eaf4ff"/>'+
    '<g clip-path="url(#'+id+')"><rect x="9" y="'+(43-h).toFixed(1)+'" width="22" height="'+h.toFixed(1)+'" fill="#f7b731"/>'+
    (pct>0.05?'<circle cx="15.5" cy="'+(40-h*0.55).toFixed(1)+'" r="1.5" fill="#fff" opacity=".55"/>':'')+
    '</g>'+
    '<rect x="13" y="2" width="14" height="6" rx="3" fill="#20304a"/>'+
    '<rect x="9" y="7" width="22" height="36" rx="7" fill="none" stroke="#20304a" stroke-width="2.4"/>'+
    '</svg>';
}
function jarParts(){
  var pts=progress.points||0;
  return {full:Math.floor(pts/10), part:(pts%10)/10, total:pts};
}
function showStars(){
  var el=$('jarTop');
  if(el) el.innerHTML=jarSVG(jarParts().part,26);
  renderMapJar();
}
function renderMapJar(){
  var el=$('mapJar');
  if(!el) return;
  var j=jarParts();
  var html='<div style="display:flex;flex-direction:column;align-items:center;gap:2px">'+jarSVG(j.part,54)+'</div>';
  if(j.full>0){
    var n=Math.min(j.full,6), shelf='';
    for(var i=0;i<n;i++) shelf+=jarSVG(1,16);
    if(j.full>6) shelf+='<span style="font-weight:800;color:#8a5a00;font-size:12px;align-self:center">+'+(j.full-6)+'</span>';
    html+='<div class="shelf">'+shelf+'</div>';
  }
  el.innerHTML=html;
}
function jarFull(){
  confetti(30);
  toast('Your jar is full!');
  speak('Your jar is full! Well done!',{rate:0.9});
  var box=$('jarTop');
  if(box&&box.animate) box.animate([{transform:'scale(1)'},{transform:'scale(1.45) rotate(6deg)'},{transform:'scale(1)'}],
    {duration:750,easing:'ease-out'});
}

function popIn(){}
function floorEl(){var f=document.createElement('div');f.className='floor';return f;}

function fitStage(el,maxN,cols,reserve){
  if(!el) return;
  var h=el.clientHeight-22-(reserve||0), w=el.clientWidth-16;
  var byH=h/Math.max(1,maxN)/1.08;
  var byW=w/Math.max(1,cols)/1.12;
  var bs=Math.floor(Math.min(byH,byW,128));
  bs=Math.max(bs,14);
  el.style.setProperty('--bs',bs+'px');
}
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
        if(!ok1) round.firstTry=false;
        traceGlyph(AF.TRACE.lo[o.l],{html:'Now little <b>'+o.l+'</b>',speech:T.traceSmall(o),color:lcol(o.i)},function(ok2){
          if(!ok2) round.firstTry=false;
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

/* ================= idle replay ================= */
var idleTimer=null;
function armIdle(){
  if(idleTimer){clearTimeout(idleTimer);idleTimer=null;}
  idleTimer=setTimeout(function(){
    idleTimer=null;
    if(round.locked||round.idleReplayed) return;
    round.idleReplayed=true;
    if(round.promptSpeech) speak(round.promptSpeech,{rate:0.9});
  },8000);
}

/* ================= rewards ================= */
var lastReward=-1;
function nextRewardIdx(){
  var i,g=0;
  do{ i=randInt(0,3); g++; }while(i===lastReward&&g<10);
  lastReward=i; return i;
}
function addPoint(amount){
  amount=(amount===undefined)?1:amount;
  var before=progress.points||0;
  progress.points=before+amount;
  saveProgress();
  showStars();
  starSound();
  var box=$('jarTop');
  if(box&&box.animate) box.animate([{transform:'scale(1)'},{transform:'scale(1.16)'},{transform:'scale(1)'}],
    {duration:420,easing:'ease-out'});
  if(Math.floor(progress.points/10)>Math.floor(before/10)) jarFull();
}
/* a correct answer after a mistake: half a star and a smaller sparkle */
function effortReward(){
  confetti(9);
  tone(880,0.1,'sine',0.09);
  tone(1180,0.16,'sine',0.07,0.08);
  addPoint(0.5);
}
function danceBlocks(){
  var blks=document.querySelectorAll('#stage .lf, #stage .seqcard, #stage .piccard');
  for(var i=0;i<blks.length;i++){
    (function(b,k){ b.style.animationDelay=(k*45)+'ms'; b.classList.add('dance');
      later(function(){ b.classList.remove('dance'); b.style.animationDelay=''; },1300+k*45); })(blks[i],i);
  }
}
function jumpTower(){
  var blks=document.querySelectorAll('#stage .lf, #stage .seqcard, #stage .piccard');
  for(var i=0;i<blks.length;i++){
    (function(b,k){ b.style.animationDelay=(k*40)+'ms'; b.classList.add('jump');
      later(function(){ b.classList.remove('jump'); b.style.animationDelay=''; },900+k*40); })(blks[i],i);
  }
}
function flyStar(done){
  var box=$('jarTop').getBoundingClientRect();
  var stage=$('stage').getBoundingClientRect();
  var x0=stage.left+stage.width/2-19, y0=stage.top+stage.height/2-19;
  var el=document.createElement('div');
  el.className='flystar';
  el.style.left=x0+'px'; el.style.top=y0+'px';
  el.innerHTML='<svg viewBox="0 0 24 24" fill="#f7b731"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z"/></svg>';
  document.body.appendChild(el);
  tone(880,0.12,'sine',0.12);
  requestAnimationFrame(function(){
    var dx=box.left+box.width/2-19-x0, dy=box.top+box.height/2-19-y0;
    el.style.transform='translate('+dx+'px,'+dy+'px) scale(.5)';
    el.style.opacity='.85';
  });
  later(function(){ el.remove(); if(done) done(); },780);
}
var praiseCount=0;
/* her name, but never more than one line in four */
function withName(line){
  praiseCount++;
  var nm=(progress.name||'').trim();
  if(!nm||praiseCount%4!==0) return line;
  return line.replace(/!+$/,'')+', '+nm+'!';
}
function playReward(){
  var i=nextRewardIdx();
  if(i===0){ confetti(); addPoint(1); }
  else if(i===1){ danceBlocks(); addPoint(1); }
  else if(i===2){ flyStar(function(){ addPoint(1); }); }
  else { jumpTower(); addPoint(1); }
}

/* ================= round engine ================= */
var round={stage:null,index:0,locked:true,wins:0,mistakes:0,firstTry:true,q:null,answer:null,zeroUsed:false};

function startStage(id,fromIndex,stageObj){
  clearTimers();
  clearSpeech();
  var st=stageObj||stageById(id);
  if(!st) return;
  var carry=(fromIndex&&progress.carry)?(progress.carry[id]||null):null;
  round={stage:st,index:fromIndex||0,total:st.total||ROUNDS,locked:true,
         wins:carry?(carry.wins||0):0,
         mistakes:0,firstTry:true,q:null,answer:null,
         zeroUsed:carry?!!carry.zeroUsed:false,
         idleReplayed:false,lastSig:null,bags:null};
  $('topTitle').textContent=st.short||st.title;
  setScreen('play');
  buildDots();
  nextRound();
}
function buildDots(){
  var d=$('dots');
  d.innerHTML='';
  var total=round.total||ROUNDS;
  for(var i=0;i<total;i++){
    var s=document.createElement('div');
    s.className='dot'+(i<round.index?' on':'');
    d.appendChild(s);
  }
}
function updateDots(){
  var ds=$('dots').children;
  for(var i=0;i<ds.length;i++) ds[i].classList.toggle('on',i<round.index);
}

function nextRound(){
  clearTimers();
  clearSpeech();
  if(round.index>=(round.total||ROUNDS)){ finishStage(); return; }
  round.locked=false; round.mistakes=0; round.firstTry=true; round.answer=null;
  round.idleReplayed=false;
  updateDots();

  var stage=$('stage');
  stage.className='stage';
  stage.innerHTML='';
  stage.appendChild(floorEl());
  $('choices').innerHTML='';

  var q=round.stage.make(), tries=0;
  while(q.sig&&q.sig===round.lastSig&&tries++<5) q=round.stage.make();
  round.lastSig=q.sig;
  round.q=q;
  fitStage(stage,q.maxN||10,q.cols||2);
  q.build(stage);
  if(!q.noChoices) setPrompt(q.promptHTML,q.promptSpeech);
  armIdle();
}

function setPrompt(html,speechText){
  $('qText').innerHTML=html;
  round.promptSpeech=speechText||'';
  if(speechText) speak(speechText);
}

function correctNow(){
  if(round.locked) return;
  round.locked=true;
  var firstTry=round.firstTry;
  if(firstTry) round.wins++;
  round.index++;
  updateDots();
  progress.rounds=(progress.rounds||0)+1;
  if(round.index<(round.total||ROUNDS)&&round.stage.id!=='warmup'){
    progress.carry=progress.carry||{};
    progress.carry[round.stage.id]={index:round.index,wins:round.wins,zeroUsed:round.zeroUsed};
  }
  saveProgress();
  addPlayTime();
  logAnswer(round.q&&round.q.nums,true);

  yesSound();
  var praise;
  if(firstTry){
    playReward();
    praise=PRAISE[randInt(0,PRAISE.length-1)];
  }else{
    effortReward();
    praise=PERSIST[randInt(0,PERSIST.length-1)];
  }
  praise=withName(praise);
  setPrompt(praise,praise);

  var q=round.q;
  later(function(){
    if(q&&q.afterCorrect) q.afterCorrect(finishRound);
    else finishRound();
  },420);
}

function finishRound(){
  var total=round.total||ROUNDS;
  if(round.index>=total){ finishStage(); return; }
  var label=round.index>=total-1?'Finish':'Next';
  showNext(label,nextRound);
}

function wrongNow(btn,msg){
  if(round.locked) return;
  round.firstTry=false;
  round.mistakes++;
  addPlayTime();
  logAnswer(round.q&&round.q.nums,false);
  noSound();
  if(btn&&!btn.disabled){
    btn.classList.add('wrong');
    btn.disabled=true;            // a wrong answer stays out of reach for this question
  }
  speak(msg||NUDGE[randInt(0,NUDGE.length-1)],{rate:0.92});
  if(round.q&&round.q.onWrong) round.q.onWrong(round.mistakes);
  if(round.mistakes===2&&round.q.help) later(function(){round.q.help();},500);
}

function showNext(label,fn){
  var wrap=$('choices');
  wrap.innerHTML='';
  var b=document.createElement('button');
  b.className='nextbtn';
  b.innerHTML=(label||'Next')+'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
  b.addEventListener('click',function(){popSound();fn();});
  wrap.appendChild(b);
}

/* ================= stage complete ================= */
function finishStage(){
  clearTimers();
  traceState=null;
  var st=round.stage;
  if(st.id==='warmup'){ finishWarmup(); return; }
  progress.lastSeen=Date.now();
  progress.recent=(progress.recent||[]).filter(function(id){ return id!==st.id; });
  progress.recent.unshift(st.id);
  progress.recent=progress.recent.slice(0,4);
  var stars=round.wins>=4?3:(round.wins>=2?2:1);
  if(progress.carry) delete progress.carry[st.id];
  progress.stickers=progress.stickers||{};
  var prevSticker=progress.stickers[st.id]||0;
  var newSticker=Math.max(prevSticker,stars===3?2:1);
  progress.stickers[st.id]=newSticker;
  var isNewSticker=newSticker>prevSticker;
  var prev=progress.stars[st.id]||0;
  if(stars>prev) progress.stars[st.id]=stars;
  if(stars===3){
    progress.threeStarDays=progress.threeStarDays||{};
    var days=progress.threeStarDays[st.id]=progress.threeStarDays[st.id]||[];
    var today=dayKey(new Date());
    if(days.indexOf(today)===-1) days.push(today);
  }
  var idx0=stageIndex(st.id);
  if(stars>=2&&STAGES[idx0+1]){
    progress.unlocked=progress.unlocked||{};
    progress.unlocked[STAGES[idx0+1].id]=true;   // two stars or more opens the next stage
  }
  // two threes in a row steps this stage up; two ones steps it back down
  progress.hist=progress.hist||{};
  var hist=progress.hist[st.id]=progress.hist[st.id]||[];
  hist.push(stars);
  if(hist.length>4) hist.shift();
  if(hist.length>=2){
    var p1=hist[hist.length-2], p2=hist[hist.length-1];
    progress.levels=progress.levels||{};
    var L=progress.levels[st.id]||0;
    if(p1===3&&p2===3) progress.levels[st.id]=Math.min(1,L+1);
    else if(p1===1&&p2===1) progress.levels[st.id]=Math.max(-1,L-1);
  }
  saveProgress();
  showStars();
  setScreen('done');

  var svgs=$('doneStars').children;
  for(var i=0;i<svgs.length;i++) svgs[i].classList.remove('lit');
  for(var j=0;j<stars;j++){
    (function(k){ later(function(){ svgs[k].classList.add('lit'); starSound(); },450+k*330); })(j);
  }
  later(function(){ confetti(); fanfare(); },300);

  var idx=stageIndex(st.id);
  var nextStage=STAGES[idx+1];
  var canNext=!!nextStage&&isUnlocked(idx+1);
  if(isNewSticker){
    $('doneStickerArt').innerHTML=stickerSVG(st.id);
    $('doneSticker').classList.add('show');
    $('doneSticker').classList.toggle('shiny',newSticker===2);
  }else{
    $('doneSticker').classList.remove('show','shiny');
  }
  $('doneTitle').textContent=stars===3?'Brilliant!':(stars===2?'Well done!':'Good try!');
  $('doneTxt').textContent=stars===3
    ? 'You got three stars!'
    : (stars===2?'You got two stars. One more go for three!':'You got one star. Play again?');
  if(canNext){
    $('nextStageBtn').textContent='Next: '+nextStage.title;
    $('nextStageBtn').onclick=function(){ popSound(); startStage(nextStage.id); };
    $('againBtn').textContent='Play this stage again';
    $('againBtn').onclick=function(){ popSound(); startStage(st.id); };
  }else{
    $('nextStageBtn').textContent='Play again';
    $('nextStageBtn').onclick=function(){ popSound(); startStage(st.id); };
    $('againBtn').textContent='Back to the map';
    $('againBtn').onclick=function(){ popSound(); goMap(); };
  }

  var msg=stars===3?'You got three stars! Brilliant!':(stars===2?'You got two stars! Well done!':'You got one star! Good try!');
  if(isNewSticker) later(function(){ speak('New sticker!',{rate:0.95}); },420);
  later(function(){ speak(msg,{rate:0.9}); },isNewSticker?1500:500);

  // three stages in one sitting and the game says goodbye
  sessionStages.push(st.id);
  if(sessionStages.length===3&&!goodbyeDone){
    goodbyeDone=true;
    scheduleGoodbye();
  }
}

/* ================= goodbye summary ================= */
var sessionStages=[],goodbyeDone=false;
var STAGE_PHRASE={meet:'met new letters',trace:'traced letters',match:'matched big and little letters',
  sounds:'played with letter sounds',review:'did a review',order:'put letters in order',words:'blended words',mix:'did a bit of everything'};
function listOf(a){
  if(!a.length) return '';
  if(a.length===1) return a[0];
  return a.slice(0,-1).join(', ')+' and '+a[a.length-1];
}
function jarText(){
  var pts=progress.points||0, whole=Math.floor(pts);
  return (WORDS[whole]||String(whole))+(pts%1?' and a half':'');
}
function speechBusy(){ return speaking||sq.length>0; }
/* Say the summary once the finish screen has finished talking. If she has
   already moved on, say it anyway — it must always be heard after stage three. */
function scheduleGoodbye(){
  var started=false, t0=Date.now();
  (function waitTurn(){
    if(started) return;
    var left=curScreen!=='done';
    if(left||!speechBusy()||Date.now()-t0>15000){
      started=true;
      sayGoodbye();
      return;
    }
    setTimeout(waitTurn,200);
  })();
}
function sayGoodbye(){
  var nm=(progress.name||'').trim();
  var phrases=[];
  sessionStages.slice(-3).forEach(function(id){ var st=stageById(id); var p=st&&STAGE_PHRASE[st.type]; if(p&&phrases.indexOf(p)<0) phrases.push(p); });
  if(nm) speak('Well done, '+nm+'!',{rate:0.88});
  phrases.forEach(function(p,i){ speak((i?'And you ':'Today you ')+p+'.',{rate:0.88}); });
  speak('Your jar has '+Math.floor(progress.points||0)+' stars!',{rate:0.88});
  speak('Time for a little break. See you tomorrow!',{rate:0.88});
  onSpeechIdle(function(){
    if(curScreen==='done') setTimeout(function(){ if(curScreen==='done') goMap(); },700);
  });
}

/* ================= screens ================= */
function setScreen(name){
  var _sc=$('s-'+name); if(_sc){ _sc.classList.remove('enter'); void _sc.offsetWidth; _sc.classList.add('enter'); }
  clearTimers();
  clearSpeech();
  curScreen=name;
  ['map','play','done','grown','stickers','song'].forEach(function(s){
    $('s-'+s).classList.toggle('active',s===name);
  });
  document.body.dataset.screen=name;
  $('backBtn').classList.toggle('hidden',name==='map');
  if(name==='map'){ $('topTitle').textContent=''; renderHome(); }
  if(name==='grown'){
    renderDash();
    if($('nameInput')) $('nameInput').value=progress.name||'';
  }
  if(name==='stickers') renderStickers();
  if(name==='song') renderSong();
  if(name!=='song') song.on=false;
  if(name==='grown') renderCourse();
  syncMusic();
}
function goMap(){ setScreen('map'); }

/* ================= map ================= */
function starSvg(lit){
  return '<svg viewBox="0 0 24 24" fill="'+(lit?'#f7b731':'#dbe6f0')+'"><path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.4-5.8-3-5.8 3 1.1-6.4L2.6 9.4l6.5-.9z"/></svg>';
}
function currentStage(){
  for(var i=0;i<STAGES.length;i++){
    if(!isUnlocked(i)) continue;
    if((progress.stars[STAGES[i].id]||0)<3) return {i:i,st:STAGES[i]};
  }
  return {i:STAGES.length-1,st:STAGES[STAGES.length-1]};
}
function firstLockedStage(){
  for(var i=0;i<STAGES.length;i++){ if(!isUnlocked(i)) return {i:i,st:STAGES[i]}; }
  return null;
}
function openStage(st){
  popSound();
  var c=progress.carry&&progress.carry[st.id];
  if(c&&c.index>0&&c.index<(st.total||ROUNDS)){ showCarry(st,c.index); }
  else startStage(st.id);
}
var lastStoneId=null,lastStoneTime=0;
function renderHome(){
  showStars();
  var cur=currentStage();
  $('playBtn').innerHTML=stickerSVG(cur.st.id);
  $('playBtn').setAttribute('aria-label','Play '+cur.st.title);

  var nl=firstLockedStage();
  var nextId=nl?nl.st.id:null;
  var flipId=null;
  if(progress.teasedId&&progress.teasedId!==nextId){
    var ti=stageIndex(progress.teasedId);
    if(ti>=0&&isUnlocked(ti)) flipId=progress.teasedId;
  }
  progress.teasedId=nextId;
  saveProgress();

  var stones=[];
  var recent=(progress.recent||[]).filter(function(id){ return id!==cur.st.id; }).slice(0,2);
  recent.reverse();
  recent.forEach(function(id){ var st=stageById(id); if(st) stones.push({st:st,kind:'past'}); });
  stones.push({st:cur.st,kind:'now'});
  if(flipId){ var fs=stageById(flipId); if(fs) stones.push({st:fs,kind:'flip'}); }
  if(nl) stones.push({st:nl.st,kind:'locked'});
  stones=stones.slice(-4);

  var trail=$('trail');
  trail.innerHTML='';
  stones.forEach(function(item,i){
    var b=document.createElement('button');
    var cls='stone '+(i%2?'down':'up');
    if(item.kind==='now') cls+=' now';
    if(item.kind==='locked') cls+=' q';
    if(item.kind==='flip') cls+=' flip';
    b.className=cls;
    b.setAttribute('aria-label',item.st.title);
    if(item.kind==='locked') b.textContent='?';
    else{
      var stars=progress.stars[item.st.id]||0;
      b.innerHTML=stickerSVG(item.st.id)+
        '<span class="stars">'+starSvg(stars>0)+starSvg(stars>1)+starSvg(stars>2)+'</span>';
    }
    b.addEventListener('click',function(){
      if(item.kind==='locked'){ speak('That one is next!',{rate:0.95}); return; }
      var now=Date.now();
      if(lastStoneId===item.st.id&&now-lastStoneTime<2600){
        lastStoneId=null;
        openStage(item.st);
        return;
      }
      lastStoneId=item.st.id;
      lastStoneTime=now;
      speak(item.st.title,{rate:0.95});
    });
    trail.appendChild(b);
  });

  if(flipId){
    setTimeout(function(){ confetti(18); fanfare(); },350);
    setTimeout(renderHome,1600);
  }
}
function renderCourse(){
  var el=$('course');
  if(!el) return;
  el.innerHTML='';
  STAGES.forEach(function(st,i){
    var stars=progress.stars[st.id]||0;
    var unlocked=isUnlocked(i);
    var row=document.createElement('div');
    row.className='crow'+(unlocked?'':' locked')+(isMastered(st.id)?' mastered':'');
    var line=document.createElement('div');
    line.className='cline';
    line.innerHTML='<span class="cnum">'+(i+1)+'</span>'+
      '<span class="clk">'+(unlocked?'':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>')+'</span>'+
      '<span class="cart">'+stickerSVG(st.id)+'</span>'+
      '<span class="cname">'+st.title+'</span>'+
      '<span class="cstars">'+starSvg(stars>0)+starSvg(stars>1)+starSvg(stars>2)+'</span>';
    row.appendChild(line);
    var btns=document.createElement('div');
    btns.className='cbtns';
    var play=document.createElement('button');
    play.className='minibtn';
    play.textContent='Play now';
    play.addEventListener('click',function(){ openStage(st); });
    var unlock=document.createElement('button');
    unlock.className='minibtn';
    unlock.textContent=unlocked?'Unlocked':'Unlock';
    unlock.disabled=unlocked;
    unlock.addEventListener('click',function(){
      progress.unlocked=progress.unlocked||{};
      progress.unlocked[st.id]=true;
      saveProgress();
      popSound();
      renderCourse();
      renderHome();
    });
    btns.appendChild(play);
    btns.appendChild(unlock);
    row.appendChild(btns);
    el.appendChild(row);
  });
}
/* ================= warm-up, mastery, weekly tip ================= */
function isMastered(id){
  return !!(progress.threeStarDays&&progress.threeStarDays[id]&&progress.threeStarDays[id].length>=2);
}
var pendingWarmup=false,pendingStageId=null;
function startWarmup(){
  var played=STAGES.filter(function(st){ return (progress.stars[st.id]||0)>0&&st.type!=='trace'; });
  if(!played.length) return false;
  var picks=shuffle(played.slice()).slice(0,3);
  var i=0;
  var stage={id:'warmup',type:'review',title:'Warm-up',short:'Warm-up',sub:'',total:3,maxN:1,cols:1,
    make:function(){
      var st=picks[Math.min(i,picks.length-1)];
      i++;
      return st.make();
    }};
  startStage(stage.id,0,stage);
  return true;
}
function finishWarmup(){
  clearTimers();
  progress.points=(progress.points||0)+0.5;
  saveProgress();
  showStars();
  speak('Nice warm-up! You still remember.',{rate:0.9});
  if(pendingStageId){
    var id=pendingStageId;
    pendingStageId=null;
    setTimeout(function(){ startStage(id); },600);
    return;
  }
  setScreen('map');
}
function weekIndex(){
  var now=new Date();
  var jan1=new Date(now.getFullYear(),0,1);
  return Math.floor(((now-jan1)/86400000+jan1.getDay())/7);
}
var HOME_TIPS=[
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
  return tip.replace(/\{L\}/g,o.U).replace(/\{l\}/g,o.l).replace(/\{s\}/g,o.show);
}

/* ================= dress-up ================= */
var DRESS=[
  {id:'hat',    name:'Party hat'},
  {id:'crown',  name:'Crown'},
  {id:'cap',    name:'Cap'},
  {id:'glasses',name:'Glasses'},
  {id:'bow',    name:'Bow tie'},
  {id:'scarf',  name:'Scarf'},
  {id:'flower', name:'Flower'}
];
var ACC_SVG={
  hat:'<path d="M12 0.6L17.6 7.4H6.4z" fill="#ec4a8f"/><circle cx="12" cy="1" r="1.4" fill="#ffd93d"/>',
  crown:'<path d="M6 7.2L7.6 2.2 12 5.5 16.4 2.2 18 7.2z" fill="#ffd93d" stroke="#d99b00" stroke-width=".5"/>',
  cap:'<path d="M6.2 6.8a5.8 5.8 0 0 1 11.6 0z" fill="#29a3e0"/><rect x="5" y="6.6" width="14" height="1.7" rx=".85" fill="#1b7fb5"/>',
  glasses:'<circle cx="6.9" cy="9.6" r="3" fill="none" stroke="#20304a" stroke-width=".9"/>'+
          '<circle cx="17.1" cy="9.6" r="3" fill="none" stroke="#20304a" stroke-width=".9"/>'+
          '<path d="M9.9 9.6h4.2" stroke="#20304a" stroke-width=".9"/>',
  bow:'<path d="M12 18.4l-3.5-2.2v4.4z" fill="#ec4a8f"/><path d="M12 18.4l3.5-2.2v4.4z" fill="#ec4a8f"/>'+
      '<circle cx="12" cy="18.4" r="1.1" fill="#c02a6b"/>',
  scarf:'<path d="M4.4 15.1q7.6 3.2 15.2 0v3.3q-7.6 3.2-15.2 0z" fill="#e8453c"/>',
  flower:'<g><circle cx="12" cy="3.6" r="2" fill="#ec4a8f"/><circle cx="9.3" cy="4.9" r="2" fill="#ec4a8f"/>'+
         '<circle cx="14.7" cy="4.9" r="2" fill="#ec4a8f"/><circle cx="10.2" cy="1.7" r="1.6" fill="#ec4a8f"/>'+
         '<circle cx="13.8" cy="1.7" r="1.6" fill="#ec4a8f"/><circle cx="12" cy="3.6" r="1.4" fill="#ffd93d"/></g>'
};
function unlockedDress(){
  return Math.min(DRESS.length,Math.floor((progress.points||0)/10));
}
function dressPreview(id){
  return '<svg viewBox="0 0 24 24">'+
    '<rect x="2" y="2" width="20" height="20" rx="9" fill="#ff6f61"/>'+
    '<circle cx="8.6" cy="9.6" r="1.9" fill="#fff"/><circle cx="15.4" cy="9.6" r="1.9" fill="#fff"/>'+
    '<circle cx="9" cy="10.1" r=".9" fill="#25314a"/><circle cx="15.8" cy="10.1" r=".9" fill="#25314a"/>'+
    '<path d="M9 14.2q3 2.4 6 0" stroke="#a8322a" stroke-width="1.3" fill="none" stroke-linecap="round"/>'+
    (id&&ACC_SVG[id]?ACC_SVG[id]:'')+'</svg>';
}
function applyOutfit(){
  var acc=progress.outfit;
  [].slice.call(document.querySelectorAll('.lf')).forEach(function(b){
    var old=b.querySelector('.acc');
    if(old) old.remove();
    if(acc&&ACC_SVG[acc]){
      var sp=document.createElement('span');
      sp.className='acc';
      sp.innerHTML='<svg viewBox="0 0 24 24">'+ACC_SVG[acc]+'</svg>';
      b.appendChild(sp);
    }
  });
}
function renderDress(){
  var row=$('dressRow');
  if(!row) return;
  row.innerHTML='';
  var unlocked=unlockedDress();
  var items=[{id:'',name:'Plain'}].concat(DRESS);
  items.forEach(function(it,idx){
    var open=idx===0||idx<=unlocked;
    var b=document.createElement('button');
    b.className='dress'+(open?'':' locked')+((progress.outfit||'')===it.id?' on':'');
    b.setAttribute('aria-label',it.name);
    b.innerHTML=dressPreview(it.id);
    if(!open){
      b.innerHTML+='<svg class="lockmini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="4" y="10" width="16" height="10" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/></svg>';
    }
    b.addEventListener('click',function(){
      if(!open) return;
      progress.outfit=it.id;
      saveProgress();
      renderDress();
      applyOutfit();
      popSound();
      speak(it.id?'There you go!':'Plain again.',{rate:0.9});
    });
    row.appendChild(b);
  });
}

/* ================= parent dashboard ================= */
function renderDash(){
  var wrap=$('dashStars');
  if(!wrap) return;
  wrap.innerHTML='';
  STAGES.forEach(function(st){
    var n=progress.stars[st.id]||0;
    var row=document.createElement('div');
    row.className='dash-row';
    row.innerHTML='<span class="nm">'+st.title+'</span><span>'+starSvg(n>0)+starSvg(n>1)+starSvg(n>2)+'</span>';
    wrap.appendChild(row);
  });

  var stats={};
  answerLog.forEach(function(e){
    (e.n||[]).forEach(function(num){
      if(num<0||num>25) return;
      stats[num]=stats[num]||{t:0,ok:0};
      stats[num].t++;
      if(e.ok) stats[num].ok++;
    });
  });

  var grid=$('dashNums');
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

  var worst=null,worstAcc=2;
  Object.keys(stats).forEach(function(k){
    var st3=stats[k];
    if(st3.t<2) return;
    var acc=st3.ok/st3.t;
    if(acc<worstAcc){ worstAcc=acc; worst=k; }
  });
  var pts=progress.points||0;
  var fullJars=Math.floor(pts/10), inJar=Math.round((pts-fullJars*10)*10)/10;
  $('dashJars').textContent='Stars: '+(Math.round(pts*10)/10)+'  ·  '+
    fullJars+(fullJars===1?' full jar':' full jars')+' and '+inJar+' in this one.';

  var mastered=STAGES.filter(function(st){ return isMastered(st.id); }).map(function(st){ return st.title; });
  $('dashMastered').textContent=mastered.length
    ? 'Mastered (three stars on two different days): '+mastered.join(', ')+'.'
    : 'No stage mastered yet — that needs three stars on two different days.';
  if($('dashHome')) $('dashHome').textContent=homeTip();

  $('dashWorking').textContent=worst!==null
    ? 'Working on: '+LET[worst].U+' — right '+Math.round(worstAcc*100)+'% of the time. It will come round more often.'
    : 'Working on: not enough answers yet. Play a stage or two.';

  var today=(progress.time&&progress.time[dayKey(new Date())])||0;
  var week=0, now=new Date();
  for(var d=0;d<7;d++){
    var dt=new Date(now.getTime()-d*86400000);
    week+=(progress.time&&progress.time[dayKey(dt)])||0;
  }
  function span(sec){
    if(sec<60) return Math.round(sec)+' sec';
    if(sec<3600) return Math.round(sec/60)+' min';
    return (sec/3600).toFixed(1)+' hr';
  }
  $('dashTime').textContent='Played today: '+span(today)+'  ·  this week: '+span(week)+'.';
}

/* ================= stars / confetti ================= */
function confetti(count){
  var layer=$('confetti');
  for(var i=0;i<(count||26);i++){
    var b=document.createElement('i');
    b.className='confetti-bit';
    b.style.left=(6+Math.random()*88)+'%';
    b.style.background=PALETTE[i%PALETTE.length];
    b.style.setProperty('--dx',(Math.random()*150-75).toFixed(0)+'px');
    b.style.animationDelay=(Math.random()*0.2).toFixed(2)+'s';
    layer.appendChild(b);
    (function(el){setTimeout(function(){el.remove();},1800);})(b);
  }
}

/* ================= press and hold (parent gate) ================= */
function holdToActivate(el,action){
  if(!el) return;
  var timer=null,fired=false;
  function cancelHold(){
    if(timer){clearTimeout(timer);timer=null;}
    el.classList.remove('holding');
  }
  el.addEventListener('pointerdown',function(){
    if(fired) return;
    el.classList.add('holding');
    timer=setTimeout(function(){
      timer=null;
      el.classList.remove('holding');
      fired=true;
      action();
      setTimeout(function(){fired=false;},700);
    },2000);
  });
  el.addEventListener('pointerup',cancelHold);
  el.addEventListener('pointerleave',cancelHold);
  el.addEventListener('pointercancel',cancelHold);
  el.addEventListener('contextmenu',function(e){e.preventDefault();});
}

/* ================= carry on dialog ================= */
function showCarry(st,index){
  $('carrySub').textContent='You stopped at question '+(index+1)+' of '+(st.total||ROUNDS)+'.';
  $('carryModal').classList.add('show');
  $('carryYes').onclick=function(){
    $('carryModal').classList.remove('show');
    popSound();
    startStage(st.id,index);
  };
  $('carryNo').onclick=function(){
    $('carryModal').classList.remove('show');
    popSound();
    if(progress.carry) delete progress.carry[st.id];
    saveProgress();
    startStage(st.id);
  };
  speak('Do you want to carry on where you stopped?');
}

/* ================= full screen ================= */
function fullEl(){ return document.fullscreenElement||document.webkitFullscreenElement||null; }
function fsSupported(){
  var el=document.documentElement;
  return !!(el.requestFullscreen||el.webkitRequestFullscreen);
}
function standalone(){
  return (window.matchMedia&&window.matchMedia('(display-mode: standalone)').matches)||
         window.navigator.standalone===true;
}
function updateFsIcon(){
  var on=!!fullEl();
  $('fsOn').classList.toggle('hidden',on);
  $('fsOff').classList.toggle('hidden',!on);
}
function toggleFull(){
  var el=document.documentElement;
  try{
    if(fullEl()){
      (document.exitFullscreen||document.webkitExitFullscreen).call(document);
      return;
    }
    if(el.requestFullscreen){ el.requestFullscreen().catch(showFullHint); }
    else if(el.webkitRequestFullscreen){ el.webkitRequestFullscreen(); }
    else { showFullHint(); }
  }catch(e){ showFullHint(); }
}
function showFullHint(){
  toast('To play full screen, tap Share then “Add to Home Screen”.');
  speak('To play full screen, add the game to your home screen.');
}
document.addEventListener('fullscreenchange',updateFsIcon);
document.addEventListener('webkitfullscreenchange',updateFsIcon);

var toastTimer=null;
window.nfToast=function(m){toast(m);};
window.nfSpeak=function(t){speak(t);};
function toast(msg){
  var t=$('toast');
  t.textContent=msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer=setTimeout(function(){t.classList.remove('show');},4200);
}

/* ================= wiring ================= */
holdToActivate($('grownBtn'),function(){ setScreen('grown'); });
holdToActivate($('backBtn'),function(){ goMap(); });
$('backBtn').addEventListener('click',function(){
  if(curScreen==='play') return;   // during play a plain tap does nothing
  goMap();
});
$('sayBtn').addEventListener('click',function(){
  if(curScreen==='song'){ singAlong(); return; }
  if(round.q&&round.q.replay){ speak(round.q.replay,{rate:0.9}); return; }
  if(round.promptSpeech) speak(round.promptSpeech);
});

function applyVoiceIcon(){
  $('sndOn').classList.toggle('hidden',voiceMuted);
  $('sndOff').classList.toggle('hidden',!voiceMuted);
  $('muteBtn').classList.toggle('off',voiceMuted);
}
$('muteBtn').addEventListener('click',function(){
  voiceMuted=!voiceMuted;
  applyVoiceIcon();
  try{localStorage.setItem(KEY+'_voiceon',voiceMuted?'0':'1');}catch(e){}
  if(voiceMuted){ clearSpeech(); }
  else { tone(700,0.1,'triangle',0.12); speak('Voice is on.'); }
});

$('musicBtn').addEventListener('click',function(){
  if(musicAllowed()){
    musicOn=false;                       // off everywhere from now on
    toast('Music off');
  }else{
    musicOn=true;
    if(curScreen==='play') musicPlay=true;   // asking for music while playing means keep it
    toast('Music on');
  }
  try{
    localStorage.setItem(KEY+'_music',musicOn?'1':'0');
    localStorage.setItem(KEY+'_musicplay',musicPlay?'1':'0');
  }catch(e){}
  syncMusic();
});

$('fsBtn').addEventListener('click',toggleFull);

$('playBtn').addEventListener('click',function(){
  var cur=currentStage();
  if(pendingWarmup){
    pendingWarmup=false;
    pendingStageId=cur.st.id;
    startWarmup();
    return;
  }
  openStage(cur.st);
});
$('songBtn').addEventListener('click',function(){ popSound(); setScreen('song'); });
$('singBtn').addEventListener('click',function(){ popSound(); singAlong(); });
$('stickersBtn').addEventListener('click',function(){
  popSound();
  setScreen('stickers');
});
$('nameSave').addEventListener('click',function(){
  var v=($('nameInput').value||'').trim().slice(0,14);
  progress.name=v;
  saveProgress();
  popSound();
  toast(v?('Hello, '+v+'!'):'Name cleared');
  if(v) speak('Hello, '+v+'!',{rate:0.95});
});

$('s-play').addEventListener('pointerdown',function(){
  if(curScreen==='play'&&!round.locked) armIdle();
});

$('voiceSel').addEventListener('change',function(e){
  var uri=e.target.value;
  useClips=(uri==='natural');
  chosenVoice=useClips?pickBestVoice():(voices.filter(function(v){return v.voiceURI===uri;})[0]||null);
  try{localStorage.setItem(KEY+'_voice',uri);}catch(e){}
  speak('Hello! Let us play with letters.',{rate:0.9});
});
$('testVoice').addEventListener('click',function(){ speak('A says ah, like apple.',{rate:0.9}); });
$('resetBtn').addEventListener('click',function(){
  if(!window.confirm('Reset all stars and open only the first stage?\n\nHer name is kept.')) return;
  var keepName=progress.name||'';
  var keepStickers=progress.stickers||{};
  var keepOutfit=progress.outfit||'';
  var dropExtras=window.confirm('Delete the stickers and the dress-up as well?\n\nOK = delete them\nCancel = keep them');
  progress={stars:{},rounds:0,points:0};
  if(keepName) progress.name=keepName;
  if(!dropExtras){
    progress.stickers=keepStickers;
    progress.outfit=keepOutfit;
  }
  answerLog=[];
  try{ localStorage.removeItem(KEY+'_log'); }catch(e){}
  saveProgress(); showStars(); renderHome(); renderDash();
  speak('All reset. Have fun!');
});

window.addEventListener('resize',function(){
  if($('s-play').classList.contains('active')&&round.q){
    if(round.q.fit) round.q.fit();
    else fitStage($('stage'),round.q.maxN||10,round.q.cols||2);
  }
  if($('s-map').classList.contains('active')) renderHome();
});

/* unlock audio + start music on the first touch */
function startAudioOnce(){
  ctxAny(); unlockVoice();
  syncMusic();
}
document.addEventListener('pointerdown',startAudioOnce,{once:true});
document.addEventListener('touchstart',startAudioOnce,{once:true,passive:true});
document.addEventListener('click',startAudioOnce,{once:true});
document.addEventListener('visibilitychange',function(){
  if(document.hidden){
    music.stop();
    clearSpeech();
  }else{
    if(actx&&actx.state==='suspended'){ try{actx.resume();}catch(e){} }
    syncMusic();
  }
});

/* ================= boot ================= */

loadProgress();
loadLog();
loadVoices();
setTimeout(loadVoices,300);
try{
  var m=localStorage.getItem(KEY+'_music');
  if(m==='0') musicOn=false;
  var mp=localStorage.getItem(KEY+'_musicplay');
  if(mp==='1') musicPlay=true;
  var vo=localStorage.getItem(KEY+'_voiceon');
  if(vo==='0') voiceMuted=true;
}catch(e){}
applyVoiceIcon();
loadClips();
if(!hasSpeech&&!window.fetch) $('noVoice').classList.remove('hidden');
try{ if(localStorage.getItem(KEY+'_sfx')==='0'){ muted=true; $('sfxChk').checked=false; } }catch(e){}
$('sfxChk').addEventListener('change',function(){ muted=!this.checked; try{localStorage.setItem(KEY+'_sfx',muted?'0':'1');}catch(e){} if(!muted) popSound(); });
setScreen('map');
showStars();
if(standalone()) $('fsBtn').classList.add('hidden');
// after a gap of four hours or more, three quick questions from what she already knows
try{
  var last=progress.lastSeen||0;
  var gap=Date.now()-last;
  progress.lastSeen=Date.now();
  saveProgress();
  if(last&&gap>4*3600*1000&&(progress.points||0)>0) pendingWarmup=true;
}catch(e){}
updateFsIcon();

})();