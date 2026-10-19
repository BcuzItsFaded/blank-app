"""Synthesize an original music bed and sound effects cued to the narration.

Writes build/music.wav and build/sfx.wav (44.1 kHz stereo). Everything here is
generated from oscillators and noise, so there is nothing to license.
"""
import os

import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

from cues import BUILD, CUE, DURATION

SR = 44100
N = int((DURATION + 0.5) * SR)
BPM = 96
BEAT = 60 / BPM
rng = np.random.default_rng(7)


def t_axis(sec):
    return np.arange(int(sec * SR)) / SR


def filt(x, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)


def place(buf, clip, at, gain=1.0):
    i = int(at * SR)
    if i >= len(buf) or i + len(clip) <= 0:
        return
    j = min(len(buf), i + len(clip))
    buf[max(i, 0):j] += clip[max(0, -i):j - i] * gain


def env(sec, attack=0.002, decay=0.2):
    t = t_axis(sec)
    return np.minimum(1, t / max(attack, 1e-4)) * np.exp(-t / decay)


# ---------- instruments ----------

def kick(level=1.0):
    t = t_axis(0.5)
    freq = 45 + 110 * np.exp(-t / 0.03)
    phase = 2 * np.pi * np.cumsum(freq) / SR
    click = filt(rng.standard_normal(len(t)), "high", 2000) * np.exp(-t / 0.004) * 0.3
    return (np.sin(phase) * np.exp(-t / 0.28) + click) * level


def clap():
    t = t_axis(0.35)
    n = rng.standard_normal(len(t))
    burst = sum(np.exp(-np.maximum(t - d, 0) / 0.012) * (t >= d) for d in (0, 0.011, 0.022))
    body = filt(n, "band", [900, 3500]) * (burst * 0.5 + np.exp(-t / 0.12))
    return body * 0.55


def hat(open_=False):
    sec = 0.25 if open_ else 0.06
    t = t_axis(sec)
    return filt(rng.standard_normal(len(t)), "high", 7000) * np.exp(-t / (0.08 if open_ else 0.015)) * 0.22


def bass808(freq, sec):
    t = t_axis(sec)
    f = freq * (1 + 0.5 * np.exp(-t / 0.02))
    phase = 2 * np.pi * np.cumsum(f) / SR
    tone = np.tanh(2.2 * np.sin(phase)) * np.exp(-t / 0.9)
    return tone * np.minimum(1, t / 0.005) * 0.55


def pad_chord(freqs, sec):
    t = t_axis(sec)
    out = np.zeros_like(t)
    for f in freqs:
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            out += 2 * ((t * ff + rng.random()) % 1) - 1   # saw
    out = filt(out, "low", 1100, order=4)
    fade = np.minimum(1, t / 0.6) * np.minimum(1, (sec - t) / 0.4)
    return out * fade * 0.05


# A minor, i - VI - VII - V (Am, F, G, E): the classic tension loop.
PROG = [
    (55.00, [220.00, 261.63, 329.63]),
    (43.65, [174.61, 220.00, 261.63]),
    (49.00, [196.00, 246.94, 293.66]),
    (41.20, [164.81, 207.65, 246.94]),
]


def build_music():
    drums = np.zeros(N)
    bass = np.zeros(N)
    pad = np.zeros(N)
    bar = 4 * BEAT
    nbars = int(N / SR / bar) + 1
    k, c = kick(), clap()
    for b in range(nbars):
        t0 = b * bar
        root, chord = PROG[b % 4]
        place(pad, pad_chord(chord, bar + 0.3), t0)
        # Trap-style kick pattern with 808s on the same hits.
        for beat_pos in (0, 1.5, 2.75):
            place(drums, k, t0 + beat_pos * BEAT, 0.9)
            place(bass, bass808(root, BEAT * 1.4), t0 + beat_pos * BEAT)
        for beat_pos in (1, 3):
            place(drums, c, t0 + beat_pos * BEAT)
        for s in range(8):
            place(drums, hat(open_=(s == 7)), t0 + s * bar / 8, 0.9 if s % 2 == 0 else 0.6)
        if b % 4 == 3:   # hat roll into the next phrase
            for s in range(12):
                place(drums, hat(), t0 + 3 * BEAT + s * BEAT / 12, 0.5)

    t = np.arange(N) / SR
    # Section gates (0..1) so the arrangement follows the story.
    full = gate(t, [(CUE["spoilers"], CUE["twist"]), (CUE["body"], CUE["credits"]),
                    (CUE["sagat"], DURATION + 1)])
    intro = gate(t, [(0, CUE["spoilers"])])
    breakdown = gate(t, [(CUE["credits"], CUE["sagat"])])

    # Intro: kick + hats only, no 808. Breakdown: pad + slow heartbeat kick.
    heartbeat = np.zeros(N)
    hb = kick(0.7)
    tt = CUE["credits"] + 0.2
    while tt < CUE["sagat"] - 1.2:
        place(heartbeat, hb, tt)
        place(heartbeat, hb, tt + 0.28, 0.6)
        tt += 2 * BEAT * 2
    mix = (drums * (full + 0.75 * intro) + bass * full + pad * (0.8 + 0.6 * breakdown)
           + heartbeat * breakdown)
    # Twist break: everything but the pad drops out until the hit.
    mix *= 1 - 0.85 * gate(t, [(CUE["twist"], CUE["body"])])
    mix *= np.clip((DURATION + 0.3 - t) / 1.6, 0, 1)  # fade out
    return mix


