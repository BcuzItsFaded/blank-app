#!/usr/bin/env python3
"""Fit a real narration recording to an episode: the video follows the voice.

    python fit_narration.py <episodeDir> <recording> [--creepy | --clown | --deepen 0.9 --reverb] [--length 60]
                            [--max-tempo 1.2] [--model small.en] [--words words.json]

Needs: ffmpeg, numpy, and faster-whisper (pip install faster-whisper) unless --words is given.

1. Transcribes the recording locally with Whisper (word timestamps) and aligns it to the script, so
   retakes before/after and stray words ("thank you") are dropped and each section is found exactly.
2. Shortens long pauses inside each section (keeps natural breaths at punctuation).
3. Lays the sections end to end in --length seconds; speeds them up evenly (max --max-tempo, pitch kept)
   only if needed. If the read can't fit, the video gets longer instead of the voice getting chipmunky.
4. Re-times the script sections and the panels to the voice: panels keep their order and relative
   lengths inside each section, and an `end` panel always gets the last beat after the final word.
5. Writes assets/voice-final.wav plus `speech` and per-word `wordTimes` into assets/project.js,
   so subtitles highlight each word exactly as it is spoken.

assets/project.js must hold `window.WISH_PROJECT = { …JSON… };` with `panels` and `script`.
"""
import argparse, difflib, json, os, re, subprocess, sys, tempfile
import numpy as np

SR = 48000
ap = argparse.ArgumentParser()
ap.add_argument("episode"); ap.add_argument("recording")
ap.add_argument("--length", type=float, default=0, help="target video length (default: current length)")
ap.add_argument("--max-tempo", type=float, default=1.2)
ap.add_argument("--gap", type=float, default=0.5, help="silence between sections")
ap.add_argument("--end-hold", type=float, default=1.2, help="seconds after the last word (end card)")
ap.add_argument("--deepen", type=float, default=0); ap.add_argument("--reverb", action="store_true")
ap.add_argument("--creepy", action="store_true", help="deeper pitch, faint sub-octave growl, crypt reverb")
ap.add_argument("--clown", action="store_true", help="creepy clown: higher, nasal, warbling, demon double underneath, big-top echo")
ap.add_argument("--model", default="small.en"); ap.add_argument("--words", help="cached Whisper words JSON")
a = ap.parse_args()
if a.creepy:
    a.deepen = a.deepen or 0.88; a.reverb = True

# ---------------------------------------------------------------- project
pp = os.path.join(a.episode, "assets", "project.js")
src = open(pp, encoding="utf-8").read()
k = src.index("window.WISH_PROJECT"); k = src.index("{", k)
proj, _ = json.JSONDecoder().raw_decode(src[k:])
panels, script = proj["panels"], proj["script"]

T = r"(\d{1,2}:\d{2}(?:[.,]\d+)?)"
def sec(s):
    m, x = s.replace(",", ".").split(":"); return int(m) * 60 + float(x)
def fmt(t):
    return f"{int(t // 60)}:{t % 60:05.2f}"
LABEL = re.compile(r"^([A-Z][A-Z .'()\-]{1,30}):\s*(.*)$")
SKIP = re.compile(r"^(VISUAL|SHOT|IMAGE|CAMERA|FX|SFX|SOUND|MUSIC|AUDIO|NOTE|NOTES)\b")
def clean(s):
    return re.sub(r"^[\s:|\-–—.]+|[\s:|\-–—]+$", "", re.sub(r"\*\*|__|`|#+\s*", "", s)).strip()
sections = []
for line in script.splitlines():
    line = line.strip()
    if not line: continue
    m = re.search(T + r"\s*(?:-|–|—|to|→)\s*" + T, line)
    if m:
        sections.append({"A": sec(m.group(1)), "B": sec(m.group(2)), "heading": clean(line.replace(m.group(0), "")), "lines": []}); continue
    if not sections: continue
    body = clean(line); lab = LABEL.match(body)
    if lab:
        if SKIP.match(lab.group(1)): continue
        body = lab.group(2)
    if body: sections[-1]["lines"].append(body)
for s in sections:
    s["text"] = re.sub(r"\s+", " ", " ".join(s["lines"])).strip()
    s["words"] = s["text"].split()
N = len(sections)
length = a.length or max(p["end"] for p in panels)

# ---------------------------------------------------------------- audio + transcript
def ff(args, inp=None):
    return subprocess.run(["ffmpeg", "-v", "error", "-y", *args], input=inp, capture_output=True, check=True).stdout
x = np.frombuffer(ff(["-i", a.recording, "-af", "highpass=f=80,afftdn=nf=-30", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]), np.float32).copy()
if a.words:
    W = json.load(open(a.words))
else:
    from faster_whisper import WhisperModel
    a16 = x[::3].copy()  # 48 kHz → 16 kHz (afftdn+highpass already band-limit enough for ASR)
    model = WhisperModel(a.model, device="cpu", compute_type="int8")
    segs, _ = model.transcribe(a16, word_timestamps=True, initial_prompt=" ".join(s["text"] for s in sections)[:400])
    W = [{"w": w.word.strip(), "s": w.start, "e": w.end} for sg in segs for w in sg.words]
