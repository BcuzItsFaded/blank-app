# SPEC — "Ultracode, every day"

GOAL:    The viewer feels that ultracode (Claude Code's biggest multi-agent effort setting) is now an everyday tool, because Opus 5.5 is efficient enough not to burn usage limits.
OUTPUT:  HyperFrames, 1920 x 1080, 30 fps
TIME:    25.0 s x 30 = 750 frames. terminal 0–7.2 · studio 7.2–20.0 · end 20.0–25.0

LOOK:
- Brand palette (Claude): cream ground #F0EEE6, ink #141413 / #1F1E1D, accent Claude orange #D97757 (the spark, the selected row, playhead, one word per title).
- Terminal: product UI, window #1F1E1D, 1680x900, radius 18, JetBrains Mono 30 px / 46 px line, grey #8C8A82, orange #D97757.
- Studio set: flat cartoon paint — sky #F4DDB8, sun #EDA66C, far skyline #D9BE95, rooftops #5E4F41 with window grid #4A3E33, stage floor #3B342C with tape #E9C46A.
- Characters: Claude sparks — 12-ray starburst #D97757 with a centre disc, white eyes with #141413 pupils, #141413 line limbs 9 px with round caps. Props in #141413 / #F0EEE6.
- Editor UI: ground #E7E1D4, panels #FBFAF7 with 2 px border #D6CEBD, radius 14; Inter 26–30 px, JetBrains Mono for labels.
- End card: cream, Inter 900 120 px, -3% tracking, "Ultracode" in orange; body Inter 400 40 px #3D3929.
- No glow, no gradients, no grain.

OBJECTS: terminal window with traffic lights and title; effort picker list; film camera on a tripod (box body, two reels, lens); clapperboard with striped clapstick; megaphone; beret; sunglasses + red headband; cartoon explosion (3 stacked starbursts yellow/orange/white); NLE editor (program monitor, track lanes V2/V1/A1, clips, playhead); workflow panel (rows with agent avatar, label, progress bar, check); usage meter.

MOTION:
- arrivals expo.out / back.out(1.6) for characters (playful, damping ~0.5), camera moves power2.inOut, zoom-through power3.in.
- typing 1 char per 2–3 frames; picker steps 0.45 s apart.
- characters: offset limbs, never both arms in unison; squash on landing 0.8/1.15.

SHOTS:
1. 0.0–1.3 terminal at rest, `/effort` typed. Reads: Claude Code.
2. 1.3–3.9 picker; cursor steps high → xhigh → max → ultracode; punch-in 1.45x on the row at 2.95. Reads: "ultracode".
3. 3.9–6.2 set confirmed; prompt typed; enter; spinner "Orchestrating dynamic workflow · 6 agents".
4. 6.2–7.2 zoom through the spinner spark; it fills the frame orange.
5. 7.2–8.2 the spark explodes into the crew who fly to their marks; set irises open.
6. 8.2–9.0 clapperboard "ULTRACODE · SC 1 · TK 1" claps.
7. 9.2–11.6 "ACTION!"; stunt spark runs, leaps the roof gap as explosion fires; lands with squash.
8. 11.8–12.8 "CUT!" thumbs up.
9. 13.0–13.8 carry across: the set shrinks into the editor's program monitor; editor builds around it.
10. 13.8–19.2 dynamic workflow: 4 agents work in parallel — cut, grade, score, titles; usage meter 9% → 14%; playhead plays the trailer in the monitor.
11. 19.2–20.0 the "render" row grows to fill the frame.
12. 20.0–25.0 end card, crew bows; message holds 3.5 s.

BANNED: dark void ground; glow/bloom/flares; gradients; everything centred; everything fade-up; corner labels/HUD decoration; titles that drift; unison crowd motion.

QA: t=2.95 (ultracode row legible), 6.0 (spinner), 7.6 (crew flying), 10.4 (mid-leap + explosion), 12.2 (CUT), 16.0 (editor mid-work), 18.5 (playhead + title in monitor), 22.5 (end card).
