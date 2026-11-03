#!/usr/bin/env python3
"""Build every audio stem for the Short from src/scenes.json.

Outputs (public/audio/):
  narration.wav  - scratch voice (Piper TTS, en_US-ryan-high), one line per scene
  score.wav      - original synthesized score (D miyako-bushi scale), ducked under narration
  sfx.wav        - synthesized sound design, cued to narration words
  mix.wav        - reference mix of the three stems
  timings.json   - per-scene narration start + per-word timings (drives subtitles)

Usage:  python3 scripts/make_audio.py [--voice PATH_TO_ONNX]
To use a recorded/ElevenLabs voiceover instead, drop public/audio/vo/scene-XX.wav
files (01..12); they are used in place of Piper automatically.
"""
import argparse, json, os, re, subprocess, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 48000
SCENE = 5.0
TOTAL = 60.0
N = int(SR * TOTAL)
VO_OFFSET = 0.15      # narration starts this long after each scene cut
VO_MAX = 4.72         # narration must end before the next cut
rng = np.random.default_rng(1949)


# ---------------------------------------------------------------- helpers
def t_arr(dur):
    return np.arange(int(SR * dur)) / SR

def env_ad(n, a, d, curve=4.0):
    """attack seconds a, then exponential decay over the rest."""
    na = max(1, int(a * SR)); x = np.ones(n)
    x[:na] = np.linspace(0, 1, na)
    rest = n - na
    if rest > 0:
        x[na:] = np.exp(-curve * np.linspace(0, 1, rest) * (d / max(d, 1e-3)))
    return x

def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR / 2 - 100) / (SR / 2), "low")
    return signal.lfilter(b, a, x)

def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x)

def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], "band")
    return signal.lfilter(b, a, x)

def noise(dur):
    return rng.standard_normal(int(SR * dur))

def reverb(x, secs=2.2, wet=0.3, tone=5000):
    n = int(secs * SR)
    ir = rng.standard_normal(n) * np.exp(-6.0 * np.linspace(0, 1, n))
    ir = lp(ir, tone)
    ir /= np.sqrt(np.sum(ir ** 2))
    y = signal.fftconvolve(x, ir)[: len(x)]
    return (1 - wet) * x + wet * y

def place(buf, clip, t, gain=1.0):
    i = int(t * SR)
    if i < 0: clip = clip[-i:]; i = 0
    if i >= len(buf): return
    j = min(len(buf), i + len(clip))
    buf[i:j] += clip[: j - i] * gain

def norm(x, peak=0.9):
    m = np.max(np.abs(x)) or 1.0
    return x / m * peak

def read_wav(path):
    sr, x = wavfile.read(path)
    x = x.astype(np.float64)
    if x.ndim > 1: x = x.mean(axis=1)
    x /= 32768.0 if np.max(np.abs(x)) > 2 else 1.0
    if sr != SR:
        x = signal.resample_poly(x, SR, sr)
    return x


