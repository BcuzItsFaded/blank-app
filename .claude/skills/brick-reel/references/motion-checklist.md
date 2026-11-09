# Motion checklist (aim: something moving in every part of the frame, every second)

## Camera (pick one per shot; never static)
| Move | Use for |
|---|---|
| Crane down / up | establishing, reveal a sign or scale |
| Push-in / dolly | emphasis, reaction, villain reveal |
| Orbit (±0.5–1 rad) | hero poses, planning scenes |
| Side tracking (leads/follows runner) | level runs, chases |
| Tilt up | towering monsters / robots |
| Pull-back + rise | title card, finale |
| Shake (0.03–0.15, decaying) | footsteps, impacts, explosions |

Always ease start/end (`ease`, `easeOut`); keep a subject-aware look-at (e.g. look at the
runner's x + offset). FOV 46–52 for characters; wider only for establishing.

## Characters
- Walk/run cycle (`walkCycle` or custom), body bob, arms counter-swing.
- Jump = parabola over a **landing event**; legs tuck in the air; squash on land.
- Idle never stills: head sways, blinks, breath scale, tail/ponytail chain (nested groups
  with a constant bend + animated swing).
- Gestures with intent: point, fist raise, chest-beat, clap, spin, wave, laugh.
- Faces: turn heads toward the action; jaws open on shouts/roars.

## World
- Particles everywhere appropriate: dust, embers, snow, bubbles, sparks, sea spray, pollen.
- Plants sway, flags flap, water UV-scrolls, gears rotate, lights flicker, screens pulse.
- Parallax: layers at different depths scroll at different speeds in tracking shots.

## Editing rhythm
- ~4 s per shot (30 s ⇒ 6–7 shots). A visible beat every ~1 s (jump, hit, pickup, gag).
- Cut on action. Dip to black 0.2 s at scene bounds; white flash 0.1–0.3 s on impacts.
- Title/end card gets its own slow pull-back so even the last 4 s moves.

## Level-run recipe (side-scroller)
```
X(t) = X0 + SPEED·t         // runner position, SPEED≈8
jumps = [{x, len, h}]       // parabola y = h·(1-(2(x-x0)/len)²)
enemies: squash when X > ex+0.2 (scale.y → 0.1), hide after 1.4 u
bananas/coins: visible while X < bx-0.6, bob + spin
camera: (X+1.8, 5.4, 22–25) looking at (X+1.8, 3.4–4.3, 0)
followers: same path offset by -gap·i (they jump at the same places, later)
gaps: separate ground segments, glowing lava/water slab underneath
```

## Verify
`python3 .claude/skills/brick-reel/scripts/motion_report.py out.mp4`
- Flags any second whose frame-to-frame change is below threshold.
- Fix by adding camera motion, a character action, or particles in that window.
