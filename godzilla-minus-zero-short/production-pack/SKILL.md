# SKILL: Storyboard, Motion, Narration & Claude Animation Engine
# ID: storyboard-motion-narration-v2-claude

## Mission
Create complete, accurate, production-ready animation packages from scripts, concepts, movies, or trailer information. Output not only scene descriptions, but synchronized voiceover, image prompts, motion prompts, camera moves, SFX, subtitles, sound mix notes, and executable editing specifications.

## Channel routing (critical)
- Movie analysis and movie breakdowns (including GODZILLA MINUS ZERO and the ALIEN collection): **DON'T SPOIL IT RG**.
- For any different future project, use only the channel explicitly selected by the user. Never mix channel names within the same export.

## Default production formats
- YouTube Shorts: 9:16, 1080x1920, 30 fps, 60 seconds, 12 scenes of 5 seconds when the current project requests 12.
- Long-form: 16:9, 1920x1080, as many shots and seconds as needed to cover the story without rushed VO.
- Default art: hand-painted, hand-inked 1990s Japanese anime horror, grounded human anatomy, dense dramatic shadows, practical 1940s-era detail when appropriate, textured painted backgrounds. **No LEGO, bricks, toy plastic, miniature photography, or animated presenters.**

## Accuracy and source rules
1. Use official distributors, production company, filmmaker interviews, published trailers, scripts or documented cut differences where possible. Do not use Wikipedia as the primary source.
2. Distinguish confirmed trailer premises, scenes from a previous movie, interpretations, and wholly invented dramatization. An imagined shot cannot become a claim about what the upcoming movie shows.
3. For unverified film endings, write a trailer-preview script and never pretend to provide the whole ending.
4. Keep canonical period and character continuity. Keep keyframe prompts free of embedded captions/logos; add all text in editing.

## Deliverables for each film
1. Production overview and fact boundaries, one cohesive 12-scene timeline.
2. Complete spoken narration, with actual start/end times and pacing QA.
3. For each scene: verified status, shot size/angle/lighting, onscreen action, specific camera and transition in at least 3 timed phases, one detailed 9:16 keyframe prompt, one image-to-video or code-motion prompt, layered SFX and music cues with exact timeline positions, subtitle text and continuity restrictions.
4. Character/creature design bible and shared negative prompt.
5. `scene_metadata.json`, `captions.srt`, `voiceover.txt`, `audio_cue_sheet.csv`, named individual scene prompts, full Claude master prompt, export guidance and a QC checklist.
6. Honest artifact status: label scripts/prompts/edited assets/rendered MP4 distinctly.

## Claude execution contract
- In Claude Code with Remotion (when installed): make a runnable React/Remotion project, 12 sequences of exactly 150 frames at 30fps, totaling 1800 frames, with editable typography, camera keyframes, parallax, weather effects, and audio layers. Render MP4 only when actual render tools are available, and verify the file.
- If source images or audio are missing, generate exact asset prompts and names plus valid placeholder graphics. Never claim the final cinematic animation or narrator voice exists unless created and verified.
- If using a supported image-to-video generator, render **each scene as a separate 5-second image-to-video shot** then assemble. Preserve reference character and Godzilla designs; avoid deforming faces or extra limbs.
- Reconcile narration with picture edit rather than dropping lines. Use only original/licensed soundtrack and sound effects.

## Exact per-scene structure
### 🎬 Scene X — Title (mm:ss–mm:ss)
- Status of story fact
- Visual Composition
- On-Screen Action
- Camera & Transition Motion, with timed phases
- Narration / Voiceover (verbatim)
- Still Keyframe Prompt
- Video / Motion Prompt
- Audio / SFX / Music (timed, spatialized, and ducking notes)
- Captions, brand, graphics and editorial transitions

## Technical safety and QC
- No music borrowed from copyrighted film score, no unlicensed trailer footage, no impersonation voice.
- Face/monster/wardrobe/reference consistency in all 12 shots; no text baked into keyframes.
- Allow at most two subtitle lines and keep clear of Shorts interface overlays; smaller logo upper-left.
- Export 1080x1920 H.264, 30fps, target exactly 60.00s and -1dBTP or lower audio true peak.
- If audio isn't rendered, produce a complete sound cue plan; be candid.
