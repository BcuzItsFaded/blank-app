# REVIEW: Plot Twist with A&R, Pokémon Battle Ep. 1 (Ash vs. Gary)

Output: `renders/pokemon-battle-ep1.mp4`, 1080x1920, 30 fps, 60.0 s. Loudness −15.2 LUFS, true peak −1.4 dBTP.

## Source and timing
- The narration and scene timings are the user's script, word for word: slots of 7/7/7/8/8/8/8/7 s.
- Voice is Kokoro `am_michael` at speed 1.08. Each line starts 0.2 s into its slot.

## How it was built
- Flat-cartoon creature rig (`monSVG` in `tools/rig.js`) with 11 kinds: charizard, blastoise, snorlax, scizor, nidoqueen, tauros, heracross, magmar, bayleef, arcanine, golem.
- Trainers Ash (cap) and Gary (brown spiky hair) use the person rig.
- Battle helpers: pop-in, lunge, hit, faint (X eyes), beams (Flamethrower, Hydro Pump), steam, Seismic Toss spin.
- Thumbnails are built from `tools/thumb.py`, then screenshotted.

## Not done
- No music.
- The mix was measured, not heard.
- The thumbnails spell "POKEMON" without the accent, because the title font has no "É".
