---
name: storyboard-shorts-remotion
description: Turn a storyboard grid image plus a narration script into an animated vertical YouTube Short with Remotion - springy panel entrances, swipe transitions, slow push-ins, scene labels and word-by-word kinetic captions over free neural TTS narration. Use when the user sends a storyboard image and a script and wants a Short or vertical video made from it.
---

# Storyboard Shorts (Remotion)

Makes a 1080x1920 Short. Each storyboard panel springs in, holds with a slow zoom while its narration
plays, then swipes out. Captions pop in word by word and turn yellow as they are spoken.

## Inputs
- A storyboard image laid out as an even grid (for example 3 columns x 4 rows).
- The script split per panel, as `script.json`:
  `[{"label": "THE BOOKSTORE", "lines": ["First sentence.", "Second sentence."]}, ...]`
  One entry per panel, in reading order (left to right, top to bottom). Keep the user's wording.
  A Short must stay under 3 minutes; measure first and trim with the user's agreement if it runs long.

## Requirements
Node 18+, Python 3 with `pip install edge-tts numpy pillow`, and ffmpeg/ffprobe on the PATH.

## Steps
1. Copy `template/` to a working folder and run `npm install` there.
2. Prepare panels, narration, word timings and a music bed:
   `python3 scripts/prepare.py board.png script.json WORKDIR --grid 3x4 --title "YOU — SEASON 1" --subtitle "THE BOYFRIEND IS THE HORROR STORY"`
   Options: `--voice` (any edge-tts voice, default en-US-ChristopherNeural), `--rate` (e.g. +6%),
   `--gutter` (pixels trimmed around each panel). Look at `WORKDIR/public/panels/` to confirm every
   panel is cropped whole; uneven grids need the crop boxes in `prepare.py` adjusted by hand.
3. Check a frame: `npm run still` (writes still.png).
4. Render: `npm run render` (writes out.mp4).
   If Remotion cannot download its own Chrome, add `--browser-executable=/path/to/chrome`.

## Channel rules
- Do not add the hosts' photo or "Plot Twist with R & A" branding unless the user asks for it.
- Show every panel whole; never crop away art or the caption text drawn on it.
- Flag facts in the script you cannot verify, so the user checks them before posting.
