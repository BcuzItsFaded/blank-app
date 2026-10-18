---
name: anime-video-production
description: Plan and produce narrated, fully animated 2D anime-style YouTube videos (movie breakdowns, explainers, recaps) end-to-end — research, narration script, character model sheets, shot-by-shot storyboard, per-clip image/motion prompts, voiceover, subtitles, SFX/music cue sheet, ffmpeg assembly to 1080p, and YouTube packaging. Use when the user asks for an animated video, anime-style storyboard, scene-by-scene production files, or wants a video rendered from generated clips.
---

# Anime Video Production

One source file (`production.json`) drives every deliverable, so characters, timing, subtitles and
prompts can never drift apart. Edit the JSON, re-run the build, never hand-edit generated files.

## Pipeline

1. **Research & verify.** Search several independent sources. Record every plot claim in
   `research.md` with its sources and a status: `confirmed` (2+ reliable outlets agree), `disputed`
   (outlets conflict → narrate the disagreement, don't pick a side) or `theory`. Never narrate a
   detail you could not source. Note the release date and today's date.
2. **Write `production.json`** (schema below). Narration ≈ target_minutes × 145 words.
   Mark each scene `confirmed`, `theory` or `meta`; theory scenes get an on-screen purple
   "THEORY — NOT CONFIRMED" badge and a purple tint in prompts automatically.
3. **Build docs:** `python3 scripts/build.py <production_dir>` → `out/` gets script, storyboard,
   character sheets, clip prompts, VO lines, SRT, cue sheet and timeline. Check the printed runtime
   and adjust narration length until it sits inside the target.
4. **Character consistency.** Generate the model sheets in `out/character_sheets.md` first; pass
   them as image references to every shot generation. Every shot prompt already embeds the
   character `lock` text verbatim. Use the classic game/source designs, never real actor likeness.
5. **Generate visuals** per line in `out/clip_prompts.jsonl`: image from `image_prompt`, then
   animate with `motion_prompt` (image-to-video). Save as `clips/<shot>.mp4` (or `.png` as a
   fallback, which assembly animates with a slow push-in).
6. **Voiceover.** One TTS file per scene from `out/vo_lines.jsonl` → `vo/<scene>.mp3`. Then re-run
   `build.py --vo-dir vo` so every shot, cue and subtitle retimes to the real narration.
7. **Audio.** Music beds named after scene `music.cue` → `music/<cue>.mp3` (royalty-free / licensed
   only — never original game or film soundtrack, which triggers Content ID). SFX named after shot
   `sfx` entries → `sfx/<name>.mp3`.
8. **Assemble:** `python3 scripts/assemble.py <production_dir> --clips clips --vo vo --music music --sfx sfx`
   → `out/final_1080p.mp4` (H.264 1080p, AAC 48 kHz, narration-ducked music, xfade scene transitions,
   soft English subtitle track; `--burn-subs` to hard-burn). `--placeholders` renders a labelled
   animatic for timing review before any generation spend.
9. **Package:** title, description with chapters (scene start times from `out/script.md`), tags,
   thumbnail prompts, spoiler warning, fan-content disclaimer.

## Tool routing (check what is actually connected — never claim a render that did not happen)

| Need | Preferred | Fallback |
|---|---|---|
| Whole video (images + animation + VO + captions) | Calliope `create_video` with a custom template (style text + character sheets as references, `animate:true`) | per-shot pipeline below |
| Character sheets, keyframes, thumbnail | Canva `generate-image` (16:9) or any image model | — |
| Image-to-video animation | Calliope `animate_clip`, or any external i2v model fed `clip_prompts.jsonl` | stills + push-in (not "fully animated" — tell the user) |
| Narration | ElevenLabs `creative_generate_speech` (`eleven_v4`, 1 take per scene) | any TTS |
| SFX | ElevenLabs `creative_generate_in_flow` node_type `sfx` | royalty-free library |
| Music | full ElevenLabs connector, or a licensed library | — |
| Assembly | local ffmpeg via `scripts/assemble.py` | Calliope editor / CapCut |

Every paid generation: price it first (`estimate_only` / `estimate_generation_cost`), show the user
the exact number, and wait for explicit approval.

## production.json schema

```jsonc
{
  "meta": {"title", "channel", "resolution": [1920,1080], "fps": 24, "target_minutes": [8,10],
           "words_per_minute": 145, "scene_pad_sec": 1.2, "transition_sec": 0.5,
           "narrator": {"description", "tts_model", "voice_search"}},
  "style": {"anime": "...", "arcade": "...", "title": "...", "negative": "..."},  // one per shot mode
  "characters": {"<key>": {"name", "lock": "exhaustive, fixed visual description"}},
  "scenes": [{
    "id": "S01", "title", "status": "confirmed|theory|meta", "delivery": "VO direction",
    "music": {"cue", "vol"}, "narration": "spoken text", "transition": "<ffmpeg xfade name>",
    "shots": [{"w": relative_weight, "mode": "anime|arcade|title", "chars": ["<key>"],
               "action", "camera", "sfx": ["<name>"]}]
  }]
}
```

Shot durations = scene narration duration × weight share, so keep 3–6 shots per scene and aim for
4–8 s per shot (the sweet spot for current image-to-video models).
