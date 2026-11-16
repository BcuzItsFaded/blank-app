#!/bin/sh
# Needs ffmpeg 7+ on PATH.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
.venv/bin/python core/tts/tts.py "$HERE/tts/lines.json" "$HERE/voices"
[ -f "$HERE/fonts/fonts.css" ] && ls "$HERE"/fonts/*.woff2 >/dev/null 2>&1 || (cd "$HERE" && node fetch_fonts.mjs)
mkdir -p "$HERE/out"
.venv/bin/python "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 4 --size 1080x1920 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/la-planchada.mp4" 24 3