# ---------------------------------------------------------------- narration
def piper(text, voice, length_scale):
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        out = f.name
    subprocess.run(["piper", "-m", voice, "-f", out, "--length-scale", f"{length_scale:.3f}",
                    "--sentence-silence", "0.12"], input=text.encode(), check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    x = read_wav(out); os.unlink(out)
    return x

def trim(x, thr=0.012):
    e = np.convolve(np.abs(x), np.ones(480) / 480, mode="same")
    idx = np.where(e > thr)[0]
    if len(idx) == 0: return x
    return x[max(0, idx[0] - 240): idx[-1] + 2400]

def syllables(w):
    core = re.sub(r"[^A-Za-z0-9']", "", w).lower()
    if core.isdigit():
        return 4 if len(core) == 4 else max(1, len(core))
    groups = re.findall(r"[aeiouy]+", core)
    n = len(groups) - (1 if core.endswith("e") and len(groups) > 1 and not core.endswith("le") else 0)
    return max(1, n)

def speech_gaps(x, min_gap=0.07, thr_ratio=0.06):
    """(start, end) seconds of pauses inside the clip, longest first."""
    hop = 240
    e = np.sqrt(np.convolve(x ** 2, np.ones(hop * 2) / (hop * 2), mode="same"))[::hop]
    quiet = e < (np.max(e) * thr_ratio)
    gaps, i = [], 0
    while i < len(quiet):
        if quiet[i]:
            j = i
            while j < len(quiet) and quiet[j]: j += 1
            a, b = i * hop / SR, j * hop / SR
            if b - a >= min_gap and a > 0.05 and b < len(x) / SR - 0.05: gaps.append((a, b))
            i = j
        else:
            i += 1
    return sorted(gaps, key=lambda g: g[0] - g[1])

def word_timings(words, x):
    """Align caption words to the take: split at punctuation using the clip's
    longest detected pauses, then spread words in each phrase by syllables."""
    dur = len(x) / SR
    breaks = [k for k, w in enumerate(words[:-1]) if re.search(r"[.,:;!?]$", w)]
    gaps = sorted(speech_gaps(x)[: len(breaks)])
    phrases, start = [], 0
    for k in breaks: phrases.append(list(range(start, k + 1))); start = k + 1
    phrases.append(list(range(start, len(words))))
    if len(gaps) == len(breaks):
        bounds = [0.0] + [v for g in gaps for v in g] + [dur]
        spans = [(bounds[2 * i], bounds[2 * i + 1]) for i in range(len(phrases))]
    else:  # fall back to proportional split
        tot = sum(syllables(w) for w in words); spans, t = [], 0.0
        for ph in phrases:
            d = dur * sum(syllables(words[k]) for k in ph) / tot; spans.append((t, t + d)); t += d
    out = []
    for ph, (a, b) in zip(phrases, spans):
        tot = sum(syllables(words[k]) for k in ph); t = a
        for k in ph:
            d = (b - a) * syllables(words[k]) / tot
            out.append({"w": words[k], "t0": round(t, 3), "t1": round(t + d, 3)}); t += d
    return out

def build_narration(scenes, voice):
    buf = np.zeros(N); timings = []
    for s in scenes:
        i = s["id"]; text = s.get("spoken", s["narration"])
        custom = os.path.join(ROOT, "public", "audio", "vo", f"scene-{i:02d}.wav")
        if os.path.exists(custom):
            x = trim(read_wav(custom)); src = "custom"
        else:
            x = trim(piper(text, voice, 1.0))
            ls = min(1.12, VO_MAX / (len(x) / SR))  # slow down for gravitas, or speed up to fit
            for _ in range(4):  # Piper's length scale is not perfectly linear - iterate to fit
                x = trim(piper(text, voice, ls)); src = "piper"
                if len(x) / SR <= VO_MAX: break
                ls *= (VO_MAX - 0.05) / (len(x) / SR)
        if len(x) / SR > VO_MAX:
            raise SystemExit(f"scene {i}: narration is {len(x)/SR:.2f}s, longer than {VO_MAX}s - shorten the line or re-record")
        x = hp(x, 70)
        x = norm(x, 0.85)
        # light "documentary" polish: gentle room + warmth
        x = reverb(x, secs=0.9, wet=0.12, tone=6000)
        start = (i - 1) * SCENE + VO_OFFSET
        place(buf, x, start)
        dur = len(x) / SR
        timings.append({"id": i, "start": round(start, 3), "duration": round(dur, 3), "source": src,
                        "words": word_timings(s["narration"].split(), x)})
        print(f"  scene {i:02d}: {dur:.2f}s ({src})")
    return buf, timings


# ---------------------------------------------------------------- sound design
def s_rain(dur, level=1.0):
    x = bp(noise(dur), 900, 9000) * 0.35 + lp(noise(dur), 600) * 0.4
    drops = np.zeros(int(SR * dur))
    for _ in range(int(dur * 60)):
        k = rng.integers(0, len(drops) - 400)
        drops[k:k + 400] += rng.uniform(.2, .8) * np.exp(-np.linspace(0, 12, 400)) * rng.standard_normal(400)
    x += hp(drops, 2000) * 0.6
    return x * level

def s_thunder(dur=4.0, crack=False):
    n = noise(dur)
    rumble = lp(n, 180, 4) * 6 * env_ad(len(n), 0.25 if not crack else 0.01, dur, 3)
    out = rumble
    if crack:
        c = hp(noise(0.5), 800) * env_ad(int(SR * .5), 0.002, .5, 10) * 1.4
        out[: len(c)] += c
    return reverb(out, 3.0, 0.4, 3000)

def s_wind(dur):
    n = noise(dur)
    lfo = 0.6 + 0.4 * np.sin(2 * np.pi * 0.25 * t_arr(dur) + 1)
    return bp(n, 250, 1200) * lfo * 0.5

def s_heartbeat(bpm, dur, deep=False):
    out = np.zeros(int(SR * dur)); per = 60 / bpm
    f0 = 38 if deep else 55
    for k in np.arange(0, dur, per):
        for off, g in ((0, 1.0), (0.22, 0.7)):
            tt = t_arr(0.25)
            thump = np.sin(2 * np.pi * f0 * tt * (1 + 1.5 * np.exp(-tt * 30))) * np.exp(-tt * 18)
            place(out, thump * g, k + off)
    return lp(out, 300) * 1.4

def s_tick(dur):
    out = np.zeros(int(SR * dur))
    for k in np.arange(0, dur, 0.5):
        c = hp(noise(0.02), 3000) * np.exp(-np.linspace(0, 10, int(SR * .02)))
        place(out, c, k, 0.5 if int(k * 2) % 2 else 0.35)
    return out

def s_stinger():
    tt = t_arr(2.5)
    x = sum(np.sign(np.sin(2 * np.pi * f * tt + rng.uniform(0, 6))) for f in (587.3, 622.3, 880.0, 932.3))
    x = bp(x, 400, 5000) * env_ad(len(tt), 0.005, 2.5, 3) * 0.25
    return reverb(x, 2.5, 0.45)

def s_drone(dur, f=73.4):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * f * m * tt + 0.3 * np.sin(2 * np.pi * .1 * tt)) / m for m in (1, 2, 3.01, 4.02))
    return lp(x, 900) * 0.25 * np.minimum(1, tt / 1.0)

