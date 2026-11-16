#!/bin/sh
# Needs ffmpeg 7+ on PATH. Voice lines come from ../la-planchada/voices (same script and timings).
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
[ -d "$HERE/fonts" ] || (cd "$HERE" && node fetch_fonts.mjs)
mkdir -p "$HERE/out"
.venv/bin/python "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 30 --workers 4 --size 1080x1920 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/la-planchada-scratch.mp4" 30 0
