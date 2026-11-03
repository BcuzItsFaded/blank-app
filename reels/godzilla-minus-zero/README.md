# Godzilla Minus Zero — 60s Reel (Plot Twist with A&R)

Brick-built 3D animated trailer breakdown, 9:16 vertical, 8 scenes, 60 seconds.
Everything is procedural: the 3D sets, characters and kaiju are built from code (Three.js),
and the score/SFX are synthesized with numpy. No external art assets.

> Trailer-based breakdown, not a verified account of the whole film. Staging and camera work are original interpretations.

| # | Time | Scene | Camera |
|---|------|-------|--------|
| 1 | 0:00–0:07 | Japan Was Already Broken — ruined city, family walks, kaiju shadow | descending crane → tilt to shadow |
| 2 | 0:07–0:14 | Two Years Later — rebuilt street, warm amber | lateral track → push-in on Koichi → dip to black |
| 3 | 0:14–0:21 | The Monster Never Died — regenerating fragment on seabed | macro dolly-in → smash cut |
| 4 | 0:21–0:29 | Noriko's Terrifying Secret — exam room, neck mark, doctor | push-in on mark → rack to doctor |
| 5 | 0:29–0:36 | A New Plan — overhead command table, maps, ships | overhead orbit → whip pan to alarm |
| 6 | 0:36–0:44 | The King Returns — flooded street, rain, fleeing civilians | ground-level track back → tilt up |
| 7 | 0:44–0:52 | The Blue Destruction — dorsal plates charge, beam, Akiko prays | dolly to plates → whip pan with beam → static close-up |
| 8 | 0:52–1:00 | No Third Chance — silhouette in blue ash, title, logo | slow dolly-out → 12-frame fade → title scale-up |

Narration: natural **Kokoro TTS** voice (`am_michael`, kokoro-onnx v1.0), placed on each scene's cue,
with the score ducked underneath. Lower-middle captions are timed from the actual voice durations.

Look: bevelled plastic bricks with environment reflections, a custom post pipeline (bloom, ACES tone
mapping, per-scene colour grade, chromatic aberration, vignette, film grain), a keloid-textured kaiju
with hundreds of scale bricks and glowing dorsal plates, and set dressing per scene — utility poles and
sagging wires, kanji shop signs, fires with embers and flicker light, light shafts, laundry lines,
seaweed and a sunken wreck, radio gear and map pins, 1940s trucks, lightning.

## Files
- `index.html` — scene engine. Open it in a browser for an interactive preview (Play / scrub).
- `render.js` — headless Playwright frame renderer (`renderAt(t)` is fully deterministic).
- `audio.py` — procedural score and SFX (siren, piano, heartbeat, alarm, footsteps, roar, beam, blast).
- `voiceover.py` — Kokoro narration, auto-fit to each scene window (writes `*_timing.json`).
- `mix.py` — ducks the score under the voice and masters the final track.
- `godzilla_minus_zero_reel.mp4` — final 1080×1920, 30 fps, H.264 + AAC.

## Rebuild
```bash
npm i three@0.149.0 playwright
node render.js frames
python3 audio.py score.wav
pip install kokoro-onnx soundfile   # plus kokoro-v1.0.onnx + voices-v1.0.bin from the kokoro-onnx releases
python voiceover.py kokoro-v1.0.onnx voices-v1.0.bin vo.wav am_michael
python3 mix.py score.wav vo.wav final.wav
ffmpeg -framerate 30 -i frames/f_%05d.jpg -i final.wav -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest godzilla_minus_zero_reel.mp4
```
