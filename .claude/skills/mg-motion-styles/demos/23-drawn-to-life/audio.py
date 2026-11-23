"""23-drawn-to-life soundtrack: a Mickey-moused jazzy cartoon cue in C major, 120 bpm swing
(pizzicato walking bass, xylophone, brushes, piano comp) + cartoon sound design, every hit read from cues.json.

Form: pencil zip + scribble (pencil SFX, tiptoe pizz) -> 'pop!' birth chord -> glances answered by glock/pizz ->
hops (boings, xylophone) -> band in for the dance -> crouch + slide-whistle leap + riser -> BOOM ->
sparkle cloud -> xylophone run writes the title (one note per stroke) -> C6/9 button + wink plink.
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx, drums, fm, samples, pluck
from mgaudio import filters as F
from mgaudio.core import Sound

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'cues.json')))
BPM = C['bpm']; BEAT = 60 / BPM; SW = BEAT * 2 / 3
FR = 1 / 24

m = mg.Mix(duration=10.0, bpm=BPM, anchor=C['bar_anchor'])
m.group('music').level = -20
m.sfx_duck = 2.0

MAR, PNO, VIB, GLK = samples.inst('marimba'), samples.inst('piano'), samples.inst('vibraphone'), samples.inst('glock')
xylo = lambda n, v=0.8, d=0.35: mg.layer([(MAR.play(n, dur=d, vel=v, release=0.12), 0, 0, 0), (fm.mallet(n, d * 0.8, v * 0.9, 'xylo'), 0, -7, 0)])
pz = lambda n, d=0.3, v=0.8: pluck.pizz(n, d, v)
def upright(n, d=0.45, v=0.85):
    b = Sound(F.lpf(fm.bass(n, min(d, 0.3), v * 0.8, 'wood').data, 900)).fade(0.002, 0.08)
    return mg.layer([(pluck.pizz(n, d, v), 0, 0, 0), (b, 0, -6, 0)])
piano = lambda ns, v=0.6, d=0.3: mg.layer([(PNO.play(n, dur=d, vel=v, release=0.15), 0.004 * i, 0, 0) for i, n in enumerate(ns)])
vibes = lambda ns, v=0.5, d=1.0: mg.layer([(VIB.play(n, dur=d, vel=v, release=0.6), 0.006 * i, 0, 0) for i, n in enumerate(ns)])

tx = m.track('xylo', level=-23, sends={'room': -12, 'plate': -20}, pan=0.12)
tb = m.track('bass', level=-22, sends={'room': -18})
tp = m.track('piano', level=-27, sends={'room': -12, 'plate': -18}, pan=-0.15)
tv = m.track('vibes', level=-29, sends={'plate': -12}, pan=0.2)
tz = m.track('pizz', level=-25, sends={'room': -12})
tbr = m.track('brush', level=-29, sends={'room': -12}, pan=-0.25)
trd = m.track('ride', level=-32, sends={'room': -16}, pan=0.3)
tg = m.track('glock', level=-28, sends={'plate': -12}, pan=0.25)
tk = m.track('kick', level=-26)
tperc = m.track('perc', level=-24, sends={'room': -10})

# ---- 0.0-1.0: pencil zips in and scribbles; tiptoe pizz circles the loop
m.sfx(sfx.whoosh(0.35, 'swish', direction=-1, peak=0.5), at=0.09, gain=-4, pan=0.5)
m.sfx(sfx.pen('pencil', C['scribble1'] - C['scribble0'] + 0.05, seed=3), at=C['scribble0'], gain=-3)
for i, n in enumerate(['C4', 'E4', 'G4', 'A4', 'G4', 'E4']):
    tz.add(pz(n, 0.14, 0.5 + 0.04 * i), C['scribble0'] + i * 0.11, pan=-0.4 + 0.16 * i)
m.sfx(sfx.whoosh(0.3, 'air', direction=1, peak=0.4), at=C['pencil_out'], gain=-7, pan=0.5)

# ---- 1.0 the pop: birth chord
P = C['pop']
m.sfx(sfx.pop('cork', 1.0), at=P, gain=0)
m.sfx(sfx.boing(1.3, 0.4), at=P + 0.04, gain=-9)
tp.add(piano(['C3', 'G3', 'A3', 'E4'], 0.7, 0.7), P)
tb.add(upright('C2', 0.5, 0.95), P)
tg.add(GLK.play('E6', vel=0.6), P); tg.add(GLK.play('G6', vel=0.5), P + 0.04)
m.sfx(sfx.pop('soft', 1.3), at=C['eyes_open'], gain=-8)
tg.add(GLK.play('C6', vel=0.55), C['eyes_open']); tg.add(GLK.play('G6', vel=0.6), C['eyes_open'] + 0.083)
tz.add(pz('A3', 0.2, 0.7), C['look_left'], pan=-0.6)
tz.add(pz('E4', 0.2, 0.7), C['look_right'], pan=0.6)
m.sfx(sfx.stretch(0.22, up=False), at=C['crouch'], gain=-10)

# ---- hops: boing on each landing, xylophone up-and-down per hop
for i, (a, b) in enumerate(zip(C['hop'], C['land'])):
    m.sfx(sfx.zip_(True, 0.12), at=a, gain=-9, pan=-0.3 + 0.3 * i)
    for k, n in enumerate([['C5', 'E5', 'G5'], ['E5', 'G5', 'C6']][i]):
        tx.add(xylo(n, 0.6, 0.18), a + k * 0.07)
    m.sfx(sfx.boing(0.9 + 0.15 * i, 0.45), at=b - FR, gain=-6, pan=-0.2 + 0.3 * i)
    tperc.add(samples.hit('woodblock', vel=0.8), b)
    tb.add(upright(['G2', 'C3'][i], 0.4, 0.9), b)

# ---- groove (3.25 - 5.0): walking bass, brushes, ride, Charleston comp, xylophone tune
comp = {3.5: ['E3', 'G3', 'A3', 'D4'], 4.0: ['F3', 'A3', 'C4', 'D4'], 4.5: ['D3', 'F3', 'G3', 'B3']}
for t, n in [(3.5, 'A2'), (3.75, 'C3'), (4.0, 'D3'), (4.25, 'F#2'), (4.5, 'G2'), (4.75, 'G2')]:
    tb.add(upright(n, 0.3, 0.85), t)
for b, ch in comp.items():
    tp.add(piano(ch, 0.55, 0.2), b); tp.add(piano(ch, 0.45, 0.16), b + SW)
for t in (3.75, 4.25, 4.75):
    tbr.add(drums.snare('brush', 0.7), t)
for t in (3.5, 4.0, 4.5):
    for off, v in [(0, 0.6), (BEAT / 2, 0.45), (BEAT / 2 + SW / 2, 0.35)]:
        trd.add(drums.cymbal('ride', v), t + off)
tk.add(drums.kick('soft', 0.8), 3.5); tk.add(drums.kick('soft', 0.6), 4.0)
for t, n, v in [(3.42, 'G5', 0.7), (3.67, 'A5', 0.6), (3.92, 'G5', 0.7), (4.17, 'E5', 0.6), (4.42, 'D5', 0.7)]:
    tx.add(xylo(n, v, 0.25), t)
tg.add(GLK.play('A6', vel=0.4), C['blink'])

# ---- crouch + leap: chromatic tremolo, slide whistle, riser into the BOOM
for i, n in enumerate(['G3', 'G#3', 'A3', 'A#3', 'B3']):
    tz.add(pz(n, 0.1, 0.5 + 0.08 * i), C['crouch2'] + i * 0.1)
m.sfx(sfx.stretch(0.45, up=False), at=C['crouch2'], gain=-8)
m.sfx(sfx.slide_whistle(True, 0.9, 500, 2000), at=C['leap'], gain=-4)
m.sfx(sfx.whoosh(0.4, 'air', direction=0, peak=0.2), at=C['leap'] + 0.04, gain=-7)
for i in range(16):
    tbr.add(drums.snare('tight', 0.15 + 0.5 * i / 16), C['leap'] + 0.25 + i * 0.047)
m.sfx(sfx.riser(0.9, 'noise'), at=C['boom'], gain=-9)

# ---- BOOM
B = C['boom']
m.sfx(sfx.impact('punch', 1.2), at=B, gain=2)
m.sfx(sfx.boom(1.6, 44), at=B, gain=-3)
m.sfx(sfx.pop('cork', 0.6), at=B, gain=-4)
tperc.add(samples.hit('timpani', vel=1.0), B - 0.004)
tp.add(piano(['C1', 'G1', 'C2', 'E2', 'G2', 'C3'], 1.0, 1.3), B)
tb.add(upright('C1', 0.8, 1.0), B)
m.track('crash', level=-24, sends={'hall': -14}).add(drums.crash(0.95), B)
m.sfx(sfx.sparkle(0.9, 30, key='C', mode='major_pentatonic', seed=9), at=B + 0.15, gain=-7)
for i in range(4):
    m.sfx(sfx.pop('bubble', 0.8 + 0.2 * i), at=B + 0.2 + i * 0.09, gain=-13, pan=-0.6 + 0.4 * i)

# ---- the title is written: one xylophone note per stroke + a pen scratch
n_strokes = 15
run = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6', 'G6', 'E6', 'G6', 'A6', 'C7']
for i in range(n_strokes):
    t = C['write0'] + i * C['write_step']
    last = i == n_strokes - 1
    tx.add(xylo(run[i], 0.72 + 0.015 * i, 0.3 if not last else 0.8), t, gain=-1.5)
    tg.add(GLK.play(run[i], vel=0.25 + 0.01 * i), t + 0.004)
    m.sfx(sfx.pen('marker', 0.12, seed=20 + i), at=t, gain=-16, pan=-0.6 + 0.085 * i)
for t, n in [(6.75, 'F2'), (7.0, 'A2'), (7.25, 'C3'), (7.5, 'D3'), (7.75, 'G2'), (8.0, 'B2')]:
    tb.add(upright(n, 0.3, 0.75), t)
tv.add(vibes(['F3', 'A3', 'C4', 'E4'], 0.35, 1.0), 6.75)
tv.add(vibes(['G3', 'B3', 'D4', 'F4'], 0.35, 0.9), 7.75)
for t in (7.0, 7.5, 8.0):
    tbr.add(drums.snare('brush', 0.55), t)
for t in (6.75, 7.25, 7.25 + SW / 2, 7.75, 8.0):
    trd.add(drums.cymbal('ride', 0.4), t)
m.sfx(sfx.whoosh(0.3, 'swish', direction=1, peak=0.6), at=C['underline'] + 0.12, gain=-8)

# ---- return + button
m.sfx(sfx.slide_whistle(False, 0.38, 600, 1800), at=C['return0'], gain=-7)
E = C['return_land']
m.sfx(sfx.boing(1.1, 0.5), at=E - FR, gain=-5)
tp.add(piano(['C2', 'G2', 'E3', 'A3', 'D4', 'G4'], 0.8, 1.2), E)
tb.add(upright('C2', 0.9, 0.95), E)
tv.add(vibes(['E3', 'A3', 'D4', 'G4'], 0.5, 1.2), E + 0.01)
tg.add(GLK.play('G6', vel=0.6), E); tg.add(GLK.play('D7', vel=0.45), E + 0.04)
m.track('sus', level=-31, sends={'hall': -10}).add(samples.hit('suscymbal', match='hit_f', vel=0.5), E)
m.sfx(sfx.shimmer_hit('G5'), at=E, gain=-6)
Wk = C['wink']
tz.add(pz('C5', 0.3, 0.85), Wk); tz.add(pz('C6', 0.3, 0.7), Wk + 0.004)
tg.add(GLK.play('E7', vel=0.55), Wk + 0.01)
m.sfx(sfx.pop('mouth', 1.4), at=Wk + 0.75, gain=-12)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
res = m.export(os.path.join(HERE, 'out/audio.wav'), tp=-1.6, spectrogram=os.path.join(HERE, 'out/audio_spec.png'))
print({k: res[k] for k in ('duration', 'lufs', 'true_peak') if k in res}, res.get('warnings'))
