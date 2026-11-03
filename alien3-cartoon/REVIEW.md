# REVIEW: Alien 3, cartoon recap

Output: `renders/alien3-cartoon.mp4`, 1920x1080, 30 fps, 59.4 s. Loudness −12.8 LUFS, true peak −1.3 dBTP.

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
- No narration or music. The music catalog needs `npx hyperframes auth login`.
- The sound effects were measured, not heard.
