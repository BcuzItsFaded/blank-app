#!/bin/sh
# Rebuild "Tenet, in a colored-pencil cutaway" (Colored-Pencil Science Illustration).
# Needs the Lemo-Opuscar library ($LIB, with its node_modules and .venv) and ffmpeg >= 7 on PATH.
set -e
LIB="${LIB:-/root/lemo-opuscar}"; export LIB; H="$(cd "$(dirname "$0")" && pwd)"; PY="$LIB/.venv/bin/python"
mkdir -p "$H/out"
# narration: voice/lines.json -> out/voice/ (uncomment to regenerate)
# "$PY" "$LIB/core/tts/tts.py" "$H/voice/lines.json" "$H/out/voice"
"$PY" "$H/mix.py"
cd "$LIB" && node core/render/video.mjs "$H" --fps 24 --workers 4 --size 1920x1080 --out "$H/out/silent.mp4"
sh "$LIB/core/render/mux.sh" "$H/out/silent.mp4" "$H/out/mix.wav" "$H/out/raw.mp4" 24 0
ffmpeg -y -i "$H/out/raw.mp4" -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "$H/out/tenet-pencil.mp4"
