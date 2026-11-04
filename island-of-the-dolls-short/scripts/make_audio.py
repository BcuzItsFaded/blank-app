#!/usr/bin/env python3
"""Build the audio stems for "The Island of the Dolls" from src/scenes.json.

Outputs public/audio/{narration,score,sfx}.wav and src/timings.json (per-line, per-word timing).
Voices: free local Piper TTS — wife = en_US-lessac-high, you = en_US-ryan-high (see meta.speakers).
Record your own takes as public/audio/vo/scene-XX-L.wav (XX = scene, L = line 1,2…) to replace them.
"""
import json, os, sys
import numpy as np
from scipy import signal

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import synth as S
from synth import SR, t_arr, lp, hp, bp, noise, reverb, place, norm, trim, piper, read_wav, word_timings, env_ad

ROOT = S.ROOT
TOTAL = 60.0
N = int(SR * TOTAL)
rng = np.random.default_rng(1950)
LEAD, TAIL, GAP = 0.12, 0.2, 0.28   # narration starts 0.2 s into a scene, ends ≥0.35 s before the next


# ---------------------------------------------------------------- voice processing
VOICE_RMS_DB = -18.0

def compress(x, thr_db=-24.0, ratio=3.0, att=0.004, rel=0.12):
    """feed-forward RMS compressor (smooths the TTS level jumps)"""
    env = np.sqrt(signal.lfilter([1 - np.exp(-1 / (SR * 0.01))], [1, -np.exp(-1 / (SR * 0.01))], x ** 2) + 1e-12)
    lvl = 20 * np.log10(env)
    gain_db = np.minimum(0, (thr_db - lvl) * (1 - 1 / ratio))
    g = 10 ** (gain_db / 20)
    a, r = np.exp(-1 / (SR * att)), np.exp(-1 / (SR * rel))
    out = np.empty_like(g); prev = 1.0
    for i in range(0, len(g), 64):  # block-wise smoothing (fast enough, inaudible stepping)
        tgt = g[i:i + 64].min()
        k = a if tgt < prev else r
        prev = tgt + (prev - tgt) * k ** 64
        out[i:i + 64] = prev
    return x * out

def polish_voice(x):
    x = hp(x, 85, 2)
    x = x + 0.35 * bp(x, 2200, 5200)          # presence: intelligibility on phone speakers
    x = x - 0.25 * bp(x, 250, 450)             # de-mud
    x = compress(x)
    rms = np.sqrt(np.mean(x[np.abs(x) > 1e-3] ** 2))
    x = x * (10 ** (VOICE_RMS_DB / 20) / (rms + 1e-9))   # both hosts at the same loudness
    return x


# ---------------------------------------------------------------- narration (two hosts)
def build_narration(meta, scenes):
    buf = np.zeros(N); out = []
    for s in scenes:
        lines = s["lines"]; spoken = s.get("spoken", [l["text"] for l in lines])
        budget = s["dur"] - LEAD - TAIL - GAP * (len(lines) - 1)
        def synth_all(ls):
            clips = []
            for k, l in enumerate(lines):
                custom = os.path.join(ROOT, "public", "audio", "vo", f"scene-{s['id']:02d}-{k + 1}.wav")
                if os.path.exists(custom):
                    clips.append((trim(read_wav(custom)), "custom"))
                else:
                    voice = os.path.join(ROOT, meta["speakers"][l["speaker"]]["voice"])
                    clips.append((trim(piper(spoken[k], voice, ls)), "piper"))
            return clips
        clips = synth_all(1.0)
        tot = sum(len(c) for c, _ in clips) / SR
        ls = min(1.1, budget / tot)
        for _ in range(4):
            clips = synth_all(ls)
            tot = sum(len(c) for c, _ in clips) / SR
            if tot <= budget: break
            ls *= (budget - 0.05) / tot
        if tot > budget:
            raise SystemExit(f"scene {s['id']}: narration {tot:.2f}s exceeds {budget:.2f}s — re-record or retime")
        t = s["start"] + LEAD; rec = {"id": s["id"], "start": s["start"], "dur": s["dur"], "lines": []}
        for (x, src), l in zip(clips, lines):
            x = polish_voice(x)
            words = word_timings(l["text"].split(), x)
            place(buf, x, t)
            rec["lines"].append({"speaker": l["speaker"], "start": round(t, 3), "duration": round(len(x) / SR, 3), "source": src, "words": words})
            t += len(x) / SR + GAP
        out.append(rec)
        print(f"  scene {s['id']}: {tot:.2f}s of {s['dur']}s ({', '.join(l['speaker'] for l in lines)})")
    return buf, out


