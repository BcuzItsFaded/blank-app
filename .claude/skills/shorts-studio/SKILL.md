---
name: shorts-studio
description: Make a finished 60-second 9:16 YouTube Short (1080×1920, 30 fps) as an editable Remotion project and a rendered, verified MP4. Covers script writing or verbatim use of the user's script, fact labels, code-drawn 1990s-anime-style cel animation (or animating the user's storyboard panels), free two-host or narrator TTS voices, an original score and SFX, word-highlighted captions, a channel brand mark, -14 LUFS mastering, a resumable render and QC. Use when the user asks for a Short, reel, "animate this script/storyboard", a legend, movie or TV breakdown, post-credits explainer, or "do the next story" for Plot Twist with A&R or Don't Spoil It RG.
---

# Shorts Studio

This skill takes a story to a verified 60 s vertical MP4. Proven on: Godzilla Minus Zero, The Island of the Dolls (both painted-panel
and cel versions), the VisionQuest post-credits explainer, and La Llorona.

## 0. Decide before building (ask only if unclear)

| Decision | Default |
|---|---|
| **Channel** | **Plot Twist with A&R**: legends, mysteries, "plot twist" stories; two hosts, wife + "you"; logo `public/brand/logo.png`. **Don't Spoil It RG**: movie/TV breakdowns and explainers; single narrator; "DON'T SPOIL IT RG" wordmark. Never mix brands in one export. |
| **Script** | If the user gave one, use it **verbatim**, with their timings. Otherwise write it: 8 segments (7–8 s) for Plot Twist, 12 × 5 s for Don't Spoil It. |
| **Look** | **Cel** (code-drawn, default) or **plate** (the user's storyboard panels, animated). Ask if they sent art and it's unclear. |
| **Voices** | Free local Piper TTS unless the user supplies recordings. ElevenLabs is optional; check credits first. |

## 1. Facts first (non-negotiable)

- Check names, dates, release dates and "real twist" claims with WebSearch before writing. Cite the sources in your reply.
- Never present invented staging as fact. Every scene gets an on-screen **tag + note**:
  - legends: `LEGEND`, `MOST-TOLD VERSION`, `FOLK BELIEF`, `HISTORICAL RECORD`, `CLAIMS ONLY`, `DOCUMENTED`
  - film/TV: `CONFIRMED`, `CONFIRMED QUOTE`, `CANON`, `OPEN QUESTION`, `FAN-MADE`
- Fan or speculative content gets a permanent chip such as `FAN-MADE · NOT IN THE SHOW`. Explainers drawn as illustrations
  get `SPOILERS · ILLUSTRATED, NOT FOOTAGE`.
- If the user corrects a fact (e.g. "that's the actual teaser"), **verify it**, then relabel or rewrite the scenes to match.
- Use original character designs, never actor likenesses or official logos.
- For violence involving children, tell it in narration and don't show it. Cut away, then fade to black.

## 2. Scaffold

```bash
cp -r .claude/skills/shorts-studio/template <project-name>   # e.g. la-llorona-short
cd <project-name> && npm ci          # or reuse another project's node_modules: cp -al ../x/node_modules .
pip install piper-tts numpy scipy pyloudnorm fonttools
mkdir -p voices && cd voices && for v in en_US/ryan/high/en_US-ryan-high en_US/lessac/high/en_US-lessac-high; do
  for e in onnx onnx.json; do curl -sSfLO "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/$v.$e"; done; done
```

Rename the composition id and output name in `scripts/*.mjs`, `package.json` and `src/Root.tsx`.

## 3. `src/scenes.json`: the single source of truth

- `meta`: `brand`, `title`, `duration`, `speakers` (`{voice, color, fx?}`; `fx: "doom"` gives a pitched-down metallic mask voice).
- Each scene:
  - `id`, `name`, `start`, `dur` (seconds; must tile 0–60 exactly)
  - `lines: [{speaker, text}]`: verbatim script, used for captions
  - `spoken`: an optional per-line pronunciation override for TTS only, e.g. "Sochimilco", "nineteen forty-nine", "La Yoh-roh-nah"
  - `tag`, `note`
  - `transitionOut`: `dissolve | twist | fade | flash | cut | none`
  - `cues: [[secFromSceneStart, sfxKey]]`

## 4. Pictures

**Cel mode.** Edit `src/cel/celScenes.tsx`: one component per scene, `({ f })` = scene-local frame. The engine:
- `Stage` + `Layer depth` (0.1 sky … 1 subject … 1.4 foreground) give parallax. `cameraAt(cam(id, [[sec, zoom, x, y, rot], …]), f, shake)` moves the camera in timed phases.
- `Profile` is the character rig: `LOOKS` in `src/cel/characters.tsx`. Options include `hair`, `hat` (`straw`, `cap`, `veil`, …), `mustache`, `eyeColor`, `tears`, `smile`, `blink`, `tilt`, `breathe`, `rim`, `flip`.
- `Figure` draws walking silhouettes. Effects: `Sky` (baked painterly clouds), `Ocean`, `House`, `Rain`, `Ash` (snow, embers, sparks), `SoftGlow` (cheap light pools), `Boil` (hand-drawn line wobble), `flashAt`.
- Sync visuals to words with `wordFrame(sceneId, wordIndex)` and `lineFrame(sceneId, lineIndex)` from `src/timing.ts`.
- Animate characters "on twos" (`onTwos(f)`) for the 90s anime feel. Keep the camera smooth.

**Plate mode.** Crop each storyboard panel to a ~2000 px-tall JPEG in `public/keyframes/scene_XX.jpg`, then use
`references/plate-mode-PlateScene.tsx`. It provides a focus-point camera (`[sec, zoom, u, v]`), parallax mist, fireflies, rain and leaves,
2.5D doll or prop sway cut from the painting, lantern flicker, ripples, flashes and shimmer. Hide the overlay logo in scene 1
if the art already contains it.

**Safe areas.** Captions sit at `top: 1290–1300`, at most 2 lines. Tags sit under the logo, top-left. Keep the right 140 px and bottom ~360 px clear of the Shorts UI.

## 5. Audio: `npm run audio` (`scripts/make_audio.py` + `scripts/synth.py`)

- **Narration:** Piper per line, fitted into `dur − 0.32 s` by iterating `length_scale`. Then `polish_voice`: HPF, presence EQ, de-mud, compressor, and every speaker normalised to −18 dB RMS. Word timings come from detected pauses plus syllables.
- **SFX:** write a `SFX` dict of synth functions keyed by the cue names. Put hits in `ACCENTS`, which are ducked less.
- **Score:** original only. Guitar arpeggios, music box, strings, choir, taiko and piano helpers are in `synth.py`.
- **Mix:** duck the score about 14 dB and ambience about 11 dB under the voice, then normalise to **−14 LUFS** with a look-ahead true-peak limiter at **−1.5 dBTP**. This writes `public/audio/mix.wav`, used by both the composition and the render.
- **Check voice-to-background margin per scene:** aim for ≥ 13 dB. Trim the cue gains that mask words.

## 6. Review, then render

```bash
node scripts/stills.mjs out/stills 0.4 <one mid-frame per scene…>   # make a contact sheet, look at it, fix, repeat
FRAMES=out/frames OUT=out/<name>.mp4 node scripts/render_twos.mjs --ones   # resumable chunks + ffmpeg assemble
```

Verify, and only then say it's rendered:

```bash
ffprobe -v error -show_entries stream=width,height,nb_frames -show_entries format=duration out/<name>.mp4   # 1080x1920, 1800, 60.000
ffmpeg -nostats -i out/<name>.mp4 -af ebur128=peak=true -f null - 2>&1 | grep -E "I:|Peak:"                  # ≈ -14.7 LUFS, ≤ -1 dBTP
```

Send the MP4 with SendUserFile, then commit it with `git add -f`. It's typically about 45–90 MB; GitHub warns above 50 MB and rejects files over 100 MB.

## 7. Gotchas learned the hard way

- **Speed:** live SVG filters (feTurbulence clouds, per-path glow, big blurs, blend-mode overlays) are what make renders slow. Use the baked
  `clouds_*.png` and `grain_alpha.png`, `SoftGlow`, and stroke rim lights. Cel renders run about 0.5–1.5 s per frame; plates about 0.7 s.
- **Fonts:** load them with `delayRender` inside a component (`useFonts`), not at module scope, or the CLI render times out. Subset big CJK fonts with `pyftsubset`.
- **Resuming:** the container can restart mid-render. `render_twos.mjs` skips finished chunks, so just rerun it.
- **Killing renders:** `pkill -f chrome-headless-shell` inside a bash command that contains that same string kills your own shell.
  Use `pkill -f render_twos.mjs` instead.
- **Captions are burned into frames:** after re-timing the narration, re-render the frames, not just the audio.
- **Background waits:** use `Monitor` with an until-loop or `run_in_background`. Never chain `sleep`s.

## 8. Report back

Give a short timeline table (time, voice, picture, label), state exactly what was verified, and list the honest gaps: the
voice is TTS, the art is a code-drawn animatic, and which facts are unconfirmed. Include the source links.
