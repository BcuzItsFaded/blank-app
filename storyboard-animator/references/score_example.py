"""Synthesize the Verity suspense score, cued to the scene timings of the storyboard."""
import json
import subprocess

import numpy as np

SR = 44100
durs = [12.2, 7.4, 8.8, 7.5, 7.1, 6.6, 11.5, 7.9, 13.9, 4.8]  # from the build (scene 7 includes its 1 s pause)
starts = np.concatenate([[0], np.cumsum(durs)[:-1]])
total = sum(durs) + 1.0
N = int(total * SR)
t_all = np.arange(N) / SR
out = np.zeros(N)
rng = np.random.default_rng(7)


def note(f):
    names = {"A": 0, "A#": 1, "B": 2, "C": 3, "C#": 4, "D": 5, "D#": 6, "E": 7, "F": 8, "F#": 9, "G": 10, "G#": 11}
    name, octave = f[:-1], int(f[-1])
    semis = names[name] + 12 * (octave - 4) + (12 if names[name] >= 3 else 0) - 12
    return 440 * 2 ** (semis / 12)


def add(sig, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= N:
        return
    sig = sig[: N - i]
    out[i:i + len(sig)] += sig * gain


def piano(f, t0, amp=0.25, length=4.0):
    t = np.arange(int(length * SR)) / SR
    s = sum((1 / k ** 1.6) * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (1.2 + 0.9 * k)) for k in range(1, 6))
    s *= np.minimum(t / 0.005, 1)
    add(s * amp, t0)


def drone(f, t0, t1, amp=0.12, wobble=0.15):
    t = np.arange(int((t1 - t0) * SR)) / SR
    env = np.minimum(t / 2.0, 1) * np.minimum((t1 - t0 - t) / 2.0, 1)
    s = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 1.5 * t + 1) + 0.3 * np.sin(2 * np.pi * f * 2.003 * t)
    s *= 1 + wobble * np.sin(2 * np.pi * 0.2 * t)
    add(s * env * amp, t0)


def strings(freqs, t0, t1, amp=0.08, rise=False):
    t = np.arange(int((t1 - t0) * SR)) / SR
    s = np.zeros_like(t)
    for f in freqs:
        for det in (-0.4, 0, 0.45):
            ff = f + det
            s += sum(np.sin(2 * np.pi * ff * k * t + k) / k for k in range(1, 7))
    s /= len(freqs) * 3
    s *= 1 + 0.08 * np.sin(2 * np.pi * 5.2 * t)  # vibrato-ish shimmer
    env = (t / t[-1]) ** 1.5 if rise else np.minimum(t / 1.5, 1)
    env = env * np.minimum((t1 - t0 - t) / 0.8, 1)
    add(s * env * amp, t0)


def ticks(t0, t1, amp=0.05, step=0.5):
    click = rng.standard_normal(int(0.004 * SR)) * np.exp(-np.arange(int(0.004 * SR)) / 40)
    click = np.diff(click, prepend=0)
    for k, tt in enumerate(np.arange(t0, t1, step)):
        add(click * (amp if k % 2 == 0 else amp * 0.6), tt)


def boom(t0, f0=48, amp=0.6, length=2.0):
    t = np.arange(int(length * SR)) / SR
    f = f0 + 40 * np.exp(-t * 12)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2)
    s += 0.25 * rng.standard_normal(len(t)) * np.exp(-t * 18)
    add(s * amp, t0)


def pulse(t0, t1, every=1.2, amp=0.3):
    for tt in np.arange(t0, t1, every):
        boom(tt, f0=55, amp=amp, length=1.0)


S = starts
arp = ["A3", "C4", "E4", "B3", "A3", "E4", "C4", "B3"]

# 1 - eerie piano + low drone
drone(note("A1"), S[0], S[2] + 1, amp=0.10)
for k, tt in enumerate(np.arange(S[0] + 0.5, S[1], 1.5)):
    piano(note(arp[k % len(arp)]), tt)