# ---------------------------------------------------------------- sound design
def s_night(dur):
    """Xochimilco night bed: soft noise-based insects + distant frogs + gentle water lap (no pure tones)."""
    tt = t_arr(dur); out = np.zeros_like(tt)
    for lo, hi, rate, g in ((3200, 4800, 9.0, .035), (4200, 6200, 13.0, .02)):
        trill = (0.5 + 0.5 * np.sin(2 * np.pi * rate * tt)) ** 3 * (0.6 + 0.4 * np.sin(2 * np.pi * .17 * tt + lo))
        out += bp(noise(dur), lo, hi) * lp(trill, 60) * g
    for _ in range(int(dur * 0.5)):  # occasional distant frog
        d = .22; t2 = t_arr(d); fr = rng.uniform(140, 220)
        croak = signal.sawtooth(2 * np.pi * fr * t2) * (0.5 + 0.5 * np.sin(2 * np.pi * 28 * t2)) * np.exp(-t2 * 8)
        place(out, lp(croak, 700) * .05, rng.uniform(0, dur - .3))
    lap = lp(noise(dur), 420) * (0.5 + 0.5 * np.sin(2 * np.pi * tt / 3.1) ** 2) * .22
    return reverb(out, 1.5, .3) + lap

def s_paddle():
    tt = t_arr(1.0)
    splash = bp(noise(1.0), 400, 5000) * np.interp(tt, [0, .03, .25, 1], [0, 1, .3, 0]) * .7
    gurgle = sum(np.sin(2 * np.pi * rng.uniform(300, 900) * tt * (1 + tt * 3)) * np.exp(-tt * 12) * .08 for _ in range(5))
    return reverb(splash + gurgle, 1.0, .25)

def s_rope_creak():
    tt = t_arr(1.4)
    f = 90 + 40 * np.sin(2 * np.pi * .7 * tt)
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (np.sin(2 * np.pi * 22 * tt) > .2)
    return bp(x, 250, 2500) * np.sin(np.pi * tt / 1.4) * .22

def s_girl_hum(dur=3.4):
    """distant, wordless child-like hum (pure synthesis, heavily filtered + reverb)"""
    notes = [(0, 659.3, .6), (.6, 587.3, .6), (1.2, 523.3, .9), (2.1, 587.3, 1.2)]
    out = np.zeros(int(SR * dur))
    for t0, f, d in notes:
        tt = t_arr(d)
        v = np.sin(2 * np.pi * f * tt * (1 + .004 * np.sin(2 * np.pi * 5.5 * tt))) + .3 * np.sin(4 * np.pi * f * tt)
        place(out, v * np.interp(tt, [0, .12, d - .15, d], [0, 1, .8, 0]), t0)
    return reverb(lp(out, 1800) * .12, 3.0, .6)

def s_drip():
    tt = t_arr(.6)
    return reverb(np.sin(2 * np.pi * np.interp(tt, [0, .05, .6], [1800, 900, 700]) * tt) * np.exp(-tt * 14) * .3, 1.6, .5)

def s_whispers(dur=3.0):
    out = np.zeros(int(SR * dur))
    for _ in range(9):
        d = rng.uniform(.25, .6); tt = t_arr(d)
        w = bp(noise(d), 1800, 6000) * np.sin(np.pi * tt / d) ** 2 * (0.6 + 0.4 * np.sin(2 * np.pi * rng.uniform(6, 11) * tt))
        pan_gain = rng.uniform(.15, .35)
        place(out, w * pan_gain, rng.uniform(0, dur - d))
    return reverb(out, 2.0, .5)

def s_shutter():
    out = np.zeros(int(SR * .3))
    for t0, g in ((0, 1), (.09, .7)):
        c = bp(noise(.03), 1500, 8000) * np.exp(-np.linspace(0, 10, int(SR * .03))) * g
        place(out, c, t0)
    return out * .8

def s_phone_click():
    tt = t_arr(.08)
    return np.sin(2 * np.pi * 2600 * tt) * np.exp(-tt * 70) * .3

def s_bell(dur=6.0, f=196.0, g=1.0):
    tt = t_arr(dur)
    x = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for m, a, d in ((1, 1, .7), (2.0, .6, 1.1), (2.4, .5, 1.6), (3.0, .3, 2.2), (4.2, .2, 3.0)))
    return reverb(x * .22 * g, 4.0, .45)

