"""HAND MADE - swung cartoon jazz (pizzicato bass, xylophone, brushes) + cel-animation SFX, locked to cues.json.
120 bpm swing, F major. Bars start at 0.5 / 2.5 / 4.5 / 6.5 / 8.5 (the strike, the landing, the twirl, the burst, the stamp)."""
import sys, os, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx, drums, pluck, fm, samples, filters
DIP = lambda x: filters.eq(x, [('pk', 3200, -6.0, 0.8), ('hs', 7000, -2.0)])

C = json.load(open(os.path.join(HERE, 'cues.json')))
H = C['hits']
m = mg.Mix(duration=10.0, bpm=120, anchor=0.5)
m.group('music').level = -20
B = 0.5                 # beat
SW = 0.3333             # swung off-beat (2/3 of a beat)

# ---------------------------------------------------------------- harmony (per half bar = 1 s)
#   0.5 F6 | 1.5 D7 | 2.5 Gm7 | 3.5 C7 | 4.5 F6 | 5.5 C7 (charge) | 6.5 BURST F | 7.0 Bb | 7.667 C7 | 8.5 F6/9
WALK = [  # walking pizz bass, quarter notes
    (0.5, 'F2'), (1.0, 'A2'), (1.5, 'D2'), (2.0, 'F#2'),
    (2.5, 'G2'), (3.0, 'Bb2'), (3.5, 'C2'), (4.0, 'E2'),
    (4.5, 'F2'), (5.0, 'A2'), (5.5, 'C3'), (5.75, 'C2'),
]
bass = m.track('bass', level=-22.5, sends={'room': -20})
for t, n in WALK:
    bass.add(pluck.pizz(n, 0.42, 0.95), t)
for t, n, d in [(6.5, 'F2', 0.5), (7.0, 'Bb1', 0.6), (7.667, 'C2', 0.7), (8.5, 'F1', 1.5), (8.5, 'F2', 1.5)]:
    bass.add(pluck.pizz(n, d, 1.0), t)

# ---------------------------------------------------------------- brushes + ride (swing), 2.5 .. 5.75
kit = m.track('brush', level=-28, sends={'room': -14})
for b in range(7):
    t = 2.5 + b * B
    if t >= 5.75: break
    if b % 2 == 1: kit.add(drums.snare('brush', 0.8), t)
ride = m.track('ride', level=-33, pan=0.35)
t = 0.5
while t < 5.74:
    ride.add(drums.cymbal('ride', 0.55, decay=0.35), t)
    if t + SW < 5.74: ride.add(drums.cymbal('ride', 0.35, decay=0.25), t + SW)
    t += B
kick = m.track('kick', level=-27)
for t in [2.5, 3.0, 3.5, 4.0, 4.5, 5.0, 5.5]: kick.add(drums.kick('soft', 0.7), t)

# ---------------------------------------------------------------- xylophone (lead) - every phrase lands on a picture hit
xy = m.track('xylo', level=-23.5, pan=-0.15, sends={'room': -12}, fx=[DIP])
MEL = [
    (0.5, 'F5', 0.2), (0.8333, 'A5', 0.2), (1.25, 'D6', 0.3), (1.5, 'C6', 0.2), (1.8333, 'A5', 0.2),
    # jump run -> landing
    (2.0, 'C6', 0.08), (2.0833, 'D6', 0.08), (2.1667, 'F6', 0.08), (2.25, 'G6', 0.08), (2.3333, 'A6', 0.08), (2.5, 'Bb6', 0.3),
    # dance (one figure per hop)
    (2.8333, 'G6', 0.15), (3.0, 'F6', 0.2), (3.3333, 'D6', 0.15), (3.5, 'G6', 0.2), (3.8333, 'E6', 0.15), (4.0, 'A6', 0.2), (4.3333, 'G6', 0.15),
    # twirl: tumbling run down
    (4.5, 'C7', 0.08), (4.5833, 'A6', 0.08), (4.6667, 'F6', 0.08), (4.75, 'C6', 0.08), (4.8333, 'A5', 0.08), (4.9167, 'C6', 0.08),
    # ta-da
    (5.0, 'F6', 0.4), (5.0, 'A6', 0.4), (5.3333, 'C6', 0.15), (5.5, 'E6', 0.2), (5.75, 'G6', 0.2),
]
for t, n, d in MEL:
    xy.add(fm.mallet(n, d + 0.25, 0.85, 'xylo'), t)
# charge: tremolo on C7 chord tones, getting faster
t = 5.75; i = 0
while t < 6.25:
    xy.add(fm.mallet(['E6', 'G6', 'Bb6'][i % 3], 0.12, 0.45 + 0.4 * (t - 5.75), 'xylo'), t)
    t += max(0.042, 0.125 - (t - 5.75) * 0.17); i += 1
# burst flurry (sparks) 6.5 - 6.95, descending pentatonic
for i, n in enumerate(['F7', 'D7', 'C7', 'A6', 'G6', 'F6', 'D6', 'C6', 'A5']):
    xy.add(fm.mallet(n, 0.2, 0.7 - i * 0.04, 'xylo'), 6.5417 + i * 0.0417 * 1.25)
# lettering: one note per brush stroke (15 strokes, 2 frames apart)
STROKES = ['D6', 'F6', 'Bb6', 'F6', 'D6', 'F6', 'Bb6', 'D7',  # HAND over Bb
           'E6', 'G6', 'C7', 'G6', 'E6', 'G6', 'Bb6']         # MADE over C7
for i, n in enumerate(STROKES):
    xy.add(fm.mallet(n, 0.3, 0.6 + 0.02 * i, 'xylo'), H['write_start'] + i * H['stroke_step'])
