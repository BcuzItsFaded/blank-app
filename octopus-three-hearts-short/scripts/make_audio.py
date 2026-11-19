#!/usr/bin/env python3
"""Build the audio for the DAY 1 octopus facts Short from src/scenes.json.

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


# ---------------------------------------------------------------- sound design (bright, playful)
def s_pop(f0=600):
    tt = t_arr(.18)
    return np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .18], [f0, f0 * 2.2])) / SR) * np.exp(-tt * 28) * .5

def s_pop3():
    out = np.zeros(int(SR * 1.0))
    for k, f in enumerate((520, 660, 820)):
        place(out, s_pop(f), k * .22)
    return out

def s_bubbles2(dur=3.0):
    out = np.zeros(int(SR * dur))
    for _ in range(int(dur * 10)):
        d = rng.uniform(.04, .1); t2 = t_arr(d); f = rng.uniform(500, 1500)
        place(out, np.sin(2 * np.pi * f * t2 * (1 + t2 * 14)) * np.exp(-t2 / d * 3) * rng.uniform(.08, .2), rng.uniform(0, dur - .12))
    return out

def s_thump():
    tt = t_arr(.35)
    return np.sin(2 * np.pi * 60 * tt * (1 + 1.2 * np.exp(-tt * 25))) * np.exp(-tt * 14) * 1.2

def s_beats(n, gap=.32):
    out = np.zeros(int(SR * (n * gap + .5)))
    for k in range(n):
        place(out, s_thump(), k * gap)
    return lp(out, 400)

def s_scan(dur=1.2):
    tt = t_arr(dur)
    x = np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, dur], [400, 1800])) / SR) * .15 + bp(noise(dur), 2000, 6000) * .05
    return x * np.sin(np.pi * tt / dur)

def s_flow(dur=7.5):
    tt = t_arr(dur)
    return lp(noise(dur), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 1.6 * tt) ** 2) * .12

def s_riser(dur=2.2):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, dur], [f, f * 2])) / SR) for f in (220, 330, 440))
    return reverb(x * (tt / dur) ** 2 * .08, 1.5, .3)

def s_sparkle(dur=1.6):
    out = np.zeros(int(SR * dur))
    for k in range(14):
        d = .25; t2 = t_arr(d); f = rng.choice([1568, 1760, 2093, 2349, 2637])
        place(out, np.sin(2 * np.pi * f * t2) * np.exp(-t2 * 14) * .12, k * .08 + rng.uniform(0, .03))
    return reverb(out, 1.6, .4)

def s_ding():
    tt = t_arr(2.0)
    return reverb((np.sin(2 * np.pi * 1318.5 * tt) + .5 * np.sin(2 * np.pi * 1975.5 * tt)) * np.exp(-tt * 3) * .25, 1.8, .35)

SFX = {
    "whoosh": lambda: S.s_whoosh(.6) * .8,
    "pop3": s_pop3, "pop1": lambda: s_pop(700),
    "bubbles": lambda: s_bubbles2(3.0),
    "scan": s_scan,
    "beat3": lambda: s_beats(3), "beat2": lambda: s_beats(2), "beat1": lambda: s_beats(1),
    "flow": lambda: s_flow(7.5),
    "riser": s_riser, "sparkle": s_sparkle, "ding": s_ding,
}
ACCENTS = {"pop3", "pop1", "beat3", "beat2", "beat1", "sparkle", "ding"}

def build_sfx(scenes, accents_only=None):
    buf = np.zeros(N)
    if accents_only is not True:   # gentle underwater bed with occasional bubbles
        bed = lp(noise(TOTAL), 300) * .25 + s_bubbles2(TOTAL) * .4
        place(buf, bed * np.interp(t_arr(TOTAL), [0, .5, TOTAL - 1, TOTAL], [0, 1, 1, 0]), 0, .5)
    for s in scenes:
        for t, key in s["cues"]:
            if accents_only is not None and ((key in ACCENTS) != accents_only):
                continue
            if key in SFX:
                place(buf, SFX[key](), s["start"] + t, .9)
    return buf


# ---------------------------------------------------------------- original score: bright marimba groove (C major pentatonic, 112 bpm)
def marimba(f, dur=0.9, vel=1.0):
    tt = t_arr(dur)
    x = np.sin(2 * np.pi * f * tt) * np.exp(-tt * 7) + .35 * np.sin(2 * np.pi * f * 4.0 * tt) * np.exp(-tt * 22)
    return x * .22 * vel

def build_score(scenes):
    buf = np.zeros(N); tt = np.arange(N) / SR
    beat = 60 / 112
    mel = [523.25, 659.26, 783.99, 659.26, 587.33, 783.99, 880.0, 783.99, 659.26, 587.33, 523.25, 587.33]
    bass = [130.81, 130.81, 174.61, 196.0]
    t, k = 0.2, 0
    while t < TOTAL - 1.0:
        if k % 2 == 0 or t > 18:
            place(buf, marimba(mel[k % len(mel)], vel=.8), t)
        if k % 4 == 0:
            place(buf, marimba(bass[(k // 4) % 4], 1.4, 1.1), t)
            place(buf, S.taiko() * .25, t)
        t += beat / 2; k += 1
    place(buf, marimba(1046.5, 2.0, 1.0) + marimba(783.99, 2.0, .8), TOTAL - 2.4)   # final chord
    buf *= np.interp(tt, [0, .2, TOTAL - .8, TOTAL - .05], [0, 1, 1, 0])
    return reverb(buf, 1.4, .2)


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
