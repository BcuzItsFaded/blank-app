# The Island of the Dolls: 60-second YouTube Short, Plot Twist with A&R

This is an editable Remotion project for a 1080×1920, 30 fps, 60 s H.264 Short. It is built from the
hosts' script, used verbatim, and their 8-panel storyboard (`source/storyboard.png`).

## Timeline (script verbatim)

| Time | Voice | Panel | On-screen status label |
|---|---|---|---|
| 0:00–0:07 | Wife, then You | Island at dusk + hosts' logo | REAL PLACE |
| 0:07–0:15 | Wife | Julián paddling to the island | DOCUMENTED |
| 0:15–0:23 | You | Julián at the cross | LOCAL LEGEND |
| 0:23–0:30 | Wife | Hanging the first doll | DOCUMENTED |
| 0:30–0:38 | You | Trees full of dolls | DOCUMENTED |
| 0:38–0:45 | Wife | Visitors photographing | CLAIMS ONLY |
| 0:45–0:52 | You | The hut, lantern dimming | DOCUMENTED (cause of death disputed) |
| 0:52–1:00 | Wife | The island, swinging doll | THE TWIST |

Except for the opening hook ("Wife" / "You"), the script doesn't say who reads each line, so the
narration alternates between the two hosts. Change `speaker` per line in `src/scenes.json`.

## What's in the video

- **Art:** the 8 storyboard panels, each upscaled to a 2000 px-tall plate (`public/keyframes/scene_XX.jpg`).
- **Camera:** each scene has timed focus points and zoom.
- **Parallax:** mist, fireflies, falling leaves, rain and floating dust drift in front of the painting.
- **2.5D motion cut from the paintings:**
  - hung dolls sway on their ropes
  - the lantern and hut windows flicker
  - paddle ripples spread
  - light glints move across the canal
  - the cross glows and its reflection ripples
  - glints appear on the big doll's eyes on "staring eyes"
  - the tourists' camera flashes fire and the phone screen glows
  - the lantern dims after "Julián died"
- **Transitions:** dissolves between scenes, then a white-flash punch-in with a colour split on "the real twist".
- **Captions:** word-highlighted, at most two lines, kept clear of the Shorts UI. The active word is pink for the wife and blue for you.
- **Brand:** your Plot Twist with A&R logo appears small in the upper left from 0:07 on. Scene 1's painting already carries it.

## Audio (all original or free, nothing copyrighted)

- **Voices:** free local Piper TTS. The wife uses `en_US-lessac-high` and you use `en_US-ryan-high`. These are scratch voices.
  To use your real voices, record `public/audio/vo/scene-XX-L.wav`, where XX is the scene and L is the line (1, 2, …), then run `npm run audio`.
- **Score:** an original broken music box that runs down toward the twist and plays a few detuned notes after it,
  over a low drone. It ducks about 10 dB under the voices.
- **SFX:**
  - crickets, frogs and water bed
  - paddle splashes and canoe creak
  - distant wordless hum on the legend
  - rope creaks
  - rain and far thunder
  - eye sting, camera shutters and phone click
  - whispers
  - funeral bell
  - twist hit and final creak

## Commands

```bash
npm ci
npm run studio     # live editor
npm run audio      # rebuild voices/score/SFX + caption timings (needs: pip install piper-tts numpy scipy, voices/ models)
npm run render     # -> out/island-of-the-dolls-short.mp4 (resumable, 30 unique fps)
```

Piper voice models, which go in `voices/`:
`https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0/en/en_US/lessac/high/en_US-lessac-high.onnx` (+ `.onnx.json`)
and `…/en_US/ryan/high/en_US-ryan-high.onnx` (+ `.onnx.json`).
