# THE WISH: animated horror-comic Short player

A 60-second, 9:16 (1080×1920) animated horror-comic YouTube Short for **DON'T SPOIL IT RG**.
It is built in plain HTML/CSS/SVG/JavaScript. It has no build step, no paid APIs and no downloads
besides Google Fonts.

The player cuts the 15 panels out of the single combined storyboard image and animates each one on the
storyboard's timestamps. It adds camera moves, parallax, lighting, weather, money, the undead reveal,
word-synced subtitles, a generative score and synthesized sound effects. Every frame is a pure function
of time, so scrubbing, previewing and recording always match.

```
open the-wish/index.html          # Chrome / Edge / Firefox
```

Recording: see **[OBS_GUIDE.md](OBS_GUIDE.md)**. You can also use the built-in **Export → Record 60 s video file**.

## Two synced tracks

| Track | Source | Drives |
|---|---|---|
| Visual | Panel timestamps printed on the storyboard (0:00–0:03, 0:03–0:07 … 0:59–1:00) | Which panel is on screen, camera, FX, music mood, transitions |
| Narration | Timestamps in the narration script (0:00–0:07 The Hook … 0:56–1:00 The Ending) | Word-by-word subtitles, comic caption boxes, TTS / voice-over |

Every script section boundary (0:07, 0:15, 0:27, 0:39, 0:47, 0:56) falls on a panel boundary, so the two
tracks line up.

## Panel plan (from the storyboard's CAMERA / FX notes)

| # | Time | Panel | Camera | Visual FX | Sound |
|---|---|---|---|---|---|
| 1 | 0:00–0:03 | Crypt Keeper Intro | close push | candle flicker + moving shadows, embers, fog, **THE WISH** title card | hit, creepy laugh, candle crackle |
| 2 | 0:03–0:07 | The Frustrated Man | drift | rain, sweeping shadow | rain, sad music |
| 3 | 0:07–0:11 | The Mysterious Statue | slow zoom onto statue | dust motes in light | shop clock ticks, eerie chime |
| 4 | 0:11–0:15 | The Warning | slow push on sign | shadow sweep, dust | low dramatic boom |
| 5 | 0:15–0:19 | The First Wish | push to face | golden glow, rising sparkles | wish shimmer |
| 6 | 0:19–0:23 | The Million Dollars | pull wide | falling bills + coins, glints, gold grade | coins, cash flutter, "happy" music |
| 7 | 0:23–0:27 | The Price | push to TV | scanlines, roll bar, RGB jitter, glitch-in | news beeps, broadcast babble, static, sting |
| 8 | 0:27–0:31 | The Second Wish | drift | warm grade, bokeh | wish shimmer, romantic pad |
| 9 | 0:31–0:35 | Love Comes True | pan left | warm grade, bokeh | romantic arpeggio |
| 10 | 0:35–0:39 | Another Price | slow push | cold hospital grade, monitor pulse, flatline fade | heart monitor beeps → flatline |
| 11 | 0:39–0:43 | The Final Wish | push | candle on the statue side, red dark glow, heartbeat zoom pulse | heartbeat, intense pulse |
| 12 | 0:43–0:47 | The Twist | push → snap zoom onto corpse | **undead reveal**: dread build, white flash, RGB split, green rot grade, shake, fog | riser → impact + glitch + shock sting |
| 13 | 0:47–0:56 | The Realization | pan Henry → corpse | rot grade, fog, shadow, shake, red glow | scream, rumble, intense music |
| 14 | 0:56–0:59 | Crypt Keeper Outro | push | candle flicker, fog | creepy laugh |
| 15 | 0:59–1:00 | The End | pull | lightning double-flash, fog | thunder, bell toll |

Transitions: fade, zoom-through, dip to black, white flash, glitch (all editable per panel).

### Character continuity

The panels are your storyboard art, cropped and never regenerated or redrawn. So Henry, the woman,
the monkey statue and the Crypt Keeper stay exactly as drawn. Panels are never mirrored, so screen
direction is preserved: Henry stays left and the corpse stays right in 12–13. All panels share one grade
pipeline (grain, halftone, vignette), so the look stays consistent from shot to shot. Colour shifts come
only from story beats: warm for love, cold for the hospital, green for the rot.

## How the motion works

- **Camera**: per-panel Ken Burns zoom with a moving focus point (e.g. panel 3 drifts onto the statue,
  panel 13 pans from Henry to the corpse). A subtle handheld wobble is always on, plus shake for impacts.
- **Parallax**: three depths. A blurred backdrop moves at about 30% and counter to the pan, the panel
  plate moves fully, and a radially masked **subject depth layer** scales slightly faster (a 2.5D pop).
  Fog, rain, embers, bokeh and money fly in front at their own speeds.
- **Candle**: deterministic flicker drives a moving light pool, so the shadows around it breathe and shift.
- Everything is computed from `t`, so a frame at 0:44.5 always looks the same.

## Editing

- **Storyboard tab**: drag crop boxes, change timings/camera/transition/FX per panel.
- **Script tab**: paste a new narration. Supported formats: `**0:00–0:07 — Heading**` + lines,
  `[0:00-0:07] text`, `0:00 - 0:07 | text`, `NARRATOR:` / character labels (CAMERA:/FX:/SFX: lines are ignored).
- **Audio tab**: voice-over file (music ducks under it), free browser TTS, a custom music bed, levels.
- **Look tab**: subtitles, captions, title, watermark, depth layer, band height, fog, grain, halftone, shake.
- **Export tab**: record a video file, or download `project.js` (bundles everything for OBS).

FX keywords for the per-panel FX field:
`candle fog title laugh rain shadow dust chime shop lowboom gold wish money coins tv news sting warm bokeh
cold beep flatline darkglow heartbeat undead undead-grade scream shake lightning thunder end`

Keyboard: Space play/pause · ←/→ ±1 s · Home restart · F fullscreen · R clean record mode.

## Files

```
index.html            UI + stage
css/style.css
js/project-default.js panels (crop boxes, timing, camera, FX), narration script, settings
js/parser.js          narration → sections → per-word timings → subtitle chunks
js/storyboard.js      image loading, panel cropping, crop editor
js/placeholders.js    SVG stand-in panels (used until the storyboard is added)
js/renderer.js        canvas renderer: camera, parallax, effects, transitions, subtitles
js/audio.js           Web Audio score + synthesized SFX, voice/music files, scheduling
js/app.js             transport, UI, TTS, export, OBS record mode
assets/               put storyboard.png / voice.mp3 / project.js here
```