def s_phone(dur=1.6):
    tt = t_arr(dur)
    bell = (np.sin(2 * np.pi * 1300 * tt) + np.sin(2 * np.pi * 1640 * tt)) * (np.sin(2 * np.pi * 20 * tt) > 0)
    gate = ((tt % 0.8) < 0.55).astype(float)
    return bp(bell * gate, 600, 4000) * 0.25

def s_rustle(dur=0.8):
    n = noise(dur); e = np.abs(lp(noise(dur), 18)); e /= e.max()
    return hp(n, 2500) * e * 0.35

def s_whoosh(dur=0.6, up=True):
    n = noise(dur); tt = t_arr(dur)
    out = np.zeros_like(n)
    for k in range(0, len(n), 960):
        fc = 300 + 5000 * (k / len(n) if up else 1 - k / len(n))
        out[k:k + 960] = bp(n[k:k + 960], fc * .6, fc * 1.4)
    return out * np.sin(np.pi * tt / dur) ** 2 * 1.2

def s_bubbles(dur):
    out = np.zeros(int(SR * dur))
    for _ in range(int(dur * 14)):
        f = rng.uniform(300, 1200); d = rng.uniform(.03, .08); tt = t_arr(d)
        b = np.sin(2 * np.pi * f * tt * (1 + tt * 12)) * np.exp(-tt / d * 4)
        place(out, b, rng.uniform(0, dur - .1), rng.uniform(.1, .3))
    return out

def s_hum(dur, f=60):
    tt = t_arr(dur)
    x = np.sin(2 * np.pi * f * tt) + .5 * np.sin(2 * np.pi * 2 * f * tt) + .3 * np.sign(np.sin(2 * np.pi * 3 * f * tt))
    return lp(x, 1400) * 0.08 * np.minimum(1, tt / .5)

def s_underwater(dur):
    return lp(noise(dur), 140, 4) * 2.2 + s_drone(dur, 36.7) * 0.6

