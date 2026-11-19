#!/usr/bin/env python3
"""Build the audio for the "reality is weirder" facts Short from src/scenes.json.

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
TOTAL = float(json.load(open(os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "src", "scenes.json")))["meta"]["duration"])
N = int(SR * TOTAL)
rng = np.random.default_rng(1950)
LEAD, TAIL, GAP = 0.12, 0.2, 0.28   # narration starts 0.2 s into a scene, ends ≥0.35 s before the next



# ---------------------------------------------------------------- Kokoro TTS (natural free voices; voice = "kokoro:<name>")
_KOKORO = None
KOKORO_DIR = os.environ.get("KOKORO_DIR", os.path.join(os.path.dirname(ROOT), ".kokoro"))
def kokoro_tts(text, voice, length_scale=1.0):
    global _KOKORO
    from kokoro_onnx import Kokoro
    if _KOKORO is None:
        _KOKORO = Kokoro(os.path.join(KOKORO_DIR, "kokoro-v1.0.onnx"), os.path.join(KOKORO_DIR, "voices-v1.0.bin"))
    a, sr = _KOKORO.create(text, voice=voice, speed=float(np.clip(1.0 / length_scale, 0.6, 1.6)), lang="en-us")
    x = signal.resample_poly(np.asarray(a, dtype=np.float64), SR, sr)
    return x

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
                    v = meta["speakers"][l["speaker"]]["voice"]
                    if v.startswith("kokoro:"):
                        clips.append((trim(kokoro_tts(spoken[k], v.split(":", 1)[1], ls), thr=0.008), "kokoro"))
                    else:
                        clips.append((trim(piper(spoken[k], os.path.join(ROOT, v), ls)), "piper"))
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


# ---------------------------------------------------------------- sound design (space)
def s_scratch():
    tt = t_arr(.5)
    f = np.interp(tt, [0, .12, .25, .5], [300, 1400, 400, 900])
    x = bp(noise(.5), 500, 4000) * (0.5 + 0.5 * signal.sawtooth(2 * np.pi * np.cumsum(f / 40) / SR))
    return x * np.interp(tt, [0, .02, .45, .5], [0, 1, 1, 0]) * .6

def s_hum(dur=6.0):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * f * tt + .5 * np.sin(2 * np.pi * .3 * tt)) for f in (36.7, 55.0, 73.4)) * .25
    return lp(x + lp(noise(dur), 80) * .6, 300) * np.interp(tt, [0, .8, dur - .8, dur], [0, 1, 1, 0])

def s_bend(dur=1.4):
    tt = t_arr(dur)
    return np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, dur], [1800, 120])) / SR) * np.sin(np.pi * tt / dur) * .15

def s_stretch(dur=2.4):
    tt = t_arr(dur)
    f = np.interp(tt, [0, dur], [140, 60])
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * (0.6 + 0.4 * np.sin(2 * np.pi * 7 * tt))
    return bp(x, 100, 1600) * np.sin(np.pi * tt / dur) * .3

def s_boing():
    tt = t_arr(.9)
    f = 180 * (1 + .5 * np.exp(-tt * 4) * np.sin(2 * np.pi * 9 * tt))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 3.5) * .45

def s_static(dur=5.5):
    tt = t_arr(dur)
    return bp(noise(dur), 1000, 6000) * (0.4 + 0.6 * (rng.random(len(tt)) > .4)) * np.interp(tt, [0, .3, dur - 1, dur], [0, .25, .12, 0])

def s_beeps():
    out = np.zeros(int(SR * 2.0))
    for k in range(3):
        tt = t_arr(.12); place(out, np.sin(2 * np.pi * 1200 * tt) * .25, k * .5)
    return out

def s_flatline(dur=1.6):
    tt = t_arr(dur)
    return np.sin(2 * np.pi * 1000 * tt) * np.interp(tt, [0, .02, dur - .2, dur], [0, .2, .2, 0])

def s_pop():
    tt = t_arr(.18)
    return np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .18], [600, 1300])) / SR) * np.exp(-tt * 28) * .5

def s_riser(dur=3.8):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, dur], [f, f * 2])) / SR) for f in (110, 165, 220))
    return reverb(x * (tt / dur) ** 2 * .08, 1.5, .3)

def s_stomp():
    tt = t_arr(1.2)
    x = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .15, 1.2], [70, 38, 30])) / SR) * np.exp(-tt * 6) * 1.2
    return reverb(np.tanh(x + lp(noise(1.2), 300) * np.exp(-tt * 12)), 1.6, .3) * .8

def s_stamp():
    tt = t_arr(.6)
    return reverb(np.sin(2 * np.pi * 90 * tt) * np.exp(-tt * 18) + bp(noise(.6), 600, 4000) * np.exp(-tt * 40) * .8, 1.0, .25) * .8

def s_asteroid(dur=1.6):
    tt = t_arr(dur)
    return (S.s_whoosh(dur, up=False) * 1.2 + lp(noise(dur), 400) * (tt / dur) ** 2 * .8)

def s_tick(dur=3.0):
    out = np.zeros(int(SR * dur))
    for k in np.arange(0, dur, 0.18):
        c = bp(noise(.015), 2500, 7000) * np.exp(-np.linspace(0, 10, int(SR * .015)))
        place(out, c, k, .6)
    return out

def s_ding():
    tt = t_arr(2.0)
    return reverb((np.sin(2 * np.pi * 1318.5 * tt) + .5 * np.sin(2 * np.pi * 1975.5 * tt)) * np.exp(-tt * 3) * .25, 1.8, .35)

def s_coins():
    out = np.zeros(int(SR * 1.2))
    for k in range(6):
        tt = t_arr(.2); f = rng.uniform(2200, 3600)
        place(out, np.sin(2 * np.pi * f * tt) * np.exp(-tt * 30) * .25, k * .12 + rng.uniform(0, .04))
    return out

def s_slurp():
    tt = t_arr(.8)
    return bp(noise(.8), 400, 2500) * (0.5 + 0.5 * np.sin(2 * np.pi * 14 * tt)) * np.interp(tt, [0, .1, .6, .8], [0, .5, .4, 0])

def s_bell(dur=4.0, f=392.0, g=1.0):
    tt = t_arr(dur)
    x = sum(a * np.sin(2 * np.pi * f * m * tt) * np.exp(-tt * d) for m, a, d in ((1, 1, .9), (2.0, .6, 1.3), (2.4, .5, 1.8), (3.0, .3, 2.4)))
    return reverb(x * .2 * g, 3.0, .4)

def s_coo():
    tt = t_arr(1.0)
    f = np.interp(tt, [0, .3, .6, 1], [420, 520, 380, 440])
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * (0.5 + 0.5 * np.sin(2 * np.pi * 6 * tt)) * np.interp(tt, [0, .1, .8, 1], [0, .3, .25, 0])
    return reverb(lp(x, 1600), 1.0, .3)

SFX = {
    "coo": s_coo,
    "tick": s_tick, "ding": s_ding, "coins": s_coins, "slurp": s_slurp, "bell": s_bell,
    "stomp": s_stomp, "stamp": s_stamp, "asteroid": s_asteroid,
    "roar": lambda: S.s_roar(2.6) * .7, "roar_small": lambda: lp(S.s_roar(1.8), 1800) * .45, "boom": lambda: S.s_boom(4.0) * .9,
    "pop": s_pop, "riser": s_riser, "sting": lambda: S.s_stinger() * .6,
    "whoosh": lambda: S.s_whoosh(.6) * .8,
    "record_scratch": s_scratch,
    "deep_hum": lambda: s_hum(6.2),
    "light_bend": s_bend,
    "stretch": s_stretch,
    "boing": s_boing,
    "radio_static": lambda: s_static(5.6),
    "beeps": s_beeps,
    "flatline": s_flatline,
    "hit": lambda: S.s_bass_hit() * .8,
}
ACCENTS = {"hit", "pop", "ding", "stomp"}

def build_sfx(scenes, accents_only=None):
    buf = np.zeros(N)
    if accents_only is not True:
        place(buf, s_hum(TOTAL) * .35, 0, .5)
    for s in scenes:
        for t, key in s["cues"]:
            if accents_only is not None and ((key in ACCENTS) != accents_only):
                continue
            if key in SFX:
                place(buf, SFX[key](), s["start"] + t, .9)
    return buf


# ---------------------------------------------------------------- original score: curious sci-fi arps (A minor → C major), 110 bpm
def blip(f, dur=.35, vel=1.0):
    tt = t_arr(dur)
    x = signal.square(2 * np.pi * f * tt, .3) * .5 + np.sin(2 * np.pi * f * tt)
    return lp(x, 2600) * np.exp(-tt * 9) * .07 * vel

def pad(freqs, dur, vel=1.0):
    tt = t_arr(dur)
    x = sum(signal.sawtooth(2 * np.pi * f * tt * d) for f in freqs for d in (1, 1.004))
    return lp(x, 1200) * np.interp(tt, [0, .6, dur - .6, dur], [0, 1, 1, 0]) * .018 * vel

def build_score(scenes):
    buf = np.zeros(N); tt = np.arange(N) / SR
    beat = 60 / 110
    chords = [[220.0, 261.63, 329.63], [174.61, 220.0, 261.63], [196.0, 246.94, 293.66], [261.63, 329.63, 392.0]]
    t, k = 0.2, 0
    while t < TOTAL - 1.0:
        ch = chords[(k // 8) % 4]
        if k % 8 == 0: place(buf, pad(ch, beat * 4.2, 1.0), t)
        place(buf, blip(ch[k % 3] * 2, .3, .9 if k % 2 == 0 else .6), t)
        if k % 4 == 0: place(buf, S.taiko() * .22, t)
        t += beat / 2; k += 1
    place(buf, pad([261.63, 329.63, 392.0, 523.25], 2.4, 1.4), TOTAL - 2.4)
    buf *= np.interp(tt, [0, .2, TOTAL - .5, TOTAL - .05], [0, 1, 1, 0])
    return reverb(buf, 1.8, .3)


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
