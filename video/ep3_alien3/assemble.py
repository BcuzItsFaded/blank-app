import wave, subprocess, os, json
import numpy as np
D = os.path.dirname(os.path.abspath(__file__))
SR, FPS = 44100, 24
parts = []
lst = open(f"{D}/concat.txt", "w")
for seg in range(14):
    v = f"{D}/segs/v{seg:02d}.mp4"
    n = int(subprocess.check_output(["ffprobe", "-v", "error", "-count_packets", "-select_streams", "v:0", "-show_entries", "stream=nb_read_packets", "-of", "csv=p=0", v]).strip())
    with wave.open(f"{D}/audio/seg{seg:02d}.wav") as w: a = np.frombuffer(w.readframes(w.getnframes()), np.int16).reshape(-1, 2)
    need = round(n / FPS * SR); a = a[:need]; a = np.pad(a, ((0, need - len(a)), (0, 0)))
    parts.append(a); lst.write(f"file '{v}'\n"); print(seg, n, len(a) / SR)
lst.close()
full = np.concatenate(parts)
with wave.open(f"{D}/audio/full.wav", "wb") as w: w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(full.tobytes())
out = os.path.join(D, "DontSpoilItRG_Ep3_Alien3.mp4")
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", f"{D}/concat.txt", "-i", f"{D}/audio/full.wav",
                "-map", "0:v", "-map", "1:a", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-shortest", out], check=True)
print(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration,size", "-of", "default=nw=1", out]).decode())
