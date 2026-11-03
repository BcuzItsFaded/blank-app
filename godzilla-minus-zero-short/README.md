# GODZILLA MINUS ZERO (2026): 60-second YouTube Short, Don't Spoil It RG

This is an editable Remotion project built from the user's production pack
(`production-pack/`, from `Dont_Spoil_It_RG_Godzilla_Minus_Zero_Claude_Pack.zip`).
It renders one 1080×1920, 30 fps, 60.00 s H.264 MP4 made of **12 scenes × 150 frames**, in
chronological order. It is a trailer-based preview, not a full plot or ending recap.

## Artifact status

| Item | Status |
|---|---|
| Narration | **Used verbatim** from `voiceover.txt` / `captions.srt`, one line per 5 s scene |
| Voice | **Free local TTS** (Piper, `en_US-ryan-high`). This is a scratch voice, not a professional narrator. Replace it via `public/audio/vo/` |
| Score | **Original**, synthesized in code to the cue sheet: hopeful piano, dread drones, taiko, choir resolve. No copyrighted music |
| SFX | **Original**, synthesized in code and placed at the exact times in `audio_cue_sheet.csv` |
| Visuals | **Code-drawn animatic** (SVG). The pack's 12 keyframe stills were not supplied as images, so each scene is drawn in code: camera phases, parallax, cel line-boil, grain, rain, ash, smoke and pale-blue atomic glow. The art is not painted keyframe quality |
| Captions | Text from `captions.srt`, word-highlighted, at most two lines, kept clear of the Shorts UI |
| Brand | **DON'T SPOIL IT RG** only: a small editable wordmark in the upper left, plus the final slate |
| Fact labels | The pack's per-scene `status` is shown on screen, e.g. `CONFIRMED PREMISE + CREATIVE SHOT` |

## Run / render

```bash
npm ci
npm run studio       # live editor: scrub, tweak, preview
npm run render       # -> out/godzilla-minus-zero-short.mp4
```

Rebuilding the audio, which you only need after you change the narration or cues:

```bash
pip install piper-tts numpy scipy
mkdir -p voices
curl -L -o voices/en_US-ryan-high.onnx      https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx
curl -L -o voices/en_US-ryan-high.onnx.json https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/ryan/high/en_US-ryan-high.onnx.json
npm run audio        # narration/score/sfx stems + src/timings.json (word timings)
```

## Files

| Path | What it is |
|---|---|
| `src/scenes.json` | Per scene: verbatim narration, status, timed camera keys, transition, cue times. This is the edit point |
| `src/scenes.tsx` | The 12 animated scenes, staged from the pack's composition, action and motion notes |
| `src/characters.tsx` | Cast rig from `VISUAL_CONTINUITY.md` (Koichi, Noriko, Akiko, Ogata, Noda, Murakami, Aoyama) and one fixed Godzilla design |
| `src/Main.tsx` | Timeline, transitions (cut / match / lightning flash / white-blue flash wipe), captions, status labels, brand, final slate, audio stems |
| `scripts/make_audio.py` | Voice, score and SFX built from the cue sheet; score ducked about 10.5 dB under the voice |
| `scripts/render.mjs`, `scripts/stills.mjs` | Render the MP4, or review stills |
| `production-pack/` | The user's original pack (storyboard, prompts, metadata, SRT, cue sheet, fact sources) |

## Upgrading to painted keyframes and a real voice

1. Generate `scene_01.png` … `scene_12.png` from `production-pack/scene_prompts/` using the
   shared negative prompt. Put them in `public/keyframes/` and set `"keyframe": "keyframes/scene_XX.png"`
   for each scene in `src/scenes.json`. Each plate becomes the scene's base layer, and the
   camera keys still move it. Particles, captions and brand stay on top.
2. Put recorded or licensed voice takes at `public/audio/vo/scene-01.wav` … `scene-12.wav`, keeping
   each under 4.7 s. Run `npm run audio` (the takes replace Piper automatically), then `npm run render`.

## Fact boundaries (from `production-pack/FACT_CHECK_AND_SOURCES.md`)

- **Confirmed:**
  - 1949 setting, two years after *Minus One*
  - Godzilla not entirely destroyed
  - Noda's new extermination plan
  - Aoyama, weather expert
  - Murakami, war-scarred biologist
  - Koichi and Noriko return
  - Dr. Ogata's warning about an **unidentified** patient (never shown as Noriko)
  - Akiko prays
  - pale-blue heat ray
  - US wide release Nov 6, 2026
- **Prior-film clue:** Noriko's neck mark. It keeps the same size and shape in every shot.
- **Creative visualization:** every composition, the pinwheel, the mirror, the clinic, the seabed
  remnant, the planning and weather rooms, the neighborhood escape, and the heat-ray staging.
