/* Alphabet Friends content: letters, picture words, phonic sounds, trace strokes,
   and every templated spoken line (tools/phrases.js reads this file too). */
(function(root){
"use strict";
// snd = respelling the voice uses for the phonic sound; show = how it is written on screen
var L=[
 ['A','ah','a','apple','1f34e'],['B','buh','b','bus','1f68c'],['C','kuh','c','cat','1f431'],
 ['D','duh','d','dog','1f436'],['E','eh','e','egg','1f95a'],['F','fff','f','fish','1f41f'],
 ['G','guh','g','goat','1f410'],['H','huh','h','hat','1f3a9'],['I','ih','i','insect','1f41e'],
 ['J','juh','j','juice','1f9c3'],['K','kuh','k','kite','1fa81'],['L','luh','l','lion','1f981'],
 ['M','muh','m','moon','1f319'],['N','nuh','n','nose','1f443'],['O','aw','o','octopus','1f419'],
 ['P','puh','p','pig','1f437'],['Q','kwuh','qu','queen','1f478'],['R','ruh','r','rabbit','1f430'],
 ['S','sss','s','sun','2600'],['T','tuh','t','tiger','1f42f'],['U','uh','u','umbrella','2602'],
 ['V','vvv','v','van','1f690'],['W','wuh','w','watermelon','1f349'],['X','ks','x','fox','1f98a'],
 ['Y','yuh','y','yo-yo','1fa80'],['Z','zzz','z','zebra','1f993']
];
var LETTERS=L.map(function(r,i){return {i:i,U:r[0],l:r[0].toLowerCase(),snd:r[1],show:r[2],word:r[3],pic:r[4]};});
var GROUPS=[[0,5],[5,10],[10,15],[15,20],[20,26]];   // A-E, F-J, K-O, P-T, U-Z
var CVC=[
 {w:'cat',p:'1f431'},{w:'dog',p:'1f436'},{w:'sun',p:'2600'},{w:'pig',p:'1f437'},{w:'bus',p:'1f68c'},
 {w:'hat',p:'1f3a9'},{w:'fox',p:'1f98a'},{w:'van',p:'1f690'},{w:'hen',p:'1f414'},{w:'bat',p:'1f987'},
 {w:'bug',p:'1f41b'},{w:'web',p:'1f578'},{w:'bed',p:'1f6cf'},{w:'map',p:'1f5fa'},{w:'box',p:'1f4e6'}
];
function sndOf(ch){ return LETTERS[ch.toUpperCase().charCodeAt(0)-65].snd; }
function wordSounds(w){ return w.split('').map(sndOf); }
/* x in "fox" ends the word, so "x says ks like fox" */
var T={
  meet:function(o){ return 'This is '+o.U+'. '+o.U+' says '+o.snd+', like '+o.word+'.'; },
  findPic:function(o){ return 'Find the '+o.word+'.'; },
  word:function(o){ return o.word+'!'; },
  traceBig:function(o){ return 'Trace big '+o.U+'. Start at the yellow dot.'; },
  traceSmall:function(o){ return 'Now trace little '+o.U+'.'; },
  findSmall:function(o){ return 'Find little '+o.U+'.'; },
  findBig:function(o){ return 'Find big '+o.U+'.'; },
  whichSays:function(o){ return 'Which letter says '+o.snd+'?'; },
  startsWith:function(o){ return 'What does '+o.word+' start with?'; },
  picStarts:function(o){ return 'Which picture starts with '+o.snd+'?'; },
  says:function(o){ return o.U+' says '+o.snd+'.'; },
  upLow:function(o){ return 'Big '+o.U+', little '+o.U+'.'; },
  after:function(o){ return 'What comes after '+o.U+'?'; },
  before:function(o){ return 'What comes before '+o.U+'?'; },
  name:function(o){ return o.U+'.'; },
  snd:function(o){ return o.snd+'.'; }
};
var TC={
  blend:function(c){ return wordSounds(c.w).join('. ')+'. Which picture is it?'; },
  word:function(c){ return wordSounds(c.w).join(', ')+'. '+c.w+'!'; },
  name:function(c){ return c.w+'!'; }
};
function allPhrases(){
  var out=[];
  LETTERS.forEach(function(o){ for(var k in T) out.push(T[k](o)); });
  CVC.forEach(function(c){ for(var k in TC) out.push(TC[k](c)); });
  return out;
}
/* ---- trace strokes, viewBox 0 0 100 150; caps 20-120, x-height 60-120, descenders to 146 ---- */
var OVAL='M50 20 C26 20 18 46 18 70 C18 96 26 120 50 120 C74 120 82 96 82 70 C82 46 74 20 50 20';
var UP={
 A:['M50 20 L20 120','M50 20 L80 120','M32 82 L68 82'],
 B:['M28 20 L28 120','M28 20 L56 20 C78 20 78 68 56 68 L28 68','M28 68 L60 68 C84 68 84 120 60 120 L28 120'],
 C:['M78 34 C66 14 22 16 22 70 C22 124 66 126 78 106'],
 D:['M28 20 L28 120','M28 20 L50 20 C86 20 86 120 50 120 L28 120'],
 E:['M74 20 L28 20 L28 120 L74 120','M28 70 L66 70'],
 F:['M74 20 L28 20 L28 120','M28 68 L64 68'],
 G:['M78 34 C66 14 22 16 22 70 C22 124 72 126 78 96 L78 76 L56 76'],
 H:['M26 20 L26 120','M74 20 L74 120','M26 70 L74 70'],
 I:['M50 20 L50 120','M32 20 L68 20','M32 120 L68 120'],
 J:['M70 20 L70 94 C70 128 26 128 24 100'],
 K:['M28 20 L28 120','M74 20 L30 74','M42 62 L76 120'],
 L:['M28 20 L28 120 L74 120'],
 M:['M20 120 L20 20 L50 80 L80 20 L80 120'],
 N:['M24 120 L24 20 L76 120 L76 20'],
 O:[OVAL],
 P:['M28 20 L28 120','M28 20 L56 20 C82 20 82 72 56 72 L28 72'],
 Q:[OVAL,'M56 96 L82 126'],
 R:['M28 20 L28 120','M28 20 L56 20 C82 20 82 70 56 70 L28 70','M50 70 L78 120'],
 S:['M76 32 C66 14 24 14 24 42 C24 70 78 64 78 96 C78 126 30 128 22 106'],
 T:['M20 20 L80 20','M50 20 L50 120'],
 U:['M24 20 L24 88 C24 128 76 128 76 88 L76 20'],
 V:['M20 20 L50 120 L80 20'],
 W:['M14 20 L32 120 L50 50 L68 120 L86 20'],
 X:['M22 20 L78 120','M78 20 L22 120'],
 Y:['M22 20 L50 68 L78 20','M50 68 L50 120'],
 Z:['M24 20 L76 20 L24 120 L76 120']
};
var LO={
 a:['M72 70 C64 56 30 56 28 90 C26 124 66 124 72 100','M72 62 L72 120'],
 b:['M30 20 L30 120','M30 90 C30 62 76 56 76 90 C76 124 30 120 30 100'],
 c:['M74 72 C64 54 26 56 26 90 C26 124 64 126 74 108'],
 d:['M70 72 C62 56 28 56 28 90 C28 124 64 124 70 104','M70 20 L70 120'],
 e:['M28 90 L74 90 C74 60 30 54 28 88 C26 124 64 126 74 110'],
 f:['M70 26 C62 16 42 18 42 40 L42 120','M26 62 L62 62'],
 g:['M72 70 C64 56 30 56 28 88 C26 120 66 120 72 98','M72 62 L72 128 C72 150 34 150 28 134'],
 h:['M30 20 L30 120','M30 84 C38 58 72 56 72 84 L72 120'],
 i:['M50 62 L50 120','M47 38 L53 38'],
 j:['M56 62 L56 130 C56 148 32 148 26 134','M53 38 L59 38'],
 k:['M30 20 L30 120','M68 60 L30 96','M42 86 L70 120'],
 l:['M50 20 L50 120'],
 m:['M20 60 L20 120','M20 80 C22 54 50 54 50 80 L50 120','M50 80 C52 54 80 54 80 80 L80 120'],
 n:['M30 60 L30 120','M30 84 C38 58 72 56 72 84 L72 120'],
 o:['M50 60 C30 60 26 78 26 90 C26 106 34 120 50 120 C66 120 74 106 74 90 C74 78 70 60 50 60'],
 p:['M30 60 L30 146','M30 86 C34 58 76 56 76 90 C76 124 34 122 30 98'],
 q:['M70 72 C62 56 28 56 28 90 C28 124 64 124 70 104','M70 60 L70 146'],
 r:['M34 60 L34 120','M34 84 C40 60 62 56 72 66'],
 s:['M70 68 C62 54 30 56 32 74 C34 92 70 84 70 104 C70 124 34 126 28 110'],
 t:['M48 30 L48 110 C48 122 62 124 70 116','M30 60 L68 60'],
 u:['M28 60 L28 98 C28 126 72 126 72 98','M72 60 L72 120'],
 v:['M26 60 L50 120 L74 60'],
 w:['M16 60 L32 120 L50 70 L68 120 L84 60'],
 x:['M28 60 L72 120','M72 60 L28 120'],
 y:['M26 60 L50 116','M74 60 L44 146'],
 z:['M28 60 L72 60 L28 120 L72 120']
};
root.AF={LETTERS:LETTERS,GROUPS:GROUPS,CVC:CVC,T:T,TC:TC,allPhrases:allPhrases,wordSounds:wordSounds,TRACE:{up:UP,lo:LO}};
})(typeof window!=='undefined'?window:globalThis);
