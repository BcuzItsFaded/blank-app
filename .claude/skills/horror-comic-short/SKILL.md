---
name: horror-comic-short
description: Turn a combined comic storyboard image (numbered panels with timestamps, NARRATOR/CAMERA/FX notes) plus a timestamped narration script into a finished animated 9:16 YouTube Short MP4 (1080x1920, about 60 s). It crops every panel and adds cinematic zooms, parallax, candle flicker, moving shadows, fog, rain, money, TV glitch, undead reveals, word-synced subtitles, a generative horror score and synthesized SFX. Use whenever the user uploads a storyboard and/or script for a horror / comic / "Tales from the Crypt" style Short, asks to animate storyboard panels into a vertical video, or wants another episode like "THE WISH" for DON'T SPOIL IT RG. Free: no paid APIs. Also gives an HTML player and OBS instructions.
---

# Horror-comic Short from a storyboard

Produces a downloadable MP4, frame-exact and rendered offline, from:
1. **one combined storyboard image**: N numbered panels, each with a time range and CAMERA/FX notes;
2. **a narration script** with time ranges (e.g. `**0:00–0:07 — The Hook**` followed by the lines).

The engine is `player/`, an HTML/CSS/SVG/JS animation player. Every frame is a pure function of time.
`player/js/project-default.js` is a complete worked example (THE WISH, 15 panels); copy its structure.

## Workflow

### 1. Set up the episode folder

```bash
SKILL=<this skill's directory>
EP=<working dir>/<episode-slug>          # e.g. ./the-wish, ./the-mirror
cp -r "$SKILL/player" "$EP"
cp <uploaded storyboard> "$EP/assets/storyboard.<png|jpg|webp>"
python3 -c "from PIL import Image; print(Image.open('$EP/assets/storyboard.<ext>').size)"
```

If the user only pasted the image in chat and there's no file path, ask them to attach it as a file.
The image is required for cropping.

### 2. Read the storyboard and write `assets/project.js`

Look at the image. For **each panel** record:
- `n`, `title`, `start` and `end` in seconds, read from the panel's printed time range;
- `rect: [x, y, w, h]`, normalized 0..1 against the full image size. Cover **only the artwork**: exclude
  the number/time/title bar above it, the NARRATOR/CAMERA/FX caption block below it, and borders. Measure
  rows and columns in pixels first, then divide by width/height. Layouts are often uneven (e.g. 4-4-4-3).
- `camera`, `fx`, `mood`, optional `transition`, `light`, `revealAt`, `fill`: translate the panel's
  CAMERA and FX notes using `references/effects.md`. The first panel gets `title`. A big monster/corpse
  reveal gets `undead` + `sting` + `transition: "flash"`. A final "THE END" card gets `end` and `fill` ≈ 0.42.

Write the file as JSON after `window.WISH_PROJECT = ` (quoted keys; the voice tools parse it). It overrides the defaults field by field:

```js
window.WISH_PROJECT = {
  "title": "THE MIRROR",
  "tagline": "SOME REFLECTIONS LIE",
  "channel": "DON'T SPOIL IT RG",
  "panels": [
    { "n": 1, "start": 0, "end": 3, "title": "Crypt Keeper Intro", "rect": [0.006, 0.1615, 0.240, 0.100],
      "camera": { "z": [1.0, 1.16], "f": [[0.5, 0.45], [0.55, 0.42]] }, "light": [0.07, 0.5],
      "fx": ["candle", "fog", "title", "laugh"], "mood": "creepy" }
  ],
  "script": "**0:00–0:07 — The Hook**\n\nNarration lines…\n\n**0:07–0:15 — The Statue**\n\n…"
};
```

