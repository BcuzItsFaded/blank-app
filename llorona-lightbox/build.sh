#!/bin/sh
# Needs ffmpeg 7+ on PATH.
set -e
HERE=$(cd "$(dirname "$0")" && pwd); LIB=${LIB:-/root/lemo-opuscar}; export LIB; cd "$LIB"
# Bilingual storyteller narration via Microsoft edge-tts multilingual voice (needs network).
SSL_CERT_FILE=/root/.ccr/ca-bundle.crt .venv/bin/python "$HERE/tts/edge_ml.py" "$HERE/tts/lines_ml.json" "$HERE/voices" en-US-AndrewMultilingualNeural
[ -d "$HERE/fonts" ] || (cd "$HERE" && node fetch_fonts.mjs)
mkdir -p "$HERE/out"
.venv/bin/python "$HERE/mix.py"
node core/render/video.mjs "$HERE" --fps 30 --workers 4 --size 1080x1920 --out "$HERE/out/video.mp4"
sh core/render/mux.sh "$HERE/out/video.mp4" "$HERE/out/mix.wav" "$HERE/llorona-lightbox.mp4" 30 0
