# Aliens (1986) — "The Colony That Never Came Home" (Episode 2)

A 91.5 s, 1920x1080, 60 fps flat-vector recap. All art is drawn in code on one canvas
(`film/`), so every frame is a pure function of time.

Pipeline (run from a working folder holding `script.txt`):
1. `tools/voice.py` — Kokoro (ONNX, voice `am_michael`), pauses >0.24 s cut to 0.16 s; then `atempo=1.0907` to 89 s.
2. `tools/words.py` — faster-whisper word timestamps → `words.json` (`film/words.js`).
3. `film/index.html` — `seek(t)`, `seekBlur(t, n, span)`, `collect()` (sound events), `READY`.
4. `tools/render.js ev 0 0 ev.json`, then `tools/render.js frames <f0> <f1> out.mp4` (6 motion-blur subframes over half a frame, x264 CRF 16).
5. `tools/audio.py` — synthesized music bed 10.5 dB under the voice, Mixkit SFX placed by their peaks, then loudnorm + limiter to -14 LUFS.
6. `tools/jumps.py` — scans the render for single-frame jumps to check against planned cuts.
