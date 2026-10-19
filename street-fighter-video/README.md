# Street Fighter (2026) ending explained: YouTube Short

`street_fighter_2026_ending_explained.mp4` is a 92 s, 1080x1920 Short covering the
film's twist and mid-credits scene. Every asset is generated here: Kokoro TTS
narration, synthesized music/SFX, and procedurally drawn graphics (no film footage).

Rebuild, in order (`narration.py` and `audio.py` need `kokoro-onnx`, `soundfile`, `scipy`):

1. `python narration.py <kokoro_models_dir> build`: narration.wav + timing.json
2. Optional: transcribe build/narration.wav with Whisper into build/asr.json (word timestamps that sharpen caption sync)
3. `python audio.py`: music.wav + sfx.wav cued to the narration
4. `python render.py stills 2.5 33`: preview frames; `python render.py`: full render + mix
