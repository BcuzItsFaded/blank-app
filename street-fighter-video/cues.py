"""Shared timeline: sentence/word timings and the named cues audio and video sync to."""
import difflib
import json
import os
import re

BUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), "build")


def _norm(word):
    return re.sub(r"[^a-z0-9]", "", word.lower())


def _load():
    with open(os.path.join(BUILD, "timing.json")) as f:
        timing = json.load(f)
    asr_path = os.path.join(BUILD, "asr.json")
    asr = json.load(open(asr_path)) if os.path.exists(asr_path) else []
    for s in timing["sentences"]:
        _refine(s, asr)
    return timing


def _refine(sentence, asr):
    """Snap word times to Whisper's where it heard the same word; keep the
    phoneme-proportional estimate elsewhere. Sentence bounds are exact."""
    lo, hi = sentence["start"], sentence["end"]
    heard = [a for a in asr if lo - 0.3 <= a["start"] <= hi + 0.1]
    words = sentence["words"]
    sm = difflib.SequenceMatcher(a=[_norm(w["w"]) for w in words],
                                 b=[_norm(a["w"]) for a in heard], autojunk=False)
    for block in sm.get_matching_blocks():
        for k in range(block.size):
            w, a = words[block.a + k], heard[block.b + k]
            w["start"] = min(max(a["start"], lo), hi)
            w["end"] = min(max(a["end"], w["start"] + 0.05), hi)
    # Keep starts monotonic; each word lasts until the next begins.
    for i in range(1, len(words)):
        words[i]["start"] = max(words[i]["start"], words[i - 1]["start"] + 0.04)
    for i, w in enumerate(words):
        w["end"] = words[i + 1]["start"] if i + 1 < len(words) else hi


TIMING = _load()
DURATION = TIMING["duration"]
SENTENCES = TIMING["sentences"]


def sent(para, idx=0):
    for s in SENTENCES:
        if s["para"] == para and s["idx"] == idx:
            return s
    raise KeyError((para, idx))


def para_start(para):
    return sent(para, 0)["start"]


def w(para, idx, word, nth=0):
    """Start time of the nth word in sentence (para, idx) beginning with `word`."""
    target = _norm(word)
    hits = [x for x in sent(para, idx)["words"] if _norm(x["w"]).startswith(target)]
    return hits[nth]["start"]


# Scene boundaries: one scene per narration paragraph.
SCENES = ["hook", "spoilers", "flashback", "trap", "confession", "final",
          "darkryu", "twist", "credits", "sagat", "cta"]
SCENE_START = {name: (0.0 if i == 0 else para_start(i) - 0.12) for i, name in enumerate(SCENES)}

CUE = {
    "title": 0.25,
    "mystery": w(0, 0, "fighter", 1),
    "stay": w(0, 1, "credits"),
    "spoilers": para_start(1),
    "y1987": para_start(2),
    "ryu_wins": w(2, 1, "Ryu"),
    "dark_hadou": w(2, 1, "Dark"),
    "akuma": w(2, 2, "Akuma"),
    "kills": w(2, 2, "kills"),
    "six_years": para_start(3),
    "bison": w(3, 0, "Bison"),
    "bait": w(3, 1, "bait"),
    "machine": w(3, 2, "machine"),
    "drains": w(3, 2, "drains"),
    "confess": para_start(4),
    "invite": w(4, 1, "invitation"),
    "tore": w(4, 1, "tore"),
    "jealousy": w(4, 2, "Pure"),
    "vs": w(4, 3, "brothers"),
    "ken_loses": w(4, 3, "loses"),
    "final": para_start(5),
    "joe": w(5, 0, "Joe"),
    "forfeit": w(5, 0, "forfeit"),
    "akuma_walks": w(5, 1, "Akuma"),
    "seconds": w(5, 1, "seconds"),
    "dark_ryu": para_start(6),
    "beats_akuma": w(6, 1, "beats"),
    "friends": w(6, 1, "friends"),
    "nobody": w(6, 2, "Nobody"),
    "hadouken": w(6, 2, "flaming"),
    "hadouken_hit": w(6, 2, "before"),
    "twist": para_start(7),
    "body": w(7, 1, "Bison"),
    "cammy": w(7, 1, "Cammy"),
    "blows": w(7, 1, "blows"),
    "plan": w(7, 2, "Bison"),
    "instead": w(7, 2, "instead"),
    "credits": para_start(8),
    "animated": w(8, 1, "animated"),
    "man": w(8, 2, "man"),
    "eyepatch": w(8, 2, "eyepatch"),
    "scar": w(8, 2, "scar"),
    "bison_walks": w(8, 3, "Bison"),
    "vega": w(8, 3, "Vega"),
    "cammy2": w(8, 3, "Cammy"),
    "juli": w(8, 3, "Juli"),
    "sagat": para_start(9),
    "beat1987": w(9, 0, "1987"),
    "bodyguard": w(9, 1, "bodyguard"),
    "shoryuken": w(9, 1, "Shoryuken"),
    "cta": para_start(10),
    "cast": w(10, 0, "cast"),
    "who": w(10, 1, "who"),
    "comments": w(10, 2, "Tell"),
}


def caption_chunks(max_words=3, max_chars=20):
    """Group words into short caption chunks that never cross a sentence."""
    chunks = []
    for s in SENTENCES:
        cur = []
        for i, word in enumerate(s["words"]):
            cur.append(word)
            text = " ".join(x["w"] for x in cur)
            last = i == len(s["words"]) - 1
            nxt = s["words"][i + 1]["w"] if not last else ""
            if (last or len(cur) >= max_words or len(text) + len(nxt) + 1 > max_chars
                    or (word["w"][-1] in ",.?!" and word["w"] != "M.")):
                chunks.append({"words": cur, "start": cur[0]["start"], "end": cur[-1]["end"]})
                cur = []
    for a, b in zip(chunks, chunks[1:]):
        a["end"] = min(max(a["end"], b["start"] - 0.02), b["start"])
    return chunks


if __name__ == "__main__":
    for k, v in CUE.items():
        print(f"{k:14s} {v:7.2f}")
