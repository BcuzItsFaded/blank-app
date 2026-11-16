# La Llorona: 60-second YouTube Short, Plot Twist with A&R

This is a code-drawn cel animation in the same engine as the Godzilla and Island of the Dolls Shorts: 1080×1920, 30 fps, 60 s, 8 segments.
It tells the **most-told folk version** of La Llorona: María, the betrayal, the river, the white dress,
"¡Ay, mis hijos!", and "if her cry sounds far, she is close". The twist comes from the historical record:
**Florentine Codex, Book 12** (Sahagún, 1500s) lists, among the omens before the Spanish arrival, a woman heard weeping
at night for her children. Scholars link her to the goddess Cihuacōātl and see her as a forerunner of La Llorona.

- **On-screen labels:** LEGEND, MOST-TOLD VERSION, FOLK BELIEF, HISTORICAL RECORD.
- **The children:** their fate is told in the narration and never shown. Scene 4 cuts to the river and fades to black.
- **Voices:** free Piper TTS. The wife uses `en_US-lessac-high` and you use `en_US-ryan-high`. Swap in real takes via `public/audio/vo/scene-XX-L.wav`.
- **Music and sound:** an original nylon-guitar-style A-minor score, plus synthesized river, wail, storm, hooves and bell SFX. Mastered to −14 LUFS / −1.5 dBTP.

```bash
npm ci
npm run audio    # pip install piper-tts numpy scipy pyloudnorm; Piper models in voices/
npm run studio
npm run render   # -> out/la-llorona-short.mp4 (resumable)
```
