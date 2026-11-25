#!/bin/sh
# Rebuild "La Mulata de Córdoba" (Urban Sketch · Pen & Wash): voz -> mezcla -> render -> mux a -14 LUFS.
set -e
LIB="${LIB:-/root/lemo-opuscar}"; export LIB; H="$(cd "$(dirname "$0")" && pwd)"; PY="$LIB/.venv/bin/python"
mkdir -p "$H/out"
# voz (necesita red): SSL_CERT_FILE=/root/.ccr/ca-bundle.crt "$PY" "$H/tts/edge_ml.py" "$H/tts/lines_ml.json" "$H/voices" es-MX-JorgeNeural
"$PY" "$H/mix.py"
cd "$LIB" && node core/render/video.mjs "$H" --fps 30 --workers 4 --size 1080x1920 --out "$H/out/silent.mp4"
sh "$LIB/core/render/mux.sh" "$H/out/silent.mp4" "$H/out/mix.wav" "$H/out/raw.mp4" 30 0
ffmpeg -y -i "$H/out/raw.mp4" -c:v libx264 -crf 22 -preset medium -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "$H/la-mulata-sketch.mp4"