def s_sonar():
    tt = t_arr(3.0)
    x = np.sin(2 * np.pi * 1180 * tt) * np.exp(-tt * 2.5)
    return reverb(x * .3, 3.0, .6, 4000)

def s_waves(dur):
    n = noise(dur); tt = t_arr(dur)
    swell = 0.5 + 0.5 * np.sin(2 * np.pi * tt / 2.6) ** 2
    return lp(n, 900) * swell * 0.6 + hp(n, 3000) * swell ** 3 * 0.15

def s_creak():
    tt = t_arr(0.9)
    f = 140 + 60 * np.sin(2 * np.pi * 1.1 * tt)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = signal.sawtooth(ph) * (np.sin(2 * np.pi * 28 * tt) > .3)
    return bp(x, 300, 2400) * np.sin(np.pi * tt / .9) * 0.18

def s_throb(dur, rate=1.2):
    tt = t_arr(dur)
    return np.sin(2 * np.pi * 48 * tt) * (0.5 + 0.5 * np.sin(2 * np.pi * rate * tt)) ** 3 * 0.5

def s_surge(dur=2.0):
    n = noise(dur); tt = t_arr(dur)
    return (lp(n, 400) * (1 - tt / dur) + lp(n, 2600) * (tt / dur)) * (tt / dur) ** 2 * 1.8

def s_crash():
    n = noise(3.0)
    x = lp(n, 1500) * env_ad(len(n), .02, 3, 3) * 1.6 + lp(n, 120) * env_ad(len(n), .01, 3, 2) * 2
    return reverb(x, 2.5, .35)

def s_roar(dur=3.4):
    """Original roar: detuned saw stack with pitch glide, growl FM, formant bands, saturation."""
    tt = t_arr(dur)
    glide = np.interp(tt, [0, .35, dur * .55, dur], [210, 330, 300, 150])
    growl = 1 + 0.06 * np.sin(2 * np.pi * 31 * tt) + 0.03 * rng.standard_normal(len(tt)).cumsum() / 400
    out = np.zeros_like(tt)
    for det in (1.0, 1.007, 0.993, 2.003, 0.5):
        ph = 2 * np.pi * np.cumsum(glide * growl * det) / SR
        out += signal.sawtooth(ph) * (0.5 if det == 2.003 else 1.0)
    form = bp(out, 500, 900) * 1.2 + bp(out, 1300, 2600) + bp(out, 2900, 4200) * .5
    form += hp(noise(dur), 2500) * 0.25
    e = np.interp(tt, [0, .12, .4, dur * .7, dur], [0, .9, 1, .8, 0])
    x = np.tanh(form * e * 2.2) * 0.8
    return reverb(x, 3.5, .45, 5000)

def s_clank():
    tt = t_arr(.5)
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in ((180, 9), (431, 14), (977, 22), (1733, 30)))
    x += hp(noise(.5), 1500) * np.exp(-tt * 40) * .6
    return reverb(x * .5, 1.2, .3)

def s_charge(dur=4.5):
    tt = t_arr(dur)
    f = np.interp(tt, [0, dur], [120, 1900]) ** 1.0
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = (np.sin(ph) + .5 * signal.sawtooth(ph * 2.01)) * (tt / dur) ** 1.5
    crackle = hp(noise(dur), 4000) * (rng.random(len(tt)) > .995) * 4
    return x * .3 + crackle * (tt / dur)

def s_beam(dur=2.2):
    tt = t_arr(dur)
    ph = 2 * np.pi * np.cumsum(np.interp(tt, [0, .3, dur], [1500, 900, 700])) / SR
    x = signal.sawtooth(ph) + signal.sawtooth(ph * 1.5) + hp(noise(dur), 2000) * 1.5
    return np.tanh(bp(x, 300, 7000) * 2) * np.interp(tt, [0, .05, dur - .3, dur], [0, 1, 1, 0]) * .45

def s_boom(dur=6.0):
    tt = t_arr(dur)
    sub = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, 1.5, dur], [70, 30, 22])) / SR) * env_ad(len(tt), .005, dur, 3)
    body = lp(noise(dur), 900, 4) * env_ad(len(tt), .003, dur, 5) * 3
    return reverb(np.tanh((sub * 1.6 + body) * 1.5), 4.0, .4, 2500)