def gate(t, spans, ramp=0.05):
    g = np.zeros_like(t)
    for a, b in spans:
        g = np.maximum(g, np.clip((t - a) / ramp, 0, 1) * np.clip((b - t) / ramp, 0, 1))
    return g


# ---------- sound effects ----------

def whoosh(sec=0.45, up=True):
    t = t_axis(sec)
    n = rng.standard_normal(len(t))
    # Sweep a band-pass by filtering short overlapping blocks.
    out = np.zeros_like(t)
    blocks = 24
    L = len(t) // blocks
    for i in range(blocks):
        frac = i / blocks
        f = 300 + (5000 if up else 2500) * (frac if up else 1 - frac)
        seg = filt(n[i * L:(i + 2) * L], "band", [f * 0.7, min(f * 1.4, 18000)])
        out[i * L:i * L + len(seg)] += seg * np.hanning(len(seg))
    shape = np.sin(np.pi * np.clip(t / sec, 0, 1)) ** 2
    return out * shape * 0.6


def boom(sec=1.4, level=1.0):
    t = t_axis(sec)
    f = 32 + 70 * np.exp(-t / 0.08)
    sub = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.5)
    crack = filt(rng.standard_normal(len(t)), "low", 3000) * np.exp(-t / 0.06) * 0.6
    return np.tanh(1.5 * (sub + crack)) * level


def slash():
    t = t_axis(0.3)
    n = filt(rng.standard_normal(len(t)), "high", 3000)
    return n * np.exp(-t / 0.05) * np.minimum(1, t / 0.01) * 0.5


def riser(sec):
    t = t_axis(sec)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    blocks = 40
    L = len(t) // blocks
    for i in range(blocks):
        f = 400 * 2 ** (4 * i / blocks)
        seg = filt(n[i * L:(i + 2) * L], "band", [f * 0.8, min(f * 1.25, 18000)])
        out[i * L:i * L + len(seg)] += seg * np.hanning(len(seg))
    tone = np.sin(2 * np.pi * np.cumsum(110 * 2 ** (3 * t / sec)) / SR) * 0.25
    return (out + tone) * (t / sec) ** 2 * 0.7


def glitch():
    out = np.zeros(int(0.45 * SR))
    for i in range(9):
        seg_len = int(rng.uniform(0.015, 0.05) * SR)
        f = rng.uniform(200, 2500)
        tt = np.arange(seg_len) / SR
        seg = np.sign(np.sin(2 * np.pi * f * tt)) * 0.25
        place(out, seg, rng.uniform(0, 0.38))
    return filt(out, "low", 6000)


def rip():
    t = t_axis(0.55)
    n = rng.standard_normal(len(t))
    crackle = (rng.random(len(t)) > 0.985) * rng.standard_normal(len(t)) * 3
    return filt(n * 0.4 + crackle, "band", [800, 6000]) * np.exp(-t / 0.25) * 0.6


def drain(sec=1.2):
    t = t_axis(sec)
    f = 900 * np.exp(-t / 0.5) + 60
    return np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * 0.12 * (1 - t / sec)


def shimmer(sec=1.2):
    t = t_axis(sec)
    out = sum(np.sin(2 * np.pi * f * t) for f in (1760, 2217, 2637, 3520))
    return out * np.exp(-t / 0.5) * np.minimum(1, t / 0.05) * 0.06


