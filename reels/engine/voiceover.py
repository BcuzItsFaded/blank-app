"""Kokoro TTS narration placed on the reel timeline, read from a reel's story.json ("vo": [[start, end, text], ...]).
Usage: python voiceover.py <story.json> <kokoro.onnx> <voices.bin> out.wav [voice] [speed]
Each line starts at its scene cue; prints duration vs. available window."""
import sys, json
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

SR_OUT = 48000


def main():
    story, model, voices, out = sys.argv[1:5]
    cfg = json.load(open(story))
    LINES = cfg['vo']
    voice = sys.argv[5] if len(sys.argv) > 5 else cfg.get('voice', 'am_michael')
    speed = float(sys.argv[6]) if len(sys.argv) > 6 else 1.0
    dur_total = cfg.get('duration', 60)
    k = Kokoro(model, voices)
    track = np.zeros(int(dur_total * SR_OUT), dtype=np.float32)
    timing = []
    for start, end, text in LINES:
        sp = speed
        for _ in range(6):  # speed up slightly if a line overruns its window
            audio, sr = k.create(text, voice=voice, speed=sp, lang="en-us")
            dur = len(audio) / sr
            if start + dur <= end or sp >= 1.15:
                break
            sp += 0.05
        x = np.interp(np.arange(0, len(audio), sr / SR_OUT), np.arange(len(audio)), audio).astype(np.float32)
        i = int(start * SR_OUT)
        track[i:i + len(x)] += x[: len(track) - i]
        timing.append([start, round(dur, 3), text])
        print(f"{start:5.1f}-{end:5.1f}  dur {dur:4.2f}s  speed {sp:.2f}  {'OK' if start + dur <= end else 'OVER'}")
    track *= 0.95 / np.max(np.abs(track))
    sf.write(out, track, SR_OUT)
    json.dump(timing, open(out.rsplit('.', 1)[0] + '_timing.json', 'w'), indent=1)


if __name__ == "__main__":
    main()
