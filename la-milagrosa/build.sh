#!/bin/sh
# Rebuild "The Tomb in Havana" (paper-cut lightbox). Needs the Lemo-Opuscar library at $LIB and ffmpeg >= 7.
set -e
LIB="${LIB:-/root/lemo-opuscar}"; export LIB; H="$(cd "$(dirname "$0")" && pwd)"; PY="$LIB/.venv/bin/python"; cd "$LIB"
# narration (voices/ is committed; uncomment to regenerate):
# "$PY" core/tts/tts.py "$H/tts/lines.json" "$H/voices"
mkdir -p "$H/out"
"$PY" "$H/mix.py"
node core/render/video.mjs "$H" --fps 30 --workers 4 --size 1080x1920 --out "$H/out/silent.mp4"
sh core/render/mux.sh "$H/out/silent.mp4" "$H/out/mix.wav" "$H/out/raw.mp4" 30 0
ffmpeg -y -i "$H/out/raw.mp4" -c:v libx264 -crf 23 -preset medium -pix_fmt yuv420p -movflags +faststart -c:a aac -b:a 192k "$H/out/la-milagrosa.mp4"