`title` is the big title card, `tagline` sits under it (the storyboard's subtitle line, if any), and
`channel` is the watermark. Give one `panels` entry per panel, in order, covering 0 to the end with no gaps.
Writing the file with Python `json.dumps` is easiest.

Rules:
- `panels` **replaces** the example's list completely; give every panel all its fields.
- Panel times follow the **storyboard**. Subtitles follow the **script's** timestamps. If there is no
  separate script, build it from the NARRATOR lines, using each panel's time range.
- If the user didn't send a script but the panels carry NARRATOR text, use that text.

### 3. Verify the crops (always)

```bash
python3 "$SKILL/scripts/crop_check.py" "$EP" /tmp/crops.png
```

View the contact sheet. Each numbered tile must show only artwork: no yellow number box, no title text,
no caption text, nothing cut off at the edges. Fix the `rect` values and re-run until it's clean.

### 4. Preview stills, then adjust

```bash
node "$SKILL/scripts/render_video.mjs" "$EP" /tmp/still --stills 1.5,10,25,40,45,52,59.5
```

Look at the stills (montage them with PIL if helpful). Check that:
- the title card reads clearly;
- each subject is in frame (move a custom camera's second focus point onto it);
- the reveal panel shows the monster;
- the end card isn't clipped (lower its `fill`, shift its focus);
- no panel is too dark.

Global look knobs go in `settings` in project.js: `fill` (panel band height, default 0.55), `subtitleY`,
`fog`, `grain`, `halftone`, `shake`.

### 5. Narration voice (when the user sends a recording)

The user records the script on their phone (any format) and attaches it. **Best method:** transcribe
it and make the video follow the voice:

```bash
python3 -m venv ~/.piper && ~/.piper/bin/pip install piper-tts faster-whisper   # once (also used below)
~/.piper/bin/python "$SKILL/scripts/fit_narration.py" "$EP" <recording> [--creepy | --clown] [--length 60]
```

- Transcribes locally with Whisper (free, word timestamps) and aligns the transcript to the script, so
  stray words, false starts before or after, and "thank you" at the end are dropped. Each section is
  found exactly, even without pauses between sections.
- Shortens long pauses, then lays the sections end to end in `--length` seconds (default: the current
  length). It speeds up evenly only if needed (max `--max-tempo 1.2`, pitch kept); if the read still
  doesn't fit, the video gets longer instead (Shorts allow up to 3 minutes).
- **Re-times the panels and caption sections around the voice**, keeping their order and relative
  lengths, so each panel shows while its line is spoken. An `end` panel always gets the last beat.
- Writes `assets/voice-final.wav`, plus per-word `wordTimes`, so subtitles highlight every word exactly
  as it's spoken. Reports how much of the script it matched; below 50% it stops (wrong take).
- `--creepy` = deeper pitch, faint sub-octave growl, crypt reverb. Omit it for a natural voice, which
  gets clarity EQ only. If the user says it's hard to understand, re-run without `--creepy` and with
  `--max-tempo 1.06 --gap 0.4`: natural speed matters more than hitting exactly 60 s. Music ducks to 45%
  under a voice (`settings.duck`).
- **Another voice in the background** (a baby, kids, TV, someone talking): RNNoise keeps all voices,
  so separate first, then fit with `--denoise off` (the separation already cleans):
  ```bash
  ~/.piper/bin/pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu && ~/.piper/bin/pip install speechbrain  # once
  ~/.piper/bin/python "$SKILL/scripts/isolate_voice.py" <recording> /tmp/voice-only.wav
  ~/.piper/bin/python "$SKILL/scripts/fit_narration.py" "$EP" /tmp/voice-only.wav --denoise off …
  ```
  It keeps the separated source that matches the narrator's pitch. Tested on a baby over the narrator:
  baby sound 7.0 s → 1.0 s, about 10 dB quieter, clarity unchanged. Sounds that overlap a word can't be
  fully removed; if the user still hears them, ask for a re-take of that line.
- Between words, the audio is turned down 30 dB by default (catches sounds in the gaps between words);
  `--keep-gaps` disables it.
- Background noise is removed by default with RNNoise (`--denoise rnnoise`): neural voice isolation
  that removes fan, AC and room hum and leaves only the voice and natural breaths. Use `--denoise fft`
  for a lighter touch, or `off`.
- `--male` = natural male narrator from a higher voice. It measures the speaker's pitch, brings it to
  about 130 Hz and lowers resonance slightly. Tested to keep intelligibility unchanged; going deeper
  (about 115 Hz) cost clarity. Manual control: `--pitch 0.72 --formant 0.92`.
- `--clown` = creepy clown: about 1.2× higher, nasal, warbling, with a faint demon voice underneath
  and big-top echo. It stays easy to understand. Pair it with `--max-tempo 1.06 --gap 0.4`.
- `assets/project.js` must be `window.WISH_PROJECT = { JSON };` (quoted keys) for this script.

Fallback without Whisper: `python3 "$SKILL/scripts/prepare_voice.py" "$EP" <recording> [--creepy]`.
It splits at the pauses between sections (ask the user to pause about 1 s between them), keeps the
storyboard timing, and speeds up any section that overruns its slot.

**No recording? Use the free narrator** (runs locally, no API, no credits):

```bash
python3 -m venv ~/.piper && ~/.piper/bin/pip install kokoro-onnx piper-tts faster-whisper   # once
~/.piper/bin/python "$SKILL/scripts/narrate_tts.py" "$EP" --fit [--voice am_michael] [--speed 1.1] [--creepy | --clown] \
    [--length 60 --max-tempo 1.06 --gap 0.4]
```

- Default engine **Kokoro** (Kokoro-82M, Apache 2.0: commercial OK, no credit needed). It's the most
  human-sounding free option and downloads about 350 MB once. Voices: `am_michael` (warm US storyteller,
  default), `am_fenrir` (deeper), `am_puck` (lively), `bm_george` / `bm_fable` (British), and female
  `af_heart` / `af_bella`. Use `--speed` to fit the script (1.1 suits about 60 s).
- `--engine piper` is lighter but sounds more robotic (`en_US-john-medium`, public domain). Use it only
  if Kokoro can't be installed. Never use Piper's `en_US-ryan-*` or `en_US-hfc_male-*` (non-commercial).
- With no style flag the voice stays natural; the user can ask for `--creepy` or `--clown`.
- `--fit` sends the take through fit_narration.py, the same as a real recording: Whisper word timing,
  panels re-timed to the voice, word-exact subtitles.
- The most human option is ElevenLabs, if the user has the connector and agrees to spend credits.

The music automatically ducks under the voice in the render. Voice cloning from a short sample isn't
part of this skill (free models aren't licensed for monetized channels).

### 6. Render the MP4

```bash
node "$SKILL/scripts/render_video.mjs" "$EP" "$EP/<EPISODE>-short.mp4" --fps 30 --crf 23
ffprobe -v error -show_entries format=duration,size -of compact "$EP/<EPISODE>-short.mp4"
```

A 60 s render takes about 5–8 minutes; run it in the background or with a long timeout. Expect
1080×1920, 30 fps, H.264 + AAC, about 40–60 MB. Spot-check: extract a tile sheet
(`ffmpeg -i out.mp4 -vf "fps=1/3,scale=150:267,tile=10x2" -frames:v 1 tiles.jpg`), view it, and confirm
the audio isn't clipping (`-af volumedetect`; max should be under 0 dB).

### 7. Deliver

Send the MP4 with SendUserFile (`display: "attach"`, so it saves straight to their phone). Mention:
- if there's no narrator voice yet: offer the free creepy narrator, or they can record the script and send it (step 5);
- they can open `$EP/index.html` to preview/tweak, or record it live with OBS (`player/OBS_GUIDE.md`).

## Requirements

- Chromium via Playwright (`npm i -g playwright` or a local install) and `ffmpeg` on PATH; Python 3 with Pillow and numpy; for narration, a venv with kokoro-onnx, piper-tts and faster-whisper.
- Internet once, for Google Fonts (Anton, Creepster, Special Elite) used by titles and subtitles.

## Notes

- Character continuity comes from using the user's art as-is. Never mirror, regenerate or repaint a
  panel; only the shared grade/grain/halftone is applied.
- Panels shorter than about 1.5 s still work (transitions shorten automatically), but prefer
  ≥ 3 s for anything with text.
- Scripts accept: `**0:00–0:07 — Heading**` + lines, `[0:00-0:07] text`, `0:00 - 0:07 | text`,
  `NARRATOR:` / character labels. CAMERA:, FX: and SFX: lines in a script are ignored as narration.
