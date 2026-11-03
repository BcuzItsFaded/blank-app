# REVIEW: Alien 3, the whole story in 12 scenes

Output: `renders/alien3-in-12-scenes.mp4`, 1920x1080, 30 fps, 61.4 s. Loudness −12.1 LUFS, true peak −3 dBTP.

## Source
- The 12 panels were cropped from a phone screenshot of `Overview_12_Scenes.jpg`, about 290x110 px each. They were AI-upscaled 6x with Real-ESRGAN (x4plus_anime_6B) to about 1750x640 (`tools/up.py`).
- To get sharper art, replace `assets/panels/p01–p12.png` with the originals (same names, any size). Then run `python3 tools/gen_alien.py` (paths are set at the top of the file) and render again.
- Character cutouts for parallax (rembg isnet-anime) failed on this art, so the motion is camera moves plus story effects.

## Structure
- Intro (2.6 s), then 12 scenes of 4.6 s, then the outro (3.6 s).
- Each scene: a letterboxed panel with one continuous camera move, the scene number and title in yellow in the top bar, and the story beat word by word in the bottom bar.
- Entrances are caused by the story: dip to black, whip pan, a white flash on creature hits, a glitch on the Company alert, and hard cuts.
- Effects: shakes (04, 06, 11), a snap zoom (06), a scanner sweep (08), the alert blinking (09), embers and fire flicker (10–12), and a fade to black (12).
- Titles 09–12 come from the storyboard. Titles 01–08 and all captions were written for this video. Every title and caption can be changed in `tools/gen_alien.py`.

## Not done
- No narration or music. The music catalog needs `npx hyperframes auth login`.
- The sound effects were measured, not heard.
