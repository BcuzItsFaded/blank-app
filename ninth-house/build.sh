#!/bin/sh
# Build "The Ninth House". Needs ffmpeg 7+ on PATH.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
LIB=${LIB:-/root/lemo-opuscar}
export LIB
[ -f "$LIB/core/render/video.mjs" ] || { echo "set LIB to the library folder"; exit 1; }
cd "$LIB"
.venv/bin/python core/tts/tts.py "$HERE/tts/lines.json" "$HERE/voices"   # narration (bm_george)
[ -f "$HERE/paper.jpg" ] || (cd "$HERE" && "$LIB/.venv/bin/python" paper.py)
[ -d "$HERE/fonts" ] || (cd "$HERE" && node fetch_fonts.mjs)
.venv/bin/python "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 24 --workers 3 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/ninth-house.mp4" 24 1
