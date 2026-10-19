"""Generate the narration with Kokoro TTS and write per-word timings.

Usage: python narration.py <models_dir> <out_dir>
Writes <out_dir>/narration.wav and <out_dir>/timing.json.
"""
import json
import sys

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from kokoro_onnx.tokenizer import Tokenizer

VOICE = "am_michael"
SPEED = 1.12
SR = 24000
SENTENCE_GAP = 0.10
PARAGRAPH_GAP = 0.32
LEAD_IN = 0.25

# One inner list per paragraph; each string is spoken as one TTS call.
PARAGRAPHS = [
    ["Street Fighter's ending brings back a fighter Ryu already beat once.",
     "And you only see him if you stay for the credits."],
    ["Spoilers from here."],
    ["1987.",
     "Ryu wins the first World Warrior tournament using the Dark Hadou.",
     "Akuma wants that power, so he kills Ryu's master, Gouken, to drag it back out."],
    ["Six years later, M. Bison hosts a second tournament.",
     "It's bait.",
     "He wants Ryu strapped into a machine that drains his power."],
    ["Then Ryu confesses.",
     "He tore up Ken's invitation to that first tournament.",
     "Pure jealousy.",
     "The brothers fight, and Ken loses."],
    ["Ken never shows up for the final, so Joe, played by UFC star Alexander Volkanovski, wins by forfeit.",
     "Akuma walks in and finishes him in seconds."],
    ["Ryu goes Dark Ryu.",
     "He beats Akuma, then turns on his own friends.",
     "Nobody can stop him until Ken throws a flaming Hadouken he's never pulled off before."],
    ["Then the twist hits.",
     "Bison's soldiers carry off Akuma's unconscious body, and Cammy blows up Chun-Li's van to cover the escape.",
     "Bison's new plan is to steal Akuma's power instead of Ryu's."],
    ["Now the mid-credits scene.",
     "It's animated.",
     "A man with an eyepatch and a huge scar across his chest is training.",
     "Bison walks up with Vega, Cammy and Juli."],
    ["That's Sagat, the fighter Ryu beat in 1987.",
     "In the games, he's Bison's bodyguard, and Ryu's Shoryuken gave him that scar."],
    ["He's animated, probably because nobody's been cast as Sagat yet.",
     "So who should play him?",
     "Tell me in the comments."],
]

# Spoken forms that espeak otherwise reads oddly ("nineteen hundred eighty seven").
TEXT_FIXES = [
    ("1987", "nineteen eighty-seven"),
    ("M. Bison", "Em Bison"),
]

# espeak's guesses for the Japanese names, corrected to how fans say them.
PHONEME_FIXES = [
    ("vˈiːɡə", "vˈeɪɡə"),           # Vega
    ("hˈædaʊkən", "hɑːdˈoʊkɛn"),   # Hadouken
    ("hˈæduː", "hɑːdˈoʊ"),          # Hadou
    ("ʃˈɔːɹjuːkən", "ʃˌoʊɹjˈuːkɛn"),  # Shoryuken
    ("ɡˈaʊkən", "ɡˈoʊkɛn"),         # Gouken
    ("tʃˈʌnlˈaɪ", "tʃˈʌn lˈiː"),     # Chun-Li
    ("ækˈuːmə", "ɑːkˈuːmə"),        # Akuma
    ("ɹˈaɪuː", "ɹjˈuː"),            # Ryu
]


def spoken(text):
    for written, said in TEXT_FIXES:
        text = text.replace(written, said)
    return text


def fix(phonemes):
    for wrong, right in PHONEME_FIXES:
        phonemes = phonemes.replace(wrong, right)
    return phonemes


def main(models_dir, out_dir):
    kokoro = Kokoro(f"{models_dir}/kokoro-v1.0.onnx", f"{models_dir}/voices-v1.0.bin")
    tok = Tokenizer()

    pieces = [np.zeros(int(LEAD_IN * SR), dtype=np.float32)]
    t = LEAD_IN
    sentences = []
    for p_idx, para in enumerate(PARAGRAPHS):
        for s_idx, text in enumerate(para):
            ph = fix(tok.phonemize(spoken(text), "en-us"))
            audio, sr = kokoro.create(ph, voice=VOICE, speed=SPEED, is_phonemes=True)
            assert sr == SR
            audio = trim(audio.astype(np.float32))
            dur = len(audio) / SR

            # Spread the sentence's duration over its words by phoneme count.
            words = text.split()
            weights = [max(1, len(tok.phonemize(spoken(w.strip(".,?!")), "en-us"))) for w in words]
            total = sum(weights)
            cursor = t
            word_times = []
            for w, wt in zip(words, weights):
                span = dur * wt / total
                word_times.append({"w": w, "start": round(cursor, 3), "end": round(cursor + span, 3)})
                cursor += span

            sentences.append({"para": p_idx, "idx": s_idx, "text": text,
                              "start": round(t, 3), "end": round(t + dur, 3), "words": word_times})
            pieces.append(audio)
            t += dur
            last = s_idx == len(para) - 1
            gap = PARAGRAPH_GAP if last else SENTENCE_GAP
            pieces.append(np.zeros(int(gap * SR), dtype=np.float32))
            t += int(gap * SR) / SR

    pieces.append(np.zeros(int(0.6 * SR), dtype=np.float32))
    full = np.concatenate(pieces)
    full = full / max(1e-6, np.abs(full).max()) * 0.89
    sf.write(f"{out_dir}/narration.wav", full, SR)
    with open(f"{out_dir}/timing.json", "w") as f:
        json.dump({"duration": round(len(full) / SR, 3), "sentences": sentences}, f, indent=1)
    print(f"narration: {len(full) / SR:.1f}s, {len(sentences)} sentences")


def trim(audio, thresh=0.01):
    """Cut leading/trailing near-silence so our own gaps control the pacing."""
    idx = np.where(np.abs(audio) > thresh)[0]
    if len(idx) == 0:
        return audio
    a = max(0, idx[0] - int(0.02 * SR))
    b = min(len(audio), idx[-1] + int(0.05 * SR))
    return audio[a:b]


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
