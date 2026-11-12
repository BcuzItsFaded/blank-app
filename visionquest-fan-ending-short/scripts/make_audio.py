#!/usr/bin/env python3
"""Build the audio for the VisionQuest fan-made post-credits Short from src/scenes.json.

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
                    spk = meta["speakers"][l["speaker"]]
                    x = trim(piper(spoken[k], os.path.join(ROOT, spk["voice"]), ls))
                    if spk.get("fx") == "doom": x = doom_voice(x)
                    clips.append((x, "piper"))
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


def doom_voice(x):
    """Deeper, metallic 'voice inside an iron mask' (pitch −4 semitones, comb resonance, grit)."""
    x = signal.resample_poly(x, 126, 100)          # ~ -4 semitones (and 26% slower)
    d = int(SR * 0.0042)
    y = x.copy(); y[d:] += 0.55 * x[:-d]           # comb filter: metal mask resonance
    d2 = int(SR * 0.0071); y[d2:] += 0.3 * x[:-d2]
    y = np.tanh(y * 1.8) * 0.7 + 0.3 * y
    y = lp(y, 5200) + 0.25 * bp(y, 900, 1800)
    return reverb(y, 1.2, 0.18, 4500)

# ---------------------------------------------------------------- sound design
def s_snow_step(heavy=False):
    tt = t_arr(.45)
    x = bp(noise(.45), 600, 5000) * np.interp(tt, [0, .02, .12, .45], [0, 1, .4, 0]) * .5
    if heavy:
        x += np.sin(2 * np.pi * 70 * tt) * np.exp(-tt * 18) * .8
        x += sum(np.sin(2 * np.pi * f * tt) * np.exp(-tt * 30) for f in (820, 1430, 2210)) * .08   # armour clink
    return reverb(x, 1.4, .3)

def s_magic(dur=2.5, green=True):
    tt = t_arr(dur)
    base = 220 if green else 330
    sweep = np.interp(tt, [0, dur], [base, base * 3])
    x = sum(np.sin(2 * np.pi * np.cumsum(sweep * m * (1 + .004 * np.sin(2 * np.pi * 6 * tt))) / SR) / m for m in (1, 1.5, 2, 3))
    shimmer = hp(noise(dur), 5000) * (rng.random(len(tt)) > .97) * 1.5
    return reverb((x * .12 + shimmer * .2) * np.interp(tt, [0, .3, dur - .5, dur], [0, 1, 1, 0]), 2.5, .45)

def s_rock(dur=1.6):
    out = lp(noise(dur), 900, 4) * env_ad(int(SR * dur), .01, dur, 4) * 1.5
    for _ in range(14):
        c = bp(noise(.05), 300, 3000) * np.exp(-np.linspace(0, 9, int(SR * .05)))
        place(out, c, rng.uniform(.05, dur - .1), rng.uniform(.2, .6))
    return reverb(out, 2.0, .3)

def s_gasp():
    tt = t_arr(.6)
    return bp(noise(.6), 700, 4000) * np.interp(tt, [0, .08, .3, .6], [0, 1, .4, 0]) * .45

def s_vision_hum(dur=5.0):
    tt = t_arr(dur)
    x = sum(np.sin(2 * np.pi * f * tt + .3 * np.sin(2 * np.pi * .5 * tt)) for f in (110, 165, 220.5, 440.7)) * .05
    return reverb(x * np.interp(tt, [0, 1, dur - 1, dur], [0, 1, 1, 0]), 3, .5)

SFX = {
    "credits_drone": lambda: S.s_drone(5.0, 55.0) * .8,
    "whoosh": lambda: S.s_whoosh(.6) * .8,
    "wind": lambda: S.s_wind(5.2) * .9,
    "snow_crunch_far": lambda: lp(s_snow_step(), 1500) * .4,
    "rumble": lambda: lp(noise(4.5), 120, 4) * 2.0 * np.interp(t_arr(4.5), [0, 1, 4.5], [0, 1, .2]),
    "rock_fall": lambda: s_rock(1.8),
    "impact": S.s_bass_hit,
    "heartbeat": lambda: S.s_heartbeat(54, 5.0) * .9,
    "heartbeat_weak": lambda: S.s_heartbeat(44, 5.0) * .6,
    "magic_flicker": lambda: s_magic(2.0, green=False) * .7,
    "armored_step": lambda: s_snow_step(heavy=True),
    "doom_sting": lambda: S.s_stinger() * .8,
    "choir_low": lambda: S.choir([73.42, 110.0, 146.83], 5.0) * 1.3,
    "cloak": lambda: bp(noise(1.0), 300, 3000) * np.sin(np.pi * t_arr(1.0)) * .35,
    "magic_charge": lambda: s_magic(2.6, green=True),
    "stone_lift": lambda: lp(noise(3.4), 160, 4) * 2.2 * np.interp(t_arr(3.4), [0, 1, 3.4], [0, 1, .3]) + np.pad(s_rock(1.2) * .4, (0, int(SR * 3.4) - int(SR * 1.2))),
    "debris": lambda: s_rock(1.4) * .6,
    "kneel": lambda: s_snow_step(heavy=True) * .8,
    "runes": lambda: s_magic(2.0, green=True) * .8,
    "gasp": s_gasp,
    "red_flare": lambda: s_magic(1.6, green=False) * .9,
    "choir_swell": lambda: S.choir([58.27, 87.31, 116.54, 146.83], 4.8) * 1.4,
    "boom": S.s_impact,
    "vision_hum": s_vision_hum,
    "title_hit": lambda: S.s_impact() * .8,
}
ACCENTS = {"impact", "doom_sting", "gasp", "boom", "title_hit", "whoosh"}

def build_sfx(scenes, accents_only=None):
    buf = np.zeros(N)
    if accents_only is not True:
        place(buf, S.s_wind(TOTAL) * np.interp(t_arr(TOTAL), [0, 4.5, 5, 54, 55, 60], [0, 0, .5, .5, .15, 0]), 0, .6)
    for s in scenes:
        for t, key in s["cues"]:
            if accents_only is not None and ((key in ACCENTS) != accents_only):
                continue
            if key in SFX:
                place(buf, SFX[key](), s["start"] + t, .9)
    return buf


# ---------------------------------------------------------------- original score: dark strings + choir
def strings(freqs, dur, vel=1.0):
    tt = t_arr(dur); out = np.zeros_like(tt)
    for f in freqs:
        for d in (0.996, 1.0, 1.005):
            ph = 2 * np.pi * np.cumsum(f * d * (1 + .003 * np.sin(2 * np.pi * 5.2 * tt + f))) / SR
            out += signal.sawtooth(ph)
    out = lp(out, 1600) * np.interp(tt, [0, .8, dur - 1, dur], [0, 1, .9, 0])
    return out * .025 * vel

def build_score(scenes):
    buf = np.zeros(N); tt = np.arange(N) / SR
    # D minor: Dm – Bb – Gm – A ; Doom section darker (Ebm colour), Vision ending resolves to D major
    prog = [
        (0, 5, [146.83, 174.61, 220.0], .6), (5, 5, [116.54, 146.83, 174.61], .7), (10, 5, [98.0, 116.54, 146.83], .9),
        (15, 5, [110.0, 138.59, 164.81], .7), (20, 5, [77.78, 116.54, 155.56], .9), (25, 5, [77.78, 92.5, 116.54], 1.0),
        (30, 5, [73.42, 110.0, 146.83], 1.1), (35, 5, [116.54, 146.83, 174.61], .8), (40, 5, [98.0, 116.54, 146.83], 1.0),
        (45, 5, [110.0, 138.59, 164.81], .9), (50, 5, [77.78, 116.54, 155.56], 1.3), (55, 5, [146.83, 185.0, 220.0], 1.0),
    ]
    for st, d, fr, v in prog:
        place(buf, strings(fr, d + 1.2, v), st - .3 if st else 0)
        place(buf, strings([fr[0] / 2], d + 1.2, v * 1.4), st - .3 if st else 0)
    # slow piano motif (original) over the first half
    for t, f in ((0.4, 587.33), (1.6, 523.25), (2.8, 440.0), (5.4, 466.16), (6.6, 440.0), (7.8, 349.23), (15.4, 440.0), (16.6, 415.3), (36.4, 349.23), (37.6, 293.66)):
        place(buf, S.piano(f, 3.0, .8), t)
    # taiko pulses for the Doom section
    for k in np.arange(20.0, 35.0, 1.0):
        place(buf, S.taiko(big=int(k) % 2 == 0), k, .45)
    for k in np.arange(50.0, 54.5, 0.5):
        place(buf, S.taiko(big=True), k, .3 + .06 * (k - 50))
    buf *= np.interp(tt, [0, .2, 59.2, 59.95], [0, 1, 1, 0])
    return reverb(buf, 2.6, .3)


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