def thunder(sec=2.2):
    t = t_axis(sec)
    n = filt(rng.standard_normal(len(t)), "low", 600)
    return n * np.exp(-t / 0.7) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * t) ** 2) * 1.3


def explosion():
    t = t_axis(2.0)
    n = filt(rng.standard_normal(len(t)), "low", 1800)
    return np.tanh(2 * (boom(2.0) * 0.8 + n * np.exp(-t / 0.45)))


def tape_rewind(sec=0.8):
    t = t_axis(sec)
    f = 1800 * (1 - t / sec) ** 2 + 150
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.12 * np.hanning(len(t))


def build_sfx():
    sfx = np.zeros(N)
    C = CUE
    place(sfx, boom(), C["title"], 0.9)
    place(sfx, whoosh(), C["mystery"] - 0.25, 0.6)
    place(sfx, boom(1.0, 0.6), C["stay"])
    place(sfx, glitch(), C["spoilers"] - 0.05, 0.8)
    place(sfx, boom(1.0, 0.7), C["spoilers"])
    place(sfx, tape_rewind(), C["y1987"] - 0.45, 1.0)
    place(sfx, whoosh(0.35), C["ryu_wins"] - 0.2, 0.5)
    place(sfx, shimmer(), C["dark_hadou"], 1.0)
    place(sfx, boom(1.2, 0.8), C["akuma"])
    place(sfx, slash(), C["kills"], 1.0)
    place(sfx, whoosh(), C["six_years"] - 0.3, 0.7)
    place(sfx, boom(1.0, 0.6), C["bison"])
    place(sfx, boom(0.8, 0.8), C["bait"])
    place(sfx, drain(1.4), C["drains"], 1.0)
    place(sfx, whoosh(), C["confess"] - 0.3, 0.7)
    place(sfx, rip(), C["tore"] + 0.1, 1.0)
    place(sfx, boom(1.0, 0.7), C["vs"])
    place(sfx, slash(), C["vs"] + 0.05, 0.8)
    place(sfx, boom(1.2, 0.9), C["ken_loses"])
    place(sfx, whoosh(), C["final"] - 0.3, 0.7)
    place(sfx, shimmer(), C["forfeit"], 1.0)
    place(sfx, boom(1.3, 0.9), C["akuma_walks"])
    place(sfx, boom(1.3, 1.0), C["seconds"])
    place(sfx, thunder(), C["dark_ryu"], 0.9)
    place(sfx, boom(1.4, 0.8), C["dark_ryu"])
    place(sfx, slash(), C["beats_akuma"], 0.8)
    place(sfx, whoosh(0.9), C["hadouken"], 0.9)
    place(sfx, explosion(), C["hadouken_hit"], 0.8)
    place(sfx, glitch(), C["twist"], 1.0)
    place(sfx, riser(C["body"] - C["twist"]), C["twist"], 0.9)
    place(sfx, boom(1.6, 1.0), C["body"])
    place(sfx, explosion(), C["blows"], 0.9)
    place(sfx, whoosh(0.4), C["plan"] - 0.2, 0.6)
    place(sfx, slash(), C["instead"], 0.7)
    place(sfx, whoosh(0.7, up=False), C["credits"] - 0.3, 0.7)
    place(sfx, shimmer(1.6), C["scar"], 1.2)
    for key in ("bison_walks", "vega", "cammy2", "juli"):
        place(sfx, whoosh(0.3), C[key] - 0.12, 0.45)
    place(sfx, riser(1.4), C["sagat"] - 1.4, 0.7)
    place(sfx, boom(1.8, 1.0), C["sagat"])
    place(sfx, shimmer(), C["bodyguard"], 0.8)
    place(sfx, slash(), C["shoryuken"], 1.0)
    place(sfx, boom(1.0, 0.6), C["shoryuken"] + 0.05)
    place(sfx, whoosh(), C["cta"] - 0.3, 0.7)
    place(sfx, boom(1.0, 0.6), C["who"])
    return sfx


def stereo(x):
    return np.stack([x, x], axis=1)


def normalize(x, peak):
    return x / max(1e-9, np.abs(x).max()) * peak


if __name__ == "__main__":
    music = normalize(build_music(), 0.9)
    sfx = normalize(build_sfx(), 0.9)
    sf.write(os.path.join(BUILD, "music.wav"), stereo(music), SR)
    sf.write(os.path.join(BUILD, "sfx.wav"), stereo(sfx), SR)
    print(f"music + sfx written: {N / SR:.1f}s")
