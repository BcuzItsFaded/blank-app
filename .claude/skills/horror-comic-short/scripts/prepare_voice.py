#!/usr/bin/env python3
"""Turn a raw narration recording into a timed voice track for an episode.

    python3 prepare_voice.py <episodeDir> <recording.(m4a|mp3|wav|ogg|…)> [--deepen 0.9] [--reverb] [--no-denoise]

The speaker reads the script's sections in order, pausing briefly between them. The script:
  1. cleans the audio (high-pass, light denoise) and finds the speech with an energy detector;
  2. splits it into one chunk per script section at the longest pauses
     (falls back to splitting by word count if the pauses are unclear);
  3. places each chunk at its section's start time and speeds it up (max 1.35x) if it's longer
     than its slot; otherwise later sections are pushed back so nothing overlaps;
  4. optionally lowers the pitch (--deepen 0.88 ≈ two semitones, "crypt keeper") and adds reverb;
  5. loudness-normalizes to -16 LUFS and writes assets/voice-final.wav;
  6. appends the real speech timings to assets/project.js, so the subtitles follow the actual delivery.
"""
import argparse, json, os, re, subprocess, sys, tempfile
import numpy as np

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("episode"); ap.add_argument("recording")
ap.add_argument("--deepen", type=float, default=0, help="pitch ratio, e.g. 0.9 (0 = off)")
ap.add_argument("--reverb", action="store_true")
ap.add_argument("--creepy", action="store_true", help="preset: deeper pitch, faint sub-octave growl, crypt reverb")
ap.add_argument("--no-denoise", action="store_true")
ap.add_argument("--max-tempo", type=float, default=1.35)
a = ap.parse_args()
if a.creepy:
    a.deepen = a.deepen or 0.86
    a.reverb = True

proj_path = os.path.join(a.episode, "assets", "project.js")
proj = open(proj_path, encoding="utf-8").read()

# ---- sections from the script (same time-range syntax as the player)
T = r"(\d{1,2}:\d{2}(?:[.,]\d+)?)"
def sec(s):
    s = s.replace(",", ".")
    m, x = s.split(":"); return int(m) * 60 + float(x)
m = re.search(r'"?script"?\s*:\s*(`|")((?:\\.|(?!\1).)*)\1', proj, re.S)
if not m:
    sys.exit("no script found in project.js")
script = json.loads('"' + m.group(2) + '"') if m.group(1) == '"' else m.group(2)
sections, cur = [], None
for line in script.splitlines():
    r = re.search(T + r"\s*(?:-|–|—|to|→)\s*" + T, line)
    if r:
        cur = {"start": sec(r.group(1)), "end": sec(r.group(2)), "text": ""}; sections.append(cur)
    elif cur and line.strip():
        cur["text"] += " " + re.sub(r"^[A-Z][A-Z .'()\-]{1,30}:\s*", "", line.strip())
if not sections:
    sys.exit("script has no time ranges")
N = len(sections)
words = [max(1, len(s["text"].split())) for s in sections]

# ---- decode + clean
def ff(args, inp=None):
    return subprocess.run(["ffmpeg", "-v", "error", "-y", *args], input=inp, capture_output=True, check=True).stdout
clean = "highpass=f=80,lowpass=f=12000" + ("" if a.no_denoise else ",afftdn=nf=-25")
x = np.frombuffer(ff(["-i", a.recording, "-af", clean, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]), dtype=np.float32).copy()
if len(x) < SR:
    sys.exit("recording is shorter than 1 second")

# ---- voice activity (20 ms frames, adaptive threshold)
hop = SR // 50
frames = len(x) // hop
rms = np.sqrt(np.mean(x[: frames * hop].reshape(frames, hop) ** 2, axis=1) + 1e-12)
db = 20 * np.log10(rms)
floor, peak = np.percentile(db, 10), np.percentile(db, 98)
thr = max(floor + 0.35 * (peak - floor), floor + 8)
on = db > thr
def runs(mask):
    out, s = [], None
    for i, v in enumerate(mask):
        if v and s is None: s = i
        if not v and s is not None: out.append([s, i]); s = None
    if s is not None: out.append([s, len(mask)])
    return out
iv = runs(on)
merged = []  # close gaps < 0.18 s (inside words), drop blips < 0.08 s
for s, e in iv:
    if merged and (s - merged[-1][1]) * 0.02 < 0.18: merged[-1][1] = e
    else: merged.append([s, e])