def s_twist_hit():
    pre = S.s_whoosh(.5, up=True) * .9
    hit = S.s_impact() * 1.0
    out = np.zeros(int(SR * 4.5))
    place(out, hit, 0.0)
    return out, pre

def s_eyes_sting():
    tt = t_arr(2.0)
    x = sum(np.sin(2 * np.pi * f * tt + rng.uniform(0, 6)) for f in (1244.5, 1318.5, 1396.9))
    return reverb(x * np.interp(tt, [0, .05, 2], [0, .08, 0]), 2.5, .5)

SFX = {
    "sting_open": lambda: S.s_stinger() * .6,
    "real_hit": lambda: S.s_bass_hit() * .7,
    "paddle": s_paddle,
    "canoe_creak": lambda: S.s_creak() * .9,
    "drone_low": lambda: S.s_drone(8.0, 55.0) * .9,
    "girl_hum": s_girl_hum,
    "water_drip": s_drip,
    "rope_creak": s_rope_creak,
    "leaves_rustle": lambda: bp(noise(6.5), 1500, 7000) * (0.4 + 0.6 * np.abs(lp(noise(6.5), 3)) / 3) * .2,
    "rain_bed": lambda: S.s_rain(8.0, .45) * np.interp(t_arr(8.0), [0, .5, 7.3, 8], [0, 1, 1, 0]),
    "thunder_far": lambda: lp(S.s_thunder(4.0), 600) * .5,
    "eyes_sting": s_eyes_sting,
    "shutter": s_shutter,
    "phone_click": s_phone_click,
    "whispers": lambda: s_whispers(3.4) * .7,
    "bell": lambda: s_bell(6.0, 196.0, .55),
    "bell_soft": lambda: s_bell(4.5, 196.0, .5),
    "twist_turn": lambda: S.s_minor_chord(3.6) * .6,
    "final_creak": s_rope_creak,
}

ACCENTS = {"real_hit", "twist_hit", "shutter", "phone_click", "eyes_sting", "bell", "sting_open"}

def build_sfx(scenes, accents_only=None):
    """accents_only=None → everything; True → only accent hits; False → only ambience/foley"""
    buf = np.zeros(N)
    if accents_only is not True:
        place(buf, s_night(TOTAL) * np.interp(t_arr(TOTAL), [0, 1, 30, 38, 52, 52.2, 59, 60], [0, 1, 1, .5, .5, .2, 1, 0]), 0, .8)
    for s in scenes:
        for t, key in s["cues"]:
            if accents_only is not None and ((key in ACCENTS) != accents_only):
                continue
            at = s["start"] + t
            if key == "twist_hit":
                hit, pre = s_twist_hit()
                # hit lands just before the cut so its transient clears the first word; tail is shortened
                hit = hit * np.interp(t_arr(len(hit) / SR), [0, .25, 1.6, len(hit) / SR], [1, .8, .25, 0])
                place(buf, pre, at - .62); place(buf, hit, at - .12, 1.0)
            elif key in SFX:
                place(buf, SFX[key](), at, .9)
    return buf


# ---------------------------------------------------------------- original score: broken music box
MB_SCALE = {"A4": 440.0, "C5": 523.25, "D5": 587.33, "E5": 659.26, "F5": 698.46, "G#4": 415.3, "B4": 493.88, "A5": 880.0, "E4": 329.63}

def music_box(f, dur=2.2, vel=1.0, detune=0.0):
    tt = t_arr(dur)
    wow = 1 + .003 * np.sin(2 * np.pi * .9 * tt) + detune
    x = (np.sin(2 * np.pi * f * wow * tt) + .35 * np.sin(2 * np.pi * f * 3.0 * wow * tt) * np.exp(-tt * 6)
         + .15 * np.sin(2 * np.pi * f * 5.4 * tt) * np.exp(-tt * 10))
    x *= np.exp(-tt * 2.6)
    x += hp(noise(dur), 4000) * np.exp(-tt * 90) * .1   # tine click
    return x * .22 * vel

MELODY = ["E5", "C5", "A4", "B4", "C5", "B4", "G#4", "E4", "A4", "C5", "E5", "D5", "C5", "B4", "A4", "A4"]

