---
name: plot-twist-with-ar
description: End-to-end production of "Plot Twist with A&R" episodes — fact-check, 8-scene 9:16 storyboard prompts, then a finished animated Reel (narration, captions, music, SFX, A&R opener, end card) plus a viral caption package. Use for any Plot Twist with A&R episode, true horror/mystery Reel, storyboard, or caption request.
---

# Plot Twist with A&R — Episode Production Skill

One episode = **eight scenes → one ~60s vertical Reel (1080×1920) + caption package.**
The series name is always **Plot Twist with A&R** (never "R&A").

Work in three stages. Do the stage the user asks for; if they hand you finished images, skip
straight to Stage 3.

---

## Stage 1 — Intake and fact-check

1. Collect: episode title + number, the exact narration (8 scenes), real vs. fiction, and any images/zip.
2. **Episode numbering:** check the existing `plot-twist-*` folders in this repo and continue the
   sequence. If the user's number collides with an existing episode, say so and suggest the next free one.
3. **Real cases:** verify key claims with a quick web search (prefer BBC, Smithsonian, Wikipedia + its
   cited sources, official archives). Report in 1–3 sentences:
   - what is **documented**, what is **theory/speculation**, what is **artistic reconstruction**;
   - any mismatch with the script (e.g. sources say 9 aliases, script says "at least eight" → still OK).
   Never silently rewrite the script — flag and offer a corrected line.
4. **Fiction episodes** must be labelled fictional on screen and in the caption.
5. Never invent evidence, suspects, motives, quotes, or a "solved" twist. The twist must be supported
   by the record; otherwise end on the documented unanswered question.

## Stage 2 — Storyboard (eight separate 9:16 stills)

When the user needs images, give one camera-ready prompt per scene. Rules:

- **Scene 1:** both hosts only, purple-lit horror podcast studio, microphones. The square A&R logo art
  (`plot-twist-opener/art.png`) is the canonical host likeness — tell the user to attach it as a
  reference so faces stay consistent between episodes.
- **Scenes 2–8:** the story itself. No hosts.
- **Style bible (paste into every prompt):** retro 1990s horror comic, heavy black ink outlines, navy and
  cobalt shadows, muted burnt-orange/amber light, violet accents, aged comic-paper texture, subtle
  halftone, vertical 9:16, keep key subjects away from the top 15% and bottom 25% (captions go there).
- **No lettering in images:** no captions, speech bubbles, timestamps, scene numbers, "Scene X of 8",
  or watermarks. (These had to be covered up by hand in past episodes.) A tiny "Dramatized
  reenactment" tag is acceptable but not required — the video adds labels.
- Ask for **full-resolution 1080×1920 separate files**, not a collage and not small landscape crops —
  small panels look soft when enlarged.
- No graphic gore; suggest violence through reactions, evidence, and shadows.

## Stage 3 — Build the animated Reel

