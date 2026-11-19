#!/usr/bin/env python3
"""Build the audio for the DAY 1 #2 black hole facts Short from src/scenes.json.

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

SFX = {
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
ACCENTS = {"record_scratch", "boing", "beeps", "flatline", "hit"}

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


# ---------------------------------------------------------------- original score: dark synth pulse (D minor, 100 bpm)
def synth_note(f, dur, vel=1.0):
    tt = t_arr(dur)
    x = signal.sawtooth(2 * np.pi * f * tt) + signal.sawtooth(2 * np.pi * f * 1.006 * tt)
    return lp(x, 900 + 600 * vel) * np.interp(tt, [0, .01, dur * .6, dur], [0, 1, .4, 0]) * .05 * vel

def build_score(scenes):
    buf = np.zeros(N); tt = np.arange(N) / SR
    beat = .6
    bass = [73.42, 73.42, 58.27, 65.41]
    arp = [293.66, 349.23, 440.0, 587.33, 440.0, 349.23]
    t, k = 0.2, 0
    while t < TOTAL - 1.6:
        place(buf, synth_note(bass[(k // 8) % 4], beat * 1.8, 1.2), t) if k % 2 == 0 else None
        if t > 5.0:
            place(buf, synth_note(arp[k % len(arp)], beat * .8, .7), t)
        if k % 4 == 0 and t > 11.5:
            place(buf, S.taiko() * .3, t)
        t += beat / 2; k += 1
    place(buf, S.strings([146.83, 174.61, 220.0], 6.0, 1.0) if hasattr(S, "strings") else S.s_minor_chord(6.0), 21.7)
    buf *= np.interp(tt, [0, .2, TOTAL - .6, TOTAL - .05], [0, 1, 1, 0])
    return reverb(buf, 2.0, .3)


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
