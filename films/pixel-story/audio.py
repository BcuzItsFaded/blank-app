"""PIXEL STORY - dark-romantic chiptune, 120 bpm, D minor. One bar (2 s) per storyboard panel, so every cut is a downbeat.
Panel 12 holds 3 s (a bar and a half) and ends on the tonic with a low hit."""
import sys, os
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import chip, sfx, drums, filters
from mgaudio.theory import midi

DUR = 25.0
m = mg.Mix(duration=DUR, bpm=120, anchor=0.0)
m.group('music').level = -20
DIP = lambda x: filters.eq(x, [('pk', 3300, -5.0, 0.8), ('hs', 8000, -3.0)])

# one chord per panel (bar)
PROG = ['Dm', 'Bb', 'F', 'C', 'Gm', 'Dm', 'Bb', 'F', 'C', 'A', 'Bb', 'Dm']
TONES = {'Dm': ['D4', 'F4', 'A4'], 'Bb': ['D4', 'F4', 'Bb4'], 'F': ['C4', 'F4', 'A4'], 'C': ['C4', 'E4', 'G4'],
         'Gm': ['D4', 'G4', 'Bb4'], 'A': ['C#4', 'E4', 'A4']}
ROOT = {'Dm': 'D2', 'Bb': 'Bb1', 'F': 'F2', 'C': 'C2', 'Gm': 'G1', 'A': 'A1'}

# triangle bass: root on 1, fifth/octave pulse on 2-4 (sparser in 5, 11)
bass = m.track('bass', level=-21)
for i, c in enumerate(PROG):
    t0 = i * 2.0
    r = midi(ROOT[c])
    pat = [(0, r, 0.9), (0.75, r, 0.2), (1.0, r + 7, 0.45), (1.5, r + 12, 0.4)] if i not in (4, 10) else [(0, r, 1.8)]
    if i == 11: pat = [(0, r, 2.9)]
    for dt, n, d in pat:
        bass.add(chip.triangle(n, d, 0.9), t0 + dt)

# soft arpeggio bed (12.5 % pulse), ping-pong
arpL = m.track('arpL', level=-31, pan=-0.55, fx=[DIP], sends={'delay': -14})
arpR = m.track('arpR', level=-31, pan=0.55, fx=[DIP])
for i, c in enumerate(PROG):
    if i in (10,): continue
    nb = 12 if i == 11 else 8
    for k in range(nb):
        t = i * 2.0 + k * 0.25
        n = TONES[c][[0, 1, 2, 1][k % 4]]
        (arpL if k % 2 == 0 else arpR).add(chip.pulse(midi(n) + 12, 0.2, 0.125, 0.5, env='decay'), t)

# lead (25 % pulse): a sighing motif, answered each panel
lead = m.track('lead', level=-24, pan=-0.1, fx=[DIP], sends={'delay': -12, 'room': -16})
L = [
    (0.0, 'A5', .7), (0.75, 'F5', .25), (1.0, 'E5', .5), (1.5, 'D5', .45),           # 1 he sees her
    (2.0, 'D5', .5), (2.5, 'F5', .5), (3.0, 'Bb5', .9),                               # 2 daydream (rising)
    (4.0, 'A5', .25), (4.25, 'C6', .25), (5.0, 'C6', .2), (5.5, 'A5', .4),            # 3 the like (tap at 5.0)
    (6.0, 'G5', .5), (6.5, 'E5', .5), (7.0, 'C5', .9),                                # 4 split
    (8.0, 'Bb4', .9), (9.0, 'D5', .4), (9.5, 'C#5', .45),                             # 5 the friends (tense)
    (10.0, 'A5', .5), (10.5, 'G5', .25), (10.75, 'F5', .25), (11.0, 'E5', .45), (11.5, 'F5', .45),  # 6 writing
    (12.0, 'D5', .25), (12.25, 'F5', .25), (12.5, 'D6', .9),                          # 7 messages
    (14.0, 'C6', .5), (14.5, 'A5', .5), (15.0, 'F5', .5), (15.5, 'C6', .45),          # 8 ensemble
    (16.0, 'G5', .5), (16.5, 'C6', .5), (17.0, 'E6', .9),                             # 9 rolling
    (18.0, 'E6', .25), (18.25, 'C#6', .25), (18.5, 'A5', .25), (19.0, 'E6', .9),      # 10 switch to the red screen
    (20.0, 'F5', 1.8),                                                                # 11 empty
    (22.0, 'A5', .5), (22.5, 'F5', .5), (23.0, 'D5', 1.4),                            # 12 the reflection
]
for t, n, d in L:
    lead.add(chip.pulse(n, d * 0.95, 0.25, 0.75, env='sustain', vib=0.3 if d > 0.6 else 0, vib_delay=0.25), t)

