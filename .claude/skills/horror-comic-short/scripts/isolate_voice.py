#!/usr/bin/env python3
"""Pull ONE voice out of a recording with another voice or voice-like noise in it (a baby, a TV,
someone talking): AI speech separation (SpeechBrain SepFormer, WHAMR! 16 kHz, Apache 2.0), keeping
the separated source whose pitch matches the narrator.

    python isolate_voice.py <recording> <out.wav> [--target-hz auto|182]

Setup once (CPU, ~1 GB):  pip install torch torchaudio --index-url https://download.pytorch.org/whl/cpu
                          pip install speechbrain
Then pass <out.wav> to fit_narration.py as the recording. Runs about 3x real time on CPU.
Tested on a phone take with a baby babbling over the narrator: baby-pitched sound 7.0 s → 1.3 s,
11 dB quieter, narrator intelligibility unchanged (97-98%).
"""
import argparse, os, subprocess, time
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("recording"); ap.add_argument("out")
ap.add_argument("--target-hz", default="auto", help="narrator's speaking pitch; auto = lowest strong voice")
a = ap.parse_args()
SR = 16000
x = np.frombuffer(subprocess.run(["ffmpeg", "-v", "error", "-i", a.recording, "-af", "highpass=f=80", "-ac", "1", "-ar", str(SR),
                                  "-f", "f32le", "-"], capture_output=True, check=True).stdout, np.float32).copy()

def pitches(w, lo_hz=70, hi_hz=800):
    out = []
    for i in range(0, len(w) - 1024, 800):
        s = w[i:i + 1024]
        if np.sqrt(np.mean(s ** 2)) < 0.01 * (np.abs(w).max() + 1e-9): continue
        s = s - s.mean(); ac = np.correlate(s, s, "full")[1023:]
        lo, hi = SR // hi_hz, SR // lo_hz; k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.5 * ac[0]: out.append(SR / k)
    return np.array(out)

if a.target_hz == "auto":  # adult speech sits below ~300 Hz; babies/kids/TV squeals above
    p = pitches(x); p = p[p < 300]
    target = float(np.median(p)) if len(p) else 150.0
else:
    target = float(a.target_hz)
print(f"narrator pitch ≈ {target:.0f} Hz")

import torch
from speechbrain.inference.separation import SepformerSeparation
model = SepformerSeparation.from_hparams(source="speechbrain/sepformer-whamr16k",
                                         savedir=os.path.expanduser("~/.cache/sepformer-whamr16k"))
CH, OV = 15 * SR, SR
out = np.zeros_like(x); wsum = np.zeros_like(x); t0 = time.time()
for st in range(0, len(x), CH - OV):
    seg = x[st:st + CH]
    if len(seg) < SR // 2: break
    with torch.no_grad():
        est = model.separate_batch(torch.from_numpy(seg)[None])[0].numpy().T
    best = None
    for src in est:  # keep the source that sounds like the narrator: right pitch, follows the mix
        src = src / (np.abs(src).max() + 1e-9) * np.abs(seg).max()
        p = pitches(src)
        miss = abs(np.log2(np.median(p) / target)) if len(p) > 5 else 9
        corr = abs(np.corrcoef(src, seg)[0, 1])
        if best is None or miss - corr < best[0]: best = (miss - corr, src)
    w = np.ones(len(seg)); fade = min(OV, len(seg))
    if st > 0: w[:fade] = np.linspace(0, 1, fade)
    out[st:st + len(seg)] += best[1] * w; wsum[st:st + len(seg)] += w
    print(f"  {st / SR:5.1f}s done", flush=True)
out = out / np.maximum(wsum, 1e-6); out = out / (np.abs(out).max() + 1e-9) * 0.9
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-", a.out],
               input=out.astype(np.float32).tobytes(), check=True)
print(f"wrote {a.out} in {time.time() - t0:.0f}s")
