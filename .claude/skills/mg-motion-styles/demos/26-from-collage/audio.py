"""26-from-collage soundtrack (collage cut: 25-from-short score + paper foley) (60 s): eerie music box in D minor over dark drones, heartbeat at night, low piano and
taiko hits, stamps and pen scratches, all locked to cues.json."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx, drums, fm, samples, pluck, synth

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'cues.json')))
DUR = C['duration']; B = 60 / C['bpm']   # beat = 0.667 s

m = mg.Mix(duration=DUR, bpm=C['bpm'], anchor=0.0)
m.group('music').level = -20
m.sfx_duck = 2.5
GLK, PNO, VIB = samples.inst('glock'), samples.inst('piano'), samples.inst('vibraphone')
box = lambda n, v=0.6: mg.layer([(GLK.play(n, vel=v), 0, 0, 0), (fm.bell(n, 0.9, v * 0.7, 'celesta'), 0, -6, 0)])
piano = lambda ns, v=0.7, d=1.2: mg.layer([(PNO.play(n, dur=d, vel=v, release=0.4), 0.005 * i, 0, 0) for i, n in enumerate(ns)])

tbox = m.track('musicbox', level=-25, sends={'hall': -8, 'plate': -14}, pan=0.1)
tpad = m.track('pad', level=-27, sends={'hall': -10})
tpno = m.track('piano', level=-24, sends={'hall': -12})
tz = m.track('pizz', level=-27, sends={'room': -12})
ttk = m.track('taiko', level=-24, sends={'hall': -14})
tvib = m.track('vibes', level=-30, sends={'plate': -10})

# ---- music box theme (D minor, slightly detuned feel via celesta layer), 8 notes per phrase
theme = ['A5', 'D6', 'F6', 'E6', 'D6', 'A5', 'Bb5', 'A5']
def phrase(t0, notes=theme, v=0.55, step=B / 2):
    for i, n in enumerate(notes):
        tbox.add(box(n, v * (0.9 + 0.1 * (i % 2 == 0))), t0 + i * step)
for t0 in (0.1, 2.8):
    phrase(t0)
phrase(9.6, ['A5', 'D6', 'F6', 'E6', 'D6', 'A5', 'Bb5', 'A5'], 0.5); phrase(12.0, ['A5', 'D6', 'F6', 'E6', 'D6', 'C#6', 'D6', 'A5'], 0.45)
tpad.add(synth.pad(['D2', 'A2', 'F3'], 9.0, 0.45, 'dark'), 0.0)
tpad.add(synth.pad(['Bb1', 'F2', 'D3'], 6.0, 0.45, 'dark'), 9.4)
# hook hits
m.sfx(sfx.squeak(), at=C['turn'] - 0.2, gain=-10)
m.sfx(sfx.whoosh(0.4, 'soft', direction=0, peak=0.5), at=C['turn'], gain=-12)
for i, n in enumerate(['D5', 'F5', 'A5']):
    tvib.add(VIB.play(n, vel=0.4), C['town_draw'][0] + i * 0.25)
m.sfx(sfx.whoosh(0.5, 'heavy', direction=1, peak=0.8), at=C['tree_fall'], gain=-6)
m.sfx(sfx.impact('thud', 1.2), at=C['tree_fall'], gain=0)
m.sfx(sfx.boom(1.6, 40), at=C['tree_fall'], gain=-4)
tpno.add(piano(['D1', 'D2', 'A2'], 0.9, 1.4), C['tree_fall'])
# title
m.sfx(sfx.reverse_cymbal(1.2), at=C['title'][0], gain=-8)
m.sfx(sfx.impact('cinematic', 1.0), at=C['title'][0], gain=-1)
ttk.add(drums.taiko('taiko', 1.0), C['title'][0])
tpno.add(piano(['D1', 'A1', 'D2', 'F2'], 0.95, 2.2), C['title'][0])
for i in range(4):
    m.sfx(sfx.stamp('rubber'), at=C['title'][0] + i * 0.14, gain=-14)
# the loop: a tick each time the car comes back, the theme bends wrong
for t in (C['loop'][1][0], C['loop'][2][0]):
    m.sfx(sfx.whoosh(0.35, 'air', direction=1, peak=0.5), at=t + 0.25, gain=-12)
    m.sfx(sfx.pen('marker', 0.12, seed=int(t * 10)), at=t, gain=-10)
    tpno.add(piano(['D2', 'Ab2'], 0.6, 0.8), t)
tvib.add(mg.layer([(VIB.play('D5', vel=0.5), 0, 0, 0), (VIB.play('Eb5', vel=0.45), 0.01, 0, 0)]), C['loop'][2][1])

# ---- night: downlifter, drone, heartbeat, eyes, creatures
N = C['night'][0]
m.sfx(sfx.downlifter(1.2), at=N, gain=-6)
tpad.add(synth.pad(['D1', 'A1', 'Eb2'], 5.6, 0.55, 'dark'), N)
tpad.add(synth.pad(['D3', 'Eb3'], 5.0, 0.3, 'air'), N + 0.4)
m.sfx(sfx.heartbeat(70), at=N + 0.6, gain=-6)
for i in range(8):
    tbox.add(box(['D7', 'Eb7', 'A6', 'Bb6'][i % 4], 0.25), C['eyes'] + i * 0.18)
Cr = C['creatures']
m.sfx(sfx.impact('cinematic', 1.1), at=Cr, gain=1)
m.sfx(sfx.boom(2.0, 36), at=Cr, gain=-4)
ttk.add(drums.taiko('taiko', 1.0), Cr)
tpno.add(piano(['C#1', 'D1', 'G#1', 'D2'], 1.0, 2.0), Cr)
m.sfx(sfx.riser(1.6, 'noise'), at=C['wipe'][0], gain=-10)

# ---- wipes
for w in C['wipe']:
    m.sfx(sfx.whoosh(0.6, 'heavy', direction=1, peak=0.45), at=w + 0.25, gain=-5)
    ttk.add(drums.taiko('taiko', 0.85), w + 0.3)

# ---- rules + residents + the eye
tpad.add(synth.pad(['D2', 'A2', 'F3'], 9.4, 0.4, 'dark'), 20.9)
for i, t in enumerate(C['rules']):
    m.sfx(sfx.pen('pencil', 0.55, seed=30 + i), at=t, gain=-8)
    tz.add(pluck.pizz(['D3', 'F3', 'A3'][i], 0.3, 0.7), t)
for k in range(6):
    tz.add(pluck.pizz(['D3', 'A2'][k % 2], 0.25, 0.55), C['residents'] + k * B)
for i, n in enumerate(['A6', 'Bb6', 'C#7']):
    tbox.add(box(n, 0.45), C['qmarks'] + i * 0.2)
m.sfx(sfx.sub_drop(), at=C['big_eye'], gain=-3)
m.sfx(sfx.swell(sfx.impact('soft', 0.8), 1.2), at=C['big_eye'], gain=-4)
tpno.add(piano(['D1', 'Eb2', 'A2'], 0.85, 2.4), C['big_eye'])
m.sfx(sfx.heartbeat(84), at=C['big_eye'] + 0.4, gain=-8)

# ---- the map, the three genres, the crack
phrase(C['map'] + 0.2, theme, 0.5); phrase(C['map'] + 0.2 + 8 * B / 2, ['A5', 'D6', 'F6', 'G6', 'F6', 'E6', 'D6', 'A5'], 0.45)
tpad.add(synth.pad(['D2', 'A2', 'F3', 'C4'], 8.4, 0.4, 'warm'), C['map'])
for k in range(int((C['crack'] - C['map']) / B)):
    tpno.add(piano(['D2'] if k % 2 == 0 else ['A1'], 0.45, 0.5), C['map'] + k * B)
for i, t in enumerate(C['tiles']):
    m.sfx(sfx.stamp('wood'), at=t, gain=-2)
    ttk.add(drums.taiko('taiko', 0.8 + 0.1 * i), t)
m.sfx(sfx.impact('glitch', 1.0), at=C['crack'], gain=-1)
m.sfx(sfx.boom(1.8, 38), at=C['crack'], gain=-4)
tpno.add(piano(['C1', 'C#2', 'G2', 'D3'], 1.0, 2.0), C['crack'])
m.sfx(sfx.whoosh(0.5, 'swish', direction=1, peak=0.3), at=C['crack'] + 0.2, gain=-10)

# ---- run, the loop back, the door
tpad.add(synth.pad(['A1', 'E2', 'C3'], 8.6, 0.45, 'dark'), 41.5)
for k in range(16):
    tz.add(pluck.pizz(['A3', 'C4', 'E4', 'D#4'][k % 4], 0.12, 0.55 + 0.02 * k), 41.7 + k * B / 4)
m.sfx(sfx.slide_whistle(False, 0.6, 400, 1400), at=C['run'][0] + 1.2, gain=-10)
m.sfx(sfx.pop('soft', 0.7), at=C['run'][0] + 1.2, gain=-8)
tvib.add(VIB.play('A4', vel=0.5), C['run'][0] + 1.25)
m.sfx(sfx.squeak(), at=C['door_open'], gain=-8)
m.sfx(sfx.swell(sfx.shimmer_hit('D6'), 1.0), at=C['door_open'] + 0.3, gain=-5)
for i, n in enumerate(['D6', 'F6', 'A6']):
    tbox.add(box(n, 0.4), C['door_open'] + 0.3 + i * 0.12)
m.sfx(sfx.impact('cinematic', 1.1), at=C['door_open'] + 0.8, gain=1)
m.sfx(sfx.sub_drop(), at=C['door_open'] + 0.8, gain=-4)
tpno.add(piano(['D1', 'D2', 'Eb2'], 1.0, 2.0), C['door_open'] + 0.8)
tbox.add(box('Bb6', 0.4), C['qmark']); tbox.add(box('A6', 0.35), C['qmark'] + 0.25)

# ---- the choice + tag + end
Ch = C['choice']
tpad.add(synth.pad(['D2', 'A2', 'F3'], 10.0, 0.45, 'dark'), Ch)
phrase(Ch + 0.4, theme, 0.45); phrase(Ch + 0.4 + 8 * B / 2, ['A5', 'D6', 'F6', 'E6', 'D6', 'C#6', 'D6', 'A5'], 0.4)
m.sfx(sfx.heartbeat(64), at=Ch + 0.5, gain=-9)
for i in range(2):
    m.sfx(sfx.stamp('rubber'), at=C['labels'] + i * 0.4, gain=-3)
    ttk.add(drums.taiko('taiko', 0.85), C['labels'] + i * 0.4)
m.sfx(sfx.impact('soft', 1.0), at=C['tag'], gain=-4)
tpno.add(piano(['D1', 'A1', 'D2', 'F2', 'A2'], 0.85, 4.0), C['tag'])
for i, n in enumerate(['A5', 'D6', 'F6', 'E6']):
    tbox.add(box(n, 0.35 - 0.04 * i), C['hold'] + 0.2 + i * 0.5)
tbox.add(box('C#6', 0.3), C['hold'] + 2.2)


# ---- collage foley: sheets slapped on by hand, letters pasted, tape, rustle
for w in C['wipe']:
    m.sfx(sfx.paper('slide', 0.35, seed=int(w)), at=w + 0.15, gain=-6)
    m.sfx(sfx.sticker_slap(), at=w + 0.3, gain=-2)
for i in range(4):
    m.sfx(sfx.sticker_slap(), at=C['title'][0] + i * 0.17, gain=-5)
for i, t in enumerate(C['tiles']):
    m.sfx(sfx.paper('flip', 0.2, seed=50 + i), at=t - 0.05, gain=-9)
m.sfx(sfx.tape_rip(0.4), at=C['rules'][0] - 0.3, gain=-8)
m.sfx(sfx.scissors(), at=C['crack'] - 0.25, gain=-8)
for p in C['pages']:
    m.sfx(sfx.paper('rustle', 0.2, seed=int(p['t'] * 10)), at=p['t'], gain=-16)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
res = m.export(os.path.join(HERE, 'out/audio.wav'), tp=-1.6, spectrogram=os.path.join(HERE, 'out/audio_spec.png'))
print({k: res[k] for k in ('duration', 'lufs', 'true_peak') if k in res}, res.get('warnings'))