iv = [[s * 0.02, e * 0.02] for s, e in merged if (e - s) * 0.02 >= 0.08]
if not iv:
    sys.exit("no speech detected; check the recording")

# ---- one chunk per section
gaps = sorted(range(len(iv) - 1), key=lambda i: iv[i + 1][0] - iv[i][1], reverse=True)[: N - 1]
if len(iv) >= N and gaps and min(iv[i + 1][0] - iv[i][1] for i in gaps) >= 0.35:
    cuts = sorted(gaps)
    groups, s = [], 0
    for c in cuts: groups.append([iv[s][0], iv[c][1]]); s = c + 1
    groups.append([iv[s][0], iv[-1][1]])
    how = "pauses"
else:  # unclear pauses: split the speech span by word count
    t0, t1 = iv[0][0], iv[-1][1]
    acc, groups = t0, []
    for w in words:
        d = (t1 - t0) * w / sum(words); groups.append([acc, acc + d]); acc += d
    how = "word count (pauses between sections weren't clear)"

# ---- place chunks on the timeline
pieces, speech, cursor = [], [], 0.0
tmp = tempfile.mkdtemp()
for k, ((gs, ge), S) in enumerate(zip(groups, sections)):
    seg = x[max(0, int((gs - 0.06) * SR)): int((ge + 0.12) * SR)]
    dur = len(seg) / SR
    start = max(S["start"] + 0.1, cursor + 0.12)
    avail = S["end"] - start - 0.2
    tempo = min(a.max_tempo, dur / avail) if avail > 0 and dur > avail else 1.0
    if tempo > 1.001:
        p = os.path.join(tmp, f"s{k}.f32")
        seg.tofile(p)
        seg = np.frombuffer(ff(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", p, "-af", f"atempo={tempo:.4f}", "-f", "f32le", "-"]), dtype=np.float32)
        dur = len(seg) / SR
    pieces.append((start, seg)); speech.append([round(start + 0.06, 3), round(start + dur - 0.1, 3)])
    cursor = start + dur
    flag = "  ⚠ runs past its slot" if start + dur > S["end"] + 0.05 else ""
    print(f"section {k + 1}: slot {S['start']:5.2f}-{S['end']:5.2f}  voice {start:5.2f}-{start + dur:5.2f}  speed x{tempo:.2f}{flag}")

total = max(sections[-1]["end"], cursor + 0.3)
track = np.zeros(int(total * SR) + SR // 10, dtype=np.float32)
for start, seg in pieces:
    i = int(start * SR); track[i: i + len(seg)] += seg

# ---- color + loudness → assets/voice-final.wav
raw = os.path.join(tmp, "track.f32"); track.tofile(raw)
fx = []
if a.deepen: fx.append(f"rubberband=pitch={a.deepen}:formant=preserved")
fx.append("acompressor=threshold=-20dB:ratio=3:attack=5:release=120")
if a.creepy:  # faint sub-octave double underneath = menacing growl
    fx.append("asplit[d][s];[s]rubberband=pitch=0.5:formant=shifted,lowpass=f=900,volume=0.22[g];[d]equalizer=f=180:t=q:w=1:g=3[d2];[d2][g]amix=inputs=2:normalize=0")
if a.reverb: fx.append("aecho=0.8:0.55:45|90|160:0.22|0.12|0.07")
fx.append("loudnorm=I=-16:TP=-1.5:LRA=11")
out = os.path.join(a.episode, "assets", "voice-final.wav")
ff(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", raw, "-filter_complex", ",".join(fx), "-ar", str(SR), "-ac", "2", out])

# ---- timings into project.js
block = ("/* speech-timing (prepare_voice.py) */\n"
         f"window.WISH_PROJECT.voice = \"assets/voice-final.wav\";\nwindow.WISH_PROJECT.voiceOffset = 0;\n"
         f"window.WISH_PROJECT.speech = {speech};\n/* end speech-timing */\n")
proj = re.sub(r"/\* speech-timing.*?/\* end speech-timing \*/\n?", "", proj, flags=re.S).rstrip() + "\n" + block
open(proj_path, "w", encoding="utf-8").write(proj)
print(f"split by {how}; wrote {out} ({total:.1f}s) and speech timings to project.js")
if cursor > sections[-1]["end"] + 0.05:
    print(f"⚠ narration ends at {cursor:.1f}s, after the video's {sections[-1]['end']:.0f}s; ask for a slightly faster read or extend the last panel")
