# Don't Spoil It RG — Episode 3: Alien 3 (1992) stickman video

Source for the 2D stickman recap video (1920×1080, 24 fps, ~8:57).

Pipeline (run from this folder):
1. `python3 tts.py 1.05` — narration per scene with Piper (`voices/en_US-ryan-high.onnx`, from rhasspy/piper-voices) → `tts/`, `timings.json`
2. `node anim/render.js stills` — preview one still per shot; `node anim/render.js video 0,1,...,13` — render segments to `segs/` (Playwright + ffmpeg)
3. `python3 sfx.py` — procedural sound design + mix with narration → `audio/`
4. `python3 assemble.py` — concatenate into the final MP4

`script.json` holds the scene titles and narration; `anim/scenes.js` holds the shot-by-shot animation.