# noise hats + soft kick from panel 3 on (heartbeat in 5 and 11)
hat = m.track('hat', level=-33, pan=0.25)
kick = m.track('kick', level=-25)
for i in range(12):
    t0 = i * 2.0
    if i in (4, 10):
        for dt in (0, 0.3, 1.0, 1.3): kick.add(drums.kick('soft', 0.8), t0 + dt)
        continue
    if i >= 2 and i < 11:
        for k in range(8): hat.add(chip.noise(0.06, period=1, short=True, vel=0.5 if k % 2 else 0.8), t0 + k * 0.25)
        kick.add(drums.kick('soft', 0.8), t0); kick.add(drums.kick('soft', 0.6), t0 + 1.0)
kick.add(drums.kick('cinematic', 1.0), 22.0)

# ---------------------------------------------------------------- SFX on the picture
m.sfx(sfx.ding('E6', 'bell', 0.8), at=0.6, gain=-12, pan=0.4)                       # 1 shop bell
for k in range(4): m.sfx(sfx.click('wood'), at=2.25 + k * 0.42, gain=-16, pan=0.3)  # 2 footsteps
m.sfx(sfx.pop('bubble', pitch=1.3), at=2.17, gain=-9)                               # 2 bubble pops in
m.sfx(sfx.click('soft'), at=4.83, gain=-8, pan=-0.3)                                # 3 thumb tap
m.sfx(sfx.pop('mouth', pitch=1.4), at=5.0, gain=-6, pan=-0.3)                       # 3 like
m.sfx(sfx.tape_rip(0.35), at=6.15, gain=-8)                                         # 4 the tear
m.sfx(sfx.riser(1.8, 'noise'), at=10.0, gain=-14)                                   # 5 shadows loom
m.sfx(sfx.pen('pen', 1.6), at=10.2, gain=-12, pan=-0.1)                             # 6 writing
for k in range(3): m.sfx(sfx.blip('A5', 'square', 0.05), at=12.5 + k * 0.08, gain=-14, pan=-0.6)  # 7 buzz
for k in range(3): m.sfx(sfx.ui('notify'), at=12.4 + k * 0.4, gain=-12, pan=-0.6)  # 7 messages
m.sfx(sfx.shutter('film'), at=16.0, gain=-8, pan=0.2)                               # 9 slate / camera
m.sfx(sfx.blip('C6', 'sine', 0.08), at=16.5, gain=-14, pan=0.2)                     # 9 REC
m.sfx(sfx.static(1.0, 'tv'), at=18.0, gain=-12, pan=-0.4)                           # 10 old TV
m.sfx(sfx.swish(0.3), at=18.55, gain=-10)                                           # 10 arrow
m.sfx(sfx.crt_on(), at=18.8, gain=-8, pan=0.4)                                      # 10 the red screen
m.sfx(sfx.toggle(False), at=20.9, gain=-12)                                         # 11 lamp flicker
m.sfx(sfx.static(3.0, 'radio'), at=22.0, gain=-22)                                  # 12 rain bed
m.sfx(sfx.impact('thud', 0.8), at=22.0, gain=-6)

res = m.export(os.path.join(HERE, 'out', 'audio.wav'), lufs=-14, tp=-1.6, spectrogram=os.path.join(HERE, 'out', 'audio_spec.png'))
print({k: res[k] for k in ('duration', 'lufs', 'true_peak', 'warnings') if k in res})
