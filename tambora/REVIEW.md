# REVIEW: The Year Without a Summer

## Creative calls
- The script is the person's, used verbatim. Narration is Kokoro `bm_george` at 0.98x, recorded one clip per sentence, so every visual cut lands on its line.
- Pauses: 0.85 s after "snow fell in June" and after "a creature brought to life" (per the production notes), and 1.1 s at each section break.
- Runtime: 2:40.5. Speech ends at 2:38.
- **No music**: the person chose to build without it. The section-break "swell" is carried by the pauses and a whoosh at each cut.
- Look: a flat natural-history illustration style. Sulfur yellow is the one accent and always marks "the cause" (the sulfate / the haze / the rays).
- The map is real geography (Natural Earth 110m land via the `world-atlas` npm package). The 1000-mile ring on the map is drawn to scale (about 14.5°).
- The 1818 *Frankenstein* title page is **drawn**, with the real title text. Wikimedia is blocked on this network, so the real scan couldn't be fetched.
- All required on-screen lines are present: "JUNE 1816. SNOW.", "MOUNT TAMBORA, APRIL 1815", "Sulfate droplets = a shield over Earth", "JUNE 1816: SNOW IN NEW ENGLAND", "THE SUMMER THAT GAVE US FRANKENSTEIN" and "Follow for more history + science".
- Frame 0 is black with "JUNE 1816." on it. That keeps the black open you asked for while still giving the thumbnail a hook.

## Facts on screen
- Only the script's own numbers appear (~150 km³, 1,000+ miles, ≈ −0.5 °C, "tens of thousands", "estimated").
- The bread chart has no values, only a 1815 → 1816–17 trend.
- Polidori was Byron's personal physician. "Their doctor" in the script is a loose but common phrasing.

## Measured vs looked at
- `check`: no errors. The one warning is the size of the generated captions file.
- All text sits inside x 120–888 / y 288–1100 for TikTok, Reels and Shorts.
- About 45 frames were reviewed across 5 passes. The fixes were: the globe timing, wrapped "INVISIBLE", the calendar, map and diagram overlaps, the bowl and loaf position, and the quill path.
- Captions come from the script aligned to pauses in each clip (±0.2 s). Whisper's model download is blocked here.
- The sound was measured, not heard.

## Weakest shots / with more time
- 34.6–36.7 s, "day into night": a simple gradient wipe. Real ash billows would sell it better.
- 101–104 s, the rain-soaked village: the figures are small and sit low in the frame.
- A real music bed: free via a HeyGen sign-in, or your own track.

## Rebuild
- `python3 build.py` regenerates every composition from the beat list.
- `assets/vo/lines.json` holds the line timings.
