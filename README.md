# Alphabet Friends

A gentle alphabet and phonics game for 4–6 year olds, made for phones. Sibling of
[Number Friends](https://wangden-bhutia.github.io/number-friends/).

Play: https://wangden-bhutia.github.io/alphabet-friends/

- Meet each letter (big and little, its sound and a picture word), trace it stroke by stroke,
  match big and little letters, play with letter sounds, review, ABC order, and blend first words (c-a-t).
- ABC sing-along with a bouncing highlight.
- Installable PWA that works offline; all voice clips are pre-recorded and precached.

## Tools
- `js/game.js` is now edited directly and is the source of truth. `tools/letters_part.js` mirrors the letter-game part of it.
- `tools/build.py` was used once to assemble `js/game.js` from the Number Friends engine plus `tools/letters_part.js`; it needs that engine (`/workspace/nf/site/js/game.js`), which is not in this repo, and running it would overwrite later edits. `tools/index_edit.py` has the same dependency.
- Tools find the repo from their own location; test output and screenshots go to `tools/out/` (git-ignored).
- `tools/phrases.js` lists every spoken segment; `tools/gen.py` records them (edge-tts en-US-JennyNeural,
  -8% rate, +4 Hz pitch, silence trimmed). Phonic sounds are spliced in as separate clips: vowels and
  f/s/v/z/x are cut from the picture word itself, other consonants are short "buh"-style syllables.
- `tools/sw_gen.py <version>` regenerates the service worker precache list.
- `tools/audio_check.py`, `tools/trace_test.py`, `tools/test.py` are the checks.

## Credits
Picture art: [Twemoji](https://github.com/jdecked/twemoji) by Twitter, Inc. and contributors, licensed CC-BY 4.0.
Font: Baloo 2 (SIL Open Font License 1.1).
