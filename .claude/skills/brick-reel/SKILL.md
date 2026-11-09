---
name: brick-reel
description: Build a short, vertical (9:16) brick-built 3D animated "memory lane" / story reel for Facebook Reels, Shorts or TikTok about any title the user names (show, movie, game, franchise), with accurate characters, constant motion, synced sound effects and optional narration. Use when the user says things like "do a reel/video for <title>", "make it more accurate", "more motion", "show a level from each game", sends reference images of characters or locations, or asks for RG BrickVerse / brick animation content. Uses the shared engine in reels/engine (Three.js + headless Playwright render + procedural audio + Kokoro TTS).
---

# Brick Reel — accurate, high-motion brick animation for Facebook

Turns a title + reference images into a 30–60 s vertical video in the **RG BrickVerse**
brick style. Everything is code: Three.js scenes rendered frame-by-frame in headless
Chromium, procedural SFX/music in numpy, optional Kokoro narration, ffmpeg to MP4.

Existing reels to copy from (all in `reels/`):
`pokemon-ash-journey`, `ed-edd-n-eddy`, `dexters-lab`, `dk-country`, `dk-levels`,
`godzilla-minus-zero`. Shared kit: `reels/engine/` (read `references/engine-api.md`).

## 0. Ground rules

- **Original brick animation, not footage.** Never ship real game/show footage or art.
  Characters are brick *interpretations* built from the user's reference images.
  Credit the owner in the Facebook caption disclaimer. If the user asks for "the actual
  game/levels", explain that and offer: (1) they supply their own clips to edit,
  (2) mix real clip + brick version, (3) a closer original brick version.
- Default format: **1080×1920, 30 fps, 30 s, silent-friendly** (captions/cards carry the
  story). Sound = quiet SFX only if the user will add their own song; add music only if asked.
- Default branding: "RG BrickVerse" badge + end card (brand name is user-configurable).
- Be honest in the hand-off: say what you checked (frames) vs. didn't (audio playback),
  and list rough spots.

## 1. Workflow (do these in order)

1. **Scope** — title, length (default 30 s), narration yes/no, music vs. SFX-only, brand.
   Pick sensible defaults; ask only if the title or intent is truly unclear.
2. **Facts** — one quick web search for dates / key events (years on cards must be right).
   Cite sources in your reply if you used search.
3. **Reference intake (accuracy step 1)** — ask for / use images (see
   `references/accuracy-checklist.md`). Run `scripts/palette.py <image>` per character to
   get exact colours. Write a one-line **character sheet** per character *before* coding.
4. **Plan** — N shots × ~4 s (30 s ⇒ 6–7 shots + title). One title card per shot
   (`YEAR / NAME`). Decide the **camera move and character action for every shot**
   (see `references/motion-checklist.md`) — no shot may be a static pose.
5. **Scaffold** — `python3 .claude/skills/brick-reel/scripts/new_reel.py <slug> "<Title>"`.
6. **Build scenes** (`reels/<slug>/scenes.js`) with the engine. Reuse character builders from
   other reels instead of rewriting (split into `chars.js` like `dk-country`).
7. **Stills check loop (cheap, ~40 s)** —
   `node reels/engine/render.js reels/<slug>/memory-lane.html $OUT --stills 2,6,10…`
   then tile into a contact sheet and *look at it*. Compare against the reference images
   side by side. Fix, repeat until every character is recognisable. Never start the long
   render before this loop passes.
8. **Audio** — `reels/<slug>/audio.py` (imports `reels/engine/sfx.py`). Place every effect
   on the beat of what's on screen. Check per-3 s loudness, no clipping.
9. **Full render** — `scripts/make_video.sh` (3 parallel workers, ~20 min for 900 frames).
   Run it in the background and wait for the completion notice; don't poll.
10. **Motion QA** — `python3 scripts/motion_report.py <video-or-frames>`; fix any flagged
    static stretch *before* delivering (re-render only the affected frame range with
    `render.js --from N --to M`, then re-encode). The last title/fade second may flag; ignore it.
11. **Deliver** — send the MP4 (`SendUserFile`), commit + push (the repo hook demands it),
    write Facebook title / description / hashtags (see §6). Offer: mix their song, swap a
    scene, more reference-driven fixes.

## 2. Accuracy rules (the "make it more accurate" playbook)

Full list in `references/accuracy-checklist.md`. The short version:

