#!/usr/bin/env python3
"""Scaffold a new brick reel: reels/<slug>/{memory-lane.html, scenes.js, audio.py}.
Usage: new_reel.py <slug> "<Title>" [--brand "RG BrickVerse"] [--seconds 30]
The scaffold renders out of the box (one walking figure, moving camera, cards, title) so you can verify the pipeline first."""
import argparse, os, re, sys
ap = argparse.ArgumentParser(); ap.add_argument('slug'); ap.add_argument('title'); ap.add_argument('--brand', default='RG BrickVerse'); ap.add_argument('--seconds', type=int, default=30)
a = ap.parse_args()
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')); d = os.path.join(root, 'reels', a.slug)
if os.path.exists(d): sys.exit(f'{d} exists')
os.makedirs(d)
b1, _, b2 = a.brand.partition(' ')
html = f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{a.title} Reel</title><link rel="stylesheet" href="../engine/reel.css">
<style>
  :root {{ --accent: #ffd84a; }}
  #caption span {{ background: none; font-size: 40px; font-weight: 800; letter-spacing: 1px; padding: 0; text-shadow: 0 3px 0 rgba(20,20,40,.9), 0 0 16px rgba(0,0,0,.7); }}
  #caption small {{ display: block; font-size: 28px; letter-spacing: 6px; color: #ffd84a; margin-bottom: 8px; }}
  #memory {{ position: absolute; inset: 0; pointer-events: none; z-index: 3; background: radial-gradient(ellipse at 50% 45%, rgba(255,200,120,0) 55%, rgba(30,20,10,.4) 100%); }}
  #title .t1 {{ font-family: "DejaVu Sans", sans-serif; font-weight: 800; font-size: 64px; color: #ffd84a; -webkit-text-stroke: 3px #b82a14; text-shadow: 0 6px 0 #6a1408; line-height: 1.05; }}
  #title .t2 {{ color: #ffe9a0; }} #endlogo span {{ border-color: #ffd84a; }} #brand i, #endlogo i {{ color: #ffd84a; }}
</style></head><body>
<div id="ui"><button id="play">Play</button> <input id="scrub" type="range" min="0" max="{a.seconds}" step="0.01" value="0" style="width:260px"> <span id="tc">0.00</span></div>
<div id="stage">
  <div id="memory"></div>
  <div id="title"><div class="t1">{a.title.upper()}</div><div class="t2">MEMORY LANE</div></div>
  <div id="endlogo"><span>{b1} <i>{b2}</i></span></div>
  <div id="caption"></div><div id="brand">{b1} <i>{b2}</i></div><div id="flash"></div><div id="fade"></div>
</div>
<script src="https://cdn.jsdelivr.net/npm/three@0.149.0/build/three.min.js"></script>
<script src="../engine/engine.js"></script>
<script src="scenes.js"></script>
<script>
"use strict";
const card = (small, big) => '<small>' + small + '</small>' + big;
const T = {a.seconds};
const CARDS = [[0.5, 3.8, card('YEAR', 'Shot one')], [4.6, 7.8, card('YEAR', 'Shot two')]];   // TODO: one card per shot
const BOUNDS = [4.2];                                                                        // scene boundaries for dip-to-black
const G = {{ tint: [1.02, 1.0, 0.96], sat: 1.15, contrast: 1.08, bloom: 0.5, thr: 1.4, exposure: 0.72 }};
startReel({{
  duration: T, envIntensity: 0.3, captions: CARDS, grades: [G, G], gradeAll: {{ lift: [0.012, 0.006, 0] }},
  fade: t => {{ let f = t < 0.5 ? 1 - t / 0.5 : 0; BOUNDS.forEach(b => f = Math.max(f, Math.max(0, 1 - Math.abs(t - b) / 0.18) * 0.8)); if (t > T - 0.4) f = Math.max(f, clamp((t - (T - 0.4)) / 0.35, 0, 1)); return f; }},
  flash: t => 0, shake: t => 0, captionTop: () => '64%',
  title: {{ in: T - 3.6, out: T - 0.05 }}, endlogo: {{ in: T - 2.0, out: T - 0.05 }}, brandOut: T - 3.8,
}});
</script></body></html>
'''
scenes = '''"use strict";
// Scaffold scenes: replace with real shots. EVERY shot needs: camera motion, a character verb, secondary motion, particles.
const sky = [[0, '#2a8ae8'], [0.6, '#7ac0f4'], [1, '#d8f0ff']];
function setupStage(scene) { scene.background = gradientSky(sky); scene.fog = new THREE.Fog(0xbfe0f4, 70, 260);
  scene.add(new THREE.HemisphereLight(0xdcefff, 0x4a7a38, 0.6)); sun(scene, 0xfff0d0, 2.0, V(-30, 60, 40), V(0, 0, 0), 60); ground(scene, 0x4a8a3a, 300); }
// shot 1: tracking side view of a runner (replace figure() with the character builder from your character sheet)
defScene(0, 4.2, () => {
  const scene = newScene(); setupStage(scene); const hero = figure({ shirt: 0xd83a32, pants: 0x2a4a8a, hair: 0x15110d, hairStyle: 'short', scale: 0.9 }); hero.rotation.y = Math.PI / 2; scene.add(hero);
  const dust = particleField(scene, 3, 120, { x0: -10, x1: 40, y0: 0.2, y1: 3, z0: -4, z1: 4 }, 0xe8dcb8, 0.12, { vy: 0.3, drift: 0.6, opacity: 0.6 }); tick(t => dust(t));
  const cam = camera(52);
  return { scene, cam, update(t, u) { const X = -6 + 8 * t; hero.position.set(X, Math.abs(Math.sin(t * 12)) * 0.12, 0); walkCycle(hero, t, 12, 0.9);
    lookFrom(cam, V(X + 1.8, 5.2, 22), V(X + 1.8, 3.4, 0)); } };
});
// shot 2: slow orbit around a posing hero
defScene(4.2, 8.4, () => {
  const scene = newScene(); setupStage(scene); const hero = figure({ shirt: 0xd83a32, pants: 0x2a4a8a, hair: 0x15110d, hairStyle: 'short', scale: 1.2 }); scene.add(hero);
  const cam = camera(48);
  return { scene, cam, update(t, u) { hero.userData.armR.rotation.x = -2.6 + Math.sin(t * 6) * 0.3; hero.userData.head.rotation.y = Math.sin(t * 2) * 0.3; const a = -0.8 + u * 1.6; lookFrom(cam, V(Math.sin(a) * 12, 3.2, Math.cos(a) * 12), V(0, 2.8, 0)); } };
});
'''
audio = '''"""SFX for the reel. Usage: python3 audio.py out.wav [sfx|full] [level 0-1]  (sfx = quiet effects only, for the user's own song)"""
import sys, os, wave
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'engine'))
import numpy as np
from sfx import *
DUR = %d
MUS, FX = Track(DUR, 1), Track(DUR, 2); rs = np.random.default_rng(1)
def reverb(x, secs=1.2, wet=0.15):
    n = int(secs * SR); ir = rs.standard_normal(n) * np.exp(-np.arange(n) / SR * 6.9 / secs); ir[0] = 0; ir /= np.sqrt((ir ** 2).sum())
    m = len(x) + n; return x + np.fft.irfft(np.fft.rfft(x, m) * np.fft.rfft(ir, m), m)[:len(x)] * wet
