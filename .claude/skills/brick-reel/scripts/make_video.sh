#!/usr/bin/env bash
# Render all frames with 3 parallel workers, then encode with audio. Run it in the BACKGROUND and wait for the completion notice.
# Usage: make_video.sh <reel_dir> <page.html> <audio.wav> <out.mp4> [seconds=30] [work_dir]
# Needs: node + playwright (preinstalled) and three@0.149.0 (npm i three@0.149.0 in $WORK/deps).
set -euo pipefail
REEL=$(cd "$1" && pwd); PAGE=$REEL/$2; AUDIO=$(realpath "$3"); OUT=$(realpath -m "$4"); SECS=${5:-30}; WORK=${6:-/tmp/brick_render}
ENG=$(cd "$(dirname "$0")/../../../../reels/engine" && pwd); FRAMES=$WORK/frames; N=$((SECS*30)); PER=$((N/3))
mkdir -p "$WORK/deps" "$FRAMES"; [ -d "$WORK/deps/node_modules/three" ] || (cd "$WORK/deps" && npm init -y >/dev/null && npm i three@0.149.0 >/dev/null)
export THREE_PATH=$WORK/deps/node_modules/three/build/three.min.js; rm -f "$FRAMES"/f_*.jpg; cd "$WORK/deps"
for i in 0 1 2; do node "$ENG/render.js" "$PAGE" "$FRAMES" --from $((i*PER)) --to $(((i+1)*PER)) > "$WORK/r$i.log" 2>&1 & done; wait
[ "$(ls "$FRAMES" | wc -l)" -ge "$N" ] || { echo "only $(ls "$FRAMES" | wc -l)/$N frames"; exit 1; }
ffmpeg -loglevel error -y -framerate 30 -i "$FRAMES/f_%05d.jpg" -i "$AUDIO" -vf "scale=1080:1920:flags=lanczos" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p -c:a aac -b:a 192k -movflags +faststart -shortest "$OUT"
ls -lh "$OUT"
