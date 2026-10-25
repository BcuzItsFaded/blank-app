import json, subprocess, os
from concurrent.futures import ThreadPoolExecutor
V = {"R": ("en-US-AndrewNeural", "+10%"), "A": ("en-US-AvaNeural", "+10%"), "VO": ("en-US-ChristopherNeural", "+10%")}
segs = json.load(open("script.json")); os.makedirs("vo/lines", exist_ok=True)
jobs = [(f"vo/lines/{i:02d}_{j:02d}.mp3", w, t) for i, s in enumerate(segs) for j, (w, t) in enumerate(s)]
def run(j):
    out, who, text = j
    subprocess.run(["python3", "tts_words.py", V[who][0], V[who][1], text, out], check=True)
with ThreadPoolExecutor(6) as ex: list(ex.map(run, jobs))
