# REVIEW: Alien 3, cartoon recap

Output: `renders/alien3-cartoon-narrated.mp4` (64.4 s, narrated, loudness-normalised to −15.4 LUFS); `renders/alien3-cartoon.mp4` (59.4 s, no voice).

## What it is
- The 12 storyboard beats retold in the flat cartoon style of `ultracode-film`.
- Hand-built rigs (`tools/rig.js`):
  - stick-limb people with expressions: Ripley, Dillon, the inmates, Clemens;
  - Bishop's damaged head;
  - a crawling creature with a hissing jaw, a tail and drool;
  - the Queen chestburster.
- Painted flat sets.

## Editing
- Everything comes from `tools/gen.py`: titles, captions, positions and timings. Run `python3 tools/gen.py` to regenerate, then `npx hyperframes render`.

## Not done
- Narration: Kokoro-82M on this machine, voice `am_michael` at speed 0.95. Script in `tools/vo.txt`; clips are in `assets/vo/`. Each scene lasts its line plus 0.75 s (at least 4.4 s). After rendering, the mix was run through ffmpeg loudnorm.
- ElevenLabs refused the request (free tier disabled on the account).
- No music. The music catalog needs `npx hyperframes auth login`.
- The sound effects were measured, not heard.
