"""24-small-hero soundtrack (30 s, 120 bpm): playful cartoon jazz -> menacing brass march -> sweet crush waltz-y vibes ->
tense pizz ostinato + heroic fanfare -> epic taiko build, fire, final unresolved sting. All hits read from cues.json."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'lib', 'audio'))
import mgaudio as mg
from mgaudio import sfx, drums, fm, samples, pluck, synth
from mgaudio import filters as F
from mgaudio.core import Sound

HERE = os.path.dirname(os.path.abspath(__file__))
C = json.load(open(os.path.join(HERE, 'cues.json')))
BEAT = 0.5; SW = BEAT * 2 / 3; FR = 1 / 24; DUR = C['duration']

m = mg.Mix(duration=DUR, bpm=120, anchor=0.0)
m.group('music').level = -20
m.sfx_duck = 2.0

MAR, PNO, VIB, GLK = samples.inst('marimba'), samples.inst('piano'), samples.inst('vibraphone'), samples.inst('glock')
xylo = lambda n, v=0.8, d=0.3: mg.layer([(MAR.play(n, dur=d, vel=v, release=0.12), 0, 0, 0), (fm.mallet(n, d * 0.8, v * 0.9, 'xylo'), 0, -7, 0)])
pz = lambda n, d=0.25, v=0.8: pluck.pizz(n, d, v)
def upright(n, d=0.4, v=0.85):
    b = Sound(F.lpf(fm.bass(n, min(d, 0.3), v * 0.8, 'wood').data, 900)).fade(0.002, 0.08)
    return mg.layer([(pluck.pizz(n, d, v), 0, 0, 0), (b, 0, -6, 0)])
piano = lambda ns, v=0.6, d=0.3: mg.layer([(PNO.play(n, dur=d, vel=v, release=0.15), 0.004 * i, 0, 0) for i, n in enumerate(ns)])
vibes = lambda ns, v=0.5, d=1.0: mg.layer([(VIB.play(n, dur=d, vel=v, release=0.6), 0.006 * i, 0, 0) for i, n in enumerate(ns)])

tx = m.track('xylo', level=-23, sends={'room': -12, 'plate': -20}, pan=0.12)
tb = m.track('bass', level=-22, sends={'room': -18})
tp = m.track('piano', level=-26, sends={'room': -12, 'plate': -18}, pan=-0.15)
tv = m.track('vibes', level=-28, sends={'plate': -12}, pan=0.2)
tz = m.track('pizz', level=-25, sends={'room': -12})
tbr = m.track('brush', level=-29, sends={'room': -12}, pan=-0.25)
trd = m.track('ride', level=-32, sends={'room': -16}, pan=0.3)
tg = m.track('glock', level=-28, sends={'plate': -12}, pan=0.25)
tk = m.track('kick', level=-25)
tbr2 = m.track('brass', level=-23, sends={'hall': -14})
tstr = m.track('strings', level=-27, sends={'hall': -10})
ttk = m.track('taiko', level=-22, sends={'hall': -16})
tperc = m.track('perc', level=-24, sends={'room': -10})

# ================= ACT 1 (0 - 6.4): playful cartoon jazz in C
for i in range(12):   # walking bass, 2 bars of C6 - A7 - Dm7 - G7
    t = i * BEAT
    tb.add(upright(['C2', 'E2', 'G2', 'A2', 'A2', 'C#3', 'E2', 'G2', 'D2', 'F2', 'G2', 'B2'][i], 0.35, 0.8), t)
comp = [(0.0, ['E3', 'G3', 'A3', 'C4']), (1.0, ['C#3', 'G3', 'A3', 'E4']), (2.0, ['D3', 'F3', 'A3', 'C4']), (3.0, ['F3', 'G3', 'B3', 'D4']),
        (4.0, ['E3', 'G3', 'A3', 'C4']), (5.0, ['F3', 'G3', 'B3', 'D4'])]
for t, ch in comp:
    tp.add(piano(ch, 0.5, 0.2), t + BEAT); tp.add(piano(ch, 0.42, 0.16), t + BEAT + SW)
for b in range(12):
    tbr.add(drums.snare('brush', 0.55 if b % 2 else 0.3), b * BEAT)
    trd.add(drums.cymbal('ride', 0.45), b * BEAT);
    if b % 2: trd.add(drums.cymbal('ride', 0.3), b * BEAT + SW)
for i in range(12, 13):
    tb.add(upright('C2', 0.35, 0.8), i * BEAT)
for t in (6.0,):
    tb.add(upright('G2', 0.35, 0.8), t)
# walk-in tiptoe
for i, n in enumerate(['G4', 'A4', 'B4', 'C5', 'D5', 'E5']):
    tz.add(pz(n, 0.12, 0.55), i * 0.13, pan=-0.5 + 0.18 * i)
# each bop: xylophone up-flourish + boing + squish
for i, b in enumerate(C['bops']):
    for k, n in enumerate([['C5', 'E5', 'G5'], ['D5', 'F5', 'A5'], ['E5', 'G5', 'C6']][i]):
        tx.add(xylo(n, 0.6, 0.15), b - 0.42 + k * 0.08)
    m.sfx(sfx.zip_(True, 0.12), at=b - 0.42, gain=-10)
    m.sfx(sfx.boing(0.85 + 0.15 * i, 0.45), at=b - FR, gain=-4)
    m.sfx(sfx.squeak(), at=b + 0.02, gain=-10) if hasattr(sfx, 'squeak') else None
    m.sfx(sfx.pop('soft', 0.8), at=b + 0.3, gain=-10)
    tperc.add(samples.hit('woodblock', vel=0.85), b)
    tg.add(GLK.play(['G6', 'A6', 'C7'][i], vel=0.5), b)
# smug: lazy vibes
tv.add(vibes(['E4', 'G4', 'A4', 'D5'], 0.45, 1.0), C['smug'])
tx.add(xylo('C6', 0.6, 0.4), C['smug']); tx.add(xylo('A5', 0.5, 0.3), C['smug'] + SW)

# ================= ACT 2 (6.4 - 13.4): Bowser
S = C['shake']
m.tape_stop(S - 0.25, 0.25, resume=True)
m.sfx(sfx.boom(2.0, 38), at=S, gain=0)
m.sfx(sfx.impact('trailer', 1.0), at=C['rise'][1] - 0.05, gain=1)
ttk.add(drums.taiko('taiko', 1.0), S); ttk.add(drums.taiko('taiko', 0.9), C['rise'][1] - 0.05)
m.sfx(sfx.whoosh(0.4, 'swish', direction=-1, peak=0.4), at=C['flee'][0] + 0.2, gain=-8)
m.sfx(sfx.slide_whistle(False, 0.45, 600, 1800), at=C['flee'][0], gain=-8)
# menacing march in C minor: brass stabs + low piano octaves + taiko
cm = [['C3', 'Eb3', 'G3'], ['C3', 'Eb3', 'G3'], ['Ab2', 'C3', 'Eb3'], ['G2', 'B2', 'D3']]
for bar in range(3):
    t0 = 7.5 + bar * 1.0
    if t0 >= C['crush']: break
    ch = cm[bar % 4]
    tbr2.add(synth.stab(ch, 0.35, 0.9, 'brass'), t0); tbr2.add(synth.stab(ch, 0.2, 0.7, 'brass'), t0 + 0.75)
    tp.add(piano([ch[0].replace('3', '1').replace('2', '1'), ch[0].replace('3', '2')], 0.85, 0.4), t0)
    ttk.add(drums.taiko('taiko', 0.85), t0); ttk.add(drums.taiko('dagu', 0.6), t0 + 0.5); ttk.add(drums.taiko('dagu', 0.5), t0 + 0.75)
tstr.add(synth.pad(['C2', 'G2', 'C3'], 3.4, 0.6, 'dark'), 7.4)
# roar
m.sfx(sfx.whoosh(0.7, 'fire', direction=0, peak=0.35), at=C['roar'][0] + 0.2, gain=-2)
m.sfx(sfx.impact('thud', 0.8), at=C['roar'][0], gain=-6)
# castle draws itself: rising pizz per stroke
for i, n in enumerate(['C4', 'D4', 'Eb4', 'F4', 'G4', 'Ab4', 'B4', 'C5']):
    tz.add(pz(n, 0.12, 0.6), C['castle'][0] + i * 0.15)
m.sfx(sfx.pen('marker', C['castle'][1] - C['castle'][0], seed=5), at=C['castle'][0], gain=-14)
# army marches in: snare cadence
for i in range(8):
    tbr.add(drums.snare('tight', 0.45 if i % 2 else 0.65), C['army'][0] + i * 0.125)
# the crush: everything melts into sweet vibes + harp-ish glock in Eb major
Cr = C['crush']
m.sfx(sfx.slide_whistle(True, 0.5, 700, 1600), at=Cr, gain=-9)
tv.add(vibes(['Eb3', 'G3', 'Bb3', 'D4'], 0.55, 1.4), Cr)
tv.add(vibes(['C3', 'Eb3', 'G3', 'Bb3'], 0.5, 1.4), Cr + 1.5)
tv.add(vibes(['Ab2', 'C3', 'Eb3', 'G3'], 0.5, 1.4), Cr + 3.0 - 0.5)
for t, n in [(Cr, 'Eb2'), (Cr + 1.0, 'Bb2'), (Cr + 1.5, 'C2'), (Cr + 2.5, 'G2'), (Cr + 2.5 + 0.5, 'Ab2')]:
    tb.add(upright(n, 0.5, 0.7), t)
mel = [(0.0, 'G5'), (0.5, 'Bb5'), (1.0, 'Eb6'), (1.5, 'D6'), (2.0, 'C6'), (2.25, 'Bb5'), (2.5, 'G5')]
for t, n in mel:
    tg.add(GLK.play(n, vel=0.5), Cr + t)
for i in range(6):
    m.sfx(sfx.pop('bubble', 1.1 + 0.1 * i), at=Cr + 0.2 + i * 0.45, gain=-14)
m.sfx(sfx.shimmer_hit('Eb6'), at=C['dream'], gain=-8)
m.sfx(sfx.heartbeat(110) if hasattr(sfx, 'heartbeat') else sfx.pop('soft'), at=Cr + 0.8, gain=-14)

# ================= wipe 1 / ACT 3 (13.6 - 20.4): rescue tension -> heroic
m.sfx(sfx.whoosh(0.6, 'soft', direction=1, peak=0.5), at=C['wipe1'] + 0.25, gain=-6)
m.sfx(sfx.impact('soft', 0.8), at=C['cage'][1] - 0.1, gain=-4)
m.sfx(sfx.click('hard'), at=C['cage'][1] - 0.1, gain=-10)
# tense pizz ostinato in A minor (8ths)
osti = ['A3', 'E4', 'A3', 'F4', 'A3', 'E4', 'A3', 'G#3']
t = 13.75; i = 0
while t < C['determined']:
    tz.add(pz(osti[i % 8], 0.14, 0.6), t); t += 0.25; i += 1
tstr.add(synth.pad(['A2', 'E3', 'C4'], 3.0, 0.45, 'strings'), 13.75)
tstr.add(synth.pad(['F2', 'C3', 'A3'], 2.6, 0.45, 'strings'), 16.6)
for t in (13.75, 14.75, 15.75, 16.75, 17.75, 18.75):
    tb.add(upright('A1' if t < 16.6 else 'F1', 0.5, 0.75), t)
# pipe pop
P = C['pipe_pop']
m.sfx(sfx.cork_pop() if hasattr(sfx, 'cork_pop') else sfx.pop('cork'), at=P, gain=-2)
m.sfx(sfx.slide_whistle(True, 0.35, 500, 1900), at=P + 0.02, gain=-6)
m.sfx(sfx.boing(0.7, 0.6), at=C['pipe_land'] - FR, gain=-4)
tperc.add(samples.hit('woodblock', vel=0.9), C['pipe_land'])
m.sfx(sfx.sparkle(1.6, 18, key='A', mode='minor_pentatonic', seed=3), at=C['pipe_land'] + 0.2, gain=-12)
m.sfx(sfx.whoosh(0.25, 'swish', direction=1, peak=0.5), at=C['dizzy_end'] + 0.05, gain=-12)
m.sfx(sfx.whoosh(0.25, 'swish', direction=-1, peak=0.5), at=C['dizzy_end'] + 0.3, gain=-12)
# determined: heroic fanfare in C major
Dt = C['determined']
for k, (t, n) in enumerate([(0, 'G4'), (0.17, 'C5'), (0.33, 'E5'), (0.5, 'G5')]):
    tbr2.add(synth.stab(['C4', n] if k < 3 else ['C4', 'E4', 'G5'], 0.3 if k < 3 else 0.7, 0.9, 'brass'), Dt + t)
tp.add(piano(['C2', 'G2', 'C3', 'E3', 'G3'], 0.85, 1.0), Dt + 0.5)
tb.add(upright('C2', 0.6, 0.95), Dt + 0.5)
m.track('crash', level=-25, sends={'hall': -14}).add(drums.crash(0.8), Dt + 0.5)
tg.add(GLK.play('G6', vel=0.6), Dt + 0.5); tg.add(GLK.play('C7', vel=0.5), Dt + 0.55)
m.sfx(sfx.shimmer_hit('G5'), at=Dt + 0.5, gain=-7)

# ================= wipe 2 / ACT 4 (20.4 - 30): the question
m.sfx(sfx.whoosh(0.6, 'soft', direction=-1, peak=0.5), at=C['wipe2'] + 0.25, gain=-6)
# heartbeat taiko pulse, building
t = 20.5; k = 0
while t < C['breath'][0]:
    v = 0.5 + 0.4 * (t - 20.5) / 4.0
    ttk.add(drums.taiko('taiko', min(1.0, v)), t)
    if t >= 22.5: ttk.add(drums.taiko('dagu', min(0.8, v * 0.7)), t + 0.25)
    t += 0.5; k += 1
tstr.add(synth.pad(['C2', 'G2', 'Eb3'], 4.2, 0.55, 'dark'), 20.4)
tstr.add(synth.pad(['Ab1', 'Eb2', 'C3'], 3.0, 0.6, 'strings'), C['turtle_beat'] - 1.0)
tz.add(pz('C4', 0.3, 0.8), C['hero_beat']); tg.add(GLK.play('G6', vel=0.55), C['hero_beat'])
tbr2.add(synth.stab(['C3', 'Eb3', 'Gb3'], 0.6, 0.95, 'brass'), C['turtle_beat'])
tp.add(piano(['C1', 'C2', 'Gb2'], 0.9, 0.9), C['turtle_beat'])
m.sfx(sfx.riser(1.0, 'hybrid'), at=C['breath'][0], gain=-6)
# FIRE
Bf = C['breath'][0]
m.sfx(sfx.impact('cinematic', 1.2), at=Bf, gain=2)
m.sfx(sfx.whoosh(1.2, 'fire', direction=-1, peak=0.25), at=Bf + 0.3, gain=0)
m.sfx(sfx.boom(2.0, 40), at=Bf, gain=-4)
m.track('crash2', level=-24, sends={'hall': -14}).add(drums.crash(0.95), Bf)
ttk.add(drums.taiko('taiko', 1.0), Bf)
# epic march to the end in C minor: brass + taiko + piano octaves
prog = [(25.5, ['C3', 'Eb3', 'G3'], 'C1'), (26.5, ['Ab2', 'C3', 'Eb3'], 'Ab0'), (27.5, ['Bb2', 'D3', 'F3'], 'Bb0')]
for t0, ch, bn in prog:
    tbr2.add(synth.stab(ch, 0.4, 0.95, 'brass'), t0); tbr2.add(synth.stab(ch, 0.25, 0.8, 'brass'), t0 + 0.5); tbr2.add(synth.stab(ch, 0.2, 0.8, 'brass'), t0 + 0.75)
    tp.add(piano([bn.replace('0', '1'), bn.replace('0', '2').replace('1', '2')], 0.9, 0.5), t0)
    for o in (0, 0.25, 0.5, 0.75): ttk.add(drums.taiko('taiko' if o in (0, 0.5) else 'dagu', 0.95 if o == 0 else 0.7), t0 + o)
tstr.add(synth.pad(['C3', 'G3', 'Eb4'], 3.2, 0.6, 'strings'), 25.5)
for i in range(4):
    m.sfx(sfx.whoosh(0.6, 'fire', direction=1 if i % 2 else -1, peak=0.4), at=C['spread'][0] + 0.6 + i * 0.75, gain=-10, pan=-0.5 + 0.33 * i)
# roll into the question
for i in range(16):
    tbr.add(drums.snare('tight', 0.2 + 0.6 * i / 16), 28.5 - 0.5 + i * 0.031)
Q = C['qmark']
m.sfx(sfx.impact('punch', 1.0), at=Q, gain=0)
tbr2.add(synth.stab(['C3', 'G3', 'D4'], 1.2, 1.0, 'brass'), Q)
tp.add(piano(['C1', 'C2', 'G2', 'D3', 'G3'], 1.0, 1.3), Q)
ttk.add(drums.taiko('taiko', 1.0), Q)
m.track('sus', level=-28, sends={'hall': -10}).add(samples.hit('suscymbal', match='hit_f', vel=0.6), Q)
tg.add(GLK.play('D6', vel=0.55), Q + 0.4); tg.add(GLK.play('G6', vel=0.45), Q + 0.65)
m.sfx(sfx.sparkle(0.8, 14, key='C', mode='major_pentatonic', seed=11), at=Q + 0.4, gain=-12)

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
res = m.export(os.path.join(HERE, 'out/audio.wav'), tp=-1.6, spectrogram=os.path.join(HERE, 'out/audio_spec.png'))
print({k: res[k] for k in ('duration', 'lufs', 'true_peak') if k in res}, res.get('warnings'))