norm = lambda t: re.sub(r"[^a-z0-9']", "", t.lower().replace("’", "'"))

# align script words ↔ spoken words
script_tok = [(si, wi, norm(w)) for si, s in enumerate(sections) for wi, w in enumerate(s["words"])]
spoken_tok = [norm(w["w"]) for w in W]
sm = difflib.SequenceMatcher(None, [t[2] for t in script_tok], spoken_tok, autojunk=False)
match = {}  # script token index → spoken index
for blk in sm.get_matching_blocks():
    for d in range(blk.size): match[blk.a + d] = blk.b + d
cover = len(match) / max(1, len(script_tok))
print(f"transcript matches {cover:.0%} of the script ({len(W)} spoken words)")
if cover < 0.5:
    sys.exit("the recording doesn't follow the script closely enough; check that it's the right take")

# spoken span per section
spans = []
for si in range(N):
    idx = [match[i] for i, t in enumerate(script_tok) if t[0] == si and i in match]
    if not idx: sys.exit(f"section {si + 1} wasn't found in the recording")
    spans.append((min(idx), max(idx)))

# ---------------------------------------------------------------- cut long pauses
XF = int(0.015 * SR)
def cut_section(si):
    i0, i1 = spans[si]
    s0 = max(0.0, W[i0]["s"] - 0.12)
    nxt = W[spans[si + 1][0]]["s"] - 0.05 if si + 1 < N else len(x) / SR
    e0 = min(W[i1]["e"] + 0.3, nxt)
    removed = []  # (start, end) in recording time
    for i in range(i0, i1):
        g0, g1 = W[i]["e"], W[i + 1]["s"]
        keep = 0.34 if re.search(r"[.,!?;:…]$", W[i]["w"]) else 0.2
        if g1 - g0 > keep + 0.08:
            removed.append((g0 + keep / 2, g1 - keep / 2))
    pieces, t = [], s0
    for r0, r1 in removed + [(e0, e0)]:
        pieces.append(x[int(t * SR): int(r0 * SR)].copy()); t = r1
    out = pieces[0]
    for p in pieces[1:]:  # short crossfades hide the joins
        if len(out) > XF and len(p) > XF:
            fade = np.linspace(0, 1, XF, dtype=np.float32)
            out[-XF:] = out[-XF:] * (1 - fade) + p[:XF] * fade
            out = np.concatenate([out, p[XF:]])
        else:
            out = np.concatenate([out, p])
    def tmap(t):  # recording time → seconds from section audio start
        r = t - s0
        for r0, r1 in removed:
            if t >= r1: r -= r1 - r0
            elif t > r0: r -= t - r0
        return max(0.0, r)
    return out, tmap

cuts = [cut_section(si) for si in range(N)]
L = [len(c[0]) / SR for c in cuts]
fixed = 0.25 + (N - 1) * a.gap + a.end_hold
tempo = max(1.0, sum(L) / (length - fixed))
if tempo > a.max_tempo:
    tempo = a.max_tempo
    length = round(sum(L) / tempo + fixed + 0.05, 2)
    print(f"⚠ the read is long: speeding up x{tempo:.2f} and extending the video to {length:.1f}s")
extra = length - fixed - sum(L) / tempo
gap = a.gap + extra / N  # spread spare time evenly between sections (lead counts as one)

