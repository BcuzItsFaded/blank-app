# Godzilla Minus Zero (2026): 60-second YouTube Short (Plot Twist with A&R)

This is an editable Remotion project that renders a 1080×1920, 30 FPS, 60-second vertical Short:
12 scenes of exactly 5 s each, in a dark hand-drawn 1990s anime-horror style. It includes:
- narration synced to the visuals
- word-highlighted subtitles
- an original synthesized score and SFX timed to narration words
- fact labels on every scene (CONFIRMED / STAGED VISUAL / THEORY)
- a Plot Twist with A&R brand mark
- a closing Godzilla Minus Zero title card

> **Status: DRAFT animatic.** The user's production package (script, 9:16 keyframes,
> `storyboard-motion-narration-v2-claude` skill) never reached the build session. The
> 12-scene script in `src/scenes.json` is a stand-in written from confirmed public facts,
> and the visuals are code-drawn (SVG) placeholders for the painted keyframes. The
> narration is a scratch voice from the local Piper TTS (`en_US-ryan-high`), because the
> ElevenLabs account had 0 credits.

## Files

| Path | What it is |
|---|---|
| `src/scenes.json` | **Single source of truth.** For each scene: narration, camera move, parallax plan, actions, transition, SFX, confirmed facts vs. invented staging, fact tag, optional keyframe |
| `src/scenes.tsx` | The 12 animated scenes (camera, parallax layers, character acting, particles) |
| `src/characters.tsx` | Character rig (Shikishima, Noriko, Noda, Murakami) and the original Godzilla design |
| `src/env.tsx`, `src/fx.tsx` | 1949 environments, camera/parallax system, rain/ash/smoke/lightning, grain, cel line-boil |
| `src/Main.tsx` | Timeline, transitions, subtitles, fact tags, brand mark, Plot Twist card, title card, audio |
| `scripts/make_audio.py` | Builds `public/audio/{narration,score,sfx,mix}.wav` and `src/timings.json` (word timings) |
| `scripts/stills.mjs` | Renders review stills or keyframes |
| `KEYFRAME_PROMPTS.md` | Image prompts and a character sheet for painted 9:16 keyframes |
| `out/godzilla-minus-zero-short.mp4` | The rendered video |
| `out/keyframes/` | The 12 animatic keyframes (one mid-scene frame per scene) |

## Render

```bash
cd godzilla-minus-zero-short
npm ci
pip install piper-tts numpy scipy          # only needed to rebuild audio
mkdir -p voices && curl -L -o voices/en_US-ryan-high.onnx \
  https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx
curl -L -o voices/en_US-ryan-high.onnx.json \
  https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx.json
npm run audio      # narration + score + SFX + timings.json
npm run studio     # live, scrubbable editor
npm run render     # -> out/godzilla-minus-zero-short.mp4
```

`remotion.config.ts` points Remotion at the container's pre-installed Chromium when that
browser is present. On another machine Remotion downloads its own browser.

## Swap in the real production package

1. **Script:** edit `narration`, `camera`, `actions`, `transitionOut`, `sfx`, `confirmed`,
   `staged`, `factTag` and `factNote` per scene in `src/scenes.json`. Each line must be
   speakable in about 4.4 s or less; the audio script stops with an error if a line is too long.
   Word-cued animation such as lightning on "peace" or plates on "one by one" is keyed to
   word indexes through `wordFrame(scene, wordIndex)` in `src/scenes.tsx`, so check those
   indexes after rewording.
2. **Voice:** put recorded or ElevenLabs takes at `public/audio/vo/scene-01.wav` … `scene-12.wav`.
   They replace Piper automatically. Then run `npm run audio`.
3. **Keyframes:** save painted plates as `public/keyframes/scene-XX.png` and set `"keyframe"`
   in `scenes.json`.
4. Run `npm run render`.

## Fact discipline

Every scene shows a tag that follows the research notes in `scenes.json`:
- **CONFIRMED**: backed by public reporting.
  - 1949 setting
  - Kamiki and Hamabe return as Shikishima and Noriko
  - Yoshioka returns as Noda
  - Min Tanaka plays biologist Kanji Murakami
  - Takashi Yamazaki directs
  - Japan release Nov 3, 2026; US release Nov 6, 2026
- **CONFIRMED (Minus One ending)**: details carried over from the 2023 film's ending.
  - Noriko's neck mark
  - the regenerating flesh in the sea
- **STAGED VISUAL**: invented staging, such as the fishing-boat sighting, the shot-by-shot
  spine ignition and the couple facing Godzilla.
- **THEORY**: the channel's reading of the title ("Minus One was the countdown").

The title lockup and the Godzilla design are original to this Short. They are not the
official logo or model.