def build_score(scenes):
    buf = np.zeros(N); tt = np.arange(N) / SR
    beat = 0.5
    # music box: plays the melody, slowly runs down (tempo + pitch sag) toward the twist, restarts broken
    t, k = 0.4, 0
    while t < 51.5:
        sag = 1 - 0.012 * (t / 51.5)            # pitch slowly sinks
        place(buf, music_box(MB_SCALE[MELODY[k % len(MELODY)]] * sag, vel=.9), t)
        if k % 4 == 0:
            place(buf, music_box(MB_SCALE[MELODY[k % len(MELODY)]] / 2 * sag, vel=.5), t)
        t += beat * (1 + 0.25 * (t / 51.5)); k += 1
    # after the twist: a few detuned notes, then silence
    for i, (dt, n) in enumerate(((1.2, "E5"), (2.4, "D5"), (3.9, "C5"), (5.6, "B4"))):
        place(buf, music_box(MB_SCALE[n] * (0.985 - i * .006), 2.8, .9, detune=-.004 * i), 52 + dt)
    # low drone bed under everything, swelling through scenes 5–7
    drone = S.s_drone(TOTAL, 55.0) * np.interp(tt, [0, 2, 30, 38, 45, 52, 52.1, 56, 60], [0, .5, .6, .9, 1.0, .8, .3, .6, 0])
    buf += drone * .7
    # soft string pad on the legend and the death
    place(buf, S.s_minor_chord(8.0) * .8, 15.2)
    place(buf, S.s_minor_chord(7.0) * .9, 45.2)
    buf *= np.interp(tt, [0, .2, 59.2, 59.95], [0, 1, 1, 0])
    return reverb(buf, 2.4, .3)


def duck(x, narr, depth):
    env = np.convolve(np.abs(narr), np.ones(2400) / 2400, mode="same")
    env = np.minimum(1, env / (np.max(env) * 0.2 + 1e-9))
    env = signal.lfilter([0.003], [1, -0.997], env)          # ~7 ms attack/≈330 ms release feel
    return x * (1 - depth * np.clip(env, 0, 1))

def true_peak_limit(x, ceiling_db=-1.5, look_ms=5.0, release_ms=120.0):
    """Look-ahead true-peak limiter: 4x-oversampled peak detection, gain reduction only where needed."""
    from scipy.ndimage import minimum_filter1d
    ceil = 10 ** (ceiling_db / 20)
    up = signal.resample_poly(x, 4, 1)
    pk = np.abs(up[: len(x) * 4]).reshape(-1, 4).max(axis=1)
    g = np.minimum(1.0, ceil / (pk + 1e-12))
    la = max(1, int(SR * look_ms / 1000))
    g = minimum_filter1d(g, size=2 * la + 1)                    # look-ahead: reduce before the peak arrives
    r = np.exp(-1 / (SR * release_ms / 1000))
    sm = signal.lfilter([1 - r], [1, -r], g - 1) + 1            # smooth recovery
    g = np.minimum(g, sm)
    y = x * g
    up = signal.resample_poly(y, 4, 1); over = np.abs(up).max() / ceil
    return y / over if over > 1 else y


def main():
    import pyloudnorm as pyln
    d = json.load(open(os.path.join(ROOT, "src", "scenes.json")))
    meta, scenes = d["meta"], d["scenes"]
    os.makedirs(os.path.join(ROOT, "public", "audio"), exist_ok=True)
    print("narration…"); narr, timings = build_narration(meta, scenes)
    print("sfx…"); amb = build_sfx(scenes, accents_only=False); acc = build_sfx(scenes, accents_only=True)
    print("score…"); score = build_score(scenes)
    # stem levels (relative), then ducking under the voice
    score = duck(norm(score, 1.0) * 10 ** (-27 / 20) / (np.sqrt(np.mean(norm(score, 1.0) ** 2)) + 1e-9), narr, 0.82)
    amb = duck(amb / (np.sqrt(np.mean(amb ** 2)) + 1e-9) * 10 ** (-33 / 20), narr, 0.75)
    acc = duck(acc / (np.max(np.abs(acc)) + 1e-9) * 10 ** (-9 / 20), narr, 0.55)
    sfx = amb + acc
    mix = narr + score + sfx
    meter = pyln.Meter(SR)
    gain = 10 ** ((-14.0 - meter.integrated_loudness(mix)) / 20)
    mix = true_peak_limit(mix * gain, -1.5)
    print(f"  mix: {meter.integrated_loudness(mix):.1f} LUFS")
    # stems are written at the same gain so studio previews match the master mix
    S.write("narration.wav", narr * gain); S.write("score.wav", score * gain); S.write("sfx.wav", sfx * gain)
    S.write("mix.wav", mix)
    json.dump({"scenes": timings}, open(os.path.join(ROOT, "src", "timings.json"), "w"), indent=1, ensure_ascii=False)
    print("done")


if __name__ == "__main__":
    main()