def s_ring(dur=2.5):
    tt = t_arr(dur)
    return np.sin(2 * np.pi * 6200 * tt) * np.interp(tt, [0, .2, dur], [0, .06, 0])

def s_impact():
    tt = t_arr(4.0)
    x = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .4, 4], [110, 45, 35])) / SR) * env_ad(len(tt), .002, 4, 3)
    x += lp(noise(4.0), 2500) * env_ad(len(tt), .001, 4, 9) * 1.5
    return reverb(np.tanh(x * 1.4), 4.0, .45)


def taiko(big=False):
    tt = t_arr(1.4)
    f = np.interp(tt, [0, .08, 1.4], [120 if big else 95, 55, 48])
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * (3 if big else 5))
    x += lp(noise(1.4), 1200) * np.exp(-tt * 30) * .5
    return x * (1.0 if big else .7)

def brass(freqs, dur=2.5):
    tt = t_arr(dur)
    x = sum(signal.sawtooth(2 * np.pi * f * tt * d) for f in freqs for d in (1.0, 1.004))
    cut = np.interp(tt, [0, .15, dur], [300, 2400, 600])
    out = np.zeros_like(x)
    for k in range(0, len(x), 2400):
        out[k:k + 2400] = lp(x[k:k + 2400], cut[k])
    return out * np.interp(tt, [0, .06, dur - .5, dur], [0, 1, .7, 0]) * .12

# ---------------------------------------------------------------- extra synth voices
def s_footfall(dist=False):
    tt = t_arr(3.0)
    x = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .2, 3], [60, 32, 26])) / SR) * env_ad(len(tt), .004, 3, 3.5)
    x += lp(noise(3.0), 400 if dist else 1200, 4) * env_ad(len(tt), .002, 3, 7) * (1.2 if dist else 2.2)
    x = np.tanh(x * 1.6)
    return reverb(lp(x, 900) if dist else x, 3.5, .5 if dist else .35, 2500)

def s_bass_hit():
    tt = t_arr(2.0)
    x = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .1, 2], [90, 42, 38])) / SR) * env_ad(len(tt), .002, 2, 3)
    return np.tanh(x * 2.2) * .9

def s_pinwheel(dur=3.5):
    out = np.zeros(int(SR * dur))
    for k in np.arange(0, dur, 0.11):
        c = bp(noise(.012), 2500, 7000) * np.exp(-np.linspace(0, 8, int(SR * .012)))
        place(out, c, k + rng.uniform(-.01, .01), .25 + .1 * rng.random())
    return out + s_wind(dur) * .7

def s_mallets(n=5, gap=0.55):
    out = np.zeros(int(SR * (n * gap + 1)))
    for k in range(n):
        tt = t_arr(.4)
        hit = (np.sin(2 * np.pi * 220 * tt) * .6 + np.sin(2 * np.pi * 517 * tt) * .3) * np.exp(-tt * 22)
        hit += bp(noise(.4), 800, 3000) * np.exp(-tt * 60) * .8
        place(out, reverb(hit, 1.4, .35), k * gap + rng.uniform(-.03, .03), .7)
    return out

def s_cloth(dur=1.2):
    n = noise(dur); e = np.abs(lp(noise(dur), 6)); e /= e.max() + 1e-9
    return bp(n, 1500, 7000) * e * .4

def s_violin_harm(dur=3.2):
    tt = t_arr(dur)
    f = 1760 * (1 + .004 * np.sin(2 * np.pi * 5.2 * tt))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .2 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)
    return reverb(x * np.interp(tt, [0, .8, dur - .8, dur], [0, .18, .14, 0]), 3.0, .5)

def s_minor_chord(dur=4.0):
    tt = t_arr(dur)
    x = sum(signal.sawtooth(2 * np.pi * f * tt * d) for f in (73.42, 87.31, 110.0, 146.83) for d in (1, 1.003))
    return reverb(lp(x, 1100) * np.interp(tt, [0, .4, dur - 1.2, dur], [0, .07, .06, 0]), 3.5, .5)