### Setup (the cloud container is fresh each session)
```bash
pip install -q kokoro-onnx soundfile scipy
mkdir -p /tmp/claude-0/kokoro && cd /tmp/claude-0/kokoro
curl -sSLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.onnx
curl -sSLO https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin
```
(HuggingFace and Microsoft TTS are blocked by the network proxy; GitHub release downloads work.
Paid tools — Calliope, Canva image gen, ElevenLabs — have been out of credits; don't rely on them.)

### Pick the template renderer
- **Full-frame 9:16 stills** → copy `plot-twist-mary-celeste/mc.py` (most complete).
- **Small/landscape comic panels** → copy `plot-twist-room-next-door/rnd.py` (header + large panel
  with slow pan + captions below + blurred background; crops baked caption boxes; covers baked
  timestamps with red story tags).
Unzip user archives into their own folder; open every image and **check each one matches its
scene's narration** (past zips had scenes swapped, or the wrong story entirely). Fix the order and
tell the user what you swapped.

### Opening scene
Build the episode opener with the template:
```bash
python3 plot-twist-opener/make.py plot-twist-opener/art.png s1.png "EPISODE TITLE" "TRUE STORY · PLACE · YEAR"
```
(For fiction use "A FICTIONALIZED HORROR STORY".) Scene 1 uses fx `['studio2']`, camera
`(1.0, 1.04, (0.5, 0.5), (0.5, 0.5))`, caption y `1700`.

### Edit the template's `SCENES`, `RED`, `say()`, sound block, effects, and end card
Per scene tuple: `(exact narration, voice, camera, [effects], label, caption_y)`.

**Conventions the user has asked for (do not regress):**
- **Exact narration, word for word.** Use `say()` only for pronunciation (years → words, names →
  phonetic, e.g. "Necani" → "Neh-kah-nee").
- **Voices:** male `am_michael`, female `af_heart`; alternate scene by scene. When Scene 1 has two
  speakers, generate both lines and concatenate (see `SPLIT1` in `rnd.py`) — **wife first if the script
  says so.**
- **Framing: show the whole picture.** Zoom 1.00–1.10 max with gentle drift. The user rejected both
  heavy zoom ("big") and tiny pictures. Pans across wide panels are fine.
- **Captions:** big white Inter Black, black stroke, 3-word chunks, key words in red (`RED` set).
  Move `caption_y` off any faces or baked text in the art.
- **Labels:** large outlined box at top ("ILLUSTRATED REENACTMENT", "RECONSTRUCTION · THEORY ONLY",
  "ILLUSTRATIVE PORTRAITS"). If the art already has a reenactment tag, don't add a second one.
- **Effects follow the user's animation notes:** flickering lamps/neon/candles (`glow`), water/sea
  ripple (`warp`), rain, lightning, flashlight sweeps, camera shake on impacts, fades.
- **Sound:** original score is generated in the template (D-minor pad + arpeggio, ducks under voice),
  plus per-scene SFX (knocks, creaks, footsteps, paper rustle, waves, wind, thunder, stings). A
  "sudden silence" reveal = zero the bed for that span (see `_sil` in `rnd.py`).
- **Ending:** fade to black, then end card text + **"PLOT TWIST WITH A&R"**.
- Target 50–62s. Adjust `speed=` (0.95–1.15) rather than cutting words.

### Render loop
1. `python3 <script>.py x --preview` → open `preview.png` (two frames per scene + end). Fix framing,
   caption collisions, effect positions, then re-preview.
2. Full render in the background (`run_in_background`), ~6–8 min per minute of video:
   `python3 <script>.py /home/user/blank-app/plot-twist-<slug>.mp4`
3. Verify with `ffprobe` and a few sampled frames, then send with `SendUserFile`.
4. Copy the script + scene images into `plot-twist-<slug>/`, commit, push to the session branch.
   Keep MP4s under 100 MB (re-encode at `-b:v 4.8M` if needed; gitignore larger masters).

## Stage 4 — Caption package (when asked, or offered after delivery)

Order: **TITLE line first** → one-line scroll-stopping hook → 4–6 short story lines (no spoilers for the
twist in fiction) → engagement CTA (question, "send this to…", follow) → `🎙️ Plot Twist with A&R |
Episode N` → honesty line (reenactment / fictionalized) → **exactly 5 hashtags**:
one topic tag people search (e.g. `#IsdalWoman`), one or two niche tags (`#TrueCrime`,
`#UnsolvedMysteries`, `#ScaryStories`), one broad tag (`#TrueStory`), and the series tag
`#PlotTwistWithAR`. Also offer a pinned comment and a 3–5 word cover text.

## Checklist before sending
- [ ] Name reads **Plot Twist with A&R** everywhere (video + caption).
- [ ] 8 scenes in narration order; every image matches its line.
- [ ] Narration exact; Scene 1 speaker order correct.
- [ ] Whole image visible, nothing important under captions or labels.
- [ ] Real-case claims checked; theories labelled; fiction labelled.
- [ ] Ends on black with the A&R end card.
- [ ] Video sent, scripts committed and pushed.