# ---------------------------------------------------------------- place on the timeline
tmp = tempfile.mkdtemp()
track = np.zeros(int(length * SR) + SR, np.float32)
t = 0.25 + extra / N
places, speech, wordTimes = [], [], []
for si, (seg, tmap) in enumerate(cuts):
    if tempo > 1.001:
        p = os.path.join(tmp, f"s{si}.f32"); seg.tofile(p)
        seg = np.frombuffer(ff(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", p, "-af", f"atempo={tempo:.4f}", "-f", "f32le", "-"]), np.float32)
    i = int(t * SR); track[i: i + len(seg)] += seg
    places.append(t)
    i0, i1 = spans[si]
    speech.append([round(t + tmap(W[i0]["s"]) / tempo, 3), round(t + tmap(W[i1]["e"]) / tempo, 3)])
    # per-word times for the script words of this section
    toks = [j for j, tk in enumerate(script_tok) if tk[0] == si]
    times = [None] * len(toks)
    for n, j in enumerate(toks):
        if j in match:
            w = W[match[j]]; times[n] = [t + tmap(w["s"]) / tempo, t + tmap(w["e"]) / tempo]
    known = [n for n, v in enumerate(times) if v]
    for n in range(len(times)):  # interpolate words Whisper heard differently
        if times[n] is None:
            lo = max([k for k in known if k < n], default=None); hi = min([k for k in known if k > n], default=None)
            a0 = times[lo][1] if lo is not None else speech[-1][0]
            b0 = times[hi][0] if hi is not None else speech[-1][1]
            span_n = (hi if hi is not None else len(times)) - (lo if lo is not None else -1)
            step = (b0 - a0) / max(1, span_n); off = n - (lo if lo is not None else -1)
            times[n] = [a0 + step * (off - 1), a0 + step * off]
    wordTimes.append([[round(s0, 3), round(max(e0, s0 + 0.08), 3)] for s0, e0 in times])
    t += len(seg) / SR + gap
    print(f"section {si + 1}: {sections[si]['heading'] or ''}  voice {speech[-1][0]:5.2f}-{speech[-1][1]:5.2f}")

# new section bounds: halfway through each gap; last one ends at the video end
bounds = [0.0] + [round((speech[si][1] + speech[si + 1][0]) / 2, 2) for si in range(N - 1)] + [length]

# ---------------------------------------------------------------- re-time panels
def remap(tt, si, hi_new):
    A, B = sections[si]["A"], sections[si]["B"]
    return bounds[si] + (tt - A) / (B - A) * (hi_new - bounds[si])
old = sorted(panels, key=lambda p: p["start"])
for p in old:
    si = max([i for i, s in enumerate(sections) if s["A"] <= p["start"] + 1e-6] or [0])
    last = si == N - 1
    end_card = "end" in (p.get("fx") or [])
    if last and end_card:
        p["start"], p["end"] = round(speech[-1][1] + 0.15, 2), round(length, 2); continue
    has_end = last and any("end" in (q.get("fx") or []) and q["start"] >= sections[si]["A"] for q in old)
    hi = speech[-1][1] + 0.15 if has_end else bounds[si + 1]
    p["start"] = round(remap(p["start"], si, hi), 2)
    p["end"] = round(min(remap(min(p["end"], sections[si]["B"]), si, hi), hi), 2)
for i in range(len(old) - 1):  # no gaps or overlaps
    old[i]["end"] = old[i + 1]["start"]
old[-1]["end"] = round(length, 2)
proj["panels"] = old

# ---------------------------------------------------------------- script with new timestamps
proj["script"] = "\n\n".join(
    f"**{fmt(bounds[si])}–{fmt(bounds[si + 1])}{(' — ' + s['heading']) if s['heading'] else ''}**\n\n{s['text']}"
    for si, s in enumerate(sections))
proj["duration"] = length
proj.update(voice="assets/voice-final.wav", voiceOffset=0, speech=speech, wordTimes=wordTimes)

# ---------------------------------------------------------------- voice colour + loudness
raw = os.path.join(tmp, "track.f32"); track[: int((length + 0.5) * SR)].tofile(raw)
fx = []
if a.deepen: fx.append(f"rubberband=pitch={a.deepen}:formant=preserved")
# clarity: cut mud, lift presence, tame sibilance, steady the level
fx.append("highpass=f=90,equalizer=f=300:t=q:w=1:g=-2,equalizer=f=3200:t=q:w=1.2:g=2.5,equalizer=f=7500:t=q:w=2:g=-2,"
          "acompressor=threshold=-22dB:ratio=3.5:attack=4:release=120:makeup=2")
if a.creepy:
    fx.append("asplit[d][s];[s]rubberband=pitch=0.5:formant=shifted,lowpass=f=900,volume=0.16[g];[d]equalizer=f=180:t=q:w=1:g=2.5[d2];[d2][g]amix=inputs=2:normalize=0")
if a.clown:  # EQ must come before vibrato (EQ after it goes unstable in ffmpeg)
    fx.append("equalizer=f=1100:t=q:w=1.4:g=5,equalizer=f=220:t=q:w=1:g=-3,"
              "asplit[c][l];[l]rubberband=pitch=0.5:formant=shifted,lowpass=f=1000,volume=0.13[dm];"
              "[c]rubberband=pitch=1.2:formant=preserved,vibrato=f=5.5:d=0.08,"
              "chorus=0.7:0.9:45|60:0.35|0.3:0.3|0.4:2|2.6[cc];[cc][dm]amix=inputs=2:normalize=0,"
              "aecho=0.8:0.5:70|140:0.16|0.08")
if a.reverb: fx.append("aecho=0.8:0.5:45|90|160:0.18|0.1|0.06")
fx.append("loudnorm=I=-16:TP=-1.5:LRA=11")
out = os.path.join(a.episode, "assets", "voice-final.wav")
ff(["-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", raw, "-filter_complex", ",".join(fx), "-ar", str(SR), "-ac", "2", out])

open(pp, "w", encoding="utf-8").write("window.WISH_PROJECT = " + json.dumps(proj, indent=1, ensure_ascii=False) + ";\n")
print(f"tempo x{tempo:.2f} · video {length:.1f}s · wrote {out} and re-timed project.js")
for p in old: print(f"  panel {p['n']:>2} {p['start']:6.2f}-{p['end']:6.2f}  {p.get('title', '')}")