def s_pencil(n=6):
    out = np.zeros(int(SR * 2.0))
    for k in range(n):
        c = bp(noise(.03), 1200, 5000) * np.exp(-np.linspace(0, 12, int(SR * .03)))
        place(out, c, k * .22, .6)
    return out

def s_page():
    tt = t_arr(.7); n = noise(.7)
    return bp(n, 1500, 8000) * np.interp(tt, [0, .1, .35, .7], [0, 1, .4, 0]) * .5

def s_radio(dur=1.4):
    tt = t_arr(dur)
    x = bp(noise(dur), 800, 4500) * .25 + np.sin(2 * np.pi * 1000 * tt) * .02 * (np.sin(2 * np.pi * 3 * tt) > .6)
    return x * np.interp(tt, [0, .1, dur - .3, dur], [0, 1, 1, 0])

def s_crowd(dur=3.0):
    out = np.zeros(int(SR * dur))
    for _ in range(int(dur * 40)):  # footsteps
        c = lp(noise(.05), 900) * np.exp(-np.linspace(0, 9, int(SR * .05)))
        place(out, c, rng.uniform(0, dur - .1), rng.uniform(.2, .5))
    murmur = bp(noise(dur), 300, 1400) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 3.3 * t_arr(dur)))) * .35
    return (out + murmur) * np.interp(t_arr(dur), [0, .3, dur - .5, dur], [0, 1, 1, 0])

def s_masonry():
    n = noise(2.0); tt = t_arr(2.0)
    crack = hp(n, 1500) * env_ad(len(n), .001, 2, 14) * 1.5
    debris = np.zeros_like(n)
    for _ in range(30):
        c = bp(noise(.04), 600, 4000) * np.exp(-np.linspace(0, 10, int(SR * .04)))
        place(debris, c, rng.uniform(.05, 1.6), rng.uniform(.1, .4))
    return reverb(crack + debris + lp(n, 200) * env_ad(len(n), .01, 2, 4), 2.0, .3)

def s_inhale():
    tt = t_arr(.9)
    return bp(noise(.9), 600, 3500) * np.interp(tt, [0, .6, .9], [0, .35, 0])

def s_drone_rise(dur=4.8):
    tt = t_arr(dur)
    f = np.interp(tt, [0, dur], [70, 420])
    ph = 2 * np.pi * np.cumsum(f) / SR
    wob = 1 + .5 * np.sin(2 * np.pi * np.interp(tt, [0, dur], [3, 14]) * tt)
    x = (signal.sawtooth(ph) * .5 + np.sin(ph * 2)) * wob
    return lp(x, 2500) * np.interp(tt, [0, .3, dur], [0, .25, .55])

def s_crackle(dur=2.0):
    tt = t_arr(dur)
    x = hp(noise(dur), 3000) * (rng.random(len(tt)) > .985) * 3
    return x + s_charge(dur) * .4

def s_heat_ray(dur=1.0):
    tt = t_arr(dur)
    boom = s_boom(4.0)
    return boom * .9

def piano(f, dur=3.0, vel=1.0):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * f * h * tt * (1 + .0004 * h * h)) * np.exp(-tt * (1.1 + h * .9)) / h ** 1.3 for h in range(1, 9))
    x += bp(noise(dur), 2000, 6000) * np.exp(-tt * 80) * .08
    return reverb(x * .32 * vel, 2.8, .4)

def choir(freqs, dur=5.0):
    tt = t_arr(dur); out = np.zeros_like(tt)
    for f in freqs:
        for d in (0.997, 1.0, 1.004):
            ph = 2 * np.pi * np.cumsum(f * d * (1 + .006 * np.sin(2 * np.pi * 5 * tt + f))) / SR
            v = signal.sawtooth(ph)
            out += bp(v, 600, 1100) + bp(v, 250, 450) * .8   # "ah" formants
    return reverb(out * np.interp(tt, [0, 1.2, dur - 1.4, dur], [0, .045, .045, 0]), 4.0, .55)


