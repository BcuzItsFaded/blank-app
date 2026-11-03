---
name: storyboard-episode
description: Turn a scene-by-scene storyboard (narration, shots, camera moves, effects, sound notes) into a finished DON'T SPOIL IT RG cartoon explainer video with this repo's engine. Use when the user pastes a storyboard or asks for a new episode, explainer, recap or "ending explained" video in the cartoon style.
---

# Storyboard to cartoon episode

The engine: `crystal_lake/cartoon.py` (character rig + sets), `green_mile/gm.py` (shots/crossfades, word-highlight captions, generated score, pipeline), `twilight/tw.py` (props, wolves, book-vs-film panel), `alien3/a3.py` (creature, rack focus, rim lights, storyboard shots) and `alien3/sfx.py` (synthesized sound effects). New episodes go in a new folder and import these, like `alien3/a3.py` does.

## Steps

1. **Narration.** Copy each scene's VO text into `script_long.txt`, one paragraph per scene (paragraph = scene = timing unit). Generate the voice with the same narrator used so far (Kokoro `am_michael`, speed 0.95) via `scratchpad/tts.py`. Check facts the storyboard doesn't source with a quick web search; never invent plot details.
2. **Cast.** Build every character from `Char(...)` with the film's real costume cues (hair, glasses, facial hair, coat length, uniforms). Verify appearance details that matter; if unsure, leave them generic.
3. **Scenes.** One function per paragraph. Inside it, follow the storyboard row by row: each "Visual Composition / Camera / Transition" becomes a shot function, cut in with `shots(ctx, R, t, [(p.cue("phrase"), shot), ...])` so cuts land on the narrated words. Use the helpers for storyboard language: slow dolly/push-in = animate `cam` zoom; rack focus = `defocus`; overhead = `top_head`; edge light = `rim_light`; match cut = shape that morphs into the next shot; hard cut = `black_frame`; desaturation = `OPERATOR_HSL_SATURATION`; fire in eyes = `eye_fire`; VHS = `vhs`.
4. **Sound.** Turn the storyboard's "Audio & SFX" lines into `SFX` cue entries (effect names from `sfx.BANK`) and requested silences into `SILENCE`.
5. **Preview before rendering.** Render stills at 15/45/75/95% of every scene (`python X.py still long ...`), tile them with ffmpeg, look at them, and fix overlaps, off-screen characters and unreadable dark shapes.
6. **Crash-test every frame path.** `CHECK=3 ONLY=<scenes> python X.py still long ...` in 4 parallel groups. Zero scales (`ctx.scale(0)`) and missing cue phrases are the usual crashes; never start a full render before this passes.
7. **Render** in the background, then re-encode with `-crf 26` (keep files under GitHub's 100 MB), sample frames across the finished file, and check `volumedetect` levels.
8. **Package.** Thumbnail (`thumbnail.py`), `YOUTUBE_UPLOAD.md` with real chapter times computed from the narration, then commit and push the episode folder.

## Rules

- Keep deaths and violence non-graphic: dust poofs, silhouettes, black-frame cuts.
- Mark every video as an unofficial fan recap; no studio logos.
- Say plainly in the final message where the result differs from the storyboard (art style, runtime).
