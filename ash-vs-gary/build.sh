#!/bin/sh
# Needs ffmpeg 7+ on PATH.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
.venv/bin/python core/tts/tts.py "$HERE/tts/lines.json" "$HERE/voices"
[ -d "$HERE/fonts" ] || (cd "$HERE" && node fetch_fonts.mjs)
mkdir -p "$HERE/out"
node core/render/events.mjs "$HERE" --out "$HERE/out/events.json" --size 1080x1920
.venv/bin/python "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 30 --workers 3 --size 1080x1920 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/ash-vs-gary-ep1.mp4" 30 1