SFX = {
    "sub_rumble": lambda: s_drone(5.0, 36.7) * 1.4 + lp(noise(5.0), 90, 4) * 1.5,
    "wind_pinwheel": lambda: s_pinwheel(3.6),
    "distant_footfall": lambda: s_footfall(dist=True),
    "bass_hit": s_bass_hit,
    "mallets": lambda: s_mallets(5, .6),
    "low_rumble": lambda: lp(noise(2.4), 110, 4) * 1.8 * np.interp(t_arr(2.4), [0, 1, 2.4], [0, 1, 0]),
    "cloth_rustle": lambda: s_cloth(1.2),
    "low_wind": lambda: s_wind(1.6) * .8,
    "clock_tick": lambda: s_tick(4.5),
    "paper_scrape": lambda: s_rustle(.9),
    "medical_tick": lambda: s_tick(4.0) * .8,
    "muffled_sub": lambda: s_underwater(5.0),
    "bubble": lambda: s_bubbles(1.5),
    "organic_pulse": lambda: s_heartbeat(50, 1.4, deep=True) * 1.2,
    "stinger": s_stinger,
    "pencil_tap": lambda: s_pencil(6),
    "page_turn": s_page,
    "radio_hiss": lambda: s_radio(1.4),
    "rain_glass": lambda: hp(s_rain(5.0, .8), 500),
    "paper_scratch": lambda: s_rustle(1.4),
    "thunder_soft": lambda: s_thunder(2.6),
    "transition_whoosh": lambda: s_whoosh(.5),
    "roar_distant": lambda: lp(s_roar(3.4), 1400) * .8,
    "crowd_run": lambda: s_crowd(3.2),
    "huge_footfall": lambda: s_footfall(),
    "masonry_crack": s_masonry,
    "inhale": s_inhale,
    "electric_drone": lambda: s_drone_rise(4.8),
    "plate_crackle": lambda: s_crackle(2.0),
    "heat_ray": lambda: s_beam(1.0) * .9,
    "roar_tail": lambda: lp(s_roar(2.6), 1800) * .6,
    "title_impact": s_impact,
}
SFX_GAIN = {"heat_ray": 1.0, "huge_footfall": 1.2, "title_impact": 1.0, "bass_hit": 1.0}

# ambience beds per scene (start, dur, generator, gain) — under the cue sheet
BEDS = [
    (0.0, 5.0, lambda d: s_wind(d), .35),
    (5.0, 5.0, lambda d: lp(noise(d), 500) * .15, 1.0),
    (35.0, 5.0, lambda d: s_rain(d, .5), .5),
    (40.0, 5.0, lambda d: s_rain(d, .7) + s_waves(d) * .8, .6),
    (45.0, 4.3, lambda d: lp(s_rain(d, .7), 700), .55),
    (50.0, 5.0, lambda d: s_rain(d, .6) + s_thunder(d) * .3, .5),
    (55.0, 4.5, lambda d: s_wind(d), .35),
]


def build_sfx(scenes):
    buf = np.zeros(N)
    for st, d, gen, g in BEDS:
        place(buf, gen(d), st, g)
    for s in scenes:
        for t, key in s["cues"]:
            if key in SFX:
                place(buf, SFX[key](), t, SFX_GAIN.get(key, .8))
            if key == "heat_ray":
                place(buf, s_boom(5.5), t + .15, 1.1)
    return buf