1. **Reference first.** Every named character needs ≥1 reference image or an explicit
   character sheet. Without images, say the look is "from memory" and ask for them.
2. **Silhouette + 3 signature features** per character (e.g. Dexter: swoopy orange tuft,
   huge blue-lens glasses, purple gloves). Build those first; skin/clothes colours from
   `palette.py`, not guesses.
3. **Proportions** (head:body, height ratios between characters, limb length) matter more
   than detail. Dexter is short with a huge head; Dee Dee is tall and spindly.
4. **Faces carry identity** — brows, eyes, mouth shape, muzzle/teeth. Make expressions
   match the character (grin, frown, scowl).
5. **Environments** need their own signature props (neon sign, omelette machine, SCHEME
   stand, galleon, tiki totems) and the right palette/sky.
6. **Check every shot against the reference** in a side-by-side contact sheet; list
   mismatches and fix them in one pass rather than one-by-one renders.

## 3. Motion rules (the "as much motion as possible" playbook)

Full list in `references/motion-checklist.md`. Non-negotiables:

1. **Camera always moves** (push-in, orbit, crane, track, whip). Ease with `ease()`.
2. **Every character has a verb in every shot** (run cycle, jump arc, chest-beat, point,
   laugh, spin) and **secondary motion** (ponytail/cape sway, head lag, blink, tail).
3. **Environment is alive**: particles (dust, snow, embers, bubbles), swaying plants, flags,
   flickering lights, rotating gears, rippling water (UV scroll).
4. **Cut on action**: change shots on a jump/impact; use 0.2 s dip-to-black + flash on hits.
5. **Impact language**: squash on landing/stomp, camera shake, light flash, SFX hit — all on
   the same frame.
6. **Rhythm**: ~4 s per shot, a visible event every ~1 s. Run `motion_report.py`; every
   second should score above the threshold.
7. Prefer **side-scrolling tracking shots** for "level" requests (heroes left-of-centre,
   jump arcs over gaps, enemies squashed on landing, collectibles vanishing as passed).

## 4. Hard-won technical lessons (see `references/lessons.md`)

- Portrait frame is **narrow**: at 52° vertical FOV the horizontal view is only ~30°.
  Camera distance ≈ 2–3× the width you need to show. A 16-wide sign needs ~35 units back.
- Blown-out look = ACES + bright sky env. Lower hemisphere/sun, set `envIntensity: 0.3`,
  exposure 0.6–0.75, fog near/far large. Don't use pure-white ground.
- `scene.fog` colour must match the sky, otherwise grass goes cream.
- Hidden-by-hand problem: raised arms cover faces; keep arms out to the sides in close shots.
- Point lights placed in front of a character burn a white hole in white coats — rim-light
  from behind/above instead.
- Foreground scenery (palms, columns) at the camera plane blocks the heroes — keep it behind
  the action or remove it.
- Never poll renders with sleep loops in the foreground; use a backgrounded wait and the
  completion notification. Kill stale renders (`pkill -f engine/render.js`) before restarting.

## 5. Sound

- SFX-only low mode: `audio.py out.wav sfx 0.3` → peak ≈ −11 dBFS, RMS ≈ −26 dBFS so a song
  sits on top. Full mode adds a light bed. Sync from the same timeline constants as the
  scenes (e.g. runner `x = X0 + SPEED·t` ⇒ `when(level_start, x)` in the audio script).
- One SFX family per shot (ambience + footsteps + jump/land + collect + signature gag).
- Kokoro voiceover (if asked): `reels/engine/voiceover.py` — keep each line inside its shot
  window; shorten text rather than speed up beyond 1.15×.

## 6. Facebook delivery

- Export: H.264 + AAC, 1080×1920, 30 fps, `-movflags +faststart`, under ~100 MB, 30–60 s.
- Post copy: 2–3 title options, description with emoji + a *question* to drive comments, a
  fan-disclaimer line crediting the rights holder, 12–15 hashtags in the description and a
  longer list for the first comment; remind them FB works best with 3–5 visible hashtags and
  that copyrighted songs can be muted/flagged.
- Files in the repo: commit **and push** each deliverable (a Stop hook enforces this).

## 7. Definition of done

- [ ] Every character recognisable next to its reference (contact sheet checked)
- [ ] `motion_report.py` shows no static second
- [ ] Cards/years verified
- [ ] SFX synced; loudness checked; end silence at the cut
- [ ] MP4 sent + committed + pushed
- [ ] Facebook title/description/hashtags provided
