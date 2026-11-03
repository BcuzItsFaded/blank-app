GOAL:    A viewer who never saw Aliens (1986) gets the whole story, twist and ending in 93 s, and follows for the next episode.
OUTPUT:  HyperFrames, 1080 x 1920 (9:16), 30 fps
TIME:    93 s x 30 = 2790 frames. 12 story scenes on the storyboard's clock (0, 8, 15, 22, 30, 38, 45, 53, 60, 68, 75, 82 s), end card 90-93 s. Once a voiceover exists, it is the clock: each scene starts on its first spoken word.
LOOK:    Source: the person's 12-panel "Don't Spoil It RG" storyboard (anime-style comic art). The medium is the comic page.
         ground #0a0e14 with a 6 px halftone dot field at 7% opacity; panel window 1080 x 820 at y 300, 6 px off-white (#e9e6df) comic border;
         ink #f4f2ec; one accent, badge red #b3221e, only on the scene number tab and the end card badge.
         Display: League Gothic, 104 px, uppercase, +1% tracking, at y 170-290. Captions: Roboto 700, 58 px base (fit to 900 px), in a #0a0e14 box at 82% opacity with a 3 px off-white border, y 1150-1310.
OBJECTS: the panels themselves, cropped from the board without their baked-in captions (two of which have typos); the board's own ALIENS title art and DON'T SPOIL IT RG badge.
MOTION:  camera on each panel: one move a scene, power1.inOut over the whole scene (scale 1.0-1.35); split panels travel from one sub-panel to the next (power2.inOut, 1.2 s) and hold.
         scene entries rotate between hard cut, whip (0.3 s, expo.out, motion blur), zoom-in settle (1.5 -> start scale, 0.6 s expo.out), black dip (0.25 s) and white flash (0.35 s, only on explosions: 6, 11).
         titles: per-word blur 6 px -> 0 in 0.13 s, 0.067 s apart, or whole-line blur 8 px -> 0 in 0.18 s; then dead still; exit 0.2 s blur-out before the scene ends.
SHOTS:   s01 0-8: frame 0 = Ripley's face + ALIENS title art (hook), push in on the photo of her daughter; title art swaps to the scene title at 2.4 s.
         s02 8-15: pan colony -> facehugger hand. s03 15-22: push along the Marines line. s04 22-30: push on Newt. s05 30-38: tilt up to the cocooned colonists.
         s06 38-45: flash in, fire -> crashing dropship. s07 45-53: tracker blips, push on Hudson-era sentry fire. s08 53-60: Burke order sheet -> Burke's face -> facehuggers.
         s09 60-68: hive -> Hicks -> Newt's hand. s10 68-75: push on the Queen over flamethrower. s11 75-82: flash, explosion -> Bishop. s12 82-90: power loader vs Queen -> airlock -> Ripley and Newt.
         end 90-93: badge carried in, ALIENS EPISODE 2, FOLLOW FOR MORE holds 2 s.
BANNED:  the spec.md defaults; small panels floating in a void (the panel always fills the frame's width); a CSS blur or filter on the panel art; captions repeating the baked-in board text with its typos; the logo docked in a corner.
QA:      t=0 (hook reads without sound), 2.6 (scene title), every scene seam +/- 2 frames, 39 and 76 (flash), 90.5 and 92.5 (end card).
