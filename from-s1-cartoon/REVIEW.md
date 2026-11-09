# REVIEW: FROM S1, "The Big Theory" (flat-cartoon version)

Output: `renders/from-s1-cartoon.mp4`, 1920x1080, 30 fps, 57.3 s. Loudness −15.4 LUFS, true peak −1.4 dBTP.

## What it is
- The 8 storyboard beats as flat cartoon scenes, in the same style as `alien3-cartoon` (shared `tools/rig.js`).
- New rig parts: curly hair and a beard for Jim, long curly hair for Tabitha, a jacket, and a hooded watcher seen from behind with headphones.
- Same Kokoro narration as `from-s1-theory`; captions light up word by word in cream cards.

## Scenes
1. Fromville sign, cawing crow, the vortex turning in the sky.
2. Jim under a flickering streetlight, scratching his head.
3. The camera follows the power lines to wires that dangle into the woods: sparks and a "???".
4. Jim on the radio, Tabitha behind him: "Tabitha is digging…" and a glitch.
5. The hooded watcher at four monitors showing the town, with "IMAGINED THEORY · NOT CANON".
6. The tower goes up and people cheer; the storm rolls in, lightning hits, the tower falls; an eye opens in the sky.
7. The cave drawing beside the tunnel light with silhouettes, and "LAB?" stamped with a red X.
8. Jim at the rainy window; lightning shows a figure outside; the camera pushes in on the question.

## Editing
- Everything is in `tools/gen.py`. Run `python3 tools/gen.py`, render, then apply the ffmpeg loudnorm pass.

## Not done
- No music.
- The mix was measured, not heard.
- Word timing is approximate.
