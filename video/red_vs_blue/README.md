# RG Brick&StickVerse — Red vs Blue short battle (vertical 1080×1920, 30 fps, ~38 s)

Fan-made stickman parody short. Uses the Alien 3 project's animation library (`../ep3_alien3/anim/lib.js`, vertical copy here)
and the Kokoro voice setup from `../ep3_alien3/tts.py`.

1. `python3 tts.py` — narration + `timings.json` (needs the Kokoro model files in `../voices/`, see ep3_alien3 README)
2. `node render.js stills 1.0,5.0,...` — preview frames; `node render.js video <startFrame> <endFrame> <out.mp4>` — render a chunk (run 4 in parallel: 0-284, 284-568, 568-852, 852-1134)
3. `python3 sfx_poke.py` — original chiptune beat + sound effects + narration mix (reuses `../ep3_alien3/sfx.py`'s sound library; copy it to the parent folder as `sfx.py`)
4. Concatenate chunks with ffmpeg and mux `audio.wav`
