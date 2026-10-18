# Street Fighter (2026) — Full Breakdown (Don't Spoil It RG)

Status: **pre-production complete. No video has been rendered yet.** Visuals and narration have not
been generated. The pipeline was tested end to end with placeholder clips and synthetic audio.

| File | What it is |
|---|---|
| `production.json` | Single source of truth: style, character locks, 20 scenes, 77 shots, narration |
| `research.md` | Fact table with sources and confirmed / disputed / theory status |
| `youtube.md` | Title, description + chapters, tags, thumbnail prompt and overlay text |
| `out/script.md` | Narration script with timecodes and delivery notes (~1,240 words, ~9:00) |
| `out/storyboard.md` | Shot-by-shot storyboard |
| `out/character_sheets.md` | Model-sheet and sprite-sheet prompts for 19 characters (generate first) |
| `out/clip_prompts.jsonl` | Per-shot image prompt, motion prompt, negative prompt, duration |
| `out/vo_lines.jsonl` | Per-scene TTS input with delivery direction |
| `out/subtitles.en.srt` | English subtitles (estimated timing; regenerate after VO) |
| `out/cue_sheet.csv` | Music and SFX cues with timecodes |
| `out/timeline.json` | Resolved timing used by the assembler |

Tooling lives in the reusable skill `.claude/skills/anime-video-production/`.

## Finish the video

```bash
SK=.claude/skills/anime-video-production/scripts
P=productions/street-fighter-2026
# 0. animatic for timing review (no spend)
python3 $SK/assemble.py $P --placeholders -o $P/out/animatic.mp4
# 1. put generated clips in $P/clips/<shot>.mp4, narration in $P/vo/<scene>.mp3,
#    music in $P/music/<cue>.mp3, sfx in $P/sfx/<name>.mp3
python3 $SK/build.py $P --vo-dir $P/vo          # retime to the real narration
python3 $SK/assemble.py $P --clips $P/clips --vo $P/vo --music $P/music --sfx $P/sfx
```

Music: use royalty-free or licensed tracks only. Original Street Fighter game and film music will
trigger Content ID claims.
