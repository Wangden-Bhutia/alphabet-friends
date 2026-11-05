from pathlib import Path
ROOT=str(Path(__file__).resolve().parent.parent); OUTDIR=ROOT+'/tools/out/'
s=open('/workspace/nf/site/index.html').read()
def rep(a,b):
    global s
    assert a in s, a[:60]; s=s.replace(a,b)
rep('content="#ffd36e"','content="#ffe3ec"')
rep('content="Number Friends"','content="Alphabet Friends"')
rep('A gentle number game for 4–6 year olds.','A gentle alphabet and phonics game for 4–6 year olds.')
rep('<title>Number Friends</title>','<title>Alphabet Friends</title>')
rep('<link rel="stylesheet" href="css/premium.css">','<link rel="stylesheet" href="css/premium.css">\n<link rel="stylesheet" href="css/af.css">')
rep('<div class="cloud c1"></div><div class="cloud c2"></div><div class="ground"></div>','<div class="cloud c1"></div><div class="cloud c2"></div><div class="town"></div><div class="ground"></div>')
rep('<div class="brand" id="topTitle">Number Friends</div>','<div class="brand" id="topTitle">Alphabet Friends</div>')
rep('''          Stickers
        </button>''','''          Stickers
        </button>
        <button class="pillbtn songpill" id="songBtn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.6"/><circle cx="16.5" cy="16" r="2.6"/></svg>
          ABC song
        </button>''')
rep('''    <!-- STAGE DONE -->''','''    <!-- SING ALONG -->
    <section class="screen" id="s-song">
      <div class="stick-head">Sing the ABC</div>
      <div class="songpic" id="songPic"></div>
      <div class="songgrid" id="songGrid"></div>
      <button class="bigbtn singbtn" id="singBtn">Sing along</button>
    </section>

    <!-- STAGE DONE -->''')
i=s.index('<h3>How the stages build up</h3>'); j=s.index('</div>',s.index('<p style="margin-top:8px">Every number'))
s=s[:i]+'''<h3>How the stages build up</h3>
        <p>The alphabet comes in five small groups (A–E, F–J, K–O, P–T, U–Z). Each group has four stages, and from the second group on a review mixes in everything learned so far.</p>
        <ol>
          <li><b>Meet the letters</b> — big and little letter, its sound and a picture word ("A says /a/, like apple"). Then she finds the picture. Tapping the letter friend says the sound again.</li>
          <li><b>Trace</b> — big letter, then little letter, stroke by stroke. The next dot to reach pulses orange and the yellow dot shows where each stroke starts. It only finishes when the whole letter is traced in order, so half a letter never counts. A small Skip button is there for you.</li>
          <li><b>Big and little</b> — match upper and lower case. Look-alikes (b d p q, n u, m w) turn up as distractors.</li>
          <li><b>Letter sounds</b> — which letter makes this sound, what a word starts with, and which picture starts with a sound. Letters that share a sound (c and k) are never offered together.</li>
          <li><b>Review</b> — a mix of all the letters so far, leaning on the ones she found hard.</li>
          <li><b>ABC order</b> — the missing letter in a row of four, and what comes before or after.</li>
          <li><b>First words</b> — three letter tiles (c-a-t) she can tap to hear each sound, then she blends them and picks the picture.</li>
          <li><b>Big mix</b> — a little of everything.</li>
        </ol>
        <p style="margin-top:8px">The <b>ABC song</b> button on the home screen sings through the letters with a bouncing highlight; tapping any letter there says its sound and picture word.</p>
      '''+s[j:]
rep('<li>Five questions per stage. Short is better than long.</li>','<li>Five or six questions per stage. Short is better than long.</li>')
rep('<li>After two tries the game shows the answer and counts it out loud: the blocks fill in, the tower is counted, or the right button pulses.</li>','<li>After two tries the right answer gently pulses.</li>')
rep('<li>Build the number lets her add up to three blocks too many, and nothing happens until she taps Done.</li>','<li>The game says letter <i>sounds</i> (/b/ as "buh") as well as letter names, which is how phonics is taught in school.</li>')
rep('Numbers, at a glance','Letters, at a glance')
rep("Install Number Friends as an app","Install Alphabet Friends as an app")
rep('''      <div class="panel">
        <h3>Start over</h3>''','''      <div class="panel">
        <h3>Credits</h3>
        <p>Picture art: <a href="https://github.com/jdecked/twemoji" target="_blank" rel="noopener">Twemoji</a> by Twitter and contributors, CC-BY 4.0. Font: Baloo 2 (SIL Open Font License). Voice: pre-recorded neural speech.</p>
      </div>
      <div class="panel">
        <h3>Start over</h3>''')
rep('<script src="js/game.js"></script>','<script src="js/content.js"></script>\n<script src="js/game.js"></script>')
open(ROOT+'/index.html','w').write(s)
p=open('/workspace/nf/site/js/pwa.js').read().replace('Find Number Friends on your home screen','Find Alphabet Friends on your home screen')
p=p.replace("'.choice,.bigbtn,.pillbtn,.minibtn,.installbtn,.playbtn'","'.choice,.bigbtn,.pillbtn,.minibtn,.installbtn,.playbtn,.songtile,.earbtn'")
open(ROOT+'/js/pwa.js','w').write(p)
