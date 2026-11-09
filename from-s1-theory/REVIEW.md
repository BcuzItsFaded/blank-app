# REVIEW: FROM S1, "The Big Theory" short

Output: `renders/from-s1-big-theory.mp4`, 1920x1080, 30 fps, 57.3 s. Loudness −15.7 LUFS, true peak −1.4 dBTP.

## Source and how it was built
- **Panels:** cut from a phone screenshot of the storyboard. Only the art above each built-in caption is used, because the screenshot cuts off panel 7's caption and the iPhone Live Text button covers panel 8's. The art was upscaled 4x with Real-ESRGAN anime (`tools/up_from.py`).
- **Voice:** Kokoro `am_michael`, one clip per scene (`tools/vo.txt`, word for word from the script). Each scene lasts LEAD 0.25 s + the line + TAIL 0.35 s; the last scene holds 1.9 s.
- **Captions:** live text, word by word, with the storyboard's yellow highlight words. Word times are estimated from the voiced span and the pauses ffmpeg detects, not from a transcript.
- **Effects per scene:**
  - 1: lightning flicker;
  - 2: streetlight flicker;
  - 3: sparks at the transformer;
  - 4: radio dial flicker and a glitch;
  - 5: a scan sweep across the monitors, with the "IMAGINED THEORY · NOT CANON" pill;
  - 6: lightning flashes and shake;
  - 7: a push toward the tunnel;
  - 8: lightning in the window.
- **Disclosure:** "FAN THEORY · NOT CONFIRMED" shows on scene 1.

## Editing
- Edit `tools/vo.txt` (the voice lines) or `tools/gen.py` (titles, highlight words, camera moves, effects). Then run `python3 tools/gen.py`, render, and run the ffmpeg loudnorm pass.

## Not done
- No music.
- The mix was measured, not heard.
- Word timing is approximate.