# stamp: final chord + vibes bloom
vib = m.track('vibes', level=-25, sends={'hall': -9})
vibes = samples.inst('vibraphone')
for n in ['F4', 'A4', 'C5', 'E5', 'G5']:
    vib.add(vibes.play(n, dur=1.45, vel=0.75), H['stamp'])
for t, n in [(H['stamp'], 'F6'), (H['stamp'], 'A6'), (H['stamp'], 'C7')]:
    xy.add(fm.mallet(n, 1.0, 0.8, 'xylo'), t)
xy.add(fm.mallet('C7', 0.2, 0.5, 'xylo'), H['wave']); xy.add(fm.mallet('A6', 0.3, 0.45, 'xylo'), H['wave'] + 0.0833)

# music drops out for the inhale, the burst comes back in
m.group('music').automate('lpf', [(0, 20000), (5.75, 20000), (6.2, 1500), (6.45, 900), (6.5, 20000), (10, 20000)])

# ---------------------------------------------------------------- SFX (sync = the frame the picture hits)
wood = lambda v=0.8: samples.hit('woodblock', vel=v)
for t in H['windup_tick']: m.sfx(sfx.tick('wood'), at=t, gain=-5, pan=-0.3)
m.sfx(sfx.paper('slide', 0.16), at=H['strike'], gain=-1, pan=-0.2)            # match head dragging on the striker
m.sfx(sfx.swish(0.22, direction=1), at=H['smear'], gain=-2, pan=0.0)           # the smear frame
m.sfx(sfx.whoosh(0.55, 'fire', direction=1), at=H['ignite'] + 0.05, gain=1, pan=0.15)   # fwoosh
m.sfx(sfx.pop('cork', pitch=1.1), at=H['ignite'], gain=-3, pan=0.15)
m.sfx(sfx.boing(1.25, 0.45), at=H['plant'], gain=-6, pan=-0.05)              # match plants and wobbles
m.sfx(sfx.blip('A6', 'sine', 0.06, glide=1.5), at=H['eyes_open'], gain=-6)     # eyes pop open
m.sfx(sfx.slide_whistle(up=False, dur=0.42, lo=500, hi=1000), at=H['squash'], gain=-11)   # squash down
m.sfx(sfx.slide_whistle(up=True, dur=0.42, lo=600, hi=1700), at=H['jump'], gain=-7, pan=0.2)  # jump
m.sfx(sfx.swish(0.25, direction=1), at=H['jump'] + 0.0833, gain=-4, pan=0.3)
m.sfx(sfx.pop('mouth', pitch=0.8), at=H['land'], gain=0, pan=0.3)
m.sfx(sfx.impact('soft', 0.5), at=H['land'], gain=-6, pan=0.3)
for i, t in enumerate(H['hops']):
    m.sfx(sfx.pop('bubble', pitch=1.0 + 0.12 * i), at=t, gain=-4, pan=[0.25, 0.4, 0.3][i])
m.sfx(sfx.swish(0.22, direction=1), at=H['twirl'] + 0.1, gain=-4, pan=0.35)
m.sfx(sfx.swish(0.22, direction=-1), at=H['twirl'] + 0.33, gain=-4, pan=0.35)
m.sfx(sfx.chime(('F6', 'A6', 'C7', 'F7'), step=0.06), at=H['tada'], gain=-9, pan=0.3)
m.sfx(sfx.pop('mouth', pitch=1.2), at=H['hop_centre'] + 0.25, gain=-5)
m.sfx(sfx.riser(0.6, 'tonal', note='C4'), at=H['burst'] - 0.1, gain=-12)     # build stops just before the hit
m.sfx(sfx.reverse_cymbal(0.45), at=H['burst'] - 0.08, gain=-14)
m.mute(H['burst'] - 0.1, 0.1)                                                  # a breath of silence = the inhale
m.sfx(sfx.whoosh(0.3, 'air', direction=-1), at=H['inhale'] + 0.12, gain=-6)    # the inhale
m.sfx(sfx.impact('punch', 1.0), at=H['burst'], gain=2)
m.sfx(drums.kick('cinematic', 1.0).loud(-18), at=H['burst'], gain=0)
m.sfx(samples.hit('timpani', vel=1.0).loud(-18), at=H['burst'], gain=-4)
m.sfx(drums.crash(0.9).loud(-18), at=H['burst'], gain=-3)
m.sfx(sfx.pop('cork', pitch=0.7), at=H['burst'] + 0.0417, gain=-2)           # poof
m.sfx(sfx.whoosh(0.5, 'soft', direction=0), at=H['burst'] + 0.15, gain=-6)
m.sfx(sfx.sparkle(1.3, density=26, key='F'), at=H['burst'] + 0.1, gain=-7)
m.sfx(sfx.pen('marker', 1.3, strokes=[(H['write_start'] + i * H['stroke_step'] - H['write_start'], 0.07) for i in range(15)]), at=H['write_start'], gain=-12)
m.sfx(sfx.pop('bubble', pitch=1.4), at=H['spirit_return'], gain=-6, pan=-0.2)
m.sfx(sfx.stamp('seal'), at=H['stamp'], gain=1, pan=0.25)
m.sfx(sfx.sparkle(1.0, density=14, key='F'), at=H['stamp'] + 0.25, gain=-12)
m.sfx(sfx.blip('C7', 'sine', 0.05, glide=1.2), at=H['blink'], gain=-14)

res = m.export(os.path.join(HERE, 'out', 'audio.wav'), lufs=-14, tp=-1.6,
               spectrogram=os.path.join(HERE, 'out', 'audio_spec.png'))
m.report()
print({k: res[k] for k in ('duration', 'lufs', 'true_peak', 'stereo_corr', 'warnings') if k in res})
