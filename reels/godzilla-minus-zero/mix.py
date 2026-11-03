"""Mix narration over the score with sidechain ducking. Usage: python3 mix.py score.wav vo.wav out.wav"""
import sys, wave
import numpy as np


def read(p):
    with wave.open(p) as w:
        sr, ch, n = w.getframerate(), w.getnchannels(), w.getnframes()
        a = np.frombuffer(w.readframes(n), dtype='<i2').astype(np.float64) / 32768
    a = a.reshape(-1, ch)
    return (np.repeat(a, 2, 1) if ch == 1 else a), sr


score, sr = read(sys.argv[1])
vo, sr2 = read(sys.argv[2])
assert sr == sr2 == 48000
n = min(len(score), len(vo))
score, vo = score[:n], vo[:n]

# VO envelope (attack 20ms, release 400ms) -> duck score by up to ~8 dB
lvl = np.abs(vo).mean(1)
win = int(0.03 * sr)
lvl = np.convolve(lvl, np.ones(win) / win, 'same')
env = np.zeros(n); a, r, e = np.exp(-1 / (0.02 * sr)), np.exp(-1 / (0.4 * sr)), 0.0
for i in range(0, n, 48):  # 1ms steps
    x = lvl[i]; e = a * e + (1 - a) * x if x > e else r * e + (1 - r) * x
    env[i:i + 48] = e
duck = 1 - 0.6 * np.clip(env / 0.05, 0, 1)

mix = score * duck[:, None] * 0.85 + vo * 1.0
mix[int(59.85 * sr):] = 0
mix *= 0.92 / np.max(np.abs(mix))
with wave.open(sys.argv[3], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((mix * 32767).astype('<i2').tobytes())
print('mixed', n / sr, 's')
