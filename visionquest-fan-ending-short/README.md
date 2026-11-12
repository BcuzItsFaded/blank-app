# VisionQuest: fan-made post-credits Short, "Doctor Doom saves the Scarlet Witch" (Don't Spoil It RG)

This is a **fan-made** 60-second, 9:16 Short: 12 scenes of 5 s each, 1080×1920, 30 fps. It is **not a scene from VisionQuest**.
A permanent on-screen chip reads "FAN-MADE · NOT IN THE SHOW", and every scene carries a label:

- **CANON / CANON SETTING:** Wundagore, and Wanda bringing the mountain down in *Doctor Strange in the Multiverse of Madness* (2022).
- **FAN-MADE:** everything else, including all dialogue.
- **Release date:** *Avengers: Doomsday* (Doctor Doom's MCU debut), Dec 18, 2026.

Wanda, Doctor Doom and Vision are original cel drawings, not actor likenesses or official designs.
The score and SFX are original and synthesized in code. The voices are free local Piper TTS:
- **Narrator:** `en_US-ryan-high`.
- **Wanda:** `en_US-lessac-high`.
- **Doom:** ryan, pitched down with a metal-mask resonance.

```bash
npm ci
npm run audio     # needs: pip install piper-tts numpy scipy pyloudnorm, Piper models in voices/
npm run studio
npm run render    # -> out/visionquest-fan-ending-short.mp4 (resumable)
```

Edit the script, speakers and labels in `src/scenes.json`, and the scenes in `src/cel/celScenes.tsx`.
