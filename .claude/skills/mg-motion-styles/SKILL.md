---
name: mg-motion-styles
description: Make a 10-second motion-design (MG) film in one of 15 canonical styles, entirely from code (SVG/Canvas/WebGL/Three.js picture, synthesised soundtrack, headless-Chrome render to MP4). Styles - flat vector, line art, isometric 2.5D, 3D render, cel/line boil, collage, liquid, shape morph, Bauhaus, 80s synthwave/VHS, aurora/glassmorphism, variety-show captions (花字), sticker explainer, pixel art, cyberpunk HUD/FUI. Use when the user wants an MG/motion-graphics clip, logo sting, brand explainer or style test in one of these looks, wants to write a prompt for a new MG style, or wants an MG film reviewed and scored.
---

# 15 Motion Design Styles — make a film from code

Installed from https://github.com/Vincentwei1021/mg-styles-15 (MIT, commit 46fd009). Every
film is a web page that defines `window.renderAt(t)`; `harness/render.mjs` captures every frame
in headless Chrome and muxes it with the soundtrack from `audio.py` (built on `lib/audio`, the
`mgaudio` toolkit). No image or video generation is used.

All paths below are relative to this skill's folder (`.claude/skills/mg-motion-styles/`).

## Pick the style

| Style | Prompt | Reference source |
|---|---|---|
| Flat Vector 扁平矢量 | `prompts/01-flat-vector.md` | `demos/01-flat-vector/` |
| Line Art 线条动画 | `prompts/02-line-art.md` | `demos/02-line-art/` |
| Isometric 2.5D 等轴 | `prompts/03-isometric.md` | `demos/03-isometric/` |
| 3D Render (C4D/Blender look) | `prompts/04-3d-render.md` | not bundled (Blender, 16 MB) |
| Frame-by-Frame / Line Boil 逐帧手绘 | `prompts/05-cel-boil.md` | not bundled |
| Collage / Cut-out 拼贴 | `prompts/06-collage.md` | not bundled |
| Liquid Motion 液态 | `prompts/07-liquid.md` | `demos/07-liquid/` |
| Shape Morph 形变 | `prompts/08-morph.md` | `demos/08-morph/` |
| Geometric Bauhaus 包豪斯 | `prompts/09-bauhaus.md` | `demos/09-bauhaus/` |
| 80s Synthwave / VHS 复古 | `prompts/10-synthwave.md` | `demos/10-synthwave/` |
| Aurora & Glassmorphism 弥散/玻璃 | `prompts/12-aurora-glass.md` | `demos/12-aurora-glass/` |
| Variety Captions 综艺花字 (9:16) | `prompts/18-hanazi.md` | not bundled |
| Sticker Explainer 贴纸人科普 | `prompts/19-paperclip.md` | not bundled |
| Pixel Art 像素风 | `prompts/20-pixel.md` | `demos/20-pixel/` |
| Cyberpunk HUD / FUI | `prompts/22-hud.md` | `demos/22-hud/` |

The unbundled demos (and the finished films) are in the upstream repo: clone it if the user
wants to study or re-render one of those.

## Make a film

1. Read the chosen `prompts/<style>.md`. The block under `## 提示词` is the full brief: treat it
   as your instructions. The surrounding notes are in Chinese; the prompt itself is English.
2. Adapt it to the user: only `Creative seed` is story-specific. Swap story, brand name, copy and
   colours for the user's; change `Output` for vertical 1080×1920 or another length if asked.
   Keep `Signature features` intact — it is what makes the style recognisable. Use invented
   brand names, and only commercially licensed assets (CC0, OFL).
3. Work in a project folder laid out like this skill: `demos/<slug>/index.html` (+ JS),
   `demos/<slug>/cues.json`, `demos/<slug>/audio.py`. The page must set `window.DEMO = {width,
   height, fps, duration}` and `window.renderAt = async t => …`, then `window.__ready = true`.
   Read a bundled demo of the same or a similar style before writing your own.
4. Set up once (from this skill folder, or copy `harness/`, `lib/`, `assets/`, `package.json`,
   `requirements.txt` into the project root):
   ```bash
   npm install                      # puppeteer-core, three, d3, opentype.js, simplex-noise, topojson-client
   pip install -r requirements.txt  # numpy, scipy, pedalboard, pyloudnorm, librosa …
   python3 lib/audio/tools/fetch_missing_samples.py   # the VCSL CC0 instrument samples (not bundled)
   ```
   The renderer serves from its parent folder, so page paths like `/assets/...` and
   `/node_modules/...` resolve against the skill/project root.
5. Render:
   ```bash
   python3 demos/<slug>/audio.py                          # → demos/<slug>/out/audio.wav
   MG_CHROME=/opt/pw-browsers/chromium node harness/render.mjs demos/<slug> --stills 0.5,2,5,8   # check stills first
   MG_CHROME=/opt/pw-browsers/chromium node harness/render.mjs demos/<slug>                      # → out/video.mp4
   ```
   `MG_CHROME` must point at a Chrome/Chromium binary (default is the macOS Chrome path). On
   Linux without a GPU, set `MG_GPU_ARGS="--no-sandbox --use-angle=swiftshader"` if WebGL fails.
   Other flags: `--from/--to`, `--scale 0.5` for quick drafts, `--workers N`, `--noaudio`.
   Preview by serving the root (`python3 -m http.server 8000`) and opening
   `harness/preview.html?demo=<slug>`.
6. Check spec: exactly 10.000 s (or the asked length), stated resolution/fps, −14 LUFS integrated,
   true peak ≤ −1 dBTP (`mgaudio.analyze(path)` reports these). Look at stills/contact sheets
   yourself before calling it done.

## Review and revise

`rubric.md` holds the jury prompt (7 scored dimensions, 5–10 ranked fixes with timecodes) and the
follow-up "apply the review" prompt. The originals went make → review → revise twice and scored
7.57–8.21/10. For a stronger result, run the review in a separate agent that did not make the
film, then revise. One run rarely matches the originals' finish.

## Write a new style

Fill the four style-specific sections in `template.md` (Output, Suggested technical route,
Creative seed with per-second beats, Signature features with checkable techniques) and copy the
shared sections (role, How to work, Rules, Craft checklist, self-review, Deliver) verbatim from
any `prompts/*.md`.

## Notes

- Fonts are not bundled (licences differ); `assets/fonts/README.md` lists them and where they go.
  The bundled demos call `document.fonts.load(...)` before `__ready`, so with the files missing
  they fail with `NetworkError` and the render times out. For new films, point `@font-face` at
  OFL fonts you actually have on disk (e.g. download from Google Fonts into `assets/fonts/`).
- `lib/audio/README.md` is the full `mgaudio` API reference (recipes, synths, drums, samples, sfx,
  mix/master, `analyze`). Soundtracks are deterministic.
- Licence: MIT (`LICENSE`); third-party files keep theirs (VCSL samples, textures: CC0/public
  domain; glyph outlines in `demos/08-morph/glyphs.json`: SIL OFL).
