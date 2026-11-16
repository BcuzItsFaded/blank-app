#!/bin/sh
# Reproducible build for "La Mano Peluda" (Episode 18, paper-cut lightbox).
# Requires: the Lemo-Opuscar library at $LIB with its Python venv, and ffmpeg >= 7
# on PATH (this project used ffmpeg 9 from the imageio-ffmpeg wheel).
set -e
LIB="${LIB:-/root/lemo-opuscar}"
H="$(cd "$(dirname "$0")" && pwd)"
PY="$LIB/.venv/bin/python"

# 0) fonts (once) and narration (needs edge-tts; see tts/edge_ml.py).
#    Voices are committed under voices/, so this step is optional for a rebuild:
# node "$H/fetch_fonts.mjs"
# "$PY" "$H/tts/edge_ml.py" "$H/tts/lines_ml.json" "$H/voices" en-GB-RyanNeural

# 1) render the silent film (1080x1920, 30 fps)
node "$LIB/core/render/video.mjs" "$H" --fps 30 --workers 4 --size 1080x1920 --out "$H/out/silent.mp4"

# 2) build the audio mix (narration + score + foley) -> out/mix.wav
"$PY" "$H/mix.py"

# 3) mux + loudnorm to -14 LUFS
sh "$LIB/core/render/mux.sh" "$H/out/silent.mp4" "$H/out/mix.wav" "$H/out/mano-peluda_raw.mp4" 30 0

# 4) re-encode to a compact deliverable
ffmpeg -y -i "$H/out/mano-peluda_raw.mp4" -c:v libx264 -crf 23 -preset medium \
  -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "$H/out/mano-peluda.mp4"

echo "built: $H/out/mano-peluda.mp4"
