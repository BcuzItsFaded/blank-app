import json, subprocess, os
from concurrent.futures import ThreadPoolExecutor
V = {"H1": ("en-US-AndrewNeural", "+8%"), "H2": ("en-US-AvaNeural", "+6%")}
segs = json.load(open("script.json")); os.makedirs("vo/lines", exist_ok=True)
jobs = []
for i, seg in enumerate(segs):
    for j, (who, text) in enumerate(seg):
        jobs.append((f"vo/lines/{i:02d}_{j:02d}.mp3", who, text))
def run(j):
    out, who, text = j
    subprocess.run(["python3", "tts_words.py", V[who][0], V[who][1], text, out], check=True)
with ThreadPoolExecutor(6) as ex: list(ex.map(run, jobs))
