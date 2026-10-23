#!/usr/bin/env python3
"""Narrate the script with Kokoro (am_michael, Apache 2.0) and time every word with Whisper.

    python tools/narrate.py            → assets/voice.wav + assets/timing.json

Each section is synthesized on its own; its start in the timeline = previous end + gap, and Whisper
(run on that section alone) gives word timestamps that are aligned back to the display text.
"""
import difflib, json, os, re, subprocess
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SR = 24000
SECTIONS = json.load(open(f"{ROOT}/assets/script.json"))
# pronunciation help for the TTS only (subtitles keep the real spelling)
SAY = {"Renesmee": "Ruh-nez-may", "Volturi": "Vol-too-ree", "Forks, Washington": "Forks, Washington"}
LEAD, GAP_BEFORE, TAIL = 0.6, 0.55, 0.85  # first scene lead-in; silence before speech; hold after


def tts_text(t):
    for k, v in SAY.items(): t = t.replace(k, v)
    return t


def main():
    from kokoro_onnx import Kokoro
    from faster_whisper import WhisperModel
    k = Kokoro(os.path.expanduser("~/.cache/kokoro/kokoro-v1.0.onnx"), os.path.expanduser("~/.cache/kokoro/voices-v1.0.bin"))
    asr = WhisperModel("small.en", device="cpu", compute_type="int8")
    norm = lambda w: re.sub(r"[^a-z0-9]", "", w.lower())
    track, out, t = [], [], 0.0
    for i, sec in enumerate(SECTIONS):
        audio, sr = k.create(tts_text(sec["text"]), voice="am_michael", speed=1.0, lang="en-us")
        audio = np.asarray(audio, np.float32)
        start = t
        speech0 = start + (LEAD if i == 0 else GAP_BEFORE)
        pad = int(round((speech0 - t) * SR))
        track += [np.zeros(pad, np.float32), audio, np.zeros(int(TAIL * SR), np.float32)]
        end = speech0 + len(audio) / SR + TAIL
        # word timing
        a16 = np.interp(np.arange(0, len(audio), SR / 16000), np.arange(len(audio)), audio).astype(np.float32)
        segs, _ = asr.transcribe(a16, word_timestamps=True, language="en")
        heard = [(w.word.strip(), w.start, w.end) for s in segs for w in s.words]
        disp = sec["text"].split()
        sm = difflib.SequenceMatcher(None, [norm(tts_text(w)) for w in disp], [norm(h[0]) for h in heard], autojunk=False)
        times = [None] * len(disp)
        for blk in sm.get_matching_blocks():
            for d in range(blk.size): times[blk.a + d] = heard[blk.b + d][1:]
        # fill the words Whisper heard differently by interpolation
        for j in range(len(disp)):
            if times[j] is None:
                lo = next((times[q][1] for q in range(j - 1, -1, -1) if times[q]), 0.0)
                hi_i = next((q for q in range(j + 1, len(disp)) if times[q]), None)
                hi = times[hi_i][0] if hi_i is not None else len(audio) / SR
                n = (hi_i if hi_i is not None else len(disp)) - j + 1
                times[j] = (lo, lo + (hi - lo) / max(1, n))
        words = [[w, round(speech0 + s, 3), round(speech0 + e, 3)] for w, (s, e) in zip(disp, times)]
        out.append({"id": sec["id"], "title": sec.get("title", ""), "start": round(start, 3), "end": round(end, 3),
                    "speech": [round(speech0, 3), round(speech0 + len(audio) / SR, 3)], "words": words})
        matched = sum(b.size for b in sm.get_matching_blocks()) / len(disp)
        print(f"{sec['id']:>3}  {start:6.2f}-{end:6.2f}s  speech {len(audio) / SR:5.2f}s  words matched {matched:.0%}")
        t = end
    wav = np.concatenate(track)
    raw = f"{ROOT}/assets/voice.f32"; wav.tofile(raw)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", raw,
                    "-af", "highpass=f=70,acompressor=threshold=-20dB:ratio=3:attack=5:release=120,loudnorm=I=-16:TP=-1.5:LRA=11",
                    "-ar", "48000", "-ac", "2", f"{ROOT}/assets/voice.wav"], check=True)
    os.remove(raw)
    json.dump({"duration": round(t, 3), "sections": out}, open(f"{ROOT}/assets/timing.json", "w"), indent=1)
    print(f"total {t:.1f}s")


if __name__ == "__main__":
    main()
