# Brick Reel engine

Shared kit for 60-second, 9:16 brick-built 3D story reels ("Plot Twist with A&R" style).

| File | What it does |
|------|--------------|
| `engine.js` | 3D kit + runtime: bevelled bricks, studs, buildings, minifig `figure()`, kaiju, smoke, rain, particles, fire, embers, utility poles, kanji signs, light shafts, trucks, seaweed, env reflections, bloom/ACES/grade/grain post pass, `defScene()` and `startReel(cfg)` |
| `reel.css` | Stage, captions, title card, brand badge, fades |
| `render.js` | Headless deterministic frame renderer: `node render.js <page.html> <outDir> [--stills 3,10.5] [--from N --to M]` |
| `voiceover.py` | Kokoro TTS from a reel's `story.json` `vo` lines, auto-fit to each scene window, writes `*_timing.json` |
| `captions.py` | Turns `story.json` caption chunks + voice timing into `captions.js` |
| `sfx.py` | Procedural audio kit: pads, piano, pluck, brass, drums, booms, zaps, thunder, chirps, crowd, roar |
| `mix.py` | Ducks the score under the narration and masters the track |

## Making a new reel
1. `reels/<slug>/story.json`: `duration`, `voice`, 8 `vo` lines as `[start, end, text]`, and `captions` (HTML chunks per line).
2. Run the voiceover first, so every line is checked against its scene window:
   ```bash
   python voiceover.py ../<slug>/story.json kokoro-v1.0.onnx voices-v1.0.bin vo.wav
   python3 captions.py ../<slug>/story.json vo_timing.json ../<slug>/captions.js
   ```
3. `reels/<slug>/index.html`: load three@0.149.0, `../engine/engine.js`, `captions.js`; build scenes with `defScene(start, end, () => { const scene = newScene(); ... return { scene, cam, update(t, u) {} }; })`; finish with `startReel({ captions: CAPTIONS, grades, fade, flash, shake, title, endlogo })`.
4. Check key frames with `--stills`, fix framing and exposure, then render all frames (3 parallel workers with `--from/--to`).
5. `reels/<slug>/audio.py` (imports `sfx`), then `mix.py`, then encode:
   ```bash
   ffmpeg -framerate 30 -i frames/f_%05d.jpg -i final.wav -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -b:v 6M -maxrate 9M -bufsize 12M -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest reel.mp4
   ```

Reels so far: `godzilla-minus-zero/` (standalone, predates the engine), `pokemon-ash-journey/`.