def build_score(scenes):
    """Original cue-sheet score: hopeful piano (5–15 s) → dread (15–30) → percussion (34.6–45)
    → muffled prayer + silence (45–50) → rising heat-ray climax (50–55) → choir minor resolve."""
    buf = np.zeros(N); tt = np.arange(N) / SR
    D, F, A, Bb, C, E, G = 293.66, 349.23, 440.0, 466.16, 523.25, 329.63, 392.0
    # 0–5: dread pad under the sub rumble
    place(buf, s_drone(5.2, 36.7) * .8, 0)
    # 5.0 hopeful two-note piano, then a gentle repeating figure until 15.0 ("piano stops")
    notes = [(5.0, A), (5.45, D * 2), (6.6, F), (7.1, A), (8.2, G), (8.7, D * 2), (9.8, A), (10.4, F), (11.5, E), (12.0, A), (13.1, D), (13.6, F)]
    for t, f in notes:
        place(buf, piano(f, 2.6, .9), t)
    place(buf, piano(D / 2, 6, .5) + piano(A / 2, 6, .4), 5.0)
    place(buf, piano(Bb / 2, 6, .5) + piano(F / 2, 6, .4), 10.0)
    # 13.7 – dip music at cut, 15.0 piano stops (hard fade)
    gate = np.ones(N)
    a, b = int(14.6 * SR), int(15.0 * SR); gate[a:b] = np.linspace(1, 0, b - a)
    gate[b:int(15.5 * SR)] = 0
    # 15–30: dread
    place(buf, s_drone(15.0, 36.7) * .9, 15.0)
    place(buf, s_violin_harm(3.4), 18.4)
    place(buf, s_minor_chord(4.6), 23.2)
    # 30–45: percussion from 34.6
    for k in np.arange(34.6, 45.0, 0.5):
        big = abs((k - 34.6) % 2.0) < 1e-6
        place(buf, taiko(big=big), k, .55 if big else .32)
    place(buf, s_drone(10.5, 36.7) * .9, 34.6)
    place(buf, brass([73.42, 110, 146.83, 174.6], 3.5), 40.0, .9)
    # 45–50: single piano note at 46.8, everything else muffled
    place(buf, piano(A, 3.5, 1.0), 46.8)
    # 50–55: rising climax
    for k in np.arange(50.0, 54.0, 0.25):
        place(buf, taiko(big=(k * 4) % 4 == 0), k, .35 + .1 * (k - 50))
    place(buf, brass([58.27, 87.3, 116.5, 146.83], 4.0), 50.4, .7)
    # 55.0 low choir resolving into a dark minor chord
    place(buf, choir([146.83, 174.61, 220.0], 2.6), 55.0)
    place(buf, choir([73.42, 146.83, 174.61, 220.0, 293.66], 4.4), 56.4)
    place(buf, brass([73.42, 110, 146.83, 174.6], 2.0), 58.0, .8)
    buf *= gate
    buf *= np.interp(tt, [0, .1, 59.0, 59.95], [0, 1, 1, 0])
    return buf


def muffle_and_silence(x):
    """45.0 action ambience muffles (low-pass), 49.2 inhale then silence until the 50 s cut."""
    a, b = int(45.0 * SR), int(49.5 * SR)
    seg = x[a:b].copy()
    x[a:b] = lp(seg, 650, 2) * 1.2
    c, d = int(49.45 * SR), int(50.0 * SR)
    x[c:d] *= np.linspace(1, 0, d - c) ** 3
    return x


def duck(score, narr, depth=0.7):  # ≈ -10.5 dB under narration (pack spec: -8 to -12 dB)
    env = np.convolve(np.abs(narr), np.ones(2400) / 2400, mode="same")
    env = np.minimum(1, env / (np.max(env) * 0.25 + 1e-9))
    env = signal.lfilter([0.002], [1, -0.998], env)
    return score * (1 - depth * np.clip(env, 0, 1))


def write(name, x):
    wavfile.write(os.path.join(ROOT, "public", "audio", name), SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--voice", default=os.environ.get("PIPER_VOICE", os.path.join(ROOT, "voices", "en_US-ryan-high.onnx")))
    args = ap.parse_args()
    scenes = json.load(open(os.path.join(ROOT, "src", "scenes.json")))["scenes"]
    os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
    print("narration…"); narr, timings = build_narration(scenes, args.voice)
    print("sfx…"); sfx = muffle_and_silence(build_sfx(scenes))
    print("score…"); score = duck(muffle_and_silence(build_score(scenes)), narr)
    narr = norm(narr, .92); sfx = norm(sfx, .85); score = norm(score, .8)
    write("narration.wav", narr); write("sfx.wav", sfx); write("score.wav", score)
    mix = narr * 1.0 + sfx * 0.55 + score * 0.42
    write("mix.wav", norm(mix, .95))
    json.dump({"voOffset": VO_OFFSET, "scenes": timings}, open(os.path.join(ROOT, "src", "timings.json"), "w"), indent=1)
    print("done")


if __name__ == "__main__":
    main()
