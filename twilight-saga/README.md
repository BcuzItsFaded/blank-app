# Twilight Saga — Full Story Explained (animated)

A ~4-minute, 16:9 (1920×1080) animated stick-figure cartoon made from a 16-panel storyboard, for
**Plot Twist with RG**. One scene full-screen at a time, characters animated (walking, turning,
blinking, gesturing, fighting, reacting), natural male narration, word-synced subtitles, music and SFX.
Free tools only, no paid APIs.

```
open twilight-saga/index.html                   # preview (Space = play/pause, scrub bar)
node .claude/skills/horror-comic-short/scripts/render_video.mjs twilight-saga out.mp4 --fps 30 --crf 21
```

## How it's built

| Layer | What | Tool |
|---|---|---|
| Background plates | Each panel cropped from the storyboard, characters painted out, sides outpainted to 16:9 (no cropping of heads), upscaled | LaMa inpainting, Real-ESRGAN anime 4×, `tools/prep_plates.py` |
| Characters | Re-drawn as rigged vector puppets in the storyboard style (round beige heads, dot eyes, thick outlines, same hair/outfits) with joints, walk cycles, blinking, wind-blown hair, expressions | `js/rig.js` |
| Cut-out props | Van, cars, howling wolf, thought bubble, Volturi banners cut from the original art and animated (skid, grow, sway/mesh-warp) | rembg (u2net / isnet-anime) |
| Foreground | Desks and blanket kept in front of characters | `prep_plates.py` occluders |
| Choreography | 18 scenes timed to narration words (`S.cue("van")`) | `js/scenes.js`, `js/scenes2.js` |
| Effects | Rain + splashes, snow, moonlight, vampire sparkle, mind-reading waves, transformation aura, howl rings, shield bubble, petals, impact lines, speed blur | `js/engine.js` |
| Narration | Kokoro `am_michael` (Apache 2.0), per-scene, word timing by Whisper | `tools/narrate.py` |
| Music/SFX | Generative score per mood + synthesized skid, crash, howl, bells, thunder, heartbeat… ducked under the voice | `js/audio.js` |

Scenes 1–16 follow the storyboard; 17 (the final clue: Bella lets Edward into her mind) and 18
(outro with subscribe) carry the extra narration.

To change the narration: edit `assets/script.json`, run `python tools/narrate.py`, then
`python tools/build_data.py`. Every action re-times itself to the new word timings.
