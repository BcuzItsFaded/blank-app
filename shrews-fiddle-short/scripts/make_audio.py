#!/usr/bin/env python3
"""Build the audio for the DAY 1 #3 shrew's fiddle facts Short from src/scenes.json.

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
        if not lines:   # silent scene (e.g. end card)
            out.append({"id": s["id"], "start": s["start"], "dur": s["dur"], "lines": []}); continue
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


# ---------------------------------------------------------------- sound design (medieval town square)
def s_crowd(dur=7.5, g=1.0):
    tt = t_arr(dur); out = bp(noise(dur), 250, 1400) * (0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 2.3 * tt))) * .12
    return out * g * np.interp(tt, [0, .5, dur - .5, dur], [0, 1, 1, 0])

def s_babble(dur, f0, rate=7.0, g=.25):
    """gibberish 'arguing' voice: formant-filtered buzz with syllable gating (original synthesis)"""
    tt = t_arr(dur)
    pitch = f0 * (1 + .25 * np.sin(2 * np.pi * 1.7 * tt) + .1 * np.sin(2 * np.pi * 5.3 * tt))
    src = signal.sawtooth(2 * np.pi * np.cumsum(pitch) / SR)
    syl = (0.5 + 0.5 * np.sin(2 * np.pi * rate * tt + np.sin(2 * np.pi * .9 * tt) * 3)) ** 2
    v = bp(src, 500, 1100) + .7 * bp(src, 1300, 2600)
    return v * syl * g * np.interp(tt, [0, .1, dur - .2, dur], [0, 1, 1, 0])

def s_bicker():
    out = np.zeros(int(SR * 4.2))
    place(out, s_babble(1.6, 330), 0); place(out, s_babble(1.4, 260, 8), 1.5); place(out, s_babble(1.2, 340, 9), 2.8)
    return reverb(out, 1.2, .25)

def s_clack():
    tt = t_arr(.6)
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * d) for f, d in ((180, 30), (420, 40), (760, 55)))
    x += bp(noise(.6), 800, 4000) * np.exp(-tt * 60)
    return reverb(x * .6, 1.0, .25)

def s_laugh(dur=2.0):
    out = np.zeros(int(SR * dur))
    for k in range(5):
        place(out, s_babble(.9, rng.uniform(180, 320), 11, .12), rng.uniform(0, dur - 1))
    return reverb(out, 1.4, .3)

def s_chime():
    tt = t_arr(2.0)
    x = sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 2.5) for f in (659.26, 830.6, 987.77))
    return reverb(x * .12, 2.0, .4)

def s_unlock():
    out = np.zeros(int(SR * .8))
    for t0 in (0, .18, .32):
        c = bp(noise(.04), 1500, 6000) * np.exp(-np.linspace(0, 10, int(SR * .04)))
        place(out, c, t0, .7)
    return out + np.pad(s_clack()[: int(SR * .5)] * .5, (int(SR * .3), 0))[: len(out)]

def s_pop():
    tt = t_arr(.18)
    return np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .18], [600, 1300])) / SR) * np.exp(-tt * 28) * .5

def s_ding():
    tt = t_arr(2.0)
    return reverb((np.sin(2 * np.pi * 1318.5 * tt) + .5 * np.sin(2 * np.pi * 1975.5 * tt)) * np.exp(-tt * 3) * .25, 1.8, .35)

SFX = {
    "crowd": lambda: s_crowd(7.8), "bicker": s_bicker, "clack": s_clack, "crowd_laugh": s_laugh,
    "grumble": lambda: reverb(s_babble(1.4, 200, 5, .15), 1.0, .2), "chime": s_chime, "unlock": s_unlock, "pop": s_pop, "ding": s_ding,
}
ACCENTS = {"clack", "chime", "unlock", "pop", "ding"}

def build_sfx(scenes, accents_only=None):
    buf = np.zeros(N)
    if accents_only is not True:
        place(buf, s_crowd(TOTAL, .6), 0, .5)
    for s in scenes:
        for t, key in s["cues"]:
            if accents_only is not None and ((key in ACCENTS) != accents_only):
                continue
            if key in SFX:
                place(buf, SFX[key](), s["start"] + t, .9)
    return buf


# ---------------------------------------------------------------- original score: lute + recorder in D dorian, playful
def lute(f, dur=1.4, vel=1.0):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * f * h * tt) * np.exp(-tt * (3 + h * 1.6)) / h for h in range(1, 7))
    return x * .2 * vel

def recorder(f, dur, vel=1.0):
    tt = t_arr(dur)
    x = np.sin(2 * np.pi * f * tt * (1 + .004 * np.sin(2 * np.pi * 5 * tt))) + .2 * np.sin(4 * np.pi * f * tt) + bp(noise(dur), 1000, 4000) * .03
    return x * np.interp(tt, [0, .05, dur - .08, dur], [0, 1, .8, 0]) * .07 * vel

def build_score(scenes):
    buf = np.zeros(N); tt = np.arange(N) / SR
    beat = 60 / 120
    D = {"D": 293.66, "E": 329.63, "F": 349.23, "G": 392.0, "A": 440.0, "B": 493.88, "C": 523.25, "d": 587.33}
    bassline = [146.83, 146.83, 130.81, 146.83, 174.61, 196.0, 146.83, 110.0]
    tune = "DFAGFEDE" + "FAdCAGFG" + "AdCBAGFE" + "DFAGFEDD"
    t, k = 0.25, 0
    while t < TOTAL - 1.2:
        if k % 2 == 0: place(buf, lute(bassline[(k // 2) % len(bassline)], 1.2, 1.0), t)
        place(buf, lute([146.83, 220.0, 293.66][k % 3] * 2, .8, .5), t + beat / 4)
        if t > 8.0:
            place(buf, recorder(D[tune[k % len(tune)]], beat * .9, .9 if 16 < t < 24 else .7), t)
        t += beat / 2; k += 1
    place(buf, lute(293.66, 2.5, 1.2) + lute(440.0, 2.5, 1.0) + lute(587.33, 2.5, .9), TOTAL - 2.3)
    buf *= np.interp(tt, [0, .2, TOTAL - .6, TOTAL - .05], [0, 1, 1, 0])
    return reverb(buf, 1.6, .25)


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