# TODO: one family per shot, placed on what the picture does (footsteps, jumps, impacts, pickups, ambience)
for s in np.arange(0.3, 4.2, 0.26): FX.put(hit(0.05, 200, 2200), s, 0.07, rs.random() * 0.4 - 0.2)
FX.put(boom(2.8, 42, 0.7), DUR - 3.6, 0.5)
mus = np.stack([reverb(MUS.L), reverb(MUS.R)], 1); fx = np.stack([reverb(FX.L), reverb(FX.R)], 1)
mode = sys.argv[2] if len(sys.argv) > 2 else 'sfx'; level = float(sys.argv[3]) if len(sys.argv) > 3 else 0.3
out = fx if mode == 'sfx' else mus * 0.7 + fx
out[int((DUR - 0.15) * SR):] = 0; k = int(0.25 * SR); out[:k] *= np.linspace(0, 1, k)[:, None]
out = np.tanh(out * 1.2); out *= 0.9 * level / (np.abs(out).max() + 1e-9)
with wave.open(sys.argv[1], 'wb') as o: o.setnchannels(2); o.setsampwidth(2); o.setframerate(SR); o.writeframes((out * 32767).astype('<i2').tobytes())
print('ok')
''' % a.seconds
for n, c in (('memory-lane.html', html), ('scenes.js', scenes), ('audio.py', audio)): open(os.path.join(d, n), 'w').write(c)
print('created', d, '\nnext: stills check ->  node reels/engine/render.js reels/%s/memory-lane.html /tmp/stills --stills 2,6' % a.slug)
