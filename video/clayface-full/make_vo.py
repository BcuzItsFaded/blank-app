import json, subprocess, os, sys
from concurrent.futures import ThreadPoolExecutor
V = {"VO": ("en-US-ChristopherNeural", "+0%"), "H1": ("en-US-AndrewNeural", "+4%"), "H2": ("en-US-AvaNeural", "+4%")}
segs = json.load(open("script.json")); os.makedirs("vo/lines", exist_ok=True)
jobs = []
for i, seg in enumerate(segs):
    for j, (who, text) in enumerate(seg):
        jobs.append((f"vo/lines/{i:02d}_{j:02d}.mp3", who, text))
def run(j):
    out, who, text = j
    subprocess.run(["python3", "tts.py", V[who][0], V[who][1], text, out], check=True)
with ThreadPoolExecutor(6) as ex: list(ex.map(run, jobs))
subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", "anullsrc=r=24000:cl=mono", "-t", "0.45", "vo/lines/gap.mp3"], check=True)
for i, seg in enumerate(segs):
    parts = []
    for j in range(len(seg)):
        parts += [f"lines/{i:02d}_{j:02d}.mp3"] + (["lines/gap.mp3"] if j < len(seg) - 1 else [])
    open(f"vo/list{i:02d}.txt", "w").write("".join(f"file '{p}'\n" for p in parts))
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", f"vo/list{i:02d}.txt",
                    "-ar", "24000", "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k", f"vo/{i:02d}.mp3"], check=True)
