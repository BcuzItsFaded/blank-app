import json, subprocess, os
from concurrent.futures import ThreadPoolExecutor
V = {"R": ("en-US-AndrewNeural", "+6%"), "A": ("en-US-AvaNeural", "+6%"), "VO": ("en-US-ChristopherNeural", "+2%")}
segs = json.load(open("script.json")); os.makedirs("vo/lines", exist_ok=True)
jobs = []
for i, seg in enumerate(segs):
    for j, (who, text) in enumerate(seg):
        jobs.append((f"vo/lines/{i:02d}_{j:02d}.mp3", who, text))
def run(j):
    out, who, text = j
    subprocess.run(["python3", "tts.py", V[who][0], V[who][1], text, out], check=True)
with ThreadPoolExecutor(8) as ex: list(ex.map(run, jobs))
subprocess.run(["ffmpeg","-v","error","-y","-f","lavfi","-i","anullsrc=r=24000:cl=mono","-t","0.5","vo/gap.mp3"],check=True)
import glob
for i, seg in enumerate(segs):
    parts=[]
    for j in range(len(seg)):
        parts.append(os.path.abspath(f"vo/lines/{i:02d}_{j:02d}.mp3"))
        if j<len(seg)-1: parts.append(os.path.abspath("vo/gap.mp3"))
    lst=f"vo/list{i:02d}.txt"; open(lst,"w").write("".join("file '%s'\n"%p for p in parts))
    subprocess.run(["ffmpeg","-v","error","-y","-f","concat","-safe","0","-i",lst,
                    "-ar","24000","-ac","1","-c:a","libmp3lame","-b:a","96k",f"vo/{i:02d}.mp3"],check=True)
