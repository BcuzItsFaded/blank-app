# REVIEW: FROM S1, "The Big Theory" (vertical YouTube Short)

Output: `renders/from-s1-short.mp4`, 1080x1920, 30 fps, 57.3 s. Loudness −15.4 LUFS, true peak −1.4 dBTP.

## How it was built
- Same cartoon scenes, rig and narration as `from-s1-cartoon`.
- Each 1920x1080 scene is scaled 1.78x to fill the 1920 px height. A per-scene camera (`FOCUS` in `tools/gen.py`) pans across the drawing to follow the action.
- The title card sits at the top; captions are re-broken to at most 5 words per card, at 62 px.

## Editing
- Edit `tools/gen.py`, then run `python3 tools/gen.py`, render, and apply the ffmpeg loudnorm pass.

## Not done
- No music.
- The mix was measured, not heard.