# 2 - piano continues, add ticking and tense strings
for k, tt in enumerate(np.arange(S[1], S[2], 1.5)):
    piano(note(arp[(k + 3) % len(arp)]), tt, amp=0.2)
ticks(S[1], S[2])
strings([note("A3"), note("C4"), note("D#4")], S[1], S[2] + 0.5, amp=0.06)
# 3 - dark ambient, bass hit on "daughter"
drone(note("D1") * 1.0, S[2], S[3] + 1, amp=0.14, wobble=0.3)
noise = rng.standard_normal(int(durs[2] * SR))
noise = np.convolve(noise, np.ones(200) / 200, mode="same")  # crude low-pass = dark air
add(noise * 0.6 * np.sin(np.linspace(0, np.pi, len(noise))), S[2])
DAUGHTER = S[2] + (8.3 * 0.29)  # "daughter" sits ~29% through the scene's narration
boom(DAUGHTER, f0=38, amp=0.8, length=2.5)
# 4 - melancholy piano + unsettling hum
for k, n in enumerate(["F3", "A3", "C4", "E4", "A3", "C4", "E4", "G4"]):
    piano(note(n), S[3] + 0.3 + k * 0.9, amp=0.18)
drone(110, S[3], S[4], amp=0.05, wobble=0.6)
# 5 - slowly rising strings, a dip right before "pretending"
PRETEND = S[4] + 6.6 * 0.86
strings([note("A2"), note("E3"), note("A3"), note("C4")], S[4], PRETEND - 0.25, amp=0.18, rise=True)
# 6 - deep restrained pulses fading toward silence
pulse(S[5], S[6] - 1.0, amp=0.35)
drone(note("A1"), S[5], S[6] - 0.3, amp=0.07)
# 7 - one second of silence, then a low impact and sparse piano
boom(S[6] + 1.0, f0=40, amp=0.9, length=3.0)
for k, n in enumerate(["A2", "E3", "C3", "B2"]):
    piano(note(n), S[6] + 2.2 + k * 2.3, amp=0.22, length=5)
drone(note("A1"), S[6] + 1.0, S[7] + 0.5, amp=0.06)
# 8 - quiet ticking pulse, unresolved strings
ticks(S[7], S[8], amp=0.06, step=0.5)
strings([note("D3"), note("E3"), note("A3"), note("B3")], S[7], S[8] + 0.5, amp=0.12)
# 9-10 - opening piano returns, ends on an unresolved note and fades out
drone(note("A1"), S[8], total - 0.2, amp=0.09)
for k, tt in enumerate(np.arange(S[8] + 0.4, S[9] + 1.0, 1.5)):
    piano(note(arp[k % len(arp)]), tt)
piano(note("B3"), S[9] + 1.6, amp=0.28, length=4)
piano(note("D4"), S[9] + 1.6, amp=0.18, length=4)

# Overall shape: build toward the twist (scenes 5-8), with true silence before the impact.
gain = np.interp(t_all, [0, S[4], S[6], S[8], total], [0.8, 0.9, 1.1, 1.0, 0.9])
silence = (t_all >= S[6] - 0.15) & (t_all < S[6] + 1.0)
fade6 = np.clip((S[6] - t_all) / 2.5, 0, 1)  # scene 6 fades toward silence
gain = np.where((t_all >= S[6] - 2.5) & (t_all < S[6]), gain * fade6, gain)
gain[silence] = 0
gain *= np.clip((total - t_all) / 3.0, 0, 1)  # final fade-out
out *= gain

out /= np.abs(out).max() * 1.1
stereo = np.stack([out, np.roll(out, int(0.012 * SR))], axis=1)
pcm = (stereo * 32767).astype("<i2").tobytes()
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "s16le", "-ar", str(SR), "-ac", "2", "-i", "-",
                "-af", "lowpass=f=9000,aecho=0.7:0.5:90|180:0.25|0.15", "score.mp3"], input=pcm, check=True)
print(json.dumps({"seconds": round(total, 1), "daughter_at": round(DAUGHTER, 2), "pretending_at": round(PRETEND, 2)}))
