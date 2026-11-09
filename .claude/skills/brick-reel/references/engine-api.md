# Engine API (reels/engine/engine.js) — quick reference

Load order in a reel page: three@0.149.0 → `../engine/engine.js` → (optional `chars.js`) → `scenes.js`
→ inline `startReel({...})`. CSS: `../engine/reel.css`. Required DOM ids: `stage, title, endlogo,
caption, brand, flash, fade, ui/play/scrub/tc` (copy from the scaffold).

## Scenes
```js
defScene(startSec, endSec, () => {
  const scene = newScene();                 // sets CUR so box() adds to it
  ... build ...
  const cam = camera(52);
  return { scene, cam, update(t, u) {...} };   // t = absolute seconds, u = 0..1 in scene
});
```
Several `defScene` calls may share one `scene` (see dexters-lab HALL).
Add per-frame animation outside update with `tick((t, u) => …)`.

## Builders
`box(w,h,d, colorOrMaterial, x,y,z, parent?)` bevelled brick · `plastic(hex, opts)` cached
material · `figure({shirt,pants,skin,hair,hairStyle,coat,glasses,dress,scale})` minifig with
`userData{legL,legR,armL,armR,head,neck,torso}` · `walkCycle(f,t,speed,amp)` ·
`makeKaiju()` · `building()`, `Studs` · `ground(scene,color,size)` · `sun(scene,color,I,pos,target,span)`
· `gradientSky(stops)` · `lookFrom(cam, pos, target)` · `rng(seed)` · `ease/easeOut/easeIn/lerp/clamp/V`.

## FX
`particleField(scene,seed,n,box,color,size,{vy,vx,drift,additive,opacity})` → `t=>…` ·
`smokeField(…)` · `rain(…)` · `fireSpot(…)` · `embers(…)` · `shaft(scene,from,to,r0,r1,color,op)` ·
`utilityLine(…)` · `sign(…)` · `seaweed(…)` · `flameTex`, `radialTex`.

## startReel config
```js
startReel({
  duration: 30, envIntensity: 0.3,
  captions: [[t0, t1, '<small>1994</small>Mine Cart Ride'], …],
  grades: [{tint:[r,g,b], sat, contrast, bloom, thr, exposure}, …],   // one per defScene
  gradeAll: { lift: [r,g,b] },
  fade: t => 0..1, flash: (t,src) => 0..1, shake: (t,src) => amplitude,
  timeMap: t => storyTime,            // optional: re-cut an existing timeline
  captionTop: () => '64%',
  title: {in, out}, endlogo: {in, out}, brandOut
});
```
Post pipeline: bloom + ACES + grade + chromatic aberration + vignette + grain (in engine).

## Tools
- `render.js <page.html> <outDir> [--stills t1,t2] [--from N --to M]` — deterministic frames.
- `voiceover.py`, `captions.py`, `sfx.py` (Track, boom, zap, roar, chirp, ding, boing, slide,
  marimba, pluck, brass, snare, kick, crowd, vowel, cartoon_boom…), `mix.py`.
