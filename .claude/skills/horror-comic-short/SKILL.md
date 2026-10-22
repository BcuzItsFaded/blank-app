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

Write the file (it overrides the defaults field by field):

```js
window.WISH_PROJECT = {
  title: "THE MIRROR",                    // big title card text
  tagline: "SOME REFLECTIONS LIE",       // under the title (storyboard subtitle line if any)
  channel: "DON'T SPOIL IT RG",          // watermark
  panels: [
    { n: 1, start: 0, end: 3, title: "Crypt Keeper Intro", rect: [0.006, 0.1615, 0.240, 0.100],
      camera: { z: [1.0, 1.16], f: [[0.5, 0.45], [0.55, 0.42]] }, light: [0.07, 0.5],
      fx: ["candle", "fog", "title", "laugh"], mood: "creepy" },
    // … one entry per panel, in order, covering 0 → end with no gaps
  ],
  script: `**0:00–0:07 — The Hook**

Narration lines…`
};
```

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

### 5. Render the MP4

```bash
node "$SKILL/scripts/render_video.mjs" "$EP" "$EP/<EPISODE>-short.mp4" --fps 30 --crf 23
ffprobe -v error -show_entries format=duration,size -of compact "$EP/<EPISODE>-short.mp4"
```

A 60 s render takes about 5–8 minutes; run it in the background or with a long timeout. Expect
1080×1920, 30 fps, H.264 + AAC, about 40–60 MB. Spot-check: extract a tile sheet
(`ffmpeg -i out.mp4 -vf "fps=1/3,scale=150:267,tile=10x2" -frames:v 1 tiles.jpg`), view it, and confirm
the audio isn't clipping (`-af volumedetect`; max should be under 0 dB).

### 6. Deliver

Send the MP4 with SendUserFile (`display: "attach"`, so it saves straight to their phone). Mention:
- there is **no narrator voice** unless they gave an audio file. To add one, put it at
  `$EP/assets/voice.mp3`, starting at 0:00 (`voiceOffset` shifts it), and re-render; music ducks under it;
- they can open `$EP/index.html` to preview/tweak, or record it live with OBS (`player/OBS_GUIDE.md`).

## Requirements

- Chromium via Playwright (`npm i -g playwright` or a local install) and `ffmpeg` on PATH; Python 3 with Pillow.
- Internet once, for Google Fonts (Anton, Creepster, Special Elite) used by titles and subtitles.

## Notes

- Character continuity comes from using the user's art as-is. Never mirror, regenerate or repaint a
  panel; only the shared grade/grain/halftone is applied.
- Panels shorter than about 1.5 s still work (transitions shorten automatically), but prefer
  ≥ 3 s for anything with text.
- Scripts accept: `**0:00–0:07 — Heading**` + lines, `[0:00-0:07] text`, `0:00 - 0:07 | text`,
  `NARRATOR:` / character labels. CAMERA:, FX: and SFX: lines in a script are ignored as narration.
