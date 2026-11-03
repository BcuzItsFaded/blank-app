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
VO_OFFSET = 0.25      # narration starts this long after each scene cut
VO_MAX = 4.45         # narration must end before the next cut
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

def word_timings(words, dur):
    """Distribute words across the spoken duration, weighting long words
    and pausing after punctuation. Approximate - good enough for captions."""
    weights, pauses = [], []
    for w in words:
        core = re.sub(r"[^A-Za-z0-9]", "", w)
        weights.append(max(2, len(core)) + 1.5)
        pauses.append(4.0 if re.search(r"[.:!?]$", w) else (2.0 if w.endswith(",") else 0.0))
    total = sum(weights) + sum(pauses[:-1])
    unit = dur / total
    out, t = [], 0.0
    for w, wt, p in zip(words, weights, pauses):
        t0 = t; t1 = t + wt * unit
        out.append({"w": w, "t0": round(t0, 3), "t1": round(t1, 3)})
        t = t1 + p * unit
    return out

def build_narration(scenes, voice):
    buf = np.zeros(N); timings = []
    for s in scenes:
        i = s["id"]; text = s["narration"]
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
                        "words": word_timings(text.split(), dur)})
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


def build_sfx(timings):
    buf = np.zeros(N)
    W = {}
    for tm in timings:  # absolute time of word k in scene i
        W[tm["id"]] = [tm["start"] + w["t0"] for w in tm["words"]]
    def at(i, word_idx): return W[i][min(word_idx, len(W[i]) - 1)]
    S = lambda i: (i - 1) * SCENE

    # 1 Ash City
    place(buf, s_rain(5.4, .7), 0)
    place(buf, s_wind(5.0), 0, .6)
    place(buf, s_thunder(4.5), 1.4, .7)
    # 2 Sleepless survivor
    place(buf, hp(s_rain(5.2, .6), 400), S(2))
    place(buf, s_heartbeat(62, 4.8), S(2) + .1, .7)
    place(buf, s_thunder(4.0, crack=True), at(2, 9) - .05, .9)   # "peace"
    # 3 The mark
    place(buf, s_tick(5.0), S(3))
    place(buf, s_drone(5.0, 73.4), S(3), .8)
    place(buf, s_stinger(), at(3, 7) - .03, .9)                  # "mark"
    # 4 Noda
    place(buf, s_phone(1.6), S(4) + .05, .7)
    place(buf, s_rustle(.8), at(4, 4), .8)
    place(buf, s_rustle(.6), at(4, 9), .6)
    place(buf, s_whoosh(.6), S(5) - .35, .9)                     # whip pan
    # 5 Murakami
    place(buf, s_bubbles(5.0), S(5), .8)
    place(buf, s_hum(5.0), S(5), 1.0)
    place(buf, s_heartbeat(54, 5.0), S(5), .35)
    # 6 Sagami Bay
    place(buf, s_underwater(5.3), S(6), .9)
    place(buf, s_heartbeat(40, 5.0, deep=True), S(6) + .2, 1.1)
    place(buf, s_sonar(), S(6) + .6, .8)
    place(buf, s_whoosh(.8), S(7) - .45, .7)                     # rise wipe
    # 7 Blue light
    place(buf, s_waves(5.2), S(7), .9)
    place(buf, s_creak(), S(7) + .7, 1.0)
    place(buf, s_creak(), S(7) + 3.2, .8)
    place(buf, s_throb(4.0, 1.4), at(7, 6), .8)                  # "pulsing"
    # 8 Godzilla returns
    place(buf, s_surge(2.0), S(8), 1.0)
    place(buf, s_crash(), at(8, 3) - .1, 1.0)                    # "open"
    place(buf, s_roar(3.4), at(8, 6) - .25, 1.0)                 # "returned"
    place(buf, s_thunder(3.0), S(8) + .3, .5)
    # 9 Spines
    plate_words = [at(9, 3), at(9, 4) + .15, at(9, 5), at(9, 6) + .15, at(9, 7), at(9, 8)]
    for k, tp in enumerate(plate_words):
        place(buf, s_clank(), tp, .7 + .05 * k)
    place(buf, s_charge(4.6), S(9) + .2, .9)
    # 10 Plot twist
    place(buf, s_beam(2.2), S(10) + .1, 1.0)
    place(buf, s_boom(6.0), S(10) + 1.0, 1.25)
    place(buf, s_ring(2.5), S(10) + 2.4, 1.0)
    # 11 Face the nightmare
    place(buf, s_wind(5.2), S(11), .8)
    place(buf, lp(s_roar(3.0), 900), S(11) + 2.2, .5)
    # 12 Title
    place(buf, s_impact(), S(12) + .2, 1.1)
    place(buf, lp(s_roar(3.4), 1500), S(12) + 1.6, .45)
    return buf


