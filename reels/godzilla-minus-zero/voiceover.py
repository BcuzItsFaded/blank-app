"""Kokoro TTS narration placed on the reel timeline.
Usage: python voiceover.py <kokoro.onnx> <voices.bin> out.wav [voice] [speed]
Each line starts at its scene cue; prints duration vs. available window."""
import sys, json
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

LINES = [  # (start_sec, window_end_sec, text)
    (0.3, 7.1, "Japan survived World War Two. But in Godzilla Minus One, it nearly lost everything again."),
    (7.2, 14.3, "Two years later, Koichi and Noriko are rebuilding something they thought impossible: a peaceful family life."),
    (14.4, 21.1, "But the last battle left one terrifying clue. A piece of Godzilla's body was still regenerating."),
    (21.2, 29.0, "And remember that strange mark on Noriko's neck? A doctor's warning makes her miraculous survival even more disturbing."),
    (29.1, 36.4, "Scientists investigate. Japan plans a new extermination operation, because Godzilla may never have died."),
    (36.5, 43.8, "Then the nightmare returns. Godzilla towers over a nation that has barely finished rebuilding."),
    (44.4, 51.8, "His pale blue atomic breath cuts through the chaos, while little Akiko prays for a miracle."),
    (52.3, 59.4, "They defeated Godzilla once. But can they do it again? Because this time... there may be no third chance."),
]
SR_OUT = 48000


def main():
    model, voices, out = sys.argv[1:4]
    voice = sys.argv[4] if len(sys.argv) > 4 else "am_michael"
    speed = float(sys.argv[5]) if len(sys.argv) > 5 else 1.0
    k = Kokoro(model, voices)
    track = np.zeros(int(60 * SR_OUT), dtype=np.float32)
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