# ---------------------------------------------------------------- score
SCALE = [146.83, 155.56, 196.0, 220.0, 233.08]   # D Eb G A Bb (miyako-bushi)
INTENSITY = [0.30, 0.32, 0.36, 0.42, 0.46, 0.52, 0.58, 0.88, 0.92, 1.0, 0.72, 0.82]

def pluck(f, dur=1.6):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (2.2 + h * 1.4)) / h for h in range(1, 7))
    x += hp(noise(dur), 3000) * np.exp(-tt * 60) * .2
    return x * .35

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

def build_score():
    buf = np.zeros(N); tt = np.arange(N) / SR
    inten = np.interp(tt, [i * SCENE + 2.5 for i in range(12)], INTENSITY)
    # pad: D minor drone with slow movement (D-A, then Bb-F, then C-G over the climax)
    roots = [73.42] * 6 + [58.27] * 2 + [73.42, 65.41, 58.27, 73.42]
    pad = np.zeros(N)
    for i, r in enumerate(roots):
        seg = np.arange(int(SR * (SCENE + 1))) / SR
        v = sum(signal.sawtooth(2 * np.pi * r * m * seg * d) / m for m in (1, 1.5, 2) for d in (1, 1.003))
        v = lp(v, 500 + 900 * INTENSITY[i]) * np.interp(seg, [0, .5, SCENE, SCENE + 1], [0, 1, 1, 0])
        place(pad, v * .09, i * SCENE - .5 if i else 0)
    buf += pad * (0.6 + 0.6 * inten)
    # koto-like ostinato: sparse early, busier from scene 6
    motif = [0, 2, 1, 3, 2, 4, 3, 1]
    step = 0
    t = 0.6
    while t < 55:
        sc = int(t // SCENE)
        if sc == 9 and t % SCENE > .8: t += .25; continue        # silence after the blast
        rate = .75 if sc < 5 else (.5 if sc < 7 else .25)
        oct_ = 2 if sc >= 7 and step % 4 == 0 else 1
        place(buf, pluck(SCALE[motif[step % len(motif)]] * oct_), t, .55 * INTENSITY[sc] + .1)
        step += 1; t += rate
    # taiko pulse grows
    for k in np.arange(0, 60, 1.0):
        sc = int(k // SCENE)
        if sc < 3 and int(k) % 4: continue
        if sc == 9 and 46 < k < 49: continue
        place(buf, taiko(big=int(k) % 5 == 0), k, .5 * INTENSITY[sc])
        if sc >= 7 and sc != 9:
            place(buf, taiko(), k + .5, .3 * INTENSITY[sc])
    # brass stabs on the big beats
    place(buf, brass([73.42, 110, 146.83, 174.6], 3.0), 35.9, 1.0)      # Godzilla returns
    place(buf, brass([58.27, 87.3, 116.5, 146.83], 4.0), 45.1, 1.1)     # plot twist
    place(buf, brass([73.42, 110, 146.83, 220, 174.6], 4.5), 55.2, 1.2) # title
    # 1.2s of near-silence after the blast hit (scene 10)
    gate = np.ones(N)
    a, b = int(46.2 * SR), int(47.6 * SR)
    gate[a:b] = np.interp(np.arange(b - a), [0, 2400, b - a - 9600, b - a], [1, .05, .05, 1])
    buf *= gate
    # tail fade
    buf *= np.interp(tt, [0, .3, 58.6, 60], [0, 1, 1, 0])
    return reverb(buf, 2.8, .3)


def duck(score, narr, depth=0.45):
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
    print("sfx…"); sfx = build_sfx(timings)
    print("score…"); score = duck(build_score(), narr)
    narr = norm(narr, .92); sfx = norm(sfx, .85); score = norm(score, .8)
    write("narration.wav", narr); write("sfx.wav", sfx); write("score.wav", score)
    mix = narr * 1.0 + sfx * 0.55 + score * 0.42
    write("mix.wav", norm(mix, .95))
    json.dump({"voOffset": VO_OFFSET, "scenes": timings}, open(os.path.join(ROOT, "src", "timings.json"), "w"), indent=1)
    print("done")


if __name__ == "__main__":
    main()
